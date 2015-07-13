angular.module('MEANcraftApp')

  .factory('Socket', function (ServerSocketFactory) {
    console.log('ServerSocket launched');
    return ServerSocketFactory();
  })

  .factory('ServerSocket', function (socketFactory, $location) {
  	//console.log(ServerSocket)
    var path = $location.host() + ':' + $location.port() + '/server';
    var serverSocket = io.connect(path, {transports: ['websocket']});
    console.log('ServerSocket launched', path);
  	return socketFactory({ioSocket: serverSocket});
  })

  .factory('UploadSocket', function (socketFactory, $location) {
    var path = $location.host() + ':' + $location.port() + '/upload';
    var uploadSocket = io.connect(path, {transports: ['xhr-polling', 'websocket']});
    console.log('UploadSocket launched', path);
    return socketFactory({ioSocket: uploadSocket});
  });