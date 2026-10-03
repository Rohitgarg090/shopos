import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Date-only values ("2026-10-03") parse as UTC midnight, so a payment entered on the
// same day as an invoice would sort before it. Compare by local day, then by created time.
const localDay = v => {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) { const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d).getTime(); }
  const t = new Date(v); return new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
};
export const compareEntries = (a, b) =>
  (localDay(a.date) - localDay(b.date)) ||
  (new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date)) ||
  ((a.order ?? 1) - (b.order ?? 1));

export const buildStatementRows = (B, Py, C, cust, dateFrom, dateTo, Ret = []) => {
  const cb = B.filter(b => b.customerId === cust && b.status !== 'cancelled');
  // Payments are linked by billId, not customerId - filter payments for this customer's bills
  const billIds = new Set(cb.map(b => b.id));
  const cp = (Py || []).filter(p => billIds.has(p.billId) ||
    (!p.billId && p.paymentType !== 'supplier' && p.customerId != null && String(p.customerId) === String(cust)));

  const entries = [];
  const validPay = p => p.mode !== 'Cheque' || p.chequeStatus !== 'bounced';

  // Opening balance row
  const custData = C && Array.isArray(C) ? C.find(c => c.id === cust) : null;
  if (custData?.openingBalanceDate && custData?.openingBalance !== undefined && custData.openingBalance !== 0) {
    entries.push({
      date: new Date(custData.openingBalanceDate).getTime(),
      type: 'OB',
      ref: 'Opening Balance',
      debit: custData.openingBalance > 0 ? custData.openingBalance : 0,
      credit: custData.openingBalance < 0 ? Math.abs(custData.openingBalance) : 0,
      isOpening: true,
      order: 0,
    });
  }

  // Invoices
  for (const b of cb) {
    const d = new Date(b.date).getTime();
    if (dateFrom && d < dateFrom) continue;
    if (dateTo && d > dateTo) continue;
    entries.push({
      date: d,
      type: 'INV',
      createdAt: b.date,
      ref: b.invoiceNo,
      debit: b.total,
      credit: 0,
      cancelled: b.status === 'cancelled',
    });
  }

  // Payments
  for (const p of cp) {
    if (!validPay(p)) continue;
    const d = new Date(p.date).getTime();
    if (dateFrom && d < dateFrom) continue;
    if (dateTo && d > dateTo) continue;
    entries.push({
      date: d,
      type: p.mode === 'Cheque' ? 'CHQ' : 'PMT',
      createdAt: p.createdAt,
      ref: p.billId ? (p.refNo || '-') : 'Against Opening Balance',
      debit: 0,
      credit: p.amount,
    });
  }

  // Customer returns (credit notes)
  for (const r of Ret || []) {
    if (r.type !== 'customer' || !(r.customerId === cust || billIds.has(r.billId))) continue;
    const d = new Date(r.date).getTime();
    if (dateFrom && d < dateFrom) continue;
    if (dateTo && d > dateTo) continue;
    const inv = r.billId ? cb.find(b => b.id === r.billId)?.invoiceNo : '';
    entries.push({
      date: d,
      type: 'RET',
      createdAt: r.createdAt,
      ref: 'Return' + (inv ? ' vs ' + inv : ''),
      debit: 0,
      credit: r.total,
    });
  }

  // Sort by date ascending (oldest first)
  entries.sort(compareEntries);

  // Calculate running balance
  let balance = 0;
  entries.forEach(e => {
    balance += (e.debit - e.credit);
    e.balance = balance;
  });

  return entries;
};

