angular.module('MEANcraftApp.overview')

  .controller('overviewCtrl', function ($scope, ServerSocket, UploadSocket, Executable) {
  
    $scope.data = {
      maps: null
    };
    
    //$scope.chunkSize = 4;
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

    $scope.list = function () {
      ServerSocket.emit('list');
      ServerSocket.on('list', function (data) {
        console.log(data);
        $scope.data.maps = data;
      });
    };
/*
    ServerSocket.on('list', function (data) {
      console.log(data);
      $scope.data.maps = data;
    });
*/
    ServerSocket.on('backup', function (data) {
      console.log(data);
    });

    ServerSocket.on('maps', function (data) {
      console.log('maps', data.maps);
    });

    //ServerSocket.emit('status');

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
    var self = this;
    
    ServerSocket.emit('list');

    ServerSocket.on('err', function (message) {
      window.alert(message);
    });

    ServerSocket.on('list', function (message) {
      if (!message) return;
      console.log(message);
      self.map.list = message.maps;
      self.exec.list = message.execs;
      //console.log(message);
    });
    
    this.exec = {
      list: [],
      selected: {_id: null}
    };

    this.map = {
      list: [],
      selected: {_id: null}
    };

    this.options = {};

    this.start = function () {
      console.log(self.exec, self.map);
      //if (!self.exec.selected._id || !self.map.selected._id) return;
      ServerSocket.emit('start', {
        exec: self.exec.selected._id,
        map: self.map.selected._id
      });
    };

  })

  .controller('uploadServerCtrl', function ($scope, UploadSocket) {
    var self = this;

    UploadSocket.on('err', function (err) {
      window.alert(err);
    });

    this.exec = {
      data: null,
      metadata: {
        type: 'exec'
      }
    };

    this.map = {
      data: null,
      metadata: {
        type: 'map'
      }
    };
    
    this.start = function () {
      var queue = [];
      var exec = (self.exec.data !== null) ? queue.push(self.exec) : undefined;
      var map = (self.map.data !== null) ? queue.push(self.map) : undefined;
      if (queue.length === 0) return;
      console.log('Queue', JSON.stringify(queue));
      
      function processElement () {
        if (queue.length === 0) return;
        var file = queue[0];  
        
        self.parseFileHeader(function (header) {
          console.log(header);
          UploadSocket.emit('begin', {
            filename: file.data.name,
            metadata: file.metadata,
            header: header
          });
        });

        UploadSocket.once('begin', function (message) {
          self.parseFile(
            function (data, next) {
              UploadSocket.emit('chunk', {chunk: data.chunk, token: message.token}); 
              UploadSocket.once('chunk', function (response) {
                next();
              });
          }, function () {
            console.log('uploadCallback');
            UploadSocket.emit('end', {token: message.token});
            queue.splice(0, 1);
            console.log(queue.length);
            processElement();
          });
        });
      }
      processElement();
    };

  });