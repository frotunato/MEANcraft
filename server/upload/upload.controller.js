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

function base64Encode (unencoded) {
  return new Buffer(unencoded || '').toString('base64');
}

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
    //var position = deepIndexOf(activeStreams, 'token', message.token);
    if (!message) return;
    var socket = this;
    var token = base64Encode(message.metadata.name + '-' + Date.now());
    var readStream = new Stream.Readable();
    readStream._read = function noop () {
      socket.emit('chunk', {token: token});
    };
    activeStreams.push({token: token, stream: readStream});
    this.emit('begin', {token: token});
    Model.insert(readStream, {
      filename: message.filename,
      metadata: { 
        name: message.metadata.name,
        type: message.metadata.type,
        token: token
      }
    }, function () {
      console.log('file upload');
    });
  }

  function end (message) {
    console.log('UploadSocket [END]');
    if (!message) return;
    var position = deepIndexOf(activeStreams, 'token', message.token);
    activeStreams[position].stream.push(null);
    activeStreams.splice(position, 1);
  }

  function ping () {
    this.emit('ping');
  }

  function chunk (message) {
    console.log('UploadSocket [CHUNK]', message.token);
    if (!message) return;
    var position = deepIndexOf(activeStreams, 'token', message.token);
    var currentStream = (position === -1) ? null : activeStreams[position].stream;
    currentStream.push(message.chunk);
  }
 
  return {
    begin: begin,
    end: end,
    chunk: chunk,
    ping: ping
  };

};