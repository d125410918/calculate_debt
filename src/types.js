const LoanState={INIT:'INIT',EDIT_INPUT:'EDIT_INPUT',VALIDATING:'VALIDATING',CALCULATING:'CALCULATING',RESULT:'RESULT',ERROR:'ERROR',AUTO_FETCHING_GOLD_PRICE:'AUTO_FETCHING_GOLD_PRICE',GOLD_PRICE_READY:'GOLD_PRICE_READY',GOLD_PRICE_FALLBACK:'GOLD_PRICE_FALLBACK',GOLD_PRICE_MANUAL:'GOLD_PRICE_MANUAL'};
const ItemType={NORMAL:'normal',VEHICLE:'vehicle',GOLD:'gold'};
const DefaultSetting={interestPerTenThousand:750,tenThousand:10000,normalPeriods:2,specialPeriods:3,vehicleSettingFee:2000,goldFixedAmount:50000};
function money(value){return Math.round(Number(value||0)).toLocaleString('zh-TW');}
function toNumber(value){const n=Number(value);return Number.isFinite(n)?n:0;}
