var childProcess = require('child_process');
var spawn = childProcess.spawn;
var webServer = childProcess.fork('./server/server.js');
var gameServer = null;

function startGameServer (body) {
  if (gameServer) return;
  gameServer = spawn(body.procName, body.procArgs, body.procOptions);
  gameServer.stdout.on('data', function (data) {
    webServer.emit('stdout', data + '');
  });
  gameServer.on('exit', function (code, signal) {
    console.log('Gameserver died', code, signal);
    webServer.send({command: 'stop', body: {code: code, signal: signal}});
    gameServer = null;
  });
}

webServer.on('message', function (message) {
  webServer.emit(message.command, message.body);
});

webServer.on('exit', function (code, signal) {
  console.log('Webserver died, retry in 10 seconds...');
  setTimeout(function () {
    webServer = childProcess.fork('./server/server.js');
  }, 10000);
});

webServer.on('status', function (body) {
  var res = (gameServer) ? true : false;
  webServer.send({command: 'status', body: res});
});

webServer.on('stdin', function (body) {
  if (!gameServer) return;
  console.log('writing', body);
  gameServer.stdin.write(body + '\r');
});

webServer.on('stdout', function (body) {
  webServer.send({command: 'stdout', body: body});
});

webServer.on('start', function (body) {
  startGameServer(body);
});

webServer.on('stop', function () {
  if (!gameServer) return;
  gameServer.stdin.write('stop' + '\r');
});