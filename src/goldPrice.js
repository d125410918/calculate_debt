async function fetchGoldPrice(){
  const status=document.getElementById('goldStatus');
  try{
    if(status)status.textContent='讀取中';
    const res=await fetch('/api/gold-price');
    if(!res.ok)throw new Error('api failed');
    const data=await res.json();
    const value=Number(data.price||0);
    if(data.success&&value>0){
      if(status)status.textContent='已取得一錢金價';
      return Math.round(value);
    }
    throw new Error('empty price');
  }catch(e){
    if(status)status.textContent='自動抓價失敗，請手動輸入';
    return 0;
  }
}
