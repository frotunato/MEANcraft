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

var schedule = require('node-schedule');

var j = schedule.scheduleJob('* * * * *', function(){
    console.log('The answer to life, the universe, and everything!');
    j.cancel();
});

/// REFACTOR TO BODY /// 