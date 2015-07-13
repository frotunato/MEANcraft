module.exports = function (app, io) {
  var serverNsp = io.of('server');
  var uploadNsp = io.of('upload');
	var serverControl = require('./control/index.js')(app, serverNsp);
	var serverUpload = require('./upload/index.js')(app, uploadNsp);

  serverNsp.on('connection', function (socket) {
		serverControl.route(socket);
	});
  
  uploadNsp.on('connection', function (socket) {
  	serverUpload.route(socket);
  });
};