import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSupabase(token) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  return sb;
}

async function getUser(req) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return { user: null, supabase: null, token: null };
  const sb = getSupabase(token);
  const { data: { user } } = await sb.auth.getUser();
  return { user, supabase: sb, token };
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
});

export async function GET(req) {
  const { user, supabase } = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('firm_settings').select('*').eq('user_id', user.id).single();

  if (error && error.code === 'PGRST116') return NextResponse.json(shape({}));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(shape(data));
}

export async function POST(req) {
  const { user, supabase } = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const b = await req.json();
  const row = {
    user_id: user.id,
    name: b.name || '', shoptype: b.shoptype || '', gstin: b.gstin || '',
    address: b.address || '', mobile: b.mobile || '', email: b.email || '',
    sender_email: b.senderEmail || '', state: b.state || 'Madhya Pradesh',
    state_code: b.stateCode || '23', pincode: b.pincode || '',
    bank_name: b.bankName || '', bank_account: b.bankAccount || '',
    bank_ifsc: b.bankIFSC || '', invoice_prefix: b.invoicePrefix || 'INV',
    invoice_seq: b.invoiceSeq || 1, logo: b.logo || '',
    email_subject: b.emailSubject || '', email_body: b.emailBody || '',
    terms: b.terms || '', gemini_key: b.geminiKey || '',
    ewb_username: b.ewbUsername || '', ewb_password: b.ewbPassword || '',
    interest_enabled: !!b.interestEnabled,
    interest_on_opening_balance: !!b.interestOnOpeningBalance,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('firm_settings').upsert(row, { onConflict: 'user_id' }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(shape(data));
}