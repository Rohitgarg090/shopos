export const dynamic = 'force-dynamic';
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

// Get all reconciliation sessions for a firm
export async function GET(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!c.firmId) return NextResponse.json([]);

  const sessionId = new URL(req.url).searchParams.get('sessionId');

  if (sessionId) {
    // Get specific session with transactions
    const { data: session, error: sessionErr } = await c.sb
      .from('recon_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('firm_id', c.firmId)
      .single();

    if (sessionErr || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const { data: transactions, error: txnErr } = await c.sb
      .from('recon_transactions')
      .select('*,matched_payment:matched_payment_id(id,amount,mode,date)')
      .eq('session_id', sessionId)
      .order('txn_date', { ascending: false });

    if (txnErr) return NextResponse.json({ error: txnErr.message }, { status: 500 });

    return NextResponse.json({
      session,
      transactions: transactions || [],
    });
  } else {
    // Get all sessions
    const { data, error } = await c.sb
      .from('recon_sessions')
      .select('*')
      .eq('firm_id', c.firmId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  }
}

// Create a new reconciliation session
export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { label, bankStmtId, transactions } = await req.json();

  // Create session
  const { data: session, error: sessionErr } = await c.sb
    .from('recon_sessions')
    .insert([{
      firm_id: c.firmId,
      bank_stmt_id: bankStmtId,
      label: label || 'Bank Statement Reconciliation',
      status: 'draft',
      created_by: c.user.id,
    }])
    .select()
    .single();

  if (sessionErr) return NextResponse.json({ error: sessionErr.message }, { status: 500 });

  // Insert transactions
  if (transactions && transactions.length > 0) {
    const txnData = transactions.map((t, idx) => ({
      session_id: session.id,
      firm_id: c.firmId,
      txn_date: t.date,
      description: t.description,
      ref_no: t.ref || '',
      amount: t.amount,
      txn_type: t.type,
      balance: t.balance || 0,
      match_status: 'unmatched',
      sort_order: idx,
    }));

    const { error: txnErr } = await c.sb.from('recon_transactions').insert(txnData);
    if (txnErr) {
      // Delete session if transaction insert fails
      await c.sb.from('recon_sessions').delete().eq('id', session.id);
      return NextResponse.json({ error: txnErr.message }, { status: 500 });
    }
  }

  return NextResponse.json(session, { status: 201 });
}

// Update a transaction (link to customer, mark suspense, etc.)
export async function PATCH(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { txnId, customerId, isSuspense, suspenseReason, matchStatus } = await req.json();

  const updates = {};
  if (customerId !== undefined) {
    updates.customer_id = customerId;
    updates.manual_customer_match = true;
  }
  if (isSuspense !== undefined) {
    updates.is_suspense = isSuspense;
    updates.suspense_reason = suspenseReason || null;
  }
  if (matchStatus !== undefined) {
    updates.match_status = matchStatus;
  }

  const { error } = await c.sb
    .from('recon_transactions')
    .update(updates)
    .eq('id', txnId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
