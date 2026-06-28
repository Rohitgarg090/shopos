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

export async function GET(req, { params }) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { firmId } = params;

    // Verify CA has access to this firm
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

    if (!hasAccess) return NextResponse.json({ error: 'No access to this client' }, { status: 403 });

    // Get firm details
    const { data: firm, error } = await supabase
      .from('firms')
      .select('id, name')
      .eq('id', firmId)
      .single();

    if (error) {
      console.error('[ca/client/details] Firm query error:', error);
      throw error;
    }

    if (!firm) {
      return NextResponse.json({ error: 'Firm not found' }, { status: 404 });
    }

    return NextResponse.json({
      firmId: firm.id,
      firmName: firm.name,
    });
  } catch (error) {
    console.error('[ca/client/details] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
