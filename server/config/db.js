var mongoose = require('mongoose');
var Grid = require('gridfs-stream');

module.exports = function (config) {
  mongoose.connect(config.db);
  var conn = mongoose.connection;
  Grid.mongo = mongoose.mongo;
  mongoose.gfs = Grid(conn.db);
  conn.once('open', function () {
    console.log('Database connection established at', config.db);
  });

  conn.on('error', function () {
    throw new Error('Unable to connect to database at ' + config.db);
  });
};