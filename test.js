/*
var du = require('du');
var alpha = Date.now();
var fs = require('fs');
var ws = fs.createWriteStream('./temp/yoyo.tar');
var lz4 = require('lz4');
var encoder = lz4.createEncoderStream();
du('./temp', function (err, size) {
	console.log(size, Date.now() - alpha);
	var size2 = fs.statSync('./temp/HIPERDINO.tar');
	var rs = fs.createReadStream('./temp/HIPERDINO.tar');
	var progress = require('progress-stream');
	var str = progress({length: size2.size, time: 75});
	str.on('progress', function (progress) {
		console.log(progress.percentage);
	});
	rs.pipe(str).pipe(encoder).pipe(ws);
});
*/
/*

var j = schedule.scheduleJob('* * * * *', function(){
    console.log('The answer to life, the universe, and everything!');
    j.cancel();
});
*/
/// REFACTOR TO BODY ///

var os = require('os');
/*
function getHwInfo () {
	return {
		cpu: {
			arch: os.arch(),
			cores: os.cpus()
		},
		os: {
			release: os.release(),
			arch: os.arch(),
			platform: os.platform(),
			uptime: os.uptime()
		},
		memory: {
			//free: os.freemem(),
			total: os.totalmem()
		}
	};
} 

//machine uptime - minecraft uptime

function getHwUsage () {
	
	return {
		memory: os.freemem(),
		cpuUsage: []
	};
}
*/
/*
function addSchedule (config, fn) {
  if (!config) return;
  var num = 0;
  var retry = function () {
      if (num < 2) {
        num ++;
        console.log('ControlSocket [ADD SCHEDULE]', 'server is currently locked, retrying in 30 seconds (' + num + '/2)');
        setTimeout(function () {
          if (!currentServer.lock) {
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
    console.log(currentServer.lock)
    if (!currentServer.lock) {
      retry();
    } else {
      fn();
    }
  });
}
*/
var fs = require('fs');
var async = require('async');
var path = require('path');


/*
function getTree (base, walkCb) {
  function _readDirectory (root, rCb) {
    async.waterfall([
    function (wCb) {
      fs.readdir(root, wCb);
    },
    function (items, wCb) {
      var pool = {};
      //if (base === root) {
      //  pool.push({name: 'temp', parent: '.\\', content: items})        
      //}
      var _processItem = function (item, cb) {
        function _getExt (filename) {
          var index = filename.lastIndexOf('.');
          var res = (index === -1) ? null : filename.substring(index, filename.length);
          return res;
        }
        function _isValidExt (ext) {
          var validExts = ['.yml', '.properties', '.txt', '.json', '.log'];
          return (validExts.indexOf(ext) === -1) ? false : true;
        }
        var element = {};
        fs.stat(root + '/' + item, function (err, stats) {
          element.name = item;
          element.parent = root;
          if (!pool[root]) {
            pool[root] = [];
            console.log(pool)
          }
          if (stats.isFile()) {
            var ext = _getExt(item);
            if (_isValidExt(ext)) {
              element.readable = true;          
            } else {
              element.readable = false;
            }
            pool[root].push(element);
            cb();

          } else if (stats.isDirectory()) {
            _readDirectory(path.join(root, item), function (err, data) {
              element.isDirectory = true;
              element.content = data;
              pool[root].push(element);
              cb();
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
    walkCb(err, data);
  });
}
*/

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
          //console.log(stats)
          element.name = item;
          element.parent = root;
          element.metadata = {
            atime: stats.atime,
            mtime: stats.mtime,
            size: stats.size
          };
          if (stats.isFile()) {
            var ext = path.extname(item);
            element.readable = (_isValidExt(ext)) ? true : false;
            pool.push(element);
            cb();
          } else if (stats.isDirectory()) {
            _readDirectory(path.join(root, item), function (err, data) {
              element.isDirectory = true;
              element.content = data;
              pool.push(element);
              cb();
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

/*
  getTree('./temp', function (err, data) {
    console.log(err, data);
  });
*/



function applyChanges (changes, cb) {
  var _applyChange = function (item, eCb) {
    fs.writeFile(path.join(item.parent, item.name), item.body, function () {
      console.log(path.join(item.parent, item.name));
      eCb();
    });
  };
  async.each(changes, _applyChange, function (err) {
    cb();
  });
}

applyChanges([
          {
            name: 'banned-ips.json',
            parent: 'preview\\' + 'aa1',
            body: 'amaworrior'
          }, {
            name: 'bukkit.yml',
            parent: 'preview\\' + 'aa1',
            body: 'amaworrior2'
          }], function () {

  });

