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

    // Get bill details
    const { data: bill } = await supabase
      .from('bills')
      .select('*')
      .eq('id', eInvoice.bill_id)
      .single();

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    // Get bill items
    const { data: items } = await supabase
      .from('bill_items')
      .select('*')
      .eq('bill_id', eInvoice.bill_id);

    // Get customer
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', bill.customer_id)
      .single();

    // Prepare GSTR-1 data for Sandbox
    const gstr1Data = {
      irn: eInvoice.irn,
      invoice_number: bill.invoice_no,
      invoice_date: new Date(bill.created_at).toISOString().split('T')[0],
      buyer_gstin: customer?.gst || '',
      buyer_name: customer?.name || '',
      total_taxable_value: items?.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0) || 0,
      total_tax: items?.reduce((sum, item) =>
        sum + (parseFloat(item.igst) || 0) + (parseFloat(item.cgst) || 0) + (parseFloat(item.sgst) || 0), 0) || 0,
      total_invoice_value: (items?.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0) || 0) +
        (items?.reduce((sum, item) =>
          sum + (parseFloat(item.igst) || 0) + (parseFloat(item.cgst) || 0) + (parseFloat(item.sgst) || 0), 0) || 0),
      items: items?.map(item => ({
        hsn_code: item.hsn_code || '999999',
        quantity: parseFloat(item.quantity) || 1,
        unit_price: parseFloat(item.rate) || 0,
        taxable_value: parseFloat(item.total) || 0,
        tax_rate: item.tax_rate || 18,
      })) || [],
    };

    // Call Sandbox API to sync to GSTR-1
    const sandboxApiKey = process.env.SANDBOX_API_KEY;
    const sandboxApiSecret = process.env.SANDBOX_API_SECRET;
    const sandboxEnv = process.env.SANDBOX_ENV || 'production';

    if (!sandboxApiKey || !sandboxApiSecret) {
      console.error('[einvoice-sync-gstr1] Sandbox credentials missing');
      return NextResponse.json({ error: 'Sandbox integration not configured' }, { status: 500 });
    }

    const sandboxUrl = sandboxEnv === 'sandbox'
      ? 'https://api-sandbox.sandbox.co.in'
      : 'https://api.sandbox.co.in';

    const syncResponse = await fetch(`${sandboxUrl}/gst/gstr1/auto-populate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sandboxApiKey}`,
        'Content-Type': 'application/json',
        'x-api-secret': sandboxApiSecret,
      },
      body: JSON.stringify(gstr1Data),
    });

    if (!syncResponse.ok) {
      const errorData = await syncResponse.json();
      console.error('[einvoice-sync-gstr1] Sandbox API error:', errorData);
      return NextResponse.json({
        error: errorData.message || 'Failed to sync to GSTR-1',
        details: errorData,
      }, { status: syncResponse.status });
    }

    // Update e-Invoice sync status
    const { data: updated, error } = await supabase
      .from('e_invoices')
      .update({
        synced_to_gstr1: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      eInvoice: updated,
      message: `e-Invoice synced to GSTR-1 successfully`,
    });
  } catch (error) {
    console.error('[einvoice-sync-gstr1] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
