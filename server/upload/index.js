module.exports = function (app, uploadNsp) {
  var controller = require('./upload.controller.js')(app, uploadNsp);

  function route (socket) {
    socket.on('begin', controller.begin.bind(socket));
    socket.on('end', controller.end.bind(socket));
    socket.on('chunk', controller.chunk.bind(socket));
    socket.on('ping', controller.ping.bind(socket));
  }

  return {
    route: route
  };
};