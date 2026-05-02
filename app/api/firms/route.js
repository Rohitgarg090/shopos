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

export async function GET(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: memberships } = await c.sb.from('firm_members')
    .select('firm_id, role, status, firms(id, name, owner_id, created_at)')
    .eq('user_id', c.user.id).eq('status', 'active');
  const firms = (memberships || []).map(m => ({
    id: m.firms.id, name: m.firms.name, ownerId: m.firms.owner_id,
    role: m.role, isOwner: m.firms.owner_id === c.user.id,
  }));
  return NextResponse.json(firms);
}

export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: 'Firm name required' }, { status: 400 });
  const { data: firm, error: fErr } = await c.sb.from('firms')
    .insert([{ name, owner_id: c.user.id }]).select().single();
  if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });
  await c.sb.from('firm_members')
    .insert([{ firm_id: firm.id, user_id: c.user.id, role: 'owner', status: 'active' }]);
  await c.sb.from('firm_settings')
    .insert([{ user_id: c.user.id, firm_id: firm.id, name }]);
  return NextResponse.json({ id: firm.id, name: firm.name, role: 'owner', isOwner: true }, { status: 201 });
}