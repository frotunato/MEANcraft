angular.module('MEANcraftApp.overview')
  .directive('fileread', function () {
    return {
      restrict: 'A',
      replace: false,
      link: function (scope, element, attrs) {
        element.bind('change', function (changeEvent) {
          scope.upload.file.data = element[0].files[0];
          scope.upload.file.metadata.name = element[0].files[0].name.replace(/(\.[^/.]+)+$/, "");
          scope.$apply();
          scope.upload.parseFile = function (chunkCallback, uploadCallback) {
          	console.log('inner', scope);
          	var fileData = scope.upload.file.data;
            var fileSize = fileData.size;
            var chunkSize = parseInt(scope.upload.chunkSize);
            var offset = parseInt(scope.upload.file.offset);
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
              if (offset > fileSize) {
                scope.offset = offset - fileData.size;
                uploadCallback();
                window.alert('Delta time: '.concat(parseInt(Date.now() - alphaTime)).concat(' ms (Chunk size: ').concat(parseInt(scope.upload.chunkSize)).concat(' bytes). ').concat('Upload speed: ').concat(Math.round((fileSize/1000)/((Date.now()-alphaTime)/1000))).concat(' KB/s. ').concat('File size ' + Math.round(fileSize/1000000) + ' MB'));
                return;
              }

              if (event.target.error === null && offset <= fileSize) {
                offset += chunkSize;
                console.log(offset);
                scope.offset = parseFloat(offset);
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