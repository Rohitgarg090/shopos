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
  upiId: r.upi_id || '',
  upiQrImage: r.upi_qr_image || '',
});

// Settings belong to a firm, not a user. Rows may have been created by the firm
// owner, so other members read/write them via the service role after a membership check.
async function firmClient(c) {
  if (!c.firmId) return { error: 'No firm selected', status: 400 };
  const { data: member } = await c.sb.from('firm_members')
    .select('role').eq('firm_id', c.firmId).eq('user_id', c.user.id).eq('status', 'active').maybeSingle();
  let role = member?.role;
  if (!role) {
    const { data: firm } = await c.sb.from('firms').select('owner_id').eq('id', c.firmId).maybeSingle();
    if (firm?.owner_id === c.user.id) role = 'owner';
  }
  if (!role) return { error: 'Forbidden', status: 403 };
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const db = key ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key) : c.sb;
  return { db, role };
}

async function firmRow(db, firmId) {
  return db.from('firm_settings').select('*').eq('firm_id', firmId)
    .order('updated_at', { ascending: false, nullsFirst: false }).limit(1);
}

export async function GET(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const f = await firmClient(c);
  if (f.error) return NextResponse.json({ error: f.error }, { status: f.status });

  const { data: rows, error } = await firmRow(f.db, c.firmId);
  if (error) {
    console.error('[settings] GET error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(shape((rows || [])[0] || {}));
}

export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const f = await firmClient(c);
  if (f.error) return NextResponse.json({ error: f.error }, { status: f.status });
  if (f.role !== 'owner') return NextResponse.json({ error: 'Only the firm owner can change settings' }, { status: 403 });
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
    upiId: 'upi_id',
    upiQrImage: 'upi_qr_image',
    // Note: Exclude these fields if they don't exist in schema:
    // msg91Key, msg91SmsTemplate, msg91WaTemplate, interestEnabled,
    // interestOnOpeningBalance, notifEnabled
  };

  const fields = {};
  Object.entries(fieldMap).forEach(([key, dbCol]) => {
    // Include field if it has a value (for strings, numbers, booleans)
    // Skip only truly undefined/null values
    if (b[key] !== undefined && b[key] !== null) {
      fields[dbCol] = b[key];
    }
  });

  const { data: rows, error: queryError } = await firmRow(f.db, c.firmId);
  if (queryError) {
    console.error('[settings] query error:', queryError.message);
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  let data, error;
  const row = (rows || [])[0];
  if (row?.id) {
    const result = await f.db.from('firm_settings')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', row.id).select();
    error = result.error; data = result.data?.[0];
  } else {
    const result = await f.db.from('firm_settings')
      .insert([{ user_id: c.user.id, firm_id: c.firmId, ...fields }]).select();
    error = result.error; data = result.data?.[0];
  }

  if (error) {
    console.error('[settings] save error:', error.message, 'code:', error.code);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(shape(data || {}));
}