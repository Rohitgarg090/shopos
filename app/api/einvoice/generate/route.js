export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { blockIfFree } from '@/lib/plan';
import { sandboxConfigured, firmGst, gstCall } from '@/lib/sandbox';
import { buildEInvoice } from '@/lib/einvoice';

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
  return user ? { user, sb, firmId: req.headers.get('x-firm-id') } : null;
}

export async function POST(req) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const blocked = await blockIfFree(c.user.id, c.firmId, 'einvoice');
    if (blocked) return blocked;
    if (!c.firmId) return NextResponse.json({ error: 'No firm context' }, { status: 400 });

    const { billId, fixes = {} } = await req.json();
    if (!billId) return NextResponse.json({ error: 'billId required' }, { status: 400 });

    const { data: bill } = await c.sb.from('bills').select('*').eq('id', billId).eq('firm_id', c.firmId).maybeSingle();
    if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });

    // One live IRN per invoice
    const { data: existing } = await supabase.from('e_invoices').select('id, irn').eq('bill_id', billId).eq('status', 'generated').limit(1).maybeSingle();
    if (existing) return NextResponse.json({ error: `An e-Invoice (IRN ${existing.irn}) already exists for this invoice` }, { status: 409 });

    const { data: firmList, error: firmError } = await supabase.from('firm_settings').select('*').eq('firm_id', c.firmId)
      .order('updated_at', { ascending: false, nullsFirst: false }).limit(1);
    if (firmError) return NextResponse.json({ error: 'Could not load firm settings' }, { status: 500 });
    const firm = firmList?.[0];
    if (!firm) return NextResponse.json({ error: 'Firm settings not found — fill Settings → Account & Firm first' }, { status: 404 });

    let customer = null;
    if (bill.customer_id) {
      const { data: cust } = await supabase.from('customers').select('*').eq('id', bill.customer_id).eq('firm_id', c.firmId).maybeSingle();
      customer = cust;
    }

    // Details typed in by the user on the "missing information" form are saved first, then used
    const custUpd = {};
    if (typeof fixes['customer.gst'] === 'string') custUpd.gst = fixes['customer.gst'].toUpperCase().replace(/\s/g, '').slice(0, 15);
    if (typeof fixes['customer.addr'] === 'string') custUpd.addr = fixes['customer.addr'].trim().slice(0, 200);
    if (typeof fixes['customer.pincode'] === 'string') custUpd.pincode = fixes['customer.pincode'].replace(/\D/g, '').slice(0, 6);
    if (Object.keys(custUpd).length) {
      if (customer) {
        const { data: u } = await supabase.from('customers').update(custUpd).eq('id', customer.id).eq('firm_id', c.firmId).select().maybeSingle();
        if (u) customer = u;
      } else {
        customer = { name: bill.customer_name, gst: custUpd.gst, addr: custUpd.addr, pincode: custUpd.pincode };
      }
      const billUpd = {};
      if (custUpd.gst) billUpd.customer_gst = custUpd.gst;
      if (custUpd.addr) billUpd.customer_addr = custUpd.addr;
      if (Object.keys(billUpd).length) { await supabase.from('bills').update(billUpd).eq('id', billId).eq('firm_id', c.firmId); Object.assign(bill, billUpd); }
    }
    if (typeof fixes['ship.pincode'] === 'string' && bill.ship_to) {
      const ship_to = { ...bill.ship_to, pincode: fixes['ship.pincode'].replace(/\D/g, '').slice(0, 6) };
      await supabase.from('bills').update({ ship_to }).eq('id', billId).eq('firm_id', c.firmId);
      bill.ship_to = ship_to;
    }
    const { data: items } = await supabase.from('bill_items').select('*').eq('bill_id', billId).order('id');
    const hsnFix = fixes['item.hsn'] && typeof fixes['item.hsn'] === 'object' ? fixes['item.hsn'] : {};
    for (const it of items || []) {
      const h = String(hsnFix[it.id] ?? '').replace(/\D/g, '').slice(0, 8);
      if (h.length >= 4) { await supabase.from('bill_items').update({ hsn: h }).eq('id', it.id).eq('bill_id', billId); it.hsn = h; }
    }

    const { payload: eInvoiceJSON, problems } = buildEInvoice({ firm, bill, items, customer });
    if (problems.length) {
      return NextResponse.json({ error: 'Some details are missing for the e-Invoice', details: problems.map(p => p.msg), problems }, { status: 422 });
    }

    if (!sandboxConfigured()) return NextResponse.json({ error: 'E-Invoice service is not configured on the server' }, { status: 500 });
    const g = await firmGst(c.firmId, 'einvoice');
    if (g.error) return NextResponse.json({ error: g.error }, { status: 400 });

    // Generate e-Invoice with this firm's own E-Invoice credentials
    const { res: sandboxResponse, j: sandboxResult } = await gstCall('einvoice', g.creds, '/gst/compliance/e-invoice/tax-payer/invoice', eInvoiceJSON);
    const D = sandboxResult?.data;
    const irn = D?.Data?.Irn;
    if (!sandboxResponse.ok || !irn) {
      const errs = (D?.ErrorDetails || []).map(e => (e.ErrorCode ? e.ErrorCode + ': ' : '') + e.ErrorMessage).join(' · ');
      console.error('[einvoice-generate] rejected:', JSON.stringify(sandboxResult).slice(0, 800));
      return NextResponse.json({ error: 'Government portal rejected the e-Invoice' + (errs ? ' — ' + errs : (sandboxResult?.message ? ': ' + sandboxResult.message : '')), portalErrors: D?.ErrorDetails || null }, { status: 400 });
    }
    const ackNo = D?.Data?.AckNo;
    const signedInvoice = D?.Data?.SignedInvoice;
    const qrCode = D?.Data?.SignedQRCode || D?.Data?.QRCode;

    // Store in database
    const { data: eInvoice, error: dbError } = await supabase
      .from('e_invoices')
      .insert([{
        firm_id: c.firmId,
        bill_id: billId,
        irn: irn,
        ack_no: ackNo || null,
        signed_invoice_json: signedInvoice || null,
        qr_code_url: qrCode || null,
        status: 'generated',
        generated_at: new Date().toISOString(),
        created_by: c.user.id,
      }])
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({
      success: true,
      eInvoice: {
        id: eInvoice.id,
        irn: eInvoice.irn,
        ack_no: eInvoice.ack_no,
        qr_code_url: eInvoice.qr_code_url,
        status: eInvoice.status,
      },
      message: `e-Invoice generated successfully. IRN: ${irn}`,
    });
  } catch (error) {
    console.error('[einvoice-generate] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
