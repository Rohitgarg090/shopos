export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { blockIfFree } from '@/lib/plan';
import { buildEwbPayload } from '@/lib/ewaybill';
import { sandboxConfigured, firmGst, gstCall } from '@/lib/sandbox';

const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function ctx(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await sb.auth.getUser();
  return user ? { user, sb, firmId: req.headers.get('x-firm-id') } : null;
}

const toISOish = s => s || '';

export async function POST(req) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!c.firmId) return NextResponse.json({ error: 'No firm selected' }, { status: 400 });
    const blocked = await blockIfFree(c.user.id, c.firmId, 'eway');
    if (blocked) return blocked;
    if (!sandboxConfigured())
      return NextResponse.json({ error: 'E-Way Bill service is not configured on the server (SANDBOX_API_KEY / SANDBOX_API_SECRET).' }, { status: 500 });

    const { billId, transport = {} } = await req.json();
    const db = admin();

    const { data: b } = await db.from('bills').select('*, bill_items(*)').eq('id', billId).maybeSingle();
    if (!b || b.firm_id !== c.firmId) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    if (b.status === 'cancelled') return NextResponse.json({ error: 'This invoice is cancelled' }, { status: 400 });
    if (b.ewb_no) return NextResponse.json({ error: `E-Way Bill ${b.ewb_no} already exists for this invoice` }, { status: 409 });

    // If the invoice already has an active e-Invoice, NIC expects the E-Way Bill to be generated from its IRN
    const { data: einv } = await db.from('e_invoices').select('irn,status').eq('bill_id', billId).eq('status', 'generated').limit(1).maybeSingle();
    const viaIrn = !!einv?.irn;
    const g = await firmGst(c.firmId, viaIrn ? 'einvoice' : 'ewb');
    if (g.error) return NextResponse.json({ error: g.error }, { status: 400 });
    const fs = g.fs;

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

    let result;
    if (viaIrn) {
      const body = { Irn: einv.irn, Distance: +payload.transDistance || 0, TransMode: payload.transMode };
      if (payload.transporterId) body.TransId = payload.transporterId;
      if (payload.transporterName && payload.transporterName.length >= 3) body.TransName = payload.transporterName;
      if (payload.transDocNo) { body.TransDocNo = payload.transDocNo; body.TransDocDt = payload.transDocDate; }
      if (payload.vehicleNo) { body.VehNo = payload.vehicleNo; body.VehType = 'R'; }
      const { res, j } = await gstCall('einvoice', g.creds, `/gst/compliance/e-invoice/tax-payer/invoice/${encodeURIComponent(einv.irn)}/e-way-bill`, body);
      const D = j?.data;
      if (!(res.ok && D && +D.Status === 1 && D.Data?.EwbNo)) {
        const errs = (D?.ErrorDetails || []).map(e => e.ErrorCode + ': ' + e.ErrorMessage).join(' · ');
        return NextResponse.json({ error: 'Government portal rejected the E-Way Bill' + (errs ? ' — ' + errs : (j?.message ? ': ' + j.message : '')) }, { status: 400 });
      }
      result = { ewayBillNo: String(D.Data.EwbNo), ewayBillDate: D.Data.EwbDt, validUpto: D.Data.EwbValidTill, alert: D.Data.Remarks || '' };
    } else {
      const { res, j } = await gstCall('ewb', g.creds, '/gst/compliance/e-way-bill/consignor/bill', payload);
      const d = j?.data;
      if (!(res.ok && d && String(d.status) === '1' && d.data?.ewayBillNo)) {
        const codes = d?.error?.errorCodes || d?.errorCodes || '';
        const info = d?.info || d?.error?.message || j?.message || ('HTTP ' + res.status);
        console.error('[ewaybill] NIC rejected', billId, codes, info);
        return NextResponse.json({ error: `Government portal rejected the E-Way Bill${codes ? ' (code ' + codes + ')' : ''}: ${info}`, codes }, { status: 400 });
      }
      result = { ewayBillNo: String(d.data.ewayBillNo), ewayBillDate: d.data.ewayBillDate, validUpto: d.data.validUpto, alert: d.data.alert || d.alert || '' };
    }

    const ewayBillNo = result.ewayBillNo;
    const updates = { ewb_no: ewayBillNo, ewb_valid_upto: toISOish(result.validUpto) };
    if (!b.transport_name && transport.transporterName) updates.transport_name = transport.transporterName;
    if (!b.lr_number && transport.transDocNo) updates.lr_number = transport.transDocNo;
    let { error: upErr } = await db.from('bills').update({ ...updates, ewb_date: new Date().toISOString() }).eq('id', billId);
    if (upErr) ({ error: upErr } = await db.from('bills').update(updates).eq('id', billId)); // ewb_date column not migrated yet
    if (upErr) console.error('[ewaybill] generated', ewayBillNo, 'but failed to save on bill:', upErr.message);

    return NextResponse.json({ ...result, viaIrn, savedOnBill: !upErr });
  } catch (e) {
    console.error('[ewaybill]', e.message);
    return NextResponse.json({ error: e.message || 'E-Way Bill generation failed' }, { status: 500 });
  }
}
