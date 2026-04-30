'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/* ── constants ── */
const CATS=['All','Kids','Girls','Men','Women','Jeans','Tops','Jackets','Hosiery','Woollen','Suits','Others'];
const SIZES=['XS','S','M','L','XL','XXL','3XL','Free Size','28','30','32','34','36','38','40','42'];
const GST_RATES=[0,5,12,18,28];
const PAY_MODES=['Cash','Online (UPI)','Cheque'];
const UPI_APPS=['PhonePe','Google Pay','Paytm','BHIM','Other'];
const CHQ=[
  {k:'deposited',  l:'Deposited',    c:'#B8690A',bg:'#FDF0E0',next:'cleared'},
  {k:'cleared',    l:'Cleared',      c:'#2E6B1F',bg:'#EBF5E4',next:null},
  {k:'bounced',    l:'Bounced',      c:'#9B2626',bg:'#FDF0F0',next:'redeposited'},
  {k:'redeposited',l:'Re-Deposited', c:'#1B5E8A',bg:'#E3EFF8',next:'recleared'},
  {k:'recleared',  l:'Re-Cleared',   c:'#2E6B1F',bg:'#D0F0D8',next:null},
];
const getStage=k=>CHQ.find(s=>s.k===k)||CHQ[0];
const fmt=n=>'Rs.'+Number(n||0).toFixed(2);
const n2w=n=>{
  const a=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const b=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const w=x=>{if(!x)return'';if(x<20)return a[x]+' ';if(x<100)return b[Math.floor(x/10)]+' '+(x%10?a[x%10]+' ':'');if(x<1000)return a[Math.floor(x/100)]+' Hundred '+(x%100?w(x%100):'');if(x<100000)return w(Math.floor(x/1000))+' Thousand '+(x%1000?w(x%1000):'');if(x<10000000)return w(Math.floor(x/100000))+' Lakh '+(x%100000?w(x%100000):'');return w(Math.floor(x/10000000))+' Crore '+(x%10000000?w(x%10000000):'');};
  const p=String(Number(n||0).toFixed(2)).split('.');return((w(+p[0])||'Zero')+' Rupees'+(+p[1]?' and '+w(+p[1])+' Paise':'')+' Only').trim();
};
const rnd9=()=>Math.floor(100000000+Math.random()*900000000).toString();
const qrU=(d,s=80)=>'https://api.qrserver.com/v1/create-qr-code/?data='+encodeURIComponent(d)+'&size='+s+'x'+s+'&margin=2';
const isBR=typeof window!=='undefined';
const api={
  get:u=>fetch(u).then(r=>r.json()),
  post:(u,b)=>fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()),
  put:(u,b)=>fetch(u,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()),
  patch:(u,b)=>fetch(u,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()),
  del:u=>fetch(u,{method:'DELETE'}).then(r=>r.json()),
};

/* ── palette ── */
const BL='#1B5E8A',BLL='#E3EFF8',AMB='#B8690A',AMBL='#FDF0E0',GR='#2E6B1F',GRL='#EBF5E4',RD='#9B2626',RDL='#FDF0F0',BORD='#E3E1D9',MUT='#888',TXT='#1A1A18',BG='#F5F4F0',PUR='#5B3E8F',PURL='#F0EBF8';

/* ── responsive hook ── */
function useWW(){
  const[w,setW]=useState(isBR?window.innerWidth:1200);
  useEffect(()=>{
    const h=()=>setW(window.innerWidth);
    window.addEventListener('resize',h);
    return()=>window.removeEventListener('resize',h);
  },[]);
  return w;
}

/* ── styles ── */
const S={
  card:{background:'#fff',border:'0.5px solid '+BORD,borderRadius:12,padding:'16px 20px'},
  h2:{fontSize:15,fontWeight:700,marginBottom:14,letterSpacing:'-0.2px'},
  h3:{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:MUT,marginBottom:8},
  met:{background:BG,borderRadius:10,padding:'14px 18px'},
  btn:(v,sm)=>{const m={def:{bg:'#fff',co:TXT,bo:'0.5px solid '+BORD},pri:{bg:BL,co:'#fff',bo:'none'},suc:{bg:GRL,co:GR,bo:'0.5px solid #a0c890'},dan:{bg:RDL,co:RD,bo:'0.5px solid #f0a0a0'},amb:{bg:AMBL,co:AMB,bo:'0.5px solid #e0b860'},gho:{bg:'transparent',co:BL,bo:'1px solid '+BL},pur:{bg:PURL,co:PUR,bo:'0.5px solid #c0a0e0'}};const v2=m[v]||m.def;return{background:v2.bg,color:v2.co,border:v2.bo,padding:sm?'4px 10px':'7px 14px',borderRadius:7,cursor:'pointer',fontSize:sm?11:13,fontWeight:600,display:'inline-flex',alignItems:'center',gap:5,whiteSpace:'nowrap'};},
  inp:{width:'100%',padding:'8px 12px',border:'0.5px solid '+BORD,borderRadius:8,fontSize:13,background:'#fff',color:TXT,outline:'none',boxSizing:'border-box'},
  lbl:{display:'block',fontSize:11,fontWeight:600,color:MUT,marginBottom:3},
  th:{textAlign:'left',padding:'8px 10px',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:MUT,borderBottom:'0.5px solid '+BORD,background:'#fafaf8'},
  td:{padding:'8px 10px',borderBottom:'0.5px solid #f0ede8',verticalAlign:'middle'},
  mono:{fontFamily:"'DM Mono',monospace",fontSize:12},
};

/* ── mini helpers ── */
function Bdg({c,children}){const m={green:[GRL,GR],amber:[AMBL,AMB],red:[RDL,RD],blue:[BLL,BL],gray:['#F1EFE8','#555'],purple:[PURL,PUR]};const[bg,co]=m[c]||m.gray;return React.createElement('span',{style:{background:bg,color:co,padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:700,display:'inline-block'}},children);}
function Fld({label,children,span2}){return<div style={{marginBottom:8,gridColumn:span2?'span 2':'auto'}}><label style={S.lbl}>{label}</label>{children}</div>}
function MT({msg='Nothing here yet'}){return<div style={{textAlign:'center',padding:'28px',color:MUT,fontSize:13}}>{msg}</div>}
function Spin(){return<span style={{width:14,height:14,border:'2px solid rgba(27,94,138,.3)',borderTopColor:BL,borderRadius:'50%',animation:'spin .7s linear infinite',display:'inline-block'}}/>}
function useToast(){const[t,setT]=useState(null);const show=(msg,tp='ok')=>{setT({msg,tp});setTimeout(()=>setT(null),3500)};const el=t&&<div style={{padding:'9px 14px',borderRadius:8,fontSize:13,fontWeight:500,marginBottom:10,background:t.tp==='ok'?GRL:RDL,color:t.tp==='ok'?GR:RD}}>{t.msg}</div>;return[el,show];}
function Modal({title,onClose,children,wide}){
  const ww=isBR?window.innerWidth:1200;
  const mob=ww<600;
  return<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:600,display:'flex',alignItems:mob?'flex-end':'center',justifyContent:'center',padding:mob?0:16}}>
    <div style={{background:'#fff',borderRadius:mob?'16px 16px 0 0':'14px',width:'100%',maxWidth:mob?'100%':wide?780:520,maxHeight:mob?'92vh':'92vh',overflowY:'auto',boxShadow:'0 24px 80px rgba(0,0,0,.25)'}}>
      <div style={{padding:'13px 20px',borderBottom:'0.5px solid '+BORD,display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:'#fff'}}><span style={{fontWeight:700,fontSize:14}}>{title}</span><button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:MUT}}>x</button></div>
      <div style={{padding:'16px 20px'}}>{children}</div>
    </div>
  </div>;
}
function CatTabs({value,onChange,counts}){return<div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:10}}>{CATS.map(c=><button key={c} onClick={()=>onChange(c)} style={{padding:'3px 11px',borderRadius:20,border:'0.5px solid '+(value===c?BL:BORD),background:value===c?BL:'#fff',color:value===c?'#fff':MUT,cursor:'pointer',fontSize:11,fontWeight:600}}>{c}{c!=='All'&&counts&&<span style={{opacity:.7,fontSize:9}}> {counts[c]||0}</span>}</button>)}</div>;}

const DEF={name:'Your Firm Name',shoptype:'Wholesale Clothing',gstin:'',address:'Shop Address, City, State',mobile:'',email:'',senderEmail:'',state:'Madhya Pradesh',bankName:'',bankAccount:'',bankIFSC:'',invoicePrefix:'INV',logo:'',emailSubject:'Invoice {invoiceNo} from {firmName}',emailBody:'Dear {customerName},\n\nPlease find your invoice {invoiceNo} dated {date} for {amount}.\n\nThank you for your business!\n\nWarm regards,\n{firmName}\n{mobile}',terms:'1. Goods once sold will not be taken back.\n2. Payment due within 45 days.\n3. Add 18% interest if payment not done in 45 days.\n4. Cheques subject to realisation.\n5. Subject to local jurisdiction.'};

