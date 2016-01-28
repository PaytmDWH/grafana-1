define([
  'angular',
],
function (angular) {
  'use strict';

  var module = angular.module('grafana.controllers');

  module.controller('ElasticQueryCtrl', function($scope, $timeout, uiSegmentSrv) {
    $scope.esVersion = $scope.datasource.esVersion;

    $scope.init = function() {
      var target = $scope.target;
      if (!target) { return; }

      $scope.queryUpdated();
    };

    $scope.getFields = function(type) {
      var jsonStr = angular.toJson({find: 'fields', type: type});
      return $scope.datasource.metricFindQuery(jsonStr)
      .then(uiSegmentSrv.transformToSegments(false))
      .then(null, $scope.handleQueryError);
    };

    $scope.queryUpdated = function() {
      if($scope.target.editQueryMode){
        $scope.target.query = JSON.parse($scope.target.rawQuery).query.filtered.query.query_string.query;
      }
      var newJson = angular.toJson($scope.datasource.queryBuilder.build($scope.target), true);
      if (newJson !== $scope.oldQueryRaw) {
        $scope.rawQueryOld = newJson;
        $scope.get_data();
      }

      $scope.appEvent('elastic-query-updated');
    };

    $scope.handleQueryError = function(err) {
      $scope.parserError = err.message || 'Failed to issue metric query';
      return [];
    };
    $scope.toggleQueryMode = function () {
      if ($scope.target.rawQuery) {
        $scope.target.editQueryMode = false;
        delete $scope.target.rawQuery;
      }
      else {
        $scope.target.editQueryMode = true;
        $scope.target.rawQuery = angular.toJson($scope.datasource.queryBuilder.build($scope.target), true);
        var query = $scope.target.query || "";
        $scope.target.rawQuery = $scope.target.rawQuery.replace(/ /g,'').replace("$lucene_query",query);
      }
    };
    $scope.init();

  });

});
