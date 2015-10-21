var EventEmitter = require('events').EventEmitter;
var Model = require('./grid.model');
var fs = require('fs');
var async = require('async');
var util = require('./server.util.js');
var path = require('path');
var rimraf = require('rimraf');
var schedule = require('node-schedule');
var _ = require('lodash');
var gameServer = new EventEmitter();
var _controlNsp = null;
var fse = require('fs-extra');
var serverPath = null;
var previewPath = null;
var gameServerConfig = {};

process.on('message', function (message) {
  gameServer.emit(message.command, message.body);
});

process.send({command: 'status'});

gameServer.on('stdout', function (body) {
  if (gameServer && /^\[[0-9]{2}:[0-9]{2}:[0-9]{2} INFO]: Done/.test(body)) {
    gameServer.emit('start');
  }
  _controlNsp.emit('stdin', body);
});

gameServer.on('start', function () {
  unlock();
  //gameServerConfig.set('status', true);
  _controlNsp.emit('info', gameServerConfig);
  setSchedule(gameServerConfig.schedules);
  //_controlNsp.emit('stdin', '[MEANcraft] Scheduled backups are enabled');
  //_controlNsp.emit('stdin', '[MEANcraft] Warning: scheduled backups are disabled');
});

gameServer.on('stdin', function (body) {
  console.log('sending', body);
  process.send({command: 'stdin', body: body});
});

gameServer.on('stop', function (body) {
  gameServerConfig = {};
  unlock(true);
  if (gameServerConfig.schedule) {
    gameServerConfig.schedule.cancel();
    gameServerConfig.schedule = null;
  }
  _controlNsp.emit('info', {
    status: (gameServerConfig) ? true : false,
    lock: gameServerConfig.lock
  });
});

function deployServer (execId, mapId, io, callback) {
  async.waterfall([
    function (wCb) {
      Model.extractFile(mapId, {path: serverPath, io: io}, wCb);
    },
    function (doc, wCb) {
      util.sanitizeMap(function (err, matches, sMapRemoved) {
        gameServerConfig.map = doc;
        if (io) io.emit('stdin', '[MEANcraft] Sanitized map');
        wCb(err, matches, sMapRemoved);
      });
    },
    function (matches, sMapRemoved, wCb) {
      var changes = [{parent: serverPath, name: 'eula.txt', body: 'eula=true'}];
      
      function _applyChanges (doc, aCb) {
        var levelName = matches.sort(function (a, b) { return a.length - b.length;});
        util.applyChanges(changes, function (err) {
          util.setServerProperty(serverPath, 'level-name', levelName[0], function (err) {
            gameServerConfig.exec = doc;
            aCb(err);
            //wCb(err, matches, sMapRemoved);
          });
        });      
      }
      if (_.isPlainObject(execId) && execId.pToken) {
        Model.getFileData(execId._id, function (err, doc) {
          _applyChanges(doc, function (err) {
            fse.move(path.join('./preview', execId.pToken), serverPath, function (err) {
              wCb(err, matches, sMapRemoved);
            });
          });
        });
      } else {
        Model.extractFile(execId, {path: serverPath, io: io}, function (err, doc) {
          _applyChanges(doc, function (err) {
            wCb(err, matches, sMapRemoved);          
          });
        });
      }
    },
    function (matches, sMapRemoved, wCb) {
      util.sanitizeExec(matches, sMapRemoved, function (err, exec) {
        if (io) io.emit('stdin', '[MEANcraft] Sanitized exec files');
        wCb(err, exec);
     });
    },
  ], function (err, exec) {
    console.log('exec after deploy', exec);
    callback(err, exec);
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
        cwd: serverPath
      }
    }
  });
}

