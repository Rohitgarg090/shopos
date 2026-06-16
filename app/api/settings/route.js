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

  // Try firm-specific first, fall back to user-only query
  let query = c.sb.from('firm_settings').select('*').eq('user_id', c.user.id);
  if (c.firmId) query = query.eq('firm_id', c.firmId);
  
  const { data, error } = await query.maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(shape(data || {}));
}

export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const b = await req.json();
  
  const fields = {
    name: b.name || '',
    shoptype: b.shoptype || '',
    gstin: b.gstin || '',
    address: b.address || '',
    mobile: b.mobile || '',
    email: b.email || '',
    sender_email: b.senderEmail || '',
    state: b.state || 'Madhya Pradesh',
    state_code: b.stateCode || '23',
    pincode: b.pincode || '',
    bank_name: b.bankName || '',
    bank_account: b.bankAccount || '',
    bank_ifsc: b.bankIFSC || '',
    invoice_prefix: b.invoicePrefix || 'INV',
    invoice_seq: b.invoiceSeq || 1,
    logo: b.logo || '',
    email_subject: b.emailSubject || '',
    email_body: b.emailBody || '',
    terms: b.terms || '',
    gemini_key: b.geminiKey || '',
    ewb_username: b.ewbUsername || '',
    ewb_password: b.ewbPassword || '',
    interest_enabled: !!b.interestEnabled,
    interest_on_opening_balance: !!b.interestOnOpeningBalance,
    msg91_key: b.msg91Key || '',
    msg91_sms_template: b.msg91SmsTemplate || '',
    msg91_wa_template: b.msg91WaTemplate || '',
    notif_enabled: !!b.notifEnabled,
    updated_at: new Date().toISOString(),
  };

  // Step 1: check if row exists for this user+firm
  let existsQuery = c.sb.from('firm_settings').select('id').eq('user_id', c.user.id);
  if (c.firmId) existsQuery = existsQuery.eq('firm_id', c.firmId);
  const { data: existing } = await existsQuery.maybeSingle();

  let data, error;

  if (existing?.id) {
    // UPDATE existing row
    ({ data, error } = await c.sb.from('firm_settings')
      .update(fields)
      .eq('id', existing.id)
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