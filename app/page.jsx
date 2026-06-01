'use client';
import {useMemo,useState} from 'react';

const cfg={rate:.075,normal:2,special:3,vehicleFee:2000,goldAmount:50000};
const fmt=n=>Math.round(Number(n||0)).toLocaleString('zh-TW');
const special=d=>{const day=new Date(d).getDate();return day>=29||day<=5};

export default function Page(){
 const today=new Date().toISOString().slice(0,10);
 const [type,setType]=useState('normal');
 const [date,setDate]=useState(today);
 const [amount,setAmount]=useState(100000);
 const [vehicle,setVehicle]=useState(false);
 const [gold,setGold]=useState(0);
 const [items,setItems]=useState([{name:'帳管費',amount:300},{name:'手續費',amount:200}]);
 const result=useMemo(()=>{const base=type==='gold'?cfg.goldAmount:Number(amount||0);const periods=special(date)?cfg.special:cfg.normal;const interest=Math.round(base*cfg.rate*periods);const vehicleCost=type==='vehicle'&&vehicle?cfg.vehicleFee:0;const goldCost=type==='gold'?Number(gold||0):0;const other=items.reduce((s,x)=>s+Number(x.amount||0),0);const total=interest+vehicleCost+goldCost+other;return{base,periods,interest,vehicleCost,goldCost,other,total,net:base-total};},[type,date,amount,vehicle,gold,items]);
 const addItem=()=>setItems([...items,{name:'',amount:0}]);
 const updateItem=(i,k,v)=>setItems(items.map((x,n)=>n===i?{...x,[k]:v}:x));
 const delItem=i=>setItems(items.filter((_,n)=>n!==i));
 const fetchGold=async()=>{try{const r=await fetch('/api/gold-price');const j=await r.json();if(j.price>0)setGold(j.price)}catch(e){}}
 return <main className="page"><header className="hero"><div><h1>自動計算出金額度</h1><p>貸款可實拿金額計算工具</p></div><div className="date">今日日期<br/><b>{today}</b></div></header><div className="notice">本工具依設定規則即時計算，實際結果以最後審核為準。</div><section className="layout"><div className="left"><div className="card"><h2>1 基本資料</h2><label>貸款類型</label><div className="tabs"><button className={type==='normal'?'on':''} onClick={()=>setType('normal')}>一般貸款</button><button className={type==='vehicle'?'on':''} onClick={()=>setType('vehicle')}>汽機車貸款</button><button className={type==='gold'?'on':''} onClick={()=>setType('gold')}>黃金貸款</button></div><div className="grid"><label>申請日期<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>貸款金額<input type="number" value={type==='gold'?cfg.goldAmount:amount} disabled={type==='gold'} onChange={e=>setAmount(e.target.value)}/></label></div>{type==='vehicle'&&<label className="check"><input type="checkbox" checked={vehicle} onChange={e=>setVehicle(e.target.checked)}/> 汽機車需要上設定，扣 2,000 元</label>}{type==='gold'&&<div className="gold"><label>今日一錢黃金價<input type="number" value={gold} onChange={e=>setGold(e.target.value)}/></label><button onClick={fetchGold}>自動抓金價</button></div>}<div className="rule"><b>扣款期數：前扣 {result.periods} 期</b><span>每萬元 750 元，利率 7.5%</span></div></div><div className="card"><h2>2 其他扣款</h2>{items.map((x,i)=><div className="item" key={i}><input placeholder="項目名稱" value={x.name} onChange={e=>updateItem(i,'name',e.target.value)}/><input type="number" value={x.amount} onChange={e=>updateItem(i,'amount',e.target.value)}/><button onClick={()=>delItem(i)}>刪除</button></div>)}<button className="add" onClick={addItem}>＋ 新增其他扣款項目</button></div></div><aside className="right"><div className="result"><h2>試算結果</h2><div className="money">{fmt(result.net)}<small>元</small></div><Row k="放款金額" v={fmt(result.base)}/><Row k="利息" v={'- '+fmt(result.interest)}/><Row k="設定費" v={'- '+fmt(result.vehicleCost)}/><Row k="黃金價扣除" v={'- '+fmt(result.goldCost)}/><Row k="其他扣款" v={'- '+fmt(result.other)}/><Row k="總扣款" v={'- '+fmt(result.total)} red/><Row k="客人實拿" v={fmt(result.net)} strong/></div><div className="info"><b>規則說明</b><p>一般日期前扣 2 期；每月 29 號到隔月 5 號前扣 3 期。黃金固定 50,000 元並扣除一錢黃金價。</p></div></aside></section></main>
}
function Row({k,v,red,strong}){return <div className={(strong?'row strong':'row')+(red?' red':'')}><span>{k}</span><b>{v}</b></div>}
