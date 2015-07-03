module.exports = function (app, io) {
  var serverNsp = io.of('server');
  var uploadNsp = io.of('upload');
  
	var serverControl = require('./control/index.js')(app, serverNsp);
	var serverUpload = require('./upload/index.js')(app, uploadNsp);
  
  io.on('connection', function (socket) {
		serverControl.route(socket);
    serverUpload.route(socket);
	});

};