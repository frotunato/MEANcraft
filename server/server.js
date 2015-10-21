var express = require('express');
var config = require('./config/config');
var app = module.exports = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server, {transports: ['websocket', 'XHR-Polling']});

require('./config/db')(config);
require('./config/express')(app, config);
require('./routes')(app);
require('./socketHandler')(app, io);	

server.listen(4000, function () {
  console.log('Express server running at port %d in %s mode', config.port, process.env.NODE_ENV);
});