var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var Grid = require('gridfs-stream');
Grid.mongo = mongoose.mongo;

var serverSchema = new Schema({
  name: {type: String, required: true},
  version: {type: String, required: true},
  data: {type: Schema.Types.ObjectId, ref: 'fs.files', required: false}
});

module.exports = mongoose.model('Server', serverSchema);