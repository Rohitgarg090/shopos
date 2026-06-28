export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function ctx(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await sb.auth.getUser();
  return user ? { user, sb, firmId: req.headers.get('x-firm-id') } : null;
}

export async function GET(req) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!c.firmId) return NextResponse.json({ error: 'No firm context' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const billId = searchParams.get('bill_id');
    const status = searchParams.get('status');

    // Build query
    let query = c.sb
      .from('e_invoices')
      .select('*')
      .eq('firm_id', c.firmId)
      .order('created_at', { ascending: false });

    if (billId) {
      query = query.eq('bill_id', billId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: eInvoices, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      eInvoices: eInvoices || [],
      count: eInvoices?.length || 0,
    });
  } catch (error) {
    console.error('[einvoice-list] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
