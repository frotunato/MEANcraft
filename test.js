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
var schedule = require('node-schedule');

var currentServer = {
	lock: true
};
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

function addSchedule (config, fn) {
	var currentTry = 0;
	var maxTries = 2;
	function tryIt () {
		if (currentTry < maxTries) {
			console.log(currentTry)
			if (currentServer.lock) {
				currentTry ++;
				setTimeout(tryIt, 3000);
			} else {
				fn();
			}
		}
	}


	schedule.scheduleJob(config, function () {
		tryIt(2, fn);
	})
}

function aa () {
	console.log('yolo');
}

addSchedule('*/1 * * * *', aa)