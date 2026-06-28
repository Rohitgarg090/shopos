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

// PATCH /api/ca/compliance-calendar/[id] - Update compliance deadline
export async function PATCH(req, { params }) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const { status, notes, reminderDate } = await req.json();

    // Verify CA owns this deadline
    const { data: caData } = await supabase
      .from('ca_partners')
      .select('id')
      .eq('user_id', c.user.id)
      .single();

    if (!caData) return NextResponse.json({ error: 'CA profile not found' }, { status: 404 });

    const { data: currentDeadline } = await supabase
      .from('ca_compliance_deadlines')
      .select('ca_id')
      .eq('id', id)
      .single();

    if (!currentDeadline || currentDeadline.ca_id !== caData.id) {
      return NextResponse.json({ error: 'Not authorized to update this deadline' }, { status: 403 });
    }

    // Prepare update data
    const updateData = { updated_at: new Date().toISOString() };
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (reminderDate) updateData.reminder_date = reminderDate;
    if (status === 'completed') updateData.completed_at = new Date().toISOString();

    // Update deadline
    const { data: updatedDeadline, error } = await supabase
      .from('ca_compliance_deadlines')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(updatedDeadline);
  } catch (error) {
    console.error('[compliance-calendar-update] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/ca/compliance-calendar/[id] - Delete compliance deadline
export async function DELETE(req, { params }) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;

    // Verify CA owns this deadline
    const { data: caData } = await supabase
      .from('ca_partners')
      .select('id')
      .eq('user_id', c.user.id)
      .single();

    if (!caData) return NextResponse.json({ error: 'CA profile not found' }, { status: 404 });

    const { data: currentDeadline } = await supabase
      .from('ca_compliance_deadlines')
      .select('ca_id')
      .eq('id', id)
      .single();

    if (!currentDeadline || currentDeadline.ca_id !== caData.id) {
      return NextResponse.json({ error: 'Not authorized to delete this deadline' }, { status: 403 });
    }

    // Delete deadline
    const { error } = await supabase
      .from('ca_compliance_deadlines')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[compliance-calendar-delete] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
