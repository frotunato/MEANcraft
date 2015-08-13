module.exports = function (app, serverNsp) {
	var controller = require('./server.controller.js')(app, serverNsp);
	return {
		route: function (socket) {
			socket.on('start', controller.start.bind(socket));
			socket.on('stop', controller.stop.bind(socket));
			socket.on('info', controller.info.bind(socket));
			socket.on('list', controller.list.bind(socket));
			socket.on('stdin', controller.chat.bind(socket));
			socket.on('read', controller.read.bind(socket));
			socket.on('modify', controller.modify.bind(socket));
			socket.on('preview', controller.preview.bind(socket));
		}
	};
};