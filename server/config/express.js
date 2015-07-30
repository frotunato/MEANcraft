var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var compress = require('compression');
var path = require('path');
var config = require('./config.js');

module.exports = function (app) {
  app.set('view engine', 'jade');
  app.set('appPath', path.join(config.root, 'client'));
  app.set('json spaces', 0);
  app.set('views', path.join(app.get('appPath'), '/app/'));
  app.use(morgan('tiny'));
  app.use(compress());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use(express.static(app.get('appPath')));
};