define([
  'moment',
],
function() {
  'use strict';

  var utils = {};


  utils.deepCopy = function(obj) {
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

  return utils;
});
