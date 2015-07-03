var _ = require('lodash');
var Model = require('./executable.model.js');
var Grid = require('gridfs-stream');
var mongoose = require('mongoose');
var fs = require('fs');

exports.index = function (req, res) {
  Model
    .find()
    .lean()
    .select('version type data')
    .exec(function (err, docs) {
      return res.status(200).json(docs);
    });
};

exports.create = function (req, res) {
  var gfs = Grid(mongoose.connection.db);
  console.log(req.files);
  console.log(req.body);
  var writestream = gfs.createWriteStream({filename: req.files.data.originalname});
  fs.createReadStream(req.files.data.path).pipe(writestream);
  
  writestream.on('close', function (file) {
    Model.create({
      //name: req.body.name, 
      type: req.body.type, 
      version: req.body.version, 
      data: file._id 
    }, function (err, doc) {
      if (err) {
       //handle errors 
      }
      return res.status(200).json(doc);
    });
  });  
};