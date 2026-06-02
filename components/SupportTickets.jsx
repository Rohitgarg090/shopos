'use client';
import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Send, AlertCircle, CheckCircle2, Clock, X, Loader } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const BL='#1B5E8A',BLL='#E3EFF8',AMB='#B8690A',AMBL='#FDF0E0',GR='#2E6B1F',GRL='#EBF5E4',RD='#9B2626',RDL='#FDF0F0',BORD='#E3E1D9',MUT='#888',TXT='#1A1A18',BG='#F5F4F0';

const fmt=n=>'Rs.'+Number(n||0).toFixed(2);

const getToken=async()=>{const{data:{session}}=await supabase.auth.getSession();return session?.access_token||'';};

const getOrganizationId=async()=>{
  try{
    // Get user first
    const{data:{user}}=await supabase.auth.getUser();
    if(!user) return '';

    // Query organizations table to find user's organization
    const{data}=await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id',user.id)
      .single();

    const orgId = data?.id || '';
    console.log('[SupportTickets] Organization ID:', orgId);
    return orgId;
  }catch(e){
    console.error('[SupportTickets] Error getting organization ID:', e);
    return '';
  }
};
const api={
  get:async u=>{
    const token=await getToken();
    const orgId=await getOrganizationId();
    console.log('[SupportTickets] API GET', u, 'with token:', !!token, 'orgId:', orgId);
    if(!token || !orgId) {
      throw new Error('Missing token or organization ID');
    }
    const res=await fetch(u,{headers:{'Authorization':'Bearer '+token,'x-firm-id':orgId}});
    if(!res.ok) {
      const err=await res.text();
      throw new Error(`API error: ${res.status} - ${err}`);
    }
    return res.json();
  },
  post:async(u,b)=>{
    const token=await getToken();
    const orgId=await getOrganizationId();
    if(!token || !orgId) throw new Error('Missing token or organization ID');
    const res=await fetch(u,{method:'POST',headers:{'Authorization':'Bearer '+token,'x-firm-id':orgId,'Content-Type':'application/json'},body:JSON.stringify(b)});
    if(!res.ok) throw new Error(res.statusText);
    return res.json();
  },
};

