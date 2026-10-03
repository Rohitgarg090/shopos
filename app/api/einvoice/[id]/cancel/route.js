export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { blockIfFree } from '@/lib/plan';
import { sandboxConfigured, firmGst, gstCall } from '@/lib/sandbox';

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
    const blocked = await blockIfFree(c.user.id, c.firmId, 'einvoice');
    if (blocked) return blocked;
    if (!c.firmId) return NextResponse.json({ error: 'No firm context' }, { status: 400 });

    const { id } = params;
    const { reason, reasonCode } = await req.json();

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

    if (eInvoice.status === 'cancelled') return NextResponse.json({ error: 'This e-Invoice is already cancelled' }, { status: 400 });
    if (!sandboxConfigured()) return NextResponse.json({ error: 'E-Invoice service is not configured on the server' }, { status: 500 });
    const g = await firmGst(c.firmId, 'einvoice');
    if (g.error) return NextResponse.json({ error: g.error }, { status: 400 });

    // 1 Duplicate · 2 Data entry mistake · 3 Order cancelled · 4 Others
    const code = ['1', '2', '3', '4'].includes(String(reasonCode)) ? String(reasonCode) : '4';
    const { res, j } = await gstCall('einvoice', g.creds, `/gst/compliance/e-invoice/tax-payer/invoice/${encodeURIComponent(eInvoice.irn)}/cancel`,
      { Irn: eInvoice.irn, CnlRsn: code, CnlRem: (reason || 'Cancelled').toString().slice(0, 100) });
    const D = j?.data;
    if (!(res.ok && D && +D.Status === 1)) {
      const errs = (D?.ErrorDetails || []).map(e => e.ErrorCode + ': ' + e.ErrorMessage).join(' · ');
      const hint = /2230/.test(errs) ? ' — cancel the E-Way Bill on this invoice first' : /2270/.test(errs) ? ' — e-Invoices can only be cancelled within 24 hours' : '';
      return NextResponse.json({ error: 'Government portal refused the cancellation' + (errs ? ' — ' + errs : '') + hint }, { status: 400 });
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
