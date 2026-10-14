export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { GST_STATES, stateCodeFromName, stateCodeFromGstin } from '@/lib/gstStates';

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

const stateLabel = code => { const n = Object.keys(GST_STATES).find(k => GST_STATES[k] === code); return n ? String(code).padStart(2, '0') + '-' + n : ''; };
// Place of supply saved on the bill; older bills fall back to the buyer's GSTIN state, then the seller's state
const posLabel = (b, firmStateCode) => stateLabel(stateCodeFromName(b.place_of_supply) || (b.gst_type === 'igst' ? stateCodeFromGstin(b.customer_gst) : firmStateCode) || stateCodeFromGstin(b.customer_gst));

// Convert data to CSV format
function convertToCSV(data) {
  if (!data.length) return '';

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');

  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
}

export async function GET(req) {
  try {
    const c = await ctx(req);
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const firmId = searchParams.get('firm_id');
    const format = searchParams.get('format') || 'csv'; // csv or excel

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

    const { data: fs } = await supabase.from('firm_settings').select('gstin, state').eq('firm_id', firmId)
      .order('updated_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
    const firmStateCode = stateCodeFromGstin(fs?.gstin) || stateCodeFromName(fs?.state);

    // Get bills (sales) for this firm
    const { data: bills, error } = await supabase
      .from('bills')
      .select('id, invoice_no, created_at, customer_name, customer_gst, subtotal, discount, discount_before_tax, gst_total, gst_type, total, place_of_supply, status')
      .eq('firm_id', firmId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!bills || bills.length === 0) {
      return NextResponse.json({
        data: [],
        message: 'No bills found for this firm'
      });
    }

    // Get bill items for details
    const billIds = bills.map(b => b.id);
    let billItems = [];

    if (billIds.length > 0) {
      const { data: items, error: itemsError } = await supabase
        .from('bill_items')
        .select('bill_id, name, hsn, hsn_code, qty, rate, total')
        .in('bill_id', billIds);

      if (!itemsError) billItems = items || [];
    }

    // Format for GSTR-1 (Sales Register)
    const gstr1Data = bills.map(bill => {
      const items = billItems.filter(item => item.bill_id === bill.id);
      const itemDesc = items.map(i => `${i.name || ''} (Qty: ${i.qty})`).join('; ') || 'N/A';

      // Taxable value: before-GST discounts reduce it; older bills took the discount after tax
      const subtotal = (bill.subtotal || 0) - (bill.discount_before_tax ? (bill.discount || 0) : 0);
      const gstTotal = bill.gst_total || 0;
      const gstType = bill.gst_type || 'cgst_sgst';

      // Calculate actual tax rate percentage from subtotal and gst_total
      // Rate = (gstTotal / subtotal) * 100
      let taxRate = subtotal > 0 ? (gstTotal / subtotal) * 100 : 0;
      let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;
      let cgstRate = 0, sgstRate = 0, igstRate = 0;

      if (gstType === 'cgst_sgst') {
        // For CGST+SGST, split equally
        cgstAmount = gstTotal / 2;
        sgstAmount = gstTotal / 2;
        cgstRate = taxRate / 2;
        sgstRate = taxRate / 2;
      } else if (gstType === 'igst') {
        // For IGST, all goes to IGST
        igstAmount = gstTotal;
        igstRate = taxRate;
      }

      return {
        'Invoice Number': bill.invoice_no || '',
        'Invoice Date': bill.created_at ? new Date(bill.created_at).toLocaleDateString('en-IN') : '',
        'Customer Name': bill.customer_name || '',
        'Customer GSTIN': bill.customer_gst || 'URP',
        'Place of Supply': posLabel(bill, firmStateCode),
        'Subtotal': subtotal.toFixed(2),
        'Invoice Amount': (bill.total || 0).toFixed(2),
        'Taxable Value': subtotal.toFixed(2),
        'CGST%': cgstRate.toFixed(2),
        'CGST Amount': cgstAmount.toFixed(2),
        'SGST%': sgstRate.toFixed(2),
        'SGST Amount': sgstAmount.toFixed(2),
        'IGST%': igstRate.toFixed(2),
        'IGST Amount': igstAmount.toFixed(2),
        'Total Tax': gstTotal.toFixed(2),
        'Item Description': itemDesc,
        'HSN Code': [...new Set(items.map(i => i.hsn || i.hsn_code).filter(Boolean))].join(' '),
      };
    });

    if (format === 'excel') {
      // For Excel, return JSON that will be converted by client
      return NextResponse.json({
        data: gstr1Data,
        filename: `GSTR-1_${new Date().toISOString().split('T')[0]}.xlsx`
      });
    }

    // CSV format
    const csv = convertToCSV(gstr1Data);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="GSTR-1_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('[ca/export/gstr-1] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
