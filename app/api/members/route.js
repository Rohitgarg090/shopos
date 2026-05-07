import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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

export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { firmId, email, role } = await req.json();
  if (!firmId || !email || !role)
    return NextResponse.json({ error: 'firmId, email and role required' }, { status: 400 });

  // Check inviter has owner/manager role
  const { data: myRole } = await c.sb.from('firm_members')
    .select('role').eq('firm_id', firmId).eq('user_id', c.user.id).single();
  if (!myRole || !['owner','manager'].includes(myRole.role))
    return NextResponse.json({ error: 'Not authorized to invite' }, { status: 403 });

  // Insert pending invite record
  const { data: member, error: mErr } = await c.sb.from('firm_members')
    .upsert([{
      firm_id: firmId,
      invited_email: email.toLowerCase().trim(),
      role,
      status: 'invited',
      user_id: c.user.id, // temporary — will be updated when they accept
    }], { onConflict: 'firm_id,user_id' })
    .select().single();
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  // Get firm name for the invite email
  const { data: firm } = await c.sb.from('firms').select('name').eq('id', firmId).single();
  const firmName = firm?.name || 'a firm';

  // Send invite email using admin client
  try {
    const admin = adminClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app';
    const { error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=/`,
      data: {
        invited_to_firm: firmId,
        invited_to_firm_name: firmName,
        invited_role: role,
        invited_by: c.user.email,
      },
    });
    if (invErr) {
      // User might already exist — still save the member record
      console.error('Invite email error:', invErr.message);
      return NextResponse.json({
        success: true,
        warning: 'Member record created but email failed: ' + invErr.message +
          '. Ask them to log in and they will see the firm.',
      });
    }
  } catch (e) {
    return NextResponse.json({
      success: true,
      warning: 'Member saved but invite email failed. Check SUPABASE_SERVICE_ROLE_KEY env var.',
    });
  }

  return NextResponse.json({ success: true, message: 'Invite sent to ' + email });
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