/* ── LOGIN ── */
function Login({onLogin}){
  const[em,setEm]=useState('');const[pw,setPw]=useState('');const[ld,setLd]=useState(false);const[err,setErr]=useState('');const[mode,setMode]=useState('in');
  const go=async()=>{if(!em||!pw){setErr('Email and password required');return}setLd(true);setErr('');
    try{
      const redirectTo=window.location.origin+'/auth/callback';
      const res=mode==='in'?await supabase.auth.signInWithPassword({email:em,password:pw}):await supabase.auth.signUp({email:em,password:pw,options:{emailRedirectTo:redirectTo}});
      if(res.error)throw res.error;
      if(mode==='up'&&!res.data.session){setErr('Account created! Check email to confirm then sign in.');setMode('in');return;}
      onLogin(res.data.session);}catch(e){setErr(e.message||'Failed');}finally{setLd(false)}};
  return<div style={{minHeight:'100vh',background:'linear-gradient(145deg,#0d1f3c 0%,#1B3A6B 50%,#2d6a9c 100%)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Inter',system-ui,sans-serif",padding:16}}>
    <style>{'@import url(\'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap\');@keyframes spin{to{transform:rotate(360deg)}}input:focus{border-color:#F5A732!important;outline:none!important}'}</style>
    <div style={{width:'100%',maxWidth:420}}>
      <div style={{textAlign:'center',marginBottom:32}}><div style={{fontSize:44,fontWeight:800,color:'#fff',letterSpacing:'-2px'}}>SHOP<span style={{color:'#F5A732'}}>OS</span></div><div style={{color:'rgba(255,255,255,.55)',fontSize:12,marginTop:6,letterSpacing:'2px',textTransform:'uppercase'}}>Wholesale Management</div></div>
      <div style={{background:'rgba(255,255,255,.07)',backdropFilter:'blur(20px)',borderRadius:18,padding:28,border:'1px solid rgba(255,255,255,.12)'}}>
        <div style={{display:'flex',background:'rgba(0,0,0,.25)',borderRadius:10,padding:3,marginBottom:22,gap:3}}>
          {[['in','Sign In'],['up','Register']].map(([m,l])=><button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:'8px',border:'none',borderRadius:8,background:mode===m?'rgba(245,167,50,.9)':'transparent',color:mode===m?'#fff':'rgba(255,255,255,.5)',cursor:'pointer',fontSize:12,fontWeight:700}}>{l}</button>)}
        </div>
        {[['Email','email','email@example.com',em,setEm],['Password','password','••••••••',pw,setPw]].map(([l,t,ph,v,sv])=><div key={l} style={{marginBottom:14}}>
          <label style={{display:'block',fontSize:10,fontWeight:700,color:'rgba(255,255,255,.5)',marginBottom:4,letterSpacing:'1px',textTransform:'uppercase'}}>{l}</label>
          <input type={t} placeholder={ph} value={v} onChange={e=>sv(e.target.value)} onKeyDown={e=>e.key==='Enter'&&go()} style={{width:'100%',padding:'11px 14px',border:'1px solid rgba(255,255,255,.15)',borderRadius:9,fontSize:13,background:'rgba(255,255,255,.08)',color:'#fff',boxSizing:'border-box'}}/>
        </div>)}
        {err&&<div style={{padding:'8px 12px',borderRadius:7,background:err.includes('created')?'rgba(46,107,31,.4)':'rgba(155,38,38,.4)',color:err.includes('created')?'#a0e890':'#ffa0a0',fontSize:12,marginBottom:12}}>{err}</div>}
        <button onClick={go} disabled={ld} style={{width:'100%',padding:'12px',background:'linear-gradient(135deg,#F5A732,#B8690A)',color:'#fff',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          {ld?<><Spin/> Please wait...</>:mode==='in'?'Sign In':'Create Account'}
        </button>
      </div>
    </div>
  </div>;}

/* ── ROOT ── */
export default function ShopOS(){
  const[ses,setSes]=useState(null);const[al,setAl]=useState(true);
  const[page,setPage]=useState('dash');
  const[P,setP]=useState([]);const[C,setC]=useState([]);const[B,setB]=useState([]);const[Py,setPy]=useState([]);const[Ret,setRet]=useState([]);
  const[ld,setLd]=useState(true);
  const[firm,setFirm]=useState(()=>isBR?JSON.parse(localStorage.getItem('shopos_firm')||'null')||DEF:DEF);
  const[seq,setSeq]=useState(()=>isBR?parseInt(localStorage.getItem('shopos_seq')||'1'):1);
  const[vBill,setVBill]=useState(null);
  const ww=useWW();const mob=ww<768;const tab=ww<1024;

  useEffect(()=>{supabase.auth.getSession().then(({data:{session}})=>{setSes(session);setAl(false);});const{data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setSes(s));return()=>subscription.unsubscribe();},[]);
  useEffect(()=>{if(!ses)return;Promise.all([api.get('/api/products'),api.get('/api/customers'),api.get('/api/bills'),api.get('/api/payments'),api.get('/api/returns')]).then(([p,c,b,py,ret])=>{setP(Array.isArray(p)?p:[]);setC(Array.isArray(c)?c:[]);setB(Array.isArray(b)?b:[]);setPy(Array.isArray(py)?py:[]);setRet(Array.isArray(ret)?ret:[]);}).finally(()=>setLd(false));},[ses]);

  const saveFirm=f=>{setFirm(f);if(isBR)localStorage.setItem('shopos_firm',JSON.stringify(f));};
  const nextInv=()=>{const s=seq,ns=s+1;setSeq(ns);if(isBR)localStorage.setItem('shopos_seq',ns);return(firm.invoicePrefix||'INV')+'/'+new Date().getFullYear()+'/'+String(s).padStart(4,'0');};
  const logout=async()=>{await supabase.auth.signOut();setSes(null);};

  const TABS=[['dash','Dashboard'],['catalog','Catalog'],['scan','Scan Bill'],['labels','QR Labels'],['pos','POS/Sell'],['cust','Customers'],['bills','Bills'],['returns','Returns'],['ledger','Ledger'],['settings','Settings']];
  const ICONS={dash:'Dashboard',catalog:'Catalog',scan:'Scan',labels:'Labels',pos:'Sell',cust:'Customers',bills:'Bills',returns:'Returns',ledger:'Ledger',settings:'Settings'};

  if(al)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',gap:10,fontFamily:'Inter,sans-serif',color:BL}}><Spin/>Loading...</div>;
  if(!ses)return<Login onLogin={s=>setSes(s)}/>;
  if(ld)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',gap:10,fontFamily:'Inter,sans-serif',color:BL}}><Spin/>Loading ShopOS...</div>;

  return<div style={{fontFamily:"'Inter',system-ui,sans-serif",background:BG,minHeight:'100vh',color:TXT,paddingBottom:mob?64:0}}>
    <style>{'@import url(\'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap\');@keyframes spin{to{transform:rotate(360deg)}}button:hover{opacity:.85}input:focus,select:focus,textarea:focus{border-color:'+BL+'!important;box-shadow:0 0 0 2px rgba(27,94,138,.12)!important;outline:none!important}tr:hover td{background:#fafaf8}@media print{.np{display:none!important}}'}</style>

    {/* Desktop/Tablet nav */}
    {!mob&&<nav style={{display:'flex',alignItems:'center',padding:'0 14px',background:'#fff',borderBottom:'0.5px solid '+BORD,position:'sticky',top:0,zIndex:100,flexWrap:'wrap',minHeight:46}} className='np'>
      <span style={{fontSize:15,fontWeight:800,color:BL,marginRight:8,letterSpacing:'-0.5px'}}>SHOP<span style={{color:AMB}}>OS</span></span>
      <div style={{display:'flex',flex:1,flexWrap:'wrap'}}>
        {TABS.map(([p,l])=><button key={p} onClick={()=>setPage(p)} style={{padding:'12px 8px',border:'none',borderRadius:0,background:'transparent',color:page===p?BL:MUT,cursor:'pointer',fontSize:tab?10:11.5,fontWeight:page===p?700:500,borderBottom:page===p?'2px solid '+BL:'2px solid transparent',whiteSpace:'nowrap'}}>{l}</button>)}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:8}}>
        <span style={{fontSize:10,color:MUT,maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ses?.user?.email}</span>
        <button onClick={logout} style={{...S.btn('dan',true),fontSize:10}}>Logout</button>
      </div>
    </nav>}

    {/* Mobile bottom tab bar */}
    {mob&&<nav style={{position:'fixed',bottom:0,left:0,right:0,background:'#fff',borderTop:'0.5px solid '+BORD,display:'flex',zIndex:200,overflowX:'auto'}} className='np'>
      {TABS.slice(0,8).map(([p,l])=><button key={p} onClick={()=>setPage(p)} style={{flex:'0 0 auto',padding:'8px 12px',border:'none',borderRadius:0,background:'transparent',color:page===p?BL:MUT,cursor:'pointer',fontSize:10,fontWeight:page===p?700:500,display:'flex',flexDirection:'column',alignItems:'center',gap:2,minWidth:60,borderTop:page===p?'2px solid '+BL:'2px solid transparent'}}>{l}</button>)}
    </nav>}

    <div style={{padding:mob?12:16,maxWidth:1240,margin:'0 auto'}}>
      {page==='dash'&&<Dashboard P={P} B={B} C={C} Py={Py} mob={mob}/>}
      {page==='catalog'&&<Catalog P={P} setP={setP} mob={mob}/>}
      {page==='scan'&&<ScanBill P={P} setP={setP} onDone={()=>setPage('catalog')} onLabels={()=>setPage('labels')} mob={mob}/>}
      {page==='labels'&&<QRLabels P={P} mob={mob}/>}
      {page==='pos'&&<POS P={P} setP={setP} C={C} setC={setC} B={B} setB={setB} firm={firm} nextInv={nextInv} mob={mob} onDone={b=>{setVBill(b);setPage('bills');}}/>}
      {page==='cust'&&<Customers C={C} setC={setC} B={B} Py={Py} setPy={setPy} mob={mob}/>}
      {page==='bills'&&<Bills B={B} setB={setB} Py={Py} setPy={setPy} firm={firm} C={C} initBill={vBill} mob={mob}/>}
      {page==='returns'&&<Returns P={P} setP={setP} B={B} C={C} Ret={Ret} setRet={setRet} mob={mob}/>}
      {page==='ledger'&&<Ledger B={B} Py={Py} setPy={setPy} C={C} Ret={Ret} mob={mob}/>}
      {page==='settings'&&<Settings firm={firm} saveFirm={saveFirm} ses={ses} mob={mob}/>}
    </div>
  </div>;}

/* ── DASHBOARD ── */
function Dashboard({P,B,C,Py,mob}){
  const td=new Date();
  const todayB=B.filter(b=>new Date(b.date).toDateString()===td.toDateString());
  const totalBilled=B.reduce((s,b)=>s+b.total,0),totalPaid=Py.reduce((s,p)=>s+p.amount,0);
  const months=[];for(let i=5;i>=0;i--){const d=new Date(td);d.setMonth(d.getMonth()-i);months.push({lbl:d.toLocaleString('default',{month:'short'}),yr:d.getFullYear(),mo:d.getMonth()});}
  const mSales=months.map(m=>({...m,tot:B.filter(b=>{const d=new Date(b.date);return d.getMonth()===m.mo&&d.getFullYear()===m.yr}).reduce((s,b)=>s+b.total,0)}));
  const maxS=Math.max(...mSales.map(m=>m.tot),1);
  const pendChq=Py.filter(p=>p.mode==='Cheque'&&p.chequeStatus&&p.chequeStatus!=='cleared'&&p.chequeStatus!=='recleared');
  const low=P.filter(p=>p.qty<=10);
  const cols=mob?'1fr 1fr':'repeat(4,1fr)';
  return<div>
    <div style={{display:'flex',alignItems:'baseline',gap:10,marginBottom:16,flexWrap:'wrap'}}>
      <div style={S.h2}>Dashboard</div>
      <div style={{fontSize:11,color:MUT}}>{td.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:cols,gap:12,marginBottom:14}}>
      {[{l:"Today's Sales",v:fmt(todayB.reduce((s,b)=>s+b.total,0)),c:BL,bg:BLL,sub:todayB.length+' bills'},{l:'Outstanding',v:fmt(totalBilled-totalPaid),c:RD,bg:RDL,sub:'Total unpaid'},{l:'Customers',v:C.length,c:GR,bg:GRL,sub:B.length+' invoices'},{l:'Low Stock',v:low.length,c:AMB,bg:AMBL,sub:P.filter(p=>p.qty===0).length+' out of stock'}].map(({l,v,c,bg,sub})=><div key={l} style={{...S.met,background:bg,border:'0.5px solid '+c+'30'}}>
        <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.6px',color:c+'aa',marginBottom:4}}>{l}</div>
        <div style={{fontSize:mob?18:22,fontWeight:800,fontFamily:'DM Mono,monospace',color:c}}>{v}</div>
        <div style={{fontSize:11,color:c+'88',marginTop:3}}>{sub}</div>
      </div>)}
    </div>
    {!mob&&<div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14,marginBottom:14}}>
      <div style={S.card}>
        <div style={S.h3}>Monthly Sales — Last 6 Months</div>
        <div style={{display:'flex',alignItems:'flex-end',gap:8,height:120,paddingTop:8}}>
          {mSales.map(m=>{const h=Math.max((m.tot/maxS)*100,3);return<div key={m.lbl+m.yr} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
            <div style={{fontSize:10,color:BL,fontWeight:700,...S.mono}}>{m.tot>0?'Rs.'+Math.round(m.tot/1000)+'k':''}</div>
            <div style={{width:'100%',height:h+'%',background:'linear-gradient(180deg,'+BL+','+BL+'88)',borderRadius:'4px 4px 0 0',minHeight:3,transition:'height .4s ease'}}/>
            <div style={{fontSize:10,color:MUT,fontWeight:600}}>{m.lbl}</div>
          </div>;})}
        </div>
      </div>
      <div style={S.card}>
        <div style={S.h3}>Pending Cheques ({pendChq.length})</div>
        {pendChq.length===0?<MT msg='No pending cheques'/>:<div style={{display:'flex',flexDirection:'column',gap:6}}>{pendChq.slice(0,5).map(p=>{const st=getStage(p.chequeStatus);return<div key={p.id} style={{padding:'7px 10px',borderRadius:7,background:st.bg,border:'0.5px solid '+st.c+'40'}}><div style={{fontWeight:700,fontSize:12,color:st.c}}>{p.partyName}</div><div style={{display:'flex',justifyContent:'space-between',marginTop:2}}><span style={{fontSize:10,color:st.c+'99'}}>{st.l}</span><span style={{...S.mono,fontSize:11,color:st.c,fontWeight:700}}>{fmt(p.amount)}</span></div></div>;})}
        </div>}
      </div>
    </div>}
    <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'1fr 1fr',gap:14}}>
      <div style={S.card}>
        <div style={S.h3}>Recent Bills</div>
        {B.length===0?<MT msg='No bills yet'/>:<table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
          <thead><tr>{['Invoice','Customer','Total','Status'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{[...B].slice(0,6).map(b=>{const paid=Py.filter(p=>p.billId===b.id).reduce((s,p)=>s+p.amount,0);const st=paid>=b.total?'Paid':paid>0?'Partial':'Unpaid';return<tr key={b.id}><td style={{...S.td,...S.mono,fontWeight:800,fontSize:11}}>{b.invoiceNo||'#'+b.id}</td><td style={S.td}>{b.customerName}</td><td style={{...S.td,...S.mono,color:GR,fontWeight:800}}>{fmt(b.total)}</td><td style={S.td}><Bdg c={{Paid:'green',Partial:'amber',Unpaid:'red'}[st]}>{st}</Bdg></td></tr>;})}
          </tbody></table>}
      </div>
      <div style={S.card}>
        <div style={S.h3}>Low Stock ({low.length})</div>
        {low.length===0?<MT msg='All stocked'/>:<table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
          <thead><tr>{['Product','Cat','Qty'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{low.slice(0,8).map(p=><tr key={p.id}><td style={S.td}><div style={{fontWeight:600}}>{p.name}</div><div style={{fontSize:10,color:MUT}}>{p.size}</div></td><td style={S.td}><Bdg c='blue'>{p.cat}</Bdg></td><td style={S.td}><Bdg c={p.qty===0?'red':'amber'}>{p.qty===0?'Out':p.qty}</Bdg></td></tr>)}</tbody>
        </table>}
      </div>
    </div>
  </div>;}

/* ── CATALOG ── */
function Catalog({P,setP,mob}){
  const[cat,setCat]=useState('All');const[srch,setSrch]=useState('');const[showF,setShowF]=useState(false);const[eid,setEid]=useState(null);
  const BLK={name:'',cat:'Kids',sub:'',size:'M',color:'',price:'',gst:5,qty:0,hsn:'',articleNo:''};
  const[form,setF]=useState(BLK);const[sv,setSv]=useState(false);const[toast,showT]=useToast();
  const ff=k=>v=>setF(f=>({...f,[k]:v}));
  const cts=CATS.reduce((a,c)=>{a[c]=P.filter(p=>p.cat===c).length;return a},{});
  const rows=P.filter(p=>(cat==='All'||p.cat===cat)&&(p.name.toLowerCase().includes(srch.toLowerCase())||p.sku.includes(srch)||(p.articleNo||'').toLowerCase().includes(srch.toLowerCase())));
  const openNew=()=>{setF(BLK);setEid(null);setShowF(true)};
  const openEdit=p=>{setF({name:p.name,cat:p.cat,sub:p.sub||'',size:p.size,color:p.color||'',price:p.price,gst:p.gst,qty:p.qty,hsn:p.hsn||'',articleNo:p.articleNo||''});setEid(p.id);setShowF(true)};
  const save=async()=>{if(!form.name){alert('Name required');return}setSv(true);try{const pl={...form,price:+form.price,qty:+form.qty,gst:+form.gst};if(eid){const u=await api.put('/api/products',{id:eid,...pl});setP(ps=>ps.map(p=>p.id===eid?u:p));showT('Updated!')}else{const c=await api.post('/api/products',{...pl,sku:rnd9()});setP(ps=>[c,...ps]);showT('Added!')}setShowF(false)}catch(e){showT('Failed: '+e.message,'err')}finally{setSv(false)}};
  const del=async id=>{if(!confirm('Delete?'))return;await api.del('/api/products?id='+id);setP(ps=>ps.filter(p=>p.id!==id))};
  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><div style={S.h2}>Product Catalog</div><button style={S.btn('pri')} onClick={openNew}>+ Add Product</button></div>{toast}
    <CatTabs value={cat} onChange={setCat} counts={cts}/>
    <input style={{...S.inp,marginBottom:12}} placeholder='Search name, barcode, article no...' value={srch} onChange={e=>setSrch(e.target.value)}/>
    <div style={{...S.card,padding:0,overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:600}}>
      <thead><tr>{['QR','Product','Article','Cat','Size','Price','GST','Stock',''].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
      <tbody>
        {rows.length===0&&<tr><td colSpan={9}><MT msg='No products'/></td></tr>}
        {rows.map(p=><tr key={p.id}>
          <td style={S.td}><img src={qrU(p.sku,50)} width={50} height={50} style={{borderRadius:4,border:'0.5px solid '+BORD}} alt='QR'/></td>
          <td style={S.td}><div style={{fontWeight:700}}>{p.name}</div><div style={{fontSize:10,color:MUT,...S.mono}}>{p.sku}</div></td>
          <td style={{...S.td,...S.mono,fontSize:11,color:BL,fontWeight:600}}>{p.articleNo||'—'}</td>
          <td style={S.td}><Bdg c='blue'>{p.cat}</Bdg></td>
          <td style={S.td}><Bdg c='gray'>{p.size}</Bdg></td>
          <td style={{...S.td,...S.mono,color:AMB,fontWeight:700}}>{fmt(p.price)}</td>
          <td style={S.td}><Bdg c={p.gst===0?'gray':'blue'}>{p.gst}%</Bdg></td>
          <td style={S.td}><Bdg c={p.qty===0?'red':p.qty<=10?'amber':'green'}>{p.qty===0?'Out':p.qty}</Bdg></td>
          <td style={S.td}><div style={{display:'flex',gap:4}}><button style={S.btn('def',true)} onClick={()=>openEdit(p)}>Edit</button><button style={S.btn('dan',true)} onClick={()=>del(p.id)}>Del</button></div></td>
        </tr>)}
      </tbody>
    </table></div>
    {showF&&<div style={{...S.card,marginTop:14}}>
      <div style={S.h2}>{eid?'Edit':'Add'} Product</div>
      <div style={{display:'grid',gridTemplateColumns:mob?'1fr 1fr':'1fr 1fr 1fr',gap:10}}>
        <Fld label='Product Name *' span2><input style={S.inp} value={form.name} onChange={e=>ff('name')(e.target.value)}/></Fld>
        <Fld label='Article No'><input style={S.inp} value={form.articleNo} onChange={e=>ff('articleNo')(e.target.value)} placeholder='e.g. abc123'/></Fld>
        <Fld label='Category'><select style={S.inp} value={form.cat} onChange={e=>ff('cat')(e.target.value)}>{CATS.filter(c=>c!=='All').map(c=><option key={c}>{c}</option>)}</select></Fld>
        <Fld label='Sub-type'><input style={S.inp} value={form.sub} onChange={e=>ff('sub')(e.target.value)} placeholder='T-Shirts...'/></Fld>
        <Fld label='Size'><select style={S.inp} value={form.size} onChange={e=>ff('size')(e.target.value)}>{SIZES.map(s=><option key={s}>{s}</option>)}</select></Fld>
        <Fld label='Color'><input style={S.inp} value={form.color} onChange={e=>ff('color')(e.target.value)} placeholder='Blue...'/></Fld>
        <Fld label='Price'><input style={S.inp} type='number' value={form.price} onChange={e=>ff('price')(e.target.value)}/></Fld>
        <Fld label='GST'><select style={S.inp} value={form.gst} onChange={e=>ff('gst')(+e.target.value)}>{GST_RATES.map(r=><option key={r} value={r}>{r}%</option>)}</select></Fld>
        <Fld label='Qty'><input style={S.inp} type='number' value={form.qty} onChange={e=>ff('qty')(+e.target.value)}/></Fld>
        <Fld label='HSN'><input style={S.inp} value={form.hsn} onChange={e=>ff('hsn')(e.target.value)} placeholder='6109'/></Fld>
      </div>
      <div style={{display:'flex',gap:8,marginTop:12}}><button style={S.btn('pri')} onClick={save} disabled={sv}>{sv?'Saving...':'Save & Generate Barcode'}</button><button style={S.btn()} onClick={()=>setShowF(false)}>Cancel</button></div>
    </div>}
  </div>;}

/* ── SCAN BILL (with markup) ── */
function ScanBill({P,setP,onDone,onLabels,mob}){
  const[items,setItems]=useState([]);
  const[scanning,setScanning]=useState(false);
  const[scanStatus,setScanStatus]=useState('');
  const[preview,setPreview]=useState(null);
  const[fileType,setFileType]=useState('');
  const[err,setErr]=useState(null);
  const[toast,showT]=useToast();
  const[supplierBanner,setSupplierBanner]=useState(null);
  const[markupPct,setMarkupPct]=useState('');
  const[man,setMan]=useState({articleNo:'',name:'',cat:'Kids',sizes:'Free Size',qty:1,price:'',gst:5,color:'',hsn:''});
  const gk=()=>isBR?JSON.parse(localStorage.getItem('shopos_firm')||'{}').geminiKey||'':'';

  /* ── apply markup to all items ── */
  const applyMarkup=pct=>{
    const p=parseFloat(pct);
    if(!p||p<=0)return;
    setItems(it=>it.map(item=>({...item,price:Math.round(item._costPrice*(1+p/100))})));
  };
  const handleMarkupChange=pct=>{
    setMarkupPct(pct);
    if(!pct){setItems(it=>it.map(item=>({...item,price:item._costPrice||item.price})));return;}
    applyMarkup(pct);
  };

  const extractJSON=txt=>{
    let s=txt.replace(/```json\s*/gi,'').replace(/```\s*/gi,'').trim();
    try{return JSON.parse(s);}catch{}
    const s1=s.indexOf('{'),e1=s.lastIndexOf('}');
    if(s1!==-1&&e1>s1){try{return JSON.parse(s.slice(s1,e1+1));}catch{}}
    const s2=s.indexOf('['),e2=s.lastIndexOf(']');
    if(s2!==-1&&e2>s2){try{return{items:JSON.parse(s.slice(s2,e2+1))};}catch{}}
    /* truncation recovery */
    const outer=s.slice(s.indexOf('{'));
    const gf=(key)=>{const m=outer.match(new RegExp('"'+key+'"\\s*:\\s*"([^"]*)"'));return m?m[1]:'';}
    const gn=(key)=>{const m=outer.match(new RegExp('"'+key+'"\\s*:\\s*([\\d.]+)'));return m?+m[1]:0;}
    const itemsStart=outer.indexOf('"items"');const partial=[];
    if(itemsStart!==-1){const sec=outer.slice(itemsStart);const re=/\{[^{}]*"name"\s*:\s*"([^"]*)"[^{}]*\}/g;let match;while((match=re.exec(sec))!==null){try{const obj=JSON.parse(match[0]);if(obj.name)partial.push(obj);}catch{}}}
    if(partial.length>0){console.warn('Truncated response — recovered '+partial.length+' items');return{supplier:gf('supplier'),supplierGSTIN:gf('supplierGSTIN'),invoiceNo:gf('invoiceNo'),invoiceDate:gf('invoiceDate'),discountPct:gn('discountPct'),items:partial,_truncated:true};}
    throw new Error('Non-JSON response from Gemini: '+s.slice(0,200));
  };

  const upload=useCallback(async e=>{
    const file=e.target.files[0];if(!file)return;
    const k=gk();if(!k){setErr('Add your Gemini API key in Settings first.');return;}
    const isPDF=file.type==='application/pdf';
    if(file.size>(isPDF?20:10)*1024*1024){setErr('File too large — max '+(isPDF?'20MB for PDFs':'10MB for images')+'.');return;}
    setFileType(file.type);setMarkupPct('');
    const reader=new FileReader();
    reader.onload=async ev=>{
      const b64=ev.target.result.split(',')[1];
      setPreview(isPDF?null:ev.target.result);
      setScanning(true);setErr(null);setScanStatus('');setSupplierBanner(null);
      const PROMPT='You are a JSON extraction API for Indian wholesale clothing invoices.\nExtract EVERY line item.\n\nOUTPUT ONLY RAW JSON — no markdown, no backticks, no code fences.\nStart with { end with }.\n\nFormat:\n{"supplier":"firm name","supplierGSTIN":"GSTIN","invoiceNo":"number","invoiceDate":"date","discountPct":0,"items":[{"articleNo":"","name":"","hsn":"","sizes":"","qty":1,"price":0,"gst":5,"cat":"Others","color":""}]}\n\nRULES:\nARTICLE NO: Indian invoices often write "9925 PANSARI" — leading code is articleNo, rest is name.\nHSN: Extract from HSN/SAC column.\nSIZES: Comma-separated if multiple (M,L,XL). "Free Size" if none shown.\nGST: SGST 2.5%+CGST 2.5%=5, SGST 6%+CGST 6%=12, SGST 9%+CGST 9%=18, SGST 14%+CGST 14%=28. Must be 0/5/12/18/28.\nCATEGORY: Kids/Girls/Men/Women/Jeans/Tops/Jackets/Hosiery/Woollen/Suits/Others.\nDISCOUNT: Put % in discountPct.\nPRICE: Per unit, plain number, no Rs symbol.\nIf unclear: {"supplier":"","supplierGSTIN":"","invoiceNo":"","invoiceDate":"","discountPct":0,"items":[]}';
      const MODELS=['gemini-2.5-flash','gemini-2.5-flash-lite','gemini-1.5-flash-latest'];
      const sleep=ms=>new Promise(res=>setTimeout(res,ms));
      const mimeType=file.type||'image/jpeg';
      let res=null;
      outer:for(const model of MODELS){for(let attempt=1;attempt<=3;attempt++){setScanStatus(model+' — attempt '+attempt+'/3');try{res=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent?key='+k,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{inline_data:{mime_type:mimeType,data:b64}},{text:PROMPT}]}],generationConfig:{temperature:0.1,maxOutputTokens:8192}})});if(res.status===503||res.status===429){const wait=attempt*4000;setScanStatus(model+' busy — waiting '+Math.round(wait/1000)+'s...');await sleep(wait);continue;}if(res.ok){setScanStatus('');break outer;}break;}catch(netErr){if(attempt===3)break;await sleep(2000);}}}
      try{
        if(!res||!res.ok){const errBody=res?await res.text().catch(()=>''):'No response';throw new Error('All models failed. '+errBody.slice(0,200));}
        const d=await res.json();
        if(d.error)throw new Error('Gemini: '+d.error.message);
        if(d.promptFeedback&&d.promptFeedback.blockReason)throw new Error('Blocked: '+d.promptFeedback.blockReason);
        const rawTxt=(d.candidates&&d.candidates[0]&&d.candidates[0].content&&d.candidates[0].content.parts&&d.candidates[0].content.parts[0]&&d.candidates[0].content.parts[0].text)||'';
        if(!rawTxt)throw new Error('Empty response — check your Gemini API key in Settings.');
        const parsed=extractJSON(rawTxt);
        if(parsed._truncated)setErr('Response was cut off — recovered '+parsed.items.length+' items. Check for missing items.');
        if(parsed.supplier||parsed.invoiceNo)setSupplierBanner({supplier:parsed.supplier||'',gstin:parsed.supplierGSTIN||'',invoiceNo:parsed.invoiceNo||'',invoiceDate:parsed.invoiceDate||'',discountPct:+parsed.discountPct||0});
        const VALID_CATS=['Kids','Girls','Men','Women','Jeans','Tops','Jackets','Hosiery','Woollen','Suits','Others'];
        const extracted=(parsed.items||[]).map(i=>({articleNo:String(i.articleNo||'').trim(),name:String(i.name||'Unknown').trim(),hsn:String(i.hsn||'').trim(),sizes:String(i.sizes||i.size||'Free Size').trim(),qty:Math.max(1,+i.qty||1),price:+i.price||0,_costPrice:+i.price||0,gst:[0,5,12,18,28].includes(+i.gst)?+i.gst:5,cat:VALID_CATS.includes(i.cat)?i.cat:'Others',color:String(i.color||'').trim(),qrCount:Math.max(1,+i.qty||1)}));
        if(extracted.length===0)setErr('No items found. Try a clearer photo or add manually below.');
        else setItems(extracted);
      }catch(e){setErr('Could not read invoice: '+e.message);}finally{setScanning(false);setScanStatus('');}
    };reader.readAsDataURL(file);
  },[]);

  const upd=(i,k,v)=>setItems(it=>it.map((x,ix)=>ix===i?{...x,[k]:v}:x));
  const rem=i=>setItems(it=>it.filter((_,ix)=>ix!==i));
  const addMan=()=>{if(!man.name)return;setItems(it=>[...it,{...man,qty:+man.qty,price:+man.price,_costPrice:+man.price,gst:+man.gst,qrCount:+man.qty}]);setMan({articleNo:'',name:'',cat:'Kids',sizes:'Free Size',qty:1,price:'',gst:5,color:'',hsn:''});};
  const addToCatalog=async()=>{let n=0;for(const item of items){const sizes=(item.sizes||'Free Size').split(',').map(s=>s.trim()).filter(Boolean);for(const sz of sizes){const perSize=Math.max(1,Math.round(item.qty/sizes.length));const ex=P.find(p=>item.articleNo?(p.articleNo===item.articleNo&&p.size===sz):(p.name===item.name&&p.size===sz));if(ex){const u=await api.put('/api/products',{id:ex.id,qty:ex.qty+perSize});setP(ps=>ps.map(p=>p.id===ex.id?u:p));}else{const c=await api.post('/api/products',{name:item.name+(sizes.length>1?' ('+sz+')':''),sku:rnd9(),cat:item.cat||'Others',sub:'',size:sz,color:item.color||'',price:+item.price,gst:+item.gst,qty:perSize,hsn:item.hsn||'',articleNo:item.articleNo||''});setP(ps=>[c,...ps]);}n++;}}setItems([]);setSupplierBanner(null);setMarkupPct('');showT(n+' variant'+(n!==1?'s':'')+' added/updated!');setTimeout(()=>onDone(),1500);};

  return<div>
    <div style={S.h2}>Scan Supplier Invoice</div>{toast}
    {!gk()&&<div style={{padding:'10px 16px',borderRadius:8,background:AMBL,color:AMB,fontSize:13,marginBottom:12,fontWeight:500}}>Warning: Add Gemini API key in Settings to enable AI scanning.</div>}
    {supplierBanner&&<div style={{padding:'10px 16px',borderRadius:8,background:GRL,color:GR,fontSize:12,marginBottom:12,border:'0.5px solid #a0c890',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10}}>
      <div>
        <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>Invoice read successfully</div>
        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
          {supplierBanner.supplier&&<span>Supplier: <strong>{supplierBanner.supplier}</strong></span>}
          {supplierBanner.gstin&&<span>GSTIN: <strong>{supplierBanner.gstin}</strong></span>}
          {supplierBanner.invoiceNo&&<span>Invoice <strong>#{supplierBanner.invoiceNo}</strong></span>}
          {supplierBanner.invoiceDate&&<span>Date: <strong>{supplierBanner.invoiceDate}</strong></span>}
          {supplierBanner.discountPct>0&&<span style={{background:AMBL,color:AMB,padding:'1px 8px',borderRadius:10,fontWeight:700}}>Discount: {supplierBanner.discountPct}%</span>}
        </div>
      </div>
      <button onClick={()=>setSupplierBanner(null)} style={{background:'none',border:'none',cursor:'pointer',color:GR,fontSize:16}}>x</button>
    </div>}
    <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'1fr 1fr',gap:16}}>
      <div>
        <div style={{...S.card,marginBottom:14}}>
          <div style={S.h3}>Upload Supplier Invoice</div>
          <label style={{border:'1.5px dashed '+BORD,borderRadius:10,padding:'22px 16px',textAlign:'center',cursor:'pointer',background:BG,display:'block'}}>
            <input type='file' accept='image/jpeg,image/png,image/webp,image/heic,application/pdf' style={{display:'none'}} onChange={upload}/>
            <div style={{fontSize:36,marginBottom:6}}>?</div>
            <div style={{fontWeight:700,fontSize:14,marginBottom:8}}>Tap to upload invoice</div>
            <div style={{display:'flex',gap:6,justifyContent:'center',flexWrap:'wrap',marginBottom:6}}>
              {[['JPG/PNG',BL,BLL],['PDF',RD,RDL],['WEBP/HEIC',GR,GRL]].map(([l,c,bg])=><span key={l} style={{background:bg,color:c,padding:'2px 9px',borderRadius:12,fontSize:11,fontWeight:600}}>{l}</span>)}
            </div>
            <div style={{fontSize:11,color:MUT}}>Gemini AI reads article numbers, quantities, sizes, HSN codes</div>
          </label>
          {preview&&<img src={preview} alt='Invoice preview' style={{width:'100%',maxHeight:220,objectFit:'contain',borderRadius:8,marginTop:12,border:'0.5px solid '+BORD}}/>}
          {!preview&&fileType==='application/pdf'&&!scanning&&<div style={{marginTop:10,padding:'9px 12px',background:RDL,borderRadius:8,fontSize:12,color:RD}}>PDF uploaded</div>}
          {scanning&&<div style={{display:'flex',flexDirection:'column',gap:4,marginTop:12,padding:'10px 14px',background:BLL,borderRadius:8,color:BL,fontSize:13}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}><Spin/>Reading invoice...</div>
            {scanStatus&&<div style={{fontSize:11,opacity:.7,paddingLeft:22}}>{scanStatus}</div>}
          </div>}
          {err&&!scanning&&<div style={{padding:'10px 14px',borderRadius:8,background:RDL,color:RD,fontSize:12,marginTop:10,lineHeight:1.5}}><strong>Error:</strong> {err}</div>}
        </div>
        {/* ── MARKUP PANEL ── */}
        {items.length>0&&<div style={{...S.card,marginBottom:14,border:'0.5px solid '+AMB+'60',background:AMBL+'60'}}>
          <div style={S.h3}>Set Selling Price Markup (optional)</div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
            <div style={{flex:1}}>
              <label style={S.lbl}>Global Markup % (applied to all items)</label>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input style={{...S.inp,maxWidth:100,textAlign:'center',fontFamily:'DM Mono,monospace',fontWeight:700}} type='number' min='0' max='200' value={markupPct} onChange={e=>handleMarkupChange(e.target.value)} placeholder='0'/>
                <span style={{fontSize:13,color:MUT}}>%</span>
                {markupPct&&<button style={{...S.btn('def',true)}} onClick={()=>handleMarkupChange('')}>Clear</button>}
              </div>
            </div>
            <div style={{fontSize:11,color:AMB,lineHeight:1.6}}>
              Example with {markupPct||10}% markup:<br/>
              Rs.500 cost → Rs.{Math.round(500*(1+(+(markupPct||10))/100))} selling<br/>
              Rs.600 cost → Rs.{Math.round(600*(1+(+(markupPct||10))/100))} selling
            </div>
          </div>
          <div style={{fontSize:11,color:AMB}}>Tip: Cost prices shown in grey. Markup prices will be saved to catalog as selling price.</div>
        </div>}
        <div style={S.card}>
          <div style={S.h3}>Add Line Item Manually</div>
          <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'1fr 1fr',gap:8,marginBottom:10}}>
            <Fld label='Article No'><input style={S.inp} value={man.articleNo} onChange={e=>setMan(m=>({...m,articleNo:e.target.value}))} placeholder='9925'/></Fld>
            <Fld label='Product Name *'><input style={S.inp} value={man.name} onChange={e=>setMan(m=>({...m,name:e.target.value}))} placeholder='PANSARI'/></Fld>
            <Fld label='Category'><select style={S.inp} value={man.cat} onChange={e=>setMan(m=>({...m,cat:e.target.value}))}>{CATS.filter(c=>c!=='All').map(c=><option key={c}>{c}</option>)}</select></Fld>
            <Fld label='Sizes'><input style={S.inp} value={man.sizes} onChange={e=>setMan(m=>({...m,sizes:e.target.value}))} placeholder='Free Size, M,L,XL, 30,32,34'/></Fld>
            <Fld label='Total Qty'><input style={S.inp} type='number' min='1' value={man.qty} onChange={e=>setMan(m=>({...m,qty:e.target.value}))}/></Fld>
            <Fld label='Price per unit'><input style={S.inp} type='number' value={man.price} onChange={e=>setMan(m=>({...m,price:e.target.value}))} placeholder='0.00'/></Fld>
            <Fld label='GST %'><select style={S.inp} value={man.gst} onChange={e=>setMan(m=>({...m,gst:+e.target.value}))}>{GST_RATES.map(r=><option key={r} value={r}>{r}%</option>)}</select></Fld>
            <Fld label='HSN'><input style={S.inp} value={man.hsn} onChange={e=>setMan(m=>({...m,hsn:e.target.value}))} placeholder='6203'/></Fld>
            <Fld label='Color' span2><input style={S.inp} value={man.color} onChange={e=>setMan(m=>({...m,color:e.target.value}))} placeholder='Red, Blue... (optional)'/></Fld>
          </div>
          <button style={S.btn('gho')} onClick={addMan}>+ Add to Extracted List</button>
        </div>
      </div>
      <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={S.h3}>Extracted Items</div>
            <Bdg c='blue'>{items.length}</Bdg>
            {items.length>0&&<span style={{fontSize:11,color:MUT}}>({items.reduce((s,i)=>s+i.qty,0)} pcs)</span>}
          </div>
          {items.length>0&&<div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
            <button style={S.btn('pur')} onClick={onLabels}>QR Labels</button>
            <button style={S.btn('suc')} onClick={addToCatalog}>Add to Catalog</button>
            <button style={{...S.btn('dan',true),fontSize:11}} onClick={()=>{setItems([]);setSupplierBanner(null);setMarkupPct('');}}>Clear</button>
          </div>}
        </div>
        {items.length===0?<MT msg='Upload a supplier invoice above, or add items manually.'/> :<div style={{maxHeight:600,overflowY:'auto',display:'flex',flexDirection:'column',gap:8}}>
          {items.map((item,i)=><div key={i} style={{padding:'10px 12px',borderRadius:8,border:'0.5px solid '+BORD,background:'#fafaf8'}}>
            <div style={{display:'grid',gridTemplateColumns:'90px 1fr',gap:6,marginBottom:6}}>
              <div><label style={S.lbl}>Article No</label><input style={{...S.inp,fontSize:12,fontFamily:'DM Mono,monospace',fontWeight:700,color:BL}} value={item.articleNo||''} onChange={e=>upd(i,'articleNo',e.target.value)} placeholder='code'/></div>
              <div><label style={S.lbl}>Product Name</label><input style={{...S.inp,fontSize:12,fontWeight:600}} value={item.name} onChange={e=>upd(i,'name',e.target.value)}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 55px 80px 70px',gap:6,marginBottom:6}}>
              <div><label style={S.lbl}>Sizes</label><input style={{...S.inp,fontSize:12}} value={item.sizes||''} onChange={e=>upd(i,'sizes',e.target.value)} placeholder='M,L,XL or Free Size'/></div>
              <div><label style={S.lbl}>Qty</label><input style={{...S.inp,fontSize:12,textAlign:'right'}} type='number' min='1' value={item.qty} onChange={e=>upd(i,'qty',+e.target.value)}/></div>
              <div><label style={S.lbl}>{markupPct?'Sell Price':'Price'}</label>
                <div style={{position:'relative'}}>
                  <input style={{...S.inp,fontSize:12,textAlign:'right',fontFamily:'DM Mono,monospace',background:markupPct?'#fff9f0':undefined}} type='number' value={item.price} onChange={e=>upd(i,'price',+e.target.value)}/>
                  {markupPct&&item._costPrice&&<div style={{fontSize:9,color:MUT,textAlign:'right',marginTop:1}}>cost: {fmt(item._costPrice)}</div>}
                </div>
              </div>
              <div><label style={S.lbl}>QR Labels</label><input style={{...S.inp,fontSize:12,textAlign:'right'}} type='number' min='1' value={item.qrCount||item.qty} onChange={e=>upd(i,'qrCount',+e.target.value)}/></div>
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:5}}>
              <div style={{display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}}>
                <select style={{...S.inp,width:'auto',fontSize:11,padding:'2px 6px'}} value={item.cat||'Others'} onChange={e=>upd(i,'cat',e.target.value)}>{CATS.filter(c=>c!=='All').map(c=><option key={c}>{c}</option>)}</select>
                <select style={{...S.inp,width:70,fontSize:11,padding:'2px 6px'}} value={item.gst} onChange={e=>upd(i,'gst',+e.target.value)}>{GST_RATES.map(r=><option key={r} value={r}>{r}%</option>)}</select>
                {(item.sizes||'').split(',').filter(s=>s.trim()).map(s=><Bdg key={s} c='gray'>{s.trim()}</Bdg>)}
                <Bdg c={markupPct?'amber':'gray'}>{fmt(item.price)}</Bdg>
                {item.hsn&&<span style={{...S.mono,fontSize:9,color:MUT,background:'#f0ede8',padding:'1px 5px',borderRadius:4}}>HSN {item.hsn}</span>}
              </div>
              <button onClick={()=>rem(i)} style={{background:'none',border:'none',cursor:'pointer',color:'#ccc',fontSize:18}}>x</button>
            </div>
          </div>)}
        </div>}
        {items.length>0&&<div style={{marginTop:12,padding:'10px 14px',background:BLL,borderRadius:8,fontSize:12,color:BL,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
          <span><strong>{items.length}</strong> articles · <strong>{items.reduce((s,i)=>s+i.qty,0)}</strong> pcs{markupPct?<span style={{color:AMB,marginLeft:8}}>· {markupPct}% markup applied</span>:null}</span>
          <button style={S.btn('suc')} onClick={addToCatalog}>Add All to Catalog</button>
        </div>}
      </div>
    </div>
  </div>;}

/* ── QR LABELS ── */
function QRLabels({P,mob}){
  const[items,setItems]=useState([]);const[supplier,setSupplier]=useState({name:'',date:new Date().toISOString().split('T')[0]});const[toast,showT]=useToast();
  const allLabels=items.flatMap(item=>{const sizes=(item.sizes||'Free Size').split(',').map(s=>s.trim()).filter(Boolean);const cps=Math.max(1,Math.round((+item.qrCount||1)/Math.max(1,sizes.length)));return sizes.flatMap(sz=>Array.from({length:cps},()=>({bc:rnd9(),articleNo:item.articleNo||'',name:item.name,size:sz,cat:item.cat||''})));});
  const addItem=()=>setItems(it=>[...it,{articleNo:'',name:'',sizes:'Free Size',qrCount:1,cat:'Others'}]);
  const upd=(i,k,v)=>setItems(it=>it.map((x,ix)=>ix===i?{...x,[k]:v}:x));
  const rem=i=>setItems(it=>it.filter((_,ix)=>ix!==i));
  const addFromCatalog=p=>setItems(it=>[...it,{articleNo:p.articleNo||'',name:p.name,sizes:p.size,qrCount:1,cat:p.cat}]);
  const printLabels=()=>{const w=window.open('','_blank');w.document.write('<html><head><title>QR Labels</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif}.page{padding:8mm}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm}.label{border:0.5px solid #999;border-radius:3mm;padding:3mm;display:flex;flex-direction:column;align-items:center;gap:2mm;page-break-inside:avoid}.bc{font-family:monospace;font-size:8pt;font-weight:700;letter-spacing:1px;text-align:center}.art{font-size:8pt;font-weight:700;color:#1B5E8A;text-align:center}.sz{font-size:9pt;font-weight:800;background:#E3EFF8;color:#1B5E8A;padding:1mm 3mm;border-radius:3mm}.nm{font-size:7pt;color:#555;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}@media print{@page{margin:6mm}}</style></head><body><div class="page">');if(supplier.name)w.document.write('<div style="margin-bottom:6mm;font-size:10pt;color:#888">Supplier: <b>'+supplier.name+'</b> | Date: '+supplier.date+' | Labels: '+allLabels.length+'</div>');w.document.write('<div class="grid">');allLabels.forEach(lb=>{const qd=encodeURIComponent('ART:'+lb.articleNo+'|SIZE:'+lb.size+'|BC:'+lb.bc);w.document.write('<div class="label"><img src="https://api.qrserver.com/v1/create-qr-code/?data='+qd+'&size=70x70&margin=1" width="70" height="70"/><div class="bc">'+lb.bc+'</div>'+(lb.articleNo?'<div class="art">Art: '+lb.articleNo+'</div>':'')+'<div class="sz">'+lb.size+'</div><div class="nm">'+lb.name+'</div></div>');});w.document.write('</div></body></html>');w.document.close();w.print();showT(allLabels.length+' labels sent to printer!');};
  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
      <div><div style={S.h2}>QR Label Printer</div><div style={{fontSize:12,color:MUT}}>Print scannable QR labels — use on sticky label paper</div></div>
      {allLabels.length>0&&<button style={S.btn('pri')} onClick={printLabels}>Print {allLabels.length} Labels</button>}
    </div>{toast}
    <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'1fr 1fr',gap:14}}>
      <div>
        <div style={{...S.card,marginBottom:12}}>
          <div style={S.h3}>Supplier Info (optional)</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <Fld label='Supplier Name'><input style={S.inp} value={supplier.name} onChange={e=>setSupplier(s=>({...s,name:e.target.value}))} placeholder='XYZ Creations'/></Fld>
            <Fld label='Invoice Date'><input style={S.inp} type='date' value={supplier.date} onChange={e=>setSupplier(s=>({...s,date:e.target.value}))}/></Fld>
          </div>
        </div>
        <div style={S.card}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div style={S.h3}>Articles</div>
            <button style={S.btn('gho')} onClick={addItem}>+ Add Article</button>
          </div>
          {items.length===0&&<MT msg='Add articles or pick from catalog'/>}
          {items.map((item,i)=><div key={i} style={{border:'0.5px solid '+BORD,borderRadius:8,padding:'10px 12px',marginBottom:8,background:BG}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:6}}>
              <Fld label='Article No'><input style={S.inp} value={item.articleNo} onChange={e=>upd(i,'articleNo',e.target.value)} placeholder='abc123'/></Fld>
              <Fld label='Product Name'><input style={S.inp} value={item.name} onChange={e=>upd(i,'name',e.target.value)} placeholder='Top Red Kid'/></Fld>
              <Fld label='Sizes (comma separated)'><input style={S.inp} value={item.sizes} onChange={e=>upd(i,'sizes',e.target.value)} placeholder='M,L,XL'/></Fld>
              <Fld label='QR Labels to Print'><input style={S.inp} type='number' min='1' value={item.qrCount} onChange={e=>upd(i,'qrCount',+e.target.value)}/></Fld>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontSize:11,color:MUT}}>{(item.sizes||'Free Size').split(',').filter(Boolean).length} size(s) = ~{allLabels.filter(l=>l.name===item.name).length} labels</div>
              <button onClick={()=>rem(i)} style={{...S.btn('dan',true),fontSize:10}}>Remove</button>
            </div>
          </div>)}
          {items.length>0&&<div style={{marginTop:10,padding:'10px 14px',background:BLL,borderRadius:8,fontSize:13,color:BL,fontWeight:600}}>Total: {allLabels.length} labels</div>}
        </div>
      </div>
      <div>
        <div style={S.card}>
          <div style={S.h3}>Pick from Catalog</div>
          <div style={{maxHeight:380,overflowY:'auto',display:'flex',flexDirection:'column',gap:6}}>
            {P.slice(0,30).map(p=><div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',border:'0.5px solid '+BORD,borderRadius:7}}>
              <div><div style={{fontWeight:600,fontSize:12}}>{p.name}</div><div style={{fontSize:10,color:MUT}}>{p.cat} · {p.size}{p.articleNo?' · '+p.articleNo:''}</div></div>
              <button style={S.btn('gho',true)} onClick={()=>addFromCatalog(p)}>+ Add</button>
            </div>)}
          </div>
        </div>
        {allLabels.length>0&&<div style={{...S.card,marginTop:14}}>
          <div style={S.h3}>Label Preview (first 8)</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
            {allLabels.slice(0,8).map((lb,i)=><div key={i} style={{border:'0.5px solid '+BORD,borderRadius:6,padding:'8px 6px',textAlign:'center'}}>
              <img src={qrU('ART:'+lb.articleNo+'|SIZE:'+lb.size+'|BC:'+lb.bc,60)} width={60} height={60} style={{display:'block',margin:'0 auto 4px'}} alt='QR'/>
              <div style={{...S.mono,fontSize:9,fontWeight:700}}>{lb.bc}</div>
              {lb.articleNo&&<div style={{fontSize:9,color:BL,fontWeight:700}}>Art: {lb.articleNo}</div>}
              <div style={{fontSize:9,fontWeight:800,background:BLL,color:BL,borderRadius:3,padding:'1px 4px',marginTop:2,display:'inline-block'}}>{lb.size}</div>
              <div style={{fontSize:8,color:MUT,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lb.name}</div>
            </div>)}
          </div>
          {allLabels.length>8&&<div style={{textAlign:'center',fontSize:11,color:MUT,marginTop:8}}>+{allLabels.length-8} more labels will print</div>}
        </div>}
      </div>
    </div>
  </div>;}

