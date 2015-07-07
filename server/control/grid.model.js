var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var gridfs = require('../server.js').get('gridfs');
var gridSchema = new Schema({}, {strict: false});
var ObjectId = require('mongoose').Types.ObjectId;
var async = require('async');
var util = require('./server.util');
var rimraf = require('rimraf');
var fs = require('fs');

function insert (readStream, data, cb) {
  var writeStream = gridfs.createWriteStream(data);
  readStream.pipe(writeStream);
  writeStream.on('close', function (file) {
    cb(file);
  });
}

function saveServerToDB (callback) {
  async.waterfall([
    function (cb) {
      util.getMapAndExec('./game', function (mapDirs, execFiles) {
        cb(null, mapDirs, execFiles);
      });
    },
    function (mapDirs, execFiles, cb) {
      async.parallel([
        function (cb) {
          var archiver = require('archiver')('tar');
          var actions = [];
          for (var i = mapDirs.length - 1; i >= 0; i--) {
            actions.push({cwd: './game/' + mapDirs[i], expand: true, src: ['**/*'], dest: mapDirs[i]});
          }
          archiver.bulk(actions);
          archiver.finalize();
          insert(archiver, {filename: 'test ' + Date.now(), metadata: {name: 'test'}}, function (file) {
            cb(null, file);
          });
        },
        function (cb) {
          var archiver = require('archiver')('tar');
          var excludedSrcs = mapDirs.map(function (element) {
            return '!' + element + '/**';
          }).concat(['**/*']).reverse();
          archiver.bulk([{cwd: './game', expand: true, src: excludedSrcs}]);
          archiver.finalize();
          insert(archiver, {filename: "exectest"}, function (file) {
            cb(null, file);
          });
        }
      ], function (err, files) {
        console.log('** [saveServerToDB completed] **');
        cb(null, files);
      });
    },
    
    function (files, cb) {
      rimraf('./game', function () {
        cb(null, files);
      });
    },   
    function (files, cb) {
      fs.mkdir('./game', function () {
        cb(null, files);
      });
    }
  ], function (err, files) {
    callback(err, files);
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

function streamFromId (id, cb) {
  if (!id || typeof id !== 'string') {
    cb('[streamFromId]: error, no id provided');
    return;
  }
  var stream = gridfs.createReadStream({_id: id});
  stream.once('error', function (err) {
    cb('[streamFromId]: ' + err);
    return;
  });
  console.log('read object', id);
  cb(null, stream);
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
          if (doc.type === 'exec') {
            docs.execs.push(doc);
          } else if (doc.type === 'map') {
            docs.maps.push(doc);
          }
        }
      });
    }
  ], function (err) {
    callback(err, docs);
  });
}

gridSchema.statics.insert = insert;
gridSchema.statics.saveServerToDB = saveServerToDB;
gridSchema.statics.appendBackup = appendBackup;
gridSchema.statics.getMapsAndBackups = getMapsAndBackups;
gridSchema.statics.streamFromId = streamFromId;

module.exports = mongoose.model('Grid', gridSchema, "fs.files");