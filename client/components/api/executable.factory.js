angular.module('MEANcraftApp')

  .factory('Executable', function ($resource) {
    return $resource(
      "/api/executable/:id",
      {},
      {
        save: {
          method: 'POST',
          transformRequest: function (data) {
            if (!data) {
              return data;
            }
            var fd = new FormData();
            angular.forEach(data, function (value, key) {
              if(value instanceof FileList) {
                if (value.length === 1) {
                  fd.append(key, value[0]);
                } else {
                  angular.forEach(value, function (file, index) {
                    fd.append(key + '_' + index, file);
                  });
                } 
              } else {
                fd.append(key, value);
              }
            });
            return fd;   
          },
          headers: {"Content-Type": "application/x-www-form-urlencoded"}
        }
      });
  });