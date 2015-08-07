angular.module('MEANcraftApp', ['ngRoute', 'MEANcraftApp.login', 'MEANcraftApp.overview', 'btford.socket-io'/*,'socket-io',  'flow'*/])

  .config(function ($httpProvider, $routeProvider) {
    $httpProvider.interceptors.push('TokenInterceptor');

    $routeProvider
      
      .when('/login', {
        templateUrl: 'app/login/login',
        controller: 'loginCtrl',
        protect: false
      })

      .when('/overview', {
        templateUrl: 'app/overview/overview',
        //controller: 'overviewCtrl',
        protect: true,
        resolve: {
          initialData: function (ServerSocket, FetchData, $q) {
            return $q(function (resolve, reject) {
              ServerSocket.emit('info');
              ServerSocket.once('info', function (data) {
                console.log(data);
                FetchData = angular.extend(FetchData, data);
                resolve();
              });
            });
          }
        }
      })

      .otherwise({
        redirectTo: '/overview'
      });

    })

  .run(function ($rootScope, $location, $window, $routeParams, UserAuth) {
    if (!UserAuth.isLogged) {
      $location.path('/login');
    }

    $rootScope.$on('$routeChangeStart', function (event, nextRoute, prevRoute) {
      console.groupCollapsed('%cAPP.RUN -> ROUTE CHANGE START', 'background: #222; color: #bada55;');
      console.log('%cTOKEN -> %c' + $window.sessionStorage.token, 'font-weight: bold', '');
      console.log('%cLOGGIN STATUS -> %c' + UserAuth.isLogged, 'font-weight: bold', UserAuth.isLogged ? 'color: green;' : 'color: red;');
      console.groupEnd('APP.RUN -> ROUTE CHANGE START');
      if (nextRoute.protect && UserAuth.isLogged === false && !$window.sessionStorage.token) {
        $location.path('/login');
        console.error('Route protected, user not logged in');
      } else if (!nextRoute.protect && UserAuth.isLogged) {
        $location.path('/overview');
      }
    });
  });