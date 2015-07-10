var async = require('async');
var fs = require('fs');
var fileType = require('file-type');
var tar = require('tar-fs');

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
/*
function deployFile (readStream, metadata, cb) {
  var gzipStream = zlib.createGzip();
  var writeStream = tar.extract('./temp');
  readStream.pipe(gzipStream).pipe(writeStream);
  readStream.on('finish', function () {
    cb();
  });
}
*/
function getFileType (input, cb) {
  var type = {};
  var isValidType = function (type) {
    var res = false;
    if (type !== null) {
      switch (type.ext) {
        case '7z':
        case 'zip':
        case 'rar':
        case 'tar':
        case 'gz':
          res = true;
          break;
        default:
          break;
      }
    }
    return res;
  };

  if (input && typeof input === 'string') {
    var buffer = new Buffer(262);
    fs.open(input, 'r', function (err, fd) {
      if (err) {
        return cb(err);
      }
      fs.read(fd, buffer, 0, 262, 0, function (err, bytesRead, buffer) {
        if (err) {
          return cb(err);
        }
        fs.close(fd, function (err) {
          if (err) {
            return cb(err);
          }
          if (bytesRead < 262) {
            buffer = buffer.slice(0, bytesRead);
          }
          type = fileType(buffer);
          if (isValidType(type)) {
            cb(null, type);
          } else {
            var error = 'Invalid type provided';
            cb(error);
          }
        });
      });
    });
  } else if (input && input instanceof Buffer) {
    type = fileType(input);
    if (isValidType(type)) {
      cb(null, type);
    } else {
      var error = 'Invalid file provided';
      cb(error);
    }
    console.log(type);
  }
}

module.exports.getMapAndExec = getMapAndExec;
module.exports.getFileType = getFileType;
module.exports.deepIndexOf = deepIndexOf;
module.exports.base64Encode = base64Encode;