import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
const shape=r=>({id:r.id,type:r.type,billId:r.bill_id,customerId:r.customer_id,customerName:r.customer_name||'',supplierName:r.supplier_name||'',date:r.date,reason:r.reason||'',total:+r.total,createdAt:r.created_at,items:(r.return_items||[]).map(i=>({id:i.id,sku:i.product_sku,name:i.name,size:i.size||'',qty:i.qty,rate:+i.rate,total:+i.total}))});
export async function GET(){const{data,error}=await supabase.from('returns').select('*,return_items(*)').order('created_at',{ascending:false});if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json(data.map(shape));}
export async function POST(req){
  const b=await req.json();
  const total=b.items.reduce((s,i)=>s+(i.qty*i.rate),0);
  const{data:ret,error:rErr}=await supabase.from('returns').insert([{type:b.type,bill_id:b.billId||null,customer_id:b.customerId||null,customer_name:b.customerName||'',supplier_name:b.supplierName||'',date:b.date,reason:b.reason||'',total}]).select().single();
  if(rErr)return NextResponse.json({error:rErr.message},{status:500});
  const items=b.items.map(i=>({return_id:ret.id,product_sku:i.sku||null,name:i.name,size:i.size||'',qty:i.qty,rate:i.rate,total:i.qty*i.rate}));
  const{error:iErr}=await supabase.from('return_items').insert(items);
  if(iErr)return NextResponse.json({error:iErr.message},{status:500});
  // Adjust stock: customer return = increment (goods come back), supplier return = decrement (goods go out)
  for(const i of b.items){
    if(!i.sku)continue;
    if(b.type==='customer'){await supabase.rpc('increment_stock',{p_sku:i.sku,p_qty:i.qty});}
    else{await supabase.rpc('decrement_stock',{p_sku:i.sku,p_qty:i.qty});}
  }
  const{data:full}=await supabase.from('returns').select('*,return_items(*)').eq('id',ret.id).single();
  return NextResponse.json(shape(full),{status:201});
}