export default function SupportTickets({mob}){
  console.log('[SupportTickets] Component rendering - mob:', mob);
  const[view,setView]=useState('list'); // list | create | detail
  const[tickets,setTickets]=useState([]);
  const[selectedTicket,setSelectedTicket]=useState(null);
  const[loading,setLoading]=useState(true);
  const[creating,setCreating]=useState(false);
  const[replying,setReplying]=useState(false);
  const[formData,setFormData]=useState({title:'',description:'',category:'technical',priority:'medium'});
  const[replyText,setReplyText]=useState('');
  const[aiSuggestion,setAiSuggestion]=useState(null);
  const[gettingSuggestion,setGettingSuggestion]=useState(false);

  useEffect(()=>{
    if(view==='list'||view==='detail') fetchTickets();
  },[view]);

  const fetchTickets=async()=>{
    try{
      console.log('[SupportTickets] Fetching tickets...');
      const res=await api.get('/api/support/tickets');
      console.log('[SupportTickets] Tickets response:', res);
      const ticketsList=res.tickets||[];
      setTickets(ticketsList);
      if(view==='detail'&&selectedTicket){
        const updated=ticketsList?.find(t=>t.id===selectedTicket.id);
        if(updated) setSelectedTicket(updated);
      }
    }catch(err){
      console.error('[SupportTickets] Failed to fetch tickets:',err);
      setTickets([]);
    }finally{
      setLoading(false);
    }
  };

  const fetchTicketDetail=async(ticketId)=>{
    try{
      const res=await api.get(`/api/support/tickets?id=${ticketId}`);
      if(res.success&&res.ticket){
        setSelectedTicket(res.ticket);
      }
    }catch(err){
      console.error('Failed to fetch ticket detail:',err);
    }
  };

  const getGeminiSuggestion=async()=>{
    if(!formData.title||!formData.description){
      alert('Fill in title and description first');
      return;
    }
    setGettingSuggestion(true);
    try{
      const res=await api.post('/api/support/gemini-response',{
        title:formData.title,
        description:formData.description,
        category:formData.category,
        priority:formData.priority,
      });
      if(res.error){
        alert('Error: '+res.error);
      }else{
        setAiSuggestion(res);
      }
    }catch(err){
      console.error('Get suggestion error:',err);
      alert('Failed to get suggestion: '+(err.message||'Unknown error'));
    }finally{
      setGettingSuggestion(false);
    }
  };

  const applySuggestion=()=>{
    if(aiSuggestion){
      setFormData({
        ...formData,
        category:aiSuggestion.recommendedCategory||formData.category,
        priority:aiSuggestion.recommendedPriority||formData.priority,
      });
      setAiSuggestion(null);
    }
  };

  const createTicket=async()=>{
    if(!formData.title||!formData.description){
      alert('Title and description required');
      return;
    }
    setCreating(true);
    try{
      const res=await api.post('/api/support/tickets',{
        title:formData.title,
        description:formData.description,
        category:formData.category,
        priority:formData.priority,
      });
      if(res.error){
        alert('Error: '+res.error);
        setCreating(false);
        return;
      }
      setFormData({title:'',description:'',category:'technical',priority:'medium'});
      setView('list');
      await fetchTickets();
    }catch(err){
      console.error('Create ticket error:',err);
      alert('Failed to create ticket: '+(err.message||'Unknown error'));
    }finally{
      setCreating(false);
    }
  };

  const sendReply=async()=>{
    if(!replyText||!selectedTicket){
      return;
    }
    setReplying(true);
    try{
      const res=await api.post(`/api/support/tickets/${selectedTicket.id}/messages`,{
        message:replyText,
        isInternal:false,
      });
      if(res.error){
        alert('Error: '+res.error);
        setReplying(false);
        return;
      }
      setReplyText('');
      await fetchTickets();
      await fetchTicketDetail(selectedTicket.id);
    }catch(err){
      console.error('Send reply error:',err);
      alert('Failed to send reply: '+(err.message||'Unknown error'));
    }finally{
      setReplying(false);
    }
  };

  const statusColor={open:BL,inProgress:AMB,waiting:RD,resolved:GR,closed:MUT};
  const statusBg={open:BLL,inProgress:AMBL,waiting:RDL,resolved:GRL,closed:'#f0f0f0'};

  return<div style={{width:'100%',maxWidth:900,margin:'0 auto'}}>
    {view==='list'&&<div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div style={{fontSize:18,fontWeight:700,color:TXT}}>Support Tickets</div>
        <button onClick={()=>setView('create')} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:7,background:BL,color:'#fff',border:'none',cursor:'pointer',fontSize:12,fontWeight:600}}>
          <Plus size={16}/>New Ticket
        </button>
      </div>

      {loading?<div style={{padding:40,textAlign:'center',color:MUT}}>Loading tickets...</div>:
       tickets.length===0?<div style={{padding:40,textAlign:'center',color:MUT}}>No tickets yet. <button onClick={()=>setView('create')} style={{background:'none',border:'none',color:BL,cursor:'pointer',fontWeight:600}}>Create one</button></div>:
       <div style={{display:'flex',flexDirection:'column',gap:8}}>
         {tickets.map(t=><div key={t.id} onClick={()=>{fetchTicketDetail(t.id);setView('detail');}} style={{padding:'12px 14px',border:'0.5px solid '+BORD,borderRadius:8,background:'#fff',cursor:'pointer',transition:'all 0.2s',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}} onMouseEnter={e=>e.currentTarget.style.background=BG} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
           <div style={{flex:1}}>
             <div style={{fontWeight:700,fontSize:13,color:TXT,marginBottom:4}}>{t.title}</div>
             <div style={{fontSize:11,color:MUT,marginBottom:6}}>{t.description?.substring(0,80)}...</div>
             <div style={{fontSize:10,color:MUT}}>Created {new Date(t.created_at).toLocaleDateString('en-IN')} • {(t.messages||[]).length} messages</div>
           </div>
           <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:8}}>
             <span style={{fontSize:10,background:statusBg[t.status],color:statusColor[t.status],padding:'2px 8px',borderRadius:12,fontWeight:600,textTransform:'uppercase'}}>{t.status}</span>
             <span style={{fontSize:10,color:MUT,fontWeight:600}}>{t.priority}</span>
           </div>
         </div>)}
       </div>}
    </div>}

    {view==='create'&&<div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div style={{fontSize:18,fontWeight:700,color:TXT}}>Create Support Ticket</div>
        <button onClick={()=>setView('list')} style={{background:'none',border:'none',cursor:'pointer',color:MUT,fontSize:20}}>×</button>
      </div>

      <div style={{background:'#fff',border:'0.5px solid '+BORD,borderRadius:10,padding:16}}>
        <div style={{marginBottom:12}}>
          <label style={{display:'block',fontSize:11,fontWeight:600,color:MUT,marginBottom:4,textTransform:'uppercase'}}>Title *</label>
          <input value={formData.title} onChange={e=>setFormData({...formData,title:e.target.value})} placeholder='e.g. Billing issue, Feature request...' style={{width:'100%',padding:'8px 12px',border:'0.5px solid '+BORD,borderRadius:7,fontSize:13,outline:'none',boxSizing:'border-box'}}/>
        </div>

        <div style={{marginBottom:12}}>
          <label style={{display:'block',fontSize:11,fontWeight:600,color:MUT,marginBottom:4,textTransform:'uppercase'}}>Category *</label>
          <select value={formData.category} onChange={e=>setFormData({...formData,category:e.target.value})} style={{width:'100%',padding:'8px 12px',border:'0.5px solid '+BORD,borderRadius:7,fontSize:13,outline:'none'}}>
            <option value='technical'>Technical Issue</option>
            <option value='billing'>Billing</option>
            <option value='feature_request'>Feature Request</option>
            <option value='migration'>Data Migration</option>
            <option value='other'>Other</option>
          </select>
        </div>

        <div style={{marginBottom:12}}>
          <label style={{display:'block',fontSize:11,fontWeight:600,color:MUT,marginBottom:4,textTransform:'uppercase'}}>Description *</label>
          <textarea value={formData.description} onChange={e=>setFormData({...formData,description:e.target.value})} placeholder='Describe your issue or request in detail...' style={{width:'100%',padding:'10px 12px',border:'0.5px solid '+BORD,borderRadius:7,fontSize:13,outline:'none',boxSizing:'border-box',minHeight:120,fontFamily:'inherit',resize:'vertical'}}/>
        </div>

        <div style={{marginBottom:16}}>
          <label style={{display:'block',fontSize:11,fontWeight:600,color:MUT,marginBottom:4,textTransform:'uppercase'}}>Priority</label>
          <select value={formData.priority} onChange={e=>setFormData({...formData,priority:e.target.value})} style={{width:'100%',padding:'8px 12px',border:'0.5px solid '+BORD,borderRadius:7,fontSize:13,outline:'none'}}>
            <option value='low'>Low</option>
            <option value='medium'>Medium</option>
            <option value='high'>High</option>
            <option value='urgent'>Urgent</option>
          </select>
        </div>

        {/* AI Suggestion Section */}
        {aiSuggestion&&<div style={{background:BLL,border:'0.5px solid '+BL,borderRadius:8,padding:12,marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:600,color:BL,marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
            🤖 Gemini AI Suggestion
          </div>
          <div style={{fontSize:11,color:TXT,marginBottom:8,lineHeight:1.6}}>
            <div style={{fontWeight:600,marginBottom:4}}>Assessment:</div>
            <div style={{marginBottom:8}}>{aiSuggestion.assessment}</div>
            <div style={{fontWeight:600,marginBottom:4}}>Suggestion:</div>
            <div style={{marginBottom:8}}>{aiSuggestion.suggestion}</div>
            <div style={{display:'flex',gap:6,fontSize:10}}>
              <span style={{background:BL,color:'#fff',padding:'2px 6px',borderRadius:4,fontWeight:600}}>Category: {aiSuggestion.recommendedCategory}</span>
              <span style={{background:AMB,color:'#fff',padding:'2px 6px',borderRadius:4,fontWeight:600}}>Priority: {aiSuggestion.recommendedPriority}</span>
            </div>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={applySuggestion} style={{flex:1,padding:'6px 10px',background:GR,color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontWeight:600,fontSize:11}}>✓ Apply Suggestion</button>
            <button onClick={()=>setAiSuggestion(null)} style={{flex:1,padding:'6px 10px',background:'#fff',color:TXT,border:'0.5px solid '+BORD,borderRadius:6,cursor:'pointer',fontWeight:600,fontSize:11}}>Dismiss</button>
          </div>
        </div>}

        <div style={{display:'flex',gap:8}}>
          <button onClick={getGeminiSuggestion} disabled={gettingSuggestion||!formData.title||!formData.description} style={{flex:1,padding:'10px 14px',background:gettingSuggestion||!formData.title||!formData.description?'#ccc':AMB,color:'#fff',border:'none',borderRadius:7,cursor:gettingSuggestion||!formData.title||!formData.description?'not-allowed':'pointer',fontWeight:600,fontSize:13}}>
            {gettingSuggestion?'Getting Suggestion...':'🤖 Get AI Suggestion'}
          </button>
          <button onClick={createTicket} disabled={creating} style={{flex:1,padding:'10px 14px',background:creating?'#ccc':BL,color:'#fff',border:'none',borderRadius:7,cursor:creating?'not-allowed':'pointer',fontWeight:600,fontSize:13}}>
            {creating?'Creating...':'Create Ticket'}
          </button>
          <button onClick={()=>{setView('list');setAiSuggestion(null);}} style={{flex:1,padding:'10px 14px',background:'#fff',color:TXT,border:'0.5px solid '+BORD,borderRadius:7,cursor:'pointer',fontWeight:600,fontSize:13}}>Cancel</button>
        </div>
      </div>
    </div>}

    {view==='detail'&&selectedTicket&&<div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div>
          <div style={{fontSize:18,fontWeight:700,color:TXT,marginBottom:4}}>{selectedTicket.title}</div>
          <div style={{fontSize:11,color:MUT}}>Ticket #{selectedTicket.id.substring(0,8).toUpperCase()} • Created {new Date(selectedTicket.created_at).toLocaleDateString('en-IN')}</div>
        </div>
        <button onClick={()=>setView('list')} style={{background:'none',border:'none',cursor:'pointer',color:MUT,fontSize:20}}>×</button>
      </div>

      <div style={{background:'#fff',border:'0.5px solid '+BORD,borderRadius:10,padding:16,marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:MUT,textTransform:'uppercase',marginBottom:4}}>Status</div>
            <span style={{fontSize:12,background:statusBg[selectedTicket.status],color:statusColor[selectedTicket.status],padding:'4px 10px',borderRadius:12,fontWeight:600,textTransform:'uppercase'}}>{selectedTicket.status}</span>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:MUT,textTransform:'uppercase',marginBottom:4}}>Priority</div>
            <span style={{fontSize:12,background:selectedTicket.priority==='high'||selectedTicket.priority==='urgent'?RDL:selectedTicket.priority==='low'?GRL:AMBL,color:selectedTicket.priority==='high'||selectedTicket.priority==='urgent'?RD:selectedTicket.priority==='low'?GR:AMB,padding:'4px 10px',borderRadius:12,fontWeight:600,textTransform:'uppercase'}}>{selectedTicket.priority}</span>
          </div>
        </div>

        <div style={{padding:'12px 0',borderTop:'0.5px solid '+BORD,borderBottom:'0.5px solid '+BORD,marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:600,color:MUT,textTransform:'uppercase',marginBottom:4}}>Description</div>
          <div style={{fontSize:13,color:TXT,lineHeight:1.6}}>{selectedTicket.description}</div>
        </div>

        <div style={{display:'flex',gap:12,fontSize:11,color:MUT}}>
          <div><strong>{(selectedTicket.messages||[]).length}</strong> messages</div>
          <div><strong>{new Date(selectedTicket.updated_at).toLocaleDateString('en-IN')}</strong> last updated</div>
        </div>
      </div>

      {/* Messages Thread */}
      <div style={{background:'#fff',border:'0.5px solid '+BORD,borderRadius:10,padding:16,marginBottom:16,maxHeight:400,overflowY:'auto'}}>
        <div style={{fontSize:12,fontWeight:600,color:MUT,marginBottom:12,textTransform:'uppercase'}}>Conversation</div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {(selectedTicket.messages||[]).map((msg,i)=><div key={i} style={{padding:'10px 12px',borderRadius:8,background:msg.is_internal?'#f8f8f8':msg.isSupport?BLL:BG,borderLeft:'3px solid '+(msg.is_internal?MUT:msg.isSupport?BL:GR)}}>
            <div style={{fontSize:10,fontWeight:600,color:msg.is_internal?MUT:msg.isSupport?BL:GR,marginBottom:4}}>
              {msg.is_internal?'[Internal Note]':msg.isSupport?'👥 Support Team':'👤 You'}
            </div>
            <div style={{fontSize:12,color:TXT,lineHeight:1.5}}>{msg.message}</div>
            <div style={{fontSize:9,color:MUT,marginTop:4}}>{new Date(msg.created_at).toLocaleString('en-IN')}</div>
          </div>)}
        </div>
      </div>

      {(selectedTicket.status||'').toLowerCase()!=='closed'&&<div style={{background:'#fff',border:'0.5px solid '+BORD,borderRadius:10,padding:16}}>
        <div style={{fontSize:12,fontWeight:600,color:MUT,marginBottom:10,textTransform:'uppercase'}}>Add Reply</div>
        <textarea value={replyText} onChange={e=>setReplyText(e.target.value)} placeholder='Type your reply...' style={{width:'100%',padding:'10px 12px',border:'0.5px solid '+BORD,borderRadius:7,fontSize:13,outline:'none',boxSizing:'border-box',minHeight:80,fontFamily:'inherit',marginBottom:10,resize:'vertical'}}/>
        <div style={{display:'flex',gap:8}}>
          <button onClick={sendReply} disabled={replying||!replyText.trim()} style={{flex:1,padding:'9px 14px',background:replying||!replyText.trim()?'#ccc':BL,color:'#fff',border:'none',borderRadius:7,cursor:replying||!replyText.trim()?'not-allowed':'pointer',fontWeight:600,fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
            {replying?<><Loader size={14}/>Sending...</>:<><Send size={14}/>Send Reply</>}
          </button>
          <button onClick={()=>setView('list')} style={{padding:'9px 14px',background:'#fff',color:TXT,border:'0.5px solid '+BORD,borderRadius:7,cursor:'pointer',fontWeight:600,fontSize:12}}>Back</button>
        </div>
      </div>}
    </div>}
  </div>;
}
