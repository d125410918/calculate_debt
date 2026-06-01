function isThreePeriodDate(dateString){if(!dateString)return false;const d=new Date(dateString);const day=d.getDate();return day>=29||day<=5;}
function getPeriodCount(dateString){return isThreePeriodDate(dateString)?DefaultSetting.specialPeriods:DefaultSetting.normalPeriods;}
