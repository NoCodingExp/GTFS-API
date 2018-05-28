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
const express = require('express')
const app = express()
const { getDeparturesByStops, getStopByID, getStopByName, getStopArrayByID, getRoutes,getAvailableTrains} = require('./querries')

//Plan trip bin zouz stationét 

app.get('/api/trip_plan/:idDep/:idArriv', (req, res) => {
  var idDep = req.params.idDep
  var idArriv = req.params.idArriv
  getAvailableTrains(idDep, idArriv)
    .then((data) => { res.json(data)
    })
    .catch((e) => {
      console.error(e.stack)
      res.status(500).send('Something broke!')
    })
})




//al9a les stations l9rab
app.get('/api/stops/nearby/:lat/:lon',(req,res)=>{

  latitude=req.params.lat
  longitude=req.params.lon
  if (isNaN(latitude)||isNaN(longitude))
  res.json(['error'])
  else 
  {
    gtfs.getStopsAsGeoJSON({
      within: {
        lat: latitude,
        lon: longitude,
        radius: 1
      }
    }).then( stop =>{
      res.json(stop)

    }).catch((e) => {
      console.error(e.stack)
      res.status(500).send('Something broke!')
    })
} 
})








/* Lawej 3ala Station ?term= */
app.get('/api/stops/search', (req, res) => {
  const stopName = req.query.term
  if (stopName) {
    getStopByName(stopName, true)
      .then((data) => { res.json(data) })
      .catch((e) => {
        console.error(e.stack)
        res.status(500).send('Something broke!')
      })
  } else {
    res.json([])
  }
})

/* GET Stop Bel ID */
app.get('/api/stops/:id', (req, res) => {
  const id = req.params.id
  getStopByID(id)
    .then((data) => { res.json(data) })
    .catch((e) => {
      console.error(e.stack)
      res.status(500).send('Something broke!')
    })
})

/* GET departure times bel stop ID */
app.get('/api/stops/:id/:offset/departures', (req, res) => {
  const id = req.params.id
  const offset = req.params.offset
  const includeAllChilds = true
  getStopArrayByID(id, includeAllChilds)
    .then(arr => getDeparturesByStops(id,offset))
    .then(data => res.json(data))
    .catch((e) => {
      console.error(e.stack)
      res.status(500).send('Something broke!')
    })
})

/* GET ROUTES lkol */
app.get('/api/routes/',(req, res)=>{
  getRoutes().then((data) => { res.json(data) })
  .catch((e) => {
    console.error(e.stack)
    res.status(500).send('Something broke!')
  })
})



/* GET Stop Bel ID */
app.get('/api/stops/:id_depart/:id_arriv', (req, res) => {
  const id_depart = req.params.id_depart
  getStopByID(id_depart)
    .then((data) => { res.json(data) })
    .catch((e) => {
      console.error(e.stack)
      res.status(500).send('Something broke!')
    })
})




module.exports = app
