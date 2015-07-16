var Grid = require('./grid.model');
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var mapSchema = new Schema({
  name: {type: String, required: true},
  backups: [{type: Schema.Types.ObjectId, required: false}]
  //backups: []
});

mapSchema.statics.test = function (cb) {
	this.find({}, cb);
};

module.exports = mongoose.model('Map', mapSchema);