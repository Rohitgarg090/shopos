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
      ref: [p.mode, p.chequeNo && '#' + p.chequeNo, p.upiRef && 'UTR ' + p.upiRef].filter(Boolean).join(' ') +
        (p.billId ? (cb.find(b => b.id === p.billId)?.invoiceNo ? ' vs ' + cb.find(b => b.id === p.billId).invoiceNo : '') : ' · Against Opening Balance'),
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

// ─────────────────────────── Shared document styling ───────────────────────────
const NAVY = [27, 58, 107], MUTED = [110, 110, 110], RULE = [224, 224, 224], SOFT = [248, 248, 248];
const GREEN = [46, 107, 31], RED = [155, 38, 38], PURPLE = [91, 62, 143], AMBER = [184, 105, 10];
const num = n => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const drcr = n => (Math.abs(n) < 0.005 ? '0.00' : num(Math.abs(n)) + (n > 0 ? ' Dr' : ' Cr'));
const fyOf = d => { const t = new Date(d); const y = t.getFullYear(); const s = t.getMonth() >= 3 ? y : y - 1; return `FY ${s}-${String((s + 1) % 100).padStart(2, '0')}`; };
const dIN = d => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

async function drawDocHeader(doc, firm, title, rightText) {
  const W = doc.internal.pageSize.getWidth(), M = 12;
  let y = M;
  const logo = await toDataUrl(firm.logo);
  let logoW = 0;
  if (logo) {
    const sz = await imgSize(logo);
    if (sz) {
      const h = 14, w = Math.min(40, (sz.w / sz.h) * h);
      try { doc.addImage(logo, imgFormat(logo), W - M - w, y, w, h); logoW = w + 4; } catch { /* skip */ }
    }
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...NAVY);
  doc.text(firm.name || '', M, y + 5); y += 10;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(60, 60, 60);
  const sub = [firm.shoptype, firm.address].filter(Boolean).join(' · ');
  if (sub) { const l = doc.splitTextToSize(sub, W - 2 * M - logoW); doc.text(l, M, y); y += l.length * 3.9; }
  const line2 = [firm.mobile && 'Mob: ' + firm.mobile, firm.email && 'Email: ' + firm.email, firm.gstin && 'GSTIN: ' + firm.gstin].filter(Boolean).join('    ');
  if (line2) { doc.text(line2, M, y); y += 4; }
  y = Math.max(y, M + 16) + 2;
  doc.setFillColor(...NAVY); doc.roundedRect(M, y, W - 2 * M, 8, 1.2, 1.2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(255, 255, 255);
  doc.text(title, M + 4, y + 5.4);
  if (rightText) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(rightText, W - M - 4, y + 5.4, { align: 'right' }); }
  return y + 12;
}

// Two side-by-side grey boxes: left = lines [[bold?, text]], right = rows [[label, value]]
function drawInfoBoxes(doc, y, leftTitle, leftLines, rightRows) {
  const W = doc.internal.pageSize.getWidth(), M = 12, bw = (W - 2 * M - 4) / 2;
  const lines = leftLines.flatMap(([b, t], i) => doc.splitTextToSize(String(t), bw - 8).map(x => [b, x, i === 0]));
  const h = Math.max(9 + lines.length * 4.4, 4 + rightRows.length * 5.2) + 2;
  [M, M + bw + 4].forEach(x => { doc.setFillColor(...SOFT); doc.setDrawColor(...RULE); doc.roundedRect(x, y, bw, h, 1.2, 1.2, 'FD'); });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(140, 140, 140);
  doc.text(leftTitle.toUpperCase(), M + 4, y + 4.8);
  let ly = y + 9.5;
  lines.forEach(([b, t, first]) => { doc.setFont('helvetica', b ? 'bold' : 'normal'); doc.setFontSize(first ? 10.5 : 8.5); doc.setTextColor(20, 20, 20); doc.text(t, M + 4, ly); ly += first ? 4.9 : 4.2; });
  let ry = y + 5.5;
  rightRows.forEach(([k, v]) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED); doc.text(k, M + bw + 8, ry);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20); doc.text(String(v), W - M - 4, ry, { align: 'right' });
    ry += 5.2;
  });
  return y + h + 4;
}

