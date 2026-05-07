import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

async function ctx(req) {
  const token = (req.headers.get('authorization')||'').replace('Bearer ','').trim();
  if (!token) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await sb.auth.getUser();
  return user ? { user, sb, firmId: req.headers.get('x-firm-id') } : null;
}

const shape = r => ({
  id: r.id, type: r.type, billId: r.bill_id, customerId: r.customer_id,
  customerName: r.customer_name||'', supplierName: r.supplier_name||'',
  date: r.date, reason: r.reason||'', total: +r.total, createdAt: r.created_at,
  items: (r.return_items||[]).map(i => ({
    id: i.id, sku: i.product_sku, name: i.name, size: i.size||'',
    qty: i.qty, rate: +i.rate, total: +i.total,
  })),
});

export async function GET(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!c.firmId) return NextResponse.json([]);
  const { data, error } = await c.sb.from('returns').select('*,return_items(*)').eq('firm_id', c.firmId).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data.map(shape));
}

export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const total = b.items.reduce((s,i)=>s+(i.qty*i.rate),0);
  const { data: ret, error: rErr } = await c.sb.from('returns').insert([{
    type: b.type, bill_id: b.billId||null, customer_id: b.customerId||null,
    customer_name: b.customerName||'', supplier_name: b.supplierName||'',
    date: b.date, reason: b.reason||'', total, firm_id: c.firmId||null,
  }]).select().single();
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
  const items = b.items.map(i => ({
    return_id: ret.id, product_sku: i.sku||null, name: i.name,
    size: i.size||'', qty: i.qty, rate: i.rate, total: i.qty*i.rate,
  }));
  const { error: iErr } = await c.sb.from('return_items').insert(items);
  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
  for (const i of b.items) {
    if (!i.sku) continue;
    if (b.type === 'customer') await c.sb.rpc('increment_stock', { p_sku: i.sku, p_qty: i.qty });
    else await c.sb.rpc('decrement_stock', { p_sku: i.sku, p_qty: i.qty });
  }
  const { data: full } = await c.sb.from('returns').select('*,return_items(*)').eq('id', ret.id).single();
  return NextResponse.json(shape(full), { status: 201 });
}