/* ── POS ── */
function POS({P,setP,C,setC,B,setB,firm,nextInv,mob,onDone}){
  const[step,setStep]=useState('cust');const[sel,setSel]=useState(null);const[isRel,setIsRel]=useState(false);const[rn,setRn]=useState('');const[ri,setRi]=useState('');
  const[cForm,setCF]=useState({name:'',phone:'',shopname:'',gst:'',addr:'',email:''});
  const[cart,setCart]=useState([]);const[bc,setBc]=useState('');const[catF,setCatF]=useState('All');const[cSrch,setCS]=useState('');const[gstMode,setGM]=useState('excl');const[custSrch,setCuS]=useState('');const[disc,setDisc]=useState('');
  const[transportName,setTransportName]=useState('');const[lrNumber,setLrNumber]=useState('');
  const[submitting,setSub]=useState(false);const[toast,showT]=useToast();const bcRef=useRef(null);
  const addBC=code=>{const s=code.trim();if(!s)return;const p=P.find(x=>x.sku===s||x.articleNo===s);if(!p){showT('Not found: '+s,'err');return}if(p.qty===0){showT(p.name+' out of stock!','err');return}setCart(c=>{const ex=c.find(x=>x.id===p.id);if(ex)return ex.qty<p.qty?c.map(x=>x.id===p.id?{...x,qty:x.qty+1}:x):c;return[...c,{id:p.id,qty:1}]});setBc('');showT('Added: '+p.name);};
  const addG=p=>{if(p.qty===0){showT(p.name+' out of stock','err');return}setCart(c=>{const ex=c.find(x=>x.id===p.id);if(ex)return ex.qty<p.qty?c.map(x=>x.id===p.id?{...x,qty:x.qty+1}:x):c;return[...c,{id:p.id,qty:1}]});};
  const uQty=(id,d)=>setCart(c=>c.map(x=>x.id===id?{...x,qty:x.qty+d}:x).filter(x=>x.qty>0));
  const calc=()=>{let sub=0,gt=0;cart.forEach(c=>{const p=P.find(x=>x.id===c.id);if(!p)return;const base=gstMode==='incl'?p.price/(1+p.gst/100):p.price;sub+=base*c.qty;gt+=base*(p.gst/100)*c.qty;});const discAmt=+disc||0;if(isRel){const mk=sub*0.1;return{sub,gt:0,mk,disc:0,total:sub+mk};}return{sub,gt,mk:0,disc:discAmt,total:sub+gt-discAmt};};
  const saveCust=async()=>{if(!cForm.name||!cForm.phone){showT('Name & phone required','err');return}const nc=await api.post('/api/customers',cForm);setC(cs=>[nc,...cs]);setSel(nc);setCF({name:'',phone:'',shopname:'',gst:'',addr:'',email:''});setStep('items');setTimeout(()=>bcRef.current?.focus(),200);};
  const genBill=async()=>{const cName=isRel?rn||'Walk-in':sel?.name;if(!cName){showT('Enter name','err');return}if(cart.length===0){showT('Cart empty','err');return}setSub(true);
    const{sub,gt,mk,disc:discAmt,total}=calc();const inv=nextInv();
    const items=cart.map(c=>{const p=P.find(x=>x.id===c.id);const base=gstMode==='incl'?p.price/(1+p.gst/100):p.price;const ga=isRel?0:base*(p.gst/100)*c.qty;return{name:p.name,sku:p.sku,cat:p.cat,size:p.size,color:p.color||'',articleNo:p.articleNo||'',qty:c.qty,rate:base,gstRate:isRel?0:p.gst,gstAmt:ga,total:isRel?base*c.qty:base*(1+p.gst/100)*c.qty};});
    try{const r=await api.post('/api/bills',{invoiceNo:inv,customerId:sel?.id||null,customerName:cName,customerPhone:isRel?'':sel?.phone||'',customerGST:isRel?'':sel?.gst||'',customerEmail:sel?.email||'',customerAddr:sel?.addr||ri,isRelative:isRel,items,subtotal:sub,discount:discAmt,gst:gt,markup:mk,total,transportName,lrNumber});
    const fp=await api.get('/api/products');setP(Array.isArray(fp)?fp:[]);
    const bill={id:r.id,invoiceNo:inv,date:new Date().toISOString(),customerId:sel?.id||null,customerName:cName,customerPhone:isRel?'':sel?.phone||'',customerGST:isRel?'':sel?.gst||'',customerEmail:sel?.email||'',customerAddr:sel?.addr||ri,isRelative:isRel,items,subtotal:sub,discount:discAmt,gst:gt,markup:mk,total,biltyNo:'',transportName,lrNumber};
    setB(bs=>[bill,...bs]);setCart([]);setSel(null);setStep('cust');setIsRel(false);setRn('');setRi('');setDisc('');setTransportName('');setLrNumber('');onDone(bill);}catch(e){showT('Failed: '+e.message,'err')}finally{setSub(false)}};
  const{sub,gt,mk,disc:discAmt,total}=calc();
  const fG=P.filter(p=>p.qty>0&&(catF==='All'||p.cat===catF)&&(p.name.toLowerCase().includes(cSrch.toLowerCase())||p.sku.includes(cSrch)||(p.articleNo||'').includes(cSrch)));
  const fC=C.filter(c=>(c.name+' '+c.phone+' '+(c.shopname||'')).toLowerCase().includes(custSrch.toLowerCase()));
  const steps=[['cust','1','Customer'],['items','2','Add Items'],['checkout','3','Checkout']];const cur=steps.findIndex(([s])=>s===step);
  const Cart=()=><div style={{...S.card,display:'flex',flexDirection:'column',padding:0,...(!mob?{position:'sticky',top:65,alignSelf:'start'}:{})}}>
    <div style={{padding:'10px 14px',borderBottom:'0.5px solid '+BORD,fontWeight:700,fontSize:13,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <span>Cart ({cart.reduce((s,c)=>s+c.qty,0)} pcs)</span>
      <select style={{...S.inp,width:130,fontSize:11,padding:'3px 8px'}} value={gstMode} onChange={e=>setGM(e.target.value)}><option value='excl'>Price excl. GST</option><option value='incl'>Price incl. GST</option></select>
    </div>
    <div style={{overflowY:'auto',maxHeight:mob?200:300}}>
      {cart.length===0?<MT msg='Scan barcode or tap product'/>:cart.map(c=>{const p=P.find(x=>x.id===c.id);if(!p)return null;const base=gstMode==='incl'?p.price/(1+p.gst/100):p.price;const line=isRel?base*c.qty:base*(1+p.gst/100)*c.qty;return<div key={c.id} style={{padding:'7px 12px',borderBottom:'0.5px solid #f0ede8',fontSize:12}}>
        <div style={{fontWeight:600,marginBottom:2}}>{p.name}</div>
        <div style={{fontSize:10,color:MUT,marginBottom:3}}>{p.cat}·{p.size}{p.articleNo?' · '+p.articleNo:''}</div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:4}}><button onClick={()=>uQty(c.id,-1)} style={{width:22,height:22,border:'0.5px solid '+BORD,borderRadius:4,background:'none',cursor:'pointer'}}>-</button><span style={{minWidth:24,textAlign:'center',fontWeight:700}}>{c.qty}</span><button onClick={()=>uQty(c.id,1)} style={{width:22,height:22,border:'0.5px solid '+BORD,borderRadius:4,background:'none',cursor:'pointer'}}>+</button></div>
          <span style={{...S.mono,color:BL,fontWeight:700}}>{fmt(line)}</span>
        </div></div>;})}
    </div>
    <div style={{padding:'10px 14px',borderTop:'0.5px solid '+BORD}}>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:MUT,marginBottom:2}}><span>Subtotal</span><span style={S.mono}>{fmt(sub)}</span></div>
      {isRel?<div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:AMB,marginBottom:2}}><span>Misc. Charges</span><span style={S.mono}>{fmt(mk)}</span></div>:<div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:BL,marginBottom:2}}><span>GST</span><span style={S.mono}>{fmt(gt)}</span></div>}
      {!isRel&&<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}><span style={{fontSize:11,color:MUT,whiteSpace:'nowrap'}}>Discount Rs.</span><input style={{...S.inp,padding:'3px 7px',fontSize:12,flex:1}} type='number' value={disc} onChange={e=>setDisc(e.target.value)} placeholder='0'/></div>}
      {discAmt>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:GR,marginBottom:2}}><span>- Discount</span><span style={S.mono}>-{fmt(discAmt)}</span></div>}
      <div style={{display:'flex',justifyContent:'space-between',fontSize:15,fontWeight:800,paddingTop:6,borderTop:'0.5px solid '+BORD}}><span>Grand Total</span><span style={{...S.mono,color:GR,fontSize:16}}>{fmt(total)}</span></div>
      {step==='items'&&<button style={{...S.btn('pri'),width:'100%',justifyContent:'center',marginTop:10,padding:'9px'}} onClick={()=>cart.length?setStep('checkout'):null}>Proceed to Checkout</button>}
      {step==='checkout'&&<button style={{...S.btn('pri'),width:'100%',justifyContent:'center',marginTop:10,padding:'10px',fontSize:14}} onClick={genBill} disabled={submitting}>{submitting?'Generating...':'Generate Bill'}</button>}
      {cart.length>0&&<button style={{...S.btn('dan'),width:'100%',justifyContent:'center',marginTop:6}} onClick={()=>setCart([])}>Clear Cart</button>}
    </div></div>;

  return<div>
    <div style={{...S.card,padding:'10px 18px',marginBottom:12,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
      {steps.map(([s,n,l],i)=><><div key={s} style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:24,height:24,borderRadius:'50%',background:i<=cur?BL:'#eee',color:i<=cur?'#fff':MUT,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800}}>{n}</div><span style={{fontSize:12,fontWeight:i===cur?700:500,color:i===cur?BL:MUT}}>{l}</span></div>{i<2&&<div key={'d'+i} style={{flex:1,height:'0.5px',background:i<cur?BL:BORD,minWidth:10}}/>}</>)}
      {(sel||isRel)&&<div style={{marginLeft:'auto',padding:'3px 10px',background:isRel?AMBL:BLL,borderRadius:6,fontSize:11,color:isRel?AMB:BL,fontWeight:600}}>{isRel?'Walk-in '+(rn||''):sel?.name}</div>}
    </div>{toast}
    {step==='cust'&&<div style={{display:'grid',gridTemplateColumns:mob?'1fr':'1fr 1fr',gap:14}}>
      <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><div style={S.h2}>Select Customer</div><button onClick={()=>{setIsRel(r=>!r);setSel(null)}} style={S.btn(isRel?'amb':'def',true)}>{isRel?'Relative/Walk-in (active)':'Relative/Walk-in'}</button></div>
        {isRel?<div style={{background:AMBL,borderRadius:8,padding:14,border:'0.5px solid #e0b860'}}>
          <div style={{fontWeight:700,color:AMB,marginBottom:10}}>Relative / Walk-in — No GST. 10% misc. charges added silently.</div>
          <Fld label='Name'><input style={S.inp} value={rn} onChange={e=>setRn(e.target.value)} placeholder='Name (optional)'/></Fld>
          <Fld label='Info'><input style={S.inp} value={ri} onChange={e=>setRi(e.target.value)} placeholder='City, relation...'/></Fld>
          <button style={{...S.btn('amb'),marginTop:10}} onClick={()=>{setStep('items');setTimeout(()=>bcRef.current?.focus(),200)}}>Proceed to Items</button>
        </div>:<>
          <input style={{...S.inp,marginBottom:10}} placeholder='Search...' value={custSrch} onChange={e=>setCuS(e.target.value)}/>
          {C.length===0?<MT msg='No customers. Add one on the right.'/>:<div style={{maxHeight:300,overflowY:'auto',display:'flex',flexDirection:'column',gap:6}}>{fC.map(c=><div key={c.id} onClick={()=>{setSel(c);setStep('items');setTimeout(()=>bcRef.current?.focus(),200)}} style={{padding:'10px 14px',border:'0.5px solid '+(sel?.id===c.id?BL:BORD),borderRadius:8,cursor:'pointer',background:sel?.id===c.id?BLL:'#fff'}}><div style={{fontWeight:700}}>{c.name}</div><div style={{fontSize:12,color:MUT}}>{c.phone}{c.shopname?' · '+c.shopname:''}</div>{c.gst&&<div style={{...S.mono,fontSize:10,color:BL}}>GSTIN: {c.gst}</div>}</div>)}</div>}
        </>}
      </div>
      <div style={S.card}><div style={S.h2}>Add New Customer</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
          <Fld label='Name *'><input style={S.inp} value={cForm.name} onChange={e=>setCF(f=>({...f,name:e.target.value}))} placeholder='Full name'/></Fld>
          <Fld label='Mobile *'><input style={S.inp} value={cForm.phone} onChange={e=>setCF(f=>({...f,phone:e.target.value}))} placeholder='Mobile'/></Fld>
          <Fld label='Shop Name'><input style={S.inp} value={cForm.shopname} onChange={e=>setCF(f=>({...f,shopname:e.target.value}))} placeholder='Business'/></Fld>
          <Fld label='GSTIN'><input style={S.inp} value={cForm.gst} onChange={e=>setCF(f=>({...f,gst:e.target.value}))} placeholder='GST no.'/></Fld>
          <Fld label='Email'><input style={S.inp} value={cForm.email} onChange={e=>setCF(f=>({...f,email:e.target.value}))} placeholder='email@example.com'/></Fld>
          <Fld label='City/Area'><input style={S.inp} value={cForm.addr} onChange={e=>setCF(f=>({...f,addr:e.target.value}))} placeholder='City'/></Fld>
        </div>
        <button style={S.btn('pri')} onClick={saveCust}>Save & Proceed</button>
      </div>
    </div>}
    {step==='items'&&<div style={{display:'grid',gridTemplateColumns:mob?'1fr':'1fr 300px',gap:14}}>
      <div>
        <div style={{...S.card,marginBottom:10}}>
          <div style={S.h3}>Scan Barcode / Article Number</div>
          <div style={{display:'flex',gap:8}}><input ref={bcRef} style={{...S.inp,fontFamily:'DM Mono,monospace',fontSize:14,letterSpacing:'2px',flex:1}} value={bc} onChange={e=>setBc(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&bc.trim()){addBC(bc);e.target.focus()}}} placeholder='Scan barcode or article no, Enter' autoFocus/><button style={S.btn('pri')} onClick={()=>bc.trim()&&addBC(bc)}>Add</button></div>
        </div>
        <div style={{...S.card,padding:0}}>
          <div style={{padding:'10px 14px 6px',borderBottom:'0.5px solid '+BORD}}><CatTabs value={catF} onChange={setCatF}/><input style={{...S.inp,fontSize:12}} placeholder='Search catalog...' value={cSrch} onChange={e=>setCS(e.target.value)}/></div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:10,padding:12,maxHeight:mob?250:380,overflowY:'auto'}}>
            {fG.length===0&&<div style={{gridColumn:'1/-1',textAlign:'center',padding:20,color:MUT,fontSize:12}}>No in-stock items</div>}
            {fG.map(p=><div key={p.id} onClick={()=>addG(p)} style={{border:'0.5px solid '+BORD,borderRadius:8,padding:'10px',cursor:'pointer',background:'#fff'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}><Bdg c='blue'>{p.cat}</Bdg><Bdg c='gray'>{p.size}</Bdg></div>
              <div style={{fontSize:12,fontWeight:700,lineHeight:1.3,marginBottom:2}}>{p.name}</div>
              {p.articleNo&&<div style={{fontSize:9,color:BL,...S.mono,marginBottom:2}}>Art: {p.articleNo}</div>}
              <div style={{fontSize:13,fontWeight:800,color:AMB,...S.mono}}>{fmt(p.price)}</div>
              <div style={{fontSize:9,color:MUT,marginTop:1}}>{p.qty} pcs left</div>
            </div>)}
          </div>
        </div>
      </div><Cart/>
    </div>}
    {step==='checkout'&&<div style={{display:'grid',gridTemplateColumns:mob?'1fr':'1fr 300px',gap:14}}>
      <div style={S.card}><div style={S.h2}>Order Summary</div>
        {isRel?<div style={{padding:'8px 12px',background:AMBL,borderRadius:8,marginBottom:12}}><div style={{fontWeight:700,color:AMB}}>Walk-in: {rn||'(unnamed)'}</div>{ri&&<div style={{fontSize:11,color:MUT}}>{ri}</div>}</div>:sel&&<div style={{padding:'8px 12px',background:BLL,borderRadius:8,marginBottom:12}}><div style={{fontWeight:700}}>{sel.name}</div><div style={{fontSize:12,color:BL}}>{sel.phone}{sel.shopname?' · '+sel.shopname:''}</div>{sel.gst&&<div style={{...S.mono,fontSize:10}}>GSTIN: {sel.gst}</div>}</div>}
        <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:400}}><thead><tr>{['Product','Size','Qty','Rate',!isRel&&'GST%','Total'].filter(Boolean).map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>{cart.map(c=>{const p=P.find(x=>x.id===c.id);if(!p)return null;const base=gstMode==='incl'?p.price/(1+p.gst/100):p.price;const line=isRel?base*c.qty:base*(1+p.gst/100)*c.qty;return<tr key={c.id}><td style={S.td}><div style={{fontWeight:600}}>{p.name}</div>{p.articleNo&&<div style={{fontSize:9,color:BL,...S.mono}}>Art: {p.articleNo}</div>}</td><td style={S.td}><Bdg c='gray'>{p.size}</Bdg></td><td style={{...S.td,...S.mono,fontWeight:700}}>{c.qty}</td><td style={{...S.td,...S.mono}}>{fmt(base)}</td>{!isRel&&<td style={S.td}><Bdg c='blue'>{p.gst}%</Bdg></td>}<td style={{...S.td,...S.mono,fontWeight:800,color:GR}}>{fmt(line)}</td></tr>;})}
        </tbody></table></div>
        <div style={{marginTop:14,padding:'12px 14px',background:BG,borderRadius:8,border:'0.5px solid '+BORD}}>
          <div style={S.h3}>Transport Details (Optional)</div>
          <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'1fr 1fr',gap:10}}>
            <div><label style={S.lbl}>Transport / Courier Name</label><input style={S.inp} value={transportName} onChange={e=>setTransportName(e.target.value)} placeholder='DTDC, Blue Dart, Gati...'/></div>
            <div><label style={S.lbl}>LR / Docket Number</label><input style={{...S.inp,fontFamily:'DM Mono,monospace'}} value={lrNumber} onChange={e=>setLrNumber(e.target.value)} placeholder='987654321'/></div>
          </div>
          <div style={{fontSize:11,color:MUT,marginTop:6}}>Can also be added/edited later from Bills page.</div>
        </div>
        <button style={{...S.btn('def'),marginTop:10}} onClick={()=>setStep('items')}>Back</button>
      </div><Cart/>
    </div>}
  </div>;}

