const express = require('express')
const app = express()
const { getDeparturesByStops, getStopByID, getStopByName, getStopArrayByID, getRoutes,getNearbyStops } = require('./querries')

// WEBSERVICES
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

/* GET ROUTE Bel ID */
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
app.get('/api/stops/:id/departures', (req, res) => {
  const id = req.params.id
  const includeAllChilds = true
  getStopArrayByID(id, includeAllChilds)
    .then(arr => getDeparturesByStops(arr))
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

/* Get Stops l9rab  */

app.get('/api/stops/nearby',(req, res)=>{
  
    userlat:req.query.userlat
    userlon:req.query.userlon
  
  if((userlat)&&(userlon)) {
    getNearbyStops(userlat,userlon)
    .then((data)=>{ res.json(data) })
    .catch((e) => {
      console.error(e.stack)
      res.status(500).send('something broke!')
    })
  }
  else res.json([])

})



/* app.get('/api/stops/search', (req, res) => {
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
}) */


module.exports = app