export const generateCustomerPDF = (firm, customer, entries, C) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 10;

  // Header
  doc.setFontSize(14);
  doc.text(firm.name || 'ShopOS', 10, yPos);
  yPos += 6;
  doc.setFontSize(9);
  doc.text(`GSTIN: ${firm.gstin || '-'}`, 10, yPos);
  yPos += 4;
  doc.text(`Address: ${firm.address || '-'}`, 10, yPos);
  yPos += 4;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  doc.text(`Statement Generated On: ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`, 10, yPos);
  yPos += 8;

  // Customer details
  doc.setFontSize(11);
  doc.text('Customer Account Statement', 10, yPos);
  yPos += 6;
  doc.setFontSize(9);
  doc.text(`Name: ${customer.name || customer.customerName || '-'}`, 10, yPos);
  yPos += 4;
  doc.text(`Phone: ${customer.phone || customer.customerPhone || '-'}`, 10, yPos);
  yPos += 4;
  doc.text(`Address: ${customer.address || customer.customerAddr || '-'}`, 10, yPos);
  yPos += 8;

  // Summary
  const custData = C && Array.isArray(C) ? C.find(c => c.id === (customer.id || customer.customerId)) : null;
  const totalInvoiced = entries.filter(e => e.type === 'INV').reduce((s, e) => s + e.debit, 0);
  const totalPaid = entries.filter(e => e.type === 'PMT' || e.type === 'CHQ').reduce((s, e) => s + e.credit, 0);
  const totalReturns = entries.filter(e => e.type === 'RET').reduce((s, e) => s + e.credit, 0);
  const balanceDue = totalInvoiced - totalPaid - totalReturns + (custData?.openingBalance || 0);

  doc.setFont(undefined, 'bold');
  doc.text('Summary', 10, yPos);
  doc.setFont(undefined, 'normal');
  yPos += 5;
  doc.setFontSize(8);
  doc.text(`Opening Balance: ${(custData?.openingBalance || 0).toFixed(2)} (as on ${custData?.openingBalanceDate || '-'})`, 10, yPos);
  yPos += 4;
  doc.text(`Total Invoiced: ${totalInvoiced.toFixed(2)}`, 10, yPos);
  yPos += 4;
  doc.text(`Total Paid: ${totalPaid.toFixed(2)}`, 10, yPos);
  yPos += 4;
  if (totalReturns > 0) {
    doc.text(`Sales Returns: ${totalReturns.toFixed(2)}`, 10, yPos);
    yPos += 4;
  }
  doc.text(`Balance Due: ${balanceDue.toFixed(2)}`, 10, yPos);
  yPos += 8;

  // Table
  const tableRows = entries.map(e => [
    new Date(e.date).toLocaleDateString('en-IN'),
    e.type,
    e.ref || '-',
    e.debit > 0 ? e.debit.toFixed(2) : '-',
    e.credit > 0 ? e.credit.toFixed(2) : '-',
    e.balance.toFixed(2),
  ]);

  doc.autoTable({
    head: [['Date', 'Type', 'Ref', 'Debit', 'Credit', 'Balance']],
    body: tableRows,
    startY: yPos,
    margin: { top: 10, right: 10, left: 10, bottom: 20 },
    styles: { fontSize: 8, halign: 'right' },
    headStyles: { fillColor: [200, 200, 200], halign: 'center' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 25 },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'left', cellWidth: 30 },
      3: { halign: 'right', cellWidth: 25 },
      4: { halign: 'right', cellWidth: 25 },
      5: { halign: 'right', cellWidth: 30 },
    },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth - 20,
        pageHeight - 10,
        { align: 'right' }
      );
    },
  });

  // Add FYI note at the bottom
  const finalYPos = doc.lastAutoTable?.finalY || yPos + 50;
  doc.setFontSize(7);
  doc.setFont(undefined, 'normal');
  doc.text('FYI: Indian Financial Year runs from 01-Apr to 31-Mar', 10, Math.min(finalYPos + 8, pageHeight - 15));

  return doc;
};

