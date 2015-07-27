module.exports = function (app, serverNsp) {
	var controller = require('./server.controller.js')(app, serverNsp);

	function route (socket) {
		socket.on('start', controller.start.bind(socket));
		socket.on('stop', controller.stop.bind(socket));
		socket.on('info', controller.info.bind(socket));
		socket.on('list', controller.list.bind(socket));
		socket.on('stdin', controller.chat.bind(socket));
	}

	return {
		route: route
	};
};