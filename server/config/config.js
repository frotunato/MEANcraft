var env = process.env.NODE_ENV = 'development';
var fs = require('fs');
var path = require('path');
var serverConfig = require('./settings.json');
var config = {
  ip: process.env.IP,
  root: path.normalize(__dirname + '/../..'),
  port: 4000,
  db: 'mongodb://localhost:27017/MEANcraft',
  host: 'localhost',
  serverPath: serverConfig.serverPath,
  previewPath: serverConfig.previewPath,
  token: {
    expirationInMinutes: 10,
    refresh: true,
    refreshThresholdInMs: 5000 * 60 
  }
};

module.exports = config;