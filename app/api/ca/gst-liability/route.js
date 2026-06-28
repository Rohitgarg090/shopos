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
    const monthYear = searchParams.get('month_year'); // YYYY-MM format

    if (!firmId) return NextResponse.json({ error: 'firm_id required' }, { status: 400 });

    // Verify CA has access to this firm
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

    // Get current month if not specified
    const now = new Date();
    const currentMonth = monthYear || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, month] = currentMonth.split('-');
    const monthStart = `${year}-${month}-01`;
    const monthEnd = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

    // Get all bills (sales) for this firm in the month
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select('*')
      .eq('firm_id', firmId)
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd);

    if (billsError && billsError.code !== 'PGRST116') {
      console.error('[GST Liability] Bills query error:', billsError);
      throw billsError;
    }

    // Calculate sales tax from bills table
    let totalSalesAmount = 0;
    let totalSalesCGST = 0;
    let totalSalesSGST = 0;
    let totalSalesIGST = 0;
    let billCount = 0;

    (bills || []).forEach(bill => {
      const subtotal = bill.subtotal || 0;
      const gstTotal = bill.gst_total || 0;
      const gstType = bill.gst_type || 'cgst_sgst';
      const total = bill.total || (subtotal + gstTotal) || 0;

      totalSalesAmount += total;
      billCount++;

      // Calculate individual tax components based on gst_type
      if (gstType === 'cgst_sgst') {
        // Equal split between CGST and SGST (each 9%)
        totalSalesCGST += gstTotal / 2;
        totalSalesSGST += gstTotal / 2;
      } else if (gstType === 'igst') {
        // All as IGST (18%)
        totalSalesIGST += gstTotal;
      }
    });

    console.log('[GST Liability] Calculation:', {
      monthYear: currentMonth,
      dateRange: `${monthStart} to ${monthEnd}`,
      salesBills: billCount,
      totalSalesTax: (totalSalesCGST + totalSalesSGST + totalSalesIGST),
      cgst: totalSalesCGST,
      sgst: totalSalesSGST,
      igst: totalSalesIGST,
    });

    const totalSalesTax = totalSalesCGST + totalSalesSGST + totalSalesIGST;

    // Get all purchases (bill_details with type='purchase') for this firm in the month
    // Since we might not have a purchase table yet, we'll try to fetch from bill_details
    const { data: purchases, error: purchasesError } = await supabase
      .from('bill_details')
      .select('id, total_amount, cgst, sgst, igst, created_at')
      .eq('firm_id', firmId)
      .eq('type', 'purchase')
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd);

    // Calculate ITC (Input Tax Credit)
    let totalPurchaseAmount = 0;
    let totalPurchasesCGST = 0;
    let totalPurchasesSGST = 0;
    let totalPurchasesIGST = 0;
    let purchaseCount = 0;

    if (!purchasesError || purchasesError.code !== 'PGRST116') {
      (purchases || []).forEach(purchase => {
        totalPurchaseAmount += purchase.total_amount || 0;
        totalPurchasesCGST += purchase.cgst || 0;
        totalPurchasesSGST += purchase.sgst || 0;
        totalPurchasesIGST += purchase.igst || 0;
        purchaseCount++;
      });
    }

    const totalITC = totalPurchasesCGST + totalPurchasesSGST + totalPurchasesIGST;

    // Calculate net GST liability
    const netGSTLiability = totalSalesTax - totalITC;

    // Determine payment due date (20th of next month)
    const dueDate = new Date(parseInt(year), parseInt(month), 20);

    // Get GSTR-3B deadline from compliance calendar
    const { data: gstr3bDeadline } = await supabase
      .from('ca_compliance_deadlines')
      .select('due_date')
      .eq('firm_id', firmId)
      .eq('deadline_type', 'gstr3b')
      .eq('month_year', currentMonth)
      .single();

    // Debug info
    console.log('[GST Liability] Calculation:', {
      monthYear: currentMonth,
      dateRange: `${monthStart} to ${monthEnd}`,
      salesBills: billCount,
      purchaseRecords: purchaseCount,
      totalSalesTax,
      totalITC,
      netGST: netGSTLiability,
    });

    return NextResponse.json({
      monthYear: currentMonth,
      monthDisplay: new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      sales: {
        count: billCount,
        amount: parseFloat(totalSalesAmount.toFixed(2)),
        cgst: parseFloat(totalSalesCGST.toFixed(2)),
        sgst: parseFloat(totalSalesSGST.toFixed(2)),
        igst: parseFloat(totalSalesIGST.toFixed(2)),
        totalTax: parseFloat(totalSalesTax.toFixed(2)),
      },
      purchases: {
        count: purchaseCount,
        amount: parseFloat(totalPurchaseAmount.toFixed(2)),
        cgst: parseFloat(totalPurchasesCGST.toFixed(2)),
        sgst: parseFloat(totalPurchasesSGST.toFixed(2)),
        igst: parseFloat(totalPurchasesIGST.toFixed(2)),
        totalTax: parseFloat(totalITC.toFixed(2)),
      },
      liability: {
        salesTax: parseFloat(totalSalesTax.toFixed(2)),
        itc: parseFloat(totalITC.toFixed(2)),
        netDue: parseFloat(netGSTLiability.toFixed(2)),
        dueDate: gstr3bDeadline?.due_date || dueDate.toISOString().split('T')[0],
      },
      debug: {
        billsFound: billCount,
        purchasesFound: purchaseCount,
        dateRange: `${monthStart} to ${monthEnd}`,
      },
    });
  } catch (error) {
    console.error('[ca/gst-liability] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Get GST liability for last 12 months
export async function POST(req) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { firmId } = await req.json();

    if (!firmId) return NextResponse.json({ error: 'firmId required' }, { status: 400 });

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

    // Get last 12 months data
    const now = new Date();
    const months = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push(monthYear);
    }

    // For simplicity, return last 12 months
    return NextResponse.json({
      months: months,
      message: 'Use GET with month_year parameter to fetch specific month data',
    });
  } catch (error) {
    console.error('[ca/gst-liability-history] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
