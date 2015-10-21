var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var compress = require('compression');
var path = require('path');

module.exports = function (app, config) {
  app.set('view engine', 'jade');
  app.set('appPath', path.join(config.root, 'client'));
  app.set('serverPath', path.join(config.root, config.serverPath));
  console.log('helo', config.serverPath)
  app.set('previewPath', path.join(config.root, config.previewPath));
  app.set('json spaces', 0);
  app.set('views', path.join(app.get('appPath'), '/app/'));
  app.use(morgan('tiny'));
  app.use(compress());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use(express.static(app.get('appPath')));
};