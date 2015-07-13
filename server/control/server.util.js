var async = require('async');
var fs = require('fs');
var fileType = require('file-type');
var tar = require('tar-fs');
var rimraf = require('rimraf');
var path = require('path');


function sanitize (root, sCb) {
  
  var _getDirs = function (base, exclude, cb) {
    var path = require('path');
    async.waterfall([
      function (wCb) {
        fs.readdir(base, wCb);
      },
      function (elements, wCb) {
        elements = elements.filter(function (el) {
          return exclude.indexOf(el) === -1;
        });
        var _isDir = function (element, fCb) {
          fs.stat(path.join(base, element), function (err, stats) {
            if (stats.isDirectory()) {
              fCb(true);
            } else {
              fCb(false);
            }
          });
        };
        async.filter(elements, _isDir, function (dirs) {
          var files = elements.filter(function (el) {
            return dirs.indexOf(el) < 0;
          });
          wCb(null, dirs, files);
        });
      }
    ],
    function (err, dirs, files) {
      cb(err, dirs, files);
    });
  };
  var _isMapDir = function (directory, fCb) {
    var matches = [];
    var refs = ['region', 'DIM1', 'DIM-1'];
    _getDirs(path.join(root, directory), [], function (err, nestedDirs, nestedFiles) {
      async.each(nestedDirs, 
        function (nestedDir, eCb) {
          if (refs.indexOf(nestedDir) !== -1) {
            matches.push(nestedDir);
          }
          eCb(null);
        },
        function (err) {
          if (matches.length > 0) {
            fCb(true);
          } else {
            fCb(false);
          }
        });
    });
  };
  var _sanitizeMap = function (callback) {
    async.waterfall([
      function (wCb) {
        _getDirs(root, [], wCb);
      },
      function (dirs, files, wCb) {
        async.filter(dirs, _isMapDir, function (mapDirs) {
          var dirsToRemove = dirs.filter(function (el) {
            return mapDirs.indexOf(el) === -1;
          });
          var thingsToRemove = files.concat(dirsToRemove);
          wCb(null, mapDirs, thingsToRemove);
        });
      },
      function (mapDirs, thingsToRemove, wCb) {
        var removedThings = [];
        async.each(thingsToRemove,
          function (thingToRemove, eCb) {
            rimraf(path.join(root, thingToRemove), function (err) {
              removedThings.push(thingToRemove);
              eCb(err);
            });
          },
          function (err) {
            wCb(err, mapDirs, removedThings);
          });
      }
    ],
      function (err, matches, removed) {
        callback(err, matches, removed);
    });
  };
  var _sanitizeExec = function (exclude, callback) {
    async.waterfall([
      function (wCb) {
        _getDirs(root, exclude, wCb);
      },
      function (filteredDirs, files, wCb) {
        async.filter(filteredDirs, _isMapDir, function (execMapDirs) {
          wCb(null, execMapDirs, files);
        });
      },
      function (execMapDirs, files, wCb) {
        var removedThings = [];
        async.each(execMapDirs, 
          function (execMapDir, eCb) {
            rimraf(path.join(root, execMapDir), function (err) {
              removedThings.push(execMapDir);
              eCb(err);
            });
          },
          function (err) {
            wCb(err, removedThings, files);
          });
      }
    ], function (err, sExecRemoved, files) {
      callback(err, sExecRemoved, files);
    });
  };
  
  async.waterfall([
    function (wCb) {
      _sanitizeMap(wCb);
    },
    function (matches, sMapRemoved, wCb) {
      _sanitizeExec(matches, function (err, sExecRemoved, files) {
        wCb(err, sMapRemoved, sExecRemoved, files);
      });
    }
  ], function (err, sMapRemoved, sExecRemoved, files) {
    //console.log(sMapRemoved, sExecRemoved, files);
    sCb(err, sMapRemoved, sExecRemoved, files);
  });
}
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
        case 'zip':
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