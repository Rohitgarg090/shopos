import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const buildStatementRows = (B, Py, C, cust, dateFrom, dateTo) => {
  const cb = B.filter(b => b.customerId === cust && b.status !== 'cancelled');
  // Payments are linked by billId, not customerId - filter payments for this customer's bills
  const billIds = new Set(cb.map(b => b.id));
  const cp = (Py || []).filter(p => billIds.has(p.billId));

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
      ref: p.refNo || '-',
      debit: 0,
      credit: p.amount,
    });
  }

  // Sort by date ascending (oldest first)
  entries.sort((a, b) => a.date - b.date);

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
  const custData = C && Array.isArray(C) ? C.find(c => c.id === customer.customerId) : null;
  const totalInvoiced = entries.filter(e => e.type === 'INV').reduce((s, e) => s + e.debit, 0);
  const totalPaid = entries.filter(e => e.type !== 'INV' && e.type !== 'OB').reduce((s, e) => s + e.credit, 0);
  const balanceDue = totalInvoiced - totalPaid + (custData?.openingBalance || 0);

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

export const generateInvoicePDF = async (invoiceElement, fileName) => {
  const canvas = await html2canvas(invoiceElement, { scale: 2, allowTaint: true, useCORS: true });
  const imgData = canvas.toDataURL('image/jpeg', 0.9);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const imgWidth = 210;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const pageHeight = pdf.internal.pageSize.getHeight();

  let yPos = 0;
  let heightLeft = imgHeight;

  while (heightLeft > 0) {
    pdf.addImage(imgData, 'JPEG', 0, yPos, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    if (heightLeft > 0) pdf.addPage();
    yPos = -pageHeight;
  }

  return { pdf, fileName };
};
