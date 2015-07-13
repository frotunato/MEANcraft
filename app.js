var childProcess = require('child_process');
var	spawn = childProcess.spawn;
var	webServer = null;
var	gameServer = null;

function startWebServer () {
	webServer = childProcess.fork('./server/server.js');
	
	webServer.on('exit', function (code, signal) {
		console.log('SERVER DIED WITH CODE', code, 'AND SIGNAL', signal, 'RESTARTING...');
		startWebServer();
	});

	webServer.on('message', function (message) {
		switch (message.command) {
			case 'start':
				message.config = message.config || {};
				startGameServer(message.config);
				webServer.send({command: 'status', status: true});
				gameServer.stdout.on('data', function (data) {
					webServer.send({command: 'stdout', stdout: data + ''});
				});
				break;
			case 'status':
				var value = gameServer ? true : false;
				console.log('status server', value);
				webServer.send({command: 'status', status: value});
				break;
			case 'stop':
				if (message.delay) {

				} else {
					if (gameServer) {
						gameServer.stdin.write('stop' + '\r');
					}
				}
				break;
		}

		
	});


}

function startGameServer (config) {
	if (!gameServer) {
		gameServer = spawn(config.procName, config.procArgs, config.procOptions);
		gameServer.on('exit', function (code) {
			gameServer = null;
			webServer.send({status: false, code: code});
			console.log('GameServer died', code);		
		});
	}
}

startWebServer();