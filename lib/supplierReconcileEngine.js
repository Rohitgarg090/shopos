// Supplier invoice reconciliation engine
// Pure functions, no DB calls — matches supplier statement lines to invoices

function charSimilarity(s1, s2) {
  const a = s1.toLowerCase(), b = s2.toLowerCase();
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;
  const editDist = getEditDistance(longer, shorter);
  return (longer.length - editDist) / longer.length;
}

function getEditDistance(s1, s2) {
  const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(0));
  for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;
  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  return track[s2.length][s1.length];
}

function cleanInvoiceNo(invNo) {
  return (invNo || '').toLowerCase().trim();
}

function daysDiff(d1, d2) {
  const ms = Math.abs(new Date(d1) - new Date(d2));
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function scoreSupplierMatch(stmtLine, invoice) {
  let score = 0;

  // Invoice number: strongest signal (unique per supplier)
  const stmtInvNo = cleanInvoiceNo(stmtLine.invoice_no);
  const ourInvNo = cleanInvoiceNo(invoice.invoice_no);

  if (stmtInvNo && ourInvNo) {
    if (stmtInvNo === ourInvNo) {
      score += 45; // Exact match
    } else if (charSimilarity(stmtInvNo, ourInvNo) > 0.8) {
      score += 20; // Fuzzy match
    }
  }

  // Amount matching
  const amtDiff = Math.abs(stmtLine.amount - invoice.total);
  if (amtDiff < 1) {
    score += 30; // Exact match
  } else if (amtDiff <= Math.max(invoice.total * 0.02, 50)) {
    score += 15; // Fuzzy (within 2% or ₹50)
  }

  // Date matching
  const daysOff = daysDiff(stmtLine.txn_date, invoice.invoice_date);
  if (daysOff === 0) {
    score += 15;
  } else if (daysOff <= 3) {
    score += 10;
  } else if (daysOff <= 7) {
    score += 6;
  } else if (daysOff <= 15) {
    score += 3;
  }

  // GSTIN matching
  const stmtGstin = (stmtLine.supplier_gstin || '').toLowerCase().trim();
  const ourGstin = (invoice.supplier_gstin || '').toLowerCase().trim();
  if (stmtGstin && ourGstin && stmtGstin === ourGstin) {
    score += 15;
  }

  // Supplier name fuzzy match (as secondary check)
  const stmtSupplier = (stmtLine.supplier_name || '').toLowerCase();
  const ourSupplier = (invoice.supplier_name || '').toLowerCase();
  if (stmtSupplier && ourSupplier && charSimilarity(stmtSupplier, ourSupplier) > 0.7) {
    score += 10;
  }

  return Math.max(0, score);
}

export function matchSupplierTransactions(stmtLines, invoices, lockedInvoiceIds = []) {
  const lockedSet = new Set(lockedInvoiceIds);

  return stmtLines.map(line => {
    const candidates = invoices
      .filter(inv => !lockedSet.has(inv.id))
      .map(inv => ({ invoice: inv, score: scoreSupplierMatch(line, inv) }))
      .sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      return { ...line, match_status: 'unmatched', match_score: 0, matched_invoice_id: null };
    }

    const best = candidates[0];
    let status = 'unmatched';
    if (best.score >= 80) {
      status = 'matched';
    } else if (best.score >= 50) {
      status = 'likely';
    }

    const discrepancy = Math.abs(line.amount - best.invoice.total);

    return {
      ...line,
      match_status: status,
      match_score: best.score,
      matched_invoice_id: best.invoice.id,
      match_ref: `${best.invoice.invoice_no || 'Invoice'} (${best.invoice.supplier_name})`,
      discrepancy: discrepancy > 1 ? discrepancy : 0
    };
  });
}
