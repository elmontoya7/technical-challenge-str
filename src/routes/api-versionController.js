/**
 * This module controls versioning for route api.
 * 
 * @module api-versionController
 */

 var express = require('express')
 var router = express.Router()
 
 const v1 = require('./api/v1')
 
 /**
  * List of route, by version in DESCENDING order.
  * 
  */
 
 router.use('/api/v1', v1)
 
 /**
  * To add retro-compatibility to latest version, must include older version files without specifing a version param in route.
  * If current version is 3, must add v2 & v1 below in DESCENDING order:
  * 
  * router.use('/:version/route', v2)
  * router.use('/:version/route', v1)
  */
 
 module.exports = router