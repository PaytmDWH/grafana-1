define([
  'angular',
  '../core_module',
],
function(angular, coreModule) {
  'use strict';

  coreModule.default.service('googleAnalyticsSrv', function($rootScope, $location) {
    var first = true;

    this.init = function() {
      $rootScope.$on('$viewContentLoaded', function() {
        // skip first
        if (first) {
          first = false;
          return;
        }
        var $user =  $rootScope.contextSrv.user.id;
        window.ga('set', 'dimension1', $user);
        window.ga('send', 'pageview', { page: $location.url()});
      });
    };
    
    this.sendEvent = function(gaeventObj){
      if(gaeventObj){
        window.ga('send','event',gaeventObj.category,gaeventObj.action,gaeventObj.label);
      }
    }

  }).run(function(googleAnalyticsSrv) {
    if (window.ga) {
      googleAnalyticsSrv.init();
    }
  });
});
