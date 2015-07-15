var Model = require('./grid.model');
var fs = require('fs');
var async = require('async');
var util = require('./server.util.js');
var path = require('path');
var rimraf = require('rimraf');

var current = {map: null, exec: null};
var isUp = false;
var lastCode = null;
var lock = false;

function deployServer (execId, mapId, callback) {
  async.waterfall([
    function (wCb) {
      Model.extractFile(mapId, wCb);
    },
    function (wCb) {
    	sanitizeMap(function (err, matches, sMapRemoved) {
    		wCb(err, matches, sMapRemoved);
    	});
    },
    function (matches, sMapRemoved, wCb) {
      Model.extractFile(execId, function (err) {
      	wCb(err, matches, sMapRemoved);
      });
    },
    function (matches, sMapRemoved, wCb) {
    	sanitizeExec(matches, function (err, exec) {
        wCb(err, exec);
     });
    },
  ], function (err, exec) {
    callback(err, exec);
  });
}

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

function launchServer (exec, opts, callback) {
	//if (isUp === false) {
	  process.send({
	    command: 'start', 
	    config: {
	      procName: 'java', 
	      procArgs: ['-jar', exec, 'nogui'], 
	      procOptions: {
	        cwd: './temp'
	      }
	    }
	  });
	//} else {
	  //this.emit('err', 'Server already running');
	//}
}

function bundleServer () {
	async.waterfall([
		function (wCb) {
			sanitizeMap(wCb);
		},
		function (mapDirs, files, wCb) {
			async.parallel([
				function (pCb) {
					var actions = [];
					var archiver = require('archiver')('zip', {store: true});
					var lz4 = require('lz4');
					var encoderStream = lz4.createEncoderStream();

				}
			],
				function (pCb) {

			});
		}
	]);
	/*
	var threshold = 1200000; //20 minutes
	Model.getFileData(current.map, function (err, doc) {
		console.log(err, typeof doc);
		var d = new Date(doc.uploadDate);
		console.log(Date.now() - doc.uploadDate.getTime());
	});
	/*
}

module.exports = function (app, serverNsp) {

  //console.log(serverNsp)
  process.on('message', function (message) {
    switch (message.command) {
    	case 'status':
    		isUp = message.status;
    		lastCode = message.code;
    		serverNsp.emit('status', {status: isUp, code: lastCode});
    		break;
    	case 'stdout':
    		console.log('emitting stdout');
    		serverNsp.emit('chat', message.stdout);
    		break;
    }

  });

  function start (message) {
  	var socket = this;
  	if (message.map === null && message.exec === null) {
  		socket.emit('err', 'Neither map or exec were provided');
  	} else if (message.map === null && message.exec !== null) {
  		socket.emit('warn', 'No map selected, this will generate an empty one');
  	} else if (lock) {
  		socket.emit('err', 'There is already a server starting');
  	} else {
  		console.log('ControlSocket [START]', message);
  		deployServer(message.exec, message.map, function (err, exec) {
  			if (err) return socket.emit('err', err);
  			current = {map: message.map, exec: message.exec};
  			launchServer(exec);
  		});
  	
  	}

  	/*
  		Model.readStreamFromId(message.map, function (err, readStream, metadata) {
  			if (err) {
  				console.log(err);
  				socket.emit('err', err);
  				return;
  			}
  			console.log(metadata);
  			var writeStream = fs.createWriteStream('./temp/' + Date.now());
  			readStream.pipe(writeStream);
  			writeStream.on('close', function () {
  				console.log('file writted');
  			});
  		
  		});
    	*/
    /*
    	if (isUp === false) {
    	  process.send({
    	    command: 'start', 
    	    config: {
    	      procName: 'java', 
    	      procArgs: ['-jar', 'minecraft_server.jar', 'nogui'], 
    	      procOptions: {
    	        cwd: './game'
    	      }
    	    }
    	  });
    	} else {
    	  this.emit('err', 'Server already running');
    	}
  	*/
  }

  function stop () {
  	bundleServer();
  /*
    if (isUp === true) {
      process.send({
        command: 'stop'
      });
    } else {
      this.emit('err', 'Server is already stopped');
    }
  */
  
  }

  function getStatus () {
    return {status: isUp, code: lastCode};
  }

  function status () {
    this.emit('status', getStatus());
  }

  function list () {
    var socket = this;
    Model.getMapsAndBackups(function (err, docs) {
      //console.log(docs)
      socket.emit('list', docs);
    });
  }

  return {
    start: start,
    stop: stop,
    status: status,
    list: list
  };
};