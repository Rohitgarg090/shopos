export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firmAccess';

async function ctx(req) {
  const token = (req.headers.get('authorization')||'').replace('Bearer ','').trim();
  if (!token) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await sb.auth.getUser();
  return user ? { user, sb, firmId: req.headers.get('x-firm-id') } : null;
}

export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!c.firmId) return NextResponse.json({ error: 'Firm ID required' }, { status: 400 });

  try {
    // Preview only — the real number is assigned atomically by create_bill() when the bill is saved
    const { data: fs } = await adminDb().from('firm_settings').select('invoice_prefix').eq('firm_id', c.firmId)
      .order('updated_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
    const prefix = String(fs?.invoice_prefix || 'INV').toUpperCase().replace(/[^A-Z0-9/]/g, '').slice(0, 12) || 'INV';
    let invoiceNo;
    const { data: rpcNo, error: rpcErr } = await c.sb.rpc('next_invoice_no', { p_firm_id: c.firmId, p_prefix: prefix });
    if (!rpcErr && rpcNo) invoiceNo = rpcNo;
    else {
      const { data: bills } = await c.sb.from('bills').select('invoice_no').eq('firm_id', c.firmId);
      const max = (bills || []).filter(b => (b.invoice_no || '').startsWith(prefix + '-'))
        .reduce((m, b) => Math.max(m, +((b.invoice_no.match(/(\d+)$/) || [])[1] || 0)), 0);
      invoiceNo = prefix + '-' + String(max + 1).padStart(3, '0');
    }
    return NextResponse.json({ invoiceNo });
  } catch (error) {
    console.error('[next-invoice] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate invoice number' },
      { status: 500 }
    );
  }
}
