var gtfs = require('gtfs')
var _ = require('lodash')
var moment = require('moment')

// MODEL
var StopTime = require('gtfs/models/gtfs/stop-time')
var Trips = require('gtfs/models/gtfs/trip')
var Calendar = require('gtfs/models/gtfs/calendar')
var CalendarDate = require('gtfs/models/gtfs/calendar-date')
var Route = require('gtfs/models/gtfs/route')
var Stop= require('gtfs/models/gtfs/stop')

// DATABASE REQUESTS
const getStopByName = (stopName, excludeChilds = true) => {
  var querry = { stop_name: { '$regex': stopName, $options: 'i' } }
  // Get only elements without parrents:
  if (excludeChilds) { querry.parent_station = '' }
  return gtfs.getStops(querry, {
    stop_id: 1,
    stop_name: 1
  })
}

const getAvailableTrains =  async (depId, arrivId, horraireDep) => {
  var date = new Date();
  var horraireDep = horraireDep || moment(date).format('HH:mm:ss')
  var querry = {
    agency_key: 'SNCFT',
    stop_id: depId
  }
  var f = []
  await gtfs.getStoptimes(querry).then((data)=>{ f = data})
    .catch((e) => {
      console.error(e.stack)
      res.status(500).send('something broke!')
  })
  //console.log(horraireDep)
  var t = []
  f.forEach(function(element) {
    if(element.departure_time >= horraireDep){
      t.push(element)
    }
  })
  var querry2  = {
    agency_key: 'SNCFT',
    stop_id: arrivId
  }
  var m = []
  await gtfs.getStoptimes(querry2).then((data)=>{ m = data})
    .catch((e) => {
      console.error(e.stack)
      res.status(500).send('something broke!')
  })
 
 
  var finaleTable = []
  t.forEach(function(element){
    m.forEach(function(element2){
      if(element2.trip_id == element.trip_id && element.departure_time < element2.arrival_time)
        finaleTable.push({'trip_id':element2.trip_id,
                            'departure_station':element.stop_id,
                            'departure_time':element.departure_time,
                            'arrival_station': element2.stop_id,
                            'arrival_time':element2.arrival_time
 
      })
    })
  })
 
  return finaleTable.reverse();
 
}



const getStopByID = (id, includeAllChilds = true) => {
  var querry
  if (includeAllChilds) {
    querry = {
      $or: [
        { stop_id: id },
        { parent_station: id }
      ]
    }
  } else {
    querry = { stop_id: id }
  }
  return gtfs.getStops(querry)
}

function getCalendarDatesForStopTimeArray (stopTimesArray) {
  const SERVICES = stopTimesArray.map((item) => item.trip.service_id)
  return CalendarDate.find({
    service_id: {
      $in: SERVICES
    }
  }).then((data) => {
    return stopTimesArray.map((st) => {
      var e = st
      e.calendar_date = _.filter(data, (o) => { return o.service_id === e.trip.service_id })
      return e
    })
  })
}

function getCalendarsForStopTimeArray (stopTimesArray) {
  const SERVICES = stopTimesArray.map((item) => item.trip.service_id)
  return Calendar.find({
    service_id: {
      $in: SERVICES
    }
  }).then((data) => {
    return stopTimesArray.map((st) => {
      var e = st
      e.calendar = _.find(data, (o) => { return o.service_id === e.trip.service_id })
      return e
    })
  })
}


function getRoutesForStopTimeArray (stopTimesArray) {
  const ROUTES = stopTimesArray.map((item) => item.trip.route_id)
  return Route.find({
    route_id: {
      $in: ROUTES
    }
  }).then((data) => {
    return stopTimesArray.map((st) => {
      var e = st
      e.route = _.find(data, (o) => { return o.route_id === e.trip.route_id })
      return e
    })
  })
}

function getTripsForStopTimeArray (stopTimesArray) {
  const TRIPS = stopTimesArray.map((item) => item.trip_id)
  return Trips.find({
    trip_id: {
      $in: TRIPS
    }
  }).then((data) => {
    return stopTimesArray.map((st) => {
      var e = st.toObject()
      e.trip = _.find(data, (o) => { return o.trip_id === e.trip_id })
      return e
    })
  })
}