// Row of summary cards: [{label, value, color}]
function drawSummaryCards(doc, y, cards) {
  const W = doc.internal.pageSize.getWidth(), M = 12, gap = 3;
  const cw = (W - 2 * M - gap * (cards.length - 1)) / cards.length;
  cards.forEach((c, i) => {
    const x = M + i * (cw + gap);
    doc.setFillColor(255, 255, 255); doc.setDrawColor(...RULE); doc.roundedRect(x, y, cw, 14, 1.2, 1.2, 'FD');
    doc.setFillColor(...c.color); doc.rect(x, y, 1.2, 14, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.8); doc.setTextColor(...MUTED);
    doc.text(c.label.toUpperCase(), x + 4, y + 5);
    doc.setFontSize(10.5); doc.setTextColor(...c.color);
    doc.text(c.value, x + 4, y + 11);
  });
  return y + 18;
}

function stampFooters(doc, label) {
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 12;
  const n = doc.internal.getNumberOfPages();
  const when = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(...RULE); doc.line(M, H - 10, W - M, H - 10);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(150, 150, 150);
    doc.text(`${label}  ·  Generated on ${when}  ·  Indian financial year: 1 Apr – 31 Mar`, M, H - 6);
    doc.text(`Page ${i} of ${n}`, W - M, H - 6, { align: 'right' });
  }
}

const tableBase = {
  theme: 'striped',
  styles: { font: 'helvetica', fontSize: 8, cellPadding: { top: 1.9, bottom: 1.9, left: 1.8, right: 1.8 }, textColor: [25, 25, 25], lineColor: RULE, valign: 'middle', overflow: 'linebreak' },
  headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
  alternateRowStyles: { fillColor: [250, 250, 250] },
};

// ─────────────────────────── Customer account statement ───────────────────────────
const TYPE_LABEL = { OB: 'Opening Balance', INV: 'Sales Invoice', PMT: 'Payment Received', CHQ: 'Cheque Received', RET: 'Sales Return' };