/* ── PAYMENT MODAL ── */
function PayModal({bill,onSave,onClose}){
  const td=new Date().toISOString().split('T')[0];
  const[f,setF]=useState({mode:'Cash',amount:bill?String(bill.total):'',date:td,partyName:bill?.customerName||'',city:'',remarks:'',upiApp:'PhonePe',upiRef:'',chequeNo:'',bank:'',receivedDate:td,chequeDate:td,clearanceDate:'',areaName:'',chequeStatus:'deposited'});
  const up=k=>v=>setF(x=>({...x,[k]:v}));
  const words=f.amount?n2w(parseFloat(f.amount)||0):'';
  const save=async()=>{if(!f.amount){alert('Amount required');return}
    const p={billId:bill?.id||null,mode:f.mode,amount:parseFloat(f.amount),date:f.date,partyName:f.partyName,city:f.city,remarks:f.remarks,upiApp:f.mode==='Online (UPI)'?f.upiApp:'',upiRef:f.mode==='Online (UPI)'?f.upiRef:'',chequeNo:f.mode==='Cheque'?f.chequeNo:'',bank:f.mode==='Cheque'?f.bank:'',receivedDate:f.mode==='Cheque'?f.receivedDate:null,chequeDate:f.mode==='Cheque'?f.chequeDate:null,clearanceDate:f.mode==='Cheque'?f.clearanceDate:null,areaName:f.mode==='Cheque'?f.areaName:'',chequeStatus:f.mode==='Cheque'?f.chequeStatus:''};
    const saved=await api.post('/api/payments',p);onSave(saved);};
  return<Modal title='Record Payment' onClose={onClose}>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
      <Fld label='Payment Mode' span2><div style={{display:'flex',gap:8}}>{PAY_MODES.map(m=><button key={m} onClick={()=>up('mode')(m)} style={{...S.btn(f.mode===m?'pri':'def'),flex:1,justifyContent:'center'}}>{m}</button>)}</div></Fld>
      <Fld label='Party Name'><input style={S.inp} value={f.partyName} onChange={e=>up('partyName')(e.target.value)} placeholder='Customer name'/></Fld>
      <Fld label='City'><input style={S.inp} value={f.city} onChange={e=>up('city')(e.target.value)} placeholder='City'/></Fld>
      <Fld label='Amount Rs. *'><input style={S.inp} type='number' value={f.amount} onChange={e=>up('amount')(e.target.value)} placeholder='0.00'/></Fld>
      <Fld label='Date'><input style={S.inp} type='date' value={f.date} onChange={e=>up('date')(e.target.value)}/></Fld>
      {f.amount&&<Fld label='Amount in Words' span2><div style={{padding:'8px 12px',background:BG,borderRadius:7,fontSize:12,fontStyle:'italic',lineHeight:1.5,color:TXT}}>{words}</div></Fld>}
      {f.mode==='Online (UPI)'&&<><Fld label='UPI App'><select style={S.inp} value={f.upiApp} onChange={e=>up('upiApp')(e.target.value)}>{UPI_APPS.map(a=><option key={a}>{a}</option>)}</select></Fld><Fld label='UTR / Transaction Ref'><input style={S.inp} value={f.upiRef} onChange={e=>up('upiRef')(e.target.value)} placeholder='Transaction ID'/></Fld></>}
      {f.mode==='Cheque'&&<>
        <Fld label='Cheque Number'><input style={S.inp} value={f.chequeNo} onChange={e=>up('chequeNo')(e.target.value)} placeholder='123456'/></Fld>
        <Fld label='Bank Name'><input style={S.inp} value={f.bank} onChange={e=>up('bank')(e.target.value)} placeholder='SBI, HDFC...'/></Fld>
        <Fld label='Received Date'><input style={S.inp} type='date' value={f.receivedDate} onChange={e=>up('receivedDate')(e.target.value)}/></Fld>
        <Fld label='Date on Cheque'><input style={S.inp} type='date' value={f.chequeDate} onChange={e=>up('chequeDate')(e.target.value)}/></Fld>
        <Fld label='Expected Clearance Date'><input style={S.inp} type='date' value={f.clearanceDate} onChange={e=>up('clearanceDate')(e.target.value)}/></Fld>
        <Fld label='Area / Branch'><input style={S.inp} value={f.areaName} onChange={e=>up('areaName')(e.target.value)} placeholder='Area or branch'/></Fld>
        <Fld label='Initial Status' span2>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {CHQ.map(s=><button key={s.k} onClick={()=>up('chequeStatus')(s.k)} style={{padding:'5px 12px',borderRadius:20,border:'1.5px solid '+(f.chequeStatus===s.k?s.c:BORD),background:f.chequeStatus===s.k?s.bg:'#fff',color:f.chequeStatus===s.k?s.c:MUT,cursor:'pointer',fontSize:11,fontWeight:700}}>{s.l}</button>)}
          </div>
        </Fld>
      </>}
      <Fld label='Remarks' span2><input style={S.inp} value={f.remarks} onChange={e=>up('remarks')(e.target.value)} placeholder='Optional notes'/></Fld>
    </div>
    <div style={{display:'flex',gap:8,marginTop:14}}><button style={S.btn('pri')} onClick={save}>Save Payment</button><button style={S.btn()} onClick={onClose}>Cancel</button></div>
  </Modal>;}

