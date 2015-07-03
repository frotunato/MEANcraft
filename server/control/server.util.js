var async = require('async');
var fs = require('fs');

function getMapAndExec (dir, callback) {
  async.waterfall([
    function (cb) {
      fs.readdir(dir, cb);
    },
    function (rawFiles, cb) {
      console.log(rawFiles);
      async.filter(rawFiles, function (rawFile, callback) {
        fs.stat(dir + '/' + rawFile, function (err, element) {
          if (err) console.log(err);
          if (element.isDirectory()) {
            callback(true);
          } else {
            callback(false);
          }
        });
      }, function (rawDirs) {
        cb(null, rawDirs, rawFiles);
      });
    },
    function (rawDirs, rawFiles, cb) {
      async.filter(rawDirs, function (rawDir, callback) {
        fs.exists(dir + '/' + rawDir + '/level.dat', function (exists) {
          if (exists) {
            callback(true);
          } else {
            callback(false);
          }
        });
      }, function (mapDirs) {
        cb(null, mapDirs, rawFiles);
      });
    }, function (mapDirs, rawFiles, cb) {
      var execFiles = rawFiles.filter(function (element) {
        return mapDirs.indexOf(element) < 0;
      });
      cb(null, mapDirs, execFiles);
    }
  ], function (err, mapDirs, execFiles) {
    callback(mapDirs, execFiles);
  });
}

module.exports.getMapAndExec = getMapAndExec;