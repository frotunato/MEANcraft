var fs = require('fs');
var async = require('async');
var Model = require('../control/grid.model');
var Stream = require('stream');
var activeStreams = [];
var util = require('../control/server.util');

/*
  base64.decode = function (encoded) {
    return new Buffer(encoded || '', 'base64').toString('utf8');
  };
*/

function addSocket () {

}

function removeSocket () {
}

module.exports = function (app, uploadNsp) {
  
  function begin (message) {
    console.log('UploadSocket [BEGIN]', message);
    //var position = util.deepIndexOf(activeStreams, 'token', message.token);
    if (!message) return;
    var socket = this;
    var token = util.base64Encode(message.metadata.name + '-' + Date.now());
    util.getFileType(message.header, function (err, fileType) {
      if (err) {
        socket.emit('err', err);
        return;    
      }
      console.log(fileType);
      var readStream = new Stream.Readable();
      readStream._read = function noop () {
        socket.emit('chunk', {token: token});
      };
      activeStreams.push({token: token, stream: readStream});
      socket.emit('begin', {token: token});
        Model.insert(readStream, {
          filename: message.filename,
          metadata: { 
            name: message.metadata.name,
            type: message.metadata.type,
            token: token,
            ext: fileType.ext
          }
        }, function () {
          console.log('file upload');
        });
    });
  }

  function end (message) {
    console.log('UploadSocket [END]');
    if (!message) return;
    var position = util.deepIndexOf(activeStreams, 'token', message.token);
    if (position === 1) return;
    activeStreams[position].stream.push(null);
    activeStreams.splice(position, 1);
  }

  function ping () {
    this.emit('ping');
  }
  function chunk (message) {
    console.log('UploadSocket [CHUNK]', message.token);
    if (!message) return;
    var position = util.deepIndexOf(activeStreams, 'token', message.token);
    console.log(message.chunk.length);
    if (position === 1) return;
    var currentStream = activeStreams[position].stream;
    currentStream.push(message.chunk);
  }
 
  return {
    begin: begin,
    end: end,
    chunk: chunk,
    ping: ping
  };

};