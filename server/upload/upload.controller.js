var fs = require('fs');
var async = require('async');
var Model = require('../control/grid.model');
var Stream = require('stream');
var streamPool = [];
var util = require('../control/server.util');
/*
var _streamPool = {
  pool: [],
  add: function (token) {
    var res = false;
    if (token && typeof token === 'string') {

    }
    return res;
  }
};
*/
module.exports = function (app, uploadNsp) {
  
  function begin (message) {
    //var position = util.deepIndexOf(streamPool, 'token', message.token);
    if (!message) return;
    console.log('UploadSocket [BEGIN]', message);
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
      streamPool.push({token: token, stream: readStream});
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
    var position = util.deepIndexOf(streamPool, 'token', message.token);
    if (position === 1) return;
    streamPool[position].stream.push(null);
    streamPool.splice(position, 1);
  }

  function ping () {
    this.emit('ping');
  }
  function chunk (message) {
    console.log('UploadSocket [CHUNK]', message.token);
    if (!message) return;
    var position = util.deepIndexOf(streamPool, 'token', message.token);
    console.log(message.chunk.length);
    if (position === 1) return;
    var currentStream = streamPool[position].stream;
    currentStream.push(message.chunk);
  }
 
  return {
    begin: begin,
    end: end,
    chunk: chunk,
    ping: ping
  };

};