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

export async function GET(req, { params }) {
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

    // Get associated bill for context
    const { data: bill } = await c.sb
      .from('bills')
      .select('invoice_no, created_at, customer_id')
      .eq('id', eInvoice.bill_id)
      .single();

    // Get customer details
    const { data: customer } = await supabase
      .from('customers')
      .select('name, gst, email, mobile')
      .eq('id', bill.customer_id)
      .single();

    // Parse signed JSON if available
    let signedJSON = null;
    if (eInvoice.signed_invoice_json) {
      try {
        signedJSON = JSON.parse(eInvoice.signed_invoice_json);
      } catch (e) {
        console.error('Failed to parse signed JSON:', e);
      }
    }

    return NextResponse.json({
      eInvoice: {
        id: eInvoice.id,
        irn: eInvoice.irn,
        ack_no: eInvoice.ack_no,
        status: eInvoice.status,
        qr_code_url: eInvoice.qr_code_url,
        generated_at: eInvoice.generated_at,
        cancelled_at: eInvoice.cancelled_at,
        acknowledged_at: eInvoice.acknowledged_at,
      },
      bill: {
        invoice_no: bill?.invoice_no,
        created_at: bill?.created_at,
      },
      customer: {
        name: customer?.name,
        gst: customer?.gst,
        email: customer?.email,
        mobile: customer?.mobile,
      },
      signedJSON,
    });
  } catch (error) {
    console.error('[einvoice-details] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
