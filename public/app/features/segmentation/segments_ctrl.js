/**
 * Created by santosh on 11/25/16.
 */
//TODO: Create a JIRA.
define([
    'angular',
    'lodash'
  ],
  function (angular, _) {
    'use strict';

    var module = angular.module('grafana.controllers');

    // No dependency on other JS modules. Self sufficient.
    module.controller('SegmentsCtrl', function($scope, $location, backendSrv) {
      backendSrv.get('/api/segments')
      //TODO: Implement API endpoint
        .then(function(result) {
          $scope.segments = result;
        });

      $scope.removeSegmentConfirmed = function(segment) {
        //Remove from local array model.
        _.remove($scope.segments, {id: segment.id});

        backendSrv.delete('/api/segments/' + segment.id)
          .then(function() {
            $scope.appEvent('alert-success', ['Segment deleted', '']);
          }, function() {
            $scope.appEvent('alert-error', ['Unable to delete segment', '']);
            $scope.segments.push(segment);
          });
      };

      $scope.removeSegment = function(segment) {
        $scope.appEvent('confirm-modal', {
          title: 'Confirm delete segment board',
          text: 'Are you sure you want to delete segment ' + segment.name + '?',
          yesText: "Delete",
          icon: "fa-warning",
          onConfirm: function() {
            $scope.removeSegmentConfirmed(segmentBoard);
          }
        });

      };

    });
  });
