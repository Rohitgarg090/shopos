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
  return user ? { user } : null;
}

// PATCH /api/firm-requests/[id] — approve or reject a join request
export async function PATCH(req, { params }) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const { status, role = 'staff', notes } = await req.json();

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 });
    }

    // Fetch the join request
    const { data: joinReq, error: fetchError } = await adminClient
      .from('firm_join_requests')
      .select('id, firm_id, user_id, email, name, status')
      .eq('id', id)
      .single();

    if (fetchError || !joinReq) {
      return NextResponse.json({ error: 'Join request not found' }, { status: 404 });
    }

    if (joinReq.status !== 'pending') {
      return NextResponse.json({ error: 'Request has already been reviewed' }, { status: 400 });
    }

    // Verify caller is owner/manager of this firm
    const { data: membership } = await adminClient
      .from('firm_members')
      .select('role')
      .eq('firm_id', joinReq.firm_id)
      .eq('user_id', c.user.id)
      .eq('status', 'active')
      .single();

    if (!membership || !['owner', 'manager'].includes(membership.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update join request status
    const { error: updateError } = await adminClient
      .from('firm_join_requests')
      .update({
        status,
        role: status === 'approved' ? role : joinReq.role,
        reviewed_at: new Date().toISOString(),
        reviewed_by: c.user.id,
        notes: notes || null,
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // If approved, create/update firm_members entry
    if (status === 'approved') {
      const { error: memberError } = await adminClient
        .from('firm_members')
        .upsert({
          firm_id: joinReq.firm_id,
          user_id: joinReq.user_id,
          role,
          status: 'active',
        }, {
          onConflict: 'firm_id,user_id',
        });

      if (memberError) {
        console.error('[firm-requests/[id]] Failed to create firm member:', memberError);
        return NextResponse.json({ error: 'Failed to add member to firm' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('[firm-requests/[id]] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
