import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

async function ctx(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user } } = await sb.auth.getUser();
  return user ? { user, sb, firmId: req.headers.get('x-firm-id') } : null;
}

const shape = s => ({
  id: s.id,
  firmId: s.firm_id,
  bankStmtId: s.bank_stmt_id,
  label: s.label || '',
  periodFrom: s.period_from,
  periodTo: s.period_to,
  status: s.status,
  stats: s.stats || {},
  createdBy: s.created_by,
  createdAt: s.created_at,
  updatedAt: s.updated_at,
  lockedAt: s.locked_at,
  notes: s.notes || ''
});

export async function GET(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!c.firmId) return NextResponse.json([]);

  const { data, error } = await c.sb.from('recon_sessions')
    .select('*')
    .eq('firm_id', c.firmId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data || []).map(shape));
}

export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!c.firmId) return NextResponse.json({ error: 'No firm selected' }, { status: 400 });

  const b = await req.json();
  const { label, bankStmtId } = b;

  const { data, error } = await c.sb.from('recon_sessions')
    .insert([{
      firm_id: c.firmId,
      bank_stmt_id: bankStmtId || null,
      label: label || 'Bank Statement',
      status: 'draft',
      created_by: c.user.id
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(shape(data), { status: 201 });
}

export async function PATCH(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const b = await req.json();
  const { id, label, status, notes } = b;

  const { data: session } = await c.sb.from('recon_sessions')
    .select('firm_id')
    .eq('id', id)
    .single();

  if (!session || session.firm_id !== c.firmId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updates = {};
  if (label !== undefined) updates.label = label;
  if (status !== undefined) {
    updates.status = status;
    if (status === 'locked') updates.locked_at = new Date().toISOString();
  }
  if (notes !== undefined) updates.notes = notes;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await c.sb.from('recon_sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(shape(data));
}
