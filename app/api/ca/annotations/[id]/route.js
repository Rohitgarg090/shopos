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

// PATCH /api/ca/annotations/[id] - Update annotation (status, annotation text, tag)
export async function PATCH(req, { params }) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const { status, annotation, tag } = await req.json();

    // Verify CA owns this annotation
    const { data: caData } = await supabase
      .from('ca_partners')
      .select('id')
      .eq('user_id', c.user.id)
      .single();

    if (!caData) return NextResponse.json({ error: 'CA profile not found' }, { status: 404 });

    const { data: currentAnnotation } = await supabase
      .from('ca_annotations')
      .select('ca_id')
      .eq('id', id)
      .single();

    if (!currentAnnotation || currentAnnotation.ca_id !== caData.id) {
      return NextResponse.json({ error: 'Not authorized to update this annotation' }, { status: 403 });
    }

    // Update annotation
    const updateData = { updated_at: new Date().toISOString() };
    if (status) updateData.status = status;
    if (annotation) updateData.annotation = annotation;
    if (tag) updateData.tag = tag;

    const { data: updatedAnnotation, error } = await supabase
      .from('ca_annotations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(updatedAnnotation);
  } catch (error) {
    console.error('[ca-annotations-update] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/ca/annotations/[id] - Delete annotation
export async function DELETE(req, { params }) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;

    // Verify CA owns this annotation
    const { data: caData } = await supabase
      .from('ca_partners')
      .select('id')
      .eq('user_id', c.user.id)
      .single();

    if (!caData) return NextResponse.json({ error: 'CA profile not found' }, { status: 404 });

    const { data: currentAnnotation } = await supabase
      .from('ca_annotations')
      .select('ca_id')
      .eq('id', id)
      .single();

    if (!currentAnnotation || currentAnnotation.ca_id !== caData.id) {
      return NextResponse.json({ error: 'Not authorized to delete this annotation' }, { status: 403 });
    }

    // Delete annotation
    const { error } = await supabase
      .from('ca_annotations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ca-annotations-delete] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
