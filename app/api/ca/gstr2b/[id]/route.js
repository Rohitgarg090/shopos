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

export async function PATCH(req, { params }) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const { notes, status, reviewed } = await req.json();

    // Verify CA owns this record
    const { data: caData } = await supabase
      .from('ca_partners')
      .select('id')
      .eq('user_id', c.user.id)
      .single();

    if (!caData) return NextResponse.json({ error: 'CA profile not found' }, { status: 404 });

    const { data: record } = await supabase
      .from('gstr2b_reconciliation')
      .select('ca_id')
      .eq('id', id)
      .single();

    if (!record || record.ca_id !== caData.id) {
      return NextResponse.json({ error: 'Not authorized to update this record' }, { status: 403 });
    }

    // Update record
    const updateData = {
      updated_at: new Date().toISOString(),
      updated_by_ca_id: caData.id,
    };

    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) {
      updateData.status = status;
      // Track if status was manually changed
      if (status === 'matched' || status === 'ignored' || status === 'under_review') {
        updateData.manually_matched = true;
      }
    }
    if (reviewed !== undefined) updateData.reviewed_at = reviewed ? new Date().toISOString() : null;

    const { data: updated, error } = await supabase
      .from('gstr2b_reconciliation')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[ca/gstr2b-update] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
