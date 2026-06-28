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

export async function POST(req) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!c.firmId) return NextResponse.json({ error: 'No firm context' }, { status: 400 });

    const { syncType, eInvoiceIds } = await req.json();

    if (!syncType || !eInvoiceIds || eInvoiceIds.length === 0) {
      return NextResponse.json({
        error: 'syncType (gstr1|ewb|gst) and eInvoiceIds array required',
      }, { status: 400 });
    }

    if (!['gstr1', 'ewb', 'gst'].includes(syncType)) {
      return NextResponse.json({ error: 'Invalid syncType' }, { status: 400 });
    }

    // Validate all e-invoices exist and belong to firm
    const { data: eInvoices } = await c.sb
      .from('e_invoices')
      .select('id, status, synced_to_gstr1, synced_to_ewb, synced_to_gst')
      .eq('firm_id', c.firmId)
      .in('id', eInvoiceIds);

    if (eInvoices.length !== eInvoiceIds.length) {
      return NextResponse.json({ error: 'Some e-invoices not found' }, { status: 404 });
    }

    const results = {
      successful: [],
      failed: [],
      skipped: [],
    };

    // Process each e-invoice
    for (const eInvoice of eInvoices) {
      try {
        // Check if already synced
        const alreadySynced = syncType === 'gstr1' ? eInvoice.synced_to_gstr1 :
          syncType === 'ewb' ? eInvoice.synced_to_ewb :
          eInvoice.synced_to_gst;

        if (alreadySynced) {
          results.skipped.push({
            id: eInvoice.id,
            reason: `Already synced to ${syncType.toUpperCase()}`,
          });
          continue;
        }

        // Call appropriate sync API
        const syncUrl = syncType === 'gstr1' ? `/api/einvoice/${eInvoice.id}/sync-gstr1` :
          syncType === 'ewb' ? `/api/einvoice/${eInvoice.id}/sync-ewb` :
          `/api/einvoice/${eInvoice.id}/sync-gst`;

        const syncResponse = await fetch(syncUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('authorization'),
          },
          body: JSON.stringify({}),
        });

        if (syncResponse.ok) {
          results.successful.push({
            id: eInvoice.id,
            message: 'Synced successfully',
          });
        } else {
          const errorData = await syncResponse.json();
          results.failed.push({
            id: eInvoice.id,
            error: errorData.error || 'Sync failed',
          });
        }
      } catch (err) {
        results.failed.push({
          id: eInvoice.id,
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      success: results.failed.length === 0,
      syncType,
      results,
      summary: {
        total: eInvoiceIds.length,
        successful: results.successful.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
      },
    });
  } catch (error) {
    console.error('[einvoice-batch-sync] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
