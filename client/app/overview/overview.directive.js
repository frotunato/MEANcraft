angular.module('MEANcraftApp.overview')
  .directive('fileread', function () {
    return {
      restrict: 'A',
      replace: false,
      link: function (scope, element, attrs) {
        
        Object.byString = function(o, s) {
            s = s.replace(/\[(\w+)\]/g, '.$1');
            s = s.replace(/^\./, '');
            var a = s.split('.');
            for (var i = 0, n = a.length; i < n; ++i) {
                var k = a[i];
                if (k in o) {
                    o = o[k];
                } else {
                    return;
                }
            }
            return o;
        };

        element.bind('change', function (changeEvent) {
          if (!element[0].files[0]) return;

          var targetFile = Object.byString(scope, attrs.fileread);
          targetFile.data = element[0].files[0];
          targetFile.offset = 0;
          targetFile.metadata.name = element[0].files[0].name.replace(/(\.[^/.]+)+$/, "");
          console.log(targetFile, targetFile.data.size);
          scope.$apply();
          

          scope.upload.parseFileHeader = function (cb) {
            var headerReader = new FileReader();
            var blob = {};
            var kick = function () {
              blob = targetFile.data.slice(0, 262);
              headerReader.readAsArrayBuffer(blob);
              headerReader.onload = foo;
            };

            var foo = function (event) {
              if (event.target.error === null) {
                cb(event.target.result);
              }
            };
            kick();
          };

          scope.upload.parseFile = function (chunkCallback, uploadCallback) {
          	var fileData = targetFile.data;
            var fileSize = fileData.size;
            var chunkSize = 2000000; //parseInt(scope.upload.chunkSize);
            var offset = targetFile.offset;
            var alphaTime = Date.now();
            var fileReader = new FileReader();
            var blob = {};
            var amount = 0;
            var block = function () {
              amount = (targetFile.offset > fileSize) ? (targetFile.offset + chunkSize) - fileSize  + chunkSize : chunkSize + targetFile.offset;
              blob = fileData.slice(targetFile.offset, amount);
              fileReader.readAsArrayBuffer(blob);
              fileReader.onload = foo;
            };
            
            var foo = function (event) {
              //console.log(event.target.result.length);
              
              if (targetFile.offset > fileSize) {
                targetFile.offset = targetFile.offset - fileData.size;
                uploadCallback();
                window.alert('Delta time: '.concat(parseInt(Date.now() - alphaTime)).concat(' ms (Chunk size: ').concat(parseInt(scope.upload.chunkSize)).concat(' bytes). ').concat('Upload speed: ').concat(Math.round((fileSize/1000)/((Date.now()-alphaTime)/1000))).concat(' KB/s. ').concat('File size ' + Math.round(fileSize/1000000) + ' MB'));
                return;
              }

              if (event.target.error === null && targetFile.offset <= fileSize) {
                targetFile.offset += chunkSize;
                //targetFile.offset = offset
                //console.log(targetFile.offset);
                //scope.offset = parseFloat(offset);
                chunkCallback({
                  chunk: event.target.result
                }, block);
              } else {
                console.log('Read error: ', event.target.error);
                return;
              }
            };
            block();
          };
        });
      }
    };
  })

  .directive('tabRow', function () {
    return {
      template: 
      '{{tabRow.current}} true <ul ng-transclude>' +
        //'<li ng-repeat="tab in tabRow.tabs">' + 
        //  '<a href="" ng-click="tabRow.select(tab)"> {{tab}} </a>' +
        //'</li>' +
      '</ul>',
      transclude: true,
      restrict: 'E',
      bindTocontroller: true,
      controllerAs: 'tabRow',
      controller: function () {
        var self = this;
        this.current = null;
        this.select = function (tab) {
          self.current = tab;
          console.log(self.current, 'selected');
          return self.current;
        };
      }
    };
  })

  .directive('tab', function () {
    return {
      replace: false,
      require: '^tabRow',
      scope: {},
      template: 
      '<li>' +
        '<a href="" ng-click="toggle()"> a {{current}}' +
        '<ng-transclude></ng-transclude>' +
        '</a>' +
      '</li>',
      transclude: true,
      restrict: 'E',
      link: function (scope, element, attrs, tabRowCtrl) {
        scope.toggle = function () {
          tabRowCtrl.select(attrs.heading);
        };
        scope.getData = function () {
          return tabRowCtrl.current;
        };
        scope.$watch('getData()', function (newValue, oldValue) {
          console.log('OLD', oldValue, 'NEW', newValue)
          if (newValue && newValue === attrs.heading) {
            console.log('tab is different, now toggling', newValue);
          } else if (newValue !== attrs.heading) {
            console.log('disabling', newValue)
          }
        })
      }
    };
  });