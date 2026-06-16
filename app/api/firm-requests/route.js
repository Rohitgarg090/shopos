export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function ctx(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user } } = await sb.auth.getUser();
  return user ? { user, sb } : null;
}

// GET /api/firm-requests?firmId=... — list requests for a firm (owner/manager only)
export async function GET(req) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const firmId = new URL(req.url).searchParams.get('firmId');
    if (!firmId) return NextResponse.json({ error: 'firmId required' }, { status: 400 });

    // Verify caller is owner/manager of this firm
    const { data: membership } = await adminClient
      .from('firm_members')
      .select('role')
      .eq('firm_id', firmId)
      .eq('user_id', c.user.id)
      .eq('status', 'active')
      .single();

    if (!membership || !['owner', 'manager'].includes(membership.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const statusFilter = new URL(req.url).searchParams.get('status') || 'pending';

    const { data: requests, error } = await adminClient
      .from('firm_join_requests')
      .select('id, user_id, email, name, status, role, requested_at, reviewed_at, notes')
      .eq('firm_id', firmId)
      .eq('status', statusFilter)
      .order('requested_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(requests || []);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
