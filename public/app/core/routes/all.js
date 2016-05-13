define([
  'angular',
  '../core_module',
  './bundle_loader',
  './dashboard_loaders',
], function(angular, coreModule, BundleLoader) {
  "use strict";

  coreModule.default.config(function($routeProvider, $locationProvider) {
    $locationProvider.html5Mode(true);

    var loadOrgBundle = new BundleLoader.BundleLoader('app/features/org/all');
    var loadAppsBundle = new BundleLoader.BundleLoader('app/features/apps/all');

    $routeProvider
      .when('/', {
        templateUrl: 'app/partials/dashboard.html',
        controller : 'LoadDashboardCtrl',
        reloadOnSearch: false,
      })
      .when('/dashboard/:type/:slug', {
        templateUrl: 'app/partials/dashboard.html',
        controller : 'LoadDashboardCtrl',
        reloadOnSearch: false,
      })
      .when('/dashboard-solo/:type/:slug', {
        templateUrl: 'app/features/panel/partials/soloPanel.html',
        controller : 'SoloPanelCtrl',
      })
      .when('/dashboard-import/:file', {
        templateUrl: 'app/partials/dashboard.html',
        controller : 'DashFromImportCtrl',
        reloadOnSearch: false,
      })
      .when('/dashboard/new', {
        templateUrl: 'app/partials/dashboard.html',
        controller : 'NewDashboardCtrl',
        reloadOnSearch: false,
      })
      .when('/import/dashboard', {
        templateUrl: 'app/features/dashboard/partials/import.html',
        controller : 'DashboardImportCtrl',
      })
      .when('/datasources', {
        templateUrl: 'app/features/datasources/partials/list.html',
        controller : 'DataSourcesCtrl',
        resolve: loadOrgBundle,
      })
      .when('/datasources/edit/:id', {
        templateUrl: 'app/features/datasources/partials/edit.html',
        controller : 'DataSourceEditCtrl',
        resolve: loadOrgBundle,
      })
      .when('/datasources/new', {
        templateUrl: 'app/features/datasources/partials/edit.html',
        controller : 'DataSourceEditCtrl',
        resolve: loadOrgBundle,
      })
      .when('/admin/settings', {
        templateUrl: 'app/features/admin/partials/settings.html',
        controller : 'AdminSettingsCtrl',
      })
     .when('/admin/orgs', {
        templateUrl: 'app/features/admin/partials/orgs.html',
        controller : 'AdminListOrgsCtrl',
      })
      .when('/login', {
        templateUrl: 'app/partials/login.html',
        controller : 'LoginCtrl',
      })
      .when('/global-alerts', {
        templateUrl: 'app/features/dashboard/partials/globalAlerts.html',
      })
      .otherwise({
        templateUrl: 'app/partials/error.html',
        controller: 'ErrorCtrl'
      });
  });

});
