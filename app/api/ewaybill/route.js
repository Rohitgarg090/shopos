export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { blockIfFree } from '@/lib/plan';
import { buildEwbPayload } from '@/lib/ewaybill';

// Sandbox.co.in (Quicko) GSP. Set SANDBOX_BASE_URL=https://test-api.sandbox.co.in when using test keys.
const BASE = process.env.SANDBOX_BASE_URL || 'https://api.sandbox.co.in';
const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function ctx(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await sb.auth.getUser();
  return user ? { user, sb, firmId: req.headers.get('x-firm-id') } : null;
}

// Tokens are cached per server instance; a cold start simply re-authenticates.
const tokenCache = new Map();
const cached = (k) => { const t = tokenCache.get(k); return t && t.exp > Date.now() ? t.token : null; };

async function platformToken() {
  const hit = cached('platform'); if (hit) return hit;
  const res = await fetch(`${BASE}/authenticate`, { method: 'POST', headers: {
    accept: 'application/json', 'x-api-key': process.env.SANDBOX_API_KEY, 'x-api-secret': process.env.SANDBOX_API_SECRET, 'x-api-version': '1.0.0' } });
  const j = await res.json().catch(() => ({}));
  const token = j?.data?.access_token || j?.access_token;
  if (!res.ok || !token) throw new Error('GST service login failed: ' + (j?.message || res.status));
  tokenCache.set('platform', { token, exp: Date.now() + 23 * 3600e3 });
  return token;
}

async function ewbToken(gstin, username, password, force = false) {
  const key = 'ewb:' + gstin + ':' + username;
  const hit = !force && cached(key); if (hit) return hit;
  const res = await fetch(`${BASE}/gst/compliance/e-way-bill/tax-payer/authenticate`, { method: 'POST', headers: {
    'Content-Type': 'application/json', authorization: await platformToken(), 'x-api-key': process.env.SANDBOX_API_KEY, 'x-api-version': '1.0.0' },
    body: JSON.stringify({ username, password, gstin }) });
  const j = await res.json().catch(() => ({}));
  const token = j?.data?.access_token;
  if (!res.ok || !token) {
    const msg = j?.data?.message || j?.message || j?.data?.error?.message || ('error ' + res.status);
    throw new Error('E-Way Bill login failed for ' + gstin + ': ' + msg + '. Check the EWB API username/password in Settings and that "Quicko Infosoft" is your GSP on ewaybillgst.gov.in.');
  }
  const exp = j?.data?.expiry ? +new Date(j.data.expiry) : Date.now() + 5 * 3600e3;
  tokenCache.set(key, { token, exp: Math.min(exp - 60e3, Date.now() + 5 * 3600e3) });
  return token;
}

const toISOish = s => s || '';

export async function POST(req) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!c.firmId) return NextResponse.json({ error: 'No firm selected' }, { status: 400 });
    const blocked = await blockIfFree(c.user.id, c.firmId, 'eway');
    if (blocked) return blocked;
    if (!process.env.SANDBOX_API_KEY || !process.env.SANDBOX_API_SECRET)
      return NextResponse.json({ error: 'E-Way Bill service is not configured on the server (SANDBOX_API_KEY / SANDBOX_API_SECRET).' }, { status: 500 });

    const { billId, transport = {} } = await req.json();
    const db = admin();

    const { data: b } = await db.from('bills').select('*, bill_items(*)').eq('id', billId).maybeSingle();
    if (!b || b.firm_id !== c.firmId) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    if (b.status === 'cancelled') return NextResponse.json({ error: 'This invoice is cancelled' }, { status: 400 });
    if (b.ewb_no) return NextResponse.json({ error: `E-Way Bill ${b.ewb_no} already exists for this invoice` }, { status: 409 });

    const { data: fs } = await db.from('firm_settings').select('*').eq('firm_id', c.firmId)
      .order('updated_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
    if (!fs) return NextResponse.json({ error: 'Firm settings not found — fill Settings first' }, { status: 400 });
    if (!fs.ewb_username || !fs.ewb_password)
      return NextResponse.json({ error: 'Add your E-Way Bill API username & password in Settings → E-Way Bill API Credentials' }, { status: 400 });

    let customer = null;
    if (b.customer_id) {
      const { data } = await db.from('customers').select('*').eq('id', b.customer_id).maybeSingle();
      customer = data;
    }

    const bill = {
      invoiceNo: b.invoice_no, date: b.created_at, customerName: b.customer_name, customerGST: b.customer_gst,
      customerAddr: b.customer_addr, total: +b.total,
      items: (b.bill_items || []).map(i => ({ name: i.name, articleNo: i.article_no, size: i.size, hsn: i.hsn, qty: +i.qty, rate: +i.rate, gstRate: +i.gst_rate, gstAmt: +i.gst_amt })),
    };
    const firm = { name: fs.name, gstin: fs.gstin, address: fs.address, pincode: fs.pincode, state: fs.state, stateCode: fs.state_code };
    const { payload, problems } = buildEwbPayload({ bill, firm, customer, transport });
    if (problems.length) return NextResponse.json({ error: problems.map(p => p.msg).join(' · '), problems }, { status: 422 });

    const call = async (force) => fetch(`${BASE}/gst/compliance/e-way-bill/consignor/bill`, { method: 'POST', headers: {
      'Content-Type': 'application/json', authorization: await ewbToken(payload.fromGstin, fs.ewb_username, fs.ewb_password, force),
      'x-api-key': process.env.SANDBOX_API_KEY, 'x-api-version': '1.0.0' }, body: JSON.stringify(payload) });
    let res = await call(false);
    if (res.status === 401 || res.status === 403) res = await call(true); // stale token
    const j = await res.json().catch(() => ({}));
    const d = j?.data;
    const ok = res.ok && d && String(d.status) === '1' && d.data?.ewayBillNo;
    if (!ok) {
      const codes = d?.error?.errorCodes || d?.errorCodes || '';
      const info = d?.info || d?.error?.message || j?.message || ('HTTP ' + res.status);
      console.error('[ewaybill] NIC rejected', billId, codes, info);
      return NextResponse.json({ error: `Government portal rejected the E-Way Bill${codes ? ' (code ' + codes + ')' : ''}: ${info}`, codes }, { status: 400 });
    }

    const ewayBillNo = String(d.data.ewayBillNo);
    const updates = { ewb_no: ewayBillNo, ewb_valid_upto: toISOish(d.data.validUpto) };
    if (!b.transport_name && transport.transporterName) updates.transport_name = transport.transporterName;
    if (!b.lr_number && transport.transDocNo) updates.lr_number = transport.transDocNo;
    const { error: upErr } = await db.from('bills').update(updates).eq('id', billId);
    if (upErr) console.error('[ewaybill] generated', ewayBillNo, 'but failed to save on bill:', upErr.message);

    return NextResponse.json({
      ewayBillNo, ewayBillDate: d.data.ewayBillDate, validUpto: d.data.validUpto, alert: d.data.alert || d.alert || '',
      savedOnBill: !upErr, payload,
    });
  } catch (e) {
    console.error('[ewaybill]', e.message);
    return NextResponse.json({ error: e.message || 'E-Way Bill generation failed' }, { status: 500 });
  }
}
