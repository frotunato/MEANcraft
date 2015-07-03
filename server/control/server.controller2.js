var spawn = require('child_process').spawn;
var Map = require('./map.model');
var fs = require('fs');
var mongoose = require('mongoose');
var async = require('async');
var rimraf = require('rimraf');
var tar = require('tar-fs');
//var Model = require('./grid.model');
var io = null;

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


module.exports = function (app, io, socket) {
  var gridfs = app.get('gridfs');
  var mcServer, activeID;
  var isUp = false;
  console.log('a')
  io.on('connection', function () {
    console.log('yoyoyoyoyoyoyoyoyo')
  })
  /*
  process.on('message', function (message) {
    switch (message.command) {
      case 'status':
        console.log('message status', message.status);
        break;
      case 'stdout':
        console.log('message stdout', message.stdout);
        break;
    }
  })
*/


  function writeServerToDisk (callback) {
    async.parallel([
      function (cb) {
        var readStream = Model.read({_id: "550f0c7dc69441881205df2c"});
        var writeStream = tar.extract('./container');
        readStream.pipe(writeStream);
        writeStream.on('finish', function () {
          cb(null);
        });
      },
      function (cb) {
        var readStream = Model.read({_id: "550f0c7dc69441881205df2d"});
        var writeStream = tar.extract('./container');
        readStream.pipe(writeStream);  
        writeStream.on('finish', function () {
          cb(null);
        });
      }
    ], function () {
      console.log('** [writeServerToDisk completed] **');
      callback();
    });
  }

  function saveServerToDB (callback) {
    async.waterfall([
      function (cb) {
        getMapAndExec('./temp', function (mapDirs, execFiles) {
          cb(null, mapDirs, execFiles);
        });
      },
      function (mapDirs, execFiles, cb) {
        async.parallel([
          function (cb) {
            var archiver = require('archiver')('tar');
            var actions = [];
            for (var i = mapDirs.length - 1; i >= 0; i--) {
              actions.push({cwd: './temp/' + mapDirs[i], expand: true, src: ['**/*'], dest: mapDirs[i]});
            }
            archiver.bulk(actions);
            archiver.finalize();
            Model.insert(archiver, {filename: 'test ' + Date.now(), metadata: {name: 'test'}}, function (file) {
              cb(null, file);
            });
          },
          function (cb) {
            var archiver = require('archiver')('tar');
            var excludedSrcs = mapDirs.map(function (element) {
              return '!' + element + '/**';
            }).concat(['**/*']).reverse();
            archiver.bulk([{cwd: './temp', expand: true, src: excludedSrcs}]);
            archiver.finalize();
            Model.insert(archiver, {filename: "exectest"}, function (file) {
              cb(null, file);
            });
          }
        ], function (err, files) {
          console.log('** [saveServerToDB completed] **');
          cb(null, files);
        });
      },
      
      function (files, cb) {
        rimraf('./temp', function () {
          cb(null, files);
        });
      },   
      function (files, cb) {
        fs.mkdir('./temp', function () {
          cb(null, files);
        });
      }
    ], function (err, files) {
      callback(err, files);
    });
  }
  
  function handler () {
    mcServer.on('exit', function (code) {
      io.emit('status', {msg: 'Server stopped with code ' + code, status: code});
      if (code === 0) {
        saveServerToDB(function () {
          console.log('Map and exec saved');
          activeID = undefined;
          mcServer = undefined;
        });
      }
    });

    mcServer.stdout.on('data', function (stdout) {
      io.emit('chat', {msg: stdout + ""});
    });
  }

  function status (callback) {
    process.send({command: 'status'});
    /*
    process.on('message', function (message) {
      if (message.status !== undefined) {
        console.log('yoyoyoo!!!')
        io.emit('status', {msg: "Server status", status: message.status});
        callback(message.status);
      }
    });
  */
  }

  function start () {
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
        io.emit('err', 'Server already running');
      }
    }
    
  function stop () {
    //status(function (status) {
      if (isUp === true) {
        process.send({command: 'stop'});
      } else {
        //socket.emit('err', 'Server is off, cannot stop it')
      }
    }

  return {
    status: status,
      //var res = (activeID) ? 1 : 0;
      //var a = Date.now();
      /*
      Model.getMapsAndBackups(function (err, docs) {
        //console.log(docs, 'yoyo');
      });
      */
  
      /*
      Model.find({metadata: {parent_id: null}}, function (err, docs) {
        if (docs.length) {
          socket.emit('maps', {maps: docs});
          Model.find({metadata: {parent_id: "" + docs[1]._id}}, function (err, docs) {
            console.log('Elapsed time', Date.now() - a);
            socket.emit('maps', {maps: docs});
          });
        } else {
          socket.emit('maps', {maps: []})
        }
        //socket.emit('maps', {maps: docs});
        //console.log('parentdocs', docs[0]._id, docs[1]._id);
      });
       */
    start: start,
    stop: stop,
    /*
    function (data) {
      console.log('** Trying to stop server **', activeID);
      if (activeID) {
        console.log('** Stopping server **');
        if (data.config.delay) {
          var num = 0;
          var interval = setInterval(function () {
            if (num === 3) {
              clearInterval(interval);
              mcServer.stdin.write('stop' + '\r');
            } else {
              num ++;
            }
          });
        } else {
          mcServer.stdin.write('stop');
        }
      }
    }*/
    create: function (data) {
      console.log(data);
      var readStream = fs.createReadStream('./1.tar');
      Model.insert(readStream, {filename: 'Pure map ' + Date.now(), metadata: {parent_id: null, childs_ids: []}}, function (doc) {
        io.emit('create', doc);
        console.log(doc);
      });
    },
    backup: function (data) {
      var readStream = fs.createReadStream('./1.tar');
      //Model.appendBackup();
      
      Model.appendBackup(readStream, {metadata: {parent_id: "556cc2e9599d0e34111db95e"}}, function (doc) {
        console.log('yes')
      })
      
      /*
      Model.insert(readStream, {filename: 'Backup map ' + Date.now(), metadata: {parent_id: "556cb574a526774810eca740"}}, function (doc) {
        io.emit('backup', doc);
      });
    */
    }
  };
};