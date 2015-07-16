var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var gridfs = require('../server.js').get('gridfs');
var gridSchema = new Schema({}, {strict: false});
var ObjectId = require('mongoose').Types.ObjectId;
var async = require('async');
var util = require('./server.util');
var rimraf = require('rimraf');
var fs = require('fs');
var tar = require('tar-fs');
var zlib = require('zlib');
var lz4 = require('lz4');
var unzip = require('unzip2');


function insert (readStream, data, cb) {
  var writeStream = gridfs.createWriteStream(data);
  //var writeStream = fs.createWriteStream('./temp/' + Date.now() + 'a.zip.lz4');
  readStream.pipe(writeStream);
  writeStream.once('close', function (file) {
    console.log('file inserted');
    cb(file);
  });
}

function appendBackup (readStream, data, cb) {
  insert(readStream, data, function (file) {
    var parent_id = new ObjectId("556cde1c0d4d075417619710");
    var child_id = file._id;
    gridfs.files.update({_id: parent_id}, {"$push": {'metadata.childs_ids': {"_id": child_id}}}, function (err) {
      //console.log(doc)
      console.log(err);
      cb();
    });
    //gridfs.files.update({"_id": parent_id}, {"$push": {'metadata.childs_ids': {"_id": child_id}}}, function (l) {
    
      //cb();
     // console.log('done! parent', data.metadata.parent_id, 'children', file._id);
    //})
  });
}

function _getReadStreamFromId (id, cb) {
  if (!id || typeof id !== 'string') {
    cb('[readStreamFromId]: error, no id provided');
    return;
  }
  gridfs.findOne({_id: id}, function (err, file) {
    var stream = gridfs.createReadStream({_id: id});
    stream.once('error', function (err) {
      cb('[readStreamFromId]: ' + err);
      return;
    });
    cb(null, stream, file);
  });
}

function _extractFile (id, cb) {
  var _getWriteStream = function (readStream, ext) {
    var decoderStream = null;
    var writeStream = null;
    var eventToListen = null;
    if (ext === 'gz') {
      decoderStream = zlib.Gunzip();
      writeStream = tar.extract('./temp/');
    } else if (ext === 'zip.lz4') {
      decoderStream = lz4.createDecoderStream();
      writeStream = unzip.Extract({path: './temp/'});
    } else if (ext === 'tar.lz4') {
      decoderStream = lz4.createDecoderStream();
      writeStream = tar.extract('./temp/');
    }
    readStream.pipe(decoderStream).pipe(writeStream);
    return writeStream;
  };
  _getReadStreamFromId(id, function (err, readStream, file) {
    var writeStream = _getWriteStream(readStream, file.metadata.ext);
    var ev = (file.metadata.ext === 'gz') ? 'finish' : 'close';
    writeStream.once(ev, function () {
      console.log('finished', id);
      cb(err, file);
    });
  });
}

function getMapsAndBackups (callback) {
  var cursor = gridfs.files.find({'metadata.parent_id': null});
  var docs = {execs: [], maps: []};
  async.series([
    function (cb) {
      cursor.each(function (err, doc) {
        if (err) {
          cb(err);
        } else if (doc === null) {
          cb();
        } else {
          if (doc.metadata.type === 'exec') {
            docs.execs.push(doc);
          } else if (doc.metadata.type === 'map') {
            docs.maps.push(doc);
          }
        }
      });
    }
  ], function (err) {
    callback(err, docs);
  });
}

function getFileData (id, cb) {
  gridfs.findOne({_id: id}, function (err, doc) {
    cb(err, doc);
  });
}

gridSchema.statics.insert = insert;
gridSchema.statics.appendBackup = appendBackup;
gridSchema.statics.getMapsAndBackups = getMapsAndBackups;
gridSchema.statics.getFileData = getFileData;
gridSchema.statics.extractFile = _extractFile;
module.exports = mongoose.model('Grid', gridSchema, "fs.files");