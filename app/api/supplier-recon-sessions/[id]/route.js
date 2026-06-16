export const dynamic = 'force-dynamic';
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
  date: t.txn_date,
  invoiceNo: t.invoice_no,
  description: t.description,
  amount: +t.amount || 0,
  type: t.txn_type,
  status: t.match_status,
  score: t.match_score,
  matchedInvoiceId: t.matched_invoice_id,
  matchRef: t.match_ref,
  isReconciled: t.is_reconciled,
  notes: t.notes,
  sortOrder: t.sort_order
});

const sessionShape = s => ({
  id: s.id,
  supplierName: s.supplier_name,
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
  const { data: session, error: sessionErr } = await c.sb.from('supplier_recon_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (sessionErr || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.firm_id !== c.firmId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: txns, error: txnsErr } = await c.sb.from('supplier_recon_transactions')
    .select('*')
    .eq('session_id', id)
    .order('sort_order', { ascending: true });

  if (txnsErr) {
    return NextResponse.json({ error: txnsErr.message }, { status: 500 });
  }

  // Get locked invoice IDs
  const { data: locks } = await c.sb.from('supplier_recon_invoice_locks')
    .select('invoice_id')
    .eq('session_id', id);
  const lockedInvoiceIds = (locks || []).map(l => l.invoice_id);

  return NextResponse.json({
    session: sessionShape(session),
    transactions: (txns || []).map(txnShape),
    lockedInvoiceIds
  });
}

export async function PATCH(req, { params }) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const body = await req.json();
  const { txnId, matchStatus, matchedInvoiceId, notes, isReconciled } = body;

  // Verify session belongs to firm
  const { data: session } = await c.sb.from('supplier_recon_sessions')
    .select('firm_id')
    .eq('id', id)
    .single();

  if (!session || session.firm_id !== c.firmId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // If linking an invoice, claim it atomically
  if (matchedInvoiceId) {
    const { data: claimed } = await c.sb.rpc('claim_invoice_for_supplier_session', {
      p_session_id: id,
      p_invoice_id: matchedInvoiceId,
      p_txn_id: txnId
    });

    if (!claimed) {
      return NextResponse.json({ error: 'Invoice already matched in this session' }, { status: 409 });
    }
  }

  // Update transaction
  const updates = {};
  if (matchStatus !== undefined) updates.match_status = matchStatus;
  if (matchedInvoiceId !== undefined) updates.matched_invoice_id = matchedInvoiceId;
  if (notes !== undefined) updates.notes = notes;
  if (isReconciled !== undefined) {
    updates.is_reconciled = isReconciled;
    if (isReconciled) updates.reconciled_at = new Date().toISOString();
  }

  const { data: txn, error: updateErr } = await c.sb.from('supplier_recon_transactions')
    .update(updates)
    .eq('id', txnId)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Refresh session stats
  await c.sb.rpc('refresh_supplier_session_stats', { p_session_id: id });

  return NextResponse.json(txnShape(txn));
}
