import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

async function ctx(req) {
  const token = (req.headers.get('authorization')||'').replace('Bearer ','').trim();
  if (!token) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await sb.auth.getUser();
  return user ? { user, sb, firmId: req.headers.get('x-firm-id') } : null;
}

const shape = c => ({
  id: c.id, name: c.name, phone: c.phone, shopname: c.shopname||'',
  gst: c.gst||'', addr: c.addr||'', email: c.email||'',
  openingBalance: +c.opening_balance||0, openingBalanceDate: c.opening_balance_date||'',
});

export async function GET(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!c.firmId) return NextResponse.json([]);
  const { data, error } = await c.sb.from('customers').select('*').eq('firm_id', c.firmId).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data.map(shape));
}

export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const { data, error } = await c.sb.from('customers').insert([{
    name: b.name, phone: b.phone, shopname: b.shopname||'', gst: b.gst||'',
    addr: b.addr||'', email: b.email||'', opening_balance: +b.openingBalance||0,
    opening_balance_date: b.openingBalanceDate||null, firm_id: c.firmId||null,
  }]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(shape(data), { status: 201 });
}

export async function PATCH(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const { id, openingBalance, openingBalanceDate, ...rest } = b;

  // Verify customer belongs to this firm
  const { data: customer } = await c.sb.from('customers').select('firm_id').eq('id', id).single();
  if (!customer || customer.firm_id !== c.firmId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const u = {};
  if (rest.name     !== undefined) u.name     = rest.name;
  if (rest.phone    !== undefined) u.phone    = rest.phone;
  if (rest.shopname !== undefined) u.shopname = rest.shopname||'';
  if (rest.gst      !== undefined) u.gst      = rest.gst||'';
  if (rest.addr     !== undefined) u.addr     = rest.addr||'';
  if (rest.email    !== undefined) u.email    = rest.email||'';
  if (openingBalance     !== undefined) u.opening_balance      = +openingBalance;
  if (openingBalanceDate !== undefined) u.opening_balance_date = openingBalanceDate||null;
  const { data, error } = await c.sb.from('customers').update(u).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(shape(data));
}

export async function DELETE(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');

  // Verify customer belongs to this firm before deleting
  const { data: customer } = await c.sb.from('customers').select('firm_id').eq('id', id).single();
  if (!customer || customer.firm_id !== c.firmId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await c.sb.from('customers').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}