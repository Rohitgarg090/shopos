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
  createdAt: p.created_at,
});

export async function GET(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get bill IDs for this firm first
  let billIds = [];
  if (c.firmId) {
    const { data: firmBills } = await c.sb.from('bills').select('id').eq('firm_id', c.firmId);
    billIds = (firmBills || []).map(b => b.id);
  }

  // If we have bill IDs, filter payments by them; otherwise return empty
  if (billIds.length === 0) {
    return NextResponse.json([]);
  }

  const { data, error } = await c.sb.from('payments')
    .select('*')
    .in('bill_id', billIds)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data || []).map(shape));
}

export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const { data, error } = await c.sb.from('payments').insert([{
    bill_id: b.billId||null, mode: b.mode, amount: +b.amount,
    date: b.date||null, party_name: b.partyName||'', city: b.city||'',
    remarks: b.remarks||'', upi_app: b.upiApp||'', upi_ref: b.upiRef||'',
    cheque_no: b.chequeNo||'', bank: b.bank||'', received_date: b.receivedDate||null,
    cheque_date: b.chequeDate||null, clearance_date: b.clearanceDate||null,
    area_name: b.areaName||'', cheque_status: b.chequeStatus||'',
  }]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(shape(data), { status: 201 });
}

export async function PATCH(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, chequeStatus } = await req.json();

  // Verify payment belongs to a bill in this firm
  const { data: payment } = await c.sb.from('payments').select('bill_id').eq('id', id).single();
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

  const { data: bill } = await c.sb.from('bills').select('firm_id').eq('id', payment.bill_id).single();
  if (!bill || bill.firm_id !== c.firmId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await c.sb.from('payments')
    .update({ cheque_status: chequeStatus }).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(shape(data));
}