module.exports = function (app, io, socket) {
  var controller = require('./server.controller')(app, io, socket);
  socket.on('start', controller.start);
  socket.on('stop', controller.stop);
  socket.on('status', controller.status);
  socket.on('create', controller.create);
  socket.on('backup', controller.backup);
};