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

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminSb = serviceKey
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey)
    : c.sb;

  // Step 1: Get active memberships for this user
  const { data: memberships, error: mErr } = await c.sb
    .from('firm_members')
    .select('firm_id, role, status')
    .eq('user_id', c.user.id)
    .eq('status', 'active');

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  // Step 2: Also find firms where this user is the owner (catches firms with missing membership rows)
  const { data: ownedFirms } = await adminSb
    .from('firms')
    .select('id, name, owner_id')
    .eq('owner_id', c.user.id);

  // Step 3: For owned firms missing a firm_members entry, create one now
  const memberFirmIds = new Set((memberships || []).map(m => m.firm_id));
  for (const f of (ownedFirms || [])) {
    if (!memberFirmIds.has(f.id)) {
      await adminSb.from('firm_members').upsert(
        { firm_id: f.id, user_id: c.user.id, role: 'owner', status: 'active' },
        { onConflict: 'firm_id,user_id' }
      );
      memberFirmIds.add(f.id);
    }
  }

  const allFirmIds = Array.from(memberFirmIds);
  if (allFirmIds.length === 0) return NextResponse.json([]);

  // Step 4: Fetch details for all firms
  const { data: firmsData, error: fErr } = await adminSb
    .from('firms')
    .select('id, name, owner_id')
    .in('id', allFirmIds);

  if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });

  const membershipMap = new Map((memberships || []).map(m => [m.firm_id, m]));

  const firms = (firmsData || []).map(f => ({
    id: f.id,
    name: f.name,
    ownerId: f.owner_id,
    role: f.owner_id === c.user.id ? 'owner' : (membershipMap.get(f.id)?.role || 'staff'),
    isOwner: f.owner_id === c.user.id,
  }));

  return NextResponse.json(firms);
}

export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: 'Firm name required' }, { status: 400 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminSb = serviceKey
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey)
    : c.sb;

  const { data: firm, error: fErr } = await adminSb
    .from('firms').insert([{ name, owner_id: c.user.id }]).select().single();
  if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });

  await adminSb.from('firm_members')
    .insert([{ firm_id: firm.id, user_id: c.user.id, role: 'owner', status: 'active' }]);
  await adminSb.from('firm_settings')
    .insert([{ user_id: c.user.id, firm_id: firm.id, name }]);

  return NextResponse.json({ id: firm.id, name: firm.name, role: 'owner', isOwner: true }, { status: 201 });
}