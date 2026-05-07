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

const txnShape = t => ({
  id: t.id,
  sessionId: t.session_id,
  date: t.txn_date,
  description: t.description,
  ref: t.ref_no,
  amount: +t.amount || 0,
  type: t.txn_type,
  balance: +t.balance || 0,
  status: t.match_status,
  score: t.match_score,
  matchedPaymentId: t.matched_payment_id,
  matchedType: t.matched_type,
  matchRef: t.match_ref,
  isReconciled: t.is_reconciled,
  reconciledAt: t.reconciled_at,
  notes: t.notes,
  sortOrder: t.sort_order
});

const sessionShape = s => ({
  id: s.id,
  label: s.label,
  status: s.status,
  stats: s.stats || {},
  createdAt: s.created_at,
  updatedAt: s.updated_at,
  lockedAt: s.locked_at,
  notes: s.notes
});

export async function GET(req, { params }) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const { data: session, error: sessionErr } = await c.sb.from('recon_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (sessionErr || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.firm_id !== c.firmId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: txns, error: txnsErr } = await c.sb.from('recon_transactions')
    .select('*')
    .eq('session_id', id)
    .order('sort_order', { ascending: true });

  if (txnsErr) {
    return NextResponse.json({ error: txnsErr.message }, { status: 500 });
  }

  // Get locked payment IDs for this session
  const { data: locks } = await c.sb.from('recon_payment_locks')
    .select('payment_id')
    .eq('session_id', id);
  const lockedPaymentIds = (locks || []).map(l => l.payment_id);

  return NextResponse.json({
    session: sessionShape(session),
    transactions: (txns || []).map(txnShape),
    lockedPaymentIds
  });
}

export async function PATCH(req, { params }) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const body = await req.json();
  const { txnId, matchStatus, matchedPaymentId, notes, isReconciled } = body;

  // Verify session belongs to firm
  const { data: session } = await c.sb.from('recon_sessions')
    .select('firm_id')
    .eq('id', id)
    .single();

  if (!session || session.firm_id !== c.firmId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // If linking a payment, claim it atomically
  if (matchedPaymentId) {
    const { data: claimed } = await c.sb.rpc('claim_payment_for_session', {
      p_session_id: id,
      p_payment_id: matchedPaymentId,
      p_txn_id: txnId
    });

    if (!claimed) {
      return NextResponse.json({ error: 'Payment already matched in this session' }, { status: 409 });
    }
  }

  // Update transaction
  const updates = {};
  if (matchStatus !== undefined) updates.match_status = matchStatus;
  if (matchedPaymentId !== undefined) updates.matched_payment_id = matchedPaymentId;
  if (notes !== undefined) updates.notes = notes;
  if (isReconciled !== undefined) {
    updates.is_reconciled = isReconciled;
    if (isReconciled) updates.reconciled_at = new Date().toISOString();
  }

  const { data: txn, error: updateErr } = await c.sb.from('recon_transactions')
    .update(updates)
    .eq('id', txnId)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Refresh session stats
  await c.sb.rpc('refresh_session_stats', { p_session_id: id });

  return NextResponse.json(txnShape(txn));
}
