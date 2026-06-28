export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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
  return user ? { user, sb } : null;
}

export async function POST(req) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { firmId, monthYear } = await req.json();

    if (!firmId || !monthYear) {
      return NextResponse.json({ error: 'firmId and monthYear required' }, { status: 400 });
    }

    // Verify CA has access
    const { data: caData } = await supabase
      .from('ca_partners')
      .select('id')
      .eq('user_id', c.user.id)
      .single();

    if (!caData) return NextResponse.json({ error: 'CA profile not found' }, { status: 404 });

    const { data: hasAccess } = await supabase
      .from('ca_client_links')
      .select('id')
      .eq('ca_id', caData.id)
      .eq('firm_id', firmId)
      .eq('status', 'accepted')
      .single();

    if (!hasAccess) return NextResponse.json({ error: 'No access to this firm' }, { status: 403 });

    // Get GST credentials from firm_settings
    const { data: firmSettings, error: settingsError } = await supabase
      .from('firm_settings')
      .select('gst_portal_username, gst_portal_password')
      .eq('firm_id', firmId)
      .single();

    if (settingsError || !firmSettings?.gst_portal_username || !firmSettings?.gst_portal_password) {
      return NextResponse.json({
        error: 'GST credentials not found. Please add GST portal credentials in firm settings.',
        needsCredentials: true
      }, { status: 400 });
    }

    // Call Sandbox API using credentials from Vercel vault
    const sandboxEnv = process.env.SANDBOX_ENV || 'production';
    const sandboxApiKey = process.env.SANDBOX_API_KEY;
    const sandboxApiSecret = process.env.SANDBOX_API_SECRET;

    if (!sandboxApiKey || !sandboxApiSecret) {
      console.error('[gstr2b-fetch] Sandbox credentials missing from Vercel vault');
      return NextResponse.json({ error: 'Sandbox integration not configured' }, { status: 500 });
    }

    // Prepare Sandbox API request
    const [year, month] = monthYear.split('-');
    const sandboxUrl = sandboxEnv === 'sandbox'
      ? 'https://api-sandbox.sandbox.co.in'
      : 'https://api.sandbox.co.in';

    const gstinFromSettings = (await supabase
      .from('firm_settings')
      .select('gstin')
      .eq('firm_id', firmId)
      .single()).data?.gstin;

    if (!gstinFromSettings) {
      return NextResponse.json({ error: 'GSTIN not found in firm settings' }, { status: 400 });
    }

    // Call Sandbox GSTR-2B API
    const sandboxResponse = await fetch(`${sandboxUrl}/gst/gstr2b`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sandboxApiKey}`,
        'Content-Type': 'application/json',
        'x-api-secret': sandboxApiSecret,
      },
      body: JSON.stringify({
        gstin: gstinFromSettings,
        month: month.padStart(2, '0'),
        year: year,
        username: firmSettings.gst_portal_username,
        password: firmSettings.gst_portal_password,
      }),
    });

    if (!sandboxResponse.ok) {
      const errorData = await sandboxResponse.json();
      console.error('[gstr2b-fetch] Sandbox API error:', errorData);
      return NextResponse.json({
        error: errorData.message || 'Failed to fetch GSTR-2B data from Sandbox',
        details: errorData
      }, { status: sandboxResponse.status });
    }

    const gstr2bData = await sandboxResponse.json();

    // Parse and store GSTR-2B invoices
    const invoices = gstr2bData.data?.b2b || [];

    for (const invoice of invoices) {
      await supabase
        .from('gstr2b_data')
        .upsert({
          ca_id: caData.id,
          firm_id: firmId,
          month_year: monthYear,
          supplier_gstin: invoice.ctin,
          supplier_name: invoice.suppliername,
          invoice_number: invoice.inum,
          invoice_date: invoice.idt,
          invoice_amount: parseFloat(invoice.val) || 0,
          gst_amount: parseFloat(invoice.txval) || 0,
          hsn_sac: invoice.hsn_sc,
        }, { onConflict: 'firm_id,month_year,supplier_gstin,invoice_number' });
    }

    return NextResponse.json({
      success: true,
      invoicesCount: invoices.length,
      message: `Fetched ${invoices.length} invoices from GSTR-2B`
    });
  } catch (error) {
    console.error('[ca/gstr2b-fetch] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
