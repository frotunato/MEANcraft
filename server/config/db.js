var mongoose = require('mongoose');
var Grid = require('gridfs-stream');

module.exports = function (app, config, cb) {
  mongoose.connect(config.db);
  var conn = mongoose.connection;
  Grid.mongo = mongoose.mongo;
  conn.once('open', function () {
  	var gfs = Grid(conn.db);
  	app.set('gridfs', gfs);
    console.log('Database connection established');
    cb();
  });

  conn.on('error', function () {
    throw new Error('Unable to connect to database at ' + config.db);
  });
};