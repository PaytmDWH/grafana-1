/**
 * Created by santosh on 11/25/16.
 */

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
        .when('/segments', {
          templateUrl: 'app/features/segmentation/partials/segments.html',
          controller : 'SegmentsCtrl'
        })
        .when('/segments/create', {
          templateUrl: 'app/features/segmentation/partials/segment.html',
          controller : 'SegmentEditCtrl'
        })
        .when('/segments/edit/:id', {
          templateUrl: 'app/features/segmentation/partials/segment.html',
          controller : 'SegmentEditCtrl'
        });
    });
  });
