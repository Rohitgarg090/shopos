export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firmAccess';
import { cleanExtras } from '@/lib/invoiceExtras';

async function ctx(req) {
  const token = (req.headers.get('authorization')||'').replace('Bearer ','').trim();
  if (!token) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await sb.auth.getUser();
  return user ? { user, sb, firmId: req.headers.get('x-firm-id') } : null;
}

const shape = b => ({
  id: b.id, invoiceNo: b.invoice_no, date: b.created_at,
  customerId: b.customer_id, customerName: b.customer_name,
  customerPhone: b.customer_phone, customerGST: b.customer_gst,
  customerEmail: b.customer_email||'', customerAddr: b.customer_addr||'',
  isRelative: b.is_relative, subtotal: +b.subtotal, discount: +b.discount||0,
  gst: +b.gst_total, markup: +b.markup||0, total: +b.total,
  biltyNo: b.bilty_no||'', transportName: b.transport_name||'',
  lrNumber: b.lr_number||'', ewbNo: b.ewb_no||'', ewbValidUpto: b.ewb_valid_upto||'',
  ewbDate: b.ewb_date||null, ewbCancelledNo: b.ewb_cancelled_no||'', ewbCancelledAt: b.ewb_cancelled_at||null, ewbCancelReason: b.ewb_cancel_reason||'',
  status: b.status||'active', cancelledAt: b.cancelled_at||null, cancelReason: b.cancel_reason||'',
  shipTo: b.ship_to||null, buyerOrderNo: b.buyer_order_no||'', buyerOrderDate: b.buyer_order_date||'', destination: b.destination||'',
});

export async function GET(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!c.firmId) return NextResponse.json([]);
  const { data: bills, error } = await c.sb.from('bills').select('*, bill_items(*)').eq('firm_id', c.firmId).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(bills.map(b => ({
    ...shape(b),
    items: (b.bill_items||[]).map(i => ({
      name: i.name, sku: i.product_sku, cat: i.cat, size: i.size,
      color: i.color||'', articleNo: i.article_no||'', hsn: i.hsn||'',
      qty: i.qty, rate: +i.rate, gstRate: i.gst_rate, gstAmt: +i.gst_amt, total: +i.total,
    })),
  })));
}

// Firm's invoice prefix from Settings (letters, digits, / and - only; default INV)
async function invoicePrefix(firmId) {
  const { data } = await adminDb().from('firm_settings').select('invoice_prefix').eq('firm_id', firmId)
    .order('updated_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
  const p = String(data?.invoice_prefix || 'INV').toUpperCase().replace(/[^A-Z0-9/]/g, '').slice(0, 12);
  return p || 'INV';
}
const missingFn = e => e && (e.code === 'PGRST202' || e.code === '42883' || /could not find the function/i.test(e.message || ''));

export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!c.firmId) return NextResponse.json({ error: 'No firm selected' }, { status: 400 });
  const b = await req.json();
  if (!Array.isArray(b.items) || b.items.length === 0) return NextResponse.json({ error: 'The bill has no items' }, { status: 400 });
  const extras = cleanExtras(b);
  if (extras.error) return NextResponse.json({ error: extras.error }, { status: 400 });

  const billRow = {
    customer_id: b.customerId || null, customer_name: b.customerName, customer_phone: b.customerPhone || '',
    customer_gst: b.customerGST || '', customer_email: b.customerEmail || '', customer_addr: b.customerAddr || '',
    is_relative: !!b.isRelative, subtotal: b.subtotal, discount: b.discount || 0, gst_total: b.gst,
    markup: b.markup || 0, total: b.total, transport_name: b.transportName || '', lr_number: b.lrNumber || '',
    bill_date: /^\d{4}-\d{2}-\d{2}$/.test(b.billDate || '') ? b.billDate : '',
    ...extras.value,
  };
  const itemRows = b.items.map(i => ({
    sku: i.sku || '', name: i.name, cat: i.cat, size: i.size, color: i.color || '', article_no: i.articleNo || '',
    hsn: i.hsn || '', qty: i.qty, rate: i.rate, gst_rate: i.gstRate, gst_amt: i.gstAmt, total: i.total,
  }));

  // One database transaction: next invoice number, bill, items and stock — all or nothing
  const { data, error } = await c.sb.rpc('create_bill', {
    p_firm_id: c.firmId, p_prefix: await invoicePrefix(c.firmId), p_bill: billRow, p_items: itemRows,
  });
  if (!error) {
    const row = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ id: row.id, invoiceNo: row.invoice_no }, { status: 201 });
  }
  if (!missingFn(error)) {
    const status = error.code === 'P0001' ? 409 : error.code === '42501' ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  // Fallback until bills_atomic.sql is applied (not atomic)
  console.warn('[bills] create_bill() missing — run supabase/migrations/bills_atomic.sql');
  const { bill_date, ...plainRow } = billRow;
  plainRow.buyer_order_date = plainRow.buyer_order_date || null;
  const { data: bill, error: bErr } = await c.sb.from('bills').insert([{ ...plainRow, invoice_no: b.invoiceNo, firm_id: c.firmId,
    ...(bill_date && bill_date < new Date().toISOString().slice(0, 10) ? { created_at: bill_date + 'T12:00:00+05:30' } : {}) }]).select().single();
  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });
  const { error: iErr } = await c.sb.from('bill_items').insert(itemRows.map(({ sku, ...i }) => ({ ...i, bill_id: bill.id, product_sku: sku || null })));
  if (iErr) {
    await c.sb.from('bills').delete().eq('id', bill.id);
    return NextResponse.json({ error: iErr.message }, { status: 500 });
  }
  for (const i of b.items) if (i.sku) await c.sb.rpc('decrement_stock', { p_sku: i.sku, p_qty: i.qty });
  return NextResponse.json({ id: bill.id, invoiceNo: bill.invoice_no }, { status: 201 });
}