function addSchedule (config, fn, fnFail) {
  var currentTry = 0;
  var maxTries = 2;
  function tryIt () {
    if (currentTry < maxTries) {
      if (gameServerConfig.lock) {
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
  gameServerConfig.schedule = schedule.scheduleJob('current_' + Date.now(), config, function () {
    tryIt();
  });
}

function setSchedule (input) {
  console.log('setting schedule', input)
  if (Array.isArray(input) && input.length > 0) {
    input.forEach(function (element, index, array) {
      addSchedule(element, backupSchedule, function (job) {
        _controlNsp.emit('stdin', '[MEANcraft] Warning: Backup schedule disabled due long server lock');
        job.cancel();
      });
    });
  } else {

  }
}

function lock (broadcast) {
  gameServerConfig.lock = true;
  if (broadcast) _controlNsp.emit('info', {lock: true});
}

function unlock (broadcast) {
  gameServerConfig.lock = false;
  if (broadcast) _controlNsp.emit('info', {lock: false});
}

function backupSchedule () {
  var alphaTime = Date.now();
  console.log('backupSchedule executing');
  _controlNsp.emit('stdin', '[MEANcraft] Backup in progress...' );
  gameServer.emit('stdin', 'say Backup in progress, you may experience lag');
  lock(true);
  util.storeServer(gameServerConfig, function () {
    console.log('called util.storeServer');
    unlock(true);
    var delta = Math.ceil((Date.now() - alphaTime) / 1000);
    _controlNsp.emit('stdin', '[MEANcraft] Backup done (' + delta + 's)');
    gameServer.emit('stdin', 'say Backup done, time elapsed: ' + delta + 's');
  });
}

module.exports = function (app, serverNsp) {
  _controlNsp = serverNsp;
  _controlNsp.emit('info', {selected: gameServerConfig});
  serverPath = app.get('serverPath');
  previewPath = app.get('previewPath');

  console.log('emitting', gameServerConfig);
  
  function start (message) {
  	var socket = this;
    if (message.map === null && message.exec === null) {
  		socket.emit('err', 'Neither map or exec were provided');
  	} else if (message.map === null && message.exec !== null) {
  		socket.emit('warn', 'No map selected, this will generate an empty one');
  	} else if (gameServerConfig.lock) {
  		socket.emit('err', 'There is already a server starting');
  	} else {
  		lock(true);
      console.log('starting', message);
      var execParams = (message.pToken) ? {_id: message.exec, pToken: message.pToken} : message.exec;
      gameServerConfig.schedules = message.schedules;
      console.log('ControlSocket [START]', message);
      deployServer(execParams, message.map, serverNsp, function (err, exec) {
        if (err) return socket.emit('err', err);
        launchServer(exec);
        serverNsp.emit('stdin', '[MEANcraft] Bootstrapping server');
      });
    }
  }

  function stop () {
  	if (!gameServerConfig.lock) {
      lock(true);
  		util.storeServer(function () {
        gameServerConfig = {};
        unlock(true);
  		});
  	} else {
  		this.emit('err', 'The server is busy...');
  	}
  }

  function info () {
    var self = this;
    var obj = {
      selected: gameServerConfig
    };
    async.parallel({
      docs: function (pCb) {
        Model.getMapsAndBackups(function (err, docs) {
          //obj = _.merge(docs, obj);
          pCb(err, docs);
        });
      },
      tree: function (pCb) {
        util.getTree(serverPath, function (err, tree) {
          //obj = _.merge({tree: tree}, obj);
          //console.log(tree);
          pCb(err, {tree: tree});
        });
      }
    }, function (err, results) {
      var temp = _.merge(results.docs, results.tree);
      obj = _.merge(temp, obj);
      console.log('sending', obj);
      self.emit('info', obj);
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
  	if (!message || !gameServerConfig) return;
  	console.log('ControlSocket [CHAT]', message);
  	gameServer.emit('stdin', message);
  }

  function read (file) {
    var socket = this;
    if (!file) return;
    var filePath = path.join(file.parent, file.name);
    console.log(file);
    fs.readFile(filePath, 'utf8', function (err, data) {
      socket.emit('read', data);
    });
  }

  function modify (file) {
    var socket = this;
    if (!file) return;
    var filePath = path.join(file.parent, file.name);
    fs.writeFile(filePath, file.content, function (err) {
      socket.emit('modify');
    });
  }

  function preview (exec) {
    var socket = this;
    var pToken = 'PE' +  Date.now();
    var dir = path.join('./preview', pToken);
    Model.extractFile(exec, {path: dir}, function (err, file) {
      util.getTree(previewPath, function (err, tree) {
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
    modify: modify,
    preview: preview
  };
};