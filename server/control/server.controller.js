var EventEmitter = require('events').EventEmitter;
var Model = require('./grid.model');
var fs = require('fs');
var async = require('async');
var util = require('./server.util.js');
var path = require('path');
var rimraf = require('rimraf');

var _controlNsp = null;
var gameServer = new EventEmitter();
var current = {map: null, exec: null, schedule: null};
var isUp = false;
var lastCode = null;
var lock = false;
var schedule = require('node-schedule');

function deployServer (execId, mapId, io, callback) {
  async.waterfall([
    function (wCb) {
      Model.extractFile(mapId, io, wCb);
    },
    function (doc, wCb) {
    	sanitizeMap(function (err, matches, sMapRemoved) {
    		current.map = doc;
    		io.emit('chat', '[MEANcraft] Sanitized map');
    		wCb(err, matches, sMapRemoved);
    	});
    },
    function (matches, sMapRemoved, wCb) {
      Model.extractFile(execId, io, function (err, doc) {
      	var levelName = matches.sort(function (a, b) {
      		return a.length - b.length;
      	});
      	console.log('levelName', levelName);
      	util.setServerProperty('./temp/', 'level-name', levelName[0], function (err) {
      		fs.writeFile('./temp/eula.txt', 'eula=true', function () {
      			current.exec = doc;
      			wCb(err, matches, sMapRemoved);
      		});
      	});
      });
    },
    function (matches, sMapRemoved, wCb) {
    	sanitizeExec(matches, sMapRemoved, function (err, exec) {
        io.emit('chat', '[MEANcraft] Sanitized exec files');
        wCb(err, exec);
     });

    },
  ], function (err, exec) {
    //console.log('current after deploy', current);
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
        //console.log('potential jar here!', file);
        util.getFileType(path.join(root, file), function (err, type) {
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
      var removedThings = [];
      async.each(thingsToRemove,
        function (thingToRemove, eCb) {
          //console.log('things to remove', thingsToRemove);
          rimraf(path.join(root, thingToRemove), function (err) {
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
      _getDirs(root, exclude, function (err, filteredDirs, files) {
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
        wCb(err, exec, files);
      });
    }
  ], function (err, exec, files) {
    callback(err, exec, files);
  });
}

function launchServer (exec, opts, callback) {
	console.log('launchServer with', exec, opts);
	process.send({
	  command: 'start', 
	  body: {
	    procName: 'java', 
	    procArgs: ['-jar', exec, 'nogui'], 
	    procOptions: {
	      cwd: './temp'
	    }
	  }
	});
}

function bundleServer (cb) {
	var root = './temp/';
	var _getWriteStream = function (elements, callback) {
	  var tar = require('tar-fs');
	  var lz4 = require('lz4');
	  var encoder = lz4.createEncoderStream();
	  var pack = tar.pack(root, {
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
			async.parallel([
				function (pCb) {
					_getWriteStream(mapDirs, function (writeStream) {
						var fixedFilename = _fixFilename(current.map.filename);
					  var data = {
					  	filename: fixedFilename,
					  	metadata: {
					  		name: current.map.metadata.name,
					  		type: 'map',
					  		ext: 'lz4',
					  		parent: current.map._id
					  	}
					  };
					  Model.insert(writeStream, data, function () {
					  	console.log('finished bundling map');
					  	pCb();
					  });
					});
				},
				function (pCb) {
					_getWriteStream(files, function (writeStream) {
						var fixedFilename = _fixFilename(current.exec.filename);
						var data = {
							filename: fixedFilename,
							metadata: {
								name: current.exec.metadata.name,
								type: 'exec',
								ext: 'lz4',
								parent: current.exec._id
							}
						};
						Model.insert(writeStream, data, function () {
							console.log('finished bundling exec');
							pCb();
						});
					});
				}
			],
				function (err) {
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
	],
		function (err) {
			cb(err);
		});
	/*
	var threshold = 1200000; //20 minutes
	Model.getFileData(current.map, function (err, doc) {
		console.log(err, typeof doc);
		var d = new Date(doc.uploadDate);
		console.log(Date.now() - doc.uploadDate.getTime());
	});
	*/
}

process.on('message', function (message) {
  gameServer.emit(message.command, message.body);
});

process.send({command: 'status'});

gameServer.on('stdout', function (body) {
  if (isUp === false && /^\[[0-9]{2}:[0-9]{2}:[0-9]{2} INFO]: Done/.test(body)) {
    isUp = true;
    lock = false;
    _controlNsp.emit('status', {status: 'Online'});
    if (current.schedule) {
      var backupSchedule = schedule.scheduleJob();
      _controlNsp.emit('chat', '[MEANcraft] Scheduled backups are enabled');
    } else {
      _controlNsp.emit('chat', '[MEANcraft] Warning: scheduled backups are disabled');
    }
  }
  _controlNsp.emit('chat', body);
});

gameServer.on('status', function (message) {
  //isUp = message.status;//var a = ';[15:41:34 INFO]: '
  //lastCode = message.body;
  _controlNsp.emit('status', {status: isUp, code: lastCode});
});


module.exports = function (app, serverNsp) {
  _controlNsp = serverNsp;
    /*
      switch (message.command) {
        case 'status':
      		//gameServer.emit(message.command, message.body);
          //isUp = message.status;var a = ';[15:41:34 INFO]: '
      		//lastCode = message.code;
      		//serverNsp.emit('status', {status: isUp, code: lastCode});
      		break;
      		
      	case 'stdout':
      		gameServer.emit(message.command, message.body);
          //message.stdout = message.stdout.replace(/(\r\n|\n|\r)/gm,"");
      		//console.log(message.stdout);
      		if (isUp === false && /^\[[0-9]{2}:[0-9]{2}:[0-9]{2} INFO]: Done/.test(message.stdout)) {
      			isUp = true;
      			serverNsp.emit('status', {status: 'Online'});
      			if (current.schedule) {
              var backupSchedule = schedule.scheduleJob()
              serverNsp.emit('chat', 'Scheduled backups');
            }
      			console.log('now is up');
      		}
      		//} else if (isUp === false && /^\[[0-9]{2}:[0-9]{2}:[0-9]{2} INFO]: /.test(message.stdout)) {
      		//	var chunk = message.stdout.substring(17);
      		//	var res = chunk.match(/([0-9]{2}%)/);
      		//	var percentage = (res === null) ? 100 : res[0];
      		//	var reason = (res === null) ? chunk : chunk.substring(0, res[1]);
      		//	serverNsp.emit('progress', {reason: reason, percentage: percentage});
      		//}
      		serverNsp.emit('chat', message.stdout + '');
      		break;
      }
    */
  function start (message) {
  	var socket = this;
  	if (message.map === null && message.exec === null) {
  		socket.emit('err', 'Neither map or exec were provided');
  	} else if (message.map === null && message.exec !== null) {
  		socket.emit('warn', 'No map selected, this will generate an empty one');
  	} else if (lock) {
  		socket.emit('err', 'There is already a server starting');
  	} else {
  		lock = true;
  		console.log('ControlSocket [START]', message);
  		deployServer(message.exec, message.map, serverNsp, function (err, exec) {
  			lock = false;
  			//var test = schedule.scheduleJob('* * * * *', function () {
        //  bundleServer(function () {
        //    console.log('server bundled!!!!!!');
        //  });
        //});
        if (err) return socket.emit('err', err);
  			launchServer(exec);
  			serverNsp.emit('chat', '[MEANcraft] Bootstrapping server');
  		});
  	}
  }

  function stop () {
  	if (!lock) {
  		lock = true;
  		bundleServer(function () {
  			current = {
          map: null,
          exec: null,
          schedule: null
        };
        lock = false;
  		});
  	} else {
  		this.emit('err', 'The server is busy...');
  	}
  }

  function getStatus () {
    var status = (isUp) ? 'Online' : 'Offline';
    return {status: status, code: lastCode};
  }

  function status () {
    this.emit('status', getStatus());
  }

  function list () {
    var socket = this;
    Model.getMapsAndBackups(function (err, docs) {
      socket.emit('list', docs);
    });
  }

  function chat (message) {
  	if (!message || isUp === false) return;
  	console.log('ControlSocket [CHAT]', message);
  	process.send({command: 'stdin', body: message});
  }

  return {
    start: start,
    stop: stop,
    status: status,
    list: list,
    chat: chat
  };
};