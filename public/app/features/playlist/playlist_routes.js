define([
  'angular',
  'app/core/config',
  'lodash'
],
function (angular) {
  'use strict';

  var module = angular.module('grafana.routes');

  module.config(function($routeProvider) {
    $routeProvider
      .when('/playlists/play/:id', {
        resolve: {
          init: function(playlistSrv, $route) {
            var playlistId = $route.current.params.id;
            playlistSrv.start(playlistId);
          }
        }
      });
  });
});
