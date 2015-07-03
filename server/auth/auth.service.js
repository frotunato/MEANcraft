var secret = require('./secret.json').secret;
var jwt = require('jsonwebtoken');
var token = require('../config/config').token;
var refreshToken = function (decodedToken) {
  var res = jwt.sign({usuario: decodedToken.usuario}, secret, {expiresInMinutes: token.expirationInMinutes});
  return res;
};

var checkAgeToken = function (reference, threshold) {
  var res = false;
  console.log('Elapsed', (Date.now() - (reference * 1000)), 'threshold ' + threshold);
  if ((Date.now() - (reference * 1000)) > threshold) {
    res = true;
  }
  return res;
};

module.exports = function () {
  var middleware = function (req, res, next) {
    jwt.verify(req.headers.authorization, secret, function (err, decoded) {
      console.log('[AUTH.SERVICE] decoded', decoded, req.headers.authorization);
      if (err) {
        res.status(401).json({msg: 'token expired'});
      } else {
        //decoded.iat = Date.now() / 1000;
        if (checkAgeToken(decoded.iat, token.refreshThresholdInMs)) {
          res.set('Authorization', refreshToken(decoded));
        }
        next();
      }
    });
  };
  return middleware;
};