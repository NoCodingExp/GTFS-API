// DEPENDENCIES
const gtfs = require('gtfs')
const mongoose = require('mongoose')

// LOCAL DEPENDENCIES

const config = require('./config.json')

// CONFIGUARTION
var configEnv = {
  mongoUrl: config.mongoUrl,
  verbose: config.verbose || true,
  skipDelete: config.skipDelete || false,
  agencies: config.agencies
}

// CONNECT DB
mongoose.connect(config.mongoUrl)

gtfs.import(configEnv)
  .then(() => {
    console.log('Import Successful')
    return mongoose.connection.close()
  })
  .catch(err => {
    console.error(err)
  })