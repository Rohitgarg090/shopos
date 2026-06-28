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

export async function GET(req) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const firmId = searchParams.get('firm_id');

    if (!firmId) return NextResponse.json({ error: 'firm_id required' }, { status: 400 });

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

    // Get last 12 months of data
    const now = new Date();
    const months = [];
    const monthData = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const monthYear = `${year}-${month}`;

      const monthStart = `${year}-${month}-01`;
      const monthEnd = new Date(year, date.getMonth() + 1, 0).toISOString().split('T')[0];

      months.push(monthYear);

      // Get bills for this month
      const { data: bills } = await supabase
        .from('bills')
        .select('id, subtotal, gst_total, gst_type, created_at')
        .eq('firm_id', firmId)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);

      // Calculate tax for this month
      let totalSalesAmount = 0;
      let totalSalesCGST = 0;
      let totalSalesSGST = 0;
      let totalSalesIGST = 0;
      let billCount = 0;

      (bills || []).forEach(bill => {
        const subtotal = bill.subtotal || 0;
        const gstTotal = bill.gst_total || 0;
        const gstType = bill.gst_type || 'cgst_sgst';

        totalSalesAmount += (subtotal + gstTotal);
        billCount++;

        if (gstType === 'cgst_sgst') {
          totalSalesCGST += gstTotal / 2;
          totalSalesSGST += gstTotal / 2;
        } else if (gstType === 'igst') {
          totalSalesIGST += gstTotal;
        }
      });

      const totalSalesTax = totalSalesCGST + totalSalesSGST + totalSalesIGST;
      const monthLabel = new Date(year, date.getMonth(), 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

      monthData.push({
        monthYear,
        monthLabel,
        billCount,
        salesAmount: parseFloat(totalSalesAmount.toFixed(2)),
        salesTax: parseFloat(totalSalesTax.toFixed(2)),
        cgst: parseFloat(totalSalesCGST.toFixed(2)),
        sgst: parseFloat(totalSalesSGST.toFixed(2)),
        igst: parseFloat(totalSalesIGST.toFixed(2)),
        itc: 0, // TODO: Calculate from purchases
        netGST: parseFloat((totalSalesTax - 0).toFixed(2)), // TODO: Subtract ITC
      });
    }

    return NextResponse.json({
      months: months,
      data: monthData,
      summary: {
        totalBills: monthData.reduce((sum, m) => sum + m.billCount, 0),
        totalSalesTax: monthData.reduce((sum, m) => sum + m.salesTax, 0),
        totalITC: monthData.reduce((sum, m) => sum + m.itc, 0),
        netGSTLiability: monthData.reduce((sum, m) => sum + m.netGST, 0),
      },
    });
  } catch (error) {
    console.error('[ca/gst-liability-history] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
