var EventEmitter = require('events').EventEmitter;
var Model = require('./grid.model');
var fs = require('fs');
var async = require('async');
var util = require('./server.util.js');
var path = require('path');
var rimraf = require('rimraf');
var schedule = require('node-schedule');
var _ = require('lodash');
var root = './temp';
var previewPool = [];
var gameServer = new EventEmitter();
var _controlNsp = null;
var fse = require('fs-extra');
var currentServer = {
  map: null, 
  exec: null, 
  schedules: [],
  status: false,
  lock: false
};

function deployServer (execId, mapId, io, callback) {
  async.waterfall([
    function (wCb) {
      Model.extractFile(mapId, {path: root, io: io}, wCb);
    },
    function (doc, wCb) {
    	sanitizeMap(function (err, matches, sMapRemoved) {
        currentServer.map = doc;
        io.emit('stdin', '[MEANcraft] Sanitized map');
        wCb(err, matches, sMapRemoved);
      });
    },
    function (matches, sMapRemoved, wCb) {
      var changes = [{parent: root, name: 'eula.txt', body: 'eula=true'}];
      console.log('EXEC ID', execId);
      function _applyChanges (doc, aCb) {
        var levelName = matches.sort(function (a, b) { return a.length - b.length;});
        util.applyChanges(changes, function (err) {
          util.setServerProperty(root, 'level-name', levelName[0], function (err) {
            currentServer.exec = doc;
            aCb(err);
            //wCb(err, matches, sMapRemoved);
          });
        });      
      }

      if (_.isPlainObject(execId) && execId.pToken && Array.isArray(execId.changes)) {
        console.log('is plain object')
        changes = changes.concat(execId.changes).reverse();
        Model.getFileData(execId._id, function (err, doc) {
          _applyChanges(doc, function (err) {
            fse.move(path.join('./preview', execId.pToken), root, function (err) {
              wCb(err, matches, sMapRemoved);
            });
          });
        });
      } else {
        Model.extractFile(execId, {path: root, io: io}, function (err, doc) {
          _applyChanges(doc, function (err) {
            wCb(err, matches, sMapRemoved);          
          });
        });
      }
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
	      cwd: root
	    }
	  }
	});
}

function bundleServer (cb) {
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

function addSchedule (config, fn, fnFail) {
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
      if (fnFail) fnFail(job);
    }
  }
  currentServer.schedule = schedule.scheduleJob('current_' + Date.now(), config, function () {
    tryIt();
  });
}

function setSchedule (input) {
  if (Array.isArray(input) && input.length > 0) {
    input.forEach(function (element, index, array) {
      addSchedule(element, backupSchedule, function (job) {
        _controlNsp.emit('stdin', '[MEANcraft] Warning: Backup schedule disabled due long server lock');
        job.cancel();
      });
    });
    console.log(input);
  } else {

  }
}

function lock (broadcast) {
  currentServer.lock = true;
  if (broadcast) _controlNsp.emit('info', {lock: true});
}

function unlock (broadcast) {
  currentServer.lock = false;
  if (broadcast) _controlNsp.emit('info', {lock: false});
}

function backupSchedule () {
  var alphaTime = Date.now();
  _controlNsp.emit('stdin', '[MEANcraft] Backup in progress...' );
  lock();
  bundleServer(function () {
    unlock();
    _controlNsp.emit('stdin', '[MEANcraft] Backup done (' + Math.ceil((Date.now() - alphaTime) / 1000) + ' s)');
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
  unlock();
  currentServer.status = true;
  _controlNsp.emit('info', currentServer);
  setSchedule(currentServer.schedules);
  //_controlNsp.emit('stdin', '[MEANcraft] Scheduled backups are enabled');
  //_controlNsp.emit('stdin', '[MEANcraft] Warning: scheduled backups are disabled');
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
  _controlNsp.emit('info', {selected: currentServer});
  console.log('emitting', currentServer);
  
  function start (message) {
  	var socket = this;
    if (message.map === null && message.exec === null) {
  		socket.emit('err', 'Neither map or exec were provided');
  	} else if (message.map === null && message.exec !== null) {
  		socket.emit('warn', 'No map selected, this will generate an empty one');
  	} else if (currentServer.lock) {
  		socket.emit('err', 'There is already a server starting');
  	} else {
  		lock(true);
      console.log('starting', message);
      var execParams = (message.changes) ? {_id: message.exec, changes: message.changes, pToken: message.pToken} : message.exec;
      currentServer.schedules = message.schedules;
      console.log('ControlSocket [START]', message);
      deployServer(execParams, message.map, serverNsp, function (err, exec) {
        if (err) return socket.emit('err', err);
        launchServer(exec);
        serverNsp.emit('stdin', '[MEANcraft] Bootstrapping server');
      });
    }
  }

  function stop () {
  	if (!currentServer.lock) {
      lock(true);
  		bundleServer(function () {
  			currentServer = {
          map: null,
          exec: null,
          schedules: null
        };
        unlock(true);
  		});
  	} else {
  		this.emit('err', 'The server is busy...');
  	}
  }

  function info () {
    var self = this;
    var obj = {
      selected: currentServer
    };
    async.parallel({
      docs: function (pCb) {
        Model.getMapsAndBackups(function (err, docs) {
          //obj = _.merge(docs, obj);
          pCb(err, docs);
        });
      },
      tree: function (pCb) {
        util.getTree(root, function (err, tree) {
          //obj = _.merge({tree: tree}, obj);
          //console.log(tree);
          pCb(err, {tree: tree});
        });
      }
    }, function (err, results) {
      var temp = _.merge(results.docs, results.tree);
      obj = _.merge(temp, obj);
      self.emit('info', obj);
      //console.log(temp)
    });
    //Model.getMapsAndBackups(function (err, docs) {
    //  obj = _.merge(docs, obj);
    //  self.emit('info', obj);
    //});
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

  function read (file) {
    var socket = this;
    if (!file) return;
    console.log(file);
    fs.readFile(path.join(file.parent, file.name), 'utf8', function (err, data) {
      socket.emit('read', data);
    });
  }

  function preview (exec) {
    var socket = this;
    var pToken = 'PE' +  Date.now();
    var dir = path.join('./preview', pToken);
    Model.extractFile(exec, {path: dir}, function (err, file) {
      util.getTree('./preview', function (err, tree) {
        socket.emit('preview', {tree: tree, pToken: pToken});
      });
    });
  }

  return {
    start: start,
    stop: stop,
    info: info,
    list: list,
    chat: chat,
    read: read,
    preview: preview
  };
};