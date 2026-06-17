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

  // Get settings for THIS user - use user_id as primary key (user_id should be unique)
  // Don't filter by firm_id since it may be NULL in database
  const { data: allRows, error } = await c.sb
    .from('firm_settings')
    .select('*')
    .eq('user_id', c.user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[settings] GET error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get only the most recent row
  const row = (allRows || [])[0];
  console.log('[settings] GET returning row:', row ? `id=${row.id}, name=${row.name}` : 'NO ROW FOUND');
  return NextResponse.json(shape(row || {}));
}

export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const b = await req.json();

  // Map camelCase to snake_case for database fields
  // Only include fields that exist in firm_settings table
  const fieldMap = {
    name: 'name',
    shoptype: 'shoptype',
    gstin: 'gstin',
    address: 'address',
    mobile: 'mobile',
    email: 'email',
    senderEmail: 'sender_email',
    state: 'state',
    stateCode: 'state_code',
    pincode: 'pincode',
    bankName: 'bank_name',
    bankAccount: 'bank_account',
    bankIFSC: 'bank_ifsc',
    invoicePrefix: 'invoice_prefix',
    invoiceSeq: 'invoice_seq',
    logo: 'logo',
    emailSubject: 'email_subject',
    emailBody: 'email_body',
    terms: 'terms',
    geminiKey: 'gemini_key',
    ewbUsername: 'ewb_username',
    ewbPassword: 'ewb_password',
    // Note: Exclude these fields if they don't exist in schema:
    // msg91Key, msg91SmsTemplate, msg91WaTemplate, interestEnabled,
    // interestOnOpeningBalance, notifEnabled
  };

  const fields = {};
  Object.entries(fieldMap).forEach(([key, dbCol]) => {
    // Include field if it has a value (for strings, numbers, booleans)
    // Skip only truly empty/undefined values, but include 0 and false
    if (b[key] !== undefined && b[key] !== null) {
      const val = b[key];
      // Skip empty strings, but keep 0, false, and other falsy values that are defined
      if (typeof val === 'string' && val === '') {
        return;
      }
      fields[dbCol] = val;
    }
  });

  // Step 1: Get all matching rows to find the primary one (use user_id only, not firm_id)
  const { data: allRows, error: queryError } = await c.sb
    .from('firm_settings')
    .select('*')
    .eq('user_id', c.user.id)
    .order('updated_at', { ascending: false });
  if (queryError) {
    console.error('[settings] query error:', queryError.message);
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  let data, error;
  const primaryRow = (allRows || [])[0]; // Most recent row (NEVER delete duplicates - preserve data)

  // Step 2: Update or insert
  if (primaryRow?.id) {
    // UPDATE the primary row - only update the fields being changed
    const updateFields = { ...fields, updated_at: new Date().toISOString() };
    console.log('[settings] Updating row', primaryRow.id, 'with fields:', updateFields);
    const result = await c.sb.from('firm_settings')
      .update(updateFields)
      .eq('id', primaryRow.id)
      .select();
    error = result.error;
    data = result.data ? result.data[0] : null; // Get first row from array
    if (error) {
      console.error('[settings] Update error:', error.message);
    }
  } else {
    // INSERT new row only if no existing row found
    const insertRow = {
      user_id: c.user.id,
      ...(c.firmId ? { firm_id: c.firmId } : {}),
      ...fields,
    };
    console.log('[settings] Inserting new row:', insertRow);
    const result = await c.sb.from('firm_settings')
      .insert([insertRow])
      .select();
    error = result.error;
    data = result.data ? result.data[0] : null; // Get first row from array
    if (error) {
      console.error('[settings] Insert error:', error.message);
    }
  }

  if (error) {
    console.error('[settings] save error:', error.message, 'code:', error.code);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(shape(data || {}));
}