/* ── CHEQUE STATUS ── */
function ChequeStatus({payment,onUpdate}){
  const st=getStage(payment.chequeStatus||'deposited');const[busy,setBusy]=useState(false);
  const adv=async()=>{if(!st.next)return;setBusy(true);try{const u=await api.patch('/api/payments',{id:payment.id,chequeStatus:st.next});onUpdate(u);}finally{setBusy(false)}};
  const bounce=async()=>{if(['bounced','recleared','cleared'].includes(payment.chequeStatus))return;setBusy(true);try{const u=await api.patch('/api/payments',{id:payment.id,chequeStatus:'bounced'});onUpdate(u);}finally{setBusy(false)}};
  return<div style={{display:'flex',alignItems:'center',gap:4,flexWrap:'wrap'}}>
    <span style={{padding:'3px 10px',borderRadius:20,background:st.bg,color:st.c,fontSize:11,fontWeight:700,border:'1px solid '+st.c+'40'}}>{st.l}</span>
    {st.next&&<button onClick={adv} disabled={busy} style={{...S.btn('suc',true),fontSize:9,padding:'2px 7px'}}>Advance</button>}
    {!['bounced','recleared','cleared'].includes(payment.chequeStatus)&&<button onClick={bounce} disabled={busy} style={{...S.btn('dan',true),fontSize:9,padding:'2px 7px'}}>Bounce</button>}
  </div>;}

