var EventEmitter = require('events').EventEmitter;
var Model = require('./grid.model');
var fs = require('fs');
var async = require('async');
var util = require('./server.util.js');
var path = require('path');
var rimraf = require('rimraf');
var schedule = require('node-schedule');

var gameServer = new EventEmitter();
var _controlNsp = null;
var currentServer = {
  map: null, 
  exec: null, 
  schedule: null,
  status: false,
  lock: false
};

function deployServer (execId, mapId, io, callback) {
  async.waterfall([
    function (wCb) {
      Model.extractFile(mapId, io, wCb);
    },
    function (doc, wCb) {
    	sanitizeMap(function (err, matches, sMapRemoved) {
    		currentServer.map = doc;
    		io.emit('stdin', '[MEANcraft] Sanitized map');
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
      			currentServer.exec = doc;
      			wCb(err, matches, sMapRemoved);
      		});
      	});
      });
    },
    function (matches, sMapRemoved, wCb) {
    	sanitizeExec(matches, sMapRemoved, function (err, exec) {
        io.emit('stdin', '[MEANcraft] Sanitized exec files');
        wCb(err, exec);
     });

    },
  ], function (err, exec) {
    //console.log('currentServer after deploy', currentServer);
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
						var fixedFilename = _fixFilename(currentServer.map.filename);
					  var data = {
					  	filename: fixedFilename,
					  	metadata: {
					  		name: currentServer.map.metadata.name,
					  		type: 'map',
					  		ext: 'lz4',
					  		parent: currentServer.map._id
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
						var fixedFilename = _fixFilename(currentServer.exec.filename);
						var data = {
							filename: fixedFilename,
							metadata: {
								name: currentServer.exec.metadata.name,
								type: 'exec',
								ext: 'lz4',
								parent: currentServer.exec._id
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
	Model.getFileData(currentServer.map, function (err, doc) {
		console.log(err, typeof doc);
		var d = new Date(doc.uploadDate);
		console.log(Date.now() - doc.uploadDate.getTime());
	});
	*/
}
/*
function addSchedule (config, fn) {
  if (!config) return;
  var num = 0;
  var retry = function () {
      if (num < 2) {
        num ++;
        console.log('ControlSocket [ADD SCHEDULE]', 'server is currently locked, retriying in 30 seconds (' + num + '/2)');
        setTimeout(function () {
          if (currentServer.lock) {
            retry();
          } else {
            fn();
          }
        }, 30000);
      } else {
        console.log('ControlSocket [ADD SCHEDULE]', 'server locked for a long period of time, aborting schedule...');
      }
  };
  schedule.scheduleJob(config, function () {
    if (currentServer.lock) {
      retry();
    } else {
      fn();
    }
  });
}
*/

function addSchedule (fn, fnFail) {
  var currentTry = 0;
  var maxTries = 2;
  function tryIt () {
    if (currentTry < maxTries) {
      if (currentServer.lock) {
        currentTry ++;
        console.log('ControlSocket [ADD SCHEDULE]', 'server is currently locked, retrying in 5 seconds (' + currentTry + '/' + maxTries + ')');
        if (currentTry >= maxTries) {
          tryIt();
        } else {
          setTimeout(tryIt, 5000);
        }
      } else {
        fn();
      }
    } else {
      console.log('ControlSocket [ADD SCHEDULE]', 'server locked for a long period of time, aborting schedule...');
      fnFail(job);
    }
  }
  console.log('trying')
  currentServer.schedule = schedule.scheduleJob('current_' + Date.now(), currentServer.schedule, function () {
    tryIt();
  });
}

process.on('message', function (message) {
  gameServer.emit(message.command, message.body);
});

process.send({command: 'status'});

gameServer.on('stdout', function (body) {
  if (currentServer.status === false && /^\[[0-9]{2}:[0-9]{2}:[0-9]{2} INFO]: Done/.test(body)) {
    gameServer.emit('start');
  }
  _controlNsp.emit('stdin', body);
});

gameServer.on('start', function () {
  currentServer.lock = false;
  currentServer.status = true;
  _controlNsp.emit('info', currentServer);
  if (currentServer.schedule) {
    _controlNsp.emit('stdin', '[MEANcraft] Scheduled backups are enabled');
    var backupSchedule = function () {
      var alphaTime = Date.now();
      _controlNsp.emit('stdin', '[MEANcraft] Backup in progress...' );
      currentServer.lock = true;
      bundleServer(function () {
        currentServer.lock = false;
        _controlNsp.emit('stdin', '[MEANcraft] Backup done (' + Math.ceil((Date.now() - alphaTime) / 1000) + ' s)');
      });
    };
    console.log('scheduling', currentServer.schedule);
    addSchedule(backupSchedule, function (job) {
      _controlNsp.emit('stdin', '[MEANcraft] Warning: Backup schedule disabled due long server lock');
      job.cancel();
    });
  } else {
    _controlNsp.emit('stdin', '[MEANcraft] Warning: scheduled backups are disabled');
  }
});

gameServer.on('stop', function (body) {
  currentServer.status = false;
  if (currentServer.schedule !== null) {
    currentServer.schedule.cancel();
    currentServer.schedule = null;
  }
  _controlNsp.emit('info', {
    status: currentServer.status,
    lock: currentServer.lock
  });
});

module.exports = function (app, serverNsp) {
  _controlNsp = serverNsp;
    /*
      switch (message.command) {
        case 'status':
      		//gameServer.emit(message.command, message.body);
          //currentServer.status = message.status;var a = ';[15:41:34 INFO]: '
      		//lastCode = message.code;
      		//serverNsp.emit('status', {status: currentServer.status, code: lastCode});
      		break;
      		
      	case 'stdout':
      		gameServer.emit(message.command, message.body);
          //message.stdout = message.stdout.replace(/(\r\n|\n|\r)/gm,"");
      		//console.log(message.stdout);
      		if (currentServer.status === false && /^\[[0-9]{2}:[0-9]{2}:[0-9]{2} INFO]: Done/.test(message.stdout)) {
      			currentServer.status = true;
      			serverNsp.emit('status', {status: 'Online'});
      			if (currentServer.schedule) {
              var backupSchedule = schedule.scheduleJob()
              serverNsp.emit('stdin', 'Scheduled backups');
            }
      			console.log('now is up');
      		}
      		//} else if (currentServer.status === false && /^\[[0-9]{2}:[0-9]{2}:[0-9]{2} INFO]: /.test(message.stdout)) {
      		//	var chunk = message.stdout.substring(17);
      		//	var res = chunk.match(/([0-9]{2}%)/);
      		//	var percentage = (res === null) ? 100 : res[0];
      		//	var reason = (res === null) ? chunk : chunk.substring(0, res[1]);
      		//	serverNsp.emit('progress', {reason: reason, percentage: percentage});
      		//}
      		serverNsp.emit('stdin', message.stdout + '');
      		break;
      }
    */
  function start (message) {
  	var socket = this;
    if (message.map === null && message.exec === null) {
  		socket.emit('err', 'Neither map or exec were provided');
  	} else if (message.map === null && message.exec !== null) {
  		socket.emit('warn', 'No map selected, this will generate an empty one');
  	} else if (currentServer.lock) {
  		socket.emit('err', 'There is already a server starting');
  	} else {
  		currentServer.lock = true;
  		currentServer.schedule = '*/' + message.schedule + ' * * * *';
      console.log('ControlSocket [START]', message);
  		deployServer(message.exec, message.map, serverNsp, function (err, exec) {
        if (err) return socket.emit('err', err);
  			launchServer(exec);
  			serverNsp.emit('stdin', '[MEANcraft] Bootstrapping server');
  		});
  	}
  }

  function stop () {
  	if (!currentServer.lock) {
  		currentServer.lock = true;
  		bundleServer(function () {
  			currentServer = {
          map: null,
          exec: null,
          schedule: null
        };
        currentServer.lock = false;
  		});
  	} else {
  		this.emit('err', 'The server is busy...');
  	}
  }

  function info () {
    this.emit('info', currentServer);
  }

  function list () {
    var socket = this;
    Model.getMapsAndBackups(function (err, docs) {
      socket.emit('list', docs);
    });
  }

  function chat (message) {
  	if (!message || currentServer.status === false) return;
  	console.log('ControlSocket [CHAT]', message);
  	process.send({command: 'stdin', body: message});
  }

  return {
    start: start,
    stop: stop,
    info: info,
    list: list,
    chat: chat
  };
};