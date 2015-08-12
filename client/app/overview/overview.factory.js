angular.module('MEANcraftApp.overview')

  .factory('FetchData', function () {
    return {
      maps: [],
      execs: [],
      selected: {},
      tree: {},
      pToken: ''
    };
  })

  //.factory('TreeNavigation', function)