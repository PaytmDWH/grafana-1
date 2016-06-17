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
    var i = 0;
    for (; i < tg.length; i++) {
      var name = tg[i].datasource;
      dstoIntervalMap[name] = this.datasourceSrv.datasources[name].interval;
      dsToIndexnameMap[name] = this.datasourceSrv.datasources[name].index;
    }

    var promises = _.map(sets, targets => {
      var dsName = targets[0].datasource;
      if (dsName === '-- Mixed --') {
        return this.$q([]);
      }

      return this.datasourceSrv.get(dsName).then(function(ds) {
        var opt = angular.copy(options);
        opt.targets = targets;
        ds.setMixedDatasorceMap(dstoIntervalMap, dsToIndexnameMap);
        return ds.query(opt);
      });
    });

    return this.$q.all(promises).then(function(results) {
      return { data: _.flatten(_.pluck(results, 'data')) };
    });
  }
}

export {MixedDatasource, MixedDatasource as Datasource}
