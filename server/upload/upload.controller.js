var fs = require('fs');
var async = require('async');
var Model = require('../control/grid.model');
var Stream = require('stream');
var activeStreams = [];

function deepIndexOf (array, attr, value) {
  var res = -1;
  for (var i = array.length - 1; i >= 0; i--) {
    if (array[i][attr] === value) {
      res = i;
      break;
    }
  }
  return res;
}

module.exports = function (app, uploadNsp) {
  
  function begin () {
    console.log('UploadSocket [BEGIN]');
  }

  function end (message) {
    console.log('UploadSocket [END]');
    var position = deepIndexOf(activeStreams, 'token', message.token);
    activeStreams[position].stream.push(null);
    activeStreams.splice(position, 1);
    ///activeStreams[position].stream.end(function () {
    ///  activeStreams.splice(position, 1);
    ///});
  }

  function ping () {
    this.emit('ping');
  }

  function chunk (message) {
    //console.log('UploadSocket [CHUNK]');
    var socket = this;
    var position = deepIndexOf(activeStreams, 'token', message.token);
    var currentStream = (position === -1) ? null : activeStreams[position].stream;
    if (message) {
      
      /*
      fs.appendFile('chunk.asd', message.data.chunk, function () {
        //console.log('Processed token', message.token, Date.now() - alphaTime, 'ms');
        //callback();
      });
      */

      if (position === -1) {
        console.log(message.token);
        var readStream = new Stream.Readable();
        readStream._read = function noop () {};
        activeStreams.push({token: message.token, stream: readStream});
        //var writeStream = fs.createWriteStream('./chunkStream', {flags: 'a', encoding: null, mode: 0666});
        //activeStreams.push({token: message.token, stream: writeStream});
        position = deepIndexOf(activeStreams, 'token', message.token);
        currentStream = activeStreams[position].stream;
        Model.insert(readStream, {}, function () {
          console.log('file done');
        });
      }
      currentStream.push(message.data.chunk);
      socket.emit('chunk', {chunk: message.token});
      //currentStream.write(message.data.chunk, function () {
      //  socket.emit('chunk', {chunk: message.token});
      ////currentStream.write(message.data.chunk, function () {
      //  //console.log(isBuffedFilled);
      //  //if (isBuffedFilled === true) {
      //  //  return;
      //  //} else {
      //  //  console.log('socket drained', typeof currentStream);
      //  //  currentStream.once('drain', function () {
      //  //    socket.emit('chunk', {chunk: message.token});
      //  //  });
      //    //activeStreams[position].stream.write(message)
      //});
      
      
      /*  
        activeStreams[position].stream.on('drain', function () {
          console.log('drained')
          activeStreams[position].stream.write(message.data.chunk);
            socket.emit('chunk', {chunk: message.token});

        });
      */
      ///queue.push({stream: activeStreams[position].stream, chunk: message.data.chunk}, function () {
        //socket.emit('chunk', {chunk: message.token});
        //console.log('processed chunk')
      ///});
      /*
      activeStreams[position].stream.once('drain', function () {
        activeStreams[position].stream.write(message.data.chunk, function () {
          socket.emit('chunk', {chunk: message.token});
        });
      
      });
      */
      //queue.push({token: message.token, chunk: message.data.chunk});

    }
  }
 return {
    begin: begin,
    end: end,
    chunk: chunk,
    ping: ping
  };
};
 