export default async function handler(req,res){
  try{
    const r=await fetch('https://api.gold-api.com/price/XAU');
    if(!r.ok)throw new Error('gold api failed');
    const data=await r.json();
    const usdPerOunce=Number(data.price||0);
    if(!Number.isFinite(usdPerOunce)||usdPerOunce<=0)throw new Error('bad price');
    const twdRate=32;
    const twdPerGram=usdPerOunce*twdRate/31.1035;
    const twdPerMace=Math.round(twdPerGram*3.75);
    res.status(200).json({success:true,price:twdPerMace,unit:'TWD_PER_MACE',source:'gold-api',updatedAt:new Date().toISOString()});
  }catch(e){
    res.status(200).json({success:false,price:0,message:'請手動輸入今日一錢黃金價'});
  }
}