export const generateLedgerPDF = (firm, withBal, filters) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 10;

  // Header
  doc.setFontSize(14);
  doc.text(firm.name || 'ShopOS', 10, yPos);
  yPos += 6;
  doc.setFontSize(9);
  doc.text(`Ledger Report`, 10, yPos);
  yPos += 4;
  doc.setFontSize(8);
  doc.text(`Statement Generated On: ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`, 10, yPos);
  yPos += 4;

  if (filters) {
    const filterText = [];
    if (filters.party) filterText.push(`Party: ${filters.party}`);
    if (filters.type) filterText.push(`Type: ${filters.type}`);
    if (filters.dateFrom || filters.dateTo) {
      filterText.push(`Date: ${filters.dateFrom || '-'} to ${filters.dateTo || '-'}`);
    }
    if (filterText.length > 0) {
      doc.text(filterText.join(' | '), 10, yPos);
      yPos += 4;
    }
  }
  yPos += 4;

  // Table
  const tableRows = withBal.map(row => [
    new Date(row.date).toLocaleDateString('en-IN'),
    row.party || '-',
    row.tp || row.type || '-',
    row.ref || '-',
    (row.debit || 0) > 0 ? (row.debit || 0).toFixed(2) : '-',
    (row.credit || 0) > 0 ? (row.credit || 0).toFixed(2) : '-',
    ((row.bal !== undefined ? row.bal : row.balance) || 0).toFixed(2),
  ]);

  const totals = withBal.reduce(
    (acc, r) => ({ debit: acc.debit + r.debit, credit: acc.credit + r.credit }),
    { debit: 0, credit: 0 }
  );

  tableRows.push([
    '', 'TOTAL', '', '',
    totals.debit.toFixed(2),
    totals.credit.toFixed(2),
    (totals.debit - totals.credit).toFixed(2),
  ]);

  doc.autoTable({
    head: [['Date', 'Party', 'Type', 'Ref', 'Debit', 'Credit', 'Balance']],
    body: tableRows,
    startY: yPos,
    margin: { top: 10, right: 10, left: 10, bottom: 20 },
    styles: { fontSize: 8, halign: 'right' },
    headStyles: { fillColor: [200, 200, 200], halign: 'center' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 25 },
      1: { halign: 'left', cellWidth: 30 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'left', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'right', cellWidth: 28 },
      6: { halign: 'right', cellWidth: 30 },
    },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth - 10,
        pageHeight - 10,
        { align: 'right' }
      );
    },
  });

  // Add FYI note at the bottom
  const finalYPos = doc.lastAutoTable?.finalY || yPos + 50;
  doc.setFontSize(7);
  doc.setFont(undefined, 'normal');
  doc.text('FYI: Indian Financial Year runs from 01-Apr to 31-Mar', 10, Math.min(finalYPos + 8, pageHeight - 15));

  return doc;
};

const inr = n => 'Rs. ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toDataUrl = async src => {
  if (!src) return null;
  if (src.startsWith('data:')) return src;
  try {
    const blob = await (await fetch(src)).blob();
    return await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
  } catch { return null; }
};

const imgSize = dataUrl => new Promise(res => {
  const im = new Image();
  im.onload = () => res({ w: im.naturalWidth || 1, h: im.naturalHeight || 1 });
  im.onerror = () => res(null);
  im.src = dataUrl;
});

const imgFormat = d => (d.startsWith('data:image/png') ? 'PNG' : 'JPEG');

