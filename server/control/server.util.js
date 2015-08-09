var async = require('async');
var fs = require('fs');
var fileType = require('file-type');
var tar = require('tar-fs');
var rimraf = require('rimraf');
var path = require('path');
var du = require('du');

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

module.exports.getFileType = getFileType;
module.exports.deepIndexOf = deepIndexOf;
module.exports.base64Encode = base64Encode;
module.exports.getServerProperties = getServerProperties;
module.exports.setServerProperty = setServerProperty;
module.exports.getTree = getTree;