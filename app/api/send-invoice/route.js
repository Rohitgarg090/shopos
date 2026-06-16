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

// Build invoice HTML for email
function buildInvoiceHTML(bill, firm, payments = []) {
  const paid = payments.filter(p => p.billId === bill.id).reduce((s, p) => s + p.amount, 0);
  const bal = bill.total - paid;
  const fmt = n => 'Rs.' + Number(n || 0).toFixed(2);
  const date = new Date(bill.date).toLocaleDateString('en-IN');

  const gstSummary = {};
  (bill.items || []).forEach(i => {
    const r = i.gstRate || 0;
    if (!gstSummary[r]) gstSummary[r] = { taxable: 0, cgst: 0, sgst: 0 };
    gstSummary[r].taxable += i.rate * i.qty;
    gstSummary[r].cgst += i.gstAmt / 2;
    gstSummary[r].sgst += i.gstAmt / 2;
  });

  const itemRows = (bill.items || []).map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#fafafa' : '#fff'}">
      <td style="padding:6px 8px;border-bottom:1px solid #eee">${i + 1}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;font-weight:600">${item.name}<br><span style="font-size:10px;color:#999;font-family:monospace">${item.sku || ''}</span></td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee">${item.cat || ''}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee">${item.size || ''}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${item.qty}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${fmt(item.rate)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${item.gstRate || 0}%</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:700">${fmt(item.total)}</td>
    </tr>`).join('');

  const gstRows = Object.entries(gstSummary).map(([rate, v]) => `
    <tr>
      <td style="padding:4px 6px">${rate}%</td>
      <td style="padding:4px 6px;text-align:right">${fmt(v.taxable)}</td>
      <td style="padding:4px 6px;text-align:right">${fmt(v.cgst)}</td>
      <td style="padding:4px 6px;text-align:right">${fmt(v.sgst)}</td>
      <td style="padding:4px 6px;text-align:right;font-weight:700">${fmt(v.cgst + v.sgst)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice ${bill.invoiceNo || bill.id}</title></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Arial,sans-serif;color:#111">
<div style="max-width:700px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">

  <!-- Header -->
  <div style="background:#1B3A6B;padding:20px 24px;display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      ${firm.logo ? `<img src="${firm.logo}" style="max-height:50px;max-width:160px;margin-bottom:8px;display:block" alt="logo">` : ''}
      <div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px">${firm.name}</div>
      ${firm.shoptype ? `<div style="color:rgba(255,255,255,.6);font-size:12px;margin-top:2px">${firm.shoptype}</div>` : ''}
      <div style="color:rgba(255,255,255,.7);font-size:11px;margin-top:6px;line-height:1.6">
        ${firm.address || ''}<br>
        ${firm.mobile ? 'Mob: ' + firm.mobile : ''}${firm.email ? ' | ' + firm.email : ''}<br>
        ${firm.gstin ? '<strong>GSTIN: ' + firm.gstin + '</strong>' : ''}
      </div>
    </div>
    <div style="text-align:right">
      <div style="background:rgba(255,255,255,.15);color:#fff;padding:4px 12px;border-radius:4px;font-size:12px;font-weight:700;margin-bottom:10px">TAX INVOICE</div>
      <div style="color:rgba(255,255,255,.8);font-size:11px;line-height:1.8">
        <strong style="color:#fff">Invoice #:</strong> ${bill.invoiceNo || bill.id}<br>
        <strong style="color:#fff">Date:</strong> ${date}<br>
        ${bill.transportName ? `<strong style="color:#fff">Transport:</strong> ${bill.transportName}<br>` : ''}
        ${bill.lrNumber ? `<strong style="color:#fff">LR No:</strong> ${bill.lrNumber}<br>` : ''}
      </div>
    </div>
  </div>

  <!-- Bill To -->
  <div style="padding:16px 24px;background:#f8f9fc;border-bottom:1px solid #e8e8e8">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#888;margin-bottom:4px">Bill To</div>
    <div style="font-weight:700;font-size:15px">${bill.customerName}</div>
    ${bill.customerPhone ? `<div style="font-size:12px;color:#555;margin-top:2px">📞 ${bill.customerPhone}</div>` : ''}
    ${bill.customerAddr ? `<div style="font-size:12px;color:#555">📍 ${bill.customerAddr}</div>` : ''}
    ${bill.customerGST ? `<div style="font-size:12px;font-weight:700;color:#1B3A6B">GSTIN: ${bill.customerGST}</div>` : ''}
  </div>

  <!-- Items table -->
  <div style="padding:16px 24px">
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead>
        <tr style="background:#1B3A6B;color:#fff">
          <th style="padding:7px 8px;text-align:left">#</th>
          <th style="padding:7px 8px;text-align:left">Description</th>
          <th style="padding:7px 8px;text-align:left">Cat</th>
          <th style="padding:7px 8px;text-align:left">Size</th>
          <th style="padding:7px 8px;text-align:right">Qty</th>
          <th style="padding:7px 8px;text-align:right">Rate</th>
          <th style="padding:7px 8px;text-align:center">GST%</th>
          <th style="padding:7px 8px;text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
  </div>

  <!-- GST Summary + Totals -->
  <div style="padding:0 24px 16px;display:flex;gap:16px;flex-wrap:wrap">
    ${!bill.isRelative && Object.keys(gstSummary).length > 0 ? `
    <div style="flex:1;min-width:220px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#888;margin-bottom:6px">GST Summary</div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;border:1px solid #eee">
        <thead><tr style="background:#f0f0f0">
          <th style="padding:4px 6px;text-align:left">Rate</th>
          <th style="padding:4px 6px;text-align:right">Taxable</th>
          <th style="padding:4px 6px;text-align:right">CGST</th>
          <th style="padding:4px 6px;text-align:right">SGST</th>
          <th style="padding:4px 6px;text-align:right">Total</th>
        </tr></thead>
        <tbody>${gstRows}</tbody>
      </table>
    </div>` : ''}
    <div style="min-width:200px;margin-left:auto">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <tr><td style="padding:4px 8px;color:#666">Subtotal</td><td style="padding:4px 8px;text-align:right;font-family:monospace">${fmt(bill.subtotal)}</td></tr>
        ${!bill.isRelative && (bill.gst || 0) > 0 ? `
        <tr><td style="padding:4px 8px;color:#666">CGST</td><td style="padding:4px 8px;text-align:right;font-family:monospace">${fmt((bill.gst || 0) / 2)}</td></tr>
        <tr><td style="padding:4px 8px;color:#666">SGST</td><td style="padding:4px 8px;text-align:right;font-family:monospace">${fmt((bill.gst || 0) / 2)}</td></tr>` : ''}
        ${(bill.discount || 0) > 0 ? `<tr><td style="padding:4px 8px;color:#2E6B1F">Discount</td><td style="padding:4px 8px;text-align:right;color:#2E6B1F;font-family:monospace">- ${fmt(bill.discount)}</td></tr>` : ''}
        <tr style="background:#1B3A6B;color:#fff">
          <td style="padding:8px;font-weight:700">Grand Total</td>
          <td style="padding:8px;text-align:right;font-weight:800;font-family:monospace;font-size:14px">${fmt(bill.total)}</td>
        </tr>
        ${paid > 0 ? `
        <tr><td style="padding:4px 8px;color:#2E6B1F">Amount Paid</td><td style="padding:4px 8px;text-align:right;color:#2E6B1F;font-family:monospace">${fmt(paid)}</td></tr>
        <tr style="background:#FDF0F0"><td style="padding:6px 8px;color:#9B2626;font-weight:700">Balance Due</td><td style="padding:6px 8px;text-align:right;color:#9B2626;font-weight:800;font-family:monospace">${fmt(bal)}</td></tr>` : ''}
      </table>
    </div>
  </div>

  <!-- Bank details -->
  ${firm.bankName ? `<div style="margin:0 24px 16px;padding:10px 14px;background:#f8f9fc;border-radius:6px;font-size:11px;border:1px solid #e8e8e8">
    <strong>Bank:</strong> ${firm.bankName} &nbsp;|&nbsp; <strong>A/C:</strong> ${firm.bankAccount} &nbsp;|&nbsp; <strong>IFSC:</strong> ${firm.bankIFSC}
  </div>` : ''}

  <!-- Terms -->
  ${firm.terms ? `<div style="margin:0 24px 16px;padding:10px 14px;border-top:1px solid #eee;font-size:10px;color:#888;line-height:1.7;white-space:pre-line">${firm.terms}</div>` : ''}

  <!-- Footer -->
  <div style="padding:14px 24px;background:#f8f9fc;border-top:1px solid #e8e8e8;text-align:center;font-size:10px;color:#aaa">
    This is a computer generated invoice. For queries: ${firm.mobile || firm.email || firm.name}
  </div>
</div>
</body></html>`;
}

export async function POST(req) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { bill, firm, payments, toEmail, customSubject, customBody } = body;

  console.log('[send-invoice] called, toEmail:', toEmail);
  console.log('[send-invoice] RESEND_API_KEY present:', !!process.env.RESEND_API_KEY);
  console.log('[send-invoice] RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL);

  if (!toEmail) return NextResponse.json({ error: 'No email address provided' }, { status: 400 });
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY not set in environment variables' }, { status: 500 });

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'info@shopos.co.in';
  const invoiceNo = bill.invoiceNo || ('#' + bill.id);
  const date = new Date(bill.date).toLocaleDateString('en-IN');
  const fmt = n => 'Rs.' + Number(n || 0).toFixed(2);

  // Build subject
  const subject = customSubject
    ? customSubject.replace(/{invoiceNo}/g, invoiceNo).replace(/{firmName}/g, firm.name).replace(/{customerName}/g, bill.customerName)
    : `Invoice ${invoiceNo} from ${firm.name}`;

  // Build plain text body for the email preamble above the invoice
  const preamble = customBody
    ? customBody.replace(/{invoiceNo}/g, invoiceNo).replace(/{firmName}/g, firm.name).replace(/{customerName}/g, bill.customerName).replace(/{date}/g, date).replace(/{amount}/g, fmt(bill.total)).replace(/{mobile}/g, firm.mobile || '')
    : `Dear ${bill.customerName},\n\nPlease find your invoice ${invoiceNo} dated ${date} for ${fmt(bill.total)} attached below.\n\nThank you for your business!\n\n${firm.name}${firm.mobile ? '\n' + firm.mobile : ''}`;

  // Build full HTML email
  const invoiceHTML = buildInvoiceHTML(bill, firm, payments || []);
  const fullHTML = `
    <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto">
      <div style="padding:16px 24px;background:#fff;border-bottom:1px solid #eee;font-size:13px;color:#444;white-space:pre-line">${preamble}</div>
      ${invoiceHTML}
    </div>`;

  try {
    console.log('\n📧 [send-invoice] Starting invoice email send');
    console.log('[send-invoice] toEmail:', toEmail);
    console.log('[send-invoice] fromEmail from env:', fromEmail);

    // When using default domain email, cannot use display name format (Resend limitation)
    const isDefaultSender = fromEmail === 'info@shopos.co.in' || fromEmail.endsWith('@resend.dev');
    const fromField = isDefaultSender ? fromEmail : `${firm.name} <${fromEmail}>`;

    console.log('[send-invoice] isDefaultSender:', isDefaultSender);
    console.log('[send-invoice] fromField:', fromField);

    const payload = {
      from: fromField,
      to: [toEmail],
      subject,
      html: fullHTML,
    };
    // reply_to only if custom email set
    if (firm.senderEmail && !isDefaultSender) payload.reply_to = firm.senderEmail;
    if (firm.email && !isDefaultSender) payload.reply_to = firm.email;

    console.log('[send-invoice] Payload summary:', {from: payload.from, to: payload.to, subject: payload.subject, hasHtml: !!payload.html});
    console.log('[send-invoice] Calling Resend API at https://api.resend.com/emails');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log('[send-invoice] Resend response status:', res.status);
    console.log('[send-invoice] Resend response data:', JSON.stringify(data, null, 2));

    if (!res.ok) {
      console.log('[send-invoice] ❌ Resend API error - status:', res.status);
      return NextResponse.json({ error: data.message || data.name || JSON.stringify(data) }, { status: res.status });
    }

    console.log('[send-invoice] ✅ Email sent successfully, ID:', data.id);
    return NextResponse.json({ success: true, id: data.id });
  } catch (e) {
    console.error('[send-invoice] ❌ Exception:', e.message);
    console.error('[send-invoice] Stack:', e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}