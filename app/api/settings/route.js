export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSb(token) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

async function ctx(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  const sb = getSb(token);
  const { data: { user } } = await sb.auth.getUser();
  return user ? { user, sb, firmId: req.headers.get('x-firm-id') } : null;
}

const shape = r => ({
  name: r.name || '',
  shoptype: r.shoptype || '',
  gstin: r.gstin || '',
  address: r.address || '',
  mobile: r.mobile || '',
  email: r.email || '',
  senderEmail: r.sender_email || '',
  state: r.state || 'Madhya Pradesh',
  stateCode: r.state_code || '23',
  pincode: r.pincode || '',
  bankName: r.bank_name || '',
  bankAccount: r.bank_account || '',
  bankIFSC: r.bank_ifsc || '',
  invoicePrefix: r.invoice_prefix || 'INV',
  invoiceSeq: r.invoice_seq || 1,
  logo: r.logo || '',
  emailSubject: r.email_subject || '',
  emailBody: r.email_body || '',
  terms: r.terms || '',
  geminiKey: r.gemini_key || '',
  ewbUsername: r.ewb_username || '',
  ewbPassword: r.ewb_password || '',
  interestEnabled: !!r.interest_enabled,
  interestOnOpeningBalance: !!r.interest_on_opening_balance,
  msg91Key: r.msg91_key || '',
  msg91SmsTemplate: r.msg91_sms_template || '',
  msg91WaTemplate: r.msg91_wa_template || '',
  notifEnabled: !!r.notif_enabled,
});

export async function GET(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get settings for THIS user only (exclude default template rows with NULL user_id)
  let query = c.sb.from('firm_settings').select('*').eq('user_id', c.user.id);
  if (c.firmId) query = query.eq('firm_id', c.firmId);
  query = query.order('updated_at', { ascending: false });

  const { data: allRows, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get only the most recent row (don't merge - could be confusing)
  const row = (allRows || [])[0];
  return NextResponse.json(shape(row || {}));
}

export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const b = await req.json();

  // Map camelCase to snake_case for database fields
  // Note: column is 'name', not 'firm_name'
  const fieldMap = {
    name: 'name',
    gstin: 'gstin',
    address: 'address',
    mobile: 'mobile',
    email: 'email',
    state: 'state',
    pincode: 'pincode',
    terms: 'terms',
  };

  const fields = {};
  Object.entries(fieldMap).forEach(([key, dbCol]) => {
    if (b[key] !== undefined && b[key] !== null && b[key] !== '') {
      fields[dbCol] = b[key];
    }
  });

  // Step 1: Get all matching rows to find the primary one
  let existsQuery = c.sb.from('firm_settings').select('*').eq('user_id', c.user.id);
  if (c.firmId) existsQuery = existsQuery.eq('firm_id', c.firmId);
  existsQuery = existsQuery.order('updated_at', { ascending: false });

  const { data: allRows, error: queryError } = await existsQuery;
  if (queryError) {
    console.error('[settings] query error:', queryError.message);
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  let data, error;
  const primaryRow = (allRows || [])[0]; // Most recent row (NEVER delete duplicates - preserve data)

  // Step 2: Update or insert
  if (primaryRow?.id) {
    // UPDATE the primary (most recent) row - merge existing data with new updates
    const mergedFields = { ...primaryRow, ...fields, updated_at: new Date().toISOString() };
    ({ data, error } = await c.sb.from('firm_settings')
      .update(mergedFields)
      .eq('id', primaryRow.id)
      .select().single());
  } else {
    // INSERT new row
    const insertRow = {
      user_id: c.user.id,
      ...(c.firmId ? { firm_id: c.firmId } : {}),
      ...fields,
    };
    ({ data, error } = await c.sb.from('firm_settings')
      .insert([insertRow])
      .select().single());
  }

  if (error) {
    console.error('[settings] save error:', error.message, 'code:', error.code);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(shape(data));
}