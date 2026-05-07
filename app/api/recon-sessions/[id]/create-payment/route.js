import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

async function ctx(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user } } = await sb.auth.getUser();
  return user ? { user, sb, firmId: req.headers.get('x-firm-id') } : null;
}

const paymentShape = p => ({
  id: p.id,
  billId: p.bill_id,
  mode: p.mode,
  amount: +p.amount || 0,
  date: p.date,
  partyName: p.party_name,
  upiApp: p.upi_app,
  upiRef: p.upi_ref,
  chequeNo: p.cheque_no,
  bank: p.bank,
  receivedDate: p.received_date,
  chequeDate: p.cheque_date,
  areaName: p.area_name,
  remarks: p.remarks,
  createdAt: p.created_at
});

const txnShape = t => ({
  id: t.id,
  date: t.txn_date,
  description: t.description,
  ref: t.ref_no,
  amount: +t.amount || 0,
  type: t.txn_type,
  status: t.match_status,
  matchedPaymentId: t.matched_payment_id,
  notes: t.notes
});

export async function POST(req, { params }) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: sessionId } = params;
  const body = await req.json();
  const { txnId, billId, mode, notes } = body;

  // Verify session belongs to firm
  const { data: session } = await c.sb.from('recon_sessions')
    .select('firm_id')
    .eq('id', sessionId)
    .single();

  if (!session || session.firm_id !== c.firmId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get the transaction
  const { data: txn } = await c.sb.from('recon_transactions')
    .select('*')
    .eq('id', txnId)
    .single();

  if (!txn || txn.session_id !== sessionId) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  // Create payment
  const { data: payment, error: paymentErr } = await c.sb.from('payments')
    .insert([{
      bill_id: billId || null,
      mode: mode || 'Bank Transfer',
      amount: txn.amount,
      date: txn.txn_date,
      party_name: txn.description || 'Bank Reconciliation',
      upi_ref: txn.ref_no || null,
      remarks: notes || 'Created from bank reconciliation'
    }])
    .select()
    .single();

  if (paymentErr) {
    return NextResponse.json({ error: paymentErr.message }, { status: 500 });
  }

  // Update transaction to link to this payment
  const { data: updatedTxn, error: txnErr } = await c.sb.from('recon_transactions')
    .update({
      match_status: 'matched',
      matched_payment_id: payment.id,
      created_payment_id: payment.id,
      is_reconciled: true,
      reconciled_at: new Date().toISOString()
    })
    .eq('id', txnId)
    .select()
    .single();

  if (txnErr) {
    return NextResponse.json({ error: txnErr.message }, { status: 500 });
  }

  // Refresh stats
  await c.sb.rpc('refresh_session_stats', { p_session_id: sessionId });

  return NextResponse.json({
    payment: paymentShape(payment),
    transaction: txnShape(updatedTxn)
  }, { status: 201 });
}
