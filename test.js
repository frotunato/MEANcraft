var gunzip = require('gunzip-maybe');
var fs = require('fs');
var tar = require('tar-fs');

var readStream = fs.createReadStream('spigot_server.tar.gz');
var writeStream = tar.extract('./temp/'); //fs.createWriteStream('./temp/a');
readStream.pipe(gunzip()).pipe(writeStream);