export const generateCustomerPDF = async (firm, customer, entries, C, opts = {}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(), M = 12;
  const cust = (C || []).find(c => c.id === (customer.id || customer.customerId)) || customer;
  const ob = cust.openingBalance || 0;
  const sum = t => entries.filter(e => t.includes(e.type)).reduce((s, e) => s + (e.type === 'INV' ? e.debit : e.credit), 0);
  const invoiced = sum(['INV']), paid = sum(['PMT', 'CHQ']), returns = sum(['RET']);
  const closing = ob + invoiced - paid - returns;
  const first = entries[0]?.date, last = entries[entries.length - 1]?.date;
  const period = opts.dateFrom || opts.dateTo
    ? `${opts.dateFrom ? dIN(opts.dateFrom) : 'Start'} – ${opts.dateTo ? dIN(opts.dateTo) : 'Today'}`
    : first ? `${dIN(first)} – ${dIN(last)}` : 'No transactions';

  let y = await drawDocHeader(doc, firm, 'CUSTOMER ACCOUNT STATEMENT', fyOf(new Date()));
  y = drawInfoBoxes(doc, y, 'Statement of',
    [[1, cust.name || customer.name || ''], cust.shopname && cust.shopname.toUpperCase() !== (cust.name || '').toUpperCase() && [0, cust.shopname], cust.phone && [0, 'Ph: ' + cust.phone], cust.addr && [0, cust.addr], cust.gst && [1, 'GSTIN: ' + cust.gst]].filter(Boolean),
    [['Period', period], ['Opening Balance', drcr(ob)], ['Transactions', String(entries.filter(e => e.type !== 'OB').length)], ['Statement Date', dIN(new Date())]]);
  const cards = [
    { label: 'Opening Balance', value: 'Rs. ' + num(ob), color: AMBER },
    { label: 'Total Invoiced', value: 'Rs. ' + num(invoiced), color: RED },
    { label: 'Total Received', value: 'Rs. ' + num(paid), color: GREEN },
    returns > 0 && { label: 'Sales Returns', value: 'Rs. ' + num(returns), color: PURPLE },
    { label: closing >= 0 ? 'Balance Due' : 'Advance (Credit)', value: 'Rs. ' + num(Math.abs(closing)), color: closing > 0 ? RED : GREEN },
  ].filter(Boolean);
  y = drawSummaryCards(doc, y, cards);

  const body = entries.map(e => [
    dIN(e.date),
    TYPE_LABEL[e.type] || e.type,
    e.ref || '-',
    e.debit > 0 ? num(e.debit) : '',
    e.credit > 0 ? num(e.credit) : '',
    drcr(e.balance),
  ]);
  doc.autoTable({
    ...tableBase,
    startY: y,
    margin: { left: M, right: M, bottom: 16 },
    head: [['Date', 'Particulars', 'Reference', 'Debit (Rs.)', 'Credit (Rs.)', 'Balance (Rs.)']],
    body,
    foot: [['', 'Closing Balance', '', num(ob + invoiced), num(paid + returns), drcr(closing)]],
    footStyles: { fillColor: [235, 239, 246], textColor: NAVY, fontStyle: 'bold', fontSize: 8 },
    showFoot: 'lastPage',
    columnStyles: {
      0: { cellWidth: 24 }, 1: { cellWidth: 32 }, 2: { cellWidth: 'auto' },
      3: { cellWidth: 26, halign: 'right' }, 4: { cellWidth: 26, halign: 'right' }, 5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: d => {
      if ((d.section === 'head' || d.section === 'foot') && d.column.index >= 3) d.cell.styles.halign = 'right';
      if (d.section !== 'body') return;
      const e = entries[d.row.index];
      if (e.type === 'OB') { d.cell.styles.fillColor = [253, 243, 226]; }
      if (d.column.index === 3 && e.debit > 0) d.cell.styles.textColor = RED;
      if (d.column.index === 4 && e.credit > 0) d.cell.styles.textColor = GREEN;
      if (d.column.index === 1 && e.type === 'RET') d.cell.styles.textColor = PURPLE;
    },
  });

  let fy = doc.lastAutoTable.finalY + 8;
  const H = doc.internal.pageSize.getHeight();
  if (fy + 20 > H - 14) { doc.addPage(); fy = M + 4; }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
  doc.text('Dr = amount receivable from customer · Cr = advance / credit with us. Bounced cheques are excluded.', M, fy);
  doc.text('Please report any discrepancy within 15 days of receiving this statement.', M, fy + 4);
  doc.setFontSize(9); doc.setTextColor(30, 30, 30);
  doc.text('For ' + (firm.name || ''), W - M - 25, fy + 2, { align: 'center' });
  doc.setDrawColor(60, 60, 60); doc.line(W - M - 48, fy + 14, W - M - 2, fy + 14);
  doc.setFontSize(7.5); doc.setTextColor(...MUTED); doc.text('Authorised Signatory', W - M - 25, fy + 18, { align: 'center' });

  stampFooters(doc, (cust.name || '') + ' · Account Statement');
  return doc;
};

// ─────────────────────────── Ledger ───────────────────────────
const CHQ_LABEL = { deposited: 'Pending', cleared: 'Cleared', bounced: 'Bounced', redeposited: 'Re-Deposited', recleared: 'Re-Cleared' };
export const generateLedgerPDF = async (firm, withBal, filters = {}) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const M = 12;
  const rows = [...withBal].reverse(); // chronological, oldest first
  const tD = rows.reduce((s, r) => s + (r.debit || 0), 0), tC = rows.reduce((s, r) => s + (r.credit || 0), 0);
  const kind = filters.ledgerType && filters.ledgerType !== 'All' ? filters.ledgerType + ' Ledger' : 'Ledger';
  const period = filters.dateFrom || filters.dateTo
    ? `${filters.dateFrom ? dIN(filters.dateFrom) : 'Start'} – ${filters.dateTo ? dIN(filters.dateTo) : 'Today'}`
    : rows.length ? `${dIN(rows[0].date)} – ${dIN(rows[rows.length - 1].date)}` : '-';

  let y = await drawDocHeader(doc, firm, kind.toUpperCase() + ' STATEMENT', fyOf(new Date()));
  y = drawInfoBoxes(doc, y, 'Filters',
    [[1, filters.party ? filters.party : 'All parties'], [0, 'Entry type: ' + (filters.type && filters.type !== 'All' ? filters.type : 'All')], [0, 'Ledger: ' + (filters.ledgerType || 'All')]],
    [['Period', period], ['Entries', String(rows.length)], ['Statement Date', dIN(new Date())]]);
  y = drawSummaryCards(doc, y, [
    { label: 'Total Debit', value: 'Rs. ' + num(tD), color: RED },
    { label: 'Total Credit', value: 'Rs. ' + num(tC), color: GREEN },
    { label: tD - tC >= 0 ? 'Net Outstanding' : 'Net Credit', value: 'Rs. ' + num(Math.abs(tD - tC)), color: tD - tC > 0 ? RED : GREEN },
  ]);

  doc.autoTable({
    ...tableBase,
    startY: y,
    margin: { left: M, right: M, bottom: 16 },
    head: [['Date', 'Party', 'Type', 'Reference', 'Mode', 'Debit (Rs.)', 'Credit (Rs.)', 'Balance (Rs.)']],
    body: rows.map(r => [
      dIN(r.date), r.party || '-', r.tp === 'OB' ? 'Opening Bal' : (r.tp || r.type || '-'), r.tp === 'OB' ? 'Opening Balance' : (r.ref || '-'),
      r.payObj?.mode === 'Cheque' && r.payObj?.chequeStatus ? 'Cheque · ' + (CHQ_LABEL[r.payObj.chequeStatus] || r.payObj.chequeStatus) : (r.mode || ''),
      (r.debit || 0) > 0 ? num(r.debit) : '', (r.credit || 0) > 0 ? num(r.credit) : '',
      drcr(r.bal !== undefined ? r.bal : r.balance),
    ]),
    foot: [['', 'Total', '', '', '', num(tD), num(tC), drcr(tD - tC)]],
    footStyles: { fillColor: [235, 239, 246], textColor: NAVY, fontStyle: 'bold', fontSize: 8 },
    showFoot: 'lastPage',
    columnStyles: {
      0: { cellWidth: 24 }, 1: { cellWidth: 48, fontStyle: 'bold' }, 2: { cellWidth: 22 }, 3: { cellWidth: 'auto' },
      4: { cellWidth: 30 }, 5: { cellWidth: 28, halign: 'right' }, 6: { cellWidth: 28, halign: 'right' }, 7: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: d => {
      if ((d.section === 'head' || d.section === 'foot') && d.column.index >= 5) d.cell.styles.halign = 'right';
      if (d.section !== 'body') return;
      const r = rows[d.row.index];
      if (d.column.index === 5 && r.debit > 0) d.cell.styles.textColor = RED;
      if (d.column.index === 6 && r.credit > 0) d.cell.styles.textColor = GREEN;
      if (r.tp === 'OB') d.cell.styles.fillColor = [253, 243, 226];
    },
  });

  stampFooters(doc, kind);
  return doc;
};

// ─────────────────────────── E-Way Bill (draft) ───────────────────────────
export const generateEWayBillPDF = async ({ bill, firm, form }) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(), M = 12, CW = W - 2 * M;
  const items = bill.items || [];
  const taxable = items.reduce((s, i) => s + (i.rate || 0) * (i.qty || 0), 0);
  const tax = items.reduce((s, i) => s + (i.gstAmt || 0), 0);

  let y = await drawDocHeader(doc, firm, 'E-WAY BILL  (DRAFT · FOR MOVEMENT OF GOODS)', bill.invoiceNo || '');
  const section = (title, yy) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...NAVY);
    doc.text(title.toUpperCase(), M, yy + 3.5);
    doc.setDrawColor(...NAVY); doc.setLineWidth(0.4); doc.line(M, yy + 5, W - M, yy + 5); doc.setLineWidth(0.2);
    return yy + 7;
  };
  const kv = (yy, pairs) => {
    doc.autoTable({
      startY: yy, margin: { left: M, right: M }, theme: 'grid',
      body: pairs,
      styles: { fontSize: 8.5, cellPadding: 2, lineColor: RULE, textColor: [25, 25, 25] },
      columnStyles: { 0: { cellWidth: 38, fontStyle: 'bold', fillColor: SOFT, textColor: MUTED }, 1: { cellWidth: CW / 2 - 38 }, 2: { cellWidth: 38, fontStyle: 'bold', fillColor: SOFT, textColor: MUTED }, 3: { cellWidth: 'auto' } },
    });
    return doc.lastAutoTable.finalY + 5;
  };

  y = section('Part A — Consignment details', y);
  y = kv(y, [
    ['Supply Type', form.supplyType, 'Sub Type', form.subType],
    ['Document Type', form.docType, 'Document No.', bill.invoiceNo || ''],
    ['Document Date', form.docDate, 'Taxable Value', 'Rs. ' + num(taxable)],
  ]);
  y = drawInfoBoxes(doc, y, 'From (Consignor)',
    [[1, firm.name || ''], firm.gstin && [1, 'GSTIN: ' + firm.gstin], firm.address && [0, firm.address], [0, 'State: ' + (firm.state || '')]].filter(Boolean),
    [['To (Consignee)', bill.customerName || ''], ['GSTIN', bill.customerGST || 'URP'], ['Phone', bill.customerPhone || '-'], ['Address', (bill.customerAddr || '-').slice(0, 40)]]);

  y = section('Item details', y);
  doc.autoTable({
    ...tableBase,
    startY: y, margin: { left: M, right: M, bottom: 16 },
    head: [['#', 'Description', 'HSN', 'Qty', 'Taxable (Rs.)', 'GST', 'CGST (Rs.)', 'SGST (Rs.)', 'Total (Rs.)']],
    body: items.map((i, k) => [k + 1, i.name + (i.articleNo ? ' (' + i.articleNo + ')' : ''), i.hsn || '-', i.qty, num(i.rate * i.qty), (i.gstRate || 0) + '%', num((i.gstAmt || 0) / 2), num((i.gstAmt || 0) / 2), num(i.total)]),
    foot: [['', 'Total', '', items.reduce((s, i) => s + (i.qty || 0), 0), num(taxable), '', num(tax / 2), num(tax / 2), num(taxable + tax)]],
    footStyles: { fillColor: [235, 239, 246], textColor: NAVY, fontStyle: 'bold', fontSize: 8 },
    columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 16 }, 3: { cellWidth: 12, halign: 'center' }, 4: { cellWidth: 24, halign: 'right' }, 5: { cellWidth: 12, halign: 'center' }, 6: { cellWidth: 21, halign: 'right' }, 7: { cellWidth: 21, halign: 'right' }, 8: { cellWidth: 24, halign: 'right', fontStyle: 'bold' } },
    didParseCell: d => { if (d.section !== 'body') d.cell.styles.halign = [4, 6, 7, 8].includes(d.column.index) ? 'right' : [0, 3, 5].includes(d.column.index) ? 'center' : 'left'; },
  });
  y = doc.lastAutoTable.finalY + 6;
  if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = M; }

  y = section('Part B — Transport details', y);
  y = kv(y, [
    ['Transporter', form.transporterName || '-', 'Vehicle No.', form.vehicleNo || '-'],
    ['LR / Docket No.', form.lrNumber || '-', 'Distance (km)', form.distance || '-'],
    ['Mode', form.transMode || '-', 'Generated', dIN(new Date())],
  ]);
  doc.setFillColor(253, 243, 226); doc.roundedRect(M, y, CW, 11, 1.2, 1.2, 'F');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.8); doc.setTextColor(...AMBER);
  doc.text(doc.splitTextToSize('This is a draft prepared from the invoice. Generate the official E-Way Bill (with EWB number) on ewaybillgst.gov.in before moving the goods.', CW - 8), M + 4, y + 4.5);

  stampFooters(doc, 'E-Way Bill draft · ' + (bill.invoiceNo || ''));
  return doc;
};
