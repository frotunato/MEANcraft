angular.module('MEANcraftApp.overview')

  .controller('infoCtrl', function ($scope, $location, ServerSocket) {
    var self = this;
    this.server = {
      status: 'Unknown',
      map: 'Unknown',
      exec: 'Unknown',
      uptime: 'Unknown'
    };
    ServerSocket.on('info', function (message) {
      self.server = angular.extend(self.server, message);
    });
  
  })

  .controller('chatCtrl', function ($scope, ServerSocket) {
    var self = this;
    this.pool = [];
    this.prefix = '';
    this.message = '';
    this.send = function () {
      if (!self.message) return;
      ServerSocket.emit('stdin', self.message);
    };

    ServerSocket.on('stdin', function (message) {
      $scope.$broadcast("chat");
      if (self.pool.length > 100) {
        self.pool.splice(0, 1);
      }
      self.pool.push(message);
    });
  })

  .controller('managerCtrl', function ($scope, ServerSocket)  {
    var self = this;
    
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

  .controller('uploadCtrl', function ($scope, UploadSocket) {
    var self = this;
    console.log(Date.now())
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