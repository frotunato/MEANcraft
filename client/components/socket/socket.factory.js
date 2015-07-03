angular.module('MEANcraftApp')

  .factory('Socket', function (ServerSocketFactory) {
    console.log('ServerSocket launched');
    return ServerSocketFactory();
  })

  .factory('ServerSocket', function (socketFactory, $location) {
  	//console.log(ServerSocket)
    var serverSocket = io.connect({transports: ['websocket']});
    console.log('ServerSocket launched', $location.host() + ':' + $location.port() + '/server');
  	return socketFactory({ioSocket: serverSocket});
  })

  .factory('UploadSocket', function (socketFactory, $location) {
    var uploadSocket = io.connect({transports: ['xhr-polling', 'websocket']});
    console.log('UploadSocket launched', $location.host() + ':' + $location.port() + '/upload');
    return socketFactory({ioSocket: uploadSocket});
  });