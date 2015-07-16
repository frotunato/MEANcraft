var fs = require('fs');
var async = require('async');
var rimraf = require('rimraf');
/*
function sanitizeMap (directory, callback) {
	var path = require('path');
	var mapDirectories = ['region', 'DIM1', 'DIM-1'];
	async.waterfall([
		function (wCb) {
			_getDirs(directory, [], wCb);
		},
		function (dirs, files, wCb) {
			var _isValidDir = function (dir, fCb) {
				var matches = [];
				var refs = ['region', 'DIM1', 'DIM-1'];
				_getDirs(path.join(directory, dir), [], function (err, nestedDirs, nestedFiles) {
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
			async.filter(dirs, _isValidDir, function (mapDirs) {
				wCb(null, mapDirs, files);
			});
		},
		function (mapDirs, filesToRemove, wCb) {
			var removedFiles = [];
			async.each(filesToRemove,
				function (fileToRemove, eCb) {
					rimraf(path.join(directory, fileToRemove), function (err) {
						removedFiles.push(fileToRemove);
						eCb(err);
					});
				},
				function (err) {
					wCb(err, mapDirs, removedFiles);
				});
		}
	],
		function (err, matches, removed) {
			console.log(matches, removed);
		});
}



sanitizeMap('./temp/', function () {
	
});

function sanitizeExec (directory, exclude, callback) {
	var excludedDirs = exclude || [];
	async.waterfall([
		function (wCb) {
			fs.readdir(directory, wCb);
		}
	]);

}
*/

var fileType = require('file-type');
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
//var root = './temp/';
var path = require('path');


/*
_getExec(['spigot_server.jar', 'minecraft_s.jar'], function (err, exec) {
	console.log(exec)
})
*/
/*
function _getExec (files, callback) {
	var _isExec = function (file, fCb) {
		var extension = file.slice(file.lastIndexOf('.'));
		if (extension === '.jar') {
			getFileType(path.join(root, file), function (err, type) {
				if (type !== null && type.ext === 'zip') {
					fCb(true);
				} else {
					fCb(false);
				}
			});
		}
	};
	async.filter(files, _isExec, function (execs) {
		var _priorize = function (pCb) {
			var _pickLastATime = function (execs, lCb) {
				var elements = [];
				async.each(execs,
					function (element, eCb) {
						fs.stat(path.join(root, element), function (err, stats) {
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
		if (execs.length > 1) {
			_priorize(function (err, exec) {
				callback(err, exec);
			});
		} else {
			callback(null, execs[0]);
		}
	});
}
*/

function sanitizeMap (callback) {
  var root = './temp/';
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
    }
    /*
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
    */
  ],
    function (err, matches, removed) {
      callback(err, matches, removed);
  });
}

function sanitizeExec (exclude, thingsToRemove, callback) {
  var root = './temp/';
  var _getExec = function (files, callback) {
    var _isExec = function (file, fCb) {
      var extension = file.slice(file.lastIndexOf('.'));
      if (extension === '.jar') {
        util.getFileType(path.join(root, file), function (err, type) {
          if (type !== null && type.ext === 'zip') {
            fCb(true);
          } else {
            fCb(false);
          }
        });
      }
    };
    async.filter(files, _isExec, function (execs) {
      var _priorize = function (pCb) {
        var _pickLastATime = function (execs, lCb) {
          var elements = [];
          async.each(execs,
            function (element, eCb) {
              fs.stat(path.join(root, element), function (err, stats) {
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
  async.waterfall([
    function (exclude, thingsToRemove, wCb) {
      var removedThings = [];
      async.each(thingsToRemove,
        function (thingToRemove, eCb) {
          rimraf(path.join(root, thingToRemove), function (err) {
            removedThings.push(thingToRemove);
            eCb(err);
          });
        },
        function (err) {
          wCb(err, exclude, removedThings);
        });
    },
    function (exclude, removedThings, wCb) {
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
    },
    function (sExecRemoved, files, wCb) {
      _getExec(files, function (err, exec) {
        console.log('exec', exec);
        wCb(err, exec, files);
      });
    }
  ], function (err, exec, files) {
    callback(err, exec, files);
  });
}
/*
sanitizeMap(function (err, exclude, thingsToRemove) {
  console.log('sanitized map', exclude, thingsToRemove);
})
*/
var actions = [];
actions.push({
  cwd: './temp/', 
  expand: true,
  src: ['**/*']
  //, 
  //dest: mapDirs[i]
});

/*
function bundle () {
  var alpha = Date.now();
  var archiver = require('archiver')('zip', {store: true, statConcurrency: 4});
  var lz4 = require('lz4');
  var encoder = lz4.createEncoderStream({highCompression: false});
  archiver.bulk(actions);
  archiver.finalize();
  var writeStream = fs.createWriteStream('yolo.zip.lz4');
  archiver.pipe(encoder).pipe(writeStream);
 
}
*/
var lz4 = require('lz4');
var mapDirs = ['HIPERDINO'];
var execs = ['spigot_server.jar', "logs", "eula.txt", "server.properties"];
var root = './temp/';

async.parallel([
  function (pCb) {
    _getWriteStream(mapDirs, [], function (writeStream) {
      writeStream.once('close', function () {
        console.log('finished');
        pCb();
      });
    });
  },
  function (pCb) {
    _getWriteStream(execs, mapDirs, function (writeStream) {
      writeStream.once('close', function () {
        console.log('finished 2');
        pCb();
      });
    });
  }
], function () {

});
//bundle()

function _getWriteStream (elements, exclude, callback) {
  var archiver = require('archiver')('zip', {store: true});
  var encoder = lz4.createEncoderStream();
  var actions = [];
  var excludedSrcs = exclude.map(function (element) {
    return '!' + element + '/**';
  }).concat(['**/*']).reverse();
  var ext = '.zip';
  if (exclude.length > 0) {
    archiver = require('archiver')('tar');
    ext = '.tar';
    actions.push({
      cwd: root,
      expand: true,
      src: excludedSrcs,
      dest: undefined
    });
  } else {
    elements.forEach(function (element, index, array) {
      var cwd = path.join(root, element);
      var src = ['**/*'];
      var dest = element;    
      actions.push({
        cwd: cwd,
        expand: true,
        src: src,
        dest: dest
      });
    });
  }


  var writeStream = fs.createWriteStream(Date.now() + ext);
  console.log(actions);
  archiver.bulk(actions);
  archiver.finalize();
  archiver.pipe(writeStream);
  callback(archiver);
}