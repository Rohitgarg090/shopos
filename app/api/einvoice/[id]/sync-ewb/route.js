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
  return user ? { user, sb, firmId: req.headers.get('x-firm-id') } : null;
}

export async function POST(req, { params }) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!c.firmId) return NextResponse.json({ error: 'No firm context' }, { status: 400 });

    const { id } = params;
    const { ewayBillDetails } = await req.json();

    // Get e-Invoice and verify it belongs to user's firm
    const { data: eInvoice } = await c.sb
      .from('e_invoices')
      .select('*')
      .eq('id', id)
      .eq('firm_id', c.firmId)
      .single();

    if (!eInvoice) {
      return NextResponse.json({ error: 'e-Invoice not found' }, { status: 404 });
    }

    if (eInvoice.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot sync cancelled e-Invoice' }, { status: 400 });
    }

    // Get bill & customer details
    const { data: bill } = await supabase
      .from('bills')
      .select('*')
      .eq('id', eInvoice.bill_id)
      .single();

    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', bill.customer_id)
      .single();

    // Get firm details (keyed by user_id)
    const { data: firm } = await c.sb
      .from('firm_settings')
      .select('*')
      .eq('user_id', c.user.id)
      .single();

    // Prepare e-Way Bill data
    const ewbData = {
      irn: eInvoice.irn,
      seller_gstin: firm?.gstin,
      buyer_gstin: customer?.gst,
      buyer_name: customer?.name,
      invoice_number: bill.invoice_no,
      invoice_date: new Date(bill.created_at).toISOString().split('T')[0],
      invoice_value: bill.total_amount || 0,
      mode_of_transport: ewayBillDetails?.mode || 'ROAD',
      vehicle_number: ewayBillDetails?.vehicleNumber || '',
      transporter_id: ewayBillDetails?.transporterId || '',
      ...ewayBillDetails,
    };

    // Call Sandbox API to generate e-Way Bill
    const sandboxApiKey = process.env.SANDBOX_API_KEY;
    const sandboxApiSecret = process.env.SANDBOX_API_SECRET;
    const sandboxEnv = process.env.SANDBOX_ENV || 'production';

    if (!sandboxApiKey || !sandboxApiSecret) {
      console.error('[einvoice-sync-ewb] Sandbox credentials missing');
      return NextResponse.json({ error: 'Sandbox integration not configured' }, { status: 500 });
    }

    const sandboxUrl = sandboxEnv === 'sandbox'
      ? 'https://api-sandbox.sandbox.co.in'
      : 'https://api.sandbox.co.in';

    const syncResponse = await fetch(`${sandboxUrl}/eway/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sandboxApiKey}`,
        'Content-Type': 'application/json',
        'x-api-secret': sandboxApiSecret,
      },
      body: JSON.stringify(ewbData),
    });

    if (!syncResponse.ok) {
      const errorData = await syncResponse.json();
      console.error('[einvoice-sync-ewb] Sandbox API error:', errorData);
      return NextResponse.json({
        error: errorData.message || 'Failed to generate e-Way Bill',
        details: errorData,
      }, { status: syncResponse.status });
    }

    const ewbResult = await syncResponse.json();

    // Update e-Invoice sync status
    const { data: updated, error } = await supabase
      .from('e_invoices')
      .update({
        synced_to_ewb: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      eInvoice: updated,
      ewbNumber: ewbResult.ewb_number,
      message: `e-Way Bill generated successfully`,
    });
  } catch (error) {
    console.error('[einvoice-sync-ewb] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
