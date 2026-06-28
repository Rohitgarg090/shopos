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
  return user ? { user, sb } : null;
}

export async function GET(req) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const firmId = searchParams.get('firm_id');
    const monthYear = searchParams.get('month_year');
    const status = searchParams.get('status');

    if (!firmId || !monthYear) {
      return NextResponse.json({ error: 'firm_id and month_year required' }, { status: 400 });
    }

    // Verify CA has access
    const { data: caData } = await supabase
      .from('ca_partners')
      .select('id')
      .eq('user_id', c.user.id)
      .single();

    if (!caData) return NextResponse.json({ error: 'CA profile not found' }, { status: 404 });

    const { data: hasAccess } = await supabase
      .from('ca_client_links')
      .select('id')
      .eq('ca_id', caData.id)
      .eq('firm_id', firmId)
      .eq('status', 'accepted')
      .single();

    if (!hasAccess) return NextResponse.json({ error: 'No access to this firm' }, { status: 403 });

    // Get reconciliation data
    let query = supabase
      .from('gstr2b_reconciliation')
      .select('*')
      .eq('firm_id', firmId)
      .eq('month_year', monthYear)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: reconciliationData, error } = await query;

    if (error) throw error;

    // Calculate summary
    const allData = await supabase
      .from('gstr2b_reconciliation')
      .select('status')
      .eq('firm_id', firmId)
      .eq('month_year', monthYear);

    const summary = {
      total: allData.data?.length || 0,
      matched: allData.data?.filter(r => r.status === 'matched').length || 0,
      mismatch: allData.data?.filter(r => r.status === 'mismatch').length || 0,
      notInGstr2b: allData.data?.filter(r => r.status === 'not_in_gstr2b').length || 0,
      extra: allData.data?.filter(r => r.status === 'extra_in_gstr2b').length || 0,
    };

    return NextResponse.json({
      records: reconciliationData || [],
      summary,
    });
  } catch (error) {
    console.error('[ca/gstr2b-results] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
