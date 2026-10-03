export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { blockIfFree } from '@/lib/plan';
import { sandboxConfigured, firmGst, gstCall } from '@/lib/sandbox';

const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const EWB_CANCEL_REASONS = { 1: 'Duplicate', 2: 'Order cancelled', 3: 'Data entry mistake', 4: 'Others' };

async function ctx(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await sb.auth.getUser();
  return user ? { user, firmId: req.headers.get('x-firm-id') } : null;
}

// POST { billId, reasonCode: 1-4, remark }
export async function POST(req) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!c.firmId) return NextResponse.json({ error: 'No firm selected' }, { status: 400 });
    const blocked = await blockIfFree(c.user.id, c.firmId, 'eway');
    if (blocked) return blocked;
    if (!sandboxConfigured()) return NextResponse.json({ error: 'E-Way Bill service is not configured on the server' }, { status: 500 });

    const { billId, reasonCode, remark } = await req.json();
    const code = +reasonCode;
    if (!EWB_CANCEL_REASONS[code]) return NextResponse.json({ error: 'Choose a cancellation reason' }, { status: 400 });

    const db = admin();
    const { data: b } = await db.from('bills').select('*').eq('id', billId).maybeSingle();
    if (!b || b.firm_id !== c.firmId) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    if (!b.ewb_no) return NextResponse.json({ error: 'This invoice has no active E-Way Bill' }, { status: 400 });
    if (b.ewb_date && Date.now() - new Date(b.ewb_date).getTime() > 24 * 3600e3)
      return NextResponse.json({ error: 'E-Way Bills can only be cancelled within 24 hours of generation' }, { status: 400 });

    const g = await firmGst(c.firmId, 'ewb');
    if (g.error) return NextResponse.json({ error: g.error }, { status: 400 });

    const ewbNo = String(b.ewb_no);
    const { res, j } = await gstCall('ewb', g.creds, `/gst/compliance/e-way-bill/consignor/bill/${encodeURIComponent(ewbNo)}/cancel`,
      { ewbNo: +ewbNo, cancelRsnCode: code, cancelRmrk: (remark || EWB_CANCEL_REASONS[code]).toString().slice(0, 50) });
    const d = j?.data;
    if (!(res.ok && d && String(d.status) === '1')) {
      const codes = d?.error?.errorCodes || '';
      const hint = /\b312\b/.test(codes) ? ' — it may already be cancelled, or the 24-hour window has passed' : '';
      const info = d?.info || j?.message || ('HTTP ' + res.status);
      return NextResponse.json({ error: `Government portal refused the cancellation${codes ? ' (code ' + codes + ')' : ''}${hint}${info ? ': ' + info : ''}` }, { status: 400 });
    }

    const cancelDate = d.data?.cancelDate || new Date().toISOString();
    const full = { ewb_no: null, ewb_valid_upto: null, ewb_cancelled_no: ewbNo, ewb_cancelled_at: new Date().toISOString(), ewb_cancel_reason: EWB_CANCEL_REASONS[code] + (remark ? ' — ' + remark : '') };
    let { error: upErr } = await db.from('bills').update(full).eq('id', billId);
    if (upErr) ({ error: upErr } = await db.from('bills').update({ ewb_no: null, ewb_valid_upto: null }).eq('id', billId)); // history columns not migrated yet
    if (upErr) console.error('[ewaybill-cancel] cancelled', ewbNo, 'but failed to update bill:', upErr.message);

    return NextResponse.json({ success: true, ewayBillNo: ewbNo, cancelDate, savedOnBill: !upErr });
  } catch (e) {
    console.error('[ewaybill-cancel]', e.message);
    return NextResponse.json({ error: e.message || 'Cancellation failed' }, { status: 500 });
  }
}
