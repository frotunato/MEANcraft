angular.module('MEANcraftApp.overview')
/*
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

    ServerSocket.on('stdin', function (data) {
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
        ServerSocket.emit('start', {} {config: {map: 'default', executable: this.config.executable.data}});
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
*/
  .controller('overviewServerCtrl', function ($scope, ServerSocket)  {
    var self = this;
    
    this.chat = {
      pool: [],
      prefix: '',
      message: '',
      sendMsg: function () {
        if (!this.message) return;
        ServerSocket.emit('stdin', this.message);
        this.message = '';
      }
    };

    this.info = {
      status: 'Unknown',
      map: 'Unknown',
      exec: 'Unknown',
      uptime: 'Unknown'
    };

    this.selected = {
      exec: null,
      map: null,
      schedule: null
    };

    //this.currentStatus = 'Unknown';
    ServerSocket.emit('list');
    ServerSocket.emit('info');
    
    ServerSocket.on('err', function (message) {
      window.alert(JSON.stringify(message));
    });

    ServerSocket.on('stdin', function (message) {
      $scope.$broadcast("chat");
      if (self.chat.pool.length > 100) {
        self.chat.pool.splice(0, 1);
      }
      self.chat.pool.push(message);
    });

    ServerSocket.on('list', function (message) {
      if (!message) return;
      self.mapList = message.maps;
      self.execList = message.execs;
    });
    
    ServerSocket.on('info', function (message) {
      self.info = angular.extend(self.info, message);
    });

    this.execList = [];

    this.mapList = [];

    this.options = {};

    this.start = function () {
      //console.log(self.exec, self.map);
      //if (!self.exec.selected._id || !self.map.selected._id) return;
      var schedule = (self._schedule) ? self.selected.schedule : null;
      ServerSocket.emit('start', {
        exec: self.selected.exec._id,
        map: self.selected.map._id,
        schedule: schedule
      });
    };
    this.stop = function () {
      ServerSocket.emit('stop');
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
   
    UploadSocket.on('progress', function (message) {
      console.log(message);
    });

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