const getStopArrayByID = (id, includeAllChilds) => {
  if (includeAllChilds) {
    return getStopByID(id, true).then((result) => {
      return result.map(e => e.stop_id)
    })
  } else {
    return Promise.resolve([id])
  }
}

const getDeparturesByStops = (id, offsetMinutes) => {
  // OPTIONS
  var date = new Date()
  const startTime =  moment(date).format('H:mm:ss') 
  const rangeEndTime = moment(date).add(offsetMinutes, 'm').format('H:mm:ss')
  const projections = { _id: 0, departure_time: 1, trip_id: 1, trip: 1 }

  // GET ALL STOP TIMES WITHIN THE GIVEN RANGE
  return StopTime
    .find({
      stop_id: id,
      $or: [{
        departure_time: {
           $gt: startTime,
           $lt: rangeEndTime 
        }
      }, {
        // GTFS ALLOWS BOTH: WITH OR WITHOUT LEADING ZERO
        departure_time: {
          $gt: '0' + startTime,
          $lt: '0' + rangeEndTime
        }
      }]
    }, projections)
    .sort({ departure_time: 1 })
    .then(data => getTripsForStopTimeArray(data))
    .then(data => getCalendarsForStopTimeArray(data))
    .then(data => getCalendarDatesForStopTimeArray(data))
    .then(data => getRoutesForStopTimeArray(data))
    // FILTER ALL VALID STOP TIMES
    .then(data => filterStopTimeArray(data, date))
    .then(data => styleOutput(data))
}

function styleOutput (data) {
  // Only return relevant data                  /* 'departure_time','trip.direction_id','trip.trip_headsign' */
  const filteredData = data.map(e => _.pick(e, ['trip.trip_id']))

  // Sort by departure time
  return _.sortBy(filteredData, [function (o) { return o.departure_time }])
}

// FILTER RESULTS
function filterStopTimeArray (data, date) {
  // Setup
  var stopTimes = []
  const dateAsInt = parseInt(moment(date).format('YYYYMMDD'), 10)

  // Add all trips served on actual weekday (e.g. "monday" = true AND end_date >= today >= start_date)
  var regularValidStops = filterRegularServicesForDay(data, date, dateAsInt)

  // Remove all "type 2" exceptions (A value of 2 indicates that service has been removed for the specified date.)
  regularValidStops = removeExceptionsFromStopTimeArray(regularValidStops, dateAsInt)

  // Add all additional "type 1" exceptions ( A value of 1 indicates that service has been added for the specified date.)
  var irregularValidStops = getIrregularServicesForDay(data, dateAsInt)

  // Return both arrays as once
  stopTimes = irregularValidStops.concat(regularValidStops)
  return stopTimes
}

function removeExceptionsFromStopTimeArray (regularValidStops, dateAsInt) {
  _.remove(regularValidStops, o => {
    if (o.calendar_date.length > 0) {
      const todayNot = _.filter(o.calendar_date, e => ((e.exception_type === 2) && (e.date === dateAsInt)))
      return !(_.isEmpty(todayNot))
    } else {
      return false
    }
  })
  return regularValidStops
}

function filterRegularServicesForDay (data, date, dateAsInt) {
  // Filter all trips served on actual weekday (e.g. "monday" = true AND end_date >= today >= start_date)
  const weekday = moment(date).format('dddd').toLowerCase()
  return _.filter(data, o => {
    return ((o.calendar[weekday] === 1) && (o.calendar.start_date <= dateAsInt) && (dateAsInt <= o.calendar.end_date))
  })
}

function getIrregularServicesForDay (data, dateAsInt) {
  // Filter all additional "type 1" exceptions ( A value of 1 indicates that service has been added for the specified date.)
  return _.filter(data, o => {
    if (o.calendar_date.length > 0) {
      const todayAdditional = _.filter(o.calendar_date, e => ((e.exception_type === 1) && (e.date === dateAsInt)))
      return !(_.isEmpty(todayAdditional))
    } else {
      return false
    }
  })
}


const getRoutes= ()=>{
  return gtfs.getRoutes()
  }

const getNearbyStops= (userlat,userlon)=>{

return gtfs.getStops({
  within: {
  $lat: userlat,
  $lon: userlon,
  radius: 2
}
})
}







module.exports = { getDeparturesByStops,
   getStopByID,
    getStopByName,
     getStopArrayByID,
     getRoutes,
     getNearbyStops,getAvailableTrains }
