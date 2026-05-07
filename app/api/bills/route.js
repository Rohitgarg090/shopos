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

const shape = b => ({
  id: b.id, invoiceNo: b.invoice_no, date: b.created_at,
  customerId: b.customer_id, customerName: b.customer_name,
  customerPhone: b.customer_phone, customerGST: b.customer_gst,
  customerEmail: b.customer_email||'', customerAddr: b.customer_addr||'',
  isRelative: b.is_relative, subtotal: +b.subtotal, discount: +b.discount||0,
  gst: +b.gst_total, markup: +b.markup||0, total: +b.total,
  biltyNo: b.bilty_no||'', transportName: b.transport_name||'',
  lrNumber: b.lr_number||'', ewbNo: b.ewb_no||'', ewbValidUpto: b.ewb_valid_upto||'',
});

export async function GET(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!c.firmId) return NextResponse.json([]);
  const { data: bills, error } = await c.sb.from('bills').select('*, bill_items(*)').eq('firm_id', c.firmId).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(bills.map(b => ({
    ...shape(b),
    items: (b.bill_items||[]).map(i => ({
      name: i.name, sku: i.product_sku, cat: i.cat, size: i.size,
      color: i.color||'', articleNo: i.article_no||'', hsn: i.hsn||'',
      qty: i.qty, rate: +i.rate, gstRate: i.gst_rate, gstAmt: +i.gst_amt, total: +i.total,
    })),
  })));
}

export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const { data: bill, error: bErr } = await c.sb.from('bills').insert([{
    invoice_no: b.invoiceNo, customer_id: b.customerId||null,
    customer_name: b.customerName, customer_phone: b.customerPhone||'',
    customer_gst: b.customerGST||'', customer_email: b.customerEmail||'',
    customer_addr: b.customerAddr||'', is_relative: b.isRelative||false,
    subtotal: b.subtotal, discount: b.discount||0, gst_total: b.gst,
    markup: b.markup||0, total: b.total,
    transport_name: b.transportName||'', lr_number: b.lrNumber||'',
    firm_id: c.firmId||null,
  }]).select().single();
  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });
  const items = b.items.map(i => ({
    bill_id: bill.id, product_sku: i.sku, name: i.name, cat: i.cat,
    size: i.size, color: i.color||'', article_no: i.articleNo||'',
    hsn: i.hsn||'', qty: i.qty, rate: i.rate, gst_rate: i.gstRate,
    gst_amt: i.gstAmt, total: i.total,
  }));
  const { error: iErr } = await c.sb.from('bill_items').insert(items);
  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
  for (const i of b.items) {
    if (!i.sku) continue;
    await c.sb.rpc('decrement_stock', { p_sku: i.sku, p_qty: i.qty });
  }
  return NextResponse.json({ id: bill.id }, { status: 201 });
}

export async function PATCH(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { id, biltyNo, transportName, lrNumber, ewbNo, ewbValidUpto } = body;

  // Verify bill belongs to this firm
  const { data: bill } = await c.sb.from('bills').select('firm_id').eq('id', id).single();
  if (!bill || bill.firm_id !== c.firmId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const updates = {};
  if (biltyNo       !== undefined) updates.bilty_no        = biltyNo;
  if (transportName !== undefined) updates.transport_name  = transportName;
  if (lrNumber      !== undefined) updates.lr_number       = lrNumber;
  if (ewbNo         !== undefined) updates.ewb_no          = ewbNo;
  if (ewbValidUpto  !== undefined) updates.ewb_valid_upto  = ewbValidUpto;
  const { data, error } = await c.sb.from('bills').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    biltyNo: data.bilty_no||'', transportName: data.transport_name||'',
    lrNumber: data.lr_number||'', ewbNo: data.ewb_no||'', ewbValidUpto: data.ewb_valid_upto||'',
  });
}