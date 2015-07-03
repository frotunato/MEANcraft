var express = require('express');
var controller = require('./auth.controller');
var router = express.Router();
var protect = require('./auth.service');

router.post('', controller.login);
router.get('/test', protect(), controller.test);
  
module.exports = router;