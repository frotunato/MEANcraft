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
  _getReadStreamFromId(id, function (err, readStream, file) {
    var gzipStream = zlib.Unzip();
    var writeStream = tar.extract('./temp/');
    readStream.pipe(gzipStream).pipe(writeStream);
    writeStream.once('finish', function () {
      console.log('finished', id);
      cb();
    });
  });
}

function deployServer (execId, mapId, callback) {
  async.waterfall([
    function (cb) {
      _extractFile(mapId, function (err) {
        cb();
      });
    },
    function (cb) {
      _extractFile(execId, function (err) {
        cb();
      });
    }
  ], function () {
    callback();
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

function _sanitizeWorld (directory, callback) {
  var match = ['region', 'DIM-1', 'DIM1'];
  var path = require('path');
  var cache = [];
  async.waterfall([
    function (wCb) {
      fs.readdir(directory, wCb);
    },
    function (files, wCb) {
      var _searchDirectories = function (element, fCb) {
        fs.stat(path.join(directory, element), function (err, stats) {
          if (stats.isDirectory()) {
            fCb(true);
          } else {
            fCb(false);
          }
          cache.push(element);
        });
      };
      async.filter(files, _searchDirectories, function (results) {
        wCb(null, results);
      });
    },
    function (directories, wCb) {
      function _isValidDir (dir, fCb) {
        fs.readdir(path.join(directory, dir), function (err, files) {
          async.each(files, function (file, eCb) {
            if (match.indexOf(file) !== -1) {
              fs.stat(path.join(directory, dir, file), function (err, stats){
                if (stats.isDirectory()) {
                  eCb(true);
                } else {
                  eCb(null);
                }
              });
            } else {
              eCb(null);
            }
          }, function (err) {
            if (err) {
              fCb(true);
            } else {
              fCb(false);
            }
          });
        });
      }
      async.filter(directories, _isValidDir, function (results) {
        wCb(null, results);
      });
    }, 
    function (validDirectories, wCb) {
      var toRemove = cache.filter(function (el) {
        return validDirectories.indexOf(el) < 0;
      });
      async.each(toRemove, 
        function (element, eCb) {
          rimraf(path.join(directory, element), function (err) {
            eCb(err);
          });
        }, 
        function () {
          wCb(null, toRemove);
        }
      );
    }
  ], function (err, results) {
    callback(err, results);
  });
}



function writeServerToDisk (mapId, execId, callback) {
  async.parallel([
    function (cb) {
      readStreamFromId(mapId, function (err, readStream) {
        if (err) {
          cb(err);
          return;
        }
        readStream.pipe(writeStream);
        var writeStream = tar.extract('./temp');
        writeStream.once('finish', function () {
          cb(null);
        });
    });
    },
    function (cb) {
      readStreamFromId(execId, function (err, readStream) {
        if (err) {
          return cb(err);
        }
        readStream.pipe(writeStream);  
        var writeStream = tar.extract('./temp');
        writeStream.once('finish', function () {
          cb(null);
        });
      });
    }
  ], function (err, results) {
    console.log('** [writeServerToDisk completed] **');
    callback(err);
  });
}

gridSchema.statics.insert = insert;
gridSchema.statics.saveServerToDB = saveServerToDB;
gridSchema.statics.appendBackup = appendBackup;
gridSchema.statics.getMapsAndBackups = getMapsAndBackups;
gridSchema.statics.deployServer = deployServer;
gridSchema.statics.writeServerToDisk = writeServerToDisk;

module.exports = mongoose.model('Grid', gridSchema, "fs.files");