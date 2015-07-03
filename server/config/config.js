var env = process.env.NODE_ENV = 'development';
var fs = require('fs');
var path = require('path');

var config = {
  ip: process.env.IP,
  root: path.normalize(__dirname + '/../..'),
  port: 4000,
  db: 'mongodb://localhost:27017/MEANcraft',
  host: 'localhost',
  token: {
    expirationInMinutes: 10,
    refresh: true,
    refreshThresholdInMs: 5000 * 60 
  }
};

module.exports = config;