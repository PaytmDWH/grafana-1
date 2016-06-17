var deepCopy = function(obj) {
  if (Object.prototype.toString.call(obj) === '[object Array]') {
    var arrOut = [], j = 0, len = obj.length;
    for ( ; j < len; j++ ) {
      arrOut[j] = arguments.callee(obj[j]);
    }
    return arrOut;
  }
  if (typeof obj === 'object') {
    var arrOut = {}, j;
    for ( j
     in obj ) {
      arrOut[j] = arguments.callee(obj[j]);
    }
    return arrOut;
  }
  return obj;
};

'use strict';

define([
  'angular',
  'lodash',
  'moment',
  'app/core/utils/kbn',
  './query_builder',
  './index_pattern',
  './elastic_response',
  './query_ctrl',
  './time',
],
function (angular, _, moment, kbn, ElasticQueryBuilder, IndexPattern, ElasticResponse) {
  'use strict';
  /** @ngInject */
  function ElasticDatasource(instanceSettings, $q, backendSrv, templateSrv, timeSrv) {
    this.basicAuth = instanceSettings.basicAuth;
    this.withCredentials = instanceSettings.withCredentials;
    this.url = instanceSettings.url;
    this.name = instanceSettings.name;
    this.index = instanceSettings.index;
    this.timeField = instanceSettings.jsonData.timeField;
    this.esVersion = instanceSettings.jsonData.esVersion;
    this.indexPattern = new IndexPattern(instanceSettings.index, instanceSettings.jsonData.interval);
    this.interval = instanceSettings.jsonData.timeInterval;
    this.queryBuilder = new ElasticQueryBuilder({
      timeField: this.timeField,
      esVersion: this.esVersion,
    });

    this._request = function(method, url, data) {
      var options = {
        url: this.url + "/" + url,
        method: method,
        data: data
      };

      if (this.basicAuth || this.withCredentials) {
        options.withCredentials = true;
      }
      if (this.basicAuth) {
        options.headers = {
          "Authorization": this.basicAuth
        };
      }

      return backendSrv.datasourceRequest(options);
    };

    this._get = function(url) {
      return this._request('GET', this.indexPattern.getIndexForToday() + url)
      .then(function(results) {
        return results.data;
      });
    };

    this._post = function(url, data) {
      return this._request('POST', url, data)
      .then(function(results) {
        return results.data;
      });
    };

    this.annotationQuery = function(options) {
      var annotation = options.annotation;
      var timeField = annotation.timeField || '@timestamp';
      var queryString = annotation.query || '*';
      var tagsField = annotation.tagsField || 'tags';
      var titleField = annotation.titleField || 'desc';
      var textField = annotation.textField || null;

      var range = {};
      range[timeField]= {
        from: options.range.from.valueOf(),
        to: options.range.to.valueOf(),
      };

      var queryInterpolated = templateSrv.replace(queryString);
      var filter = { "bool": { "must": [{ "range": range }] } };
      var query = { "bool": { "should": [{ "query_string": { "query": queryInterpolated } }] } };
      var data = {
        "fields": [timeField, "_source"],
        "query" : { "filtered": { "query" : query, "filter": filter } },
        "size": 10000
      };

      var header = {search_type: "query_then_fetch", "ignore_unavailable": true};

      // old elastic annotations had index specified on them
      if (annotation.index) {
        header.index = annotation.index;
      } else {
        header.index = this.indexPattern.getIndexList(options.range.from, options.range.to);
      }

      var payload = angular.toJson(header) + '\n' + angular.toJson(data) + '\n';

      return this._post('_msearch', payload).then(function(res) {
        var list = [];
        var hits = res.responses[0].hits.hits;

        var getFieldFromSource = function(source, fieldName) {
          if (!fieldName) { return; }

          var fieldNames = fieldName.split('.');
          var fieldValue = source;

          for (var i = 0; i < fieldNames.length; i++) {
            fieldValue = fieldValue[fieldNames[i]];
            if (!fieldValue) {
              console.log('could not find field in annotation: ', fieldName);
              return '';
            }
          }

          if (_.isArray(fieldValue)) {
            fieldValue = fieldValue.join(', ');
          }
          return fieldValue;
        };

        for (var i = 0; i < hits.length; i++) {
          var source = hits[i]._source;
          var fields = hits[i].fields;
          var time = source[timeField];

          if (_.isString(fields[timeField]) || _.isNumber(fields[timeField])) {
            time = fields[timeField];
          }

          var event = {
            annotation: annotation,
            time: moment.utc(time).valueOf(),
            title: getFieldFromSource(source, titleField),
            tags: getFieldFromSource(source, tagsField),
            text: getFieldFromSource(source, textField)
          };

          list.push(event);
        }
        return list;
      });
    };

    this.testDatasource = function() {
      return this._get('/_stats').then(function() {
        return { status: "success", message: "Data source is working", title: "Success" };
      }, function(err) {
        if (err.data && err.data.error) {
          return { status: "error", message: err.data.error, title: "Error" };
        } else {
          return { status: "error", message: err.status, title: "Error" };
        }
      });
    };

    this.getQueryHeader = function(searchType, timeFrom, timeTo) {
      var header = {search_type: searchType, "ignore_unavailable": true};
      header.index = this.indexPattern.getIndexList(timeFrom, timeTo);
      return angular.toJson(header);
    };

    var dsToIntervalMap = {};
    this.setDsToIntervalMap = function(map){
     dsToIntervalMap = map;
    }

    this.query = function(options) {
      var payload = "";
      var target;
      var sentTargets = [];
      var isCalcMetric = false;
      var formulas = [];
      var calcQueries = [];
      var typeDate = [];
      var timeShift = {};
      var mtdQueryList = [];
      var mtdTargetList = [];
      var mtdOffset = 0;
      for (var i = 0; i < options.targets.length; i++) {
        target = options.targets[i];
        if(target.metrics){
          if(target.metrics[0].type === 'calc_metric') {isCalcMetric = true;}
        }
      }
      for (var i = 0; i < options.targets.length; i++) {
        target = options.targets[i];
        if (target.hide) {continue;}

        if(Object.keys(dsToIntervalMap).length > 0)
           options.interval = dsToIntervalMap[target.datasource];

        var queryObj = this.queryBuilder.build(target);
        var esQuery = angular.toJson(queryObj);
        var luceneQuery = angular.toJson(target.query || '*');
        // remove inner quotes
        luceneQuery = luceneQuery.substr(1, luceneQuery.length - 2);
        luceneQuery = templateSrv.replace(luceneQuery, options.scopedVars);
        luceneQuery = luceneQuery.replace(" and ", " AND ").replace(" or "," OR ").replace(" not "," NOT ");
        luceneQuery = luceneQuery.replace(new RegExp("[AND |OR |OR NOT |AND NOT ]*[A-Za-z_0-9]*:a123a","gm"),"");
        luceneQuery = luceneQuery.trim();
        if(luceneQuery.startsWith('AND') || luceneQuery.startsWith("OR")){
          luceneQuery = luceneQuery.substr(luceneQuery.indexOf(" ") + 1);
        }
        if(luceneQuery === ""){
          luceneQuery = "*"
        };
        esQuery = esQuery.replace("$lucene_query", luceneQuery);

        var searchType = queryObj.size === 0 ? 'count' : 'query_then_fetch';
        var header = this.getQueryHeader(searchType, options.range.from, options.range.to);
        //payload +=  header + '\n';

        //payload += esQuery + '\n';
        var tempPayload="";
        if(target.metrics){
          if(target.metrics[0].type === 'calc_metric') {
            for(var q=0;q<mtdTargetList.length;q++){

              mtdQueryList[q] = mtdQueryList[q].replace(/\$interval/g, "10000d");
              mtdQueryList[q] = mtdQueryList[q].replace(/\$timeFrom/g, getMonthStartTime(options.range.to.valueOf()/1000));
              mtdQueryList[q] = mtdQueryList[q].replace(/\$timeTo/g, options.range.to.valueOf() + 5.5*3600000);
              sentTargets.push(mtdTargetList[q]);
              payload += mtdQueryList[q];
            }
            mtdOffset = mtdQueryList.length;
            mtdQueryList = [];
            mtdTargetList = [];
            tempPayload += "";
            if(!target.metrics[0].formula || target.metrics[0].formula === ""){
              target.metrics[0].formula = "query1 + query2";
            }
            formulas.push(target.metrics[0].formula);
            calcQueries.push(i+mtdOffset);
            if(target.bucketAggs[0].type === "date_histogram"){
              typeDate.push(true);
            }
            else{
              typeDate.push(false);
            }

          }
          else if(options.targets[0].editQueryMode === true){
            tempPayload += options.targets[0].rawQuery.replace(/(\r\n|\n|\r)/gm,"") + '\n';
            tempPayload +=  header + '\n';
          }
          else{
            tempPayload +=  header + '\n';
            tempPayload += esQuery + '\n';
          }
        }
        if(target.mtd === true){
          var tempTarget = deepCopy(target);
          tempTarget.alias = tempTarget.alias + ' MTD';
          tempTarget.isMTD = true;
          tempTarget.isMTDOf = i;
          mtdQueryList.push(tempPayload);
          mtdTargetList.push(tempTarget);
        }
        if(target.timeShiftComparison && target.timeShiftComparison !== ""){
          tempPayload = tempPayload.replace(/\$interval/g, options.interval);
          tempPayload = tempPayload.replace(/\$timeFrom/g, options.range.from.valueOf() - calcTimeShift(target.timeShiftComparison) + 5.5*3600000);
          tempPayload = tempPayload.replace(/\$timeTo/g, options.range.to.valueOf() - calcTimeShift(target.timeShiftComparison) + 5.5*3600000);
          timeShift[i] = calcTimeShift(target.timeShiftComparison);
        }
        else{
          tempPayload = tempPayload.replace(/\$interval/g, options.interval);
          tempPayload = tempPayload.replace(/\$timeFrom/g, options.range.from.valueOf() + 5.5*3600000);
          tempPayload = tempPayload.replace(/\$timeTo/g, options.range.to.valueOf() + 5.5*3600000);
        }
        
        payload += tempPayload;
        sentTargets.push(target);
      }


      for(var l=0;l<mtdTargetList.length;l++){

        mtdQueryList[l] = mtdQueryList[l].replace(/\$interval/g, "10000d");
        mtdQueryList[l] = mtdQueryList[l].replace(/\$timeFrom/g, getMonthStartTime(options.range.to.valueOf()/1000));
        mtdQueryList[l] = mtdQueryList[l].replace(/\$timeTo/g, options.range.to.valueOf() + 5.5*3600000);
        sentTargets.push(mtdTargetList[l]);
        payload += mtdQueryList[l];
      }

      if (sentTargets.length === 0) {
        return $q.when([]);
      }

      payload = templateSrv.replace(payload, options.scopedVars);

      return this._post('_msearch', payload).then(function(res) {
        for (i=0;i<res.responses.length;i++){
          if(timeShift.hasOwnProperty(i) && options.targets[i].bucketAggs[0].type === "date_histogram"){
            var tmp = res.responses[i].aggregations[2].buckets;
            Object.keys(tmp).forEach(function(key){
              tmp[key]['key'] = tmp[key]['key']+ timeShift[i];
              tmp[key]['key_as_string'] = tmp[key]['key'].toString();
            });
          }
          if(sentTargets[i].isMTD){
            var tempResponse = res.responses[sentTargets[i].isMTDOf].aggregations[2].buckets;
            res.responses[i].aggregations[2].buckets[0].key = tempResponse[tempResponse.length-1].key;
            res.responses[i].aggregations[2].buckets[0].key_as_string = tempResponse[tempResponse.length-1].key_as_string;
          }
        }
	if(isCalcMetric){
          isCalcMetric = false;
          if(res.responses.length < 1){

          }else{
            var resArr = [];
            for (i=0;i<res.responses.length;i++){
              if(calcQueries.indexOf(i)>=0){
                continue;
              }
              var tmp = res.responses[i].aggregations[2].buckets;
              var customMetric = {};
              Object.keys(tmp).forEach(function(key){
                var l = 1;
                while(l<51){
                  if(tmp[key].hasOwnProperty(l)){
                    break;
                  }
                  l++;
                }
                if(l>50){
                  var metricValue = tmp[key].doc_count;
                }
                else{
                  var metricValue = tmp[key][l].value;
                }
                if(customMetric[tmp[key].key]){
                  customMetric[tmp[key].key] += metricValue;
                }
                else{
                  customMetric[tmp[key].key] = metricValue;
                }
              });
            resArr.push(customMetric);
            }
            var resMap = {};
            for (i=0;i<resArr.length;i++){
              Object.keys(resArr[i]).forEach(function(key){
                if(resMap[key]){
                  resMap[key].push(resArr[i][key]);
                }
                else{
                  var arr = new Array();
                  arr[0]=resArr[i][key];
                  resMap[key] = arr;
                }
              });
            }
            for(var k=0;k<formulas.length;k++){
              var formula = formulas[k];
              for(i=res.responses.length;i>0;i--){
                var re = new RegExp("query"+(i), 'g');
                formula = formula.replace(re,"resMap[n]["+(i-1)+"]");
              }
              var finalMap = {};
              for (var n in resMap) {
                if (resMap.hasOwnProperty(n) && resMap[n].length === resArr.length) {
                  finalMap[n] = eval(formula);
                }
              }

              var sortedKeys = Object.keys(finalMap).sort();
              var tempBucket = [];
              for (i = 0; i< sortedKeys.length;i++){
                if(typeDate[k]){
                  var tempObj = {"key": parseInt(sortedKeys[i]), "key_as_string": sortedKeys[i].toString(), "doc_count": 0, "1": {"value": finalMap[sortedKeys[i]]}};
                  tempBucket.push(tempObj);
                }
                else{
                  var tempObj = {"key": sortedKeys[i], "key_as_string": sortedKeys[i].toString(), "doc_count": 0, "1": {"value": finalMap[sortedKeys[i]]}};
                  tempBucket.push(tempObj);
                }
              }
              var tempRes = deepCopy(res.responses[0]);
              tempRes.aggregations[2].buckets = tempBucket;
              tempRes.aggregations.isCustom = true;
              res.responses.push(tempRes);
            }
          }
        }
        return new ElasticResponse(sentTargets, res).getTimeSeries();
      });
    };

    this.getFields = function(query) {
      return this._get('/_mapping').then(function(res) {
        var fields = {};
        var typeMap = {
          'float': 'number',
          'double': 'number',
          'integer': 'number',
          'long': 'number',
          'date': 'date',
          'string': 'string',
        };

        for (var indexName in res) {
          var index = res[indexName];
          var mappings = index.mappings;
          if (!mappings) { continue; }
          for (var typeName in mappings) {
            var properties = mappings[typeName].properties;
            for (var field in properties) {
              var prop = properties[field];
              if (query.type && typeMap[prop.type] !== query.type) {
                continue;
              }
              if (prop.type && field[0] !== '_') {
                fields[field] = {text: field, type: prop.type};
              }
            }
          }
        }

        // transform to array
        return _.map(fields, function(value) {
          return value;
        });
      });
    };

    this.getTerms = function(queryDef) {
      var range = timeSrv.timeRange();
      var header = this.getQueryHeader('count', range.from, range.to);
      var esQuery = angular.toJson(this.queryBuilder.getTermsQuery(queryDef));

      esQuery = esQuery.replace("$lucene_query", queryDef.query || '*');
      esQuery = esQuery.replace(/\$timeFrom/g, range.from.valueOf());
      esQuery = esQuery.replace(/\$timeTo/g, range.to.valueOf());
      esQuery = header + '\n' + esQuery + '\n';

      return this._post('/_msearch?search_type=count', esQuery).then(function(res) {
        var buckets = res.responses[0].aggregations["1"].buckets;
        return _.map(buckets, function(bucket) {
          return {text: bucket.key, value: bucket.key};
        });
      });
    };

    this.metricFindQuery = function(query) {
      query = templateSrv.replace(query);
      query = angular.fromJson(query);
      if(query.query){
        query.query = query.query.replace(new RegExp("[AND |OR |OR NOT |AND NOT ]*[A-Za-z_0-9]*:a123a","gm"),"");
        query.query = query.query.trim();
        if(query.query.startsWith('AND') || query.query.startsWith("OR")){
          query.query = query.query.substr(query.query.indexOf(" ") + 1);
        }
        if(query.query === ""){
          query.query = "*";
        }
      }
      if (!query) {
        return $q.when([]);
      }

      if (query.find === 'fields') {
        return this.getFields(query);
      }
      if (query.find === 'terms') {
        if(query.query){
          query.query = query.query.replace(/"/g, '\\$&');
        }
        return this.getTerms(query);
      }
    };

    this.getDashboard = function(id) {
      return this._get('/dashboard/' + id)
      .then(function(result) {
        return angular.fromJson(result._source.dashboard);
      });
    };

    this.searchDashboards = function() {
      var query = {
        query: { query_string: { query: '*' } },
        size: 10000,
        sort: ["_uid"],
      };

      return this._post(this.index + '/dashboard/_search', query)
      .then(function(results) {
        if(_.isUndefined(results.hits)) {
          return { dashboards: [], tags: [] };
        }

        var resultsHits = results.hits.hits;
        var displayHits = { dashboards: [] };

        for (var i = 0, len = resultsHits.length; i < len; i++) {
          var hit = resultsHits[i];
          displayHits.dashboards.push({
            id: hit._id,
            title: hit._source.title,
            tags: hit._source.tags
          });
        }

        return displayHits;
      });
    };
  }

  return ElasticDatasource;
});
