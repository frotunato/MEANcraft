angular.module('MEANcraftApp')

  .factory('UserAuth', function () {
    var auth = {
      isLogged: false
    };
    return auth;
  })

  .factory('Auth', function ($location, $rootScope, $http, $q, $window, UserAuth) {
    return {
      login: function (credentials, callback) {
        return $http.post('/login', {
          username: credentials.username, 
          password: credentials.password
        })
        .success(function (data, status, headers, config) {
          $window.sessionStorage.token = data.token;
          UserAuth.isLogged = true;
        })
        .error(function (data, status, headers, config) {
        });
      }
    };
  })

  .factory('TokenInterceptor', function ($q, $window, $location, UserAuth) {
    return {
      request: function (config) {
        config.headers.authorization = $window.sessionStorage.token || {};
        return config;
      },

      requestError: function (rejection) {
        return $q.reject(rejection);
      },
      
      response: function (response) {
        if (response !== null && $window.sessionStorage.token && response.headers('authorization')) {
          console.groupCollapsed('%cAPP.TOKEN_INTERCEPTOR -> TOKEN REFRESHED', 'background: #222; color: #bada55;');
          console.log('%cOLD TOKEN -> %c' + $window.sessionStorage.token, 'font-weight: bold', '');
          console.log('%cNEW TOKEN -> %c' + response.headers('authorization'), 'font-weight: bold', '');
          console.groupEnd('APP.TOKEN_INTERCEPTOR -> TOKEN REFRESHED');
          $window.sessionStorage.token = response.headers('authorization');
        }
        return response || $q.when(response);
      },

      responseError: function (rejection) {
        if (rejection !== null && rejection.status === 401 && $window.sessionStorage.token !== undefined) {
          UserAuth.isLogged = false;
          delete $window.sessionStorage.token;
          $location.path('/login');
        }
        return $q.reject(rejection);
      }
    };
  });