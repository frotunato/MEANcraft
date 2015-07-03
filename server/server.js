var express = require('express');
var config = require('./config/config');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server, {transports: ['XHR-Polling', 'websocket']});

//https
//var server = require('https').createServer(options, app);
require('./config/db')(app, config, function () {
	require('./config/express')(app);
	require('./routes')(app);
	require('./socketHandler')(app, io);
}); 

server.listen(4000, function () {
  console.log('Express server running at port %d in %s mode', config.port, process.env.NODE_ENV);
});

exports = module.exports = app;