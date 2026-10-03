export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { blockIfNoSeat } from '@/lib/plan';

async function ctx(req) {
  const token = (req.headers.get('authorization')||'').replace('Bearer ','').trim();
  if (!token) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await sb.auth.getUser();
  return user ? { user, sb } : null;
}

// Admin client — needed for sending invite emails
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function GET(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const firmId = new URL(req.url).searchParams.get('firmId');
  const { data, error } = await c.sb.from('firm_members')
    .select('id, role, status, invited_email, created_at, user_id')
    .eq('firm_id', firmId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

async function findUserIdByEmail(admin, email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = (data?.users || []).find(u => (u.email || '').toLowerCase() === email);
    if (hit) return hit.id;
    if (!data?.users || data.users.length < 1000) return null;
  }
  return null;
}

export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { firmId, email: rawEmail, role } = await req.json();
  const email = (rawEmail || '').toLowerCase().trim();
  if (!firmId || !email || !role)
    return NextResponse.json({ error: 'firmId, email and role required' }, { status: 400 });
  if (!['manager', 'accountant', 'staff'].includes(role))
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  if (email === (c.user.email || '').toLowerCase())
    return NextResponse.json({ error: 'You are already in this firm' }, { status: 400 });

  // Check inviter has owner/manager role
  const { data: firm } = await c.sb.from('firms').select('name, owner_id').eq('id', firmId).single();
  const { data: myRole } = await c.sb.from('firm_members')
    .select('role').eq('firm_id', firmId).eq('user_id', c.user.id).maybeSingle();
  const isOwner = firm?.owner_id === c.user.id;
  if (!isOwner && !(myRole && ['owner', 'manager'].includes(myRole.role)))
    return NextResponse.json({ error: 'Not authorized to invite' }, { status: 403 });

  const admin = adminClient();
  let inviteeId;
  try { inviteeId = await findUserIdByEmail(admin, email); }
  catch (e) { return NextResponse.json({ error: 'Could not look up user: ' + e.message }, { status: 500 }); }
  if (inviteeId && inviteeId === firm?.owner_id)
    return NextResponse.json({ error: 'That person owns this firm' }, { status: 400 });

  // Plan user limit — checked before any invite email is sent
  const blocked = await blockIfNoSeat(firmId, inviteeId || '__new_user__');
  if (blocked) return blocked;

  const firmName = firm?.name || 'a firm';
  let emailed = false;
  if (!inviteeId) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const { data: inv, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=/`,
      data: { invited_to_firm: firmId, invited_to_firm_name: firmName, invited_role: role, invited_by: c.user.email },
    });
    if (invErr || !inv?.user?.id) return NextResponse.json({ error: 'Invite email failed: ' + (invErr?.message || 'unknown error') }, { status: 500 });
    inviteeId = inv.user.id;
    emailed = true;
  }

  const { error: mErr } = await admin.from('firm_members').upsert([{
    firm_id: firmId, user_id: inviteeId, invited_email: email, role, status: 'active',
  }], { onConflict: 'firm_id,user_id' });
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    message: emailed
      ? `Invite sent to ${email}. They get access to ${firmName} after setting their password.`
      : `${email} added to ${firmName}. They will see it next time they log in.`,
  });
}

export async function PATCH(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { memberId, role, status } = await req.json();

  // Verify member exists and get firmId
  const { data: member } = await c.sb.from('firm_members').select('firm_id').eq('id', memberId).single();
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  // Verify current user has manager/owner role in this firm
  const { data: myRole } = await c.sb.from('firm_members')
    .select('role').eq('firm_id', member.firm_id).eq('user_id', c.user.id).single();
  if (!myRole || !['owner','manager'].includes(myRole.role))
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  if (status === 'active') {
    const { data: m } = await c.sb.from('firm_members').select('user_id,status').eq('id', memberId).single();
    if (m && m.status !== 'active') {
      const blocked = await blockIfNoSeat(member.firm_id, m.user_id);
      if (blocked) return blocked;
    }
  }
  const updates = {};
  if (role) updates.role = role;
  if (status) updates.status = status;
  const { data, error } = await c.sb.from('firm_members')
    .update(updates).eq('id', memberId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');

  // Verify member exists and get firmId
  const { data: member } = await c.sb.from('firm_members').select('firm_id').eq('id', id).single();
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  // Verify current user has manager/owner role in this firm
  const { data: myRole } = await c.sb.from('firm_members')
    .select('role').eq('firm_id', member.firm_id).eq('user_id', c.user.id).single();
  if (!myRole || !['owner','manager'].includes(myRole.role))
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const { error } = await c.sb.from('firm_members').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}