var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var gridfs = mongoose.gfs;
var gridSchema = new Schema({}, {strict: false});
var ObjectId = require('mongoose').Types.ObjectId;
var async = require('async');
var rimraf = require('rimraf');
var fs = require('fs');
var tar = require('tar-fs');
var zlib = require('zlib');
var lz4 = require('lz4');
var unzip = require('unzip2');
var progress = require('progress-stream');

function insert (readStream, data, optionalGridfs, cb) {
  //data.chunkSize = 1000000;
  var alphaTime = Date.now();
  console.log('[GRID.MODEL] inserting', data);
  cb = (optionalGridfs instanceof Function) ? optionalGridfs : cb;
  gridfs = (optionalGridfs instanceof Object) ? optionalGridfs : gridfs;
  //optionalGridfs = optionalGridfs || gridfs;
  var writeStream = gridfs.createWriteStream(data);
  //var writeStream = fs.createWriteStream('./game/' + Date.now() + 'a.zip.lz4');
  readStream.pipe(writeStream);
  writeStream.once('close', function (file) {
    console.log(file, 'inserted in', Date.now() - alphaTime, 'ms');
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

function _extractFile (id, config, cb) {
  if (!id) return;
  var _getWriteStream = function (readStream, ext) {
    var decoderStream = null;
    var writeStream = null;
    switch (ext) {
      case 'gz':
        decoderStream = zlib.Gunzip();
        writeStream = tar.extract(config.path);
        break;
      case 'zip':
        writeStream = unzip.Extract({path: config.path});
        readStream.pipe(writeStream);
        return writeStream;
      case 'lz4':
        decoderStream = lz4.createDecoderStream();
        writeStream = tar.extract(config.path);
    }
    readStream.pipe(decoderStream).pipe(writeStream);
    return writeStream;
  };
  var _getEndEvent = function (ext) {
    var res = null;
    switch (ext) {
      case 'gz':
      case 'lz4':
        res = 'finish';
        break;
      case 'zip':
        res = 'close';
        break;
    }
    return res;
  };
  _getReadStreamFromId(id, function (err, readStream, file) {
    var writeStream = _getWriteStream(readStream, file.metadata.ext);
    var ev = _getEndEvent(file.metadata.ext);
    
    if (config.io) {
      var str = progress({length: file.length, time: 500});
      writeStream = _getWriteStream(readStream.pipe(str), file.metadata.ext);
      str.on('progress', function (progress) {
        config.io.emit('chat', '[MEANcraft] Decompressing ' + file.metadata.type + ' ' + Math.ceil(progress.percentage) + '%');
      });
    }
    
    writeStream.once(ev, function () {
      console.log('finished', id);
      cb(err, file);
    });
  });
}

function getMapsAndBackups (callback) {
  var cursor = gridfs.files.find({'metadata.parent_id': null});
  var docs = {execs: {}, maps: {}};
  var name;
  var prop;
  var obj;
  
  cursor.forEach(function (doc) {
    if (!doc || !doc.metadata) return;
    prop = (doc.metadata.type === 'exec') ? 'execs' : 'maps';
    name = doc.metadata.name;

    if (!docs[prop][name]) {
      docs[prop][name] = [];
    }
    
    docs[prop][name].push(doc);
  })

  callback(null, docs);
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