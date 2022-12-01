const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const path = require('path')

/**
 * Node/Express config
 * 
 */
require('dotenv').config()
app.use(express.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))

/**
 * Port config
 * 
 */
const port = 3000

/**
 * Modules
 * 
 */
require('./modules/mongo')

/**
 * Endpoints
 * 
 */
app.use(require('./routes/api-versionController'))


/**
 * Start server
 * 
 */
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})