angular.module('MEANcraftApp.overview')
	.directive('fileread', function () {
		return {
			restrict: 'A',
			replace: false,
			scope: '=',
			link: function (scope, element, attrs) {
				element.bind('change', function (changeEvent) {
					scope.file = element[0].files[0];
					
					scope.parseFile = function (chunkCallback, uploadCallback) {
						var fileSize = scope.file.size;
						var chunkSize = parseInt(scope.chunkSize);
						var offset = 0;
						scope.offset = Math.round(offset);
						var alphaTime = Date.now();
						var r = new FileReader();
						var blob = {};
						
						var block = function () {
							blob = scope.file.slice(offset, chunkSize + offset);
							r.readAsArrayBuffer(blob);
							r.onload = foo;
						};
						
						var foo = function (event) {
							console.log(offset)
							if (offset > fileSize) {
								scope.offset = offset - scope.file.size;
								uploadCallback();
								window.alert('Delta time: '.concat(parseInt(Date.now() - alphaTime)).concat(' ms (Chunk size: ').concat(parseInt(scope.chunkSize)).concat(' bytes). ').concat('Upload speed: ').concat(Math.round((fileSize/1000)/((Date.now()-alphaTime)/1000))).concat(' KB/s. ').concat('File size ' + Math.round(fileSize/1000000) + ' MB'));
								return;
							}

							if (event.target.error === null && offset <= fileSize) {
								offset += chunkSize;
								console.log(offset)
								scope.offset = parseFloat(offset);
								chunkCallback({
									chunk: event.target.result,
									fileSize: fileSize,
									chunkSize: chunkSize
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