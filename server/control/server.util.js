var async = require('async');
var fs = require('fs');
var fileType = require('file-type');
var tar = require('tar-fs');
var rimraf = require('rimraf');
var path = require('path');
var du = require('du');
var fse = require('fs-extra');
var childProcess = require('child_process');
var serverPath = require('../config/settings.json').serverPath; //app.get('serverPath');
var previewPath = require('../config/settings.json').previewPath;
var Model = require('./grid.model');

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

function getServerProperties (filePath, callback) {
  fs.readFile(path.join(filePath, 'server.properties'), {encoding: 'utf8'}, function (err, data) {
    mapped = {};
    data = data.split('\n');
    data = data.filter(function (element) {
      return element.indexOf('#') === -1 && element.length > 0; 
    });
    data.forEach(function (line, index, array) {
      array[index] = line.substring(0, line.lastIndexOf('\n'));
      var objLine = array[index].split('=');
      var key = objLine[0];
      var value = objLine[1];
      mapped[key] = value;
    });
    callback(err, mapped);
  });
}

function setServerProperty (filePath, prop, value, callback) {
  fs.readFile(path.join(filePath, 'server.properties'), {encoding: 'utf8'}, function (err, data) {
    if (err) {
      callback(err);
      return;
    }
    var index = data.indexOf(prop);
    if (index === -1) {
      data = data.concat('\n' + prop + '=' + value);
    } else {
      var offset = index + prop.length + 1;
      var endLine = data.substring(offset).indexOf('\n') - 1 + offset;
      var line = data.substring(index, endLine);
      data = data.replace(line, prop + '=' + value);
    }
    fs.writeFile(path.join(filePath, './server.properties'), data, function (err) {
      callback(err);
    });
  });
}

function getTree (base, walkCb) {
  function _readDirectory (root, rCb) {
    async.waterfall([
    function (wCb) {
      fs.readdir(root, wCb);
    },
    function (items, wCb) {
      var pool = [];
      var _processItem = function (item, cb) {
        function _isValidExt (ext) {
          var validExts = ['.yml', '.properties', '.txt', '.json', '.log'];
          return (validExts.indexOf(ext) === -1) ? false : true;
        }
        var element = {};
        fs.stat(path.join(root, item), function (err, stats) {
          element = {
            name: item,
            parent: root,
            metadata: {
              atime: stats.atime,
              mtime: stats.mtime
            }
          };
          if (stats.isFile()) {
            var ext = path.extname(item);
            element.metadata.size = stats.size;
            element.readable = (_isValidExt(ext)) ? true : false;
            pool.push(element);
            cb();
          } else if (stats.isDirectory()) {
            _readDirectory(path.join(root, item), function (err, data) {
              du(path.join(root, item), function (err, size) {
                element.isDirectory = true;
                element.content = data;
                element.metadata.size = size;
                pool.push(element);
                cb();
              });
            });
          }
        });
      };
      async.each(items, _processItem, function (err) {
        wCb(err, pool);
      });
    }], 
    function (err, pool) {
      rCb(err, pool);
    });
  }
  _readDirectory(base, function (err, data) {
    walkCb(err, {name: base, parent: '', isDirectory: true, content: data});
  });
}

function applyChanges (changes, cb) {
  console.log('changing', changes);
  var _applyChange = function (item, eCb) {
    fs.writeFile(path.join(item.parent, item.name), item.body, function (err) {
      eCb(err);
    });
  };
  async.each(changes, _applyChange, function (err) {
    cb(err);
  });
}

function storeServer (gameServerConfig, cb) {
  var controlWorker = childProcess.fork('./server/control/server.worker.js');
  controlWorker.send({
    command: 'bundleServer', 
    body: gameServerConfig
  });
  controlWorker.on('message', function (message) {
    controlWorker.kill();
  });
  controlWorker.once('exit', function () {
    cb();
  })
}

function bundleServer (gameServerConfig, cb) {
  var _getWriteStream = function (elements, callback) {
    var tar = require('tar-fs');
    var lz4 = require('lz4');
    var encoder = lz4.createEncoderStream();
    var pack = tar.pack(serverPath, {
      entries: elements
    });
    pack.pipe(encoder);
    callback(encoder);
  };
  var _fixFilename = function (filename) {
    var tarGz = filename.indexOf(".tar.gz");
    var zip = filename.indexOf(".zip");
    var tarLz4 = filename.indexOf(".tar.lz4");
    if (tarGz !== -1) {
      filename = filename.substring(0, tarGz).concat('.tar.lz4');
    } else if (zip !== -1) {
      filename = filename.concat(".lz4");
    } if (tarLz4 !== -1) {
      return filename;
    }
    return filename;
  };

  async.waterfall([
    function (wCb) {
      sanitizeMap(wCb);
    },
    function (mapDirs, files, wCb) {
      async.waterfall([
        function (pCb) {
          _getWriteStream(mapDirs, function (writeStream) {
            var fixedFilename = _fixFilename(gameServerConfig.map.filename);
            var data = {
              filename: fixedFilename,
              metadata: {
                name: gameServerConfig.map.metadata.name,
                type: 'map',
                ext: 'lz4',
                parent: gameServerConfig.map._id
              }
            };
            Model.insert(writeStream, data, gameServerConfig.gridfs, function () {
              console.log('finished bundling map');
              pCb(null);
            });
          });
        },
        function (pCb) {
          _getWriteStream(files, function (writeStream) {
            var fixedFilename = _fixFilename(gameServerConfig.exec.filename);
            var data = {
              filename: fixedFilename,
              metadata: {
                name: gameServerConfig.exec.metadata.name,
                type: 'exec',
                ext: 'lz4',
                parent: gameServerConfig.exec._id
              }
            };
            Model.insert(writeStream, data, gameServerConfig.gridfs, function () {
              console.log('finished bundling exec');
              pCb(null);
            });
          });
        }
      ],
        function (err) {
          console.log('[SERVER.UTIL] finished parallel')
          /*
          rimraf('./temp', function () {
            fs.mkdir('./temp', function () {
              wCb(err);
            });
          });
          */
          wCb(err);
      });
    }
  ], function (err) {
    cb(err);
  });
  /*
  var threshold = 1200000; //20 minutes
  Model.getFileData(currentServer.map, function (err, doc) {
    console.log(err, typeof doc);
    var d = new Date(doc.uploadDate);
    console.log(Date.now() - doc.uploadDate.getTime());
  });
  */
}

