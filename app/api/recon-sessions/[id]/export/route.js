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

export async function GET(req, { params }) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!c.firmId) return NextResponse.json({ error: 'No firm' }, { status: 400 });

  const { id: sessionId } = params;

  const { data: session } = await c.sb
    .from('recon_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('firm_id', c.firmId)
    .single();

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const { data: transactions } = await c.sb
    .from('recon_transactions')
    .select('*')
    .eq('session_id', sessionId)
    .order('txn_date', { ascending: false });

  if (!transactions || transactions.length === 0) {
    return new NextResponse('Date,Description,Amount,Type,Entry,Match Status,Suspense\n', {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="BankRecon_${session.label}.csv"`,
      },
    });
  }

  const csvHeader = ['Date', 'Description', 'Amount', 'Type', 'Entry', 'Match Status', 'Suspense'];
  const csvRows = transactions.map(t => [
    new Date(t.txn_date).toLocaleDateString('en-IN'),
    `"${(t.description || '').replace(/"/g, '""')}"`,
    t.amount,
    t.txn_type,
    `"${(t.customer_id || '').replace(/"/g, '""')}"`,
    t.match_status,
    t.is_suspense ? 'Yes' : 'No',
  ]);

  const csv = [
    csvHeader.join(','),
    ...csvRows.map(row => row.join(',')),
  ].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv;charset=utf-8',
      'Content-Disposition': `attachment; filename="BankRecon_${session.label}.csv"`,
    },
  });
}
