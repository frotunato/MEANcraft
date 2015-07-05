var Model = require('./grid.model');
var fs = require('fs');
var async = require('async');
var queue = async.queue(function (message, callback) {
  var alphaTime = Date.now();
  fs.appendFile('chunk.asd', message.chunk, function () {
    console.log('Processed token', message.token, Date.now() - alphaTime, 'ms');
    callback();
  });
}, 1);

module.exports = function (app, serverNsp) {
  var isUp = false;
  var lastCode = null;

  process.on('message', function (message) {
    console.log(message);
    if (message.status !== undefined) {
      console.log('status changed', message.status);
      isUp = message.status;
      lastCode = message.code;
      serverNsp.emit('status', {status: message.status, code: message.code});
      if (message.status === false) {
        Model.saveServerToDB(function (err, files) {
          console.log('saved!',err,files);
        });
      }
    } else if (message.stdout !== undefined) {
      serverNsp.emit('chat', message.stdout);
    }
  });

  function start (message) {
  	if (!message) return;
  	console.log(message);
    /*
    if (isUp === false) {
      process.send({
        command: 'start', 
        config: {
          procName: 'java', 
          procArgs: ['-jar', 'minecraft_server.jar', 'nogui'], 
          procOptions: {
            cwd: './game'
          }
        }
      });
    } else {
      this.emit('err', 'Server already running');
    }
  	*/
  }

  function stop () {
    if (isUp === true) {
      process.send({
        command: 'stop'
      });
    } else {
      this.emit('err', 'Server is already stopped');
    }
  }

  function getStatus () {
    return {status: isUp, code: lastCode};
  }

  function status () {
    this.emit('status', getStatus());
  }

  function list () {
    var socket = this;
    Model.getMapsAndBackups(function (err, docs) {
      //console.log(docs)
      socket.emit('list', docs);
    });
  }

  return {
    start: start,
    stop: stop,
    status: status,
    list: list
  };
};