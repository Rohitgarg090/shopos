export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { blockIfFree } from '@/lib/plan';
import { sandboxConfigured, firmGst, gstCall } from '@/lib/sandbox';
import { stateCodeFromGstin, stateCodeFromName } from '@/lib/gstStates';

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

function validateRequiredFields(firm, bill, items, customer) {
  const errors = [];

  // Firm validation
  if (!firm?.gstin) errors.push('Firm GSTIN is required');
  if (!firm?.name) errors.push('Firm name is required');
  if (!firm?.address) errors.push('Firm address is required');
  if (!firm?.state) errors.push('Firm state is required');
  if (!firm?.mobile) errors.push('Firm mobile number is required');
  if (!firm?.email) errors.push('Firm email is required');

  // Bill validation
  if (!bill?.invoice_no) errors.push('Invoice number is required');
  if (!bill?.created_at) errors.push('Invoice date is required');
  if (!bill?.customer_id && !bill?.customer_name) errors.push('Customer details are required');

  // Customer validation
  if (!customer?.gst && customer?.gst !== '') errors.push('Customer GSTIN is required');
  if (!customer?.name) errors.push('Customer name is required');
  if (!customer?.addr) errors.push('Customer address is required');
  if (!customer?.phone) errors.push('Customer mobile number is required');
  if (!customer?.email) errors.push('Customer email is required');
  if (!customer?.state) errors.push('Customer state is required');
  if (!customer?.pincode) errors.push('Customer pincode is required');

  // Items validation
  if (!items || items.length === 0) errors.push('At least one item is required');
  items?.forEach((item, idx) => {
    if (!item.name) errors.push(`Item ${idx + 1}: Product description is required`);
    if (item.hsn_code === undefined || item.hsn_code === '') errors.push(`Item ${idx + 1}: HSN code is required`);
    if (!item.qty || item.qty <= 0) errors.push(`Item ${idx + 1}: Quantity must be greater than 0`);
    if (!item.rate || item.rate <= 0) errors.push(`Item ${idx + 1}: Rate must be greater than 0`);
    if (item.gst_rate === undefined) errors.push(`Item ${idx + 1}: GST rate is required`);
  });

  return errors;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function buildSandboxEInvoiceJSON({ firm, bill, items, customer }) {
  const firmStateCode = String(stateCodeFromGstin(firm.gstin) || stateCodeFromName(firm.state) || +firm.state_code || 23).padStart(2, '0');
  const customerStateCode = String(stateCodeFromGstin(customer?.gst) || stateCodeFromName(customer?.state) || +firmStateCode).padStart(2, '0');

  const itemList = (items || []).map((item, idx) => {
    const qty = parseFloat(item.qty) || 1;
    const rate = parseFloat(item.rate) || 0;
    const gstRate = parseFloat(item.gst_rate) || 18;
    const totalAmt = qty * rate;
    const discount = parseFloat(item.discount) || 0;
    const assAmt = totalAmt - discount;

    let cgstAmt = 0, sgstAmt = 0, igstAmt = 0;

    if (firmStateCode === customerStateCode) {
      // Same state: CGST + SGST
      cgstAmt = (assAmt * gstRate) / (2 * 100);
      sgstAmt = (assAmt * gstRate) / (2 * 100);
    } else {
      // Different state: IGST
      igstAmt = (assAmt * gstRate) / 100;
    }

    return {
      SlNo: String(idx + 1),
      PrdDesc: item.name || 'Product',
      IsServc: item.is_service ? 'Y' : 'N',
      HsnCd: item.hsn_code || '999999',
      Qty: qty,
      Unit: item.unit || 'PCS',
      UnitPrice: rate,
      TotAmt: Math.round(totalAmt * 100) / 100,
      Discount: discount,
      PreTaxVal: discount,
      AssAmt: Math.round(assAmt * 100) / 100,
      GstRt: gstRate,
      IgstAmt: Math.round(igstAmt * 100) / 100,
      CgstAmt: Math.round(cgstAmt * 100) / 100,
      SgstAmt: Math.round(sgstAmt * 100) / 100,
      TotItemVal: Math.round((assAmt + cgstAmt + sgstAmt + igstAmt) * 100) / 100,
    };
  });

  const totals = items?.reduce((acc, item) => {
    const qty = parseFloat(item.qty) || 1;
    const rate = parseFloat(item.rate) || 0;
    const gstRate = parseFloat(item.gst_rate) || 18;
    const totalAmt = qty * rate;
    const discount = parseFloat(item.discount) || 0;
    const assAmt = totalAmt - discount;

    let cgstVal = 0, sgstVal = 0, igstVal = 0;
    if (firmStateCode === customerStateCode) {
      cgstVal = (assAmt * gstRate) / (2 * 100);
      sgstVal = (assAmt * gstRate) / (2 * 100);
    } else {
      igstVal = (assAmt * gstRate) / 100;
    }

    return {
      assVal: acc.assVal + assAmt,
      cgstVal: acc.cgstVal + cgstVal,
      sgstVal: acc.sgstVal + sgstVal,
      igstVal: acc.igstVal + igstVal,
      discount: acc.discount + discount,
      totInvVal: acc.totInvVal + assAmt + cgstVal + sgstVal + igstVal,
    };
  }, { assVal: 0, cgstVal: 0, sgstVal: 0, igstVal: 0, discount: 0, totInvVal: 0 });

  return {
    Version: '1.1',
    TranDtls: {
      TaxSch: 'GST',
      SupTyp: customer.gst ? 'B2B' : 'B2C',
      RegRev: 'Y',
      IgstOnIntra: 'N',
    },
    DocDtls: {
      Typ: 'INV',
      No: bill.invoice_no,
      Dt: formatDate(bill.created_at),
    },
    SellerDtls: {
      Gstin: firm.gstin,
      LglNm: firm.name,
      TrdNm: firm.name,
      Addr1: firm.address.substring(0, 100),
      Addr2: firm.address.substring(100, 200) || '',
      Loc: firm.state || 'Madhya Pradesh',
      Pin: parseInt(firm.pincode) || 451001,
      Stcd: firmStateCode,
      Ph: firm.mobile.replace(/\D/g, ''),
      Em: firm.email,
    },
    BuyerDtls: {
      Gstin: customer.gst || '',
      LglNm: customer.name,
      TrdNm: customer.name,
      Pos: customer.gst ? customerStateCode : '96',
      Addr1: (customer.addr || 'N/A').substring(0, 100),
      Addr2: (customer.addr || '').substring(100, 200) || '',
      Loc: customer.state || 'Karnataka',
      Pin: parseInt(customer.pincode) || 560001,
      Stcd: customerStateCode,
      Ph: (customer.phone || '').replace(/\D/g, '') || '9000000000',
      Em: customer.email || 'customer@example.com',
    },
    ItemList: itemList,
    ValDtls: {
      AssVal: Math.round(totals.assVal * 100) / 100,
      CgstVal: Math.round(totals.cgstVal * 100) / 100,
      SgstVal: Math.round(totals.sgstVal * 100) / 100,
      IgstVal: Math.round(totals.igstVal * 100) / 100,
      CesVal: 0,
      Discount: totals.discount,
      OthChrg: 0,
      RndOffAmt: 0,
      TotInvVal: Math.round(totals.totInvVal * 100) / 100,
      TotInvValFc: Math.round(totals.totInvVal * 100) / 100,
    },
  };
}

export async function POST(req) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const blocked = await blockIfFree(c.user.id, c.firmId, 'einvoice');
    if (blocked) return blocked;
    if (!c.firmId) return NextResponse.json({ error: 'No firm context' }, { status: 400 });

    const { billId } = await req.json();

    if (!billId) {
      return NextResponse.json({ error: 'billId required' }, { status: 400 });
    }

    // Get bill details
    const { data: bill } = await c.sb
      .from('bills')
      .select('*')
      .eq('id', billId)
      .eq('firm_id', c.firmId)
      .single();

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    // Get firm details using service role (for admin access, not restricted by RLS)
    console.log('[einvoice-generate] Querying firm_settings for firm_id:', c.firmId);

    const { data: firmList, error: firmError } = await supabase
      .from('firm_settings')
      .select('*')
      .eq('firm_id', c.firmId)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(1);

    console.log('[einvoice-generate] Query result:', {
      count: firmList?.length,
      error: firmError?.message,
      firmId: c.user.id
    });

    if (firmError) {
      console.error('[einvoice-generate] DB error:', firmError);
      return NextResponse.json({ error: 'Database error: ' + firmError.message }, { status: 500 });
    }

    const firm = firmList?.[0];

    if (!firm) {
      console.error('[einvoice-generate] No firm found for user:', c.user.id);
      return NextResponse.json({
        error: 'Firm settings not found in database',
        debug: { userId: c.user.id, found: firmList?.length }
      }, { status: 404 });
    }

    console.log('[einvoice-generate] Firm found:', { name: firm.name, gstin: firm.gstin });

    if (!firm.gstin) {
      return NextResponse.json({
        error: 'Firm GSTIN is empty',
        debug: { firmName: firm.name }
      }, { status: 400 });
    }

    // Get bill items
    const { data: items } = await c.sb
      .from('bill_items')
      .select('*')
      .eq('bill_id', billId);

    // Get customer details
    let customer = null;
    if (bill.customer_id) {
      const { data: cust } = await supabase
        .from('customers')
        .select('*')
        .eq('id', bill.customer_id)
        .single();
      customer = cust;
    }

    // Validate all required fields
    const validationErrors = validateRequiredFields(firm, bill, items, customer);
    if (validationErrors.length > 0) {
      console.log('[einvoice-generate] Validation errors:', validationErrors);
      console.log('[einvoice-generate] Data being validated:', {
        firm: { name: firm?.name, gstin: firm?.gstin },
        bill: { invoice_no: bill?.invoice_no, customer_id: bill?.customer_id },
        customer: { name: customer?.name, phone: customer?.phone, addr: customer?.addr, state: customer?.state, pincode: customer?.pincode },
        items: items?.length
      });
      return NextResponse.json({
        error: 'Validation failed',
        details: validationErrors,
      }, { status: 400 });
    }

    // Build Sandbox API format
    const eInvoiceJSON = buildSandboxEInvoiceJSON({ firm, bill, items, customer });

    // Get authentication tokens
    if (!firm.gstin) {
      return NextResponse.json({ error: 'Firm GSTIN is required for e-Invoice generation' }, { status: 400 });
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
