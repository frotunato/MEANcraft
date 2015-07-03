angular.module('MEANcraftApp.login')
  
  .controller('loginCtrl', function ($scope, $location, Auth) {
    
    $scope.login = function () {
      if ($scope.credentials.username !== '' && $scope.credentials.password !== '') {
        Auth.login($scope.credentials).then(
          function (response) {
            console.groupCollapsed('%cLOGIN.CONTROLLER -> LOGIN CREDENTIALS', 'background: #222; color: #bada55');
            console.log('%cUSER -> %c' + response.config.data.username, 'font-weight: bold', '');
            console.log('%cPASSWORD -> %c' + response.config.data.password, 'font-weight: bold', '');
            console.groupEnd('LOGIN.CONTROLLER -> LOGIN CREDENTIALS');
            $location.path('/overview');
          },
          function (response) {
            console.error('Invalid credentials', response);
          }
        )
      }
    }

    //Socket.emit('server', {action: "start", _id: "testID"});
    //Socket.emit('server', {action: "create", name: "World 1" , version: "1.8.1", });
    
  });