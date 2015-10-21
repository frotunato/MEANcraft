var EventEmitter = require('events').EventEmitter;
var controlWorker = new EventEmitter();
var util = require('./server.util.js');
var config = require('../config/config');
var mongoose = require('mongoose');

function createDBConnection (cb) {
	var Grid = require('gridfs-stream');
	mongoose.connect(config.db);
	var conn = mongoose.connection;
	Grid.mongo = mongoose.mongo;
	mongoose.gfs = Grid(conn.db);
	conn.once('open', function (err) {
		cb(mongoose.gfs);
	})
}

process.on('message', function (message) {
	controlWorker.emit(message.command, message.body);
});

controlWorker.on('bundleServer', function (body) {
	createDBConnection(function (gridfs) {
		body.gridfs = gridfs;
		util.bundleServer(body, function (err) {
			mongoose.disconnect();
			process.send({command: 'bundleServer', body: err})
		});	
	})
	
});