export async function PATCH(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { id, action, cancelReason, biltyNo, transportName, lrNumber, ewbNo, ewbValidUpto } = body;

  // Verify bill belongs to this firm
  const { data: bill, error: billErr } = await c.sb.from('bills').select('*, bill_items(*)').eq('id', id).single();
  if (!bill || bill.firm_id !== c.firmId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Handle cancel action
  if (action === 'cancel') {
    if (bill.status === 'cancelled') {
      return NextResponse.json({ error: 'Bill already cancelled' }, { status: 400 });
    }

    const { data: cancelled, error: cErr } = await c.sb.rpc('cancel_bill', { p_bill_id: id, p_reason: cancelReason || '' });
    if (!cErr) return NextResponse.json(shape(Array.isArray(cancelled) ? cancelled[0] : cancelled), { status: 200 });
    if (!missingFn(cErr)) return NextResponse.json({ error: cErr.message }, { status: cErr.code === 'P0001' ? 400 : 500 });

    // Fallback until bills_atomic.sql is applied
    // Restore stock for all bill items
    const stockErrors = [];
    for (const item of (bill.bill_items || [])) {
      if (item.product_sku) {
        try {
          const { error } = await c.sb.rpc('increment_stock', { p_sku: item.product_sku, p_qty: item.qty });
          if (error) {
            console.error('[cancel] increment_stock error:', error);
            stockErrors.push(`${item.product_sku}: ${error.message}`);
          }
        } catch (e) {
          console.error('[cancel] increment_stock exception:', e);
          stockErrors.push(`${item.product_sku}: ${e.message}`);
        }
      }
    }

    // Mark bill as cancelled (continue even if some stock restores fail)
    const { data: updated, error: updateErr } = await c.sb.from('bills')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancel_reason: cancelReason || '' })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      console.error('[cancel] update error:', updateErr);
      return NextResponse.json({ error: updateErr.message, details: stockErrors }, { status: 500 });
    }

    if (stockErrors.length > 0) {
      console.warn('[cancel] partial success - some stock restore failed:', stockErrors);
    }

    return NextResponse.json(shape(updated), { status: 200 });
  }

  // Handle shipment details update (existing logic)
  const updates = {};
  if (['shipTo', 'buyerOrderNo', 'buyerOrderDate', 'destination'].some(k => body[k] !== undefined)) {
    const ex = cleanExtras({ shipTo: bill.ship_to, buyerOrderNo: bill.buyer_order_no, buyerOrderDate: bill.buyer_order_date, destination: bill.destination, ...body });
    if (ex.error) return NextResponse.json({ error: ex.error }, { status: 400 });
    Object.assign(updates, ex.value, { buyer_order_date: ex.value.buyer_order_date || null });
  }
  if (biltyNo       !== undefined) updates.bilty_no        = biltyNo;
  if (transportName !== undefined) updates.transport_name  = transportName;
  if (lrNumber      !== undefined) updates.lr_number       = lrNumber;
  if (ewbNo         !== undefined) updates.ewb_no          = ewbNo;
  if (ewbValidUpto  !== undefined) updates.ewb_valid_upto  = ewbValidUpto;
  const { data, error } = await c.sb.from('bills').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const sh = shape(data);
  return NextResponse.json({
    biltyNo: sh.biltyNo, transportName: sh.transportName, lrNumber: sh.lrNumber, ewbNo: sh.ewbNo, ewbValidUpto: sh.ewbValidUpto,
    shipTo: sh.shipTo, buyerOrderNo: sh.buyerOrderNo, buyerOrderDate: sh.buyerOrderDate, destination: sh.destination,
  });
}