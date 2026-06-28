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

    const { firmId, monthYear, format } = await req.json();

    if (!firmId || !monthYear || !format) {
      return NextResponse.json({ error: 'firmId, monthYear, and format required' }, { status: 400 });
    }

    if (!['pdf', 'excel'].includes(format)) {
      return NextResponse.json({ error: 'Format must be pdf or excel' }, { status: 400 });
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

    // Get reconciliation data
    const { data: reconciliationData } = await supabase
      .from('gstr2b_reconciliation')
      .select('*')
      .eq('firm_id', firmId)
      .eq('month_year', monthYear)
      .order('created_at', { ascending: false });

    // Get firm details
    const { data: firmData } = await supabase
      .from('firm_settings')
      .select('name, gstin')
      .eq('firm_id', firmId)
      .single();

    // Calculate summary
    const summary = {
      total: reconciliationData?.length || 0,
      matched: reconciliationData?.filter(r => r.status === 'matched').length || 0,
      mismatch: reconciliationData?.filter(r => r.status === 'mismatch').length || 0,
      notInGstr2b: reconciliationData?.filter(r => r.status === 'not_in_gstr2b').length || 0,
      extra: reconciliationData?.filter(r => r.status === 'extra_in_gstr2b').length || 0,
    };

    if (format === 'excel') {
      return exportToExcel(firmData, monthYear, summary, reconciliationData);
    } else {
      return exportToPDF(firmData, monthYear, summary, reconciliationData);
    }
  } catch (error) {
    console.error('[ca/gstr2b-export] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function exportToExcel(firmData, monthYear, summary, records) {
  // Generate CSV format (can be opened in Excel)
  const [year, month] = monthYear.split('-');
  const monthName = new Date(year, parseInt(month) - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const lines = [
    ['GSTR-2B RECONCILIATION REPORT'],
    [''],
    [`Firm: ${firmData?.name || 'N/A'}`],
    [`GSTIN: ${firmData?.gstin || 'N/A'}`],
    [`Period: ${monthName}`],
    [`Generated: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}`],
    [''],
    ['SUMMARY'],
    ['Metric', 'Count'],
    ['Total Records', summary.total],
    ['Matched ✅', summary.matched],
    ['Mismatch ⚠️', summary.mismatch],
    ['Not in GSTR-2B ❌', summary.notInGstr2b],
    ['Extra in GSTR-2B ➕', summary.extra],
    ['Match Rate %', `${((summary.matched / summary.total) * 100).toFixed(1)}%`],
    [''],
    ['DETAILED RECORDS'],
    ['Status', 'Invoice Number', 'Your Amount', 'GSTR-2B Amount', 'Difference', 'GST Diff', 'Notes'],
  ];

  records?.forEach(record => {
    lines.push([
      record.status.toUpperCase(),
      record.purchase_invoice_number || record.gstr2b_invoice_id || '—',
      record.purchase_amount || '—',
      record.gstr2b_amount || '—',
      record.amount_diff?.toFixed(2) || '—',
      record.gst_diff?.toFixed(2) || '—',
      record.notes || '—',
    ]);
  });

  lines.push(['']);
  lines.push(['ACTION ITEMS']);

  const mismatches = records?.filter(r => r.status === 'mismatch') || [];
  const notFound = records?.filter(r => r.status === 'not_in_gstr2b') || [];
  const extra = records?.filter(r => r.status === 'extra_in_gstr2b') || [];

  if (mismatches.length > 0) {
    lines.push(['Mismatches to Review', `${mismatches.length} invoices have amount/GST differences`]);
  }
  if (notFound.length > 0) {
    lines.push(['Not Filed by Supplier', `${notFound.length} invoices not found in GSTR-2B - follow up with suppliers`]);
  }
  if (extra.length > 0) {
    lines.push(['Extra in GSTR-2B', `${extra.length} invoices in GSTR-2B but not claimed - consider claiming or requesting removal`]);
  }

  const csv = lines.map(row =>
    row.map(cell =>
      cell?.toString().includes(',') || cell?.toString().includes('"')
        ? `"${cell?.toString().replace(/"/g, '""') || ''}"`
        : cell || ''
    ).join(',')
  ).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const filename = `GSTR-2B-Reconciliation-${monthYear}-${firmData?.name || 'Report'}.csv`;

  return new NextResponse(blob, {
    headers: {
      'Content-Type': 'text/csv;charset=utf-8;',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

function exportToPDF(firmData, monthYear, summary, records) {
  const [year, month] = monthYear.split('-');
  const monthName = new Date(year, parseInt(month) - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Generate HTML content
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { border-bottom: 3px solid #1B5E8A; padding-bottom: 10px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #1B5E8A; font-size: 24px; }
        .header p { margin: 5px 0; font-size: 12px; color: #666; }
        .section { margin-bottom: 20px; }
        .section h2 { background: #EFF6FF; padding: 8px 10px; border-left: 4px solid #1B5E8A; margin: 0 0 10px 0; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
        th { background: #1B5E8A; color: white; padding: 8px; text-align: left; font-weight: bold; }
        td { padding: 6px 8px; border-bottom: 1px solid #ddd; }
        tr:nth-child(even) { background: #f9f9f9; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 10px 0; }
        .summary-card { padding: 10px; background: #f5f5f5; border-left: 3px solid #1B5E8A; }
        .summary-card .number { font-size: 18px; font-weight: bold; color: #1B5E8A; }
        .summary-card .label { font-size: 11px; color: #666; }
        .status-matched { color: #15803d; font-weight: bold; }
        .status-mismatch { color: #d97706; font-weight: bold; }
        .status-not-found { color: #dc2626; font-weight: bold; }
        .status-extra { color: #f97316; font-weight: bold; }
        .action-item { margin: 8px 0; padding: 8px; background: #fff3cd; border-left: 3px solid #ffc107; font-size: 11px; }
        .footer { margin-top: 30px; font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>GSTR-2B Reconciliation Report</h1>
        <p><strong>Firm:</strong> ${firmData?.name || 'N/A'} | <strong>GSTIN:</strong> ${firmData?.gstin || 'N/A'}</p>
        <p><strong>Period:</strong> ${monthName} | <strong>Generated:</strong> ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}</p>
      </div>

      <div class="section">
        <h2>Summary</h2>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="number">${summary.total}</div>
            <div class="label">Total Records</div>
          </div>
          <div class="summary-card">
            <div class="number" style="color: #15803d;">${summary.matched}</div>
            <div class="label">Matched ✅</div>
          </div>
          <div class="summary-card">
            <div class="number" style="color: #1B5E8A;">${((summary.matched / (summary.total || 1)) * 100).toFixed(1)}%</div>
            <div class="label">Match Rate</div>
          </div>
        </div>
        <table style="margin-top: 15px;">
          <tr style="background: #f9f9f9;">
            <td><strong>Status</strong></td>
            <td><strong>Count</strong></td>
            <td><strong>Percentage</strong></td>
          </tr>
          <tr>
            <td><span class="status-matched">Matched ✅</span></td>
            <td>${summary.matched}</td>
            <td>${((summary.matched / (summary.total || 1)) * 100).toFixed(1)}%</td>
          </tr>
          <tr>
            <td><span class="status-mismatch">Mismatch ⚠️</span></td>
            <td>${summary.mismatch}</td>
            <td>${((summary.mismatch / (summary.total || 1)) * 100).toFixed(1)}%</td>
          </tr>
          <tr>
            <td><span class="status-not-found">Not in GSTR-2B ❌</span></td>
            <td>${summary.notInGstr2b}</td>
            <td>${((summary.notInGstr2b / (summary.total || 1)) * 100).toFixed(1)}%</td>
          </tr>
          <tr>
            <td><span class="status-extra">Extra in GSTR-2B ➕</span></td>
            <td>${summary.extra}</td>
            <td>${((summary.extra / (summary.total || 1)) * 100).toFixed(1)}%</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <h2>Detailed Records</h2>
        <table>
          <tr>
            <th>Status</th>
            <th>Invoice #</th>
            <th>Your Amount</th>
            <th>GSTR-2B Amount</th>
            <th>Diff</th>
            <th>Notes</th>
          </tr>
          ${records?.map(record => `
            <tr>
              <td>
                ${record.status === 'matched' ? '<span class="status-matched">✅ Matched</span>' :
                  record.status === 'mismatch' ? '<span class="status-mismatch">⚠️ Mismatch</span>' :
                  record.status === 'not_in_gstr2b' ? '<span class="status-not-found">❌ Not Found</span>' :
                  '<span class="status-extra">➕ Extra</span>'}
              </td>
              <td>${record.purchase_invoice_number || record.gstr2b_invoice_id || '—'}</td>
              <td>₹${(record.purchase_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
              <td>₹${(record.gstr2b_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
              <td>₹${(record.amount_diff || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
              <td>${record.notes || '—'}</td>
            </tr>
          `).join('')}
        </table>
      </div>

      <div class="section">
        <h2>Action Items</h2>
        ${records?.filter(r => r.status === 'mismatch').length > 0 ? `
          <div class="action-item">
            <strong>⚠️ Review Mismatches:</strong> ${records.filter(r => r.status === 'mismatch').length} invoices have amount/GST differences. Compare with supplier invoices and update as needed.
          </div>
        ` : ''}
        ${records?.filter(r => r.status === 'not_in_gstr2b').length > 0 ? `
          <div class="action-item">
            <strong>❌ Follow-up with Suppliers:</strong> ${records.filter(r => r.status === 'not_in_gstr2b').length} invoices not found in GSTR-2B. Request suppliers to file their GSTR-1 or check invoice details.
          </div>
        ` : ''}
        ${records?.filter(r => r.status === 'extra_in_gstr2b').length > 0 ? `
          <div class="action-item">
            <strong>➕ Review Extra Invoices:</strong> ${records.filter(r => r.status === 'extra_in_gstr2b').length} invoices appear in GSTR-2B but not claimed. Consider claiming if valid or request supplier to correct.
          </div>
        ` : ''}
        ${records?.filter(r => r.status !== 'matched').length === 0 ? `
          <div class="action-item" style="background: #dcfce7; border-left-color: #15803d;">
            ✅ <strong>All Clear:</strong> All invoices are matched with GSTR-2B. No action required.
          </div>
        ` : ''}
      </div>

      <div class="footer">
        <p>This report is auto-generated by ShopOS CA Partner Module. For assistance, contact support.</p>
      </div>
    </body>
    </html>
  `;

  // Convert HTML to PDF using a simple approach
  // We'll create a data URI that can be printed
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });

  // For actual PDF generation, we'll return HTML that triggers browser print-to-PDF
  const filename = `GSTR-2B-Reconciliation-${monthYear}-${firmData?.name || 'Report'}.html`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html;charset=utf-8;',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
