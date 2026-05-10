'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ModernLogin from '@/components/auth/modern-login';
import UserMenu from '@/components/ui/user-menu';
import BillingDashboard from '@/components/BillingDashboard';
import TrialExtensionModal from '@/components/TrialExtensionModal';
import UpgradeBlockModal from '@/components/UpgradeBlockModal';
import BillingPopup from '@/components/BillingPopup';
import SupportTickets from '@/components/SupportTickets';

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

/* ── Interest calculation — 12% p.a. after 60 days ── */
const calcInterest=(amount, fromDate, rate=12)=>{
  if(!amount||amount<=0)return 0;
  const from=new Date(fromDate);
  const today=new Date();
  const days=Math.floor((today-from)/(1000*60*60*24));
  if(days<=60)return 0;
  const interestDays=days-60;
  return +(amount*(rate/100)*(interestDays/365)).toFixed(2);
};
const qrU=(d,s=80)=>'/api/qr?data='+encodeURIComponent(d)+'&size='+s;
const isBR=typeof window!=='undefined';
const getToken=async()=>{const{data:{session}}=await supabase.auth.getSession();return session?.access_token||'';};
// activeFirm stored in module-level var so api helper can access it without prop drilling
let _activeFirmId=null;
let _theme='minimal';
const setActiveFirmId=id=>{_activeFirmId=id;};
const authH=async()=>{const h={'Content-Type':'application/json','Authorization':'Bearer '+(await getToken())};if(_activeFirmId)h['x-firm-id']=_activeFirmId;return h;};
const api={
  get:async u=>{const res=await fetch(u,{headers:await authH()});if(!res.ok)throw new Error(`HTTP ${res.status}: ${res.statusText}`);return res.json();},
  post:async(u,b)=>{const res=await fetch(u,{method:'POST',headers:await authH(),body:JSON.stringify(b)});if(!res.ok)throw new Error(`HTTP ${res.status}: ${res.statusText}`);return res.json();},
  put:async(u,b)=>{const res=await fetch(u,{method:'PUT',headers:await authH(),body:JSON.stringify(b)});if(!res.ok)throw new Error(`HTTP ${res.status}: ${res.statusText}`);return res.json();},
  patch:async(u,b)=>{const res=await fetch(u,{method:'PATCH',headers:await authH(),body:JSON.stringify(b)});if(!res.ok)throw new Error(`HTTP ${res.status}: ${res.statusText}`);return res.json();},
  del:async u=>{const res=await fetch(u,{method:'DELETE',headers:await authH()});if(!res.ok)throw new Error(`HTTP ${res.status}: ${res.statusText}`);return res.json();},
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
const MINIMAL_S={
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

const MODERN_S={
  card:{background:'rgba(255,255,255,0.75)',border:'1px solid rgba(255,255,255,0.95)',borderRadius:18,padding:'20px 24px',boxShadow:'0 16px 48px rgba(15,23,42,0.12)',backdropFilter:'blur(16px)'},
  h2:{fontSize:17,fontWeight:800,marginBottom:16,letterSpacing:'-0.4px',color:'#0F172A'},
  h3:{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'#94A3B8',marginBottom:10},
  met:{background:'linear-gradient(135deg, rgba(255,255,255,0.85), rgba(255,255,255,0.7))',borderRadius:16,padding:'18px 22px',backdropFilter:'blur(12px)',border:'1.5px solid rgba(255,255,255,0.9)',boxShadow:'0 8px 32px rgba(15,23,42,0.08)'},
  btn:(v,sm)=>{const m={def:{bg:'rgba(255,255,255,0.9)',co:'#334155',bo:'1px solid rgba(148,163,184,0.3)',sh:'0 2px 8px rgba(0,0,0,0.06)'},pri:{bg:'linear-gradient(135deg, #1B5E8A, #2980b9)',co:'#fff',bo:'1px solid rgba(255,255,255,0.2)',sh:'0 8px 24px rgba(27,94,138,0.35)',bd:'blur(8px)'},suc:{bg:'linear-gradient(135deg, #2E6B1F, #27ae60)',co:'#fff',bo:'1px solid rgba(255,255,255,0.2)',sh:'0 8px 24px rgba(46,107,31,0.3)',bd:'blur(8px)'},dan:{bg:'linear-gradient(135deg, #9B2626, #e74c3c)',co:'#fff',bo:'1px solid rgba(255,255,255,0.2)',sh:'0 8px 24px rgba(155,38,38,0.3)',bd:'blur(8px)'},amb:{bg:'linear-gradient(135deg, #B8690A, #e67e22)',co:'#fff',bo:'1px solid rgba(255,255,255,0.2)',sh:'0 8px 24px rgba(184,105,10,0.3)',bd:'blur(8px)'},gho:{bg:'rgba(255,255,255,0.1)',co:'#1B5E8A',bo:'1.5px solid rgba(27,94,138,0.5)',sh:'0 4px 12px rgba(27,94,138,0.15)',bd:'blur(4px)'},pur:{bg:'linear-gradient(135deg, #5B3E8F, #8e44ad)',co:'#fff',bo:'1px solid rgba(255,255,255,0.2)',sh:'0 8px 24px rgba(91,62,143,0.3)',bd:'blur(8px)'}};const v2=m[v]||m.def;return{background:v2.bg,color:v2.co,border:v2.bo,padding:sm?'5px 12px':'8px 18px',borderRadius:12,cursor:'pointer',fontSize:sm?11:13,fontWeight:600,display:'inline-flex',alignItems:'center',gap:6,whiteSpace:'nowrap',boxShadow:v2.sh,transition:'all 0.3s ease',backdropFilter:v2.bd||'none'};},
  inp:{width:'100%',padding:'10px 14px',border:'1.5px solid rgba(148,163,184,0.35)',borderRadius:12,fontSize:13,background:'rgba(255,255,255,0.85)',color:'#0F172A',outline:'none',boxSizing:'border-box',backdropFilter:'blur(8px)',transition:'all 0.2s ease',boxShadow:'0 4px 12px rgba(15,23,42,0.06)'},
  lbl:{display:'block',fontSize:11,fontWeight:700,color:'#64748B',marginBottom:4,letterSpacing:'0.3px'},
  th:{textAlign:'left',padding:'10px 12px',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#94A3B8',borderBottom:'1px solid rgba(148,163,184,0.15)',background:'rgba(248,250,252,0.8)'},
  td:{padding:'10px 12px',borderBottom:'1px solid rgba(148,163,184,0.08)',verticalAlign:'middle'},
  mono:{fontFamily:"'DM Mono', monospace",fontSize:12},
};

const getStyle=(minimalStyle,modernStyle)=>_theme==='modern'?modernStyle:minimalStyle;
const S=MINIMAL_S;

/* ── mini helpers ── */
function Bdg({c,children}){const m={green:[GRL,GR],amber:[AMBL,AMB],red:[RDL,RD],blue:[BLL,BL],gray:['#F1EFE8','#555'],purple:[PURL,PUR]};const[bg,co]=m[c]||m.gray;return<span style={_theme==='modern'?{background:bg,color:co,padding:'3px 8px',borderRadius:6,fontSize:11,fontWeight:600,display:'inline-block',letterSpacing:'0.3px'}:{background:bg,color:co,padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:700,display:'inline-block'}}>{children}</span>;}
function Fld({label,children,span2}){return<div style={{marginBottom:8,gridColumn:span2?'span 2':'auto'}}><label style={S.lbl}>{label}</label>{children}</div>}
function MT({msg='Nothing here yet'}){return<div style={{textAlign:'center',padding:'28px',color:MUT,fontSize:13}}>{msg}</div>}
function Spin(){return<span style={{width:14,height:14,border:'2px solid rgba(27,94,138,.3)',borderTopColor:BL,borderRadius:'50%',animation:'spin .7s linear infinite',display:'inline-block'}}/>}
function useToast(){const[t,setT]=useState(null);const show=(msg,tp='ok')=>{setT({msg,tp});setTimeout(()=>setT(null),3500)};const el=t&&<div style={{padding:'9px 14px',borderRadius:8,fontSize:13,fontWeight:500,marginBottom:10,background:t.tp==='ok'?GRL:RDL,color:t.tp==='ok'?GR:RD}}>{t.msg}</div>;return[el,show];}
function Modal({title,onClose,children,wide}){
  const ww=isBR?window.innerWidth:1200;
  const mob=ww<600;
  const modernStyle=_theme==='modern'?{background:'rgba(255,255,255,0.92)',backdropFilter:'blur(24px)',borderRadius:mob?'20px 20px 0 0':'20px',border:'1px solid rgba(255,255,255,0.9)',boxShadow:'0 24px 80px rgba(15,23,42,0.15)'}:{background:'#fff',borderRadius:mob?'16px 16px 0 0':'14px',boxShadow:'0 24px 80px rgba(0,0,0,.25)'};
  return<div style={{position:'fixed',inset:0,background:_theme==='modern'?'rgba(0,0,0,.3)':'rgba(0,0,0,.5)',zIndex:600,display:'flex',alignItems:mob?'flex-end':'center',justifyContent:'center',padding:mob?0:16}}>
    <div style={{width:'100%',maxWidth:mob?'100%':wide?780:520,maxHeight:mob?'92vh':'92vh',overflowY:'auto',...modernStyle}}>
      <div style={{padding:'13px 20px',borderBottom:_theme==='modern'?'1px solid rgba(148,163,184,0.15)':'0.5px solid '+BORD,display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:_theme==='modern'?'rgba(255,255,255,0.9)':'#fff'}}><span style={{fontWeight:700,fontSize:14}}>{title}</span><button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:MUT}}>x</button></div>
      <div style={{padding:'16px 20px'}}>{children}</div>
    </div>
  </div>;
}
function CatTabs({value,onChange,counts}){return<div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:10}}>{CATS.map(c=><button key={c} onClick={()=>onChange(c)} style={{padding:'3px 11px',borderRadius:20,border:'0.5px solid '+(value===c?BL:BORD),background:value===c?BL:'#fff',color:value===c?'#fff':MUT,cursor:'pointer',fontSize:11,fontWeight:600}}>{c}{c!=='All'&&counts&&<span style={{opacity:.7,fontSize:9}}> {counts[c]||0}</span>}</button>)}</div>;}

const DEF={name:'Your Firm Name',shoptype:'Wholesale Clothing',gstin:'',address:'Shop Address, City, State',mobile:'',email:'',senderEmail:'',state:'Madhya Pradesh',bankName:'',bankAccount:'',bankIFSC:'',invoicePrefix:'INV',logo:'',emailSubject:'Invoice {invoiceNo} from {firmName}',emailBody:'Dear {customerName},\n\nPlease find your invoice {invoiceNo} dated {date} for {amount}.\n\nThank you for your business!\n\nWarm regards,\n{firmName}\n{mobile}',terms:'1. Goods once sold will not be taken back.\n2. Payment due within 45 days.\n3. Add 18% interest if payment not done in 45 days.\n4. Cheques subject to realisation.\n5. Subject to local jurisdiction.'};


