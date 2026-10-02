export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

async function ctx(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await sb.auth.getUser();
  return user ? { user, sb, firmId: req.headers.get('x-firm-id') } : null;
}

const shape = r => ({
  id: r.id,
  partyName: r.party_name,
  bank: r.bank,
  chequeNo: r.cheque_no,
  chequeDate: r.cheque_date,
  receivedDate: r.received_date,
  clearanceDate: r.clearance_date,
  amount: r.amount,
  status: r.status,
  remarks: r.remarks,
  customerId: r.customer_id,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export async function GET(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!c.firmId) return NextResponse.json([]);

  const { data, error } = await c.sb
    .from('cheque_records')
    .select('*')
    .eq('firm_id', c.firmId)
    .order('cheque_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data || []).map(shape));
}

export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { partyName, bank, chequeNo, chequeDate, receivedDate, amount, customerId, remarks } = body;

  if (!partyName || !amount) {
    return NextResponse.json({ error: 'Party name and amount are required' }, { status: 400 });
  }

  const { data, error } = await c.sb
    .from('cheque_records')
    .insert([{
      firm_id: c.firmId,
      party_name: partyName,
      bank,
      cheque_no: chequeNo,
      cheque_date: chequeDate,
      received_date: receivedDate,
      amount: parseFloat(amount),
      status: 'received',
      customer_id: customerId || null,
      remarks,
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(shape(data), { status: 201 });
}

export async function PATCH(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, status, clearanceDate, remarks } = body;

  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

  const updates = {};
  if (status !== undefined) updates.status = status;
  if (clearanceDate !== undefined) updates.clearance_date = clearanceDate;
  if (remarks !== undefined) updates.remarks = remarks;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await c.sb
    .from('cheque_records')
    .update(updates)
    .eq('id', id)
    .eq('firm_id', c.firmId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(shape(data));
}

export async function DELETE(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

  const { error } = await c.sb
    .from('cheque_records')
    .delete()
    .eq('id', id)
    .eq('firm_id', c.firmId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
