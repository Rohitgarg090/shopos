export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

async function ctx(req) {
  const token = (req.headers.get('authorization')||'').replace('Bearer ','').trim();
  if (!token) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await sb.auth.getUser();
  return user ? { user, sb, firmId: req.headers.get('x-firm-id') } : null;
}

export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!c.firmId) return NextResponse.json({ error: 'Firm ID required' }, { status: 400 });

  try {
    // Get firm settings for invoicePrefix
    const { data: firmData, error: firmError } = await c.sb
      .from('firms')
      .select('invoice_prefix')
      .eq('id', c.firmId)
      .single();

    if (firmError && firmError.code !== 'PGRST116') {
      console.error('[next-invoice] Firm query error:', firmError);
      throw firmError;
    }

    const invoicePrefix = firmData?.invoice_prefix || 'INV';

    // Get the highest invoice number for this firm
    const { data: bills, error: billsError } = await c.sb
      .from('bills')
      .select('invoice_no')
      .eq('firm_id', c.firmId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (billsError) {
      console.error('[next-invoice] Bills query error:', billsError);
      throw billsError;
    }

    // Extract numeric part and increment
    let nextNo = 1;
    if (bills && bills.length > 0 && bills[0].invoice_no) {
      const lastInvoiceNo = bills[0].invoice_no;
      // Extract number from invoice_no (e.g., "INV-001" -> 1, "inv/2026/001" -> 1)
      const match = lastInvoiceNo.match(/(\d+)$/);
      if (match) {
        nextNo = parseInt(match[1]) + 1;
      }
    }

    // Format: apply prefix + pad with zeros (e.g., "INV-001" or "inv/2026/001")
    let invoiceNo;
    if (invoicePrefix.includes('/')) {
      // Format: "inv/2026/001"
      invoiceNo = invoicePrefix + '/' + String(nextNo).padStart(3, '0');
    } else {
      // Format: "INV-001"
      invoiceNo = invoicePrefix + '-' + String(nextNo).padStart(3, '0');
    }

    return NextResponse.json({ invoiceNo });
  } catch (error) {
    console.error('[next-invoice] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate invoice number' },
      { status: 500 }
    );
  }
}
