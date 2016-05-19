'use strict';

var calcTimeShift = function(shift){
	var unit = shift.slice(-1);
	var unitShift = 0;
	switch(unit){
		case 'd':
			unitShift = 24*60*60*1000;
			break;
		case 'h':
			unitShift = 60*60*1000;
			break;
		case "m":
			unitShift = 60*1000;
			break;
		case "w":
			unitShift = 7*24*60*60*1000;
			break;
		case "M":
			unitShift = 30*24*60*60*1000;
			break;
		case "Y":
			unitShift = 365*24*60*60*1000;
			break;
	}
	return parseInt(shift.slice(0,-1)*unitShift);
};

//This is a hack to fix bugs in flot timezone shift
var timeZoneShift = function(){
	return 5.5*60*60*1000;
};


var getMonthStartTime = function(epochTime){
		var d = new Date(0);
		d.setUTCSeconds(epochTime);
		var firstDay = new Date(d.getUTCFullYear(), d.getUTCMonth(), 1);
		return new Date(firstDay.getTime() - firstDay.getTimezoneOffset() * 60000).getTime();
};