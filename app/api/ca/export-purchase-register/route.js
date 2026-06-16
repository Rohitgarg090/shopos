export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to escape CSV values
function escapeCSV(value) {
  if (!value) return '""';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// POST /api/ca/export-purchase-register - Export purchase register as CSV
export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];

    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is CA
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.user_metadata?.role !== 'ca_partner') {
      return Response.json(
        { error: 'Not a CA partner account' },
        { status: 403 }
      );
    }

    const { firmId, month } = await req.json();

    if (!firmId || !month) {
      return Response.json(
        { error: 'firmId and month (YYYY-MM format) are required' },
        { status: 400 }
      );
    }

    // Verify CA has access to this firm
    const { data: caData } = await supabase
      .from('ca_partners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!caData) {
      return Response.json(
        { error: 'CA profile not found' },
        { status: 404 }
      );
    }

    const { data: hasAccess } = await supabase
      .from('ca_client_links')
      .select('id')
      .eq('ca_id', caData.id)
      .eq('firm_id', firmId)
      .eq('status', 'accepted')
      .single();

    if (!hasAccess) {
      return Response.json(
        { error: 'No access to this firm' },
        { status: 403 }
      );
    }

    // Parse month to get date range
    const [year, monthNum] = month.split('-');
    const monthStart = new Date(`${year}-${monthNum}-01`);
    const monthEnd = new Date(parseInt(year), parseInt(monthNum), 0);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    const monthEndStr = monthEnd.toISOString().split('T')[0];

    // Get all bills for the month (purchase bills based on customer_id being null or supplier fields)
    let { data: bills, error: billsError } = await supabase
      .from('bills')
      .select(`
        id,
        invoice_no,
        created_at,
        total,
        subtotal,
        customer_name,
        customer_gst,
        bill_items(
          name,
          hsn,
          gst_rate,
          qty,
          rate,
          gst_amt
        )
      `)
      .eq('firm_id', firmId)
      .gte('created_at', monthStartStr)
      .lte('created_at', monthEndStr)
      .order('created_at', { ascending: true });

    if (billsError) {
      console.error('[export-purchase-register] Bills query error:', billsError);
      if (billsError.message?.includes('hsn_code')) {
        // Fallback: query without hsn_code if column doesn't exist yet
        const { data: fallbackBills, error: fallbackError } = await supabase
          .from('bills')
          .select(`
            id,
            invoice_no,
            date,
            total,
            supplier_name,
            supplier_gstin,
            items:bill_items(
              name,
              gst_rate,
              qty,
              rate
            )
          `)
          .eq('firm_id', firmId)
          .eq('is_purchase', true)
          .gte('date', monthStartStr)
          .lte('date', monthEndStr)
          .order('date', { ascending: true });

        if (fallbackError) {
          return Response.json(
            { error: `Database error: ${fallbackError.message}` },
            { status: 500 }
          );
        }
        // Add placeholder hsn_code for fallback data
        bills = fallbackBills?.map(bill => ({
          ...bill,
          items: bill.items?.map(item => ({ ...item, hsn_code: null }))
        })) || [];
      } else {
        return Response.json(
          { error: billsError.message || 'Failed to fetch bills' },
          { status: 500 }
        );
      }
    }

    if (billsError) {
      return Response.json(
        { error: billsError.message },
        { status: 500 }
      );
    }

    // Build CSV rows
    let csvContent = 'Invoice Date,Invoice Number,Supplier Name,Supplier GSTIN,Taxable Value,IGST,CGST,SGST,Total GST,Total Amount,HSN Code,Description\n';

    if (bills && bills.length > 0) {
      bills.forEach(bill => {
        const billDate = new Date(bill.created_at).toLocaleDateString('en-IN');
        const invoiceNo = bill.invoice_no || bill.id.substring(0, 8);
        const supplierName = escapeCSV(bill.customer_name || 'Unknown');
        const supplierGSTIN = escapeCSV(bill.customer_gst || 'N/A');

        // If bill has items, create one row per HSN code (grouped)
        const itemsByHSN = {};

        if (bill.bill_items && bill.bill_items.length > 0) {
          bill.bill_items.forEach(item => {
            const hsn = item.hsn || 'N/A';
            if (!itemsByHSN[hsn]) {
              itemsByHSN[hsn] = {
                description: item.name || '',
                totalValue: 0,
                igst: 0,
                cgst: 0,
                sgst: 0,
                gstRate: item.gst_rate || 18,
              };
            }
            const lineValue = (item.qty || 0) * (item.rate || 0);
            itemsByHSN[hsn].totalValue += lineValue;
            // Use actual gst_amt if available, otherwise calculate
            const gstAmount = item.gst_amt || (lineValue * (item.gst_rate || 18) / 100);
            // Default: intra-state (CGST + SGST), can be updated for inter-state
            itemsByHSN[hsn].cgst += gstAmount / 2;
            itemsByHSN[hsn].sgst += gstAmount / 2;
          });
        } else {
          // No items, use bill total
          itemsByHSN['N/A'] = {
            description: 'Consolidated',
            totalValue: bill.subtotal || bill.total || 0,
            igst: 0,
            cgst: 0,
            sgst: 0,
            gstRate: 18,
          };
        }

        // Create CSV row for each HSN
        Object.entries(itemsByHSN).forEach(([hsn, data]) => {
          const totalGST = data.igst + data.cgst + data.sgst;
          const totalAmount = data.totalValue + totalGST;
          const row = [
            billDate,
            invoiceNo,
            supplierName,
            supplierGSTIN,
            data.totalValue.toFixed(2),
            data.igst.toFixed(2),
            data.cgst.toFixed(2),
            data.sgst.toFixed(2),
            totalGST.toFixed(2),
            totalAmount.toFixed(2),
            escapeCSV(hsn),
            escapeCSV(data.description),
          ].join(',');
          csvContent += row + '\n';
        });
      });
    }

    // Log the export
    await supabase
      .from('ca_reminder_logs')
      .insert({
        ca_id: caData.id,
        firm_id: firmId,
        message_type: 'whatsapp', // using as a generic log type
        message_content: `Purchase Register Export - ${month}`,
        status: 'sent',
      });

    // Return CSV file
    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="purchase-register-${month}.csv"`,
      },
    });
  } catch (error) {
    console.error('[export-purchase-register] Error:', error);
    return Response.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
