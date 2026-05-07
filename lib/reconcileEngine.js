// Bank transaction matching engine
// Pure functions, no DB calls — easily testable

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

function cleanRef(ref) {
  return (ref || '').toLowerCase().replace(/\s+/g, '').replace(/^0+/, '');
}

function daysDiff(d1, d2) {
  const ms = Math.abs(new Date(d1) - new Date(d2));
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function scoreMatch(txn, payment, isUPI = false) {
  let score = 0;

  // Amount matching
  const amtDiff = Math.abs(txn.amount - payment.amount);
  if (amtDiff < 1) {
    score += 50;
  } else if (amtDiff <= Math.max(payment.amount * 0.02, 50)) {
    score += 25;
  }

  // Date matching
  const daysOff = daysDiff(txn.txn_date, payment.date);
  if (daysOff === 0) {
    score += 25;
  } else if (daysOff <= 3) {
    score += 18;
  } else if (daysOff <= 7) {
    score += 10;
  } else if (daysOff <= 15) {
    score += 5;
  }

  const desc = (txn.description || '').toLowerCase();
  const ref = cleanRef(txn.ref_no);

  // UPI ref matching (exact)
  if (payment.upi_ref && ref === cleanRef(payment.upi_ref)) {
    score += 30;
  }

  // Cheque number matching
  if (payment.cheque_no && ref && ref.includes(cleanRef(payment.cheque_no))) {
    score += 30;
  }

  // Party name matching
  const party = (payment.party_name || '').toLowerCase();
  if (party && desc.includes(party)) {
    score += 15;
  } else if (party && charSimilarity(party, desc) > 0.7) {
    score += 8;
  }

  // Bank name in description
  if (payment.bank && desc.includes(payment.bank.toLowerCase())) {
    score += 5;
  }

  return Math.max(0, score);
}

export function matchTransactions(transactions, payments, lockedPaymentIds = []) {
  const lockedSet = new Set(lockedPaymentIds);
  const lockedPayments = {};
  for (const txn of transactions) {
    if (txn.matched_payment_id) lockedPayments[txn.matched_payment_id] = true;
  }

  return transactions.map(txn => {
    if (txn.txn_type === 'debit') {
      return { ...txn, match_status: 'unmatched', match_score: 0, matched_payment_id: null };
    }

    const candidates = payments
      .filter(p => !lockedSet.has(p.id) && !lockedPayments[p.id])
      .map(p => ({ payment: p, score: scoreMatch(txn, p) }))
      .sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      return { ...txn, match_status: 'unmatched', match_score: 0, matched_payment_id: null };
    }

    const best = candidates[0];
    let status = 'unmatched';
    if (best.score >= 80) {
      status = 'matched';
    } else if (best.score >= 50) {
      status = 'likely';
    }

    return {
      ...txn,
      match_status: status,
      match_score: best.score,
      matched_payment_id: best.payment.id,
      match_ref: `${best.payment.party_name || 'Payment'} - ${best.payment.mode || 'N/A'}`,
      matched_type: 'payment'
    };
  });
}
