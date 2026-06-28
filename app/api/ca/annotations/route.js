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

// GET /api/ca/annotations - Get all annotations for a firm
export async function GET(req) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const firmId = searchParams.get('firm_id');
    const status = searchParams.get('status'); // Filter by status (open, resolved, all)

    if (!firmId) return NextResponse.json({ error: 'firm_id required' }, { status: 400 });

    // Verify CA has access to this firm
    const { data: caData } = await supabase
      .from('ca_partners')
      .select('id')
      .eq('user_id', c.user.id)
      .single();

    if (!caData) return NextResponse.json({ error: 'CA profile not found' }, { status: 404 });

    const { data: hasAccess } = await supabase
      .from('ca_client_links')
      .select('id')
      .eq('ca_id', caData.id)
      .eq('firm_id', firmId)
      .eq('status', 'accepted')
      .single();

    if (!hasAccess) return NextResponse.json({ error: 'No access to this firm' }, { status: 403 });

    // Get annotations
    let query = supabase
      .from('ca_annotations')
      .select('*, bills(invoice_no, customer_name, total)')
      .eq('firm_id', firmId)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: annotations, error } = await query;

    if (error) throw error;

    return NextResponse.json(annotations || []);
  } catch (error) {
    console.error('[ca-annotations] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/ca/annotations - Create annotation on a bill
export async function POST(req) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { firmId, billId, annotation, tag } = await req.json();

    if (!firmId || !billId || !annotation) {
      return NextResponse.json({ error: 'firmId, billId, annotation required' }, { status: 400 });
    }

    // Verify CA has access to this firm
    const { data: caData } = await supabase
      .from('ca_partners')
      .select('id')
      .eq('user_id', c.user.id)
      .single();

    if (!caData) return NextResponse.json({ error: 'CA profile not found' }, { status: 404 });

    const { data: hasAccess } = await supabase
      .from('ca_client_links')
      .select('id')
      .eq('ca_id', caData.id)
      .eq('firm_id', firmId)
      .eq('status', 'accepted')
      .single();

    if (!hasAccess) return NextResponse.json({ error: 'No access to this firm' }, { status: 403 });

    // Check if annotation already exists for this bill
    const { data: existing, error: existingError } = await supabase
      .from('ca_annotations')
      .select('id')
      .eq('bill_id', billId)
      .eq('firm_id', firmId)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'An annotation already exists for this bill' }, { status: 409 });
    }

    // Create annotation
    const { data: newAnnotation, error } = await supabase
      .from('ca_annotations')
      .insert([{
        ca_id: caData.id,
        firm_id: firmId,
        bill_id: billId,
        annotation,
        tag: tag || 'general',
        status: 'open'
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(newAnnotation, { status: 201 });
  } catch (error) {
    console.error('[ca-annotations] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
