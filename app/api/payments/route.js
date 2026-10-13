export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

async function ctx(req) {
  const token = (req.headers.get('authorization')||'').replace('Bearer ','').trim();
  if (!token) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await sb.auth.getUser();
  const firmId = req.headers.get('x-firm-id') || null;
  return user ? { user, sb, firmId } : null;
}

const shape = p => ({
  id: p.id, billId: p.bill_id, mode: p.mode, amount: +p.amount,
  date: p.date, partyName: p.party_name||'', city: p.city||'',
  remarks: p.remarks||'', upiApp: p.upi_app||'', upiRef: p.upi_ref||'',
  chequeNo: p.cheque_no||'', bank: p.bank||'', receivedDate: p.received_date||'',
  chequeDate: p.cheque_date||'', clearanceDate: p.clearance_date||'',
  areaName: p.area_name||'', chequeStatus: p.cheque_status||'',
  paymentType: p.payment_type||'customer', customerId: p.customer_id||null, supplierId: p.supplier_id||null,
  createdAt: p.created_at,
});

export async function GET(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get all payments for this firm (both customer and supplier)
  // For customer payments, verify billId is in firm's bills
  // For supplier payments, include if supplier_id exists
  const { data, error } = await c.sb.from('payments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!c.firmId) return NextResponse.json([]);

  // Get bill IDs for this firm
  const { data: firmBills } = await c.sb.from('bills').select('id').eq('firm_id', c.firmId);
  const billIds = (firmBills || []).map(b => b.id);
  const { data: firmCusts } = await c.sb.from('customers').select('id').eq('firm_id', c.firmId);
  const custIds = new Set((firmCusts || []).map(x => String(x.id)));

  // Only this firm's payments. Older rows saved without firm_id fall back to their bill/customer link.
  const filtered = (data || []).filter(p =>
    p.firm_id ? p.firm_id === c.firmId
      : (billIds.includes(p.bill_id) || (!p.bill_id && p.customer_id && custIds.has(String(p.customer_id))))
  );

  return NextResponse.json(filtered.map(shape));
}

export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const { data, error } = await c.sb.from('payments').insert([{
    firm_id: c.firmId||null,
    bill_id: b.billId||null, mode: b.mode, amount: +b.amount,
    date: b.date||null, party_name: b.partyName||'', city: b.city||'',
    remarks: b.remarks||'', upi_app: b.upiApp||'', upi_ref: b.upiRef||'',
    cheque_no: b.chequeNo||'', bank: b.bank||'', received_date: b.receivedDate||null,
    cheque_date: b.chequeDate||null, clearance_date: b.clearanceDate||null,
    area_name: b.areaName||'', cheque_status: b.chequeStatus||'',
    payment_type: b.paymentType||'customer', customer_id: b.customerId||null, supplier_id: b.supplierId||null,
  }]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(shape(data), { status: 201 });
}

// A payment belongs to the active firm if its firm_id matches, or (older rows without firm_id)
// if its bill or customer belongs to the firm.
async function ownsPayment(c, id) {
  const { data: p } = await c.sb.from('payments').select('firm_id, bill_id, customer_id').eq('id', id).maybeSingle();
  if (!p) return { status: 404, error: 'Payment not found' };
  if (p.firm_id) return p.firm_id === c.firmId ? { ok: true } : { status: 403, error: 'Forbidden' };
  if (p.bill_id) {
    const { data: bill } = await c.sb.from('bills').select('firm_id').eq('id', p.bill_id).maybeSingle();
    if (bill?.firm_id === c.firmId) return { ok: true };
  } else if (p.customer_id) {
    const { data: cust } = await c.sb.from('customers').select('firm_id').eq('id', p.customer_id).maybeSingle();
    if (cust?.firm_id === c.firmId) return { ok: true };
  }
  return { status: 403, error: 'Forbidden' };
}

export async function PATCH(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, chequeStatus } = await req.json();
  const own = await ownsPayment(c, id);
  if (!own.ok) return NextResponse.json({ error: own.error }, { status: own.status });

  const { data, error } = await c.sb.from('payments')
    .update({ cheque_status: chequeStatus }).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(shape(data));
}

export async function DELETE(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  const own = await ownsPayment(c, id);
  if (!own.ok) return NextResponse.json({ error: own.error }, { status: own.status });

  const { error } = await c.sb.from('payments').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
