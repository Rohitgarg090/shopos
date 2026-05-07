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

function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req, { params }) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: sessionId } = params;

  // Verify session
  const { data: session } = await c.sb.from('supplier_recon_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (!session || session.firm_id !== c.firmId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get transactions
  const { data: txns } = await c.sb.from('supplier_recon_transactions')
    .select('*')
    .eq('session_id', sessionId)
    .order('sort_order', { ascending: true });

  // Build CSV
  const headers = ['Date', 'Invoice No', 'Description', 'Amount', 'Type', 'Status', 'Score', 'Matched Invoice', 'Notes'];
  const rows = [headers.map(h => escapeCSV(h)).join(',')];

  if (txns) {
    for (const t of txns) {
      const row = [
        escapeCSV(t.txn_date),
        escapeCSV(t.invoice_no),
        escapeCSV(t.description),
        escapeCSV(t.amount.toString()),
        escapeCSV(t.txn_type),
        escapeCSV(t.match_status),
        escapeCSV(t.match_score.toString()),
        escapeCSV(t.match_ref),
        escapeCSV(t.notes)
      ];
      rows.push(row.join(','));
    }
  }

  const csv = rows.join('\n');
  const filename = `SupplierRecon_${session.supplier_name}_${new Date().toISOString().split('T')[0]}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
}
