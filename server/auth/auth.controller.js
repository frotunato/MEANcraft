var expressJwt = require('express-jwt');
var jwt = require('jsonwebtoken');
var secret = require('./secret.json').secret;
var tokenExpiration = require('../config/config').token.expirationInMinutes;

exports.login = function (req, res) {
  console.log(req.body);
  var r1 = 'admin';
  var r2 = 'admin';
  var username = req.body.username;
  var password = req.body.password;
  
  if (r1 === username && r2 === password) {
    var token = jwt.sign({username: username}, secret, {expiresInMinutes: tokenExpiration});
    res.json({token: token});
    console.log(token, 'yay');
  } else {
    res.status(401).json({error: 'invalid'});
  }

};

exports.test = function (req, res) {
  res.json({msg: 'authed'});
};