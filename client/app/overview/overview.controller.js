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
    this.prefix = false;
    this.message = '';
    this.send = function () {
      if (!self.message) return;
      self.message = (self.prefix) ? '/say ' + self.message : self.message;
      ServerSocket.emit('stdin', self.message);
      self.message = '';
    };

    ServerSocket.on('stdin', function (message) {
      $scope.$broadcast("chat");
      if (self.pool.length > 100) {
        self.pool.splice(0, 1);
      }
      self.pool.push(message);
    });
  })

  .controller('managerCtrl', function ($scope, FetchData, ServerSocket)  {
    var self = this;
    this.navigate = {
      current: {},
      last: [],
      foward: function (thing) {
        this.last.push(this.current);
        this.current = thing;
      },
      back: function () {
        if (this.last.length === 0) return;
        this.current = this.last.splice(-1, 1)[0];
      },
      read: function (file) {
        if (!file || !file.readable) return;
        ServerSocket.emit('read', file);
      }
    };
    (function bootstrap (initialData) {
      self.execList = initialData.execs;
      self.mapList = initialData.maps;
      self._mapGroup = (initialData.selected.map) ? initialData.maps[initialData.selected.map.metadata.name] : {};
      self._execGroup = (initialData.selected.exec) ? initialData.execs[initialData.selected.exec.metadata.name] : {};
      self.selected = initialData.selected;
      self.navigate.current = initialData.tree;
    })(FetchData);
    
    this.info = {
      status: null,
      map: 'Unknown',
      exec: 'Unknown',
      uptime: 'Unknown',
      lock: null
    };

    this.preview = function () {
      console.log(self.selected.exec._id);
      ServerSocket.emit('preview', self.selected.exec._id);
    };

    this.addSchedule = function (schedule) {
      self.selected.schedules.push(angular.copy(schedule));
    };

    this.removeSchedule = function (index) {
      self.selected.schedules.splice(index, 1);
    };

    this.compileSchedules = function () {
      var element = null;
      var compiledSchedules = [];
      var schedule = '';

      for (var i = self.selected.schedules.length - 1; i >= 0; i--) {
        element = self.selected.schedules[i];
        if (element.freq === 'every') {
          if (element.type === 'minute') {
            schedule = '*/' + element.value + ' * * * *';
          } else {
            schedule = '0 */' + element.value + ' * * *';
          }
        } else if (element.freq === 'once') {
          schedule = element.minute + ' ' + element.hour + ' * * *'; 
        }
        compiledSchedules.push(schedule);
      }
      return compiledSchedules;
    };

    ServerSocket.on('err', function (message) {
      window.alert(JSON.stringify(message));
    });

    ServerSocket.on('list', function (message) {
      if (!message) return;
      self.mapList = message.maps;
      self.execList = message.execs;
    });
    
    ServerSocket.on('info', function (message) {
      console.log(message)
      //if (message.tree) self.navigate.current = message.tree;
      //self.info = angular.extend(self.info, message);
      console.log('receiving', message);
      self = angular.extend(self, message);
      
      //var groupName = self.selected.map.metadata.name;
      //console.log(self.selected)
    });

    ServerSocket.on('read', function (message) {
      console.log(message);
    });

    this.options = {};

    this.start = function () {
      //console.log(self.exec, self.map);
      //if (!self.exec.selected._id || !self.map.selected._id) return;
      //var schedule = (self._schedule) ? self.selected.schedule : null;
      var obj = {
        exec: self.selected.exec._id,
        map: self.selected.map._id,
        schedules: self.compileSchedules(),
      };
      if (self.pToken) {
        obj.exec = {
          _id: self.selected.exec._id,
          pToken: self.pToken,
          changes: [
          {
            name: 'banned-ips.json',
            parent: 'preview\\' + self.pToken,
            body: 'amaworrior'
          }, {
            name: 'bukkit.yml',
            parent: 'preview\\' + self.pToken,
            body: 'amaworrior2'
          }]
        };
      }
      console.log(obj);
      ServerSocket.emit('start', obj);
    };

    this.stop = function () {
      ServerSocket.emit('stop');
    };
  })

  .controller('uploadCtrl', function ($scope, UploadSocket) {
    var self = this;
    console.log(Date.now());
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