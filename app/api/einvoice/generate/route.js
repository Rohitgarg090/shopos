export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getSandboxJWTToken() {
  const now = Date.now();

  // Check if we have a cached JWT token (24 hour validity)
  const { data: cachedJWT } = await supabase
    .from('sandbox_auth_tokens')
    .select('access_token')
    .eq('user_id', 'sandbox-jwt')
    .eq('gstin', 'sandbox-jwt')
    .gt('expires_at', now)
    .single();

  if (cachedJWT?.access_token) {
    console.log('[einvoice-generate] Using cached Sandbox JWT token');
    return cachedJWT.access_token;
  }

  // Step 1: Get Sandbox JWT token
  console.log('[einvoice-generate] Step 1: Getting Sandbox JWT token');

  const jwtResponse = await fetch('https://api.sandbox.co.in/authenticate', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'x-api-key': process.env.SANDBOX_API_KEY,
      'x-api-secret': process.env.SANDBOX_API_SECRET,
      'x-api-version': '1.0.0',
    },
  });

  if (!jwtResponse.ok) {
    const errorData = await jwtResponse.json();
    console.error('[einvoice-generate] Sandbox JWT auth failed:', errorData);
    throw new Error(`Sandbox JWT authentication failed: ${errorData?.message || 'Unknown error'}`);
  }

  const jwtData = await jwtResponse.json();
  const sandboxJWT = jwtData?.data?.access_token;

  if (!sandboxJWT) {
    throw new Error('No Sandbox JWT token received');
  }

  console.log('[einvoice-generate] Got Sandbox JWT token (valid 24h)');

  // Cache JWT for 23.5 hours (86400000ms = 24h)
  await supabase
    .from('sandbox_auth_tokens')
    .upsert({
      user_id: 'sandbox-jwt',
      gstin: 'sandbox-jwt',
      access_token: sandboxJWT,
      expires_at: now + 84600000, // 23.5 hours
    }, { onConflict: 'user_id,gstin' });

  return sandboxJWT;
}

async function getEInvoiceAccessToken(userId, sandboxJWT, gstin) {
  const now = Date.now();

  // Check if we have a cached E-Invoice token
  const { data: cachedToken } = await supabase
    .from('sandbox_auth_tokens')
    .select('access_token')
    .eq('user_id', userId)
    .eq('gstin', gstin)
    .gt('expires_at', now)
    .single();

  if (cachedToken?.access_token) {
    console.log('[einvoice-generate] Using cached E-Invoice token');
    return cachedToken.access_token;
  }

  // Step 2: Authenticate with E-Invoice API using Sandbox JWT
  console.log('[einvoice-generate] Step 2: Authenticating with E-Invoice API');

  const eInvoiceAuthResponse = await fetch(
    'https://api.sandbox.co.in/gst/compliance/e-invoice/tax-payer/authenticate?force=true',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': sandboxJWT, // No "Bearer" prefix!
        'x-api-key': process.env.SANDBOX_API_KEY,
        'x-source': 'primary',
      },
      body: JSON.stringify({
        username: process.env.SANDBOX_USERNAME,
        password: process.env.SANDBOX_PASSWORD,
        gstin: gstin,
      }),
    }
  );

  if (!eInvoiceAuthResponse.ok) {
    const errorData = await eInvoiceAuthResponse.json();
    console.error('[einvoice-generate] E-Invoice auth failed:', errorData);
    throw new Error(`E-Invoice authentication failed: ${errorData?.message || 'Unknown error'}`);
  }

  const eInvoiceAuthData = await eInvoiceAuthResponse.json();
  const eInvoiceToken = eInvoiceAuthData?.data?.access_token;
  const expiry = eInvoiceAuthData?.data?.expiry;

  if (!eInvoiceToken) {
    throw new Error('No E-Invoice access token received');
  }

  console.log('[einvoice-generate] Got E-Invoice token, expires at:', new Date(expiry).toISOString());

  // Cache E-Invoice token
  await supabase
    .from('sandbox_auth_tokens')
    .upsert({
      user_id: userId,
      gstin: gstin,
      access_token: eInvoiceToken,
      expires_at: expiry,
    }, { onConflict: 'user_id,gstin' });

  return eInvoiceToken;
}

const STATE_CODES = {
  'Andhra Pradesh': '28', 'Arunachal Pradesh': '12', 'Assam': '18', 'Bihar': '10',
  'Chhattisgarh': '22', 'Goa': '30', 'Gujarat': '24', 'Haryana': '06',
  'Himachal Pradesh': '02', 'Jharkhand': '20', 'Karnataka': '29', 'Kerala': '32',
  'Madhya Pradesh': '23', 'Maharashtra': '27', 'Manipur': '14', 'Meghalaya': '17',
  'Mizoram': '15', 'Nagaland': '13', 'Odisha': '21', 'Punjab': '03',
  'Rajasthan': '08', 'Sikkim': '11', 'Tamil Nadu': '33', 'Tripura': '16',
  'Telangana': '36', 'Uttar Pradesh': '09', 'Uttarakhand': '05', 'West Bengal': '19',
};

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
  const firmStateCode = STATE_CODES[firm.state] || '23';
  const customerStateCode = STATE_CODES[customer.state] || '29';

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
    console.log('[einvoice-generate] Querying firm_settings for user_id:', c.user.id);

    const { data: firmList, error: firmError } = await supabase
      .from('firm_settings')
      .select('*')
      .eq('user_id', c.user.id);

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

    let sandboxJWT, eInvoiceToken;
    try {
      // Step 1: Get Sandbox JWT token
      sandboxJWT = await getSandboxJWTToken();

      // Step 2: Get E-Invoice access token using Sandbox JWT
      eInvoiceToken = await getEInvoiceAccessToken(c.user.id, sandboxJWT, firm.gstin);
    } catch (err) {
      console.error('[einvoice-generate] Authentication failed:', err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }

    console.log('[einvoice-generate] Step 3: Calling Sandbox e-Invoice generation API');
    console.log('[einvoice-generate] Request body:', JSON.stringify(eInvoiceJSON, null, 2));

    // Step 3: Generate e-Invoice using E-Invoice token
    const sandboxResponse = await fetch(
      'https://api.sandbox.co.in/gst/compliance/e-invoice/tax-payer/invoice',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': eInvoiceToken, // No "Bearer" prefix!
          'x-api-key': process.env.SANDBOX_API_KEY,
          'x-source': 'primary',
        },
        body: JSON.stringify(eInvoiceJSON),
      }
    );

    if (!sandboxResponse.ok) {
      const errorData = await sandboxResponse.json();
      console.error('[einvoice-generate] Sandbox error:', errorData);
      return NextResponse.json({
        error: errorData?.data?.ErrorDetails?.[0]?.ErrorMessage || 'Failed to generate e-Invoice',
        details: errorData,
      }, { status: sandboxResponse.status });
    }

    const sandboxResult = await sandboxResponse.json();
    console.log('[einvoice-generate] Sandbox response:', sandboxResult);

    // Extract IRN and other details from response
    const irn = sandboxResult?.data?.Data?.Irn;
    const ackNo = sandboxResult?.data?.Data?.AckNo;
    const signedInvoice = sandboxResult?.data?.Data?.SignedInvoice;
    const qrCode = sandboxResult?.data?.Data?.QRCode;

    if (!irn) {
      throw new Error('No IRN received from Sandbox API');
    }

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