function sanitizeMap (callback) {
  var _getDirs = function (base, exclude, cb) {
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
    _getDirs(path.join(serverPath, directory), [], function (err, nestedDirs, nestedFiles) {
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
  async.waterfall([
    function (wCb) {
      _getDirs(serverPath, [], wCb);
    },
    function (dirs, files, wCb) {
      async.filter(dirs, _isMapDir, function (mapDirs) {
        var dirsToRemove = dirs.filter(function (el) {
          return mapDirs.indexOf(el) === -1;
        });
        var thingsToRemove = files.concat(dirsToRemove);
        wCb(null, mapDirs, thingsToRemove);
      });
    }
  ],
    function (err, matches, removed) {
      callback(err, matches, removed);
  });
}

function sanitizeExec (exclude, thingsToRemove, callback) {
  var _getExec = function (files, callback) {
    var _isExec = function (file, fCb) {
      var extension = file.slice(file.lastIndexOf('.'));
      if (extension === '.jar') {
        //console.log('potential jar here!', file);
        getFileType(path.join(serverPath, file), function (err, type) {
          if (type !== null && type.ext === 'zip') {
            fCb(true);
          } else {
            fCb(false);
          }
        });
      } else {
        fCb(false);
      }
    };
    var _priorize = function (pCb) {
      var _pickLastATime = function (execs, lCb) {
        var elements = [];
        async.each(execs,
          function (element, eCb) {
            fs.stat(path.join(serverPath, element), function (err, stats) {
              elements.push({element: element, atime: stats.atime});
              eCb(err);
            });
          },
          function (err) {
            elements.sort(function (a, b) {
              return b.atime.getTime() - a.atime.getTime();
            });
            lCb(err, elements[0].element);
          });
      };
      execs = execs.filter(function (el) {
        return el.indexOf('server') !== -1 || 
               el.indexOf('spigot') !== -1 || 
               el.indexOf('bukkit') !== -1 ||
               el.indexOf('minecraft') !== -1;
      });
      if (execs.length > 1) {
        _pickLastATime(execs, function (err, exec) {
          pCb(err, exec);
        });
      } else {
        pCb(null, execs[0]);
      }
    };
    async.filter(files, _isExec, function (execs) {
      if (execs.length > 1) {
        _priorize(function (err, exec) {
          callback(err, exec);
        });
      } else {
        callback(null, execs[0]);
      }
    });
  };
  var _getDirs = function (base, exclude, cb) {
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
  var _isMapDir = function (directory, fCb) { //check for empty folder
    var matches = [];
    var refs = ['region', 'DIM1', 'DIM-1'];
    _getDirs(path.join(serverPath, directory), [], function (err, nestedDirs, nestedFiles) {
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
  async.waterfall([
    function (wCb) {
      var removedThings = [];
      async.each(thingsToRemove,
        function (thingToRemove, eCb) {
          rimraf(path.join(serverPath, thingToRemove), function (err) {
            removedThings.push(thingToRemove);
            eCb(err);
          });
        },
        function (err) {
          console.log(err);
          wCb(err, exclude, removedThings);
        });
    },
    function (exclude, removedThings, wCb) {
      _getDirs(serverPath, exclude, function (err, filteredDirs, files) {
        wCb(err, filteredDirs, files);
      });
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
          rimraf(path.join(serverPath, execMapDir), function (err) {
            removedThings.push(execMapDir);
            eCb(err);
          });
        },
        function (err) {
          wCb(err, removedThings, files);
        });
    },
    function (sExecRemoved, files, wCb) {
      _getExec(files, function (err, exec) {
        wCb(err, exec, files);
      });
    }
  ], function (err, exec, files) {
    callback(err, exec, files);
  });
}

module.exports.getFileType = getFileType;
module.exports.deepIndexOf = deepIndexOf;
module.exports.base64Encode = base64Encode;
module.exports.getServerProperties = getServerProperties;
module.exports.setServerProperty = setServerProperty;
module.exports.getTree = getTree;
module.exports.applyChanges = applyChanges;
module.exports.bundleServer = bundleServer;
module.exports.storeServer = storeServer;
module.exports.sanitizeMap = sanitizeMap;
module.exports.sanitizeExec = sanitizeExec;