angular.module('MEANcraftApp.overview')

  .controller('overviewCtrl', function ($scope, ServerSocket, UploadSocket, Executable) {
  
    $scope.data = {
      maps: null
    };
    
    $scope.chunkSize = 4;
    $scope.ping = {status: 'Ready', value: '?'};
    $scope.config = {};
    $scope.current = {
      status: 'Unknown',
      msg: '',
      sendMsg: function () {
        if (this.msg !== '')
          ServerSocket.emit('server_chat', {msg: this.msg});
          this.msg = '';
      }
    };

    $scope.doPing = function () {
      if ($scope.ping.status === 'Ready') {
        var alphaTime = Date.now();
        UploadSocket.emit('ping');
        $scope.ping.status = 'Loading';
        UploadSocket.once('ping', function () {
          $scope.ping.value = Date.now() - alphaTime;
          $scope.ping.status = 'Ready';
        });
      }
    };

    ServerSocket.on('err', function (data) {
      console.log(data);
    });

    ServerSocket.on('chat', function (data) {
      console.log(data);
    });

    ServerSocket.on('status', function (data) {
      console.log('status', data);
      $scope.current.status = (data.status === 1) ? 'Online' : 'Offline';
    });

    ServerSocket.on('create', function (data) {
      console.log(data);
    });

    ServerSocket.emit('list');

    $scope.list = function () {
      ServerSocket.emit('list');
      ServerSocket.on('list', function (data) {
        console.log(data);
        $scope.data.maps = data;
      });
    };

    ServerSocket.on('list', function (data) {
      console.log(data);
      $scope.data.maps = data;
    });

    ServerSocket.on('backup', function (data) {
      console.log(data);
    });

    ServerSocket.on('maps', function (data) {
      console.log('maps', data.maps);
    });

    ServerSocket.emit('status');

    $scope.server = {
      status: 'Unknown',
      config: {},
      start: function () {
        //console.log({config: {map: 'default', executable: this.config.executable.data}});
        ServerSocket.emit('start', {} /*{config: {map: 'default', executable: this.config.executable.data}}*/);
      },
      stop: function () {
        ServerSocket.emit('stop', {config: {delay: 1000}});
      },
      create: function () {
        ServerSocket.emit('create', {name: 'Test ' + Date.now(), data: 'yo'});
      },
      backup: function () {
        ServerSocket.emit('backup', {data: 'yo', parent: Date.now()});
      }
    };

    $scope.create = function () {
      ServerSocket.emit('server', {action: "create"});
    };
    
    $scope.drop = function () {
      ServerSocket.emit('server', {action: "drop"});
    };
  
  })

  .controller('overviewServerCtrl', function ($scope, ServerSocket)  {
    $scope.server = {
      status: 'Unknown',
      start: function () {
        ServerSocket.emit('start');
      },
      stop: function () {
        ServerSocket.emit('stop');
      },
      chat: function () {
        ServerSocket.emit('chat');
      }
    };
  })

  .controller('uploadServerCtrl', function ($scope, UploadSocket) {
    $scope.upload = {
      currents: [],
      start: function (file) {
        if (!file) return;
        UploadSocket.emit('begin', {metadata: {name: 'prueba', type: 'map'}});
        UploadSocket.once('begin', function (message) {
          $scope.parseFile(
            function (data, next) {
              UploadSocket.emit('chunk', {data: data, token: message.token}); 
              UploadSocket.once('chunk', function (response) {
                next();
              });
          }, function () {
            console.log('uploadCallback');
            UploadSocket.emit('end', {token: message.token});
          });
        });
      },
      cancel: function () {
        
      }
    };
  });