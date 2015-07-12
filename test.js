var fs = require('fs');
var async = require('async');
var rimraf = require('rimraf');
/*
function sanitizeMap (directory, callback) {
	var match = ['region', 'DIM-1', 'DIM1'];
	var path = require('path');
	var cache = [];
	async.waterfall([
		function (wCb) {
			fs.readdir(directory, wCb);
		},
		function (files, wCb) {
			var _searchDir = function (element, fCb) {
				fs.stat(path.join(directory, element), function (err, stats) {
					if (stats.isDirectory()) {
						fCb(true);
					} else {
						fCb(false);
					}
					cache.push(element);
				});
			};
			async.filter(files, _searchDir, function (results) {
				wCb(null, results);
			});
		},
		function (directories, wCb) {
			function _isValidDir (dir, fCb) {
				fs.readdir(path.join(directory, dir), function (err, files) {
					async.each(files, function (file, eCb) {
						if (match.indexOf(file) !== -1) {
							fs.stat(path.join(directory, dir, file), function (err, stats){
								if (stats.isDirectory()) {
									eCb(true);
								} else {
									eCb(null);
								}
							});
						} else {
							eCb(null);
						}
					}, function (err) {
						if (err) {
							fCb(true);
						} else {
							fCb(false);
						}
					});
				});
			}
			async.filter(directories, _isValidDir, function (results) {
				wCb(null, results);
			});
		}, 
		function (validDirectories, wCb) {
			var toRemove = cache.filter(function (el) {
				return validDirectories.indexOf(el) < 0;
			});
			async.each(toRemove, 
				function (element, eCb) {
					rimraf(path.join(directory, element), function (err) {
						eCb(err);
					});
				}, 
				function () {
					wCb(null, toRemove);
				}
			);
		}
	], function (err, results) {
		callback(err, results);
	});
}
*/

function sanitizeMap (directory, callback) {
	var path = require('path');
	var mapDirectories = ['region', 'DIM1', 'DIM-1'];
	async.waterfall([
		function (wCb) {
			_getDirs(directory, [], wCb);
		},
		function (dirs, files, wCb) {
			var _isValidDir = function (dir, fCb) {
				var matches = [];
				var refs = ['region', 'DIM1', 'DIM-1'];
				_getDirs(path.join(directory, dir), [], function (err, nestedDirs, nestedFiles) {
					async.each(nestedDirs, 
						function (nestedDir, eCb) {
							if (refs.indexOf(nestedDir) !== -1) {
								matches.push(nestedDir);
							}
							eCb(null);
						},
						function (err) {
							if (matches.length > 0) {
								fCb(true);
							} else {
								fCb(false);
							}
						});
				});
			};
			async.filter(dirs, _isValidDir, function (mapDirs) {
				wCb(null, mapDirs, files);
			});
		},
		function (mapDirs, filesToRemove, wCb) {
			var removedFiles = [];
			async.each(filesToRemove,
				function (fileToRemove, eCb) {
					rimraf(path.join(directory, fileToRemove), function (err) {
						removedFiles.push(fileToRemove);
						eCb(err);
					});
				},
				function (err) {
					wCb(err, mapDirs, removedFiles);
				});
		}
	],
		function (err, matches, removed) {
			console.log(matches, removed);
		});
}


var _getDirs = function (base, exclude, cb) {
	var path = require('path');
	async.waterfall([
		function (wCb) {
			fs.readdir(base, wCb);
		},
		function (elements, wCb) {
			elements = elements.filter(function (el) {
				return exclude.indexOf(el) < 0;
			});
			var _isDir = function (element, fCb) {
				fs.stat(path.join(base, element), function (err, stats) {
					if (stats.isDirectory()) {
						fCb(true);
					} else {
						fCb(false);
					}
				});
			};
			async.filter(elements, _isDir, function (dirs) {
				var files = elements.filter(function (el) {
					return dirs.indexOf(el) < 0;
				});
				wCb(null, dirs, files);
			});
		}
	],
	function (err, dirs, files) {
		cb(err, dirs, files);
	});
};

sanitizeMap('./temp/', function () {
	
});


/*
function searchMapDirs (root, exclude, cb) {
	var match = ['region', 'DIM-1', 'DIM1'];
	var excludedDirs = exclude || [];
	

	

	async.waterfall([
		function (wCb) {
			fs.readdir(baseDir, wCb);
		},
		function (files, wCb) {
			files = files.filter(function (el) {
				return exclude.indexOf(el) < 0;
			});
			console.log('removed from files', exclude);
			var _searchDir = function (element, fCb) {
				fs.stat(path.join(directory, element), function (err, stats) {
					if (stats.isDirectory()) {
						fCb(true);
					} else {
						fCb(false);
					}
				});
			};
			async.filter(files, _searchDir, function (results) {
				wCb(null, results);
			});
		},
		function (filteredDirs, wCb) {
			var searchMapDir = function ()
		}
	]);
	fs.readdir(baseDir, function (err, files) {
	
		async.filter(files, _searchDir, function (results) {

		});
	});
}
*/
function sanitizeExec (directory, exclude, callback) {
	var excludedDirs = exclude || [];
	async.waterfall([
		function (wCb) {
			fs.readdir(directory, wCb);
		}
	]);

}
/*
sanitizeMap('./temp', function (err, results) {
	console.log(err, results);
});
*/
/*
_getDirs('./temp/', [], function (err, dirs) {
	_getDirs('./temp/' + dirs[0], ['DIM1'], function (err, dirs2, files) {
		console.log(dirs2, files);
	});
});
*/