// Text-based A4 tax invoice (crisp, searchable, no screenshot artefacts).
export const generateInvoicePDF = async ({ bill, firm, paid = 0, amountInWords = '' }) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const M = 12, CW = W - 2 * M;
  const NAVY = [27, 58, 107], GREY = [100, 100, 100], LINE = [224, 224, 224], BG = [248, 248, 248];
  const items = bill.items || [];
  const isCash = !!bill.isRelative;
  const ensure = (y, need) => { if (y + need > H - 14) { doc.addPage(); return M; } return y; };

  // ── Header: firm (left), UPI QR (right)
  let y = M;
  const logo = await toDataUrl(firm.logo);
  if (logo) {
    const sz = await imgSize(logo);
    if (sz) {
      const h = 16, w = Math.min(50, (sz.w / sz.h) * h);
      try { doc.addImage(logo, imgFormat(logo), M, y, w, h); y += h + 3; } catch { /* unsupported image */ }
    }
  }
  let qr = await toDataUrl(firm.upiQrImage);
  if (!qr && firm.upiId) {
    try {
      const QRCode = (await import('qrcode')).default;
      qr = await QRCode.toDataURL(`upi://pay?pa=${firm.upiId}&pn=${encodeURIComponent(firm.name || '')}&cu=INR`, { width: 300, margin: 0, errorCorrectionLevel: 'H' });
    } catch { qr = null; }
  }
  if (qr) {
    try {
      doc.addImage(qr, imgFormat(qr), W - M - 26, M, 26, 26);
      doc.setFontSize(7); doc.setTextColor(...GREY);
      doc.text('Scan to pay', W - M - 13, M + 29.5, { align: 'center' });
    } catch { /* ignore bad QR image */ }
  }
  const leftW = CW - 34;
  doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text(firm.name || '', M, y + 5); y += 10;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GREY);
  if (firm.shoptype) { doc.text(firm.shoptype, M, y); y += 4.5; }
  doc.setTextColor(40, 40, 40);
  if (firm.address) { const a = doc.splitTextToSize(firm.address, leftW); doc.text(a, M, y); y += a.length * 4.2; }
  const contact = [firm.mobile && 'Mob: ' + firm.mobile, firm.email && 'Email: ' + firm.email].filter(Boolean).join('    ');
  if (contact) { doc.text(contact, M, y); y += 4.5; }
  if (firm.gstin) { doc.setFont('helvetica', 'bold'); doc.text('GSTIN: ' + firm.gstin, M, y); doc.setFont('helvetica', 'normal'); y += 4.5; }
  y = Math.max(y, M + 33) + 1;

  // ── Title bar
  doc.setFillColor(...NAVY); doc.roundedRect(M, y, CW, 8, 1.2, 1.2, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('TAX INVOICE', M + 4, y + 5.5);
  if (isCash) { doc.setFontSize(8); doc.text('CASH MEMO', W - M - 4, y + 5.5, { align: 'right' }); }
  y += 11;

  // ── Bill To / Invoice details boxes
  const boxW = (CW - 4) / 2;
  const billLines = [
    ['b', bill.customerName || ''],
    bill.customerPhone && ['n', 'Ph: ' + bill.customerPhone],
    ...(bill.customerAddr ? doc.splitTextToSize(bill.customerAddr, boxW - 8).map(l => ['n', l]) : []),
    bill.customerGST && ['b', 'GSTIN: ' + bill.customerGST],
  ].filter(Boolean);
  const meta = [
    ['Invoice No.', bill.invoiceNo || '#' + bill.id],
    ['Date', new Date(bill.date).toLocaleDateString('en-IN')],
    ['Place of Supply', firm.state || ''],
    bill.transportName && ['Transport', bill.transportName],
    (bill.lrNumber || bill.biltyNo) && ['LR / Docket No.', bill.lrNumber || bill.biltyNo],
  ].filter(Boolean);
  const boxH = Math.max(10 + billLines.length * 4.6, 6 + meta.length * 5.2) + 2;
  [[M, boxH], [M + boxW + 4, boxH]].forEach(([x]) => { doc.setFillColor(...BG); doc.setDrawColor(...LINE); doc.roundedRect(x, y, boxW, boxH, 1.2, 1.2, 'FD'); });
  doc.setFontSize(7); doc.setTextColor(140, 140, 140); doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', M + 4, y + 5);
  let by = y + 10;
  billLines.forEach(([w, t], i) => {
    doc.setFont('helvetica', w === 'b' ? 'bold' : 'normal'); doc.setFontSize(i === 0 ? 11 : 9); doc.setTextColor(20, 20, 20);
    doc.text(t, M + 4, by); by += i === 0 ? 5 : 4.4;
  });
  let my = y + 6;
  meta.forEach(([k, v]) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GREY); doc.text(k, M + boxW + 8, my);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20); doc.text(String(v), W - M - 4, my, { align: 'right' });
    my += 5.2;
  });
  y += boxH + 4;

  // ── Items
  doc.autoTable({
    startY: y,
    margin: { left: M, right: M, bottom: 16 },
    head: [['#', 'Description', 'Art. No', 'HSN', 'Size', 'Qty', 'Rate', 'GST', 'CGST', 'SGST', 'Total']],
    body: items.map((it, i) => [
      i + 1,
      it.name,
      it.articleNo || '-',
      it.hsn || '-',
      it.size || '-',
      it.qty || 0,
      inr(it.rate).replace('Rs. ', ''),
      (it.gstRate || 0) + '%',
      inr((it.gstAmt || 0) / 2).replace('Rs. ', ''),
      inr((it.gstAmt || 0) / 2).replace('Rs. ', ''),
      inr(it.total).replace('Rs. ', ''),
    ]),
    theme: 'striped',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 }, valign: 'middle', textColor: [25, 25, 25], lineColor: LINE, overflow: 'linebreak' },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 'auto', fontStyle: 'bold' },
      2: { cellWidth: 16 }, 3: { cellWidth: 14 }, 4: { cellWidth: 16 },
      5: { cellWidth: 10, halign: 'center' }, 6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 11, halign: 'center' }, 8: { cellWidth: 16, halign: 'right' },
      9: { cellWidth: 16, halign: 'right' }, 10: { cellWidth: 21, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: d => {
      if (d.section === 'head') d.cell.styles.halign = [0, 5, 7].includes(d.column.index) ? 'center' : [6, 8, 9, 10].includes(d.column.index) ? 'right' : 'left';
    },
  });
  y = doc.lastAutoTable.finalY + 5;

  // ── GST summary + words (left) | totals (right)
  const gst = {};
  items.forEach(it => { const r = it.gstRate || 0; gst[r] = gst[r] || { taxable: 0, tax: 0 }; gst[r].taxable += (it.rate || 0) * (it.qty || 0); gst[r].tax += it.gstAmt || 0; });
  const totals = [
    ['Subtotal', inr(bill.subtotal)],
    ...(!isCash && (bill.gst || 0) > 0 ? [['CGST', inr(bill.gst / 2)], ['SGST', inr(bill.gst / 2)]] : []),
    ...(isCash && (bill.markup || 0) > 0 ? [['Other Charges', inr(bill.markup)]] : []),
    ...((bill.discount || 0) > 0 ? [['Discount', '- ' + inr(bill.discount)]] : []),
  ];
  const rightW = 72, rightX = W - M - rightW, leftW2 = CW - rightW - 6;
  const need = Math.max(totals.length * 6 + 10 + (paid > 0 ? 13 : 0), 30);
  y = ensure(y, need);
  const startY = y;

  let ly = y;
  if (!isCash && Object.keys(gst).length) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(140, 140, 140);
    doc.text('GST SUMMARY (CGST + SGST)', M, ly + 2);
    doc.autoTable({
      startY: ly + 3.5,
      margin: { left: M, right: W - M - leftW2 },
      tableWidth: leftW2,
      head: [['Rate', 'Taxable', 'CGST', 'SGST', 'Total Tax']],
      body: Object.entries(gst).map(([r, v]) => [r + '%', inr(v.taxable), inr(v.tax / 2), inr(v.tax / 2), inr(v.tax)]),
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.4, lineColor: LINE, textColor: [30, 30, 30] },
      headStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold' },
      columnStyles: { 0: { halign: 'left' }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } },
      didParseCell: d => { if (d.section === 'head' && d.column.index > 0) d.cell.styles.halign = 'right'; },
    });
    ly = doc.lastAutoTable.finalY + 3;
  }
  if (amountInWords) {
    doc.setFontSize(8);
    const words = doc.splitTextToSize(amountInWords, leftW2 - 6);
    const wh = 7 + words.length * 3.8;
    doc.setFillColor(245, 245, 245); doc.roundedRect(M, ly, leftW2, wh, 1.2, 1.2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setTextColor(40, 40, 40); doc.text('Amount in Words:', M + 3, ly + 4.5);
    doc.setFont('helvetica', 'italic'); doc.text(words, M + 3, ly + 8.5);
    ly += wh;
  }

  let ry = startY;
  doc.setFontSize(9);
  totals.forEach(([k, v]) => {
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY); doc.text(k, rightX + 3, ry + 4);
    doc.setTextColor(25, 25, 25); doc.text(v, W - M - 3, ry + 4, { align: 'right' });
    ry += 6;
  });
  doc.setFillColor(...NAVY); doc.rect(rightX, ry, rightW, 8, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
  doc.text('Grand Total', rightX + 3, ry + 5.4); doc.text(inr(bill.total), W - M - 3, ry + 5.4, { align: 'right' });
  ry += 8;
  if (paid > 0) {
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(46, 107, 31);
    doc.text('Amount Paid', rightX + 3, ry + 4.5); doc.text(inr(paid), W - M - 3, ry + 4.5, { align: 'right' });
    ry += 6.5;
    doc.setFillColor(253, 240, 240); doc.rect(rightX, ry, rightW, 7, 'F');
    doc.setFont('helvetica', 'bold'); doc.setTextColor(155, 38, 38);
    doc.text('Balance Due', rightX + 3, ry + 4.8); doc.text(inr(Math.max(0, bill.total - paid)), W - M - 3, ry + 4.8, { align: 'right' });
    ry += 7;
  }
  y = Math.max(ly, ry) + 5;

  // ── Bank
  if (firm.bankName) {
    y = ensure(y, 10);
    doc.setDrawColor(...LINE); doc.roundedRect(M, y, CW, 7.5, 1.2, 1.2, 'S');
    doc.setFontSize(8.5); doc.setTextColor(30, 30, 30);
    const parts = [['Bank: ', firm.bankName], ['A/C: ', firm.bankAccount || '-'], ['IFSC: ', firm.bankIFSC || '-']];
    let x = M + 3;
    parts.forEach(([k, v], i) => {
      doc.setFont('helvetica', 'bold'); doc.text(k, x, y + 5); x += doc.getTextWidth(k);
      doc.setFont('helvetica', 'normal'); doc.text(String(v), x, y + 5); x += doc.getTextWidth(String(v)) + (i < 2 ? 6 : 0);
    });
    y += 11;
  }

  // ── Terms
  if (firm.terms) {
    doc.setFontSize(7.5);
    const t = doc.splitTextToSize(firm.terms, CW);
    y = ensure(y, 6 + t.length * 3.4);
    doc.setDrawColor(...LINE); doc.line(M, y, W - M, y);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(140, 140, 140);
    doc.text('TERMS AND CONDITIONS', M, y + 4);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(90, 90, 90);
    doc.text(t, M, y + 8);
    y += 9 + t.length * 3.4;
  }

  // ── Signatory
  y = ensure(y, 24);
  doc.setDrawColor(...LINE); doc.line(M, y, W - M, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(30, 30, 30);
  doc.text('For ' + (firm.name || ''), W - M - 25, y + 6, { align: 'center' });
  doc.setDrawColor(60, 60, 60); doc.line(W - M - 48, y + 18, W - M - 2, y + 18);
  doc.setFontSize(7.5); doc.setTextColor(110, 110, 110);
  doc.text('Authorised Signatory', W - M - 25, y + 22, { align: 'center' });
  doc.text('This is a computer generated invoice.', M, y + 22);

  // ── Page numbers
  const pages = doc.internal.getNumberOfPages();
  if (pages > 1) {
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i); doc.setFontSize(7); doc.setTextColor(150, 150, 150);
      doc.text(`${bill.invoiceNo || ''}  ·  Page ${i} of ${pages}`, W - M, H - 6, { align: 'right' });
    }
  }
  return doc;
};