/* ── FIRM DROPDOWN ── */
function FirmDropdown({activeFirm,firms,onSwitch,onAdd,onRefresh}){
  const[open,setOpen]=useState(false);
  const ref=useRef(null);
  const ROLE_C={owner:BL,manager:GR,accountant:AMB,staff:MUT};

  useEffect(()=>{
    const handler=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener('mousedown',handler);
    return()=>document.removeEventListener('mousedown',handler);
  },[]);

  return<div ref={ref} style={{position:'relative'}}>
    <button onClick={()=>{setOpen(o=>!o);if(!open&&onRefresh)onRefresh();}} style={_theme==='modern'?{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',border:'1px solid rgba(148,163,184,0.3)',borderRadius:8,background:'rgba(255,255,255,0.15)',cursor:'pointer',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.9)',backdropFilter:'blur(8px)',transition:'all 0.2s ease'}:{display:'flex',alignItems:'center',gap:6,padding:'4px 10px',border:'0.5px solid '+BORD,borderRadius:7,background:'#fff',cursor:'pointer',fontSize:12,fontWeight:600,color:TXT}} onMouseEnter={e=>{if(_theme==='modern')e.currentTarget.style.background='rgba(255,255,255,0.25)'}} onMouseLeave={e=>{if(_theme==='modern')e.currentTarget.style.background='rgba(255,255,255,0.15)'}}>
      <span style={{width:7,height:7,borderRadius:'50%',background:_theme==='modern'?(activeFirm?'#60a5fa':'rgba(255,255,255,0.3)'):activeFirm?BL:'#ccc',display:'inline-block'}}/>
      <span style={{maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{activeFirm?.name||'No Firm'}</span>
      {activeFirm&&<span style={_theme==='modern'?{fontSize:9,background:'rgba(96,165,250,0.2)',color:'#60a5fa',padding:'1px 5px',borderRadius:8,fontWeight:700}:{fontSize:9,background:BLL,color:BL,padding:'1px 5px',borderRadius:8,fontWeight:700}}>{activeFirm.role}</span>}
      <span style={{fontSize:9,color:_theme==='modern'?'rgba(255,255,255,0.6)':MUT,marginLeft:2}}>▼</span>
    </button>
    {open&&<div style={_theme==='modern'?{position:'absolute',right:0,top:'calc(100% + 8px)',background:'rgba(15,23,42,0.92)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:12,boxShadow:'0 24px 48px rgba(0,0,0,0.25)',backdropFilter:'blur(12px)',zIndex:500,minWidth:240,overflow:'hidden'}:{position:'absolute',right:0,top:'calc(100% + 4px)',background:'#fff',border:'0.5px solid '+BORD,borderRadius:10,boxShadow:'0 8px 30px rgba(0,0,0,.12)',zIndex:500,minWidth:220,overflow:'hidden'}}>
      {/* Current firm */}
      <div style={_theme==='modern'?{padding:'10px 16px',background:'rgba(255,255,255,0.05)',borderBottom:'1px solid rgba(255,255,255,0.1)'}:{padding:'8px 12px',background:BLL,borderBottom:'0.5px solid '+BORD}}>
        <div style={_theme==='modern'?{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.6)',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:2}:{fontSize:10,fontWeight:700,color:MUT,textTransform:'uppercase',letterSpacing:'.6px',marginBottom:2}}>Current Firm</div>
        <div style={_theme==='modern'?{fontWeight:700,color:'rgba(255,255,255,0.95)',fontSize:13}:{fontWeight:700,color:BL,fontSize:13}}>{activeFirm?.name}</div>
        <div style={_theme==='modern'?{fontSize:11,color:'rgba(255,255,255,0.7)'}:{fontSize:11,color:MUT}}>Your role: <strong style={_theme==='modern'?{color:'#60a5fa'}:{color:ROLE_C[activeFirm?.role]||MUT}}>{activeFirm?.role}</strong></div>
      </div>
      {/* Other firms */}
      {firms.filter(f=>f.id!==activeFirm?.id).length>0&&<div style={_theme==='modern'?{borderBottom:'1px solid rgba(255,255,255,0.1)'}:{borderBottom:'0.5px solid '+BORD}}>
        <div style={_theme==='modern'?{padding:'8px 16px 4px',fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.6)',textTransform:'uppercase',letterSpacing:'.6px'}:{padding:'6px 12px 2px',fontSize:10,fontWeight:700,color:MUT,textTransform:'uppercase',letterSpacing:'.6px'}}>Switch to</div>
        {firms.filter(f=>f.id!==activeFirm?.id).map(f=><div key={f.id} onClick={()=>{onSwitch(f);setOpen(false);}} style={_theme==='modern'?{padding:'10px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:8,transition:'background .15s'}:{padding:'8px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:8,transition:'background .15s'}} onMouseEnter={e=>e.currentTarget.style.background=_theme==='modern'?'rgba(255,255,255,0.08)':BG} onMouseLeave={e=>e.currentTarget.style.background=_theme==='modern'?'transparent':'#fff'}>
          <span style={{width:6,height:6,borderRadius:'50%',background:_theme==='modern'?'#60a5fa':ROLE_C[f.role]||MUT,flexShrink:0}}/>
          <span style={{flex:1,fontWeight:600,fontSize:12,color:_theme==='modern'?'rgba(255,255,255,0.9)':'#1A1A18'}}>{f.name}</span>
          <span style={_theme==='modern'?{fontSize:9,background:'rgba(96,165,250,0.2)',color:'#60a5fa',padding:'1px 6px',borderRadius:8}:{fontSize:9,background:BG,color:MUT,padding:'1px 6px',borderRadius:8}}>{f.role}</span>
        </div>)}
      </div>}
      {/* Add firm */}
      <div onClick={()=>{onAdd();setOpen(false);}} style={_theme==='modern'?{padding:'10px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:8,color:'#60a5fa',fontWeight:600,fontSize:12,transition:'background .15s'}:{padding:'9px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:8,color:BL,fontWeight:600,fontSize:12}} onMouseEnter={e=>e.currentTarget.style.background=_theme==='modern'?'rgba(96,165,250,0.15)':BG} onMouseLeave={e=>e.currentTarget.style.background=_theme==='modern'?'transparent':'#fff'}>
        <span style={{width:16,height:16,borderRadius:'50%',border:_theme==='modern'?'1.5px solid #60a5fa':'1.5px solid '+BL,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:_theme==='modern'?'#60a5fa':BL,flexShrink:0}}>+</span>
        Add New Firm
      </div>
    </div>}
  </div>;
}

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
  const[page,setPage]=useState(()=>isBR?sessionStorage.getItem('shopos_page')||'dash':'dash');
  const[theme,setTheme]=useState(()=>isBR?localStorage.getItem('shopos_theme')||'minimal':'minimal');
  // Persist page across Fast Refresh in dev
  useEffect(()=>{if(isBR)sessionStorage.setItem('shopos_page',page);},[page]);
  useEffect(()=>{if(isBR)localStorage.setItem('shopos_theme',theme);_theme=theme;},[theme]);
  const[P,setP]=useState([]);const[C,setC]=useState([]);const[B,setB]=useState([]);const[Py,setPy]=useState([]);const[Ret,setRet]=useState([]);
  const[BS,setBS]=useState([]);const[SS,setSS]=useState([]);
  const[firms,setFirms]=useState([]);const[activeFirm,setActiveFirm]=useState(null);
  const setActiveFirmPersist=f=>{setActiveFirm(f);if(f&&isBR)sessionStorage.setItem('shopos_firm_id',f.id);};
  const[SI,setSI]=useState([]); // supplier invoices // {id,name,role,isOwner}
  const[ld,setLd]=useState(true);
  const dataLoaded=useRef(false); // prevent reload on TOKEN_REFRESHED
  const[firm,setFirm]=useState(DEF);
  const[seq,setSeq]=useState(1);
  const[firmLoading,setFirmLoading]=useState(true);
  const[vBill,setVBill]=useState(null);
  const[org,setOrg]=useState(null);
  const[showTrialExtend,setShowTrialExtend]=useState(false);
  const[showUpgradeBlock,setShowUpgradeBlock]=useState(false);
  const[showBillingPopup,setShowBillingPopup]=useState(false);
  const[announcements,setAnnouncements]=useState([]);
  const[dismissedAnnouncements,setDismissedAnnouncements]=useState(()=>isBR?JSON.parse(localStorage.getItem('dismissed_announcements')||'[]'):[]);
  const ww=useWW();const mob=ww<768;const tab=ww<1024;

  useEffect(()=>{supabase.auth.getSession().then(({data:{session}})=>{setSes(session);setAl(false);});const{data:{subscription}}=supabase.auth.onAuthStateChange((event,s)=>{if(event==='SIGNED_OUT'){setSes(null);}else if(s){setSes(s);}});return()=>subscription.unsubscribe();},[]);

  // ── Prevent page reload when tab loses/regains focus ──
  useEffect(()=>{
    // Block browser from unloading the page when switching tabs
    const onVisibility=()=>{if(document.visibilityState==='visible'){/* just return focus, do nothing */}};
    const onBeforeUnload=e=>{
      // Only warn if there's active cart data
      if(isBR){
        const hasCart=sessionStorage.getItem('shopos_cart_active');
        if(hasCart){e.preventDefault();e.returnValue='';return e.returnValue;}
      }
    };
    document.addEventListener('visibilitychange',onVisibility);
    window.addEventListener('beforeunload',onBeforeUnload);
    return()=>{
      document.removeEventListener('visibilitychange',onVisibility);
      window.removeEventListener('beforeunload',onBeforeUnload);
    };
  },[]);
  // Check trial/subscription status
  useEffect(()=>{
    if(!ses)return;
    const checkTrial=async()=>{
      try{
        const token=(await supabase.auth.getSession()).data.session?.access_token;
        if(!token)return;
        const res=await fetch('/api/subscription-payments/status',{headers:{'Authorization':`Bearer ${token}`}});
        const data=await res.json();
        setOrg(data);
        if(data.status==='trial'&&data.trialDaysRemaining<=0){setShowUpgradeBlock(true);}
        else if(data.status==='trial'&&data.trialDaysRemaining<=7){setShowTrialExtend(true);}
      }catch(e){console.error('Failed to check trial:',e);}
    };
    checkTrial();
  },[ses]);

  // Fetch announcements
  useEffect(()=>{
    if(!ses)return;
    const fetchAnnouncements=async()=>{
      try{
        const res=await api.get('/api/announcements');
        setAnnouncements((res.announcements||[]).filter(a=>!dismissedAnnouncements.includes(a.id)));
      }catch(e){console.error('Failed to fetch announcements:',e);}
    };
    fetchAnnouncements();
  },[ses]);

  useEffect(()=>{
    if(!ses)return;
    // First load firms, then load data for active firm
    if(dataLoaded.current)return; // block TOKEN_REFRESHED re-runs
    dataLoaded.current=true;
    api.get('/api/firms').then(fs=>{
      const list=Array.isArray(fs)?fs:[];
      setFirms(list);
      // Restore last active firm from sessionStorage, fallback to first
      const savedId=isBR?sessionStorage.getItem('shopos_firm_id'):null;
      const restored=savedId?list.find(f=>f.id===savedId):null;
      const active=restored||list[0]||null;
      setActiveFirm(active);
      if(active){
        if(savedId&&!restored)sessionStorage.removeItem('shopos_firm_id'); // stale id
        setActiveFirmId(active.id);
        loadFirmData(active.id);
      } else {
        setLd(false);setFirmLoading(false);
      }
    });
  },[ses]);

  const loadFirmData=async(firmId,force=false)=>{
    setLd(true);
    setActiveFirmId(firmId);
    // Reset all data state on firm switch so old firm data doesn't show
    if(force){setP([]);setC([]);setB([]);setPy([]);setRet([]);setSI([]);setBS([]);setSS([]);}
    const[p,c,b,py,ret,s,si,bs,ss]=await Promise.all([
      api.get('/api/products'),api.get('/api/customers'),api.get('/api/bills'),
      api.get('/api/payments'),api.get('/api/returns'),api.get('/api/settings'),
      api.get('/api/supplier-invoices'),api.get('/api/bank-statements'),api.get('/api/supplier-statements'),
    ]);
    setP(Array.isArray(p)?p:[]);setC(Array.isArray(c)?c:[]);
    setB(Array.isArray(b)?b:[]);setPy(Array.isArray(py)?py:[]);
    setRet(Array.isArray(ret)?ret:[]);
    setSI(Array.isArray(si)?si:[]);setBS(Array.isArray(bs)?bs:[]);setSS(Array.isArray(ss)?ss:[]);
    if(s&&!s.error){setFirm({...DEF,...s});setSeq(s.invoiceSeq||1);}
    setLd(false);setFirmLoading(false);
  };

  const refreshCustomers=async()=>{
    try{
      const c=await api.get('/api/customers');
      setC(Array.isArray(c)?c:[]);
      showT('Customers refreshed','ok');
    }catch(e){
      showT('Failed to refresh customers','err');
    }
  };

  const refreshFirms=async()=>{
    const fs=await api.get('/api/firms');
    if(Array.isArray(fs))setFirms(fs);
  };

  const switchFirm=async f=>{
    setActiveFirmPersist(f);
    setPage('dash');
    await loadFirmData(f.id, true); // force reload for firm switch
  };

  const saveFirm=async f=>{setFirm(f);await api.post('/api/settings',f);};
  const nextInv=async()=>{const res=await api.post('/api/next-invoice',{});return res.invoiceNo||'';};
  const logout=async()=>{await supabase.auth.signOut();dataLoaded.current=false;setSes(null);};

  const TABS=[['dash','Dashboard'],['analytics','Analytics'],['catalog','Catalog'],['scan','Scan Bill'],['pos','POS/Sell'],['cust','Customers'],['bills','Bills'],['suppliers','Suppliers'],['returns','Returns'],['bank','Bank'],['ledger','Ledger'],['team','Team']];
  const ICONS={dash:'Dashboard',catalog:'Catalog',scan:'Scan',labels:'Labels',pos:'Sell',cust:'Customers',bills:'Bills',returns:'Returns',ledger:'Ledger',settings:'Settings'};

  if(al)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',gap:10,fontFamily:'Inter,sans-serif',color:BL}}><Spin/>Loading...</div>;
  if(!ses)return<ModernLogin onLogin={s=>setSes(s)}/>;
  if(ld)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',gap:10,fontFamily:'Inter,sans-serif',color:BL}}><Spin/>Loading ShopOS...</div>;

  // No firm yet — show setup screen
  if(!firmLoading&&firms.length===0){
    return<NoFirmSetup ses={ses} onCreated={async f=>{setFirms([f]);setActiveFirmPersist(f);await loadFirmData(f.id);}}/>;
  }

  const modernBg=_theme==='modern'?'linear-gradient(135deg, #EEF2FF 0%, #F0F9FF 50%, #F5F3FF 100%)':BG;
  const modernCSS=_theme==='modern'?'button:hover{opacity:1!important;transform:translateY(-1px);box-shadow:0 6px 20px rgba(0,0,0,.12)!important;transition:all 0.2s ease}input:focus,select:focus,textarea:focus{border-color:#1B5E8A!important;box-shadow:0 0 0 3px rgba(27,94,138,.12)!important}tr:hover td{background:rgba(27,94,138,.02)!important}.shopos-card-modern{transition:transform 0.2s ease,box-shadow 0.2s ease}.shopos-card-modern:hover{transform:translateY(-2px);box-shadow:0 16px 48px rgba(31,38,135,.12)!important}':'button:hover{opacity:.85}input:focus,select:focus,textarea:focus{border-color:'+BL+'!important;box-shadow:0 0 0 2px rgba(27,94,138,.12)!important;outline:none!important}tr:hover td{background:#fafaf8}';

  const AnnouncementBanner=({announcement})=>{
    const colors={info:{bg:BLL,co:BL,icon:'ℹ️'},warning:{bg:AMBL,co:AMB,icon:'⚠️'},maintenance:{bg:'#FEF3E0',co:'#F97316',icon:'🔧'},critical:{bg:'rgba(255,0,0,0.08)',co:'#EF4444',icon:'🚨'}};
    const c=colors[announcement.type]||colors.info;
    return<div style={{background:c.bg,border:'0.5px solid '+c.co+'40',borderRadius:8,padding:'12px 16px',marginBottom:8,display:'flex',alignItems:'flex-start',gap:12,justifyContent:'space-between'}}>
      <div style={{display:'flex',gap:12,flex:1,alignItems:'flex-start'}}>
        <span style={{fontSize:18,flexShrink:0}}>{c.icon}</span>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:13,color:c.co}}>{announcement.title}</div>
          <div style={{fontSize:12,color:c.co+'80',marginTop:2,lineHeight:1.4}}>{announcement.message}</div>
        </div>
      </div>
      <button onClick={()=>{setDismissedAnnouncements(d=>{const nd=[...d,announcement.id];if(isBR)localStorage.setItem('dismissed_announcements',JSON.stringify(nd));return nd;});setAnnouncements(a=>a.filter(x=>x.id!==announcement.id));}} style={{border:'none',background:'transparent',cursor:'pointer',color:c.co+'60',fontSize:16,flexShrink:0,padding:0}}>×</button>
    </div>;
  };

  return<div style={{fontFamily:"'Inter',system-ui,sans-serif",background:modernBg,minHeight:'100vh',color:TXT,paddingBottom:mob?64:0}}>
    <style>{'@import url(\'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap\');@keyframes spin{to{transform:rotate(360deg)}}'+modernCSS+'@media print{.np{display:none!important}}'}</style>

    {/* Announcements */}
    {announcements.length>0&&<div style={{maxWidth:'100%',padding:mob?'8px 12px':'12px 16px',background:_theme==='modern'?'rgba(15,23,42,0.5)':'#fafaf8',borderBottom:_theme==='modern'?'1px solid rgba(255,255,255,0.1)':'0.5px solid '+BORD,position:'sticky',top:0,zIndex:99}}>
      {announcements.map(a=><AnnouncementBanner key={a.id} announcement={a}/>)}
    </div>}

    {/* Desktop/Tablet nav */}
    {!mob&&<nav style={_theme==='modern'?{display:'flex',alignItems:'center',padding:'0 14px',background:'linear-gradient(135deg, rgba(15,23,42,0.92), rgba(30,41,59,0.95))',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(148,163,184,0.2)',boxShadow:'0 8px 32px rgba(0,0,0,0.15)',position:'sticky',top:announcements.length>0?56:0,zIndex:100,flexWrap:'wrap',minHeight:48}:{display:'flex',alignItems:'center',padding:'0 14px',background:'#fff',borderBottom:'0.5px solid '+BORD,position:'sticky',top:announcements.length>0?56:0,zIndex:100,flexWrap:'wrap',minHeight:46}} className='np'>
      <span style={_theme==='modern'?{fontSize:15,fontWeight:800,color:'#fff',marginRight:8,letterSpacing:'-0.5px'}:{fontSize:15,fontWeight:800,color:BL,marginRight:8,letterSpacing:'-0.5px'}}>SHOP<span style={{color:_theme==='modern'?'#FF8C42':AMB}}>OS</span></span>
      <div style={{display:'flex',flex:1,flexWrap:'wrap'}}>
        {TABS.map(([p,l])=><button key={p} onClick={()=>setPage(p)} style={_theme==='modern'&&page===p?{padding:'6px 14px',border:'none',borderRadius:8,background:'linear-gradient(135deg, #1B5E8A, #2980b9)',color:'#fff',cursor:'pointer',fontSize:tab?10:11.5,fontWeight:700,boxShadow:'0 4px 12px rgba(27,94,138,0.3)',whiteSpace:'nowrap',transition:'all 0.2s ease'}:_theme==='modern'?{padding:'6px 14px',border:'none',borderRadius:8,background:'transparent',color:'rgba(255,255,255,0.7)',cursor:'pointer',fontSize:tab?10:11.5,fontWeight:500,whiteSpace:'nowrap',transition:'all 0.2s ease'}:{padding:'12px 8px',border:'none',borderRadius:0,background:'transparent',color:page===p?BL:MUT,cursor:'pointer',fontSize:tab?10:11.5,fontWeight:page===p?700:500,borderBottom:page===p?'2px solid '+BL:'2px solid transparent',whiteSpace:'nowrap'}} onMouseEnter={e=>{if(_theme==='modern'&&page!==p)e.currentTarget.style.color='rgba(255,255,255,0.9)'}} onMouseLeave={e=>{if(_theme==='modern'&&page!==p)e.currentTarget.style.color='rgba(255,255,255,0.7)'}}>{l}</button>)}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:8}}>
        <FirmDropdown activeFirm={activeFirm} firms={firms} onSwitch={switchFirm} onAdd={()=>setPage('team')} onRefresh={refreshFirms}/>
        <UserMenu email={ses?.user?.email} theme={_theme} onLogout={logout} onNavigate={p=>{if(p==='settings')setPage('settings');else if(p==='labels')setPage('labels');else if(p==='support')setPage('support');else if(p==='profile')alert('Profile editing coming soon');else if(p==='billing')setShowBillingPopup(true);else if(p==='help')alert('Help & Support coming soon');}}/>
      </div>
    </nav>}

    {/* Mobile bottom tab bar */}
    {mob&&<nav style={_theme==='modern'?{position:'fixed',bottom:0,left:0,right:0,background:'rgba(255,255,255,0.85)',backdropFilter:'blur(20px)',borderTop:'1px solid rgba(148,163,184,0.15)',display:'flex',zIndex:200,overflowX:'auto'}:{position:'fixed',bottom:0,left:0,right:0,background:'#fff',borderTop:'0.5px solid '+BORD,display:'flex',zIndex:200,overflowX:'auto'}} className='np'>
      {TABS.slice(0,8).map(([p,l])=><button key={p} onClick={()=>setPage(p)} style={{flex:'0 0 auto',padding:'8px 12px',border:'none',borderRadius:0,background:'transparent',color:page===p?BL:MUT,cursor:'pointer',fontSize:10,fontWeight:page===p?700:500,display:'flex',flexDirection:'column',alignItems:'center',gap:2,minWidth:60,borderTop:page===p?'2px solid '+BL:'2px solid transparent'}}>{l}</button>)}
    </nav>}

    <div style={{padding:mob?12:16,maxWidth:1240,margin:'0 auto'}}>
      {page==='dash'&&<Dashboard P={P} B={B} C={C} Py={Py} mob={mob} firm={firm}/>
      }{page==='analytics'&&<Analytics P={P} B={B} C={C} Py={Py} Ret={Ret} mob={mob}/>}
      {page==='catalog'&&<Catalog P={P} setP={setP} mob={mob}/>}
      {page==='scan'&&<ScanBill P={P} setP={setP} firm={firm} SI={SI} setSI={setSI} onDone={()=>setPage('catalog')} onLabels={()=>setPage('labels')} mob={mob}/>}
      {page==='labels'&&<QRLabels P={P} mob={mob}/>}
      {page==='pos'&&<POS P={P} setP={setP} C={C} setC={setC} B={B} setB={setB} firm={firm} nextInv={nextInv} mob={mob} onDone={b=>{setVBill(b);setPage('bills');}}/>}
      {page==='cust'&&<Customers C={C} setC={setC} B={B} Py={Py} setPy={setPy} firm={firm} mob={mob} onRefresh={refreshCustomers}/>}
      {page==='bills'&&<Bills B={B} setB={setB} Py={Py} setPy={setPy} firm={firm} C={C} initBill={vBill} onClearInit={()=>setVBill(null)} mob={mob}/>}
      {page==='suppliers'&&<Suppliers SI={SI} setSI={setSI} SS={SS} setSS={setSS} firm={firm} gk={()=>firm?.geminiKey||''} mob={mob}/>
      }{page==='returns'&&<Returns P={P} setP={setP} B={B} C={C} Ret={Ret} setRet={setRet} mob={mob}/>}
      {page==='bank'&&<BankPage BS={BS} setBS={setBS} B={B} Py={Py} firm={firm} mob={mob} gk={()=>firm?.geminiKey||''}/>}
      {page==='ledger'&&<Ledger B={B} Py={Py} setPy={setPy} C={C} Ret={Ret} firm={firm} mob={mob}/>}
      {page==='team'&&<Team activeFirm={activeFirm} firms={firms} setFirms={setFirms} onSwitchFirm={switchFirm} onNewFirm={async f=>{const nl=[...firms,f];setFirms(nl);switchFirm(f);}} mob={mob}/>}
      {page==='settings'&&<Settings firm={firm} saveFirm={saveFirm} ses={ses} mob={mob} theme={theme} setTheme={setTheme} org={org}/>}
      {page==='support'&&<SupportTickets mob={mob}/>}
    </div>

    {/* Trial Extension Modal */}
    <TrialExtensionModal
      isOpen={showTrialExtend}
      daysRemaining={org?.trialDaysRemaining||0}
      onExtend={()=>{setShowTrialExtend(false);}}
      onUpgrade={()=>{setShowTrialExtend(false);setPage('settings');}}
      onClose={()=>setShowTrialExtend(false)}
    />

    {/* Upgrade Block Modal */}
    <UpgradeBlockModal
      isOpen={showUpgradeBlock}
      onUpgrade={()=>{setShowUpgradeBlock(false);setPage('settings');}}
      onExtendTrial={()=>{setShowUpgradeBlock(false);}}
    />

    {/* Billing Popup */}
    <BillingPopup
      isOpen={showBillingPopup}
      onClose={()=>setShowBillingPopup(false)}
      onNavigateToBilling={()=>setPage('settings')}
    />
  </div>;}

/* ── DASHBOARD ── */
function Dashboard({P,B,C,Py,mob,firm}){
  const S=_theme==='modern'?MODERN_S:MINIMAL_S;
  const[searchQ,setSearchQ]=useState('');const[searchRes,setSearchRes]=useState([]);const[searching,setSrching]=useState(false);
  const gk=()=>firm?.geminiKey||'';
  const td=new Date();
  const todayB=B.filter(b=>new Date(b.date).toDateString()===td.toDateString());
  const totalBilled=B.reduce((s,b)=>s+b.total,0),totalPaid=Py.reduce((s,p)=>s+p.amount,0);
  const months=[];for(let i=5;i>=0;i--){const d=new Date(td);d.setMonth(d.getMonth()-i);months.push({lbl:d.toLocaleString('default',{month:'short'}),yr:d.getFullYear(),mo:d.getMonth()});}
  const mSales=months.map(m=>({...m,tot:B.filter(b=>{const d=new Date(b.date);return d.getMonth()===m.mo&&d.getFullYear()===m.yr}).reduce((s,b)=>s+b.total,0)}));
  const maxS=Math.max(...mSales.map(m=>m.tot),1);
  const pendChq=Py.filter(p=>p.mode==='Cheque'&&p.chequeStatus&&p.chequeStatus!=='cleared'&&p.chequeStatus!=='recleared');
  const low=P.filter(p=>p.qty<=10);
  const cols=mob?'1fr 1fr':'repeat(4,1fr)';
  const search=async(q)=>{if(!q.trim()){setSearchRes([]);return}setSrching(true);const gk_val=gk();console.log('[Dashboard] Searching for:',q,'with key:',gk_val?.substring?.(0,10)+'...');try{const r=await api.post('/api/dashboard-search',{query:q,geminiKey:gk_val});console.log('Search results:',r);setSearchRes(Array.isArray(r)?r:[])}catch(e){console.error('Search error:',e);setSearchRes([])}finally{setSrching(false)}};
  return<div>
    <div style={{display:'flex',alignItems:'baseline',gap:10,marginBottom:16,flexWrap:'wrap'}}>
      <div style={S.h2}>Dashboard</div>
      <div style={{fontSize:11,color:MUT}}>{td.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
    </div>
    {!mob&&<div style={{...S.card,marginBottom:14}}>
      <input style={{...S.inp,marginBottom:8}} placeholder='Search using AI... (e.g., "invoices from last month", "high value bills", "customer XYZ")' value={searchQ} onChange={e=>{setSearchQ(e.target.value);search(e.target.value)}}/>
      {searchRes.length>0&&<div style={{borderTop:'0.5px solid '+BORD,paddingTop:10}}>
        <div style={{fontSize:11,fontWeight:700,color:MUT,marginBottom:8}}>Found {searchRes.length} result{searchRes.length!==1?'s':''}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,maxHeight:300,overflowY:'auto'}}>
          {searchRes.map(r=><div key={r.id+r.type} style={{padding:'8px 10px',borderRadius:6,background:BORD+'20',border:'0.5px solid '+BORD,fontSize:11}}>
            <div style={{fontWeight:700,color:BL,marginBottom:2}}>{r.description}</div>
            <div style={{fontSize:10,color:MUT,marginBottom:2}}>{r.party}</div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{...S.mono,color:GR,fontWeight:700}}>{fmt(r.amount)}</span>
              <span style={{fontSize:9,color:MUT}}>{new Date(r.date).toLocaleDateString('en-IN')}</span>
            </div>
          </div>)}
        </div>
      </div>}</div>}
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
  const S=_theme==='modern'?MODERN_S:MINIMAL_S;
  const[cat,setCat]=useState('All');const[srch,setSrch]=useState('');const[showF,setShowF]=useState(false);const[eid,setEid]=useState(null);
  const[selected,setSelected]=useState(new Set());
  const BLK={name:'',cat:'Kids',sub:'',size:'M',color:'',price:'',gst:5,qty:0,hsn:'',articleNo:''};
  const[form,setF]=useState(BLK);const[sv,setSv]=useState(false);const[toast,showT]=useToast();
  const ff=k=>v=>setF(f=>({...f,[k]:v}));
  const cts=CATS.reduce((a,c)=>{a[c]=P.filter(p=>p.cat===c).length;return a},{});
  const rows=P.filter(p=>(cat==='All'||p.cat===cat)&&((p.name||'').toLowerCase().includes(srch.toLowerCase())||(p.sku||'').includes(srch)||(p.articleNo||'').toLowerCase().includes(srch.toLowerCase())));
  const openNew=()=>{setF(BLK);setEid(null);setShowF(true)};
  const openEdit=p=>{setF({name:p.name,cat:p.cat,sub:p.sub||'',size:p.size,color:p.color||'',price:p.price,gst:p.gst,qty:p.qty,hsn:p.hsn||'',articleNo:p.articleNo||''});setEid(p.id);setShowF(true)};
  const save=async()=>{if(!form.name){alert('Name required');return}setSv(true);try{const pl={...form,price:+form.price,qty:+form.qty,gst:+form.gst};if(eid){const u=await api.put('/api/products',{id:eid,...pl});setP(ps=>ps.map(p=>p.id===eid?u:p));showT('Updated!')}else{const c=await api.post('/api/products',{...pl,sku:rnd9()});setP(ps=>[c,...ps]);showT('Added!')}setShowF(false)}catch(e){showT('Failed: '+e.message,'err')}finally{setSv(false)}};
  const del=async id=>{if(!confirm('Delete?'))return;await api.del('/api/products?id='+id);setP(ps=>ps.filter(p=>p.id!==id))};
  const toggleSelect=id=>{const s=new Set(selected);if(s.has(id))s.delete(id);else s.add(id);setSelected(s)};
  const toggleSelectAll=()=>{if(selected.size===rows.length)setSelected(new Set());else setSelected(new Set(rows.map(p=>p.id)))};
  const bulkDelete=async()=>{if(selected.size===0){showT('Select products to delete','err');return}if(!confirm(`Delete ${selected.size} product${selected.size!==1?'s':''}?`))return;try{for(const id of selected){await api.del('/api/products?id='+id);}setP(ps=>ps.filter(p=>!selected.has(p.id)));setSelected(new Set());showT(`Deleted ${selected.size} product${selected.size!==1?'s':''}!`);}catch(e){showT('Failed: '+e.message,'err')}};
  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><div style={S.h2}>Product Catalog</div><div style={{display:'flex',gap:6}}>{selected.size>0&&<button style={S.btn('dan')} onClick={bulkDelete}>🗑️ Delete {selected.size}</button>}<button style={S.btn('pri')} onClick={openNew}>+ Add Product</button></div></div>{toast}
    <CatTabs value={cat} onChange={setCat} counts={cts}/>
    <input style={{...S.inp,marginBottom:12}} placeholder='Search name, barcode, article no...' value={srch} onChange={e=>setSrch(e.target.value)}/>
    <div style={{...S.card,padding:0,overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:600}}>
      <thead><tr>{['','QR','Product','Article','Cat','Size','Price','GST','Stock',''].map(h=><th key={h} style={S.th}>{h==='QR'?(<input type='checkbox' checked={selected.size===rows.length&&rows.length>0} onChange={toggleSelectAll} style={{cursor:'pointer'}}/>):h}</th>)}</tr></thead>
      <tbody>
        {rows.length===0&&<tr><td colSpan={10}><MT msg='No products'/></td></tr>}
        {rows.map(p=><tr key={p.id} style={{background:selected.has(p.id)?BLL:''}}>
          <td style={S.td}><input type='checkbox' checked={selected.has(p.id)} onChange={()=>toggleSelect(p.id)} style={{cursor:'pointer'}}/></td>
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
function ScanBill({P,setP,firm,SI,setSI,onDone,onLabels,mob}){
  const S=_theme==='modern'?MODERN_S:MINIMAL_S;
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
  const gk=()=>firm?.geminiKey||(isBR?JSON.parse(localStorage.getItem('shopos_firm')||'{}').geminiKey||'':'');

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
      const PROMPT='You are a JSON extraction API for Indian wholesale clothing invoices.\n\nOUTPUT ONLY RAW JSON — no markdown, no backticks, no code fences.\nStart with { end with }.\n\nFormat:\n{"supplier":"firm name","supplierGSTIN":"GSTIN","invoiceNo":"number","invoiceDate":"date","place":"city","subtotal":0,"discount":0,"discountPct":0,"cgst":0,"sgst":0,"igst":0,"invoiceTotal":0,"items":[{"articleNo":"","name":"","hsn":"","sizes":"","qty":1,"price":0,"gst":5,"cat":"Others","color":""}]}\n\nRULES:\nSUBTOTAL: Extract from "Subtotal" or "Net Amt" line in invoice (BEFORE discount). Critical — must be accurate from invoice.\nDISCOUNT: Extract actual discount amount from "Discount" line. Also put discount % in discountPct if shown.\nCGST/SGST/IGST: Extract exact tax amounts from invoice. Critical — copy from invoice totals.\nINVOICE TOTAL: Extract final total from invoice bottom.\nARTICLE NO: Indian invoices often write "9925 PANSARI" — leading code is articleNo, rest is name.\nHSN: Extract from HSN/SAC column.\nSIZES: Comma-separated if multiple (M,L,XL). "Free Size" if none shown.\nGST: SGST 2.5%+CGST 2.5%=5, SGST 6%+CGST 6%=12, SGST 9%+CGST 9%=18, SGST 14%+CGST 14%=28. Must be 0/5/12/18/28.\nCATEGORY: Kids/Girls/Men/Women/Jeans/Tops/Jackets/Hosiery/Woollen/Suits/Others.\nPLACE: Extract city/state from "Place of Supply" field.\nPRICE: Per unit line price, plain number, no Rs symbol.\nCritical: If you cannot find exact subtotal or discount in invoice, output as 0 and note in items.';
      const MODELS=['gemini-2.5-flash','gemini-2.5-flash-lite','gemini-1.5-flash-latest'];
      const sleep=ms=>new Promise(res=>setTimeout(res,ms));
      const mimeType=file.type||'image/jpeg';
      let res=null;
      outer:for(const model of MODELS){for(let attempt=1;attempt<=3;attempt++){setScanStatus(model+' — attempt '+attempt+'/3');try{res=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent?key='+k,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{inline_data:{mime_type:mimeType,data:b64}},{text:PROMPT}]}],generationConfig:{temperature:0.1,maxOutputTokens:8192}})});if(res.status===503||res.status===429){const wait=attempt*4000;setScanStatus(model+' busy — waiting '+Math.round(wait/1000)+'s...');await sleep(wait);continue;}if(res.ok){setScanStatus('');break outer;}break;}catch(netErr){if(attempt===3)break;await sleep(2000);}}}
      try{
        if(!res||!res.ok){const status=res?.status||'unknown';const errMsg=status===503?'Gemini API temporarily unavailable (503). Please try again in a moment.':status===429?'API rate limit reached. Please wait a few minutes.':'API request failed. Check your internet connection.';throw new Error(errMsg);}
        const d=await res.json();
        if(d.error)throw new Error('Gemini: '+d.error.message);
        if(d.promptFeedback&&d.promptFeedback.blockReason)throw new Error('Blocked: '+d.promptFeedback.blockReason);
        const rawTxt=(d.candidates&&d.candidates[0]&&d.candidates[0].content&&d.candidates[0].content.parts&&d.candidates[0].content.parts[0]&&d.candidates[0].content.parts[0].text)||'';
        if(!rawTxt)throw new Error('Empty response — check your Gemini API key in Settings.');
        const parsed=extractJSON(rawTxt);
        if(parsed._truncated)setErr('Response was cut off — recovered '+parsed.items.length+' items. Check for missing items.');
        if(parsed.supplier||parsed.invoiceNo)setSupplierBanner({supplier:parsed.supplier||'',gstin:parsed.supplierGSTIN||'',invoiceNo:parsed.invoiceNo||'',invoiceDate:parsed.invoiceDate||'',place:parsed.place||'',subtotal:+parsed.subtotal||0,discount:+parsed.discount||0,discountPct:+parsed.discountPct||0,cgst:+parsed.cgst||0,sgst:+parsed.sgst||0,igst:+parsed.igst||0,invoiceTotal:+parsed.invoiceTotal||0});
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
  const addToCatalog=async()=>{
    let n=0;
    for(const item of items){
      const sizes=(item.sizes||'Free Size').split(',').map(s=>s.trim()).filter(Boolean);
      for(const sz of sizes){
        const perSize=Math.max(1,Math.round(item.qty/sizes.length));
        const ex=P.find(p=>item.articleNo?(p.articleNo===item.articleNo&&p.size===sz):(p.name===item.name&&p.size===sz));
        if(ex){const u=await api.put('/api/products',{id:ex.id,qty:ex.qty+perSize});setP(ps=>ps.map(p=>p.id===ex.id?u:p));}
        else{const c=await api.post('/api/products',{name:item.name+(sizes.length>1?' ('+sz+')':''),sku:rnd9(),cat:item.cat||'Others',sub:'',size:sz,color:item.color||'',price:+item.price,gst:+item.gst,qty:perSize,hsn:item.hsn||'',articleNo:item.articleNo||''});setP(ps=>[c,...ps]);}
        n++;
      }
    }
    // Save supplier invoice record (if supplier name exists, with or without items)
    if(supplierBanner&&supplierBanner.supplier){
      // Use extracted invoice totals (from Gemini) as primary source
      const subtotal=supplierBanner.subtotal>0?supplierBanner.subtotal:items.reduce((s,i)=>s+i.price*i.qty,0);
      const discount=supplierBanner.discount||0;
      const discountPct=supplierBanner.discountPct>0?supplierBanner.discountPct:(discount>0&&subtotal>0?+(discount/subtotal*100).toFixed(2):0);
      const cgst=supplierBanner.cgst||0;
      const sgst=supplierBanner.sgst||0;
      const igst=supplierBanner.igst||0;
      // If invoice total was extracted, use it; otherwise calculate
      const total=supplierBanner.invoiceTotal>0?supplierBanner.invoiceTotal:(subtotal-discount+cgst+sgst+igst);
      // Convert date from DD-MM-YYYY to YYYY-MM-DD if needed
      const convertDate=dateStr=>{if(!dateStr)return new Date().toISOString().split('T')[0];const parts=dateStr.split('-');if(parts.length===3&&parts[0].length===4)return dateStr;if(parts.length===3&&parts[0].length===2)return `${parts[2]}-${parts[1]}-${parts[0]}`;return dateStr;};
      const siPayload={
        supplierName:supplierBanner.supplier,
        supplierGSTIN:supplierBanner.gstin||'',
        invoiceNo:supplierBanner.invoiceNo||'',
        invoiceDate:convertDate(supplierBanner.invoiceDate),
        place:supplierBanner.place||'',
        subtotal:+subtotal.toFixed(2),
        discount:+discount.toFixed(2),
        discountPct:+discountPct.toFixed(2),
        cgst:+cgst.toFixed(2),
        sgst:+sgst.toFixed(2),
        igst:+igst.toFixed(2),
        roundOff:0,
        total:+total.toFixed(2),
        notes:'Scanned from: '+(supplierBanner.invoiceNo||''),
        items:items.map(i=>({name:i.name,articleNo:i.articleNo||'',sizes:i.sizes,qty:i.qty,price:i.price,gst:i.gst,hsn:i.hsn||''})),
      };
      try{
        const saved=await api.post('/api/supplier-invoices',siPayload);
        if(saved?.error){
          showT('Failed to save invoice: '+saved.error,'err');
        }else if(setSI){
          setSI(si=>[saved,...si]);
          showT('Supplier invoice saved with '+items.length+' items');
        }
      }catch(err){showT('Failed to save supplier invoice: '+err.message,'err');}
    }else if(supplierBanner&&!supplierBanner.supplier){
      showT('Could not identify supplier name from invoice','err');
    }
    setItems([]);setSupplierBanner(null);setMarkupPct('');
    showT(n+' variant'+(n!==1?'s':'')+' added/updated!');
    setTimeout(()=>onDone(),1500);
  };

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
  const S=_theme==='modern'?MODERN_S:MINIMAL_S;
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


/* ── CAMERA SCANNER ── */
function CameraScanner({products,onAddItems,onClose}){
  const[err,setErr]=useState(null);
  const[scanning,setScanning]=useState(false);
  const[staged,setStaged]=useState([]); // [{id,sku,name,cat,size,qty}] — committed to cart on Done
  const[flash,setFlash]=useState(false);
  const readerRef=useRef(null);
  const lastCodeRef=useRef('');
  const lastTimeRef=useRef(0);
  const productsRef=useRef(products);
  productsRef.current=products; // always current — safe to read from async ZXing callback
  const videoId='shopos-cam-video';

  const beep=()=>{
    try{
      const ctx=new (window.AudioContext||window.webkitAudioContext)();
      const osc=ctx.createOscillator();
      const gain=ctx.createGain();
      osc.connect(gain);gain.connect(ctx.destination);
      osc.frequency.value=1200;osc.type='square';
      gain.gain.setValueAtTime(0.3,ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.15);
      osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.15);
    }catch{}
  };

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        const zxing=await import('@zxing/library');
        const reader=new zxing.BrowserMultiFormatReader();
        const origWarn=console.warn;const origError=console.error;
        console.warn=(...a)=>{if(String(a[0]).includes('NotFoundException')||String(a[0]).includes('MultiFormatReader'))return;origWarn(...a);};
        console.error=(...a)=>{if(String(a[0]).includes('NotFoundException')||String(a[0]).includes('MultiFormatReader'))return;origError(...a);};
        readerRef.current=reader;
        if(cancelled)return;
        setScanning(true);
        reader.decodeFromVideoDevice(undefined,videoId,(result)=>{
          if(cancelled||!result)return;
          const code=result.getText();
          const now=Date.now();
          if(code===lastCodeRef.current&&now-lastTimeRef.current<1500)return;
          lastCodeRef.current=code;lastTimeRef.current=now;
          // Parse ShopOS QR format: ART:articleNo|SIZE:size|BC:sku
          let searchSku=code,searchArt=code,searchSize=null;
          if(code.includes('ART:')&&code.includes('BC:')){
            const parts=Object.fromEntries(code.split('|').map(p=>{const[k,...v]=p.split(':');return[k,v.join(':')];}));
            searchSku=parts.BC||code;searchArt=parts.ART||code;searchSize=parts.SIZE||null;
          }
          const P=productsRef.current;
          const p=P.find(x=>x.sku===searchSku)||(searchArt?P.find(x=>x.articleNo===searchArt&&(!searchSize||x.size===searchSize)):null)||P.find(x=>x.sku===code||x.articleNo===code);
          if(!p){setErr('Not found: '+code);setTimeout(()=>setErr(null),2000);return;}
          beep();
          setFlash(true);setTimeout(()=>setFlash(false),200);
          setErr(null);
          // Stage the item — only updates local state, no parent calls in async callback
          setStaged(s=>{
            const ex=s.find(x=>x.id===p.id);
            const cur=ex?ex.qty:0;
            if(cur>=p.qty)return s; // respect stock limit
            if(ex)return s.map(x=>x.id===p.id?{...x,qty:x.qty+1}:x);
            return[...s,{id:p.id,sku:p.sku,name:p.name,cat:p.cat,size:p.size,qty:1}];
          });
        });
      }catch(e){
        if(!cancelled)setErr('Camera error: '+e.message);
      }
    })();
    return()=>{cancelled=true;try{readerRef.current?.reset();}catch{}};
  },[]);

  const handleDone=()=>{
    try{readerRef.current?.reset();}catch{}
    onAddItems(staged); // bulk-add all staged items to cart
    onClose();
  };

  const total=staged.reduce((s,i)=>s+i.qty,0);

  return<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.95)',zIndex:700,display:'flex',gap:16,alignItems:'center',justifyContent:'center',padding:16,flexWrap:'wrap'}}>
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
      <div style={{color:'#fff',fontSize:14,fontWeight:700}}>📷 Scan Products — Camera stays open</div>
      {err&&<div style={{color:'#ffa0a0',fontSize:12,background:'rgba(155,38,38,.3)',padding:'6px 12px',borderRadius:6,maxWidth:340}}>{err}</div>}
      <div style={{position:'relative',borderRadius:12,overflow:'hidden',border:'2px solid '+(flash?'#4ade80':'#F5A732'),transition:'border-color .1s'}}>
        {flash&&<div style={{position:'absolute',inset:0,background:'rgba(74,222,128,.3)',zIndex:10,pointerEvents:'none'}}/>}
        <video id={videoId} style={{width:Math.min(window.innerWidth-64,380),height:280,objectFit:'cover',display:'block'}} muted playsInline/>
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
          <div style={{width:180,height:180,border:'2px solid #F5A732',borderRadius:8,boxShadow:'0 0 0 1000px rgba(0,0,0,.5)'}}>
            <div style={{position:'absolute',top:0,left:0,width:18,height:18,borderTop:'3px solid #F5A732',borderLeft:'3px solid #F5A732',borderRadius:'4px 0 0 0'}}/>
            <div style={{position:'absolute',top:0,right:0,width:18,height:18,borderTop:'3px solid #F5A732',borderRight:'3px solid #F5A732',borderRadius:'0 4px 0 0'}}/>
            <div style={{position:'absolute',bottom:0,left:0,width:18,height:18,borderBottom:'3px solid #F5A732',borderLeft:'3px solid #F5A732',borderRadius:'0 0 0 4px'}}/>
            <div style={{position:'absolute',bottom:0,right:0,width:18,height:18,borderBottom:'3px solid #F5A732',borderRight:'3px solid #F5A732',borderRadius:'0 0 4px 0'}}/>
          </div>
        </div>
        {scanning&&<div style={{position:'absolute',bottom:8,left:0,right:0,textAlign:'center',color:flash?'#4ade80':'#F5A732',fontSize:11,fontWeight:600,transition:'color .1s'}}>{flash?'✓ Added to preview!':'Scanning...'}</div>}
      </div>
      <button onClick={handleDone} style={{...S.btn('suc'),fontSize:13,padding:'10px 28px',minWidth:220,justifyContent:'center'}}>
        {total>0?`Add ${total} item${total>1?'s':''} to Cart & Done`:'Done (nothing scanned)'}
      </button>
    </div>
    {staged.length>0&&<div style={{background:'rgba(255,255,255,.06)',borderRadius:10,padding:12,minWidth:200,maxWidth:260,maxHeight:'70vh',overflowY:'auto'}}>
      <div style={{color:'rgba(255,255,255,.6)',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.6px',marginBottom:10}}>Scanned Preview — {total} pcs</div>
      {staged.map(item=><div key={item.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'0.5px solid rgba(255,255,255,.1)'}}>
        <div style={{flex:1}}>
          <div style={{color:'#fff',fontSize:12,fontWeight:600}}>{item.name}</div>
          <div style={{color:'rgba(255,255,255,.4)',fontSize:10}}>{item.cat} · {item.size}</div>
        </div>
        <span style={{background:'rgba(74,222,128,.25)',color:'#4ade80',padding:'3px 10px',borderRadius:12,fontSize:13,fontWeight:700,flexShrink:0}}>×{item.qty}</span>
      </div>)}
    </div>}
  </div>;
}

/* ── POS ── */
function POS({P,setP,C,setC,B,setB,firm,nextInv,mob,onDone}){
  const S=_theme==='modern'?MODERN_S:MINIMAL_S;
  const[step,setStep]=useState(()=>isBR?sessionStorage.getItem('pos_step')||'cust':'cust');
  const[sel,setSel]=useState(()=>{if(!isBR)return null;try{const s=sessionStorage.getItem('pos_sel');return s?JSON.parse(s):null;}catch{return null;}});
  const[isRel,setIsRel]=useState(()=>isBR?sessionStorage.getItem('pos_isrel')==='1':false);
  const[rn,setRn]=useState(()=>isBR?sessionStorage.getItem('pos_rn')||'':'');
  const[ri,setRi]=useState(()=>isBR?sessionStorage.getItem('pos_ri')||'':'');
  useEffect(()=>{if(isBR)sessionStorage.setItem('pos_step',step);},[step]);
  useEffect(()=>{if(isBR)sessionStorage.setItem('pos_sel',sel?JSON.stringify(sel):'');},[sel]);
  useEffect(()=>{if(isBR)sessionStorage.setItem('pos_isrel',isRel?'1':'');},[isRel]);
  useEffect(()=>{if(isBR)sessionStorage.setItem('pos_rn',rn);},[rn]);
  useEffect(()=>{if(isBR)sessionStorage.setItem('pos_ri',ri);},[ri]);
  const[cForm,setCF]=useState({name:'',phone:'',shopname:'',gst:'',addr:'',email:''});
  const[cart,setCart]=useState(()=>{
    // Restore cart from sessionStorage on mount
    if(isBR){try{const saved=sessionStorage.getItem('shopos_cart');return saved?JSON.parse(saved):[];}catch{}}return[];
  });
  // Persist cart changes to sessionStorage
  useEffect(()=>{
    if(isBR){
      if(cart.length>0){sessionStorage.setItem('shopos_cart',JSON.stringify(cart));sessionStorage.setItem('shopos_cart_active','1');}
      else{sessionStorage.removeItem('shopos_cart');sessionStorage.removeItem('shopos_cart_active');}
    }
  },[cart]);const[bc,setBc]=useState('');const[catF,setCatF]=useState('All');const[cSrch,setCS]=useState('');const[gstMode,setGM]=useState('excl');const[custSrch,setCuS]=useState('');const[disc,setDisc]=useState('');
  const[transportName,setTransportName]=useState('');const[lrNumber,setLrNumber]=useState('');
  const[showCamera,setShowCamera]=useState(false);
  const[submitting,setSub]=useState(false);const[toast,showT]=useToast();const bcRef=useRef(null);
  // Global scanner listener — captures input from USB barcode scanners
  // Scanners type fast and end with Enter key, so we accumulate chars and submit on Enter
  const scanBuffer=useRef('');const scanTimer=useRef(null);const addBCRef=useRef(null);
  useEffect(()=>{
    if(step!=='items')return;
    const onKey=e=>{
      const tag=e.target.tagName;
      const isOtherInput=(tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA')&&e.target!==bcRef.current;
      // If typing in any other input, ignore completely
      if(isOtherInput)return;
      // If typing in the barcode input, let it handle itself — don't buffer
      if(e.target===bcRef.current)return;
      // Only handle keys when focus is NOT on any input (USB scanner scenario)
      if(e.key==='Enter'){
        const val=scanBuffer.current.trim();
        scanBuffer.current='';clearTimeout(scanTimer.current);
        if(val)addBCRef.current(val);
        return;
      }
      if(e.key.length===1&&!e.ctrlKey&&!e.metaKey){
        scanBuffer.current+=e.key;
        clearTimeout(scanTimer.current);
        scanTimer.current=setTimeout(()=>{
          // After 200ms with no Enter, move buffer to input for manual review
          if(scanBuffer.current&&bcRef.current){
            bcRef.current.focus();
            // Don't call setBc here — let user type naturally
            scanBuffer.current='';
          }
        },200);
      }
    };
    window.addEventListener('keydown',onKey);
    return()=>{window.removeEventListener('keydown',onKey);clearTimeout(scanTimer.current);};
  },[step]); // removed P from deps to prevent re-mounting on data load

  const addBC=code=>{
    const s=code.trim();if(!s)return;
    // Parse ShopOS QR format: ART:articleNo|SIZE:size|BC:sku
    let searchSku=s,searchArt=s,searchSize=null;
    if(s.includes('ART:')&&s.includes('BC:')){
      const parts=Object.fromEntries(s.split('|').map(p=>{const[k,...v]=p.split(':');return[k,v.join(':')];}));
      searchSku=parts.BC||s;searchArt=parts.ART||s;searchSize=parts.SIZE||null;
    }
    // Find product by BC (sku), articleNo, or raw input
    let p=P.find(x=>x.sku===searchSku)||(searchArt?P.find(x=>x.articleNo===searchArt&&(!searchSize||x.size===searchSize)):null)||P.find(x=>x.sku===s||x.articleNo===s);
    if(!p){showT('Product not found: '+s,'err');return;}
    if(p.qty===0){showT(p.name+' out of stock!','err');return;}
    setCart(c=>{const ex=c.find(x=>x.id===p.id);if(ex)return ex.qty<p.qty?c.map(x=>x.id===p.id?{...x,qty:x.qty+1}:x):c;return[...c,{id:p.id,qty:1,price:p.price,gstRate:p.gst}]});
    setBc('');showT('Added: '+p.name);
  };
  addBCRef.current=addBC; // keep ref in sync for keydown handler
  const addG=p=>{if(p.qty===0){showT(p.name+' out of stock','err');return}setCart(c=>{const ex=c.find(x=>x.id===p.id);if(ex)return ex.qty<p.qty?c.map(x=>x.id===p.id?{...x,qty:x.qty+1}:x):c;return[...c,{id:p.id,qty:1,price:p.price,gstRate:p.gst}]});};
  const uQty=(id,d)=>setCart(c=>c.map(x=>x.id===id?{...x,qty:x.qty+d}:x).filter(x=>x.qty>0));
  const calc=()=>{let sub=0,gt=0;cart.forEach(c=>{const base=gstMode==='incl'?c.price/(1+c.gstRate/100):c.price;sub+=base*c.qty;gt+=base*(c.gstRate/100)*c.qty;});const discAmt=+disc||0;if(isRel){const mk=sub*0.1;return{sub,gt:0,mk,disc:0,total:sub+mk};}return{sub,gt,mk:0,disc:discAmt,total:sub+gt-discAmt};};
  const saveCust=async()=>{if(!cForm.name||!cForm.phone){showT('Name & phone required','err');return}const nc=await api.post('/api/customers',cForm);setC(cs=>[nc,...cs]);setSel(nc);setCF({name:'',phone:'',shopname:'',gst:'',addr:'',email:''});setStep('items');setTimeout(()=>bcRef.current?.focus(),200);};
  const genBill=async()=>{const cName=isRel?rn||'Walk-in':sel?.name;if(!cName){showT('Enter name','err');return}if(cart.length===0){showT('Cart empty','err');return}setSub(true);
    const{sub,gt,mk,disc:discAmt,total}=calc();const inv=await nextInv();
    const items=cart.map(c=>{const p=P.find(x=>x.id===c.id);const base=gstMode==='incl'?p.price/(1+p.gst/100):p.price;const ga=isRel?0:base*(p.gst/100)*c.qty;return{name:p.name,sku:p.sku,cat:p.cat,size:p.size,color:p.color||'',articleNo:p.articleNo||'',qty:c.qty,rate:base,gstRate:isRel?0:p.gst,gstAmt:ga,total:isRel?base*c.qty:base*(1+p.gst/100)*c.qty};});
    try{const r=await api.post('/api/bills',{invoiceNo:inv,customerId:sel?.id||null,customerName:cName,customerPhone:isRel?'':sel?.phone||'',customerGST:isRel?'':sel?.gst||'',customerEmail:sel?.email||'',customerAddr:sel?.addr||ri,isRelative:isRel,items,subtotal:sub,discount:discAmt,gst:gt,markup:mk,total,transportName,lrNumber});
    const fp=await api.get('/api/products');setP(Array.isArray(fp)?fp:[]);
    const bill={id:r.id,invoiceNo:inv,date:new Date().toISOString(),customerId:sel?.id||null,customerName:cName,customerPhone:isRel?'':sel?.phone||'',customerGST:isRel?'':sel?.gst||'',customerEmail:sel?.email||'',customerAddr:sel?.addr||ri,isRelative:isRel,items,subtotal:sub,discount:discAmt,gst:gt,markup:mk,total,biltyNo:'',transportName,lrNumber};
    setB(bs=>[bill,...bs]);setCart([]);setSel(null);setStep('cust');setIsRel(false);setRn('');setRi('');setDisc('');setTransportName('');setLrNumber('');
    // Clear POS session storage after bill generated
    if(isBR){['pos_step','pos_sel','pos_isrel','pos_rn','pos_ri','shopos_cart'].forEach(k=>sessionStorage.removeItem(k));}
    onDone(bill);}catch(e){showT('Failed: '+e.message,'err')}finally{setSub(false)}};
  const{sub,gt,mk,disc:discAmt,total}=calc();
  const activeCats=new Set(P.map(p=>p.cat));const fG=P.filter(p=>p.qty>0&&(catF==='All'||p.cat===catF)&&(p.name.toLowerCase().includes(cSrch.toLowerCase())||p.sku.includes(cSrch)||(p.articleNo||'').includes(cSrch)));
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
    {showCamera&&<CameraScanner products={P} onAddItems={items=>{
      let count=0;
      items.forEach(item=>{
        const p=P.find(x=>x.id===item.id);
        if(!p)return;
        setCart(c=>{
          const ex=c.find(x=>x.id===p.id);
          const newQty=Math.min((ex?ex.qty:0)+item.qty,p.qty);
          if(newQty<=0)return c;
          if(ex)return c.map(x=>x.id===p.id?{...x,qty:newQty}:x);
          return[...c,{id:p.id,qty:newQty}];
        });
        count++;
      });
      if(count>0)showT(count+' product'+(count>1?'s':'')+' added to cart');
    }} onClose={()=>setShowCamera(false)}/>}
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
          <div style={{display:'flex',gap:8}}><input ref={bcRef} style={{...S.inp,fontFamily:'DM Mono,monospace',fontSize:14,letterSpacing:'2px',flex:1}} value={bc} onChange={e=>setBc(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&bc.trim()){addBC(bc);e.target.focus()}}} placeholder='Scan barcode or article no, Enter' autoFocus/><button style={S.btn('pri')} onClick={()=>bc.trim()&&addBC(bc)}>Add</button><button style={S.btn('pur')} onClick={()=>setShowCamera(true)} title='Scan using camera'>📷 Camera</button></div>
        </div>
        <div style={{...S.card,padding:0}}>
          <div style={{padding:'10px 14px 6px',borderBottom:'0.5px solid '+BORD}}><CatTabs value={catF} onChange={setCatF} counts={Object.fromEntries(Array.from(activeCats).map(c=>([c,P.filter(p=>p.cat===c&&p.qty>0).length])))}/><input style={{...S.inp,fontSize:12}} placeholder='Search catalog...' value={cSrch} onChange={e=>setCS(e.target.value)}/></div>
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
          {[['Invoice No.',bill.invoiceNo||'#'+bill.id],['Date',new Date(bill.date).toLocaleDateString('en-IN')],['Place of Supply',firm.state||'M.P.'],(bill.transportName||bill.lrNumber)?['Transport',bill.transportName||(bill.lrNumber?'-':'')]:null,bill.lrNumber?['LR / Docket No.',bill.lrNumber]:bill.biltyNo?['LR / Bilty No.',bill.biltyNo]:null].filter(Boolean).map(([k,v],idx)=><div key={k||idx} style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:11}}><span style={{color:'#666'}}>{k}</span><span style={{fontWeight:700,fontFamily:k.includes('LR')||k.includes('Bilty')?'monospace':'inherit'}}>{v}</span></div>)}
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
  // Open invoice in a new window and trigger browser print-to-PDF
  // This avoids all CORS/html2canvas issues with QR codes and external images
  const el=document.getElementById(elementId);if(!el)return null;
  const w=window.open('','_blank','width=900,height=700');
  const fontUrl='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap';
    const _furl='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap';
  w.document.write('<html><head><title>Invoice</title><link rel="stylesheet" href="'+_furl+'"><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111}@media print{@page{margin:8mm}}</style></head><body>');
  w.document.write(el.innerHTML);
  w.document.write('</body></html>');
  w.document.close();
  // Wait for images to load then print
  await new Promise(res=>{
    if(w.document.readyState==='complete')return setTimeout(res,500);
    w.onload=()=>setTimeout(res,500);
    setTimeout(res,2000);
  });
  w.print();
  return null; // PDF handled by browser print dialog
}

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
function Bills({B,setB,Py,setPy,firm,C,initBill,onClearInit,mob}){
  const S=_theme==='modern'?MODERN_S:MINIMAL_S;
  const[vid,setVid]=useState(initBill?.id||null);const[payBill,setPayBill]=useState(null);const[toast,showT]=useToast();
  const[transportEdit,setTransportEdit]=useState(null);const[transportForm,setTransportForm]=useState({transportName:'',lrNumber:''});
  const[pdfBusy,setPdfBusy]=useState(false);const[ewayBill,setEwayBill]=useState(null);const[ewbLoading,setEwbLoading]=useState(null);
  useEffect(()=>{if(initBill){setVid(initBill.id);onClearInit&&setTimeout(onClearInit,100);}},[initBill?.id]);
  const bill=B.find(b=>b.id===vid)||initBill;
  const print=()=>{if(!bill)return;const w=window.open('','_blank');w.document.write('<html><head><title>Invoice '+(bill.invoiceNo||bill.id)+'</title><style>body{margin:0}@media print{@page{margin:8mm}}</style></head><body>');w.document.write(document.getElementById('invoice-print')?.innerHTML||'');w.document.write('</body></html>');w.document.close();w.print();};
  const downloadPDF=async()=>{if(!bill)return;setPdfBusy(true);try{const pdf=await makePDF('invoice-print');pdf?.save('Invoice-'+(bill.invoiceNo||bill.id)+'.pdf');}catch(e){showT('PDF failed: '+e.message,'err');}finally{setPdfBusy(false)}};
  const emailBill=async b=>{
    const cust=C.find(c=>c.id===b.customerId);
    const toEmail=cust?.email||b.customerEmail||'';
    if(!toEmail){showT('No email on file for this customer. Update in Customers page.','err');return;}
    setPdfBusy(true);
    try{
      const res=await api.post('/api/send-invoice',{
        bill:b,firm,payments:Py,toEmail,
        customSubject:firm.emailSubject||'',
        customBody:firm.emailBody||'',
      });
      if(res.error)throw new Error(res.error);
      showT('Invoice emailed to '+toEmail+' successfully!');
    }catch(e){
      showT('Email failed: '+e.message,'err');
    }finally{setPdfBusy(false);}
  };

  const whatsappBill=async b=>{
    const cust=C.find(c=>c.id===b.customerId);
    const phone=cust?.phone||b.customerPhone||'';
    if(!phone){showT('No phone number for customer','err');return;}
    const paid=Py.filter(p=>p.billId===b.id).reduce((s,p)=>s+p.amount,0);
    const bal=b.total-paid;
    try{
      await api.post('/api/send-notification',{
        type:'invoice',
        channel:'whatsapp',
        billId:b.id,
        recipients:[{
          mobile:phone,
          name:b.customerName,
          customerId:b.customerId,
          vars:{name:b.customerName,invoiceNo:b.invoiceNo||'#'+b.id,amount:fmt(b.total),firmName:firm.name,balance:fmt(bal)}
        }]
      });
      showT('Invoice sent via WhatsApp!');
    }catch(e){
      const ph=(phone||'').replace(/[^0-9]/g,'');
      const lines=['Dear '+b.customerName+',','',firm.name+' Invoice Details:','Invoice No: '+(b.invoiceNo||'#'+b.id),'Date: '+new Date(b.date).toLocaleDateString('en-IN'),'Total Amount: '+fmt(b.total)];
      if(paid>0){lines.push('Paid: '+fmt(paid));lines.push('Balance Due: '+fmt(bal));}
      lines.push('','Thank you for your business!','',firm.name);
      if(firm.mobile)lines.push(firm.mobile);
      const msg=lines.join('\n');
      const url='https://wa.me/'+(ph?'91'+ph:'')+'?text='+encodeURIComponent(msg);
      window.open(url,'_blank');
    }
  };

  const whatsappReminder=async b=>{
    const cust=C.find(c=>c.id===b.customerId);
    const phone=cust?.phone||b.customerPhone||'';
    const paid=Py.filter(p=>p.billId===b.id).reduce((s,p)=>s+p.amount,0);
    const bal=b.total-paid;
    if(bal<=0){showT('No outstanding balance on this bill','err');return;}
    if(!phone){showT('No phone number for customer','err');return;}
    try{
      await api.post('/api/send-notification',{
        type:'reminder',
        channel:'whatsapp',
        billId:b.id,
        recipients:[{
          mobile:phone,
          name:b.customerName,
          customerId:b.customerId,
          vars:{name:b.customerName,invoiceNo:b.invoiceNo||'#'+b.id,balance:fmt(bal),firmName:firm.name}
        }]
      });
      showT('Reminder sent via WhatsApp!');
    }catch(e){
      const ph=(phone||'').replace(/[^0-9]/g,'');
      const billDate=new Date(b.date);
      const dueDate=new Date(billDate);dueDate.setDate(dueDate.getDate()+45);
      const overdue=new Date()>dueDate;
      const lines=['Dear '+b.customerName+',','','*Payment Reminder from '+firm.name+'*','','Invoice No: '+(b.invoiceNo||'#'+b.id),'Invoice Date: '+billDate.toLocaleDateString('en-IN'),'Due Date: '+dueDate.toLocaleDateString('en-IN'),'','Total Amount: '+fmt(b.total),'Amount Paid: '+fmt(paid),'*Outstanding Balance: '+fmt(bal)+'*',''];
      if(overdue){lines.push('This payment is overdue. Please clear immediately to avoid interest charges.');}
      else{lines.push('Please arrange payment by the due date.');}
      lines.push('','For queries contact: '+(firm.mobile||firm.email||''),'','Thank you,',firm.name);
      const msg=lines.join('\n');
      const url='https://wa.me/'+(ph?'91'+ph:'')+'?text='+encodeURIComponent(msg);
      window.open(url,'_blank');
    }
  };

  const saveTransport=async id=>{const r=await api.patch('/api/bills',{id,transportName:transportForm.transportName,lrNumber:transportForm.lrNumber});setB(bs=>bs.map(b=>b.id===id?{...b,transportName:r.transportName,lrNumber:r.lrNumber}:b));setTransportEdit(null);showT('Transport details saved!');};
  const savePayment=async p=>{
    setPy(ps=>[p,...ps]);
    setPayBill(null);
    showT('Payment recorded!');
    if(firm.notifEnabled&&p.billId){
      const b=B.find(x=>x.id===p.billId);
      if(b){
        const cust=C.find(c=>c.id===b.customerId);
        const phone=cust?.phone||b.customerPhone;
        if(phone){
          try{
            await api.post('/api/send-notification',{
              type:'payment',
              channel:'whatsapp',
              billId:p.billId,
              recipients:[{mobile:phone,name:b.customerName,customerId:b.customerId,vars:{name:b.customerName,amount:fmt(p.amount),balance:fmt(b.total-p.amount),firmName:firm.name}}]
            });
          }catch(e){}
        }
      }
    }
  };
  const generateEWB=async b=>{
    if(!firm.ewbUsername||!firm.ewbPassword){showT('Set E-Way Bill credentials in Settings first.','err');return;}
    setEwbLoading(b.id);
    try{
      const res=await api.post('/api/ewaybill',{ewbUsername:firm.ewbUsername,ewbPassword:firm.ewbPassword,gstin:firm.gstin,bill:b,firm});
      if(res.error)throw new Error(res.error);
      await api.patch('/api/bills',{id:b.id,ewbNo:res.ewayBillNo,ewbValidUpto:res.validUpto});
      setB(bs=>bs.map(x=>x.id===b.id?{...x,ewbNo:res.ewayBillNo,ewbValidUpto:res.validUpto}:x));
      showT('EWB #'+res.ewayBillNo+' generated! Valid till '+res.validUpto);
    }catch(e){showT(e.message,'err');}
    finally{setEwbLoading(null);}
  };
  const updatePay=u=>setPy(ps=>ps.map(p=>p.id===u.id?u:p));
  return<div>
    <div style={S.h2}>Bills & Invoices</div>{toast}
    <div style={{...S.card,padding:0,marginBottom:14,overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:mob?500:700}}>
        <thead><tr>{['Invoice','Date','Customer','Pcs','Total','Paid','Status','Transport & LR','Actions'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {B.length===0&&<tr key='empty'><td colSpan={9}><MT msg='No bills yet.'/></td></tr>}
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
                <button style={S.btn('amb',true)} onClick={()=>emailBill(b)} disabled={pdfBusy}>{pdfBusy?<Spin/>:'Email'}</button>
                <button style={{...S.btn('suc',true),background:'#25D366',color:'#fff',border:'none'}} onClick={()=>whatsappBill(b)}>WA Bill</button>
                <button style={{...S.btn('def',true),fontSize:10}} onClick={()=>whatsappReminder(b)}>WA Remind</button>
                {b.ewbNo?<span style={{...S.mono,fontSize:10,color:GR,background:GRL,padding:'2px 6px',borderRadius:5,fontWeight:700}}>EWB: {b.ewbNo}</span>:<button style={S.btn('def',true)} onClick={()=>generateEWB(b)} disabled={ewbLoading===b.id}>{ewbLoading===b.id?<Spin/>:'E-Way'}</button>}
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
        <button style={S.btn('amb')} disabled={pdfBusy} onClick={()=>emailBill(bill)}>{pdfBusy?<><Spin/> Sending...</>:'Email Invoice'}</button>
        <button style={{...S.btn('suc'),background:'#25D366',color:'#fff',border:'none'}} onClick={()=>whatsappBill(bill)}>WhatsApp Bill</button>
        <button style={S.btn('gho')} onClick={()=>whatsappReminder(bill)}>WA Reminder</button>
        <button style={S.btn('pur')} onClick={downloadPDF} disabled={pdfBusy}>{pdfBusy?<><Spin/> Generating...</>:'Download PDF'}</button>
        <button style={S.btn('pur')} onClick={()=>setPayBill(bill)}>Record Payment</button>
        {bill.ewbNo?<span style={{...S.mono,color:GR,fontWeight:700,fontSize:12,background:GRL,padding:'4px 10px',borderRadius:6}}>EWB# {bill.ewbNo} | Valid: {bill.ewbValidUpto}</span>:<button style={S.btn('def')} onClick={()=>generateEWB(bill)} disabled={ewbLoading===bill.id}>{ewbLoading===bill.id?<><Spin/> Generating...</>:'Generate E-Way Bill'}</button>}
        <button style={S.btn('def')} onClick={()=>setVid(null)}>Close</button>
      </div>
      <div style={{border:'0.5px solid '+BORD,borderRadius:8,overflow:'hidden',background:'#fff'}}><Invoice bill={bill} firm={firm} payments={Py}/></div>
    </div>}
    {payBill&&<PayModal bill={payBill} onSave={savePayment} onClose={()=>setPayBill(null)}/>}
    {ewayBill&&<EWayBillModal bill={ewayBill} firm={firm} onClose={()=>setEwayBill(null)}/>}
  </div>;}

/* ── RETURNS ── */
function Returns({P,setP,B,C,Ret,setRet,mob}){
  const S=_theme==='modern'?MODERN_S:MINIMAL_S;
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



/* ── BANK RECONCILIATION ── */
function BankReconciliation({customerId,customerName,B,Py,firm,mob}){
  const[tab,setTab]=useState('upload'); // upload | results
  const[scanning,setScanning]=useState(false);
  const[scanStatus,setScanStatus]=useState('');
  const[transactions,setTransactions]=useState([]);
  const[stats,setStats]=useState(null);
  const[err,setErr]=useState(null);
  const[toast,showT]=useToast();
  const[filterStatus,setFilterStatus]=useState('all');
  const gk=()=>isBR?JSON.parse(localStorage.getItem('shopos_firm')||'{}').geminiKey||firm?.geminiKey||'':'';

  const custBills=B.filter(b=>b.customerId===customerId);
  const custPay=Py.filter(p=>custBills.some(b=>b.id===p.billId));

  const processFile=async(file)=>{
    const k=gk();
    if(!k){setErr('Add Gemini API key in Settings first.');return;}
    setScanning(true);setErr(null);setScanStatus('Reading file...');
    const reader=new FileReader();
    reader.onload=async ev=>{
      try{
        const isImage=file.type.startsWith('image/')||file.type==='application/pdf';
        let body;
        if(isImage){
          const b64=ev.target.result.split(',')[1];
          body={apiKey:k,imageData:b64,imageType:file.type,bills:custBills,payments:custPay};
          setScanStatus('Gemini reading bank statement image...');
        }else{
          // CSV or text
          const text=ev.target.result;
          body={apiKey:k,csvText:text,bills:custBills,payments:custPay};
          setScanStatus('Gemini parsing CSV transactions...');
        }
        const res=await fetch('/api/reconcile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
        const data=await res.json();
        if(data.error)throw new Error(data.error);
        setTransactions(data.transactions||[]);
        setStats(data.stats);
        setTab('results');
        showT((data.stats?.total||0)+' transactions extracted, '+(data.stats?.matched||0)+' auto-matched!');
      }catch(e){setErr('Failed: '+e.message);}
      finally{setScanning(false);setScanStatus('');}
    };
    if(file.type.startsWith('image/')||file.type==='application/pdf'){
      reader.readAsDataURL(file);
    }else{
      reader.readAsText(file);
    }
  };

  const handleFile=e=>{const f=e.target.files[0];if(f)processFile(f);e.target.value='';};

  const linkPayment=(txnIdx,paymentId)=>{
    setTransactions(ts=>ts.map((t,i)=>{
      if(i!==txnIdx)return t;
      const p=custPay.find(x=>x.id===paymentId);
      if(!p)return t;
      return{...t,match:{id:p.id,type:'payment',ref:p.partyName,amount:p.amount,date:p.date,score:100},matchType:'payment',status:'matched'};
    }));
  };

  const filtered=transactions.filter(t=>filterStatus==='all'||t.status===filterStatus);
  const statusColor={matched:GR,likely:AMB,unmatched:RD};
  const statusBg={matched:GRL,likely:AMBL,unmatched:RDL};

  return<div>
    {toast}
    <div style={{display:'flex',gap:6,marginBottom:14}}>
      {[['upload','Upload Statement'],['results','Results'+(stats?` (${stats.total})`:'')]].map(([t,l])=><button key={t} onClick={()=>setTab(t)} style={{padding:'7px 14px',borderRadius:7,border:'0.5px solid '+(tab===t?BL:BORD),background:tab===t?BL:'#fff',color:tab===t?'#fff':MUT,cursor:'pointer',fontSize:12,fontWeight:600}}>{l}</button>)}
    </div>

    {tab==='upload'&&<div style={{display:'grid',gridTemplateColumns:mob?'1fr':'1fr 1fr',gap:14}}>
      <div style={S.card}>
        <div style={S.h3}>Upload Bank Statement</div>
        <div style={{fontSize:12,color:MUT,marginBottom:14,lineHeight:1.7}}>
          Upload your bank statement and Gemini AI will:<br/>
          1. Extract all transactions automatically<br/>
          2. Auto-match credits against recorded payments<br/>
          3. Highlight unmatched transactions for review
        </div>
        <label style={{border:'1.5px dashed '+BORD,borderRadius:10,padding:'20px 16px',textAlign:'center',cursor:'pointer',background:BG,display:'block',marginBottom:12}}>
          <input type='file' accept='.csv,.xlsx,.xls,.txt,.pdf,image/*' style={{display:'none'}} onChange={handleFile} disabled={scanning}/>
          <div style={{fontSize:32,marginBottom:8}}>🏦</div>
          <div style={{fontWeight:700,marginBottom:6}}>Tap to upload bank statement</div>
          <div style={{display:'flex',gap:6,justifyContent:'center',flexWrap:'wrap',marginBottom:6}}>
            {[['CSV',GR,GRL],['PDF',RD,RDL],['Image',BL,BLL]].map(([l,c,bg])=><span key={l} style={{background:bg,color:c,padding:'2px 9px',borderRadius:12,fontSize:11,fontWeight:600}}>{l}</span>)}
          </div>
          <div style={{fontSize:11,color:MUT}}>SBI, HDFC, ICICI, Axis, Kotak — any Indian bank format</div>
        </label>
        {scanning&&<div style={{display:'flex',flexDirection:'column',gap:4,padding:'10px 14px',background:BLL,borderRadius:8,color:BL,fontSize:13}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}><Spin/>Processing statement...</div>
          {scanStatus&&<div style={{fontSize:11,opacity:.7,paddingLeft:22}}>{scanStatus}</div>}
        </div>}
        {err&&<div style={{padding:'10px 14px',borderRadius:8,background:RDL,color:RD,fontSize:12,marginTop:8}}>{err}</div>}
      </div>
      <div style={S.card}>
        <div style={S.h3}>How to export your bank statement</div>
        {[['SBI','Login → eStatement → Select dates → Download CSV'],['HDFC','Login → Accounts → Download Statement → CSV format'],['ICICI','Login → Account Summary → Download → Excel/CSV'],['Axis','Login → My Account → Download Statement → Excel'],['Kotak','Login → Account Summary → Download → CSV'],['Any Bank','Screenshot or scan the printed statement — Gemini reads images too!']].map(([bank,steps])=><div key={bank} style={{padding:'6px 0',borderBottom:'0.5px solid #f0ede8'}}>
          <div style={{fontWeight:700,fontSize:11,color:BL}}>{bank}</div>
          <div style={{fontSize:11,color:MUT,marginTop:1}}>{steps}</div>
        </div>)}
      </div>
    </div>}

    {tab==='results'&&transactions.length>0&&<div>
      {/* Stats cards */}
      {stats&&<div style={{display:'grid',gridTemplateColumns:mob?'1fr 1fr':'repeat(5,1fr)',gap:10,marginBottom:14}}>
        {[['Total Txns',stats.total,TXT,BG],['Matched',stats.matched,GR,GRL],['Likely',stats.likely,AMB,AMBL],['Unmatched',stats.unmatched,RD,RDL],['Net Credits','Rs.'+stats.totalCredits.toFixed(0),GR,GRL]].map(([l,v,c,bg])=><div key={l} style={{...S.met,background:bg,border:'0.5px solid '+c+'30'}}>
          <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',color:c+'aa',marginBottom:2}}>{l}</div>
          <div style={{fontSize:18,fontWeight:800,fontFamily:'DM Mono,monospace',color:c}}>{v}</div>
        </div>)}
      </div>}
      {/* Filter tabs */}
      <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
        {[['all','All'],['matched','Matched'],['likely','Likely Match'],['unmatched','Unmatched']].map(([s,l])=><button key={s} onClick={()=>setFilterStatus(s)} style={{padding:'5px 12px',borderRadius:20,border:'0.5px solid '+(filterStatus===s?(statusColor[s]||BL):BORD),background:filterStatus===s?(statusBg[s]||BLL):'#fff',color:filterStatus===s?(statusColor[s]||BL):MUT,cursor:'pointer',fontSize:11,fontWeight:600}}>{l} {s!=='all'?`(${transactions.filter(t=>t.status===s).length})`:''}</button>)}
        <button style={{...S.btn('gho',true),fontSize:11}} onClick={()=>{setTab('upload');setTransactions([]);setStats(null);}}>Upload Another</button>
      </div>
      {/* Transactions table */}
      <div style={{...S.card,padding:0,overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:mob?600:800}}>
          <thead><tr>{['Date','Description','Ref','Amount','Type','Status','Matched To','Action'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.length===0&&<tr key='empty'><td colSpan={8}><MT msg='No transactions in this filter'/></td></tr>}
            {filtered.map((t,i)=><tr key={i} style={{background:t.status==='matched'?'#f0fff4':t.status==='likely'?'#fffbf0':'#fff'}}>
              <td style={{...S.td,fontSize:11,whiteSpace:'nowrap'}}>{t.date}</td>
              <td style={{...S.td,fontSize:11,maxWidth:200}}><div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:200}} title={t.description}>{t.description}</div></td>
              <td style={{...S.td,...S.mono,fontSize:10,color:MUT}}>{t.ref||'—'}</td>
              <td style={{...S.td,...S.mono,fontWeight:700,color:t.type==='credit'?GR:RD}}>{t.type==='credit'?'+':'-'}Rs.{(+t.amount).toFixed(2)}</td>
              <td style={S.td}><Bdg c={t.type==='credit'?'green':'red'}>{t.type}</Bdg></td>
              <td style={S.td}><span style={{background:statusBg[t.status]||BG,color:statusColor[t.status]||MUT,padding:'2px 8px',borderRadius:10,fontSize:11,fontWeight:700}}>{t.status==='matched'?'Matched':t.status==='likely'?'Likely':'Unmatched'}</span></td>
              <td style={{...S.td,fontSize:11}}>
                {t.match?<div><div style={{fontWeight:600,color:statusColor[t.status]}}>{t.match.ref}</div><div style={{fontSize:9,color:MUT,...S.mono}}>Rs.{(+t.match.amount).toFixed(2)} · {t.matchScore}%</div></div>:'—'}
              </td>
              <td style={S.td}>
                {t.status!=='matched'&&custPay.length>0&&<select style={{...S.inp,fontSize:10,padding:'2px 6px',width:'auto'}} onChange={e=>linkPayment(i,e.target.value)} defaultValue=''>
                  <option value=''>Link payment...</option>
                  {custPay.map(p=><option key={p.id} value={p.id}>{p.mode} Rs.{p.amount} {p.date?new Date(p.date).toLocaleDateString('en-IN'):''}</option>)}
                </select>}
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>}
    {tab==='results'&&transactions.length===0&&<MT msg='Upload a bank statement first'/>}
  </div>;
}

/* ── BANK STATEMENTS ── */
function CustomerBankStatements({customerId}){
  const[files,setFiles]=useState([]);const[loading,setLoading]=useState(true);
  const[uploading,setUploading]=useState(false);const[desc,setDesc]=useState('');
  const[stmtDate,setStmtDate]=useState('');const[toast,showT]=useToast();

  useEffect(()=>{
    api.get('/api/statements?customerId='+customerId).then(d=>{
      setFiles(Array.isArray(d)?d:[]);
    }).finally(()=>setLoading(false));
  },[customerId]);

  const upload=async e=>{
    const file=e.target.files[0];if(!file)return;
    const maxMB=5;
    if(file.size>maxMB*1024*1024){showT('File too large — max 5MB','err');return;}
    setUploading(true);
    const reader=new FileReader();
    reader.onload=async ev=>{
      try{
        const b64=ev.target.result.split(',')[1];
        const res=await api.post('/api/statements',{
          customerId,fileName:file.name,fileType:file.type,
          fileData:b64,fileSize:file.size,
          description:desc,statementDate:stmtDate||null,
        });
        if(res.error)throw new Error(res.error);
        setFiles(fs=>[res,...fs]);setDesc('');setStmtDate('');
        showT('Statement uploaded!');
      }catch(err){showT('Upload failed: '+err.message,'err');}
      finally{setUploading(false);}
    };
    reader.readAsDataURL(file);
    e.target.value='';
  };

  const download=async f=>{
    const res=await api.patch('/api/statements',{id:f.id});
    if(res.error){showT('Download failed','err');return;}
    const link=document.createElement('a');
    link.href='data:'+res.fileType+';base64,'+res.fileData;
    link.download=res.fileName;link.click();
  };

  const del=async id=>{
    if(!confirm('Delete this file?'))return;
    await api.del('/api/statements?id='+id);
    setFiles(fs=>fs.filter(f=>f.id!==id));
    showT('Deleted');
  };

  const fmtSize=bytes=>{if(bytes<1024)return bytes+'B';if(bytes<1024*1024)return(bytes/1024).toFixed(0)+'KB';return(bytes/1024/1024).toFixed(1)+'MB';};
  const fmtType=t=>{if(t.includes('pdf'))return'PDF';if(t.includes('csv')||t.includes('text'))return'CSV';if(t.includes('image'))return'IMG';return'FILE';};
  const typeColor=t=>t==='PDF'?RD:t==='CSV'?GR:t==='IMG'?BL:AMB;
  const typeBg=t=>t==='PDF'?RDL:t==='CSV'?GRL:t==='IMG'?BLL:AMBL;

  return<div style={{marginTop:16}}>
    {toast}
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
      <div style={S.h3}>Bank Statements & Documents</div>
      <span style={{fontSize:11,color:MUT}}>PDF, CSV, images — max 5MB each</span>
    </div>
    {/* Upload area */}
    <div style={{...S.card,marginBottom:12,background:BG,border:'0.5px solid '+BORD}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
        <Fld label='Description (optional)'><input style={S.inp} value={desc} onChange={e=>setDesc(e.target.value)} placeholder='e.g. April 2025 bank statement'/></Fld>
        <Fld label='Statement Date'><input style={S.inp} type='date' value={stmtDate} onChange={e=>setStmtDate(e.target.value)}/></Fld>
      </div>
      <label style={{display:'inline-flex',alignItems:'center',gap:8,cursor:'pointer',...S.btn('gho')}}>
        <input type='file' accept='.pdf,.csv,.xlsx,.xls,image/*' style={{display:'none'}} onChange={upload} disabled={uploading}/>
        {uploading?<><Spin/>Uploading...</>:'+ Upload File'}
      </label>
    </div>
    {/* Files list */}
    {loading?<MT msg='Loading...'/>:files.length===0?<MT msg='No files uploaded yet. Upload bank statements, ledger exports or any document for this customer.'/>:
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      {files.map(f=>{
        const t=fmtType(f.fileType);
        return<div key={f.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',border:'0.5px solid '+BORD,borderRadius:8,background:'#fff'}}>
          <div style={{width:34,height:34,borderRadius:6,background:typeBg(t),display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:typeColor(t),flexShrink:0}}>{t}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:600,fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.fileName}</div>
            <div style={{fontSize:10,color:MUT,marginTop:2,display:'flex',gap:8,flexWrap:'wrap'}}>
              {f.description&&<span>{f.description}</span>}
              {f.statementDate&&<span>📅 {new Date(f.statementDate).toLocaleDateString('en-IN')}</span>}
              <span>{fmtSize(f.fileSize)}</span>
              <span>Uploaded {new Date(f.uploadedAt).toLocaleDateString('en-IN')}</span>
            </div>
          </div>
          <div style={{display:'flex',gap:6,flexShrink:0}}>
            <button style={S.btn('gho',true)} onClick={()=>download(f)}>⬇ Download</button>
            <button style={S.btn('dan',true)} onClick={()=>del(f.id)}>Delete</button>
          </div>
        </div>;})}
    </div>}
  </div>;
}

/* ── CUSTOMER ACCOUNT VIEW ── */
function CustomerAccount({cust,B,Py,setPy,firm,onClose}){
  const cb=B.filter(b=>b.customerId===cust.id);
  const custPay=Py.filter(p=>cb.some(b=>b.id===p.billId));
  const obAmt=cust.openingBalance||0;
  const tv=cb.reduce((s,b)=>s+b.total,0);
  const tp=custPay.reduce((s,p)=>s+p.amount,0);
  const bal=(obAmt+tv)-tp;
  const upPay=u=>setPy(ps=>ps.map(p=>p.id===u.id?u:p));
  const[caTab,setCaTab]=useState('statement'); // statement | reconcile | files
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
    {/* Tabs */}
    <div style={{display:'flex',gap:6,marginBottom:14,borderBottom:'0.5px solid '+BORD,paddingBottom:10}}>
      {[['statement','Transactions'],['reconcile','Bank Reconciliation'],['notifications','Notifications'],['files','Documents']].map(([t,l])=><button key={t} onClick={()=>setCaTab(t)} style={{padding:'6px 14px',borderRadius:7,border:'0.5px solid '+(caTab===t?BL:BORD),background:caTab===t?BL:'#fff',color:caTab===t?'#fff':MUT,cursor:'pointer',fontSize:12,fontWeight:600}}>{l}</button>)}
    </div>

    {caTab==='statement'&&<div>
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
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
      <div style={S.h3}>Full Statement</div>
      {(firm?.interestEnabled)&&<div style={{fontSize:11,color:AMB,background:AMBL,padding:'3px 10px',borderRadius:6}}>Interest: 12% p.a. after 60 days</div>}
    </div>
    <div style={{...S.card,padding:0,overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:400}}>
        <thead><tr>{['Date','Type','Reference','Debit','Credit',firm?.interestEnabled?'Bill Interest':null,firm?.interestEnabled&&firm?.interestOnOpeningBalance?'OB Interest':null,'Balance'].filter(Boolean).map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {withBal.map(e=>{
            const billInterest=(firm?.interestEnabled&&e.type==='Invoice')?calcInterest(e.debit,e.date):0;
            const obInterest=(firm?.interestEnabled&&firm?.interestOnOpeningBalance&&e.type==='Opening Balance')?calcInterest(e.debit,e.date):0;
            return<tr key={e.id} style={{background:e.type==='Opening Balance'?AMBL:''}}>
              <td style={{...S.td,fontSize:11}}>{new Date(e.date).toLocaleDateString('en-IN')}</td>
              <td style={S.td}><Bdg c={e.type==='Invoice'?'red':e.type==='Payment'?'green':'amber'}>{e.type}</Bdg></td>
              <td style={{...S.td,...S.mono,fontSize:11,fontWeight:600}}>{e.ref}</td>
              <td style={{...S.td,...S.mono,color:e.debit>0?RD:MUT,fontWeight:e.debit>0?700:400}}>{e.debit>0?fmt(e.debit):'—'}</td>
              <td style={{...S.td,...S.mono,color:e.credit>0?GR:MUT,fontWeight:e.credit>0?700:400}}>{e.credit>0?fmt(e.credit):'—'}</td>
              {firm?.interestEnabled&&<td style={{...S.td,...S.mono,color:billInterest>0?AMB:MUT,fontSize:11}}>{billInterest>0?fmt(billInterest):'—'}</td>}
              {firm?.interestEnabled&&firm?.interestOnOpeningBalance&&<td style={{...S.td,...S.mono,color:obInterest>0?AMB:MUT,fontSize:11}}>{obInterest>0?fmt(obInterest):'—'}</td>}
              <td style={{...S.td,...S.mono,fontWeight:700,color:e.bal>0?RD:GR}}>{fmt(e.bal)}</td>
            </tr>;})}
          <tr style={{background:'#f5f4f0',fontWeight:700}}><td colSpan={3} style={S.td}>TOTALS</td><td style={{...S.td,...S.mono,color:RD,fontWeight:800}}>{fmt(obAmt+tv)}</td><td style={{...S.td,...S.mono,color:GR,fontWeight:800}}>{fmt(tp)}</td><td style={{...S.td,...S.mono,fontWeight:800,color:bal>0?RD:GR}}>{fmt(bal)}</td></tr>
        </tbody>
      </table>
    </div>
  </div>}
    {caTab==='reconcile'&&<BankReconciliation customerId={cust.id} customerName={cust.name} B={B} Py={Py} firm={firm} mob={false}/>}
    {caTab==='notifications'&&<NotificationHistory customerId={cust.id} customerName={cust.name}/>}
    {caTab==='files'&&<CustomerBankStatements customerId={cust.id}/>}
  </Modal>;}

function NotificationHistory({customerId,customerName}){
  const S=_theme==='modern'?MODERN_S:MINIMAL_S;
  const[logs,setLogs]=useState([]);const[loading,setLoading]=useState(true);
  useEffect(()=>{
    (async()=>{
      try{const d=await api.get('/api/notification-log');setLogs(Array.isArray(d)?d.filter(l=>l.customerId===customerId):[]);}catch(e){}
      setLoading(false);
    })();
  },[customerId]);
  return<div>
    <div style={S.h3}>Messages to {customerName}</div>
    {loading?<MT msg='Loading...'/>:logs.length===0?<MT msg='No notifications sent'/>:<div style={{...S.card,padding:0,overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:500}}>
        <thead><tr>{['Date','Type','Channel','Status','Message'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>{logs.map(l=><tr key={l.id}><td style={{...S.td,fontSize:11}}>{l.sentAt?new Date(l.sentAt).toLocaleDateString('en-IN')+' '+new Date(l.sentAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):'—'}</td><td style={S.td}><Bdg c={{invoice:'blue',payment:'green',reminder:'amber',broadcast:'purple'}[l.type]||'gray'}>{l.type}</Bdg></td><td style={S.td}><Bdg c={{whatsapp:'green',sms:'blue',both:'purple',failed:'red'}[l.channel]||'gray'}>{l.channel}</Bdg></td><td style={S.td}><Bdg c={l.status==='sent'?'green':'red'}>{l.status}</Bdg></td><td style={{...S.td,fontSize:11,color:MUT,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={l.message}>{l.message||'—'}</td></tr>)}
        </tbody>
      </table>
    </div>}
  </div>;
}

function BroadcastModal({firm,C,B,Py,onClose,onSent}){
  const S=_theme==='modern'?MODERN_S:MINIMAL_S;
  const[filter,setFilter]=useState('all');const[selected,setSelected]=useState(new Set());const[msg,setMsg]=useState('');const[sending,setSending]=useState(false);const[toast,showT]=useToast();
  const options={all:{label:'All Customers',count:C.length},balance:{label:'Customers with Balance',count:C.filter(c=>{const cb=B.filter(b=>b.customerId===c.id);const tp=Py.filter(p=>cb.some(b=>b.id===p.billId)).reduce((s,p)=>s+p.amount,0);return(c.openingBalance||0)+(cb.reduce((s,b)=>s+b.total,0))-tp>0;}).length}};
  const filtered=filter==='all'?C:filter==='balance'?C.filter(c=>{const cb=B.filter(b=>b.customerId===c.id);const tp=Py.filter(p=>cb.some(b=>b.id===p.billId)).reduce((s,p)=>s+p.amount,0);return(c.openingBalance||0)+(cb.reduce((s,b)=>s+b.total,0))-tp>0;}):[];
  const send=async()=>{
    if(!msg.trim()){showT('Enter a message','err');return;}
    if(selected.size===0){showT('Select customers','err');return;}
    setSending(true);
    try{
      const recipients=Array.from(selected).map(id=>{const c=C.find(x=>x.id===id);return{mobile:c.phone,name:c.name,customerId:id,vars:{name:c.name,firmName:firm.name}};});
      const res=await api.post('/api/send-notification',{type:'broadcast',channel:'whatsapp',customMessage:msg,recipients});
      if(res.success){showT(`Sent to ${res.count} customers!`);setMsg('');setSelected(new Set());onSent();}else{showT('Failed to send: '+res.error,'err');}
    }catch(e){showT('Error: '+e.message,'err');}finally{setSending(false);}
  };
  return<Modal title='📢 Send Broadcast Message' onClose={onClose} wide>
    <div style={{marginBottom:12}}>
      <div style={S.h3}>Select Recipients</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
        {Object.entries(options).map(([k,v])=><button key={k} onClick={()=>{setFilter(k);setSelected(new Set(filtered.map(c=>c.id)));}} style={{...S.btn('def'),textAlign:'left',justifyContent:'flex-start',padding:'12px',height:'auto',flexDirection:'column',gap:4,background:filter===k?BLL:'#fff'}}>
          <div style={{fontWeight:700,fontSize:13}}>{v.label}</div>
          <div style={{fontSize:11,color:MUT}}>{v.count} customer{v.count!==1?'s':''}</div>
        </button>)}
      </div>
      {filtered.length>0&&<div style={{...S.card,maxHeight:200,overflowY:'auto',marginBottom:8}}>
        <div style={{...S.h3,marginBottom:8}}>Select ({selected.size}/{filtered.length})</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:6}}>{filtered.map(c=><label key={c.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px',border:'0.5px solid '+BORD,borderRadius:6,cursor:'pointer',background:selected.has(c.id)?BLL:'#fff'}}>
          <input type='checkbox' checked={selected.has(c.id)} onChange={e=>{const s=new Set(selected);e.target.checked?s.add(c.id):s.delete(c.id);setSelected(s);}} style={{cursor:'pointer'}}/>
          <div>
            <div style={{fontWeight:600,fontSize:12}}>{c.name}</div>
            <div style={{fontSize:10,color:MUT}}>{c.phone}</div>
          </div>
        </label>)}</div>
      </div>}
    </div>
    <div style={{marginBottom:12}}>
      <div style={S.h3}>Message</div>
      <textarea style={{...S.inp,resize:'vertical',fontSize:12}} rows={4} value={msg} onChange={e=>setMsg(e.target.value)} placeholder='Enter your broadcast message...'/>
    </div>
    <div style={{display:'flex',gap:8}}><button style={S.btn('pri')} onClick={send} disabled={sending}>{sending?'Sending...':'Send to '+selected.size+' customer'+(selected.size!==1?'s':'')}</button><button style={S.btn()} onClick={onClose}>Cancel</button></div>
  </Modal>;
}

/* ── CUSTOMERS ── */
function Customers({C,setC,B,Py,setPy,firm,mob,onRefresh}){
  const S=_theme==='modern'?MODERN_S:MINIMAL_S;
  const[show,setShow]=useState(false);const[srch,setSrch]=useState('');const[selCust,setSelCust]=useState(null);
  const[editId,setEditId]=useState(null); // null=new, id=editing
  const[broadcastShow,setBroadcastShow]=useState(false);
  const[refreshing,setRefreshing]=useState(false);
  const[sortBy,setSortBy]=useState('name');const[sortOrder,setSortOrder]=useState('asc');
  const[currentPage,setCurrentPage]=useState(1);const[itemsPerPage,setItemsPerPage]=useState(10);
  const[showColConfig,setShowColConfig]=useState(false);
  const allCols=['name','phone','shop','email','gst','address','openingBal','bills','totalBilled','paid','balance'];
  const[visCols,setVisCols]=useState(()=>isBR?JSON.parse(localStorage.getItem('custVisCols')||JSON.stringify(['name','phone','shop','openingBal','bills','totalBilled','paid','balance'])):['name','phone','shop','openingBal','bills','totalBilled','paid','balance']);
  const BLANK={name:'',phone:'',shopname:'',gst:'',addr:'',email:'',openingBalance:'',openingBalanceDate:''};
  const[f,setF]=useState(BLANK);
  const[toast,showT]=useToast();
  const openNew=()=>{setEditId(null);setF(BLANK);setShow(true);};
  const openEdit=c=>{setEditId(c.id);setF({name:c.name,phone:c.phone,shopname:c.shopname||'',gst:c.gst||'',addr:c.addr||'',email:c.email||'',openingBalance:c.openingBalance||'',openingBalanceDate:c.openingBalanceDate||''});setShow(true);};
  const handleRefresh=async()=>{setRefreshing(true);await onRefresh?.();setRefreshing(false);};
  const toggleCol=col=>{const nc=visCols.includes(col)?visCols.filter(c=>c!==col):[...visCols,col];setVisCols(nc);if(isBR)localStorage.setItem('custVisCols',JSON.stringify(nc));};
  const save=async()=>{
    if(!f.name||!f.phone){showT('Name & phone required','err');return}
    if(editId){
      const updated=await api.patch('/api/customers',{id:editId,...f,openingBalance:+f.openingBalance||0,openingBalanceDate:f.openingBalanceDate||null});
      setC(cs=>cs.map(c=>c.id===editId?{...c,...updated}:c));
      showT('Customer updated!');
    }else{
      const nc=await api.post('/api/customers',{...f,openingBalance:+f.openingBalance||0,openingBalanceDate:f.openingBalanceDate||null});
      setC(cs=>[nc,...cs]);
      showT('Customer added!');
    }
    setF(BLANK);setShow(false);setEditId(null);
  };
  const del=async id=>{if(!confirm('Remove?'))return;await api.del('/api/customers?id='+id);setC(cs=>cs.filter(c=>c.id!==id))};
  const filtered=C.filter(c=>(c.name+' '+(c.phone||'')+' '+(c.shopname||'')+' '+(c.gst||'')+' '+(c.addr||'')+' '+(c.email||'')).toLowerCase().includes(srch.toLowerCase()));
  const enriched=filtered.map(c=>{const cb=B.filter(b=>b.customerId===c.id);const tv=cb.reduce((s,b)=>s+b.total,0);const tp=Py.filter(p=>cb.some(b=>b.id===p.billId)).reduce((s,p)=>s+p.amount,0);const ob=c.openingBalance||0;const bal=(ob+tv)-tp;return{...c,billCount:cb.length,totalBilled:ob+tv,paid:tp,balance:bal};});
  const sorted=enriched.sort((a,b)=>{let aVal=a[sortBy],bVal=b[sortBy];if(typeof aVal==='string')aVal=aVal.toLowerCase();if(typeof bVal==='string')bVal=bVal.toLowerCase();const cmp=aVal<bVal?-1:aVal>bVal?1:0;return sortOrder==='asc'?cmp:-cmp;});
  const total=sorted.length;const pages=Math.ceil(total/itemsPerPage);const start=(currentPage-1)*itemsPerPage;const paginated=sorted.slice(start,start+itemsPerPage);
  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,gap:8,flexWrap:'wrap'}}><div style={S.h2}>Customer Master</div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button style={{...S.btn('pur'),...{background:PURL,color:PUR,border:'0.5px solid #c0a0e0'}}} onClick={()=>setBroadcastShow(true)}>📢 Send Broadcast</button><button style={S.btn('pri')} onClick={openNew}>+ Add Customer</button></div></div>{toast}
    {showColConfig&&<div style={{position:'fixed',inset:0,zIndex:40}} onClick={()=>setShowColConfig(false)}/>}
    {showColConfig&&<div style={{position:'absolute',top:'calc(100% + 8px)',right:0,background:'#fff',border:'0.5px solid '+BORD,borderRadius:6,boxShadow:'0 4px 16px rgba(0,0,0,0.1)',minWidth:200,zIndex:50,maxHeight:'60vh',overflowY:'auto'}}>
      {[['name','Name'],['phone','Mobile'],['shop','Shop'],['email','Email'],['gst','GSTIN'],['address','Address'],['openingBal','Opening Bal'],['bills','Bills'],['totalBilled','Total Billed'],['paid','Paid'],['balance','Balance']].map(([k,l])=>(
        <label key={k} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',cursor:'pointer',borderBottom:'0.5px solid #f0f0f0',transition:'background 0.15s',background:'transparent'}} onMouseEnter={e=>e.currentTarget.style.background='#f5f5f5'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          <input type='checkbox' checked={visCols.includes(k)} onChange={()=>toggleCol(k)} style={{cursor:'pointer',accentColor:BL,width:16,height:16}}/>
          <span style={{fontSize:12,color:'#333',fontWeight:500}}>{l}</span>
        </label>
      ))}
    </div>}
    {broadcastShow&&<BroadcastModal firm={firm} C={C} B={B} Py={Py} onClose={()=>setBroadcastShow(false)} onSent={()=>{setBroadcastShow(false);showT('Broadcast sent!')}}/>}
    {show&&<div style={{...S.card,marginBottom:12}}>
      <div style={S.h2}>{editId?'Edit Customer':'New Customer'}</div>
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
      <div style={{display:'flex',gap:8}}><button style={S.btn('pri')} onClick={save}>Save</button><button style={S.btn()} onClick={()=>{setShow(false);setEditId(null);}}>Cancel</button></div>
    </div>}
    <div style={{position:'relative',marginBottom:14}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,background:'#fff',padding:'8px 12px',borderRadius:8,border:'0.5px solid '+BORD}}>
        <input style={{flex:1,border:'none',background:'transparent',fontSize:12,outline:'none',padding:0,color:'#333'}} placeholder='Search name, email, role...' value={srch} onChange={e=>{setSrch(e.target.value);setCurrentPage(1);}}/>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          {srch&&<button style={{fontSize:11,padding:'4px 10px',borderRadius:4,border:'0.5px solid '+BORD,background:'#fff',cursor:'pointer',color:'#666',whiteSpace:'nowrap'}} onClick={()=>{setSrch('');setCurrentPage(1);}}>Clear</button>}
          <button style={{fontSize:11,padding:'4px 10px',borderRadius:4,border:'0.5px solid '+BORD,background:'#fff',cursor:'pointer',color:'#666',fontWeight:500,whiteSpace:'nowrap'}} onClick={e=>{e.stopPropagation();setShowColConfig(!showColConfig);}}>Columns</button>
        </div>
      </div>
      {showColConfig&&<div style={{position:'fixed',inset:0,zIndex:40}} onClick={()=>setShowColConfig(false)}/>}
      {showColConfig&&<div style={{position:'absolute',top:'calc(100% + 6px)',right:0,background:'#fff',border:'0.5px solid '+BORD,borderRadius:6,boxShadow:'0 4px 16px rgba(0,0,0,0.1)',minWidth:180,zIndex:50,maxHeight:'60vh',overflowY:'auto'}}>
        {[['name','Name'],['phone','Mobile'],['shop','Shop'],['email','Email'],['gst','GSTIN'],['address','Address'],['openingBal','Opening Bal'],['bills','Bills'],['totalBilled','Total Billed'],['paid','Paid'],['balance','Balance']].map(([k,l])=>(
          <label key={k} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',cursor:'pointer',borderBottom:'0.5px solid #f0f0f0',transition:'background 0.15s',background:'transparent'}} onMouseEnter={e=>e.currentTarget.style.background='#f5f5f5'} onMouseLeave={e=>e.currentTarget.style.background='transparent'} onClick={e=>e.stopPropagation()}>
            <input type='checkbox' checked={visCols.includes(k)} onChange={()=>toggleCol(k)} style={{cursor:'pointer',accentColor:BL,width:16,height:16}}/>
            <span style={{fontSize:12,color:'#333',fontWeight:500}}>{l}</span>
          </label>
        ))}
      </div>}
    </div>
    <div style={{...S.card,padding:0,overflowX:'auto',marginBottom:12,border:'0.5px solid '+BORD,borderRadius:8,background:'#fff'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:mob?500:700}}>
        <thead>
          <tr style={{background:'#f9fafb',borderBottom:'0.5px solid '+BORD}}>
            {visCols.includes('name')&&<th style={{padding:'12px 14px',textAlign:'left',fontWeight:600,fontSize:11,color:'#666',cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}} onClick={()=>{setSortBy('name');setSortOrder(sortBy==='name'?sortOrder==='asc'?'desc':'asc':'asc');}}>Name {sortBy==='name'&&(sortOrder==='asc'?'«':'»')}</th>}
            {visCols.includes('phone')&&<th style={{padding:'12px 14px',textAlign:'left',fontWeight:600,fontSize:11,color:'#666',cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}} onClick={()=>{setSortBy('phone');setSortOrder(sortBy==='phone'?sortOrder==='asc'?'desc':'asc':'asc');}}>Mobile {sortBy==='phone'&&(sortOrder==='asc'?'«':'»')}</th>}
            {visCols.includes('shop')&&<th style={{padding:'12px 14px',textAlign:'left',fontWeight:600,fontSize:11,color:'#666',cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}} onClick={()=>{setSortBy('shopname');setSortOrder(sortBy==='shopname'?sortOrder==='asc'?'desc':'asc':'asc');}}>Shop {sortBy==='shopname'&&(sortOrder==='asc'?'«':'»')}</th>}
            {visCols.includes('email')&&<th style={{padding:'12px 14px',textAlign:'left',fontWeight:600,fontSize:11,color:'#666',userSelect:'none',whiteSpace:'nowrap'}}>Email</th>}
            {visCols.includes('gst')&&<th style={{padding:'12px 14px',textAlign:'left',fontWeight:600,fontSize:11,color:'#666',userSelect:'none',whiteSpace:'nowrap'}}>GSTIN</th>}
            {visCols.includes('address')&&<th style={{padding:'12px 14px',textAlign:'left',fontWeight:600,fontSize:11,color:'#666',userSelect:'none',whiteSpace:'nowrap'}}>Location</th>}
            {visCols.includes('openingBal')&&<th style={{padding:'12px 14px',textAlign:'left',fontWeight:600,fontSize:11,color:'#666',cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}} onClick={()=>{setSortBy('openingBalance');setSortOrder(sortBy==='openingBalance'?sortOrder==='asc'?'desc':'asc':'asc');}}>Opening Bal {sortBy==='openingBalance'&&(sortOrder==='asc'?'«':'»')}</th>}
            {visCols.includes('bills')&&<th style={{padding:'12px 14px',textAlign:'left',fontWeight:600,fontSize:11,color:'#666',cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}} onClick={()=>{setSortBy('billCount');setSortOrder(sortBy==='billCount'?sortOrder==='asc'?'desc':'asc':'asc');}}>Bills {sortBy==='billCount'&&(sortOrder==='asc'?'«':'»')}</th>}
            {visCols.includes('totalBilled')&&<th style={{padding:'12px 14px',textAlign:'left',fontWeight:600,fontSize:11,color:'#666',cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}} onClick={()=>{setSortBy('totalBilled');setSortOrder(sortBy==='totalBilled'?sortOrder==='asc'?'desc':'asc':'asc');}}>Total Billed {sortBy==='totalBilled'&&(sortOrder==='asc'?'«':'»')}</th>}
            {visCols.includes('paid')&&<th style={{padding:'12px 14px',textAlign:'left',fontWeight:600,fontSize:11,color:'#666',cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}} onClick={()=>{setSortBy('paid');setSortOrder(sortBy==='paid'?sortOrder==='asc'?'desc':'asc':'asc');}}>Paid {sortBy==='paid'&&(sortOrder==='asc'?'«':'»')}</th>}
            {visCols.includes('balance')&&<th style={{padding:'12px 14px',textAlign:'left',fontWeight:600,fontSize:11,color:'#666',cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}} onClick={()=>{setSortBy('balance');setSortOrder(sortBy==='balance'?sortOrder==='asc'?'desc':'asc':'asc');}}>Balance {sortBy==='balance'&&(sortOrder==='asc'?'«':'»')}</th>}
            <th style={{padding:'12px 14px',textAlign:'center',fontWeight:600,fontSize:11,color:'#666',whiteSpace:'nowrap'}}>Action</th>
          </tr>
        </thead>
        <tbody>
          {paginated.length===0&&<tr><td colSpan={visCols.length+1} style={{padding:'40px',textAlign:'center',color:MUT}}>{srch?'No customers found':'No customers yet'}</td></tr>}
          {paginated.map((c,idx)=>(
            <tr key={c.id} style={{borderBottom:'0.5px solid '+BORD,cursor:'pointer',background:idx%2===0?'#fafbfc':'#fff',transition:'background 0.2s'}} onMouseEnter={e=>e.currentTarget.style.background='#f0f5ff'} onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'#fafbfc':'#fff'} onClick={()=>setSelCust(c)}>
              {visCols.includes('name')&&<td style={{padding:'12px 14px',fontSize:12,fontWeight:500,color:'#222'}}>{c.name}</td>}
              {visCols.includes('phone')&&<td style={{padding:'12px 14px',fontSize:12,color:'#555',fontFamily:'monospace'}}>{c.phone}</td>}
              {visCols.includes('shop')&&<td style={{padding:'12px 14px',fontSize:12,color:'#666'}}>{c.shopname||'—'}</td>}
              {visCols.includes('email')&&<td style={{padding:'12px 14px',fontSize:12,color:'#666'}}>{c.email||'—'}</td>}
              {visCols.includes('gst')&&<td style={{padding:'12px 14px',fontSize:12,color:'#666',fontFamily:'monospace'}}>{c.gst||'—'}</td>}
              {visCols.includes('address')&&<td style={{padding:'12px 14px',fontSize:12,color:'#666'}}>{c.addr||'—'}</td>}
              {visCols.includes('openingBal')&&<td style={{padding:'12px 14px',fontSize:12,fontFamily:'monospace',fontWeight:500,color:c.openingBalance>0?AMB:'#666'}}>{c.openingBalance>0?fmt(c.openingBalance):'—'}</td>}
              {visCols.includes('bills')&&<td style={{padding:'12px 14px',fontSize:12}}><span style={{background:'#e3f2fd',color:BL,padding:'3px 8px',borderRadius:12,fontSize:11,fontWeight:600}}>{c.billCount}</span></td>}
              {visCols.includes('totalBilled')&&<td style={{padding:'12px 14px',fontSize:12,fontFamily:'monospace',fontWeight:600,color:'#222'}}>{fmt(c.totalBilled)}</td>}
              {visCols.includes('paid')&&<td style={{padding:'12px 14px',fontSize:12,fontFamily:'monospace',fontWeight:600,color:GR}}>{fmt(c.paid)}</td>}
              {visCols.includes('balance')&&<td style={{padding:'12px 14px',fontSize:12,fontFamily:'monospace',fontWeight:700,color:c.balance>0?RD:GR}}>{fmt(c.balance)}</td>}
              <td style={{padding:'12px 14px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
                <div style={{display:'flex',gap:4,justifyContent:'center'}}>
                  <button style={{...S.btn('gho',true),fontSize:10,padding:'4px 8px'}} onClick={()=>setSelCust(c)}>View</button>
                  <button style={{...S.btn('def',true),fontSize:10,padding:'4px 8px'}} onClick={()=>openEdit(c)}>Edit</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {total>0&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:11,color:'#666',flexWrap:'wrap',gap:8}}>
      <span>Total ({total} rows)</span>
      <div style={{display:'flex',gap:6,alignItems:'center'}}>
        <button disabled={currentPage===1} style={{padding:'6px 10px',borderRadius:4,border:'0.5px solid '+BORD,background:'#fff',cursor:currentPage===1?'not-allowed':'pointer',opacity:currentPage===1?0.5:1,fontSize:11}} onClick={()=>setCurrentPage(p=>p-1)}>←</button>
        <span style={{fontSize:11,minWidth:80,textAlign:'center'}}>{currentPage} of {pages}</span>
        <button disabled={currentPage===pages} style={{padding:'6px 10px',borderRadius:4,border:'0.5px solid '+BORD,background:'#fff',cursor:currentPage===pages?'not-allowed':'pointer',opacity:currentPage===pages?0.5:1,fontSize:11}} onClick={()=>setCurrentPage(p=>p+1)}>→</button>
      </div>
    </div>}
    <div style={{marginTop:8,fontSize:11,color:MUT}}>Click any row to view full account — bills, payments and running balance.</div>
    {selCust&&<CustomerAccount cust={selCust} B={B} Py={Py} setPy={setPy} firm={firm} onClose={()=>setSelCust(null)}/>}
  </div>;}

/* ── LEDGER ── */
function Ledger({B,Py,setPy,C,Ret,firm,mob}){
  const S=_theme==='modern'?MODERN_S:MINIMAL_S;
  const[fp,setFp]=useState('');const[ft,setFt]=useState('All');const[selCust,setSelCust]=useState(null);const[dlLoading,setDlLoading]=useState(false);const[toast,showT]=useToast();
  const downloadLedger=async(format='csv')=>{setDlLoading(true);try{const token=await getToken();const res=await fetch('/api/ledger',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token,'x-firm-id':_activeFirmId},body:JSON.stringify({customerId:selCust?.id||null,format})});if(!res.ok)throw new Error('Failed to download');const blob=await res.blob();const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`Ledger_${selCust?.name||'All'}_${new Date().toISOString().split('T')[0]}.${format==='csv'?'csv':'json'}`;link.click();showT('Ledger downloaded!');}catch(err){showT('Failed: '+err.message,'err');}finally{setDlLoading(false)};}
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
    {toast}
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
      <div style={S.h2}>Ledger / Statement</div>
      <div style={{display:'flex',gap:6}}>
        <button style={S.btn('def')} disabled={dlLoading} onClick={()=>downloadLedger('csv')}>📥 {dlLoading?'Downloading...':'Download CSV'}</button>
        <button style={S.btn('def')} disabled={dlLoading} onClick={()=>downloadLedger('json')}>📥 {dlLoading?'Downloading...':'Download JSON'}</button>
      </div>
    </div>
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
    {selCust&&<CustomerAccount cust={selCust} B={B} Py={Py} setPy={setPy} firm={firm} onClose={()=>setSelCust(null)}/>}
  </div>;}

/* ── BANK STATEMENTS ── */
function BankStatements({BS,setBS,mob}){
  const[toast,showT]=useToast();const[uploading,setUploading]=useState(false);
  const handleUpload=async e=>{const file=e.target.files[0];if(!file)return;if(file.size>(10*1024*1024)){showT('File too large (max 10MB)','err');return;}setUploading(true);try{const r=new FileReader();r.onload=async ev=>{const b64=ev.target.result.split(',')[1];const res=await api.post('/api/bank-statements',{fileName:file.name,fileType:file.type,fileData:b64,fileSize:file.size,description:''});setBS(bs=>[res,...bs]);showT('Bank statement uploaded!');};r.readAsDataURL(file);}catch(err){showT('Upload failed: '+err.message,'err');}finally{setUploading(false);}};
  return<div>
    {toast}
    <div style={S.h2}>Bank Statements</div>
    <div style={{...S.card,marginBottom:14}}>
      <div style={S.h3}>Upload Bank Statement</div>
      <label style={{border:'1.5px dashed '+BORD,borderRadius:10,padding:'22px 16px',textAlign:'center',cursor:'pointer',background:BG,display:'block'}}>
        <input type='file' accept='.pdf,.csv,.txt,image/*' style={{display:'none'}} onChange={handleUpload}/>
        <div style={{fontSize:36,marginBottom:6}}>📄</div>
        <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{uploading?'Uploading...':'Tap to upload bank statement'}</div>
        <div style={{fontSize:11,color:MUT}}>PDF, CSV, TXT, or image (JPG/PNG) • Max 10MB</div>
      </label>
    </div>
    {BS.length===0?<div style={{...S.card,textAlign:'center',padding:40,color:MUT}}>No bank statements uploaded yet</div>:<div style={{...S.card,padding:0,overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:mob?400:600}}>
        <thead><tr>{['File Name','Type','Size','Uploaded',''].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>{BS.map(s=><tr key={s.id}>
          <td style={S.td}><div style={{fontWeight:600}}>{s.fileName}</div></td>
          <td style={S.td}><Bdg c='blue'>{s.fileType.split('/').pop()}</Bdg></td>
          <td style={{...S.td,fontSize:11}}>{(s.fileSize/1024).toFixed(1)}KB</td>
          <td style={{...S.td,fontSize:11,color:MUT}}>{new Date(s.uploadedAt).toLocaleDateString('en-IN')}</td>
          <td style={S.td}><button style={S.btn('dan',true)} onClick={async()=>{if(!confirm('Delete?'))return;await api.del('/api/bank-statements?id='+s.id);setBS(bs=>bs.filter(x=>x.id!==s.id));showT('Deleted');}}>Remove</button></td>
        </tr>)}</tbody>
      </table>
    </div>}
  </div>;}

/* ── BANK RECONCILIATION ── */
function BankPage({BS,setBS,B,Py,firm,mob,gk}){
  const S=_theme==='modern'?MODERN_S:MINIMAL_S;
  const[bankTab,setBankTab]=useState('statements');
  return<div>
    <div style={{display:'flex',gap:8,marginBottom:14,borderBottom:'1px solid '+BORD,paddingBottom:8}}>
      {['statements','recon','history'].map(t=><button key={t} onClick={()=>setBankTab(t)} style={{...S.btn(bankTab===t?'pri':'def',true),textTransform:'capitalize',background:'none',border:'none',borderBottom:bankTab===t?'2px solid '+BL:'none',borderRadius:0,paddingBottom:8}}>{t}</button>)}
    </div>
    {bankTab==='statements'&&<BankStatements BS={BS} setBS={setBS} mob={mob}/>}
    {bankTab==='recon'&&<FirmReconciliation BS={BS} B={B} Py={Py} firm={firm} gk={gk} mob={mob}/>}
    {bankTab==='history'&&<ReconciliationHistory mob={mob}/>}
  </div>;
}

function FirmReconciliation({BS,B,Py,firm,gk,mob}){
  const[sessionId,setSessionId]=useState(null);const[sessions,setSessions]=useState([]);const[toast,showT]=useToast();const[uploading,setUploading]=useState(false);
  const[scanStatus,setScanStatus]=useState('');const[selectedFile,setSelectedFile]=useState(null);const[sessionLabel,setSessionLabel]=useState('');

  const handleFile=async e=>{const file=e.target.files[0];if(!file)return;setSelectedFile(file);setSessionLabel(file.name.replace(/\.[^/.]+$/,''));};

  const uploadAndReconcile=async()=>{if(!selectedFile)return;if(!gk()){showT('Add Gemini API key in Settings first','err');return;}setScanStatus('Reading file...');setUploading(true);try{const r=new FileReader();r.onload=async ev=>{const b64=ev.target.result.split(',')[1];const mimeType=selectedFile.type||'application/octet-stream';let csvText='';if(selectedFile.type.startsWith('text/')){csvText=new TextDecoder().decode(atob(b64).split('').map(c=>c.charCodeAt(0)));}setScanStatus('Creating session...');const sessionRes=await api.post('/api/recon-sessions',{label:sessionLabel||'Bank Statement',bankStmtId:null});setScanStatus('Processing statement...');const reconcileRes=await api.post('/api/reconcile',{apiKey:gk(),csvText,imageData:b64,imageType:mimeType,scope:'firm',sessionId:sessionRes.id,bills:B,payments:Py});setSessionId(reconcileRes.sessionId);setSelectedFile(null);setScanStatus('');showT('Statement processed!');};r.readAsDataURL(file);}catch(err){showT('Error: '+err.message,'err');setScanStatus('');}finally{setUploading(false);}};

  if(sessionId){return<ReviewSession sessionId={sessionId} onBack={()=>{setSessionId(null);setSelectedFile(null);}} mob={mob} showT={showT}/>;}

  return<div>
    {toast}
    {scanStatus&&<div style={{padding:12,background:AMBL,borderRadius:8,marginBottom:12,fontSize:12,color:AMB}}>{scanStatus}{uploading&&<Spin/>}</div>}
    <div style={{...S.card,marginBottom:14}}>
      <div style={S.h2}>Bank Statement Reconciliation</div>
      <div style={S.h3}>Select & Upload</div>
      <label style={{border:'1.5px dashed '+BORD,borderRadius:10,padding:'22px 16px',textAlign:'center',cursor:'pointer',background:BG,display:'block',marginBottom:12}}>
        <input type='file' accept='.pdf,.csv,.txt,image/*' style={{display:'none'}} onChange={handleFile}/>
        <div style={{fontSize:36,marginBottom:6}}>📊</div>
        <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{selectedFile?selectedFile.name:'Tap to upload bank statement'}</div>
        <div style={{fontSize:11,color:MUT}}>PDF, CSV, TXT, or image (JPG/PNG) • Max 10MB</div>
      </label>
      {selectedFile&&<><Fld label='Session Label'><input style={S.inp} value={sessionLabel} onChange={e=>setSessionLabel(e.target.value)} placeholder='e.g., HDFC April 2025'/></Fld><button style={S.btn('pri')} onClick={uploadAndReconcile} disabled={uploading}>{uploading?'Processing...':'Start Reconciliation'}</button></>}
    </div>
  </div>;
}

function ReviewSession({sessionId,onBack,mob,showT}){
  const[session,setSession]=useState(null);const[txns,setTxns]=useState([]);const[loading,setLoading]=useState(true);const[filter,setFilter]=useState('all');const[linkedPaymentId,setLinkedPaymentId]=useState(null);const[linkTxnId,setLinkTxnId]=useState(null);

  useEffect(()=>{(async()=>{const res=await api.get('/api/recon-sessions/'+sessionId);setSession(res.session);setTxns(res.transactions);setLoading(false);})();},[ sessionId]);

  const filtered=txns.filter(t=>filter==='all'||t.status===filter);const stats=session?.stats||{};const lockAll=async()=>{if(!confirm('Lock all matched transactions?'))return;for(const t of txns.filter(x=>x.status==='matched')){await api.patch('/api/recon-sessions/'+sessionId,{txnId:t.id,isReconciled:true});}showT('Locked all matched transactions');};const exportCsv=async()=>{const res=await fetch(`/api/recon-sessions/${sessionId}/export`,{headers:{'x-firm-id':session?.firmId}});const blob=await res.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`Recon_${session?.label}.csv`;a.click();};

  if(loading)return<div><Spin/></div>;

  return<div>
    <button style={S.btn('def',true)} onClick={onBack}>← Back</button>
    {session?.status==='locked'&&<div style={{padding:12,background:GRL,borderRadius:8,marginBottom:12,fontSize:12,fontWeight:700,color:GR}}>✓ This session is locked and reconciled</div>}
    <div style={{display:'grid',gridTemplateColumns:mob?'1fr 1fr':'repeat(5,1fr)',gap:8,marginBottom:14}}>
      {[{l:'Total',v:stats.total,c:BL,bg:BLL},{l:'Matched',v:stats.matched,c:GR,bg:GRL},{l:'Likely',v:stats.likely,c:AMB,bg:AMBL},{l:'Unmatched',v:stats.unmatched,c:RD,bg:RDL},{l:'Locked',v:stats.matched,c:PUR,bg:PURL}].map(({l,v,c,bg})=><div key={l} style={{...S.met,background:bg,border:'0.5px solid '+c+'30'}}>
        <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',color:c+'aa'}}>{l}</div>
        <div style={{fontSize:24,fontWeight:800,color:c}}>{v||0}</div>
      </div>)}
    </div>
    <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
      {['all','matched','likely','unmatched','ignored'].map(f=><button key={f} onClick={()=>setFilter(f)} style={{...S.btn(filter===f?'pri':'def',true),textTransform:'capitalize'}}>{f}</button>)}
    </div>
    <div style={{...S.card,padding:0,overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:mob?400:900}}>
        <thead><tr>{['Date','Description','Ref','Amount','Type','Status','Score','Matched To',''].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>{filtered.map(t=><tr key={t.id} style={{background:t.isReconciled?BL+'08':''}}>
          <td style={S.td}>{t.date}</td>
          <td style={{...S.td,maxWidth:150,overflow:'hidden',textOverflow:'ellipsis'}}>{t.description}</td>
          <td style={{...S.td,fontSize:10}}>{t.ref}</td>
          <td style={{...S.td,...S.mono,color:GR,fontWeight:700}}>{fmt(t.amount)}</td>
          <td style={S.td}><Bdg c={t.type==='credit'?'green':'red'}>{t.type}</Bdg></td>
          <td style={S.td}><Bdg c={{matched:GR,likely:AMB,unmatched:RD,ignored:MUT}[t.status]}>{t.status}</Bdg></td>
          <td style={{...S.td,...S.mono,fontSize:10}}>{t.score}</td>
          <td style={{...S.td,fontSize:10}}>{t.matchRef||'—'}</td>
          <td style={S.td}>{t.isReconciled?'✓':t.status==='matched'?<button style={S.btn('suc',true)} onClick={async()=>{await api.patch('/api/recon-sessions/'+sessionId,{txnId:t.id,isReconciled:true});setTxns(ts=>ts.map(x=>x.id===t.id?{...x,isReconciled:true}:x));}}>Lock</button>:t.status==='likely'?<><button style={S.btn('def',true)} onClick={async()=>{await api.patch('/api/recon-sessions/'+sessionId,{txnId:t.id,matchStatus:'matched'});setTxns(ts=>ts.map(x=>x.id===t.id?{...x,status:'matched'}:x));}}>Confirm</button><button style={S.btn('dan',true)} onClick={async()=>{await api.patch('/api/recon-sessions/'+sessionId,{txnId:t.id,matchStatus:'unmatched'});setTxns(ts=>ts.map(x=>x.id===t.id?{...x,status:'unmatched'}:x));}}>Clear</button></>:<button style={S.btn('gho',true)} onClick={async()=>{await api.patch('/api/recon-sessions/'+sessionId,{txnId:t.id,matchStatus:'ignored'});setTxns(ts=>ts.map(x=>x.id===t.id?{...x,status:'ignored'}:x));}}>Ignore</button>}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <div style={{marginTop:14,display:'flex',gap:8}}>
      <button style={S.btn('pri')} onClick={lockAll}>Lock All Matched</button>
      <button style={S.btn('def')} onClick={exportCsv}>📥 Export CSV</button>
    </div>
  </div>;
}

function ReconciliationHistory({mob}){
  const[sessions,setSessions]=useState([]);const[loading,setLoading]=useState(true);const[activeSession,setActiveSession]=useState(null);

  useEffect(()=>{(async()=>{const res=await api.get('/api/recon-sessions');setSessions(res||[]);setLoading(false);})();},[ ]);

  if(loading)return<div><Spin/></div>;if(activeSession)return<ReviewSession sessionId={activeSession} onBack={()=>setActiveSession(null)} mob={mob}/>;

  return<div>
    <div style={S.h2}>Reconciliation History</div>
    {sessions.length===0?<div style={{...S.card,textAlign:'center',padding:40,color:MUT}}>No reconciliations yet</div>:<div style={{...S.card,padding:0,overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:mob?400:800}}>
        <thead><tr>{['Label','Period','Status','Matched %','Total','Unmatched','Created',''].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>{sessions.map(s=>{const matchPct=s.stats.total>0?Math.round(s.stats.matched/s.stats.total*100):0;return<tr key={s.id}><td style={S.td}><strong>{s.label}</strong></td><td style={{...S.td,fontSize:10,color:MUT}}>{s.periodFrom||'—'} to {s.periodTo||'—'}</td><td style={S.td}><Bdg c={{draft:'gray',reviewing:'amber',locked:'green'}[s.status]}>{s.status}</Bdg></td><td style={{...S.td,...S.mono,fontWeight:700,color:matchPct===100?GR:matchPct>80?AMB:RD}}>{matchPct}%</td><td style={{...S.td,...S.mono}}>{s.stats.total||0}</td><td style={{...S.td,...S.mono,color:RD}}>{s.stats.unmatched||0}</td><td style={{...S.td,fontSize:10,color:MUT}}>{new Date(s.createdAt).toLocaleDateString('en-IN')}</td><td style={S.td}><button style={S.btn('def',true)} onClick={()=>setActiveSession(s.id)}>Open</button></td></tr>;})}
        </tbody>
      </table>
    </div>}
  </div>;
}

/* ── SUPPLIER RECONCILIATION ── */
function SupplierRecon({SI,firm,gk,mob}){
  const[sessionId,setSessionId]=useState(null);const[selectedSupplier,setSelectedSupplier]=useState('');const[toast,showT]=useToast();const[uploading,setUploading]=useState(false);
  const[scanStatus,setScanStatus]=useState('');const[selectedFile,setSelectedFile]=useState(null);const[sessionLabel,setSessionLabel]=useState('');

  const suppliers=[...new Set(SI.map(i=>i.supplierName))].sort();
  const handleFile=async e=>{const file=e.target.files[0];if(!file)return;setSelectedFile(file);setSessionLabel(file.name.replace(/\.[^/.]+$/,''));};

  const uploadAndReconcile=async()=>{if(!selectedFile)return;if(!selectedSupplier){showT('Select a supplier first','err');return;}if(!gk()){showT('Add Gemini API key in Settings first','err');return;}setScanStatus('Reading file...');setUploading(true);try{const r=new FileReader();r.onload=async ev=>{const b64=ev.target.result.split(',')[1];const mimeType=selectedFile.type||'application/octet-stream';let csvText='';if(selectedFile.type.startsWith('text/')){csvText=new TextDecoder().decode(atob(b64).split('').map(c=>c.charCodeAt(0)));}setScanStatus('Creating session...');const sessionRes=await api.post('/api/supplier-recon-sessions',{supplierName:selectedSupplier,label:sessionLabel||'Supplier Statement'});setScanStatus('Processing statement...');const reconcileRes=await api.post('/api/supplier-reconcile',{apiKey:gk(),csvText,imageData:b64,imageType:mimeType,sessionId:sessionRes.id,supplierName:selectedSupplier,invoices:SI.filter(i=>i.supplierName===selectedSupplier)});setSessionId(reconcileRes.sessionId);setSelectedFile(null);setScanStatus('');showT('Statement processed!');};r.readAsDataURL(selectedFile);}catch(err){showT('Error: '+err.message,'err');setScanStatus('');}finally{setUploading(false);}};

  if(sessionId){return<ReviewSupplierSession sessionId={sessionId} onBack={()=>{setSessionId(null);setSelectedFile(null);}} mob={mob} showT={showT}/>;}

  return<div>
    {toast}
    {scanStatus&&<div style={{padding:12,background:AMBL,borderRadius:8,marginBottom:12,fontSize:12,color:AMB}}>{scanStatus}{uploading&&<Spin/>}</div>}
    <div style={{...S.card,marginBottom:14}}>
      <div style={S.h2}>Supplier Statement Reconciliation</div>
      <div style={S.h3}>Select Supplier & Upload</div>
      <Fld label='Select Supplier *'><select style={S.inp} value={selectedSupplier} onChange={e=>setSelectedSupplier(e.target.value)}><option value=''>Choose a supplier...</option>{suppliers.map(s=><option key={s} value={s}>{s}</option>)}</select></Fld>
      <label style={{border:'1.5px dashed '+BORD,borderRadius:10,padding:'22px 16px',textAlign:'center',cursor:'pointer',background:BG,display:'block',marginBottom:12}}>
        <input type='file' accept='.pdf,.csv,.txt,image/*' style={{display:'none'}} onChange={handleFile}/>
        <div style={{fontSize:36,marginBottom:6}}>📋</div>
        <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{selectedFile?selectedFile.name:'Tap to upload statement'}</div>
        <div style={{fontSize:11,color:MUT}}>PDF, CSV, TXT, or image (JPG/PNG) • Max 10MB</div>
      </label>
      {selectedFile&&<><Fld label='Session Label'><input style={S.inp} value={sessionLabel} onChange={e=>setSessionLabel(e.target.value)} placeholder='e.g., ABC Traders Mar 2025'/></Fld><button style={S.btn('pri')} onClick={uploadAndReconcile} disabled={uploading}>{uploading?'Processing...':'Start Reconciliation'}</button></>}
    </div>
  </div>;
}

function ReviewSupplierSession({sessionId,onBack,mob,showT}){
  const[session,setSession]=useState(null);const[txns,setTxns]=useState([]);const[loading,setLoading]=useState(true);const[filter,setFilter]=useState('all');const[invoices,setInvoices]=useState([]);

  useEffect(()=>{(async()=>{const res=await api.get('/api/supplier-recon-sessions/'+sessionId);setSession(res.session);setTxns(res.transactions);setInvoices([]);setLoading(false);})();},[ sessionId]);

  const filtered=txns.filter(t=>filter==='all'||t.status===filter);const stats=session?.stats||{};const lockAll=async()=>{if(!confirm('Lock all matched transactions?'))return;for(const t of txns.filter(x=>x.status==='matched')){await api.patch('/api/supplier-recon-sessions/'+sessionId,{txnId:t.id,isReconciled:true});}showT('Locked all matched transactions');};const exportCsv=async()=>{const res=await fetch(`/api/supplier-recon-sessions/${sessionId}/export`);const blob=await res.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`SupplierRecon_${session?.supplierName}.csv`;a.click();};

  if(loading)return<div><Spin/></div>;

  return<div>
    <button style={S.btn('def',true)} onClick={onBack}>← Back</button>
    {session?.status==='locked'&&<div style={{padding:12,background:GRL,borderRadius:8,marginBottom:12,fontSize:12,fontWeight:700,color:GR}}>✓ This session is locked and reconciled</div>}
    <div style={{display:'grid',gridTemplateColumns:mob?'1fr 1fr':'repeat(6,1fr)',gap:8,marginBottom:14}}>
      {[{l:'Total',v:stats.total,c:BL,bg:BLL},{l:'Matched',v:stats.matched,c:GR,bg:GRL},{l:'Likely',v:stats.likely,c:AMB,bg:AMBL},{l:'Unmatched',v:stats.unmatched,c:RD,bg:RDL},{l:'Disputed',v:stats.disputed||0,c:PUR,bg:PURL},{l:'Locked',v:stats.matched,c:PUR,bg:PURL}].map(({l,v,c,bg})=><div key={l} style={{...S.met,background:bg,border:'0.5px solid '+c+'30'}}>
        <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',color:c+'aa'}}>{l}</div>
        <div style={{fontSize:24,fontWeight:800,color:c}}>{v||0}</div>
      </div>)}
    </div>
    <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
      {['all','matched','likely','unmatched','disputed','ignored'].map(f=><button key={f} onClick={()=>setFilter(f)} style={{...S.btn(filter===f?'pri':'def',true),textTransform:'capitalize'}}>{f}</button>)}
    </div>
    <div style={{...S.card,padding:0,overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:mob?400:1000}}>
        <thead><tr>{['Date','Invoice No','Description','Amount','Type','Status','Score','Matched Invoice',''].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>{filtered.map(t=><tr key={t.id} style={{background:t.isReconciled?BL+'08':''}}>
          <td style={S.td}>{t.date}</td>
          <td style={{...S.td,fontWeight:600}}>{t.invoiceNo}</td>
          <td style={{...S.td,maxWidth:150,overflow:'hidden',textOverflow:'ellipsis'}}>{t.description}</td>
          <td style={{...S.td,...S.mono,color:GR,fontWeight:700}}>{fmt(t.amount)}</td>
          <td style={S.td}><Bdg c={t.type==='credit_note'?'amber':'blue'}>{t.type}</Bdg></td>
          <td style={S.td}><Bdg c={{matched:GR,likely:AMB,unmatched:RD,disputed:PUR,ignored:MUT}[t.status]}>{t.status}</Bdg></td>
          <td style={{...S.td,...S.mono,fontSize:10}}>{t.score}</td>
          <td style={{...S.td,fontSize:10}}>{t.matchRef||'—'}</td>
          <td style={S.td}>{t.isReconciled?'✓':t.status==='matched'?<button style={S.btn('suc',true)} onClick={async()=>{await api.patch('/api/supplier-recon-sessions/'+sessionId,{txnId:t.id,isReconciled:true});setTxns(ts=>ts.map(x=>x.id===t.id?{...x,isReconciled:true}:x));}}>Lock</button>:t.status==='likely'?<><button style={S.btn('def',true)} onClick={async()=>{await api.patch('/api/supplier-recon-sessions/'+sessionId,{txnId:t.id,matchStatus:'matched'});setTxns(ts=>ts.map(x=>x.id===t.id?{...x,status:'matched'}:x));}}>Confirm</button><button style={S.btn('dan',true)} onClick={async()=>{await api.patch('/api/supplier-recon-sessions/'+sessionId,{txnId:t.id,matchStatus:'unmatched'});setTxns(ts=>ts.map(x=>x.id===t.id?{...x,status:'unmatched'}:x));}}>Clear</button></>:<button style={S.btn('amb',true)} onClick={async()=>{await api.patch('/api/supplier-recon-sessions/'+sessionId,{txnId:t.id,matchStatus:'disputed'});setTxns(ts=>ts.map(x=>x.id===t.id?{...x,status:'disputed'}:x));}}>Raise Dispute</button>}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <div style={{marginTop:14,display:'flex',gap:8}}>
      <button style={S.btn('pri')} onClick={lockAll}>Lock All Matched</button>
      <button style={S.btn('def')} onClick={exportCsv}>📥 Export CSV</button>
    </div>
  </div>;
}

/* ── SETTINGS ── */
function SecurityTab({ses}){
  const[tab,setTab]=useState('change');const[currentPwd,setCurrentPwd]=useState('');const[newPwd,setNewPwd]=useState('');const[confirmPwd,setConfirmPwd]=useState('');const[loading,setLoading]=useState(false);const[message,setMessage]=useState('');const[error,setError]=useState('');
  const S=_theme==='modern'?MODERN_S:MINIMAL_S;
  const handleChangePassword=async()=>{
    if(!currentPwd||!newPwd||!confirmPwd){setError('All fields required');return;}
    if(newPwd!==confirmPwd){setError('New passwords do not match');return;}
    if(newPwd.length<6){setError('Password must be at least 6 characters');return;}
    if(currentPwd===newPwd){setError('New password must be different');return;}
    setLoading(true);setError('');setMessage('');
    try{
      const res=await fetch('/api/auth/change-password',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+(ses?.access_token||'')},body:JSON.stringify({currentPassword:currentPwd,newPassword:newPwd,confirmPassword:confirmPwd})});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error);
      setMessage('Password changed successfully');setCurrentPwd('');setNewPwd('');setConfirmPwd('');
      setTimeout(()=>setMessage(''),3000);
    }catch(e){setError(e.message||'Failed to change password');}
    finally{setLoading(false);}
  };
  return<div>
    <div style={{display:'grid',gridTemplateColumns:'1fr',gap:14}}>
      <div style={S.card}>
        <div style={S.h3}>Change Password</div>
        <div style={{fontSize:12,color:MUT,marginBottom:14,lineHeight:1.6}}>Update your account password. Make sure to use a strong, unique password.</div>
        <Fld label='Current Password *'><input style={S.inp} type='password' value={currentPwd} onChange={e=>setCurrentPwd(e.target.value)} placeholder='Enter your current password' disabled={loading}/></Fld>
        <Fld label='New Password *'><input style={S.inp} type='password' value={newPwd} onChange={e=>setNewPwd(e.target.value)} placeholder='Enter a new password' disabled={loading}/></Fld>
        <Fld label='Confirm Password *'><input style={S.inp} type='password' value={confirmPwd} onChange={e=>setConfirmPwd(e.target.value)} placeholder='Confirm your new password' disabled={loading}/></Fld>
        {error&&<div style={{background:'#FDF0F0',border:'0.5px solid '+RD,borderRadius:6,padding:'8px 10px',color:RD,fontSize:12,marginBottom:12}}>{error}</div>}
        {message&&<div style={{background:GRL,border:'0.5px solid '+GR,borderRadius:6,padding:'8px 10px',color:GR,fontSize:12,marginBottom:12}}>{message}</div>}
        <button style={{...S.btn('pri'),width:'100%'}} onClick={handleChangePassword} disabled={loading}>{loading?'Updating...':'Update Password'}</button>
      </div>
    </div>
  </div>;
}

function Settings({firm,saveFirm,ses,mob,theme,setTheme,org}){
  const[f,setF]=useState(firm);const[saved,setSaved]=useState(false);const[logoUploading,setLogoUploading]=useState(false);
  const[settingsTab,setSettingsTab]=useState('account');
  const S=_theme==='modern'?MODERN_S:MINIMAL_S;
  const up=k=>v=>setF(x=>({...x,[k]:v}));
  const save=()=>{saveFirm(f);setSaved(true);setTimeout(()=>setSaved(false),2500)};
  const handleLogo=e=>{const file=e.target.files[0];if(!file)return;setLogoUploading(true);const r=new FileReader();r.onload=ev=>{setF(x=>({...x,logo:ev.target.result}));setLogoUploading(false);};r.readAsDataURL(file);};
  const removeLogo=()=>setF(x=>({...x,logo:''}));
  return<div>
    <div style={S.h2}>Settings</div>
    {ses&&<div style={{padding:'7px 12px',background:BLL,borderRadius:7,marginBottom:14,fontSize:12,color:BL}}>Logged in as <strong>{ses.user?.email}</strong></div>}

    {/* Settings Tabs */}
    <div style={{display:'flex',gap:8,marginBottom:20,borderBottom:'1px solid '+BORD,paddingBottom:0}}>
      <button onClick={()=>setSettingsTab('account')} style={{padding:'12px 0',fontSize:13,fontWeight:settingsTab==='account'?700:500,color:settingsTab==='account'?BL:MUT,border:'none',background:'none',cursor:'pointer',borderBottom:settingsTab==='account'?'2px solid '+BL:'2px solid transparent',transition:'all 0.2s'}}>
        Account & Firm
      </button>
      <button onClick={()=>setSettingsTab('security')} style={{padding:'12px 0',fontSize:13,fontWeight:settingsTab==='security'?700:500,color:settingsTab==='security'?BL:MUT,border:'none',background:'none',cursor:'pointer',borderBottom:settingsTab==='security'?'2px solid '+BL:'2px solid transparent',transition:'all 0.2s'}}>
        Security
      </button>
    </div>

    {settingsTab==='account'&&<div>
    <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'1fr 1fr',gap:14,marginBottom:14}}>
      <div style={{gridColumn:mob?'span 1':'span 2'}}>
        <div style={S.card} className={_theme==='modern'?'shopos-card-modern':''}>
          <div style={S.h3}>App Theme</div>
          <div style={{display:'flex',gap:12}}>
            {[['minimal','Minimal','Clean & compact, optimised for speed'],['modern','Modern','Glassmorphism cards, gradient buttons, animations']].map(([t,label,desc])=><div key={t} onClick={()=>setTheme(t)} style={{flex:1,padding:'14px 16px',borderRadius:12,cursor:'pointer',border:theme===t?'2px solid #1B5E8A':'1.5px solid '+BORD,background:theme===t?BLL:'#fff',transition:'all 0.2s'}}>
              <div style={{fontWeight:700,color:theme===t?'#1B5E8A':'#555',marginBottom:4}}>{label}</div>
              <div style={{fontSize:11,color:'#888',lineHeight:1.5}}>{desc}</div>
              {theme===t&&<div style={{fontSize:10,color:'#1B5E8A',marginTop:6,fontWeight:700}}>✓ Active</div>}
            </div>)}
          </div>
        </div>
      </div>
    </div>
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
        <div style={{...S.card,marginTop:14}}>
          <div style={S.h3}>E-Way Bill API Credentials</div>
          <div style={{fontSize:11,color:BL,background:BLL,padding:'7px 10px',borderRadius:6,marginBottom:10,lineHeight:1.7}}>
            Setup: ewaybillgst.gov.in → Registration → For GSP → Select "Quicko Infosoft Pvt. Ltd." → Create username & password → Enter below
          </div>
          <Fld label='EWB API Username'><input style={S.inp} value={f.ewbUsername||''} onChange={e=>up('ewbUsername')(e.target.value)} placeholder='Your EWB portal API username'/></Fld>
          <Fld label='EWB API Password'><input style={S.inp} type='password' value={f.ewbPassword||''} onChange={e=>up('ewbPassword')(e.target.value)} placeholder='Your EWB portal API password'/></Fld>
          <Fld label='Shop PIN Code'><input style={S.inp} value={f.pincode||''} onChange={e=>up('pincode')(e.target.value)} placeholder='452001'/></Fld>
          <Fld label='State Code (MP=23, MH=27, DL=07)'><input style={S.inp} value={f.stateCode||''} onChange={e=>up('stateCode')(e.target.value)} placeholder='23'/></Fld>
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
        <div style={{...S.card,marginTop:14}}>
          <div style={S.h3}>Interest on Overdue Payments</div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <div>
              <div style={{fontWeight:600,fontSize:13}}>Charge Interest after 60 days</div>
              <div style={{fontSize:11,color:MUT}}>12% per annum applied on outstanding amount after 60 days</div>
            </div>
            <label style={{position:'relative',display:'inline-block',width:44,height:24,cursor:'pointer'}}>
              <input type='checkbox' checked={!!f.interestEnabled} onChange={e=>up('interestEnabled')(e.target.checked)} style={{opacity:0,width:0,height:0}}/>
              <span style={{position:'absolute',inset:0,background:f.interestEnabled?BL:'#ccc',borderRadius:24,transition:'.3s'}}><span style={{position:'absolute',left:f.interestEnabled?20:2,top:2,width:20,height:20,background:'#fff',borderRadius:'50%',transition:'.3s'}}/></span>
            </label>
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontWeight:600,fontSize:13}}>Include Opening Balance in Interest</div>
              <div style={{fontSize:11,color:MUT}}>Apply interest on opening balance outstanding as well</div>
            </div>
            <label style={{position:'relative',display:'inline-block',width:44,height:24,cursor:'pointer'}}>
              <input type='checkbox' checked={!!f.interestOnOpeningBalance} onChange={e=>up('interestOnOpeningBalance')(e.target.checked)} style={{opacity:0,width:0,height:0}}/>
              <span style={{position:'absolute',inset:0,background:f.interestOnOpeningBalance?BL:'#ccc',borderRadius:24,transition:'.3s'}}><span style={{position:'absolute',left:f.interestOnOpeningBalance?20:2,top:2,width:20,height:20,background:'#fff',borderRadius:'50%',transition:'.3s'}}/></span>
            </label>
          </div>
        </div>
        <div style={{...S.card,marginTop:14}}>
          <div style={S.h3}>WhatsApp / SMS Notifications</div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <div>
              <div style={{fontWeight:600,fontSize:13}}>Enable Notifications</div>
              <div style={{fontSize:11,color:MUT}}>Send invoice & payment updates to customers</div>
            </div>
            <label style={{position:'relative',display:'inline-block',width:44,height:24,cursor:'pointer'}}>
              <input type='checkbox' checked={!!f.notifEnabled} onChange={e=>up('notifEnabled')(e.target.checked)} style={{opacity:0,width:0,height:0}}/>
              <span style={{position:'absolute',inset:0,background:f.notifEnabled?BL:'#ccc',borderRadius:24,transition:'.3s'}}><span style={{position:'absolute',left:f.notifEnabled?20:2,top:2,width:20,height:20,background:'#fff',borderRadius:'50%',transition:'.3s'}}/></span>
            </label>
          </div>
          {f.notifEnabled&&<>
            <div style={{fontSize:11,color:BL,background:BLL,padding:'6px 10px',borderRadius:6,marginBottom:10,lineHeight:1.7}}>
              Setup: msg91.com → Register → Get API Key. Get template IDs from WhatsApp & SMS templates in MSG91 dashboard.
            </div>
            <Fld label='MSG91 API Key'><input style={{...S.inp,fontFamily:'monospace'}} type='password' value={f.msg91Key||''} onChange={e=>up('msg91Key')(e.target.value)} placeholder='Your MSG91 API Key'/></Fld>
            <Fld label='WhatsApp Template ID'><input style={S.inp} value={f.msg91WaTemplate||''} onChange={e=>up('msg91WaTemplate')(e.target.value)} placeholder='WhatsApp template ID'/></Fld>
            <Fld label='SMS Template ID'><input style={S.inp} value={f.msg91SmsTemplate||''} onChange={e=>up('msg91SmsTemplate')(e.target.value)} placeholder='SMS template ID'/></Fld>
          </>}
        </div>
        <div style={{display:'flex',gap:10,marginTop:12,alignItems:'center'}}><button style={S.btn('pri')} onClick={save}>Save All Settings</button>{saved&&<span style={{color:GR,fontSize:13,fontWeight:700}}>Saved!</span>}</div>
      </div>
    </div>
    </div>}

    {settingsTab==='security'&&<SecurityTab ses={ses}/>}
  </div>;}

/* ── NO FIRM SETUP ── */
function NoFirmSetup({ses,onCreated}){
  const[name,setName]=useState('');const[busy,setBusy]=useState(false);const[err,setErr]=useState('');
  const create=async()=>{
    if(!name.trim()){setErr('Enter your firm name');return;}
    setBusy(true);setErr('');
    try{
      const res=await api.post('/api/firms',{name:name.trim()});
      if(res.error){setErr(res.error);setBusy(false);return;}
      onCreated(res);
    }catch(e){
      console.error('Firm creation error:',e);
      setErr(e.message||'Failed to create firm');
      setBusy(false);
    }
  };
  return<div style={{minHeight:'100vh',background:'linear-gradient(145deg,#0d1f3c,#1B3A6B)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,fontFamily:'Inter,sans-serif'}}>
    <div style={{background:'rgba(255,255,255,.08)',backdropFilter:'blur(20px)',borderRadius:18,padding:32,width:'100%',maxWidth:420,border:'1px solid rgba(255,255,255,.12)'}}>
      <div style={{textAlign:'center',marginBottom:28}}>
        <div style={{fontSize:40,fontWeight:800,color:'#fff',letterSpacing:'-2px'}}>SHOP<span style={{color:'#F5A732'}}>OS</span></div>
        <div style={{color:'rgba(255,255,255,.6)',fontSize:13,marginTop:8}}>Welcome! Let's set up your first firm.</div>
      </div>
      <div style={{color:'rgba(255,255,255,.5)',fontSize:11,marginBottom:6,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px'}}>Your Business Name</div>
      <input style={{width:'100%',padding:'12px 14px',border:'1px solid rgba(255,255,255,.15)',borderRadius:9,fontSize:14,background:'rgba(255,255,255,.08)',color:'#fff',boxSizing:'border-box',marginBottom:12}} value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&create()} placeholder='e.g. Swati Garments, Rohit Traders...' autoFocus/>
      {err&&<div style={{padding:'7px 12px',borderRadius:7,background:'rgba(155,38,38,.4)',color:'#ffa0a0',fontSize:12,marginBottom:12}}>{err}</div>}
      <button onClick={create} disabled={busy} style={{width:'100%',padding:'12px',background:'linear-gradient(135deg,#F5A732,#B8690A)',color:'#fff',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
        {busy?<><Spin/>Creating...</>:'Create Firm & Continue'}
      </button>
      <div style={{textAlign:'center',marginTop:16,fontSize:11,color:'rgba(255,255,255,.4)'}}>Logged in as {ses?.user?.email}</div>
    </div>
  </div>;}

/* ── TEAM MANAGEMENT ── */
function Team({activeFirm,firms,setFirms,onSwitchFirm,onNewFirm,mob}){
  const S=_theme==='modern'?MODERN_S:MINIMAL_S;
  const[members,setMembers]=useState([]);const[loading,setLoading]=useState(false);
  const[inviteEmail,setInviteEmail]=useState('');const[inviteRole,setInviteRole]=useState('staff');
  const[newFirmName,setNewFirmName]=useState('');const[toast,showT]=useToast();
  const[tab,setTab]=useState('members'); // 'members' | 'firms'
  const ROLES=[['owner','Owner — full access, can manage team & settings'],['manager','Manager — all ops except billing settings'],['accountant','Accountant — view/add payments & ledger, no billing'],['staff','Staff — POS, catalog, scan. No financials']];
  const ROLE_COLORS={owner:'blue',manager:'green',accountant:'amber',staff:'gray'};

  useEffect(()=>{if(activeFirm&&tab==='members')loadMembers();},[activeFirm?.id,tab]);

  const loadMembers=async()=>{
    setLoading(true);
    const d=await api.get('/api/members?firmId='+activeFirm.id);
    setMembers(Array.isArray(d)?d:[]);
    setLoading(false);
  };

  const invite=async()=>{
    if(!inviteEmail){showT('Enter email','err');return;}
    const res=await api.post('/api/members',{firmId:activeFirm.id,email:inviteEmail,role:inviteRole});
    if(res.error){showT(res.error,'err');return;}
    showT('Invite sent to '+inviteEmail);setInviteEmail('');loadMembers();
  };

  const changeRole=async(memberId,role)=>{
    await api.patch('/api/members',{memberId,role});
    setMembers(ms=>ms.map(m=>m.id===memberId?{...m,role}:m));showT('Role updated');
  };

  const removeMember=async(memberId)=>{
    if(!confirm('Remove this member?'))return;
    await api.del('/api/members?id='+memberId);
    setMembers(ms=>ms.filter(m=>m.id!==memberId));showT('Member removed');
  };

  const createFirm=async()=>{
    if(!newFirmName){showT('Enter firm name','err');return;}
    const res=await api.post('/api/firms',{name:newFirmName});
    if(res.error){showT(res.error,'err');return;}
    setNewFirmName('');showT('Firm created!');onNewFirm(res);
  };

  const canManage=activeFirm&&['owner','manager'].includes(activeFirm.role);

  return<div>
    <div style={S.h2}>Team & Firms</div>{toast}

    {/* Role access guide */}
    <div style={{...S.card,marginBottom:14,background:BLL,border:'0.5px solid '+BL+'30'}}>
      <div style={S.h3}>Role Access Guide</div>
      <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'repeat(4,1fr)',gap:8}}>
        {ROLES.map(([r,desc])=><div key={r} style={{padding:'8px 12px',borderRadius:8,background:'#fff',border:'0.5px solid '+BORD}}>
          <Bdg c={ROLE_COLORS[r]}>{r}</Bdg>
          <div style={{fontSize:11,color:MUT,marginTop:6,lineHeight:1.5}}>{desc}</div>
        </div>)}
      </div>
    </div>

    <div style={{display:'flex',gap:6,marginBottom:14}}>
      {[['members','Team Members'],['firms','My Firms']].map(([t,l])=><button key={t} onClick={()=>setTab(t)} style={{padding:'7px 16px',borderRadius:7,border:'0.5px solid '+(tab===t?BL:BORD),background:tab===t?BL:'#fff',color:tab===t?'#fff':MUT,cursor:'pointer',fontSize:12,fontWeight:600}}>{l}</button>)}
    </div>

    {/* ── MEMBERS TAB ── */}
    {tab==='members'&&<div style={{display:'grid',gridTemplateColumns:mob?'1fr':'2fr 1fr',gap:14}}>
      <div>
        <div style={S.h3}>Members of {activeFirm?.name}</div>
        {loading?<MT msg='Loading...'/> :<div style={{...S.card,padding:0}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr>{['Email','Role','Status','Joined',''].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {members.length===0&&<tr><td colSpan={5}><MT msg='No members yet'/></td></tr>}
              {members.map(m=><tr key={m.id}>
                <td style={S.td}>{m.invited_email||m.user_id?.slice(0,8)+'...'}</td>
                <td style={S.td}>
                  {canManage&&m.role!=='owner'
                    ?<select style={{...S.inp,fontSize:11,padding:'2px 6px',width:'auto'}} value={m.role} onChange={e=>changeRole(m.id,e.target.value)}>
                        {ROLES.map(([r])=><option key={r} value={r}>{r}</option>)}
                      </select>
                    :<Bdg c={ROLE_COLORS[m.role]}>{m.role}</Bdg>}
                </td>
                <td style={S.td}><Bdg c={m.status==='active'?'green':m.status==='invited'?'amber':'red'}>{m.status}</Bdg></td>
                <td style={{...S.td,fontSize:10,color:MUT}}>{new Date(m.created_at).toLocaleDateString('en-IN')}</td>
                <td style={S.td}>
                  {canManage&&m.role!=='owner'&&<button style={S.btn('dan',true)} onClick={()=>removeMember(m.id)}>Remove</button>}
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>}
      </div>

      {canManage&&<div style={S.card}>
        <div style={S.h3}>Invite New Member</div>
        <Fld label='Email Address'><input style={S.inp} value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder='employee@email.com'/></Fld>
        <Fld label='Role'>
          <select style={S.inp} value={inviteRole} onChange={e=>setInviteRole(e.target.value)}>
            {ROLES.filter(([r])=>r!=='owner').map(([r,d])=><option key={r} value={r}>{r} — {d.split('—')[0].trim()}</option>)}
          </select>
        </Fld>
        <div style={{padding:'8px 12px',background:BG,borderRadius:7,fontSize:11,color:MUT,marginBottom:12,lineHeight:1.6}}>
          They will receive an email to join ShopOS. Once they sign up, they will have access to <strong>{activeFirm?.name}</strong> with the selected role.
        </div>
        <button style={S.btn('pri')} onClick={invite}>Send Invite</button>
      </div>}
    </div>}

    {/* ── FIRMS TAB ── */}
    {tab==='firms'&&<div style={{display:'grid',gridTemplateColumns:mob?'1fr':'2fr 1fr',gap:14}}>
      <div style={{...S.card,padding:0}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
          <thead><tr>{['Firm Name','Your Role',''].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {firms.map(f=><tr key={f.id} style={{background:f.id===activeFirm?.id?BLL:''}}>
              <td style={S.td}><div style={{fontWeight:700,color:f.id===activeFirm?.id?BL:TXT}}>{f.name}{f.id===activeFirm?.id&&<span style={{fontSize:10,color:BL,marginLeft:6,fontWeight:600}}>(active)</span>}</div></td>
              <td style={S.td}><Bdg c={ROLE_COLORS[f.role]}>{f.role}</Bdg></td>
              <td style={S.td}>{f.id!==activeFirm?.id&&<button style={S.btn('gho',true)} onClick={()=>onSwitchFirm(f)}>Switch to this firm</button>}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <div style={S.card}>
        <div style={S.h3}>Create Another Firm</div>
        <div style={{fontSize:12,color:MUT,marginBottom:10,lineHeight:1.6}}>Each firm has its own products, customers, bills and settings. Switch between them from the nav bar.</div>
        <Fld label='New Firm Name'><input style={S.inp} value={newFirmName} onChange={e=>setNewFirmName(e.target.value)} placeholder='e.g. Rohit Traders' onKeyDown={e=>e.key==='Enter'&&createFirm()}/></Fld>
        <button style={S.btn('pri')} onClick={createFirm}>Create Firm</button>
      </div>
    </div>}
  </div>;}

/* ── ANALYTICS ── */
function Analytics({P,B,C,Py,Ret,mob}){
  const S=_theme==='modern'?MODERN_S:MINIMAL_S;
  const[tab,setTab]=useState('overview');
  const[period,setPeriod]=useState('month'); // month | quarter | year

  /* ── shared date helpers ── */
  const now=new Date();
  const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
  const lastMonthStart=new Date(now.getFullYear(),now.getMonth()-1,1);
  const lastMonthEnd=new Date(now.getFullYear(),now.getMonth(),0);
  const quarterStart=new Date(now.getFullYear(),Math.floor(now.getMonth()/3)*3,1);
  const yearStart=new Date(now.getFullYear(),0,1);
  const inRange=(d,s,e)=>{const dt=new Date(d);return dt>=s&&dt<=e;};

  const getPeriodDates=()=>{
    if(period==='month')return{start:monthStart,end:now};
    if(period==='quarter')return{start:quarterStart,end:now};
    return{start:yearStart,end:now};
  };
  const{start:periodStart,end:periodEnd}=getPeriodDates();

  /* ── Overview KPIs ── */
  const thisMonthBills=B.filter(b=>inRange(b.date,monthStart,now));
  const lastMonthBills=B.filter(b=>inRange(b.date,lastMonthStart,lastMonthEnd));
  const thisRev=thisMonthBills.reduce((s,b)=>s+b.total,0);
  const lastRev=lastMonthBills.reduce((s,b)=>s+b.total,0);
  const revGrowth=lastRev>0?((thisRev-lastRev)/lastRev*100):0;
  const totalRev=B.reduce((s,b)=>s+b.total,0);
  const totalPaid=Py.reduce((s,p)=>s+p.amount,0);
  const outstanding=totalRev-totalPaid;
  const avgBillValue=B.length>0?totalRev/B.length:0;
  const totalReturnVal=(Ret||[]).reduce((s,r)=>s+r.total,0);
  const returnRate=totalRev>0?(totalReturnVal/totalRev*100):0;

  /* ── 12-month trend ── */
  const months=[];
  for(let i=11;i>=0;i--){const d=new Date(now);d.setMonth(d.getMonth()-i);months.push({label:d.toLocaleString('default',{month:'short'}),yr:d.getFullYear(),mo:d.getMonth()});}
  const monthlyData=months.map(m=>{
    const bills=B.filter(b=>{const d=new Date(b.date);return d.getMonth()===m.mo&&d.getFullYear()===m.yr;});
    const rev=bills.reduce((s,b)=>s+b.total,0);
    const paid=Py.filter(p=>bills.some(b=>b.id===p.billId)).reduce((s,p)=>s+p.amount,0);
    return{...m,rev,paid,bills:bills.length,outstanding:rev-paid};
  });
  const maxRev=Math.max(...monthlyData.map(m=>m.rev),1);

  /* ── PRODUCT ANALYTICS ── */
  const productStats=P.map(p=>{
    const soldItems=B.flatMap(b=>b.items||[]).filter(i=>i.sku===p.sku);
    const qtySold=soldItems.reduce((s,i)=>s+i.qty,0);
    const revenue=soldItems.reduce((s,i)=>s+i.total,0);
    const returnedItems=(Ret||[]).flatMap(r=>r.items||[]).filter(i=>i.sku===p.sku);
    const qtyReturned=returnedItems.reduce((s,i)=>s+i.qty,0);
    const returnRate=qtySold>0?(qtyReturned/qtySold*100):0;
    const lastSold=soldItems.length>0?Math.max(...B.filter(b=>(b.items||[]).some(i=>i.sku===p.sku)).map(b=>new Date(b.date).getTime())):0;
    const daysSinceLastSold=lastSold>0?Math.floor((now-lastSold)/(1000*60*60*24)):999;
    return{...p,qtySold,revenue,qtyReturned,returnRate,daysSinceLastSold,inStock:p.qty};
  }).sort((a,b)=>b.qtySold-a.qtySold);

  const topSellers=productStats.filter(p=>p.qtySold>0).slice(0,10);
  const slowMovers=productStats.filter(p=>p.qtySold<3&&p.inStock>0).sort((a,b)=>b.daysSinceLastSold-a.daysSinceLastSold).slice(0,10);
  const deadStock=productStats.filter(p=>p.qtySold===0&&p.inStock>0);
  const highReturn=productStats.filter(p=>p.returnRate>20&&p.qtySold>2).sort((a,b)=>b.returnRate-a.returnRate).slice(0,8);

  /* ── CUSTOMER SCORING ── */
  const customerScores=C.map(c=>{
    const cBills=B.filter(b=>b.customerId===c.id);
    const cPay=Py.filter(p=>cBills.some(b=>b.id===p.billId));
    const cRet=(Ret||[]).filter(r=>r.customerId===c.id);
    const totalBilled=cBills.reduce((s,b)=>s+b.total,0)+(c.openingBalance||0);
    const totalPaid=cPay.reduce((s,p)=>s+p.amount,0);
    const outstanding=totalBilled-totalPaid;
    const outstandingPct=totalBilled>0?(outstanding/totalBilled*100):0;
    const returnVal=cRet.reduce((s,r)=>s+r.total,0);
    const returnRate=totalBilled>0?(returnVal/totalBilled*100):0;
    const chequePay=cPay.filter(p=>p.mode==='Cheque');
    const bounced=chequePay.filter(p=>['bounced','redeposited'].includes(p.chequeStatus)).length;
    const bouncedRate=chequePay.length>0?(bounced/chequePay.length*100):0;
    const avgPaymentDays=cBills.length>0?(()=>{
      let totalDays=0,count=0;
      cBills.forEach(b=>{const billDate=new Date(b.date);const firstPay=cPay.filter(p=>p.billId===b.id).sort((a,b)=>new Date(a.date)-new Date(b.date))[0];if(firstPay){totalDays+=Math.floor((new Date(firstPay.date)-billDate)/(1000*60*60*24));count++;}});
      return count>0?totalDays/count:999;
    })():999;
    const lastOrderDate=cBills.length>0?Math.max(...cBills.map(b=>new Date(b.date).getTime())):0;
    const daysSinceLastOrder=lastOrderDate>0?Math.floor((now-lastOrderDate)/(1000*60*60*24)):999;
    const orderFrequency=cBills.length>0&&lastOrderDate>0?(()=>{
      const firstOrder=Math.min(...cBills.map(b=>new Date(b.date).getTime()));
      const daySpan=Math.floor((lastOrderDate-firstOrder)/(1000*60*60*24))||1;
      return cBills.length/daySpan*30; // orders per month
    })():0;

    /* ── Score calculation (100 = perfect customer) ── */
    let score=100;
    // Outstanding debt penalty (max -30)
    score-=Math.min(30,outstandingPct*0.4);
    // Return rate penalty (max -20)
    score-=Math.min(20,returnRate*0.5);
    // Cheque bounce penalty (max -25)
    score-=Math.min(25,bouncedRate*0.5);
    // Slow payment penalty (max -15)
    if(avgPaymentDays>60)score-=15;
    else if(avgPaymentDays>30)score-=8;
    else if(avgPaymentDays>15)score-=3;
    // Inactivity penalty (max -10)
    if(daysSinceLastOrder>180)score-=10;
    else if(daysSinceLastOrder>90)score-=5;
    score=Math.max(0,Math.round(score));

    const tier=score>=80?'Premium':score>=60?'Good':score>=40?'Moderate':'Risky';
    const tierColor={Premium:GR,Good:BL,Moderate:AMB,Risky:RD}[tier];
    const tierBg={Premium:GRL,Good:BLL,Moderate:AMBL,Risky:RDL}[tier];

    return{...c,score,tier,tierColor,tierBg,totalBilled,totalPaid,outstanding,outstandingPct,returnRate,bouncedRate,avgPaymentDays:avgPaymentDays===999?null:Math.round(avgPaymentDays),daysSinceLastOrder:daysSinceLastOrder===999?null:daysSinceLastOrder,orderFrequency:+orderFrequency.toFixed(1),billCount:cBills.length};
  }).sort((a,b)=>b.score-a.score);

  const premiumCount=customerScores.filter(c=>c.tier==='Premium').length;
  const riskyCount=customerScores.filter(c=>c.tier==='Risky').length;
  const riskExposure=customerScores.filter(c=>c.tier==='Risky').reduce((s,c)=>s+c.outstanding,0);

  const TierBar=({score,tier,tierColor,tierBg})=><div style={{display:'flex',alignItems:'center',gap:8}}>
    <div style={{flex:1,height:6,background:'#eee',borderRadius:3,overflow:'hidden'}}>
      <div style={{width:score+'%',height:'100%',background:tierColor,borderRadius:3,transition:'width .5s'}}/>
    </div>
    <span style={{fontSize:11,fontWeight:700,color:tierColor,minWidth:32}}>{score}</span>
    <span style={{fontSize:10,background:tierBg,color:tierColor,padding:'1px 7px',borderRadius:10,fontWeight:700}}>{tier}</span>
  </div>;

  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:12}}>
      <div style={S.h2}>Analytics & Insights</div>
      <div style={{display:'flex',gap:6}}>
        {[['month','Monthly'],['quarter','Quarterly'],['year','Yearly']].map(([p,l])=><button key={p} onClick={()=>setPeriod(p)} style={{padding:'6px 12px',borderRadius:6,border:'0.5px solid '+(period===p?BL:BORD),background:period===p?BL:'#fff',color:period===p?'#fff':MUT,cursor:'pointer',fontSize:11,fontWeight:600,transition:'all 0.2s'}}>{l}</button>)}
      </div>
    </div>
    <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
      {[['overview','📊 Overview'],['products','📦 Products'],['customers','👥 Customers']].map(([t,l])=><button key={t} onClick={()=>setTab(t)} style={{padding:'8px 16px',borderRadius:8,border:'0.5px solid '+(tab===t?BL:BORD),background:tab===t?`linear-gradient(135deg, ${BL} 0%, #2563eb 100%)`:_theme==='modern'?'rgba(255,255,255,0.05)':'#fff',color:tab===t?'#fff':MUT,cursor:'pointer',fontSize:12,fontWeight:600,transition:'all 0.2s',boxShadow:tab===t?`0 4px 12px ${BL}40`:' none'}}>{l}</button>)}
    </div>

    {/* ── OVERVIEW ── */}
    {tab==='overview'&&<div>
      <div style={{display:'grid',gridTemplateColumns:mob?'1fr 1fr':'repeat(4,1fr)',gap:14,marginBottom:16}}>
        {[
          {l:'Revenue',v:fmt(thisRev),trend:(revGrowth>=0?'+':'')+revGrowth.toFixed(1)+'%',icon:'📈',c:BL,bg:'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(59,130,246,0.05) 100%)'},
          {l:'Outstanding',v:fmt(outstanding),trend:((outstanding/Math.max(totalRev,1))*100).toFixed(1)+'% pending',icon:'⚠️',c:RD,bg:'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.05) 100%)'},
          {l:'Avg Bill',v:fmt(avgBillValue),trend:B.length+' invoices',icon:'💰',c:GR,bg:'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.05) 100%)'},
          {l:'Return Rate',v:returnRate.toFixed(1)+'%',trend:fmt(totalReturnVal)+' value',icon:'↩️',c:AMB,bg:'linear-gradient(135deg, rgba(251,146,60,0.1) 0%, rgba(251,146,60,0.05) 100%)'},
        ].map(({l,v,trend,icon,c,bg})=><div key={l} style={{background:bg,border:'0.5px solid '+c+'30',borderRadius:12,padding:'16px',backdropFilter:'blur(10px)',transition:'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',cursor:'pointer',position:'relative',overflow:'hidden'}} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow=`0 12px 24px ${c}20`;}} onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';}}>
          <div style={{position:'absolute',top:-10,right:-10,fontSize:40,opacity:0.1}}>{icon}</div>
          <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',color:c,opacity:0.8,marginBottom:8,letterSpacing:'0.5px'}}>{l}</div>
          <div style={{fontSize:mob?20:24,fontWeight:800,fontFamily:'monospace',color:c,marginBottom:6}}>{v}</div>
          <div style={{fontSize:10,color:c,opacity:0.7}}>{trend}</div>
        </div>)}
      </div>

      {/* 12-month chart */}
      <div style={{...S.card,marginBottom:14,background:_theme==='modern'?'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)':'#fff',backdropFilter:_theme==='modern'?'blur(10px)':'none',border:'0.5px solid '+(_theme==='modern'?'rgba(255,255,255,0.1)':BORD)}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={S.h3}>12-Month Trend</div>
          <div style={{fontSize:10,color:MUT}}>Revenue (Blue) vs Collections (Green)</div>
        </div>
        <div style={{display:'flex',alignItems:'flex-end',gap:5,height:160,paddingTop:12,paddingBottom:8,overflowX:'auto',background:_theme==='modern'?'linear-gradient(to right, rgba(59,130,246,0.05) 0%, rgba(34,197,94,0.05) 100%)':'transparent',borderRadius:8,padding:'12px',margin:'-12px'}}>
          {monthlyData.map((m,i)=><div key={m.label+m.yr} style={{flex:'0 0 auto',minWidth:44,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
            <div style={{fontSize:8,...S.mono,color:BL,fontWeight:600,minHeight:14}}>{m.rev>0?'₹'+Math.round(m.rev/1000)+'k':'-'}</div>
            <div style={{width:32,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:120,gap:0.5,position:'relative'}}>
              <div style={{width:'100%',height:Math.max((m.rev/maxRev)*100,m.rev>0?4:0)+'%',background:`linear-gradient(to top, ${BL}, ${BL}99)`,borderRadius:'4px 4px 0 0',opacity:0.85,transition:`all 0.5s cubic-bezier(0.4, 0, 0.2, 1)`,boxShadow:`0 4px 12px ${BL}30`}}/>
              <div style={{width:'80%',height:Math.max((m.paid/maxRev)*100,m.paid>0?4:0)+'%',background:`linear-gradient(to top, ${GR}, ${GR}99)`,borderRadius:'4px 4px 0 0',opacity:0.75,transition:`all 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${i*20}ms`,boxShadow:`0 4px 12px ${GR}20`}}/>
            </div>
            <div style={{fontSize:9,color:MUT,fontWeight:600,marginTop:2}}>{m.label}</div>
            <div style={{fontSize:8,color:MUT+'88'}}>{m.bills} inv</div>
          </div>)}
        </div>
        <div style={{display:'flex',gap:16,marginTop:12,fontSize:11,paddingTop:8,borderTop:'0.5px solid '+BORD}}>
          <span style={{display:'flex',alignItems:'center',gap:6}}><span style={{width:14,height:10,background:`linear-gradient(to right, ${BL}, ${BL}99)`,borderRadius:3,display:'inline-block',boxShadow:`0 2px 6px ${BL}40`}}/> <span style={{fontWeight:600}}>Revenue</span></span>
          <span style={{display:'flex',alignItems:'center',gap:6}}><span style={{width:14,height:10,background:`linear-gradient(to right, ${GR}, ${GR}99)`,borderRadius:3,display:'inline-block',boxShadow:`0 2px 6px ${GR}20`}}/> <span style={{fontWeight:600}}>Collections</span></span>
        </div>
      </div>

      {/* Customer tier summary */}
      <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'1fr 1fr',gap:14}}>
        <div style={S.card}>
          <div style={S.h3}>Customer Health Summary</div>
          {[['Premium',premiumCount,GR,GRL,'Paying well, low returns'],['Good',customerScores.filter(c=>c.tier==='Good').length,BL,BLL,'Reliable, minor issues'],['Moderate',customerScores.filter(c=>c.tier==='Moderate').length,AMB,AMBL,'Watch closely'],['Risky',riskyCount,RD,RDL,'High outstanding or bounces']].map(([t,n,c,bg,d])=><div key={t} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'0.5px solid #f0ede8'}}>
            <div style={{width:36,height:36,borderRadius:8,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:800,color:c,flexShrink:0}}>{n}</div>
            <div style={{flex:1}}><div style={{fontWeight:700,fontSize:12,color:c}}>{t}</div><div style={{fontSize:11,color:MUT}}>{d}</div></div>
            <div style={{...S.mono,fontSize:11,color:c,fontWeight:600}}>{C.length>0?(n/C.length*100).toFixed(0):'0'}%</div>
          </div>)}
          {riskyCount>0&&<div style={{marginTop:8,padding:'7px 10px',background:RDL,borderRadius:7,fontSize:12,color:RD,fontWeight:600}}>
            Risk exposure: {fmt(riskExposure)} outstanding from {riskyCount} risky customers
          </div>}
        </div>
        <div style={S.card}>
          <div style={S.h3}>Payment Mode Breakdown</div>
          {(()=>{
            const modes={Cash:0,'Online (UPI)':0,Cheque:0};
            Py.forEach(p=>{if(modes[p.mode]!==undefined)modes[p.mode]+=p.amount;});
            const total=Object.values(modes).reduce((s,v)=>s+v,0)||1;
            return Object.entries(modes).map(([mode,amt])=><div key={mode} style={{marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}>
                <span style={{fontWeight:600}}>{mode}</span>
                <span style={{...S.mono,color:GR,fontWeight:700}}>{fmt(amt)} ({(amt/total*100).toFixed(0)}%)</span>
              </div>
              <div style={{height:6,background:'#eee',borderRadius:3}}>
                <div style={{width:(amt/total*100)+'%',height:'100%',background:mode==='Cash'?GR:mode==='Online (UPI)'?BL:AMB,borderRadius:3,transition:'width .5s'}}/>
              </div>
            </div>);
          })()}
        </div>
      </div>
    </div>}

    {/* ── PRODUCTS ── */}
    {tab==='products'&&<div>
      <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'repeat(3,1fr)',gap:14,marginBottom:14}}>
        {[{l:'Top Sellers',d:topSellers,c:GR,bg:GRL,icon:'🏆',key:'qtySold',unit:'pcs sold'},{l:'Slow Movers',d:slowMovers,c:AMB,bg:AMBL,icon:'🐢',key:'daysSinceLastSold',unit:'days idle'},{l:'Dead Stock',d:deadStock,c:RD,bg:RDL,icon:'📦',key:'inStock',unit:'pcs stuck'}].map(({l,d,c,bg,icon,key,unit})=><div key={l} style={{...S.card,border:'0.5px solid '+c+'30',background:bg}}>
          <div style={S.h3}>{icon} {l} ({d.length})</div>
          {d.length===0?<MT msg='None right now'/>:<div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:280,overflowY:'auto'}}>
            {d.slice(0,8).map(p=><div key={p.id} style={{padding:'6px 10px',borderRadius:6,background:'#fff',border:'0.5px solid '+BORD}}>
              <div style={{fontWeight:700,fontSize:12}}>{p.name}</div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:2}}>
                <span style={{fontSize:10,color:MUT}}>{p.cat} · {p.size}</span>
                <span style={{...S.mono,fontSize:11,fontWeight:700,color:c}}>{p[key]} {unit}</span>
              </div>
            </div>)}
          </div>}
        </div>)}
      </div>
      <div style={S.card}>
        <div style={S.h3}>High Return Rate Products (returning more than 20% of sold)</div>
        {highReturn.length===0?<MT msg='No high-return products'/>:<div style={{...S.card,padding:0}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr>{['Product','Sold','Returned','Return Rate','Revenue'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{highReturn.map(p=><tr key={p.id}>
              <td style={S.td}><div style={{fontWeight:700}}>{p.name}</div><div style={{fontSize:10,color:MUT}}>{p.cat} · {p.size}</div></td>
              <td style={{...S.td,...S.mono}}>{p.qtySold} pcs</td>
              <td style={{...S.td,...S.mono,color:RD,fontWeight:700}}>{p.qtyReturned} pcs</td>
              <td style={S.td}><div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{flex:1,height:5,background:'#eee',borderRadius:3}}><div style={{width:Math.min(p.returnRate,100)+'%',height:'100%',background:p.returnRate>50?RD:AMB,borderRadius:3}}/></div>
                <span style={{...S.mono,fontSize:11,fontWeight:700,color:p.returnRate>50?RD:AMB}}>{p.returnRate.toFixed(0)}%</span>
              </div></td>
              <td style={{...S.td,...S.mono,color:GR,fontWeight:600}}>{fmt(p.revenue)}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      </div>
    </div>}

    {/* ── CUSTOMERS ── */}
    {tab==='customers'&&<div>
      <div style={{marginBottom:10,padding:'10px 14px',borderRadius:8,background:BLL,fontSize:12,color:BL,lineHeight:1.7}}>
        <strong>Score explained:</strong> 100 = perfect customer. Deducted for: outstanding debt, returns, cheque bounces, slow payments, inactivity. Scores update live as you record transactions.
      </div>
      <div style={{...S.card,padding:0,overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:mob?500:800}}>
          <thead><tr>{['Customer','Score','Tier','Bills','Outstanding','Return Rate','Avg Pay Days','Last Order','Cheque Bounces'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {customerScores.length===0&&<tr><td colSpan={9}><MT msg='No customers yet'/></td></tr>}
            {customerScores.map(c=><tr key={c.id}>
              <td style={S.td}>
                <div style={{fontWeight:700}}>{c.name}</div>
                <div style={{fontSize:10,color:MUT}}>{c.phone}{c.shopname?' · '+c.shopname:''}</div>
              </td>
              <td style={{...S.td,minWidth:140}}><TierBar score={c.score} tier={c.tier} tierColor={c.tierColor} tierBg={c.tierBg}/></td>
              <td style={S.td}><Bdg c={c.tier==='Premium'?'green':c.tier==='Good'?'blue':c.tier==='Moderate'?'amber':'red'}>{c.tier}</Bdg></td>
              <td style={{...S.td,...S.mono,textAlign:'right'}}>{c.billCount}</td>
              <td style={{...S.td,...S.mono,fontWeight:700,color:c.outstanding>0?RD:GR}}>{fmt(c.outstanding)}</td>
              <td style={S.td}><span style={{...S.mono,color:c.returnRate>20?RD:c.returnRate>10?AMB:GR,fontWeight:c.returnRate>10?700:400}}>{c.returnRate.toFixed(1)}%</span></td>
              <td style={{...S.td,...S.mono,color:c.avgPaymentDays===null?MUT:c.avgPaymentDays>60?RD:c.avgPaymentDays>30?AMB:GR}}>{c.avgPaymentDays===null?'—':c.avgPaymentDays+'d'}</td>
              <td style={{...S.td,fontSize:11,color:c.daysSinceLastOrder===null?MUT:c.daysSinceLastOrder>180?RD:c.daysSinceLastOrder>90?AMB:TXT}}>{c.daysSinceLastOrder===null?'—':c.daysSinceLastOrder+'d ago'}</td>
              <td style={{...S.td,...S.mono,color:c.bouncedRate>0?RD:GR,fontWeight:c.bouncedRate>0?700:400}}>{c.bouncedRate.toFixed(0)}%</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>}
  </div>;}

/* ── SUPPLIERS ── */
function Suppliers({SI,setSI,SS,setSS,firm,gk,mob}){
  const S=_theme==='modern'?MODERN_S:MINIMAL_S;
  console.log('[Suppliers] Rendered with SI:', SI, 'Length:', SI?.length);
  const[srch,setSrch]=useState('');
  const[selSupplier,setSelSupplier]=useState(null); // group view
  const[editInv,setEditInv]=useState(null); // invoice being edited
  const[tab,setTab]=useState('invoices');const[uploading,setUploading]=useState(false);
  const[toast,showT]=useToast();
  const handleStatementUpload=async e=>{const file=e.target.files[0];if(!file)return;if(file.size>(10*1024*1024)){showT('File too large (max 10MB)','err');return;}setUploading(true);try{const r=new FileReader();r.onload=async ev=>{const b64=ev.target.result.split(',')[1];const res=await api.post('/api/supplier-statements',{supplierId:null,supplierName:selSupplier||'',fileName:file.name,fileType:file.type,fileData:b64,fileSize:file.size,description:'',statementDate:new Date().toISOString().split('T')[0]});setSS(ss=>[res,...ss]);showT('Statement uploaded!');};r.readAsDataURL(file);}catch(err){showT('Upload failed: '+err.message,'err');}finally{setUploading(false);}};
  const relatedStatements=selSupplier?SS.filter(s=>s.supplierName===selSupplier):[];
  const BLANK={supplierName:'',supplierGSTIN:'',invoiceNo:'',invoiceDate:'',place:'',subtotal:'',discount:'',discountPct:'',cgst:'',sgst:'',igst:'',roundOff:'',total:'',notes:''};
  const[form,setForm]=useState(BLANK);
  const[showForm,setShowForm]=useState(false);
  const ff=k=>v=>setForm(f=>({...f,[k]:v}));
  // Auto-calculate total
  const calcTotal=f=>{const sub=+f.subtotal||0,disc=+f.discount||0,cgst=+f.cgst||0,sgst=+f.sgst||0,igst=+f.igst||0,ro=+f.roundOff||0;return(sub-disc+cgst+sgst+igst+ro).toFixed(2);};

  // Group invoices by supplier name
  const suppliers=[...new Set(SI.map(i=>i.supplierName))].sort();
  const filtered=srch?suppliers.filter(s=>s.toLowerCase().includes(srch.toLowerCase())):suppliers;

  const openAdd=()=>{setEditInv(null);setForm(BLANK);setShowForm(true);};
  const openEdit=inv=>{setEditInv(inv.id);setForm({supplierName:inv.supplierName,supplierGSTIN:inv.supplierGSTIN||'',invoiceNo:inv.invoiceNo||'',invoiceDate:inv.invoiceDate||'',place:inv.place||'',subtotal:inv.subtotal||'',discount:inv.discount||'',discountPct:inv.discountPct||'',cgst:inv.cgst||'',sgst:inv.sgst||'',igst:inv.igst||'',roundOff:inv.roundOff||'',total:inv.total||'',notes:inv.notes||''});setShowForm(true);};

  const save=async()=>{
    if(!form.supplierName){showT('Supplier name required','err');return;}
    const payload={...form,total:+calcTotal(form)};
    if(editInv){
      const updated=await api.patch('/api/supplier-invoices',{id:editInv,...payload});
      setSI(si=>si.map(i=>i.id===editInv?{...i,...updated}:i));
      showT('Invoice updated!');
    }else{
      const created=await api.post('/api/supplier-invoices',payload);
      setSI(si=>[created,...si]);
      showT('Invoice saved!');
    }
    setShowForm(false);setEditInv(null);setForm(BLANK);
  };

  const del=async id=>{
    if(!confirm('Delete this invoice?'))return;
    await api.del('/api/supplier-invoices?id='+id);
    setSI(si=>si.filter(i=>i.id!==id));
    showT('Deleted');
  };

  const supInvoices=selSupplier?SI.filter(i=>i.supplierName===selSupplier):[];
  const supTotal=supInvoices.reduce((s,i)=>s+i.total,0);

  return<div>
    {toast}
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
      <div style={S.h2}>Suppliers</div>
      <div style={{display:'flex',gap:6}}>
        <button onClick={()=>setTab('invoices')} style={{padding:'5px 14px',borderRadius:20,border:'0.5px solid '+(tab==='invoices'?BL:BORD),background:tab==='invoices'?BL:'#fff',color:tab==='invoices'?'#fff':MUT,cursor:'pointer',fontSize:11,fontWeight:600}}>Invoices</button>
        <button onClick={()=>setTab('statements')} style={{padding:'5px 14px',borderRadius:20,border:'0.5px solid '+(tab==='statements'?BL:BORD),background:tab==='statements'?BL:'#fff',color:tab==='statements'?'#fff':MUT,cursor:'pointer',fontSize:11,fontWeight:600}}>Statements</button>
        <button onClick={()=>setTab('reconciliation')} style={{padding:'5px 14px',borderRadius:20,border:'0.5px solid '+(tab==='reconciliation'?BL:BORD),background:tab==='reconciliation'?BL:'#fff',color:tab==='reconciliation'?'#fff':MUT,cursor:'pointer',fontSize:11,fontWeight:600}}>Reconciliation</button>
      </div>
    </div>
    {tab==='invoices'&&<button style={S.btn('pri')} onClick={openAdd}>+ Add Invoice</button>}

    {tab==='invoices'&&<>
    {showForm&&<div style={{...S.card,marginBottom:14,border:'0.5px solid '+BL+'40'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div style={S.h2}>{editInv?'Edit Invoice':'Add Supplier Invoice'}</div>
        <button onClick={()=>{setShowForm(false);setEditInv(null);}} style={{background:'none',border:'none',cursor:'pointer',color:MUT,fontSize:18}}>x</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'1fr 1fr 1fr',gap:10,marginBottom:10}}>
        <Fld label='Supplier Name *'><input style={S.inp} value={form.supplierName} onChange={e=>ff('supplierName')(e.target.value)} placeholder='e.g. Swati Garments'/></Fld>
        <Fld label='Supplier GSTIN'><input style={S.inp} value={form.supplierGSTIN} onChange={e=>ff('supplierGSTIN')(e.target.value)} placeholder='23XXXXX'/></Fld>
        <Fld label='Place / City'><input style={S.inp} value={form.place} onChange={e=>ff('place')(e.target.value)} placeholder='Surat, Mumbai...'/></Fld>
        <Fld label='Invoice Number'><input style={S.inp} value={form.invoiceNo} onChange={e=>ff('invoiceNo')(e.target.value)} placeholder='INV-001'/></Fld>
        <Fld label='Invoice Date'><input style={S.inp} type='date' value={form.invoiceDate} onChange={e=>ff('invoiceDate')(e.target.value)}/></Fld>
        <Fld label='Notes'><input style={S.inp} value={form.notes} onChange={e=>ff('notes')(e.target.value)} placeholder='Optional notes'/></Fld>
      </div>
      <div style={{...S.card,padding:'12px 14px',background:BG,marginBottom:10}}>
        <div style={S.h3}>Invoice Amounts</div>
        <div style={{display:'grid',gridTemplateColumns:mob?'1fr 1fr':'repeat(4,1fr)',gap:10}}>
          <Fld label='Subtotal (Taxable)'><input style={S.inp} type='number' value={form.subtotal} onChange={e=>ff('subtotal')(e.target.value)} placeholder='0.00'/></Fld>
          <Fld label='Discount Amount'><input style={S.inp} type='number' value={form.discount} onChange={e=>ff('discount')(e.target.value)} placeholder='0.00'/></Fld>
          <Fld label='Discount %'><input style={S.inp} type='number' value={form.discountPct} onChange={e=>ff('discountPct')(e.target.value)} placeholder='0'/></Fld>
          <Fld label='CGST'><input style={S.inp} type='number' value={form.cgst} onChange={e=>ff('cgst')(e.target.value)} placeholder='0.00'/></Fld>
          <Fld label='SGST'><input style={S.inp} type='number' value={form.sgst} onChange={e=>ff('sgst')(e.target.value)} placeholder='0.00'/></Fld>
          <Fld label='IGST (if interstate)'><input style={S.inp} type='number' value={form.igst} onChange={e=>ff('igst')(e.target.value)} placeholder='0.00'/></Fld>
          <Fld label='Round Off'><input style={S.inp} type='number' value={form.roundOff} onChange={e=>ff('roundOff')(e.target.value)} placeholder='0.00'/></Fld>
          <Fld label='Total (auto-calculated)'>
            <div style={{...S.inp,background:BLL,color:BL,fontWeight:800,fontFamily:'DM Mono,monospace',cursor:'default',display:'flex',alignItems:'center'}}>Rs.{calcTotal(form)}</div>
          </Fld>
        </div>
      </div>
      <div style={{display:'flex',gap:8}}><button style={S.btn('pri')} onClick={save}>Save Invoice</button><button style={S.btn()} onClick={()=>{setShowForm(false);setEditInv(null);}}>Cancel</button></div>
    </div>}

    <div style={{display:'grid',gridTemplateColumns:mob?'1fr':'1fr 2fr',gap:14}}>
      {/* Supplier list */}
      <div>
        <input style={{...S.inp,marginBottom:10}} placeholder='Search suppliers...' value={srch} onChange={e=>setSrch(e.target.value)}/>
        {filtered.length===0?<MT msg='No supplier invoices yet. Add one above or scan a supplier invoice.'/>:
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {filtered.map(sup=>{
            const invs=SI.filter(i=>i.supplierName===sup);
            const tot=invs.reduce((s,i)=>s+i.total,0);
            return<div key={sup} onClick={()=>setSelSupplier(sel=>sel===sup?null:sup)} style={{padding:'10px 14px',border:'0.5px solid '+(selSupplier===sup?BL:BORD),borderRadius:8,cursor:'pointer',background:selSupplier===sup?BLL:'#fff'}}>
              <div style={{fontWeight:700,color:selSupplier===sup?BL:TXT,fontSize:13}}>{sup}</div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
                <span style={{fontSize:11,color:MUT}}>{invs.length} invoice{invs.length!==1?'s':''}</span>
                <span style={{...S.mono,fontSize:12,fontWeight:700,color:AMB}}>Total: {fmt(tot)}</span>
              </div>
            </div>;
          })}
        </div>}
      </div>

      {/* Invoice detail for selected supplier */}
      <div>
        {!selSupplier?<div style={{...S.card,textAlign:'center',padding:40,color:MUT}}>Select a supplier on the left to view their invoices</div>:
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div>
              <div style={{fontWeight:800,fontSize:15,color:BL}}>{selSupplier}</div>
              <div style={{fontSize:12,color:MUT}}>{supInvoices.length} invoices · Total: <strong style={{color:AMB,fontFamily:'DM Mono,monospace'}}>{fmt(supTotal)}</strong></div>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {supInvoices.map(inv=><div key={inv.id} style={{...S.card,border:'0.5px solid '+BORD}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                <div>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                    {inv.invoiceNo&&<span style={{...S.mono,fontWeight:800,color:BL,fontSize:13}}>#{inv.invoiceNo}</span>}
                    {inv.invoiceDate&&<span style={{fontSize:12,color:MUT}}>{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</span>}
                    {inv.place&&<span style={{fontSize:11,color:MUT}}>📍 {inv.place}</span>}
                    {inv.supplierGSTIN&&<span style={{...S.mono,fontSize:10,color:BL,background:BLL,padding:'1px 6px',borderRadius:4}}>GSTIN: {inv.supplierGSTIN}</span>}
                  </div>
                  {inv.notes&&<div style={{fontSize:11,color:MUT,marginTop:4}}>{inv.notes}</div>}
                </div>
                <div style={{display:'flex',gap:6}}>
                  <button style={S.btn('def',true)} onClick={()=>openEdit(inv)}>Edit</button>
                  <button style={S.btn('dan',true)} onClick={()=>del(inv.id)}>Delete</button>
                </div>
              </div>
              {/* Amount breakdown */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:8}}>
                {[['Subtotal',inv.subtotal,TXT],['Discount',inv.discount>0?'-'+fmt(inv.discount):null,GR],['CGST',inv.cgst,BL],['SGST',inv.sgst,BL],['IGST',inv.igst>0?inv.igst:null,PUR],['Round Off',inv.roundOff!==0?inv.roundOff:null,MUT]].filter(([,v])=>v!==null&&v!==0&&v!==undefined).map(([l,v,c])=><div key={l} style={{background:BG,borderRadius:6,padding:'6px 10px'}}>
                  <div style={{fontSize:10,color:MUT,fontWeight:600,textTransform:'uppercase'}}>{l}</div>
                  <div style={{...S.mono,fontWeight:700,color:c,fontSize:13}}>{typeof v==='string'&&v.startsWith('-')?v:fmt(v)}</div>
                </div>)}
                <div style={{background:BLL,borderRadius:6,padding:'6px 10px',border:'0.5px solid '+BL+'40'}}>
                  <div style={{fontSize:10,color:BL,fontWeight:700,textTransform:'uppercase'}}>Total</div>
                  <div style={{...S.mono,fontWeight:800,color:BL,fontSize:14}}>{fmt(inv.total)}</div>
                </div>
              </div>
              {/* Items if available */}
              {inv.items&&inv.items.length>0&&<div style={{marginTop:10,borderTop:'0.5px solid '+BORD,paddingTop:8}}>
                <div style={{fontSize:10,fontWeight:700,color:MUT,textTransform:'uppercase',marginBottom:6}}>Items ({inv.items.length})</div>
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  {inv.items.map((it,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:11,padding:'3px 0',borderBottom:'0.5px solid #f0ede8'}}>
                    <span style={{fontWeight:600}}>{it.name}{it.articleNo?' ('+it.articleNo+')':''}</span>
                    <span style={{color:MUT}}>{it.sizes} · {it.qty} pcs · <span style={{...S.mono,color:AMB,fontWeight:700}}>{fmt(it.price)}</span></span>
                  </div>)}
                </div>
              </div>}
            </div>)}
          </div>
        </div>}
      </div>
    </div>
    </>}
    {tab==='statements'&&<div>
      <div style={{...S.card,marginBottom:14}}>
        <div style={S.h3}>Upload Supplier Statement</div>
        {!selSupplier?<div style={{padding:'16px',background:BG,borderRadius:8,color:MUT,fontSize:12}}>Select a supplier on the left to upload their statement</div>:<label style={{border:'1.5px dashed '+BORD,borderRadius:10,padding:'22px 16px',textAlign:'center',cursor:'pointer',background:BG,display:'block'}}>
          <input type='file' accept='.pdf,.csv,.txt,image/*' style={{display:'none'}} onChange={handleStatementUpload}/>
          <div style={{fontSize:36,marginBottom:6}}>📋</div>
          <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{uploading?'Uploading...':'Tap to upload statement'}</div>
          <div style={{fontSize:11,color:MUT}}>PDF, CSV, TXT, or image (JPG/PNG) • Max 10MB</div>
        </label>}
      </div>
      {relatedStatements.length===0?<div style={{...S.card,textAlign:'center',padding:40,color:MUT}}>No statements uploaded for {selSupplier||'this supplier'}</div>:<div style={{...S.card,padding:0,overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:mob?400:600}}>
          <thead><tr>{['File Name','Type','Date','Size',''].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{relatedStatements.map(s=><tr key={s.id}>
            <td style={S.td}><div style={{fontWeight:600}}>{s.fileName}</div></td>
            <td style={S.td}><Bdg c='blue'>{s.fileType.split('/').pop()}</Bdg></td>
            <td style={{...S.td,fontSize:11,color:MUT}}>{s.statementDate?new Date(s.statementDate).toLocaleDateString('en-IN'):new Date(s.uploadedAt).toLocaleDateString('en-IN')}</td>
            <td style={{...S.td,fontSize:11}}>{(s.fileSize/1024).toFixed(1)}KB</td>
            <td style={S.td}><button style={S.btn('dan',true)} onClick={async()=>{if(!confirm('Delete?'))return;await api.del('/api/supplier-statements?id='+s.id);setSS(ss=>ss.filter(x=>x.id!==s.id));showT('Deleted');}}>Remove</button></td>
          </tr>)}</tbody>
        </table>
      </div>}
    </div>}
    {tab==='reconciliation'&&<SupplierRecon SI={SI} firm={firm} gk={gk} mob={mob}/>}
  </div>;}