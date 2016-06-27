///<reference path="../../../headers/common.d.ts" />

import angular from 'angular';
import _ from 'lodash';

class MixedDatasource {

  /** @ngInject */
  constructor(private $q, private datasourceSrv) {
  }

  query(options) {
    var sets = {};
    var tg = options.targets;
    if (tg.length > 0){
      sets[tg[0].datasource] = tg;
    }

    var dstoIntervalMap = {};
    var dsToIndexnameMap = {};
    var dsToTimeFieldMap = {};
    var i = 0;
    for (; i < tg.length; i++) {
      var name = tg[i].datasource;
      if (this.datasourceSrv.datasources[name] === undefined) {
        var ansource;
        var ansources = this.datasourceSrv.getAnnotationSources();
        var len = ansources.length;
        for (var i = 0; i < len; i++) {
          if (ansources[i].name === name){
            dstoIntervalMap[name] = ansources[i].jsonData.timeInterval;
            dsToIndexnameMap[name] = ansources[i].index;
            dsToTimeFieldMap[name] = ansources[i].jsonData.timeField;
            break;
          }
        }
      }else{
        dstoIntervalMap[name] = this.datasourceSrv.datasources[name].interval;
        dsToIndexnameMap[name] = this.datasourceSrv.datasources[name].index;
        dsToTimeFieldMap[name] = this.datasourceSrv.datasources[name].timeField;
      }
    }

    var promises = _.map(sets, targets => {
      var dsName = targets[0].datasource;
      if (dsName === '-- Mixed --') {
        return this.$q([]);
      }

      return this.datasourceSrv.get(dsName).then(function(ds) {
        var opt = angular.copy(options);
        opt.targets = targets;
        ds.setMixedDatasorceMap(dstoIntervalMap, dsToIndexnameMap, dsToTimeFieldMap);
        return ds.query(opt);
      });
    });

    return this.$q.all(promises).then(function(results) {
      return { data: _.flatten(_.pluck(results, 'data')) };
    });
  }
}

export {MixedDatasource, MixedDatasource as Datasource}
