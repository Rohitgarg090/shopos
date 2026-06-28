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
    const { reason } = await req.json();

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

    // Call Sandbox API to cancel e-Invoice
    const sandboxApiKey = process.env.SANDBOX_API_KEY;
    const sandboxApiSecret = process.env.SANDBOX_API_SECRET;
    const sandboxEnv = process.env.SANDBOX_ENV || 'production';

    if (!sandboxApiKey || !sandboxApiSecret) {
      console.error('[einvoice-cancel] Sandbox credentials missing');
      return NextResponse.json({ error: 'Sandbox integration not configured' }, { status: 500 });
    }

    const sandboxUrl = sandboxEnv === 'sandbox'
      ? 'https://api-sandbox.sandbox.co.in'
      : 'https://api.sandbox.co.in';

    // Call Sandbox cancel API
    const sandboxResponse = await fetch(`${sandboxUrl}/einvoicing/api/v1/invoices/${eInvoice.irn}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sandboxApiKey}`,
        'Content-Type': 'application/json',
        'x-api-secret': sandboxApiSecret,
      },
      body: JSON.stringify({
        reason: reason || 'Cancelled per user request',
      }),
    });

    if (!sandboxResponse.ok) {
      const errorData = await sandboxResponse.json();
      console.error('[einvoice-cancel] Sandbox API error:', errorData);
      return NextResponse.json({
        error: errorData.message || 'Failed to cancel e-Invoice',
        details: errorData,
      }, { status: sandboxResponse.status });
    }

    // Update e-Invoice status in database
    const { data: updated, error } = await supabase
      .from('e_invoices')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      eInvoice: updated,
      message: `e-Invoice ${eInvoice.irn} cancelled successfully`,
    });
  } catch (error) {
    console.error('[einvoice-cancel] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
