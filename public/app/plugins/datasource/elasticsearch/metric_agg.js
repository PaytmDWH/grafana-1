define([
  'angular',
  'lodash',
  './query_def'
],
function (angular, _, queryDef) {
  'use strict';

  var module = angular.module('grafana.directives');

  module.controller('ElasticMetricAggCtrl', function($scope, uiSegmentSrv, $q, $rootScope) {
    var metricAggs = $scope.target.metrics;

    $scope.metricAggTypes = queryDef.getMetricAggTypes($scope.esVersion);
    $scope.extendedStats = queryDef.extendedStats;
    $scope.bodmasOptions = queryDef.bodmasOptions;
    $scope.groupedAverageMetricOptions = queryDef.groupedAverageMetricOptions;
    $scope.calcMetricsOptions = queryDef.calcMetricsOptions;
    $scope.pipelineAggOptions = [];
    
    $scope.scriptedMetricOptions = queryDef.scriptedMetricOptions;

    $scope.init = function() {
      $scope.agg = metricAggs[$scope.index];
      $scope.validateModel();
      $scope.updatePipelineAggOptions();
    };

    $scope.updatePipelineAggOptions = function() {
      $scope.pipelineAggOptions = queryDef.getPipelineAggOptions($scope.target);
    };

    $rootScope.onAppEvent('elastic-query-updated', function() {
      $scope.index = _.indexOf(metricAggs, $scope.agg);
      $scope.updatePipelineAggOptions();
      $scope.validateModel();
    }, $scope);

    $scope.validateModel = function() {
      $scope.isFirst = $scope.index === 0;
      $scope.isSingle = metricAggs.length === 1;
      $scope.settingsLinkText = '';
      $scope.aggDef = _.findWhere($scope.metricAggTypes, {value: $scope.agg.type});

      if (queryDef.isPipelineAgg($scope.agg.type)) {
        $scope.agg.pipelineAgg = $scope.agg.pipelineAgg || 'select metric';
        $scope.agg.field = $scope.agg.pipelineAgg;

        var pipelineOptions = queryDef.getPipelineOptions($scope.agg);
        if (pipelineOptions.length > 0) {
          _.each(pipelineOptions, function(opt) {
            $scope.agg.settings[opt.text] = $scope.agg.settings[opt.text] || opt.default;
          });
          $scope.settingsLinkText = 'Options';
        }
      } else if (!$scope.agg.field && $scope.aggDef.requiresField) {
        $scope.agg.field = 'select field';
      }

      switch($scope.agg.type) {
	case 'scripted_metric' : {
          $scope.settingsLinkText = 'Settings';

          for (var key in queryDef.scriptedMetricOptions) {
            var opt = queryDef.scriptedMetricOptions[key];
            $scope.agg.settings[opt.value] = $scope.agg.settings[opt.value] || '';
          }
          break;
        }
        case 'grouped_average' : {
          $scope.settingsLinkText = "Options";
          break;
        }
        case 'percentiles': {
          $scope.agg.settings.percents = $scope.agg.settings.percents || [25,50,75,95,99];
          $scope.settingsLinkText = 'Values: ' + $scope.agg.settings.percents.join(',');
          break;
        }
        case 'extended_stats': {
          if (_.keys($scope.agg.meta).length === 0)  {
            $scope.agg.meta.std_deviation_bounds_lower = true;
            $scope.agg.meta.std_deviation_bounds_upper = true;
          }

          var stats = _.reduce($scope.agg.meta, function(memo, val, key) {
            if (val) {
              var def = _.findWhere($scope.extendedStats, {value: key});
              memo.push(def.text);
            }
            return memo;
          }, []);

          $scope.settingsLinkText = 'Stats: ' + stats.join(', ');
          break;
        }
        case 'raw_document': {
          $scope.target.metrics = [$scope.agg];
          $scope.target.bucketAggs = [];
          break;
        }
	case 'calc_metric' : {
          $scope.settingsLinkText = "Options";
	  $scope.showOptions = !$scope.showOptions;
	}
      }

      if ($scope.aggDef.supportsInlineScript) {
        // I know this stores the inline script twice
        // but having it like this simplifes the query_builder
        var inlineScript = $scope.agg.inlineScript;
        if (inlineScript) {
          $scope.agg.settings.script = {inline: inlineScript};
        } else {
          delete $scope.agg.settings.script;
        }

        if ($scope.settingsLinkText === '') {
          $scope.settingsLinkText = 'Options';
        }
      }
    };

    $scope.toggleOptions = function() {
      $scope.showOptions = !$scope.showOptions;
      $scope.updatePipelineAggOptions();
    };

    $scope.onChangeInternal = function() {
      $scope.onChange();
    };

    $scope.onTypeChange = function() {
      $scope.agg.settings = {};
      $scope.agg.meta = {};
      $scope.showOptions = false;
      if ($scope.agg.type === 'scripted_metric') {
          delete $scope.agg.field;
        }
      $scope.updatePipelineAggOptions();
      $scope.onChange();
    };

    $scope.getFieldsInternal = function() {
      return $scope.getFields({$fieldType: 'number'});
    };

    $scope.addMetricAgg = function() {
      var addIndex = metricAggs.length;

      var id = _.reduce($scope.target.bucketAggs.concat($scope.target.metrics), function(max, val) {
        return parseInt(val.id) > max ? parseInt(val.id) : max;
      }, 0);

      metricAggs.splice(addIndex, 0, {type: "count", field: "select field", id: (id+1).toString()});
      $scope.onChange();
    };

    $scope.removeMetricAgg = function() {
      metricAggs.splice($scope.index, 1);
      $scope.onChange();
    };

    $scope.toggleShowMetric = function() {
      $scope.agg.hide = !$scope.agg.hide;
      if (!$scope.agg.hide) {
        delete $scope.agg.hide;
      }
      $scope.onChange();
    };

    $scope.toggleBodmasOperations = function() {
      var cnt = 0
      console.log($scope.agg.meta);
      for (var prop in $scope.agg.meta) {
        if ($scope.agg.meta.hasOwnProperty(prop)) {
          if($scope.agg.meta[prop]){
            cnt+=1;
          }
        }
      }
      if (cnt!==1) {
        $scope.target.bodmas = false;
        $scope.agg.meta.add = false;
        $scope.agg.meta.sub = false;
	$scope.agg.meta.mul = false;
	$scope.agg.meta.div = false;

        delete $scope.agg.inlineScript;
      } else {
        $scope.target.bodmas = true;
        var field1 = "";
        var field2 = "";
        if($scope.agg.field && $scope.agg.field !== ""){
          field1 = "doc['" + $scope.agg.field + "'].value";
        }
        else {
          field1 = undefined;
        }
        if($scope.agg.field2 && $scope.agg.field2 !== ""){
          field2 = "doc['" + $scope.agg.field2 + "'].value";
        }
        else {
          field2 = undefined;
        }
        if($scope.agg.meta.add){
          $scope.agg.inlineScript = (field1||0).toString() + " + " + (field2||0).toString();
        }
        else if($scope.agg.meta.sub){
          $scope.agg.inlineScript = (field1||0).toString() + " - " + (field2||0).toString();
        }
	else if($scope.agg.meta.mul){
          $scope.agg.inlineScript = (field1||1).toString() + " * " + (field2||1).toString();
        }
	else if($scope.agg.meta.div){
          $scope.agg.inlineScript = (field1||1).toString() + " / " + (field2||1).toString();
        }
      }
      $scope.validateModel();
      $scope.onChangeInternal();
    };

    $scope.groupedAverageOperations = function() {

      console.log($scope.agg);
      var initScript = "_agg['term1'] = []; _agg['term2'] = []";
      var mapString = "_agg.term1.add(field1);_agg.term2.add(field2)";
      var combineString = "num=0;den=0;for (t in _agg.term1) { num += t ;};for (u in _agg.term2) { den += u ;}; res =[num,den] ;return res";
      var reduceString = "den=0;num = 0;for (a in _aggs) { num += a[0] ;den+=a[1]}; return den/num";
      if($scope.agg.isPercent){
        reduceString = "den=0;num = 0;for (a in _aggs) { num += a[0] ;den+=a[1]}; return den/num*100";
      }
      else{
        reduceString = "den=0;num = 0;for (a in _aggs) { num += a[0] ;den+=a[1]}; return den/num";
      }
      var field1 = "";
      var field2 = "";
      if(!$scope.agg.field1 || $scope.agg.field1 === ""){
        field1 = "0";
      }
      else{
        field1 = "doc['" + $scope.agg.field1 + "'].value";
      }
      if(!$scope.agg.field2 || $scope.agg.field2 === ""){
        field2 = "0";
      }
      else{
        field2 = "doc['" + $scope.agg.field2 + "'].value";
      }
      $scope.agg.settings["init_script"] = initScript;
      $scope.agg.settings["map_script"] = mapString.replace("field1",field1).replace("field2",field2);
      $scope.agg.settings["combine_script"] = combineString;
      $scope.agg.settings["reduce_script"] = reduceString;
      
      $scope.validateModel();
      $scope.onChangeInternal();
    }

    $scope.calculatedMetricOperations = function() {
      var calc_metric_formula = $scope.agg.formula;
      if (calc_metric_formula) {
        $scope.agg.settings.calc_metric_formula = calc_metric_formula;
      } else {
        delete $scope.agg.settings.calc_metric_formula;
      }
      console.log(calc_metric_formula);
      $scope.validateModel();
      $scope.onChangeInternal();
    }
	
    $scope.init();

  });

});