/* ── PRINTABLE INVOICE ── */
function Invoice({bill,firm,payments=[]}){
  if(!bill)return null;
  const paid=payments.filter(p=>p.billId===bill.id).reduce((s,p)=>s+p.amount,0),bal=bill.total-paid;
  const qd='Invoice: '+(bill.invoiceNo||bill.id)+'\nDate: '+new Date(bill.date).toLocaleDateString('en-IN')+'\nParty: '+bill.customerName+'\nTotal: '+fmt(bill.total)+'\nFirm: '+firm.name;
  const gstBkp=(bill.items||[]).reduce((acc,item)=>{const r=item.gstRate||0;if(!acc[r])acc[r]={cgst:0,sgst:0,taxable:0};acc[r].taxable+=item.rate*item.qty;acc[r].cgst+=item.gstAmt/2;acc[r].sgst+=item.gstAmt/2;return acc},{});
  const hasDiscount=(bill.discount||0)>0;
  return<div id='invoice-print' style={{fontFamily:'Arial,sans-serif',color:'#111',fontSize:12,width:'100%',background:'#fff',padding:22,boxSizing:'border-box'}}>
    <table style={{width:'100%',borderCollapse:'collapse',marginBottom:10}}><tbody><tr>
      <td style={{width:'60%',verticalAlign:'top'}}>
        {firm.logo&&<img src={firm.logo} alt='Logo' style={{maxHeight:60,maxWidth:200,marginBottom:6,display:'block'}} onError={e=>e.target.style.display='none'}/>}
        <div style={{fontSize:20,fontWeight:800,color:'#1B3A6B'}}>{firm.name}</div>
        {firm.shoptype&&<div style={{fontSize:11,color:'#666',marginTop:1}}>{firm.shoptype}</div>}
        <div style={{fontSize:11,color:'#444',marginTop:3,lineHeight:1.6}}>{firm.address}</div>
        {firm.mobile&&<div style={{fontSize:11}}>Mob: {firm.mobile}</div>}
        {firm.email&&<div style={{fontSize:11}}>Email: {firm.email}</div>}
        {firm.gstin&&<div style={{fontSize:11,fontWeight:700,marginTop:3}}>GSTIN: {firm.gstin}</div>}
      </td>
      <td style={{width:'40%',textAlign:'right',verticalAlign:'top'}}>
        <img src={qrU(qd,88)} width={88} height={88} alt='QR'/><div style={{fontSize:9,color:'#999',marginTop:2}}>Scan to verify</div>
      </td>
    </tr></tbody></table>
    <div style={{background:'#1B3A6B',color:'#fff',padding:'5px 14px',borderRadius:4,marginBottom:10,display:'flex',justifyContent:'space-between'}}>
      <span style={{fontSize:13,fontWeight:700}}>TAX INVOICE</span>
      {bill.isRelative&&<span style={{fontSize:10}}>CASH MEMO</span>}
    </div>
    <table style={{width:'100%',borderCollapse:'collapse',marginBottom:10}}><tbody><tr>
      <td style={{width:'50%',verticalAlign:'top',paddingRight:8}}>
        <div style={{background:'#f8f8f8',padding:'7px 10px',borderRadius:4,border:'0.5px solid #e0e0e0'}}>
          <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',color:'#888',marginBottom:3}}>Bill To:</div>
          <div style={{fontWeight:700,fontSize:13}}>{bill.customerName}</div>
          {bill.customerPhone&&<div style={{fontSize:11}}>Ph: {bill.customerPhone}</div>}
          {bill.customerAddr&&<div style={{fontSize:11,color:'#555'}}>{bill.customerAddr}</div>}
          {bill.customerGST&&<div style={{fontSize:11,fontWeight:700}}>GSTIN: {bill.customerGST}</div>}
          {bill.isRelative&&<div style={{fontSize:10,color:'#B8690A',fontStyle:'italic'}}>Walk-in / Relative</div>}
        </div>
      </td>
      <td style={{width:'50%',verticalAlign:'top'}}>
        <div style={{background:'#f8f8f8',padding:'7px 10px',borderRadius:4,border:'0.5px solid #e0e0e0'}}>
          {[['Invoice No.',bill.invoiceNo||'#'+bill.id],['Date',new Date(bill.date).toLocaleDateString('en-IN')],['Place of Supply',firm.state||'M.P.'],(bill.transportName||bill.lrNumber)?['Transport',bill.transportName||(bill.lrNumber?'-':'')]:null,bill.lrNumber?['LR / Docket No.',bill.lrNumber]:bill.biltyNo?['LR / Bilty No.',bill.biltyNo]:null].filter(Boolean).map(([k,v])=><div key={k} style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:11}}><span style={{color:'#666'}}>{k}</span><span style={{fontWeight:700,fontFamily:k.includes('LR')||k.includes('Bilty')?'monospace':'inherit'}}>{v}</span></div>)}
        </div>
      </td>
    </tr></tbody></table>
    <table style={{width:'100%',borderCollapse:'collapse',marginBottom:8,fontSize:11}}>
      <thead><tr style={{background:'#1B3A6B',color:'#fff'}}>{['#','Description','Art.No','Cat','Size','Qty','Rate','GST%','CGST','SGST','Total'].map(h=><th key={h} style={{padding:'4px 5px',textAlign:'left',fontSize:9,fontWeight:600}}>{h}</th>)}</tr></thead>
      <tbody>{(bill.items||[]).map((item,i)=><tr key={i} style={{background:i%2===0?'#fafafa':'#fff'}}>
        <td style={{padding:'3px 5px',borderBottom:'0.5px solid #eee'}}>{i+1}</td>
        <td style={{padding:'3px 5px',borderBottom:'0.5px solid #eee',fontWeight:600}}>{item.name}<div style={{fontSize:8,color:'#888',fontFamily:'monospace'}}>{item.sku}</div></td>
        <td style={{padding:'3px 5px',borderBottom:'0.5px solid #eee',fontFamily:'monospace',fontSize:9,color:'#1B5E8A',fontWeight:700}}>{item.articleNo||'-'}</td>
        <td style={{padding:'3px 5px',borderBottom:'0.5px solid #eee'}}>{item.cat}</td>
        <td style={{padding:'3px 5px',borderBottom:'0.5px solid #eee'}}>{item.size}</td>
        <td style={{padding:'3px 5px',borderBottom:'0.5px solid #eee',textAlign:'right'}}>{item.qty}</td>
        <td style={{padding:'3px 5px',borderBottom:'0.5px solid #eee',textAlign:'right'}}>{fmt(item.rate)}</td>
        <td style={{padding:'3px 5px',borderBottom:'0.5px solid #eee',textAlign:'center'}}>{item.gstRate}%</td>
        <td style={{padding:'3px 5px',borderBottom:'0.5px solid #eee',textAlign:'right'}}>{fmt(item.gstAmt/2)}</td>
        <td style={{padding:'3px 5px',borderBottom:'0.5px solid #eee',textAlign:'right'}}>{fmt(item.gstAmt/2)}</td>
        <td style={{padding:'3px 5px',borderBottom:'0.5px solid #eee',textAlign:'right',fontWeight:700}}>{fmt(item.total)}</td>
      </tr>)}</tbody>
    </table>
    <table style={{width:'100%',borderCollapse:'collapse',marginBottom:8}}><tbody><tr>
      <td style={{width:'55%',verticalAlign:'top',paddingRight:14}}>
        {!bill.isRelative&&Object.keys(gstBkp).length>0&&<><div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',color:'#888',marginBottom:3}}>GST Summary (CGST + SGST)</div>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:9,border:'0.5px solid #e0e0e0'}}><thead><tr style={{background:'#f0f0f0'}}>{['Rate','Taxable','CGST','SGST','Total Tax'].map(h=><th key={h} style={{padding:'2px 4px',textAlign:'right',fontWeight:700}}>{h}</th>)}</tr></thead><tbody>{Object.entries(gstBkp).map(([r,v])=><tr key={r}><td style={{padding:'2px 4px'}}>{r}%</td><td style={{padding:'2px 4px',textAlign:'right'}}>{fmt(v.taxable)}</td><td style={{padding:'2px 4px',textAlign:'right'}}>{fmt(v.cgst)}</td><td style={{padding:'2px 4px',textAlign:'right'}}>{fmt(v.sgst)}</td><td style={{padding:'2px 4px',textAlign:'right',fontWeight:700}}>{fmt(v.cgst+v.sgst)}</td></tr>)}</tbody></table></>}
        <div style={{marginTop:8,padding:'7px 10px',background:'#f5f5f5',borderRadius:4,fontSize:10,fontStyle:'italic',lineHeight:1.6}}><strong>Amount in Words:</strong><br/>{n2w(bill.total)}</div>
      </td>
      <td style={{width:'45%',verticalAlign:'top'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}><tbody>
          <tr><td style={{padding:'3px 7px',color:'#555'}}>Subtotal</td><td style={{padding:'3px 7px',textAlign:'right'}}>{fmt(bill.subtotal)}</td></tr>
          {!bill.isRelative&&(bill.gst||0)>0&&<><tr><td style={{padding:'3px 7px',color:'#555'}}>CGST</td><td style={{padding:'3px 7px',textAlign:'right'}}>{fmt((bill.gst||0)/2)}</td></tr><tr><td style={{padding:'3px 7px',color:'#555'}}>SGST</td><td style={{padding:'3px 7px',textAlign:'right'}}>{fmt((bill.gst||0)/2)}</td></tr></>}
          {bill.isRelative&&(bill.markup||0)>0&&<tr><td style={{padding:'3px 7px',color:'#555'}}>Other Charges</td><td style={{padding:'3px 7px',textAlign:'right'}}>{fmt(bill.markup)}</td></tr>}
          {hasDiscount&&<tr style={{color:GR}}><td style={{padding:'3px 7px'}}>Discount</td><td style={{padding:'3px 7px',textAlign:'right'}}>- {fmt(bill.discount)}</td></tr>}
          <tr style={{background:'#1B3A6B',color:'#fff'}}><td style={{padding:'6px 7px',fontWeight:700}}>Grand Total</td><td style={{padding:'6px 7px',textAlign:'right',fontWeight:800,fontFamily:'monospace'}}>{fmt(bill.total)}</td></tr>
          {paid>0&&<><tr><td style={{padding:'3px 7px',color:GR}}>Amount Paid</td><td style={{padding:'3px 7px',textAlign:'right',color:GR,fontWeight:600}}>{fmt(paid)}</td></tr><tr style={{background:'#FDF0F0'}}><td style={{padding:'4px 7px',color:RD,fontWeight:700}}>Balance Due</td><td style={{padding:'4px 7px',textAlign:'right',color:RD,fontWeight:800}}>{fmt(bal)}</td></tr></>}
        </tbody></table>
      </td>
    </tr></tbody></table>
    {firm.bankName&&<div style={{border:'0.5px solid #e0e0e0',borderRadius:4,padding:'5px 10px',marginBottom:7,fontSize:10}}><strong>Bank:</strong> {firm.bankName} | <strong>A/C:</strong> {firm.bankAccount} | <strong>IFSC:</strong> {firm.bankIFSC}</div>}
    {firm.terms&&<div style={{borderTop:'0.5px solid #e0e0e0',paddingTop:7,marginBottom:7}}><div style={{fontSize:8,fontWeight:700,textTransform:'uppercase',color:'#888',marginBottom:2}}>Terms and Conditions</div><div style={{fontSize:8,color:'#666',lineHeight:1.7,whiteSpace:'pre-line'}}>{firm.terms}</div></div>}
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',paddingTop:7,borderTop:'0.5px solid #e0e0e0'}}><div style={{fontSize:9,color:'#999'}}>Computer generated invoice.</div><div style={{textAlign:'center'}}><div style={{marginBottom:24,fontSize:10}}>For {firm.name}</div><div style={{borderTop:'1px solid #333',width:130,marginLeft:'auto',paddingTop:3,fontSize:9,color:'#666'}}>Authorised Signatory</div></div></div>
  </div>;}

/* ── PDF GENERATOR ── */
async function makePDF(elementId){
  const el=document.getElementById(elementId);if(!el)return;
  const{default:html2canvas}=await import('html2canvas');
  const{default:jsPDF}=await import('jspdf');
  const canvas=await html2canvas(el,{scale:2,useCORS:true,allowTaint:true,backgroundColor:'#ffffff'});
  const imgData=canvas.toDataURL('image/png');
  const pdf=new jsPDF('p','mm','a4');
  const pW=pdf.internal.pageSize.getWidth();const pH=pdf.internal.pageSize.getHeight();
  const iW=canvas.width,iH=canvas.height;const ratio=pW/iW*96/25.4;
  const scaledH=iH*ratio;
  if(scaledH<=pH){pdf.addImage(imgData,'PNG',0,0,pW,scaledH);}
  else{let y=0;while(y<iH){const pageH=pH/ratio;const slice=document.createElement('canvas');slice.width=iW;slice.height=Math.min(pageH,iH-y);const ctx=slice.getContext('2d');ctx.drawImage(canvas,0,y,iW,slice.height,0,0,iW,slice.height);pdf.addImage(slice.toDataURL('image/png'),'PNG',0,0,pW,slice.height*ratio);y+=pageH;if(y<iH)pdf.addPage();}}
  return pdf;}

/* ── E-WAY BILL MODAL ── */
function EWayBillModal({bill,firm,onClose}){
  const td=new Date().toISOString().split('T')[0];
  const[f,setF]=useState({
    supplyType:'Outward',subType:'Supply',docType:'Tax Invoice',
    transporterName:bill?.transportName||'',vehicleNo:'',lrNumber:bill?.lrNumber||'',
    distance:'',transMode:'Road',docDate:new Date(bill?.date||td).toLocaleDateString('en-IN'),
  });
  const up=k=>v=>setF(x=>({...x,[k]:v}));
  const totalTaxable=(bill?.items||[]).reduce((s,i)=>s+i.rate*i.qty,0);
  const totalGST=(bill?.items||[]).reduce((s,i)=>s+i.gstAmt,0);

  const genPDF=async()=>{
    const{default:jsPDF}=await import('jspdf');
    const pdf=new jsPDF('p','mm','a4');
    const lm=15,tw=180,y=(n)=>n;
    pdf.setFillColor(27,58,107);pdf.rect(0,0,210,20,'F');
    pdf.setTextColor(255,255,255);pdf.setFontSize(14);pdf.setFont('helvetica','bold');
    pdf.text('E-WAY BILL (For Movement of Goods)',105,13,{align:'center'});
    pdf.setTextColor(0,0,0);pdf.setFontSize(9);
    let cy=28;
    const row=(label,val,x,y,w)=>{pdf.setFont('helvetica','bold');pdf.text(label,x,y);pdf.setFont('helvetica','normal');pdf.text(String(val||''),x+w,y);};
    pdf.setFillColor(230,240,255);pdf.rect(lm,cy-4,tw,7,'F');
    pdf.setFont('helvetica','bold');pdf.setFontSize(9);pdf.text('PART A — Consignment Details',lm+2,cy);cy+=10;
    row('Supply Type:',f.supplyType,lm,cy,35);row('Sub Type:',f.subType,lm+90,cy,25);cy+=8;
    row('Document Type:',f.docType,lm,cy,35);row('Document No.:',bill?.invoiceNo||'',lm+90,cy,25);cy+=8;
    row('Document Date:',f.docDate,lm,cy,35);row('Taxable Value:',fmt(totalTaxable),lm+90,cy,30);cy+=8;
    pdf.setDrawColor(200,200,200);pdf.line(lm,cy,lm+tw,cy);cy+=8;
    pdf.setFillColor(230,240,255);pdf.rect(lm,cy-4,tw,7,'F');
    pdf.setFont('helvetica','bold');pdf.text('FROM (Consignor)',lm+2,cy);cy+=10;
    row('Name:',firm.name,lm,cy,25);cy+=7;
    row('GSTIN:',firm.gstin||'N/A',lm,cy,25);cy+=7;
    row('Address:',firm.address,lm,cy,25);cy+=7;
    row('State:',firm.state||'Madhya Pradesh',lm,cy,25);cy+=10;
    pdf.setFillColor(230,240,255);pdf.rect(lm,cy-4,tw,7,'F');
    pdf.setFont('helvetica','bold');pdf.text('TO (Consignee)',lm+2,cy);cy+=10;
    row('Name:',bill?.customerName||'',lm,cy,25);cy+=7;
    row('GSTIN:',bill?.customerGST||'N/A',lm,cy,25);cy+=7;
    row('Address:',bill?.customerAddr||'',lm,cy,25);cy+=10;
    pdf.setFillColor(230,240,255);pdf.rect(lm,cy-4,tw,7,'F');
    pdf.setFont('helvetica','bold');pdf.text('ITEM DETAILS',lm+2,cy);cy+=10;
    pdf.setFontSize(8);
    ['#','Description','HSN','Qty','Taxable Value','GST Rate','CGST','SGST','Total'].forEach((h,i)=>{const xs=[lm,lm+8,lm+55,lm+75,lm+90,lm+115,lm+130,lm+150,lm+165];pdf.setFont('helvetica','bold');pdf.text(h,xs[i],cy);});cy+=6;
    pdf.setFont('helvetica','normal');
    (bill?.items||[]).forEach((item,idx)=>{const xs=[lm,lm+8,lm+55,lm+75,lm+90,lm+115,lm+130,lm+150,lm+165];const vals=[String(idx+1),item.name.substring(0,20),item.hsn||item.sku||'',String(item.qty),fmt(item.rate*item.qty),item.gstRate+'%',fmt(item.gstAmt/2),fmt(item.gstAmt/2),fmt(item.total)];vals.forEach((v,i)=>pdf.text(v,xs[i],cy));cy+=6;if(cy>260){pdf.addPage();cy=20;}});
    cy+=4;pdf.setDrawColor(200,200,200);pdf.line(lm,cy,lm+tw,cy);cy+=8;
    pdf.setFont('helvetica','bold');pdf.setFontSize(9);pdf.text('Total Taxable: '+fmt(totalTaxable)+'   Total CGST: '+fmt(totalGST/2)+'   Total SGST: '+fmt(totalGST/2)+'   Grand Total: '+fmt(totalTaxable+totalGST),lm,cy);cy+=12;
    pdf.setFillColor(230,240,255);pdf.rect(lm,cy-4,tw,7,'F');
    pdf.setFont('helvetica','bold');pdf.text('PART B — Transporter Details',lm+2,cy);cy+=10;
    row('Transporter Name:',f.transporterName,lm,cy,40);row('Vehicle No.:',f.vehicleNo,lm+90,cy,30);cy+=8;
    row('LR / Docket No.:',f.lrNumber,lm,cy,40);row('Distance (km):',f.distance,lm+90,cy,30);cy+=8;
    row('Mode of Transport:',f.transMode,lm,cy,40);cy+=12;
    pdf.setFontSize(8);pdf.setFont('helvetica','normal');pdf.setTextColor(150,150,150);
    pdf.text('NOTE: This is a draft E-Way Bill format. Upload the final invoice to ewaybillgst.gov.in to generate the official E-Way Bill with EWB number.',lm,cy,{maxWidth:tw});
    pdf.save('EWayBill-'+(bill?.invoiceNo||bill?.id)+'.pdf');
  };

  return<Modal title='Generate E-Way Bill' onClose={onClose} wide>
    <div style={{marginBottom:12,padding:'8px 12px',borderRadius:7,background:AMBL,color:AMB,fontSize:12}}>
      This generates a pre-filled E-Way Bill PDF. After downloading, upload to <strong>ewaybillgst.gov.in</strong> to get the official EWB number.
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
      <Fld label='Supply Type'><select style={S.inp} value={f.supplyType} onChange={e=>up('supplyType')(e.target.value)}><option>Outward</option><option>Inward</option></select></Fld>
      <Fld label='Sub Type'><select style={S.inp} value={f.subType} onChange={e=>up('subType')(e.target.value)}><option>Supply</option><option>Export</option><option>Job Work</option><option>Others</option></select></Fld>
      <Fld label='Transporter Name'><input style={S.inp} value={f.transporterName} onChange={e=>up('transporterName')(e.target.value)} placeholder='Transport company name'/></Fld>
      <Fld label='Vehicle Number'><input style={S.inp} value={f.vehicleNo} onChange={e=>up('vehicleNo')(e.target.value)} placeholder='MP09AB1234'/></Fld>
      <Fld label='LR / Docket Number'><input style={S.inp} value={f.lrNumber} onChange={e=>up('lrNumber')(e.target.value)} placeholder='Docket number'/></Fld>
      <Fld label='Distance (km)'><input style={S.inp} type='number' value={f.distance} onChange={e=>up('distance')(e.target.value)} placeholder='e.g. 250'/></Fld>
      <Fld label='Mode of Transport'><select style={S.inp} value={f.transMode} onChange={e=>up('transMode')(e.target.value)}><option>Road</option><option>Rail</option><option>Air</option><option>Ship</option></select></Fld>
    </div>
    <div style={{padding:'10px 12px',borderRadius:7,background:BG,border:'0.5px solid '+BORD,marginBottom:14}}>
      <div style={S.h3}>Auto-filled from Invoice #{bill?.invoiceNo||bill?.id}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,fontSize:12}}>
        <div><span style={{color:MUT}}>From: </span>{firm.name}</div>
        <div><span style={{color:MUT}}>To: </span>{bill?.customerName}</div>
        <div><span style={{color:MUT}}>From GSTIN: </span>{firm.gstin||'N/A'}</div>
        <div><span style={{color:MUT}}>To GSTIN: </span>{bill?.customerGST||'N/A'}</div>
        <div><span style={{color:MUT}}>Taxable Value: </span>{fmt(totalTaxable)}</div>
        <div><span style={{color:MUT}}>Total GST: </span>{fmt(totalGST)}</div>
        <div><span style={{color:MUT}}>Items: </span>{(bill?.items||[]).length} line items</div>
        <div><span style={{color:MUT}}>Grand Total: </span>{fmt(totalTaxable+totalGST)}</div>
      </div>
    </div>
    <div style={{display:'flex',gap:8}}><button style={S.btn('pri')} onClick={genPDF}>Download E-Way Bill PDF</button><button style={S.btn()} onClick={onClose}>Cancel</button></div>
  </Modal>;}

/* ── BILLS ── */
function Bills({B,setB,Py,setPy,firm,C,initBill,mob}){
  const[vid,setVid]=useState(initBill?.id||null);const[payBill,setPayBill]=useState(null);const[toast,showT]=useToast();
  const[transportEdit,setTransportEdit]=useState(null);const[transportForm,setTransportForm]=useState({transportName:'',lrNumber:''});
  const[pdfBusy,setPdfBusy]=useState(false);const[ewayBill,setEwayBill]=useState(null);
  useEffect(()=>{if(initBill)setVid(initBill.id);},[initBill?.id]);
  const bill=B.find(b=>b.id===vid)||initBill;
  const print=()=>{if(!bill)return;const w=window.open('','_blank');w.document.write('<html><head><title>Invoice '+(bill.invoiceNo||bill.id)+'</title><style>body{margin:0}@media print{@page{margin:8mm}}</style></head><body>');w.document.write(document.getElementById('invoice-print')?.innerHTML||'');w.document.write('</body></html>');w.document.close();w.print();};
  const downloadPDF=async()=>{if(!bill)return;setPdfBusy(true);try{const pdf=await makePDF('invoice-print');pdf?.save('Invoice-'+(bill.invoiceNo||bill.id)+'.pdf');}catch(e){showT('PDF failed: '+e.message,'err');}finally{setPdfBusy(false)}};
  const emailBill=async b=>{const cust=C.find(c=>c.id===b.customerId);const toEmail=cust?.email||b.customerEmail||'';if(!toEmail){alert('No email on file. Update customer details first.');return}const tpl=firm.emailBody||'Dear {customerName},\n\nInvoice {invoiceNo} — Amount: {amount}\n\nThank you!\n\n{firmName}';const body=tpl.replace(/{customerName}/g,b.customerName).replace(/{invoiceNo}/g,b.invoiceNo||b.id).replace(/{date}/g,new Date(b.date).toLocaleDateString('en-IN')).replace(/{amount}/g,fmt(b.total)).replace(/{firmName}/g,firm.name).replace(/{mobile}/g,firm.mobile||'');const subj=(firm.emailSubject||'Invoice {invoiceNo} from {firmName}').replace(/{invoiceNo}/g,b.invoiceNo||b.id).replace(/{firmName}/g,firm.name);if(vid===b.id){setPdfBusy(true);try{const pdf=await makePDF('invoice-print');pdf?.save('Invoice-'+(b.invoiceNo||b.id)+'.pdf');}catch{}finally{setPdfBusy(false)}}const from=firm.senderEmail?'?from='+encodeURIComponent(firm.senderEmail)+'&':'?';window.location.href='mailto:'+toEmail+from+'subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(body+'\n\n[Please find the PDF downloaded to your device. Attach it before sending.]');};
  const saveTransport=async id=>{const r=await api.patch('/api/bills',{id,transportName:transportForm.transportName,lrNumber:transportForm.lrNumber});setB(bs=>bs.map(b=>b.id===id?{...b,transportName:r.transportName,lrNumber:r.lrNumber}:b));setTransportEdit(null);showT('Transport details saved!');};
  const savePayment=p=>{setPy(ps=>[p,...ps]);setPayBill(null);showT('Payment recorded!');};
  const updatePay=u=>setPy(ps=>ps.map(p=>p.id===u.id?u:p));
  return<div>
    <div style={S.h2}>Bills & Invoices</div>{toast}
    <div style={{...S.card,padding:0,marginBottom:14,overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:mob?500:700}}>
        <thead><tr>{['Invoice','Date','Customer','Pcs','Total','Paid','Status','Transport & LR','Actions'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {B.length===0&&<tr><td colSpan={9}><MT msg='No bills yet.'/></td></tr>}
          {B.map(b=>{const paid=Py.filter(p=>p.billId===b.id).reduce((s,p)=>s+p.amount,0);const st=paid>=b.total?'Paid':paid>0?'Partial':'Unpaid';
            return<tr key={b.id}>
              <td style={{...S.td,...S.mono,fontWeight:800,fontSize:11}}>{b.invoiceNo||'#'+b.id}</td>
              <td style={{...S.td,fontSize:11}}>{new Date(b.date).toLocaleDateString('en-IN')}</td>
              <td style={S.td}><div style={{fontWeight:600,fontSize:12}}>{b.customerName}</div>{b.customerPhone&&<div style={{fontSize:10,color:MUT}}>{b.customerPhone}</div>}</td>
              <td style={{...S.td,textAlign:'right',fontSize:11}}>{(b.items||[]).reduce((s,i)=>s+i.qty,0)}</td>
              <td style={{...S.td,...S.mono,color:GR,fontWeight:800}}>{fmt(b.total)}</td>
              <td style={{...S.td,...S.mono,color:GR}}>{fmt(paid)}</td>
              <td style={S.td}><Bdg c={{Paid:'green',Partial:'amber',Unpaid:'red'}[st]}>{st}</Bdg></td>
              <td style={S.td}>
                {transportEdit===b.id?<div style={{display:'flex',flexDirection:'column',gap:4,minWidth:160}}>
                  <input style={{...S.inp,fontSize:11,padding:'3px 8px'}} value={transportForm.transportName} onChange={e=>setTransportForm(f=>({...f,transportName:e.target.value}))} placeholder='Transport name' autoFocus/>
                  <input style={{...S.inp,fontSize:11,padding:'3px 8px',fontFamily:'monospace'}} value={transportForm.lrNumber} onChange={e=>setTransportForm(f=>({...f,lrNumber:e.target.value}))} placeholder='LR / Docket no.' onKeyDown={e=>e.key==='Enter'&&saveTransport(b.id)}/>
                  <div style={{display:'flex',gap:4}}><button style={S.btn('suc',true)} onClick={()=>saveTransport(b.id)}>Save</button><button style={S.btn('def',true)} onClick={()=>setTransportEdit(null)}>X</button></div>
                </div>:<div style={{display:'flex',flexDirection:'column',gap:3}}>
                  {b.transportName&&<div style={{fontSize:11,fontWeight:600}}>{b.transportName}</div>}
                  {b.lrNumber&&<div style={{...S.mono,fontSize:10,color:BL,background:BLL,padding:'2px 6px',borderRadius:4,display:'inline-block'}}>LR: {b.lrNumber}</div>}
                  {!b.transportName&&!b.lrNumber&&<span style={{fontSize:10,color:MUT}}>-</span>}
                  <button style={{...S.btn('def',true),fontSize:9,padding:'2px 6px',marginTop:2}} onClick={()=>{setTransportEdit(b.id);setTransportForm({transportName:b.transportName||'',lrNumber:b.lrNumber||b.biltyNo||''});}}>{(b.transportName||b.lrNumber)?'Edit':'+ Add'}</button>
                </div>}
              </td>
              <td style={S.td}><div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
                <button style={S.btn('def',true)} onClick={()=>setVid(b.id===vid?null:b.id)}>View</button>
                <button style={S.btn('pur',true)} onClick={()=>setPayBill(b)}>Pay</button>
                <button style={S.btn('suc',true)} onClick={()=>{setVid(b.id);setTimeout(print,400)}}>Print</button>
                <button style={S.btn('amb',true)} onClick={()=>emailBill(b)} disabled={pdfBusy}>Email</button>
                <button style={S.btn('def',true)} onClick={()=>setEwayBill(b)}>E-Way</button>
              </div></td>
            </tr>;})}
        </tbody>
      </table>
    </div>
    {bill&&<div>
      <div style={{display:'flex',gap:7,marginBottom:10,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{fontWeight:700,fontSize:13}}>Invoice — {bill.invoiceNo||'#'+bill.id}</div>
        {bill.transportName&&<span style={{fontSize:12,fontWeight:600}}>{bill.transportName}</span>}
        {bill.lrNumber&&<span style={{...S.mono,fontSize:11,color:BL,background:BLL,padding:'3px 9px',borderRadius:5,fontWeight:700}}>LR: {bill.lrNumber}</span>}
        {!bill.transportName&&!bill.lrNumber&&bill.biltyNo&&<span style={{...S.mono,fontSize:11,color:BL,background:BLL,padding:'3px 9px',borderRadius:5,fontWeight:700}}>{bill.biltyNo}</span>}
        <button style={S.btn('suc')} onClick={print}>Print</button>
        <button style={S.btn('amb')} disabled={pdfBusy} onClick={()=>emailBill(bill)}>{pdfBusy?<><Spin/> Preparing...</>:'Email + PDF'}</button>
        <button style={S.btn('pur')} onClick={downloadPDF} disabled={pdfBusy}>{pdfBusy?<><Spin/> Generating...</>:'Download PDF'}</button>
        <button style={S.btn('pur')} onClick={()=>setPayBill(bill)}>Record Payment</button>
        <button style={S.btn('def')} onClick={()=>setEwayBill(bill)}>E-Way Bill</button>
        <button style={S.btn('def')} onClick={()=>setVid(null)}>Close</button>
      </div>
      <div style={{border:'0.5px solid '+BORD,borderRadius:8,overflow:'hidden',background:'#fff'}}><Invoice bill={bill} firm={firm} payments={Py}/></div>
    </div>}
    {payBill&&<PayModal bill={payBill} onSave={savePayment} onClose={()=>setPayBill(null)}/>}
    {ewayBill&&<EWayBillModal bill={ewayBill} firm={firm} onClose={()=>setEwayBill(null)}/>}
  </div>;}

/* ── RETURNS ── */
function Returns({P,setP,B,C,Ret,setRet,mob}){
  const[tab,setTab]=useState('customer');// 'customer'|'supplier'|'list'
  const[selBill,setSelBill]=useState(null);
  const[retItems,setRetItems]=useState([]);
  const[retDate,setRetDate]=useState(new Date().toISOString().split('T')[0]);
  const[retReason,setRetReason]=useState('');
  const[supplierName,setSupplierName]=useState('');
  const[catF,setCatF]=useState('All');
  const[toast,showT]=useToast();const[saving,setSaving]=useState(false);

  /* customer return: pick items from a bill */
  const selectBill=b=>{setSelBill(b);setRetItems((b.items||[]).map(i=>({...i,retQty:0})));};
  const updRetQty=(idx,qty)=>setRetItems(it=>it.map((x,i)=>i===idx?{...x,retQty:Math.min(+qty||0,x.qty)}:x));
  const doCustomerReturn=async()=>{
    const toReturn=retItems.filter(i=>i.retQty>0);
    if(toReturn.length===0){showT('Select at least one item to return','err');return}
    setSaving(true);
    try{
      const items=toReturn.map(i=>({sku:i.sku,name:i.name,size:i.size||'',qty:i.retQty,rate:i.rate,total:i.retQty*i.rate}));
      const ret=await api.post('/api/returns',{type:'customer',billId:selBill.id,customerId:selBill.customerId,customerName:selBill.customerName,date:retDate,reason:retReason,items});
      setRet(rs=>[ret,...rs]);
      // Refresh products
      const fp=await api.get('/api/products');setP(Array.isArray(fp)?fp:[]);
      setSelBill(null);setRetItems([]);setRetReason('');
      showT('Customer return recorded. Stock updated.');
    }catch(e){showT('Failed: '+e.message,'err')}finally{setSaving(false)}
  };

  /* supplier return: pick from catalog */
  const[suppRetItems,setSuppRetItems]=useState([]);
  const addSuppItem=p=>{setSuppRetItems(it=>{const ex=it.find(x=>x.id===p.id);if(ex)return it;return[...it,{...p,retQty:1}];});};
  const updSuppQty=(id,qty)=>setSuppRetItems(it=>it.map(x=>x.id===id?{...x,retQty:Math.min(+qty||0,x.qty)}:x));
  const remSuppItem=id=>setSuppRetItems(it=>it.filter(x=>x.id!==id));
  const doSupplierReturn=async()=>{
    const toReturn=suppRetItems.filter(i=>i.retQty>0);
    if(toReturn.length===0||!supplierName){showT('Add items and supplier name','err');return}
    setSaving(true);
    try{
      const items=toReturn.map(i=>({sku:i.sku,name:i.name,size:i.size||'',qty:i.retQty,rate:i.price,total:i.retQty*i.price}));
      const ret=await api.post('/api/returns',{type:'supplier',supplierName,date:retDate,reason:retReason,items});
      setRet(rs=>[ret,...rs]);
      const fp=await api.get('/api/products');setP(Array.isArray(fp)?fp:[]);
      setSuppRetItems([]);setSupplierName('');setRetReason('');
      showT('Supplier return recorded. Stock reduced.');
    }catch(e){showT('Failed: '+e.message,'err')}finally{setSaving(false)}
  };

  const fP=P.filter(p=>(catF==='All'||p.cat===catF));

  return<div>
    <div style={S.h2}>Returns</div>{toast}
    <div style={{display:'flex',gap:6,marginBottom:14}}>
      {[['customer','Customer Return (Sales Return)'],['supplier','Supplier Return (Purchase Return)'],['list','Return History']].map(([t,l])=><button key={t} onClick={()=>setTab(t)} style={{padding:'7px 14px',borderRadius:7,border:'0.5px solid '+(tab===t?BL:BORD),background:tab===t?BL:'#fff',color:tab===t?'#fff':MUT,cursor:'pointer',fontSize:12,fontWeight:600}}>{l}</button>)}
    </div>

    {/* ── CUSTOMER RETURN ── */}
    {tab==='customer'&&<div style={{display:'grid',gridTemplateColumns:mob?'1fr':'1fr 1fr',gap:14}}>
      <div>
        <div style={{...S.card,marginBottom:12}}>
          <div style={S.h3}>1. Select Bill to Return Against</div>
          <div style={{maxHeight:300,overflowY:'auto',display:'flex',flexDirection:'column',gap:6}}>
            {B.length===0?<MT msg='No bills found'/>:B.slice(0,30).map(b=><div key={b.id} onClick={()=>selectBill(b)} style={{padding:'10px 14px',border:'0.5px solid '+(selBill?.id===b.id?BL:BORD),borderRadius:8,cursor:'pointer',background:selBill?.id===b.id?BLL:'#fff'}}>
              <div style={{fontWeight:700}}>{b.customerName} — {b.invoiceNo||'#'+b.id}</div>
              <div style={{fontSize:11,color:MUT}}>{new Date(b.date).toLocaleDateString('en-IN')} · {fmt(b.total)} · {(b.items||[]).reduce((s,i)=>s+i.qty,0)} pcs</div>
            </div>)}
          </div>
        </div>
        <div style={S.card}>
          <div style={S.h3}>3. Return Details</div>
          <Fld label='Return Date'><input style={S.inp} type='date' value={retDate} onChange={e=>setRetDate(e.target.value)}/></Fld>
          <Fld label='Reason'><input style={S.inp} value={retReason} onChange={e=>setRetReason(e.target.value)} placeholder='Damaged, Wrong size, etc.'/></Fld>
        </div>
      </div>
      <div style={S.card}>
        <div style={S.h3}>2. Select Items & Quantities to Return</div>
        {!selBill?<MT msg='Select a bill on the left first'/>:
          <div>
            <div style={{padding:'8px 12px',background:BLL,borderRadius:7,marginBottom:10,fontSize:12,color:BL,fontWeight:600}}>{selBill.customerName} — Invoice {selBill.invoiceNo||'#'+selBill.id}</div>
            {retItems.map((item,idx)=><div key={idx} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'0.5px solid #f0ede8'}}>
              <div style={{flex:1}}><div style={{fontWeight:600,fontSize:12}}>{item.name}</div><div style={{fontSize:10,color:MUT}}>{item.cat} · {item.size} · Billed: {item.qty} pcs · {fmt(item.rate)} each</div></div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:11,color:MUT}}>Return qty:</span>
                <input style={{...S.inp,width:60,textAlign:'center'}} type='number' min='0' max={item.qty} value={item.retQty} onChange={e=>updRetQty(idx,e.target.value)}/>
                <span style={{fontSize:11,color:item.retQty>0?GR:MUT}}>/ {item.qty}</span>
              </div>
            </div>)}
            {retItems.some(i=>i.retQty>0)&&<div style={{marginTop:12,padding:'8px 12px',background:GRL,borderRadius:7,fontSize:12,color:GR,fontWeight:600}}>
              Returning: {retItems.filter(i=>i.retQty>0).reduce((s,i)=>s+i.retQty,0)} pcs · Credit: {fmt(retItems.reduce((s,i)=>s+i.retQty*i.rate,0))}
            </div>}
            <button style={{...S.btn('suc'),marginTop:12,width:'100%',justifyContent:'center'}} onClick={doCustomerReturn} disabled={saving}>{saving?'Processing...':'Confirm Customer Return'}</button>
          </div>}
      </div>
    </div>}

    {/* ── SUPPLIER RETURN ── */}
    {tab==='supplier'&&<div style={{display:'grid',gridTemplateColumns:mob?'1fr':'1fr 1fr',gap:14}}>
      <div>
        <div style={{...S.card,marginBottom:12}}>
          <div style={S.h3}>Supplier & Return Details</div>
          <Fld label='Supplier Name *'><input style={S.inp} value={supplierName} onChange={e=>setSupplierName(e.target.value)} placeholder='e.g. Swati Garments'/></Fld>
          <Fld label='Return Date'><input style={S.inp} type='date' value={retDate} onChange={e=>setRetDate(e.target.value)}/></Fld>
          <Fld label='Reason'><input style={S.inp} value={retReason} onChange={e=>setRetReason(e.target.value)} placeholder='Defective, Wrong item, etc.'/></Fld>
        </div>
        <div style={S.card}>
          <div style={S.h3}>Select Products from Catalog</div>
          <CatTabs value={catF} onChange={setCatF}/>
          <div style={{maxHeight:300,overflowY:'auto',display:'flex',flexDirection:'column',gap:5}}>
            {fP.filter(p=>p.qty>0).map(p=><div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 10px',border:'0.5px solid '+BORD,borderRadius:7}}>
              <div><div style={{fontWeight:600,fontSize:12}}>{p.name}</div><div style={{fontSize:10,color:MUT}}>{p.cat} · {p.size} · {p.qty} in stock</div></div>
              <button style={S.btn('gho',true)} onClick={()=>addSuppItem(p)}>+ Add</button>
            </div>)}
          </div>
        </div>
      </div>
      <div style={S.card}>
        <div style={S.h3}>Items to Return to Supplier</div>
        {suppRetItems.length===0?<MT msg='Add items from catalog on the left'/>:<div>
          {suppRetItems.map(item=><div key={item.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'0.5px solid #f0ede8'}}>
            <div style={{flex:1}}><div style={{fontWeight:600,fontSize:12}}>{item.name}</div><div style={{fontSize:10,color:MUT}}>{item.size} · {item.qty} in stock · {fmt(item.price)} each</div></div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <input style={{...S.inp,width:60,textAlign:'center'}} type='number' min='0' max={item.qty} value={item.retQty} onChange={e=>updSuppQty(item.id,e.target.value)}/>
              <button onClick={()=>remSuppItem(item.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#ccc',fontSize:16}}>x</button>
            </div>
          </div>)}
          <div style={{marginTop:12,padding:'8px 12px',background:RDL,borderRadius:7,fontSize:12,color:RD,fontWeight:600}}>
            Returning: {suppRetItems.reduce((s,i)=>s+i.retQty,0)} pcs · Value: {fmt(suppRetItems.reduce((s,i)=>s+i.retQty*i.price,0))}
          </div>
          <button style={{...S.btn('dan'),marginTop:12,width:'100%',justifyContent:'center'}} onClick={doSupplierReturn} disabled={saving}>{saving?'Processing...':'Confirm Supplier Return'}</button>
        </div>}
      </div>
    </div>}

    {/* ── RETURN HISTORY ── */}
    {tab==='list'&&<div style={{...S.card,padding:0}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
        <thead><tr>{['Date','Type','Party','Items','Total Value','Reason'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {Ret.length===0&&<tr><td colSpan={6}><MT msg='No returns recorded yet'/></td></tr>}
          {Ret.map(r=><tr key={r.id}>
            <td style={{...S.td,fontSize:11}}>{new Date(r.date).toLocaleDateString('en-IN')}</td>
            <td style={S.td}><Bdg c={r.type==='customer'?'green':'amber'}>{r.type==='customer'?'Customer Return':'Supplier Return'}</Bdg></td>
            <td style={S.td}><div style={{fontWeight:600}}>{r.customerName||r.supplierName||'—'}</div></td>
            <td style={S.td}>{(r.items||[]).reduce((s,i)=>s+i.qty,0)} pcs</td>
            <td style={{...S.td,...S.mono,fontWeight:700,color:r.type==='customer'?GR:RD}}>{fmt(r.total)}</td>
            <td style={{...S.td,fontSize:11,color:MUT}}>{r.reason||'—'}</td>
          </tr>)}
        </tbody>
      </table>
    </div>}
  </div>;}

/* ── CUSTOMER ACCOUNT VIEW ── */
function CustomerAccount({cust,B,Py,setPy,onClose}){
  const cb=B.filter(b=>b.customerId===cust.id);
  const custPay=Py.filter(p=>cb.some(b=>b.id===p.billId));
  const obAmt=cust.openingBalance||0;
  const tv=cb.reduce((s,b)=>s+b.total,0);
  const tp=custPay.reduce((s,p)=>s+p.amount,0);
  const bal=(obAmt+tv)-tp;
  const upPay=u=>setPy(ps=>ps.map(p=>p.id===u.id?u:p));
  const entries=[
    ...(obAmt>0?[{type:'Opening Balance',date:cust.openingBalanceDate||'2000-01-01',ref:'OB',debit:obAmt,credit:0,id:'ob',payObj:null}]:[]),
    ...cb.map(b=>({type:'Invoice',date:b.date,ref:b.invoiceNo||'#'+b.id,debit:b.total,credit:0,id:'b'+b.id,payObj:null})),
    ...custPay.map(p=>({type:'Payment',date:p.date||p.createdAt,ref:p.mode+(p.chequeNo?' #'+p.chequeNo:'')+(p.upiRef?' '+p.upiRef:''),debit:0,credit:p.amount,id:'p'+p.id,payObj:p})),
  ].sort((a,b)=>new Date(b.date)-new Date(a.date));
  let run=0;const withBal=[...entries].reverse().map(e=>{run+=e.debit-e.credit;return{...e,bal:run}}).reverse();
  return<Modal title={'Account: '+cust.name+(cust.shopname?' — '+cust.shopname:'')} onClose={onClose} wide>
    {obAmt>0&&<div style={{padding:'7px 12px',background:AMBL,borderRadius:7,marginBottom:12,fontSize:12,color:AMB}}>Opening Balance: <strong>{fmt(obAmt)}</strong>{cust.openingBalanceDate?' as of '+new Date(cust.openingBalanceDate).toLocaleDateString('en-IN'):''}</div>}
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:14}}>
      {[['Total Billed',fmt(obAmt+tv),RD,RDL],['Total Paid',fmt(tp),GR,GRL],['Balance Due',fmt(bal),bal>0?RD:GR,bal>0?RDL:GRL]].map(([l,v,c,bg])=><div key={l} style={{background:bg,borderRadius:8,padding:'10px 14px',border:'0.5px solid '+c+'30'}}><div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',color:c+'aa',marginBottom:3}}>{l}</div><div style={{fontSize:20,fontWeight:800,fontFamily:'DM Mono,monospace',color:c}}>{v}</div></div>)}
    </div>
    <div style={{display:'flex',gap:10,fontSize:12,color:MUT,marginBottom:12,flexWrap:'wrap'}}>
      <span>Ph: {cust.phone}</span>{cust.shopname&&<span>Shop: {cust.shopname}</span>}{cust.gst&&<span>GSTIN: <strong style={{color:BL}}>{cust.gst}</strong></span>}{cust.email&&<span>Email: {cust.email}</span>}
    </div>
    <div style={S.h3}>Bills ({cb.length})</div>
    {cb.length===0?<MT msg='No bills yet'/>:<div style={{...S.card,padding:0,marginBottom:14,overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:500}}>
        <thead><tr>{['Invoice','Date','Pcs','Amount','Paid','Balance','Status'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>{cb.map(b=>{const paid=Py.filter(p=>p.billId===b.id).reduce((s,p)=>s+p.amount,0);const bbal=b.total-paid;const st=paid>=b.total?'Paid':paid>0?'Partial':'Unpaid';return<tr key={b.id}><td style={{...S.td,...S.mono,fontWeight:800,fontSize:11}}>{b.invoiceNo||'#'+b.id}</td><td style={{...S.td,fontSize:11}}>{new Date(b.date).toLocaleDateString('en-IN')}</td><td style={{...S.td,textAlign:'right',fontSize:11}}>{(b.items||[]).reduce((s,i)=>s+i.qty,0)}</td><td style={{...S.td,...S.mono,fontWeight:700}}>{fmt(b.total)}</td><td style={{...S.td,...S.mono,color:GR,fontWeight:600}}>{fmt(paid)}</td><td style={{...S.td,...S.mono,fontWeight:700,color:bbal>0?RD:GR}}>{fmt(bbal)}</td><td style={S.td}><Bdg c={{Paid:'green',Partial:'amber',Unpaid:'red'}[st]}>{st}</Bdg></td></tr>;})}
        </tbody>
      </table>
    </div>}
    <div style={S.h3}>Payments ({custPay.length})</div>
    {custPay.length===0?<MT msg='No payments'/>:<div style={{...S.card,padding:0,marginBottom:14,overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:500}}>
        <thead><tr>{['Date','Mode','Amount','City','Reference','Status','Remarks'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>{custPay.map(p=><tr key={p.id}><td style={{...S.td,fontSize:11}}>{p.date?new Date(p.date).toLocaleDateString('en-IN'):'—'}</td><td style={S.td}><Bdg c={p.mode==='Cash'?'green':p.mode==='Cheque'?'amber':'blue'}>{p.mode}</Bdg></td><td style={{...S.td,...S.mono,color:GR,fontWeight:700}}>{fmt(p.amount)}</td><td style={{...S.td,fontSize:11,color:MUT}}>{p.city||'—'}</td><td style={{...S.td,...S.mono,fontSize:10}}>{p.chequeNo?'Chq #'+p.chequeNo:p.upiRef?'UTR: '+p.upiRef:'—'}</td><td style={S.td}>{p.mode==='Cheque'&&p.chequeStatus?<ChequeStatus payment={p} onUpdate={upPay}/>:<span style={{fontSize:11,color:MUT}}>—</span>}</td><td style={{...S.td,fontSize:11,color:MUT}}>{p.remarks||'—'}</td></tr>)}
        </tbody>
      </table>
    </div>}
    <div style={S.h3}>Full Statement</div>
    <div style={{...S.card,padding:0,overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:400}}>
        <thead><tr>{['Date','Type','Reference','Debit','Credit','Balance'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {withBal.map(e=><tr key={e.id} style={{background:e.type==='Opening Balance'?AMBL:''}}>
            <td style={{...S.td,fontSize:11}}>{new Date(e.date).toLocaleDateString('en-IN')}</td>
            <td style={S.td}><Bdg c={e.type==='Invoice'?'red':e.type==='Payment'?'green':'amber'}>{e.type}</Bdg></td>
            <td style={{...S.td,...S.mono,fontSize:11,fontWeight:600}}>{e.ref}</td>
            <td style={{...S.td,...S.mono,color:e.debit>0?RD:MUT,fontWeight:e.debit>0?700:400}}>{e.debit>0?fmt(e.debit):'—'}</td>
            <td style={{...S.td,...S.mono,color:e.credit>0?GR:MUT,fontWeight:e.credit>0?700:400}}>{e.credit>0?fmt(e.credit):'—'}</td>
            <td style={{...S.td,...S.mono,fontWeight:700,color:e.bal>0?RD:GR}}>{fmt(e.bal)}</td>
          </tr>)}
          <tr style={{background:'#f5f4f0',fontWeight:700}}><td colSpan={3} style={S.td}>TOTALS</td><td style={{...S.td,...S.mono,color:RD,fontWeight:800}}>{fmt(obAmt+tv)}</td><td style={{...S.td,...S.mono,color:GR,fontWeight:800}}>{fmt(tp)}</td><td style={{...S.td,...S.mono,fontWeight:800,color:bal>0?RD:GR}}>{fmt(bal)}</td></tr>
        </tbody>
      </table>
    </div>
  </Modal>;}

/* ── CUSTOMERS ── */
function Customers({C,setC,B,Py,setPy,mob}){
  const[show,setShow]=useState(false);const[srch,setSrch]=useState('');const[selCust,setSelCust]=useState(null);
  const[f,setF]=useState({name:'',phone:'',shopname:'',gst:'',addr:'',email:'',openingBalance:'',openingBalanceDate:''});
  const[toast,showT]=useToast();
  const save=async()=>{if(!f.name||!f.phone){showT('Name & phone required','err');return}const nc=await api.post('/api/customers',{...f,openingBalance:+f.openingBalance||0,openingBalanceDate:f.openingBalanceDate||null});setC(cs=>[nc,...cs]);setF({name:'',phone:'',shopname:'',gst:'',addr:'',email:'',openingBalance:'',openingBalanceDate:''});setShow(false);showT('Customer added!');};
  const del=async id=>{if(!confirm('Remove?'))return;await api.del('/api/customers?id='+id);setC(cs=>cs.filter(c=>c.id!==id))};
  const filtered=C.filter(c=>(c.name+' '+(c.phone||'')+' '+(c.shopname||'')+' '+(c.gst||'')).toLowerCase().includes(srch.toLowerCase()));
  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><div style={S.h2}>Customer Master</div><button style={S.btn('pri')} onClick={()=>setShow(s=>!s)}>+ Add Customer</button></div>{toast}
    {show&&<div style={{...S.card,marginBottom:12}}>
      <div style={S.h2}>New Customer</div>
      <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'1fr 1fr',gap:8,marginBottom:8}}>
        <Fld label='Name *'><input style={S.inp} value={f.name} onChange={e=>setF(x=>({...x,name:e.target.value}))} placeholder='Full name'/></Fld>
        <Fld label='Mobile *'><input style={S.inp} value={f.phone} onChange={e=>setF(x=>({...x,phone:e.target.value}))} placeholder='Mobile'/></Fld>
        <Fld label='Shop Name'><input style={S.inp} value={f.shopname} onChange={e=>setF(x=>({...x,shopname:e.target.value}))} placeholder='Business'/></Fld>
        <Fld label='GSTIN'><input style={S.inp} value={f.gst} onChange={e=>setF(x=>({...x,gst:e.target.value}))} placeholder='GST no.'/></Fld>
        <Fld label='Email'><input style={S.inp} value={f.email} onChange={e=>setF(x=>({...x,email:e.target.value}))} placeholder='email@example.com'/></Fld>
        <Fld label='Address/City'><input style={S.inp} value={f.addr} onChange={e=>setF(x=>({...x,addr:e.target.value}))} placeholder='City'/></Fld>
        <Fld label='Opening Balance Rs. (if any)'>
          <input style={S.inp} type='number' value={f.openingBalance} onChange={e=>setF(x=>({...x,openingBalance:e.target.value}))} placeholder='0 (amount they already owe you)'/>
        </Fld>
        <Fld label='Opening Balance Date'>
          <input style={S.inp} type='date' value={f.openingBalanceDate} onChange={e=>setF(x=>({...x,openingBalanceDate:e.target.value}))}/>
        </Fld>
      </div>
      <div style={{display:'flex',gap:8}}><button style={S.btn('pri')} onClick={save}>Save</button><button style={S.btn()} onClick={()=>setShow(false)}>Cancel</button></div>
    </div>}
    <input style={{...S.inp,marginBottom:12}} placeholder='Search by name, mobile, shop or GSTIN...' value={srch} onChange={e=>setSrch(e.target.value)}/>
    <div style={{...S.card,padding:0,overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:mob?400:600}}>
      <thead><tr>{['Customer','Mobile','Shop','Opening Bal','Bills','Total Billed','Paid','Balance',''].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
      <tbody>
        {filtered.length===0&&<tr><td colSpan={9}><MT msg={srch?'No customers match':'No customers yet'}/></td></tr>}
        {filtered.map(c=>{const cb=B.filter(b=>b.customerId===c.id);const tv=cb.reduce((s,b)=>s+b.total,0);const tp=Py.filter(p=>cb.some(b=>b.id===p.billId)).reduce((s,p)=>s+p.amount,0);const ob=c.openingBalance||0;const bal=(ob+tv)-tp;
          return<tr key={c.id} style={{cursor:'pointer'}} onClick={()=>setSelCust(c)}>
            <td style={S.td}><div style={{fontWeight:700,color:BL}}>{c.name}</div>{c.email&&<div style={{fontSize:10,color:MUT}}>{c.email}</div>}</td>
            <td style={{...S.td,...S.mono}}>{c.phone}</td>
            <td style={{...S.td,fontSize:11}}>{c.shopname||'—'}</td>
            <td style={{...S.td,...S.mono,fontSize:11,color:ob>0?AMB:MUT,fontWeight:ob>0?700:400}}>{ob>0?fmt(ob):'—'}</td>
            <td style={S.td}><Bdg c='blue'>{cb.length}</Bdg></td>
            <td style={{...S.td,...S.mono,fontWeight:600}}>{fmt(ob+tv)}</td>
            <td style={{...S.td,...S.mono,color:GR,fontWeight:600}}>{fmt(tp)}</td>
            <td style={{...S.td,...S.mono,fontWeight:700,color:bal>0?RD:GR}}>{fmt(bal)}</td>
            <td style={S.td} onClick={e=>e.stopPropagation()}>
              <div style={{display:'flex',gap:4}}>
                <button style={S.btn('gho',true)} onClick={()=>setSelCust(c)}>Account</button>
                <button style={S.btn('dan',true)} onClick={()=>del(c.id)}>Remove</button>
              </div>
            </td>
          </tr>;})}
      </tbody>
    </table></div>
    <div style={{marginTop:8,fontSize:11,color:MUT}}>Click any row to view full account — bills, payments and running balance.</div>
    {selCust&&<CustomerAccount cust={selCust} B={B} Py={Py} setPy={setPy} onClose={()=>setSelCust(null)}/>}
  </div>;}

/* ── LEDGER ── */
function Ledger({B,Py,setPy,C,Ret,mob}){
  const[fp,setFp]=useState('');const[ft,setFt]=useState('All');const[selCust,setSelCust]=useState(null);
  const upPay=u=>setPy(ps=>ps.map(p=>p.id===u.id?u:p));
  const all=[
    ...B.map(b=>({tp:'Invoice',date:b.date,ref:b.invoiceNo||'#'+b.id,party:b.customerName,customerId:b.customerId,debit:b.total,credit:0,mode:'',bilty:b.biltyNo||'',id:'b'+b.id,payObj:null})),
    ...Py.map(p=>({tp:'Payment',date:p.date||p.createdAt,ref:p.mode+(p.chequeNo?' #'+p.chequeNo:'')+(p.upiRef?' '+p.upiRef:''),party:p.partyName,customerId:null,debit:0,credit:p.amount,mode:p.mode,bilty:'',id:'p'+p.id,payObj:p})),
    ...(Ret||[]).map(r=>({tp:r.type==='customer'?'Cust. Return':'Supp. Return',date:r.date,ref:'RET-'+r.id,party:r.customerName||r.supplierName||'',customerId:r.customerId,debit:r.type==='supplier'?r.total:0,credit:r.type==='customer'?r.total:0,mode:'',bilty:'',id:'r'+r.id,payObj:null})),
    ...C.filter(c=>c.openingBalance>0).map(c=>({tp:'Opening Balance',date:c.openingBalanceDate||'2000-01-01',ref:'OB',party:c.name,customerId:c.id,debit:c.openingBalance||0,credit:0,mode:'',bilty:'',id:'ob'+c.id,payObj:null})),
  ].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const rows=all.filter(e=>{const pok=!fp||(e.party||'').toLowerCase().includes(fp.toLowerCase());const tok=ft==='All'||e.tp===ft||((ft==='Invoice'&&e.tp==='Opening Balance'));return pok&&tok;});
  let run=0;const withBal=[...rows].reverse().map(e=>{run+=e.debit-e.credit;return{...e,bal:run}}).reverse();
  const tD=rows.reduce((s,e)=>s+e.debit,0),tC=rows.reduce((s,e)=>s+e.credit,0);
  const parties=[...new Set(all.map(e=>e.party).filter(Boolean))].sort();
  return<div>
    <div style={S.h2}>Ledger / Statement</div>
    <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'repeat(3,1fr)',gap:12,marginBottom:14}}>
      {[['Total Invoiced',fmt(tD),RD,RDL],['Total Received',fmt(tC),GR,GRL],['Net Outstanding',fmt(tD-tC),tD-tC>0?RD:GR,tD-tC>0?RDL:GRL]].map(([l,v,c,bg])=><div key={l} style={{...S.met,background:bg,border:'0.5px solid '+c+'30'}}><div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',color:c+'aa',marginBottom:3}}>{l}</div><div style={{fontSize:22,fontWeight:800,...S.mono,color:c}}>{v}</div></div>)}
    </div>
    <div style={{display:'flex',gap:10,marginBottom:10,flexWrap:'wrap',alignItems:'center'}}>
      <input style={{...S.inp,maxWidth:240}} placeholder='Search by party name...' value={fp} onChange={e=>setFp(e.target.value)}/>
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        {['All','Invoice','Payment','Cust. Return','Supp. Return'].map(t=><button key={t} onClick={()=>setFt(t)} style={{padding:'5px 12px',borderRadius:20,border:'0.5px solid '+(ft===t?BL:BORD),background:ft===t?BL:'#fff',color:ft===t?'#fff':MUT,cursor:'pointer',fontSize:11,fontWeight:600}}>{t}</button>)}
      </div>
      {fp&&<button onClick={()=>setFp('')} style={{...S.btn('dan',true),fontSize:11}}>Clear</button>}
    </div>
    {!fp&&parties.length>0&&<div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:10}}>
      <span style={{fontSize:11,color:MUT,alignSelf:'center'}}>Quick filter:</span>
      {parties.slice(0,12).map(p=>{const cust=C&&C.find(c=>c.name===p);return<button key={p} onClick={()=>setFp(p)} style={{padding:'3px 10px',borderRadius:20,border:'0.5px solid '+BORD,background:'#fff',color:TXT,cursor:'pointer',fontSize:11}}>{p}{cust?<span style={{color:BL,marginLeft:3,fontSize:9}}>view</span>:null}</button>;})}
      {parties.length>12&&<span style={{fontSize:11,color:MUT,alignSelf:'center'}}>+{parties.length-12} more</span>}
    </div>}
    {fp&&(()=>{
      const partyRows=all.filter(e=>(e.party||'').toLowerCase()===fp.toLowerCase());if(partyRows.length===0)return null;
      const pD=partyRows.reduce((s,e)=>s+e.debit,0),pC=partyRows.reduce((s,e)=>s+e.credit,0);
      const cust=C&&C.find(c=>c.name.toLowerCase()===fp.toLowerCase());
      return<div style={{...S.card,marginBottom:12,background:BLL,border:'0.5px solid '+BL+'40'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
          <div><div style={{fontWeight:700,fontSize:14,color:BL,marginBottom:3}}>{fp}</div>{cust&&<div style={{fontSize:11,color:MUT}}>{cust.phone}{cust.shopname?' — '+cust.shopname:''}{cust.gst?' | GSTIN: '+cust.gst:''}</div>}</div>
          <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
            {[['Invoiced',fmt(pD),RD],['Received',fmt(pC),GR],['Balance',fmt(pD-pC),pD-pC>0?RD:GR]].map(([l,v,c])=><div key={l} style={{textAlign:'right'}}><div style={{fontSize:10,color:MUT,textTransform:'uppercase',fontWeight:700}}>{l}</div><div style={{fontSize:16,fontWeight:800,...S.mono,color:c}}>{v}</div></div>)}
            {cust&&<button style={S.btn('gho',true)} onClick={()=>setSelCust(cust)}>Full Account</button>}
          </div>
        </div>
      </div>;})()}
    <div style={{...S.card,padding:0,overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:mob?500:700}}>
      <thead><tr>{['Date','Type','Reference','Party','Debit','Credit','Mode/Status','Balance'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
      <tbody>
        {rows.length===0&&<tr><td colSpan={8}><MT msg='No transactions found'/></td></tr>}
        {withBal.map(e=><tr key={e.id} style={{background:e.tp==='Opening Balance'?AMBL:''}}>
          <td style={{...S.td,fontSize:11}}>{new Date(e.date).toLocaleDateString('en-IN')}</td>
          <td style={S.td}><Bdg c={e.tp==='Invoice'||e.tp==='Opening Balance'?'red':e.tp==='Payment'?'green':e.tp==='Cust. Return'?'green':'amber'}>{e.tp}</Bdg></td>
          <td style={{...S.td,...S.mono,fontSize:10,fontWeight:600}}>{e.ref}</td>
          <td style={S.td}>
            <div style={{fontWeight:600,fontSize:12}}>{e.party}</div>
            {e.tp==='Invoice'&&e.customerId&&C&&<button onClick={()=>{const c=C.find(x=>x.id===e.customerId);if(c)setSelCust(c);}} style={{background:'none',border:'none',cursor:'pointer',color:BL,fontSize:9,padding:0,textDecoration:'underline'}}>account</button>}
          </td>
          <td style={{...S.td,...S.mono,color:e.debit>0?RD:MUT,fontWeight:e.debit>0?700:400}}>{e.debit>0?fmt(e.debit):'—'}</td>
          <td style={{...S.td,...S.mono,color:e.credit>0?GR:MUT,fontWeight:e.credit>0?700:400}}>{e.credit>0?fmt(e.credit):'—'}</td>
          <td style={S.td}>{e.tp==='Payment'&&e.payObj&&e.payObj.mode==='Cheque'?<ChequeStatus payment={e.payObj} onUpdate={upPay}/>:<span style={{fontSize:11,color:MUT}}>{e.mode||'—'}</span>}</td>
          <td style={{...S.td,...S.mono,fontWeight:700,color:e.bal>0?RD:GR}}>{fmt(e.bal)}</td>
        </tr>)}
        <tr style={{background:'#f5f4f0',fontWeight:700}}>
          <td colSpan={4} style={S.td}>TOTALS ({rows.length} entries)</td>
          <td style={{...S.td,...S.mono,color:RD,fontWeight:800}}>{fmt(tD)}</td>
          <td style={{...S.td,...S.mono,color:GR,fontWeight:800}}>{fmt(tC)}</td>
          <td colSpan={2} style={{...S.td,...S.mono,fontWeight:800,color:tD-tC>0?RD:GR}}>Net: {fmt(tD-tC)}</td>
        </tr>
      </tbody>
    </table></div>
    {selCust&&<CustomerAccount cust={selCust} B={B} Py={Py} setPy={setPy} onClose={()=>setSelCust(null)}/>}
  </div>;}

/* ── SETTINGS ── */
function Settings({firm,saveFirm,ses,mob}){
  const[f,setF]=useState(firm);const[saved,setSaved]=useState(false);const[logoUploading,setLogoUploading]=useState(false);
  const up=k=>v=>setF(x=>({...x,[k]:v}));
  const save=()=>{saveFirm(f);setSaved(true);setTimeout(()=>setSaved(false),2500)};
  const handleLogo=e=>{const file=e.target.files[0];if(!file)return;setLogoUploading(true);const r=new FileReader();r.onload=ev=>{setF(x=>({...x,logo:ev.target.result}));setLogoUploading(false);};r.readAsDataURL(file);};
  const removeLogo=()=>setF(x=>({...x,logo:''}));
  return<div>
    <div style={S.h2}>Settings</div>
    {ses&&<div style={{padding:'7px 12px',background:BLL,borderRadius:7,marginBottom:14,fontSize:12,color:BL}}>Logged in as <strong>{ses.user?.email}</strong></div>}
    <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'1fr 1fr',gap:14}}>
      <div>
        <div style={S.card}>
          <div style={S.h3}>Firm / Shop Details</div>
          <Fld label='Firm Name *'><input style={S.inp} value={f.name} onChange={e=>up('name')(e.target.value)} placeholder='Your Firm Name'/></Fld>
          <Fld label='Business Type'><input style={S.inp} value={f.shoptype||''} onChange={e=>up('shoptype')(e.target.value)} placeholder='Wholesale Clothing'/></Fld>
          <Fld label='GSTIN'><input style={S.inp} value={f.gstin||''} onChange={e=>up('gstin')(e.target.value)} placeholder='23AAAAA0000A1Z5'/></Fld>
          <Fld label='Mobile Number'><input style={S.inp} value={f.mobile||''} onChange={e=>up('mobile')(e.target.value)} placeholder='Mobile'/></Fld>
          <Fld label='Email (shown on invoice)'><input style={S.inp} value={f.email||''} onChange={e=>up('email')(e.target.value)} placeholder='firm@email.com'/></Fld>
          <Fld label='Sender Email (for sending invoices)'><input style={S.inp} value={f.senderEmail||''} onChange={e=>up('senderEmail')(e.target.value)} placeholder='sender@gmail.com'/></Fld>
          <Fld label='State (for GST place of supply)'><input style={S.inp} value={f.state||''} onChange={e=>up('state')(e.target.value)} placeholder='Madhya Pradesh'/></Fld>
          <Fld label='Full Address'><textarea style={{...S.inp,resize:'vertical'}} rows={3} value={f.address||''} onChange={e=>up('address')(e.target.value)} placeholder='Shop address, city, PIN'/></Fld>
        </div>
        <div style={{...S.card,marginTop:14}}>
          <div style={S.h3}>Firm Logo (optional, shown on invoice)</div>
          {f.logo?<div style={{marginBottom:10}}><img src={f.logo} alt='Logo' style={{maxHeight:80,maxWidth:220,border:'0.5px solid '+BORD,borderRadius:6,padding:4}}/><br/><button style={{...S.btn('dan',true),marginTop:6}} onClick={removeLogo}>Remove Logo</button></div>:null}
          <label style={{...S.btn('def'),cursor:'pointer',display:'inline-flex'}}>
            <input type='file' accept='image/*' style={{display:'none'}} onChange={handleLogo}/>
            {logoUploading?<><Spin/> Uploading...</>:'Upload Logo (PNG/JPG)'}
          </label>
          <div style={{fontSize:11,color:MUT,marginTop:6}}>Recommended: 200x60px, transparent background. Stored locally.</div>
        </div>
        <div style={{...S.card,marginTop:14}}>
          <div style={S.h3}>Gemini AI Key (for invoice scanning)</div>
          <Fld label='Google Gemini API Key'><input style={{...S.inp,fontFamily:'monospace'}} type='password' value={f.geminiKey||''} onChange={e=>up('geminiKey')(e.target.value)} placeholder='AIzaSy...'/></Fld>
          <div style={{fontSize:11,color:MUT,marginTop:4}}>Free at aistudio.google.com — 1M tokens/day on free tier</div>
        </div>
      </div>
      <div>
        <div style={S.card}>
          <div style={S.h3}>Invoice Settings</div>
          <Fld label='Invoice Prefix'><input style={S.inp} value={f.invoicePrefix||'INV'} onChange={e=>up('invoicePrefix')(e.target.value)} placeholder='INV'/></Fld>
          <div style={{fontSize:11,color:MUT,marginTop:2,marginBottom:12}}>Format: INV/2025/0001, INV/2025/0002...</div>
          <div style={S.h3}>Bank Details (printed on invoice)</div>
          <Fld label='Bank Name'><input style={S.inp} value={f.bankName||''} onChange={e=>up('bankName')(e.target.value)} placeholder='SBI, HDFC...'/></Fld>
          <Fld label='Account Number'><input style={S.inp} value={f.bankAccount||''} onChange={e=>up('bankAccount')(e.target.value)} placeholder='Account number'/></Fld>
          <Fld label='IFSC Code'><input style={S.inp} value={f.bankIFSC||''} onChange={e=>up('bankIFSC')(e.target.value)} placeholder='SBIN0001234'/></Fld>
        </div>
        <div style={{...S.card,marginTop:14}}>
          <div style={S.h3}>Email Template</div>
          <div style={{fontSize:11,color:BL,background:BLL,padding:'6px 10px',borderRadius:6,marginBottom:8}}>Variables: {'{customerName} {invoiceNo} {date} {amount} {firmName} {mobile}'}</div>
          <Fld label='Email Subject'><input style={S.inp} value={f.emailSubject||''} onChange={e=>up('emailSubject')(e.target.value)} placeholder='Invoice {invoiceNo} from {firmName}'/></Fld>
          <Fld label='Email Body'><textarea style={{...S.inp,resize:'vertical',fontSize:12}} rows={6} value={f.emailBody||''} onChange={e=>up('emailBody')(e.target.value)} placeholder='Dear {customerName}, ...'/></Fld>
        </div>
        <div style={{...S.card,marginTop:14}}>
          <div style={S.h3}>Terms and Conditions (printed on every invoice)</div>
          <textarea style={{...S.inp,resize:'vertical',fontSize:12}} rows={6} value={f.terms||''} onChange={e=>up('terms')(e.target.value)} placeholder='Enter terms, one per line...'/>
        </div>
        <div style={{display:'flex',gap:10,marginTop:12,alignItems:'center'}}><button style={S.btn('pri')} onClick={save}>Save All Settings</button>{saved&&<span style={{color:GR,fontSize:13,fontWeight:700}}>Saved!</span>}</div>
      </div>
    </div>
  </div>;}
