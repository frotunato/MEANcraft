angular.module('MEANcraftApp.overview')
  .directive('fileread', function () {
    return {
      restrict: 'A',
      replace: false,
      link: function (scope, element, attrs) {
        
        Object.byString = function(o, s) {
            s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
            s = s.replace(/^\./, '');           // strip a leading dot
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
          console.log(targetFile);
          scope.$apply();
          
          scope.upload.parseFile = function (chunkCallback, uploadCallback) {
          	var fileData = targetFile.data;
            var fileSize = fileData.size;
            var chunkSize = 2000000; //parseInt(scope.upload.chunkSize);
            var offset = targetFile.offset;
            var alphaTime = Date.now();
            var r = new FileReader();
            var blob = {};
            
            var block = function () {
              blob = fileData.slice(offset, chunkSize + offset);
              r.readAsArrayBuffer(blob);
              r.onload = foo;
            };
            
            var foo = function (event) {
              console.log(offset);
              if (targetFile.offset > fileSize) {
                targetFile.offset = targetFile.offset - fileData.size;
                uploadCallback();
                window.alert('Delta time: '.concat(parseInt(Date.now() - alphaTime)).concat(' ms (Chunk size: ').concat(parseInt(scope.upload.chunkSize)).concat(' bytes). ').concat('Upload speed: ').concat(Math.round((fileSize/1000)/((Date.now()-alphaTime)/1000))).concat(' KB/s. ').concat('File size ' + Math.round(fileSize/1000000) + ' MB'));
                return;
              }

              if (event.target.error === null && targetFile.offset <= fileSize) {
                targetFile.offset += chunkSize;
                //targetFile.offset = offset
                console.log(targetFile.offset);
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
  });