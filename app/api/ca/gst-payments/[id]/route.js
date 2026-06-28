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

export async function DELETE(req, { params }) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;

    // Verify CA owns this payment
    const { data: caData } = await supabase
      .from('ca_partners')
      .select('id')
      .eq('user_id', c.user.id)
      .single();

    if (!caData) return NextResponse.json({ error: 'CA profile not found' }, { status: 404 });

    const { data: payment } = await supabase
      .from('ca_gst_payments')
      .select('ca_id')
      .eq('id', id)
      .single();

    if (!payment || payment.ca_id !== caData.id) {
      return NextResponse.json({ error: 'Not authorized to delete this payment' }, { status: 403 });
    }

    // Delete payment
    const { error } = await supabase
      .from('ca_gst_payments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ca/gst-payments-delete] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
