export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { adminDb, isFirmMember } from '@/lib/firmAccess';
import { INDUSTRY_TEMPLATES } from '@/lib/industry-templates';

async function ctx(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const firmId = req.headers.get('x-firm-id');
  // firm_settings is owner-only under RLS; members read/write their firm's industry settings via the server key
  if (!(await isFirmMember(user.id, firmId))) return null;
  return { user, sb: adminDb(), firmId };
}

// GET: Retrieve firm's industry settings
export async function GET(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!c.firmId) return NextResponse.json({ error: 'Firm ID required' }, { status: 400 });

  try {
    const { data, error } = await c.sb
      .from('firm_settings')
      .select('industry_type, custom_product_fields, product_categories')
      .eq('firm_id', c.firmId)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      industryType: data?.industry_type || 'general',
      customFields: data?.custom_product_fields || [],
      categories: data?.product_categories || [],
    });
  } catch (error) {
    console.error('[firm-industry] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update firm's industry settings
export async function PUT(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!c.firmId) return NextResponse.json({ error: 'Firm ID required' }, { status: 400 });

  try {
    const { industryType, customFields, categories } = await req.json();
    console.log('[firm-industry] PUT received:', { industryType, customFields, categories, firmId: c.firmId });

    if (!industryType || !INDUSTRY_TEMPLATES[industryType]) {
      return NextResponse.json({ error: 'Unknown business type' }, { status: 400 });
    }
    if (categories != null && (!Array.isArray(categories) || categories.length > 100 || categories.some(c => typeof c !== 'string' || !c.trim() || c.length > 60))) {
      return NextResponse.json({ error: 'Categories must be up to 100 names of 60 characters or less' }, { status: 400 });
    }

    // Ensure customFields is properly formatted
    const fields = Array.isArray(customFields) ? customFields : [];

    console.log('[firm-industry] Updating with:', { industryType, fields, categories: categories || [] });

    // Check if record exists
    const { data: existing, error: checkError } = await c.sb
      .from('firm_settings')
      .select('id')
      .eq('firm_id', c.firmId)
      .maybeSingle();

    let data, error;

    if (existing && existing.id) {
      // Record exists, update it
      console.log('[firm-industry] Updating existing record');
      const result = await c.sb
        .from('firm_settings')
        .update({
          industry_type: industryType,
          custom_product_fields: fields,
          product_categories: categories || [],
        })
        .eq('firm_id', c.firmId)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // Record doesn't exist, create it
      console.log('[firm-industry] Creating new record');
      const result = await c.sb
        .from('firm_settings')
        .insert({
          firm_id: c.firmId,
          industry_type: industryType,
          custom_product_fields: fields,
          product_categories: categories || [],
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('[firm-industry] Supabase error:', error);
      throw error;
    }

    console.log('[firm-industry] PUT success');
    return NextResponse.json({
      success: true,
      industryType: data.industry_type,
      customFields: data.custom_product_fields,
      categories: data.product_categories,
    });
  } catch (error) {
    console.error('[firm-industry] PUT error:', error.message);
    console.error('[firm-industry] Full error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update industry settings' }, { status: 500 });
  }
}

// POST: Add custom field to industry
export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!c.firmId) return NextResponse.json({ error: 'Firm ID required' }, { status: 400 });

  try {
    const { field } = await req.json();

    if (!field || !field.name) {
      return NextResponse.json({ error: 'Field name required' }, { status: 400 });
    }

    // Get current settings
    const { data: current } = await c.sb
      .from('firm_settings')
      .select('custom_product_fields')
      .eq('firm_id', c.firmId)
      .single();

    const currentFields = current?.custom_product_fields || [];

    // Add new field
    const updatedFields = [
      ...currentFields,
      {
        name: field.name,
        label: field.label || field.name,
        type: field.type || 'text',
        required: field.required || false,
        placeholder: field.placeholder || '',
      },
    ];

    const { data, error } = await c.sb
      .from('firm_settings')
      .update({ custom_product_fields: updatedFields })
      .eq('firm_id', c.firmId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      customFields: data.custom_product_fields,
    });
  } catch (error) {
    console.error('[firm-industry] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
