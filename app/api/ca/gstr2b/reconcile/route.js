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

    // Get GSTR-2B data
    const { data: gstr2bInvoices } = await supabase
      .from('gstr2b_data')
      .select('*')
      .eq('firm_id', firmId)
      .eq('month_year', monthYear);

    if (!gstr2bInvoices || gstr2bInvoices.length === 0) {
      return NextResponse.json({ error: 'No GSTR-2B data found. Fetch data first.' }, { status: 400 });
    }

    // Get purchase invoices from purchases table
    const [year, month] = monthYear.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(year, parseInt(month), 0).toISOString().split('T')[0];

    const { data: purchases } = await supabase
      .from('purchases')
      .select('*')
      .eq('firm_id', firmId)
      .gte('purchase_date', startDate)
      .lte('purchase_date', endDate);

    // Matching algorithm
    const reconciliationRecords = [];
    const matchedGstr2bIds = new Set();

    // Match purchases with GSTR-2B invoices
    for (const purchase of purchases || []) {
      let matched = false;

      for (const gstr2b of gstr2bInvoices) {
        // Match on: GSTIN + Invoice Number + Date (±3 days)
        if (
          purchase.supplier_gst === gstr2b.supplier_gstin &&
          purchase.invoice_number === gstr2b.invoice_number
        ) {
          matched = true;
          matchedGstr2bIds.add(gstr2b.id);

          const amountDiff = Math.abs((purchase.purchase_amount || 0) - (gstr2b.invoice_amount || 0));
          const gstDiff = Math.abs((purchase.gst_amount || 0) - (gstr2b.gst_amount || 0));
          const status = amountDiff < 1 && gstDiff < 1 ? 'matched' : 'mismatch';

          reconciliationRecords.push({
            ca_id: caData.id,
            firm_id: firmId,
            month_year: monthYear,
            gstr2b_invoice_id: gstr2b.id,
            purchase_invoice_number: purchase.invoice_number,
            purchase_amount: purchase.purchase_amount,
            purchase_gst: purchase.gst_amount,
            gstr2b_amount: gstr2b.invoice_amount,
            gstr2b_gst: gstr2b.gst_amount,
            status,
            amount_diff: amountDiff,
            gst_diff: gstDiff,
          });

          break;
        }
      }

      if (!matched) {
        // Purchase not found in GSTR-2B
        reconciliationRecords.push({
          ca_id: caData.id,
          firm_id: firmId,
          month_year: monthYear,
          purchase_invoice_number: purchase.invoice_number,
          purchase_amount: purchase.purchase_amount,
          purchase_gst: purchase.gst_amount,
          status: 'not_in_gstr2b',
        });
      }
    }

    // Mark unmatched GSTR-2B invoices as extra
    for (const gstr2b of gstr2bInvoices) {
      if (!matchedGstr2bIds.has(gstr2b.id)) {
        reconciliationRecords.push({
          ca_id: caData.id,
          firm_id: firmId,
          month_year: monthYear,
          gstr2b_invoice_id: gstr2b.id,
          gstr2b_amount: gstr2b.invoice_amount,
          gstr2b_gst: gstr2b.gst_amount,
          status: 'extra_in_gstr2b',
        });
      }
    }

    // Clear old reconciliation data for this month
    await supabase
      .from('gstr2b_reconciliation')
      .delete()
      .eq('firm_id', firmId)
      .eq('month_year', monthYear);

    // Insert reconciliation records
    const { error: insertError } = await supabase
      .from('gstr2b_reconciliation')
      .insert(reconciliationRecords);

    if (insertError) throw insertError;

    // Calculate summary
    const matched = reconciliationRecords.filter(r => r.status === 'matched').length;
    const mismatch = reconciliationRecords.filter(r => r.status === 'mismatch').length;
    const notInGstr2b = reconciliationRecords.filter(r => r.status === 'not_in_gstr2b').length;
    const extra = reconciliationRecords.filter(r => r.status === 'extra_in_gstr2b').length;

    return NextResponse.json({
      success: true,
      summary: {
        totalRecords: reconciliationRecords.length,
        matched,
        mismatch,
        notInGstr2b,
        extra,
      },
      message: `Reconciliation complete: ${matched} matched, ${mismatch} mismatches, ${notInGstr2b} not in GSTR-2B, ${extra} extra`,
    });
  } catch (error) {
    console.error('[ca/gstr2b-reconcile] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
