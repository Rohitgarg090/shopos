// Supplier statement reconciliation (pure functions, no DB/network).
//
// Sign convention everywhere: positive balance = WE OWE THE SUPPLIER.
// Supplier's statement is their ledger of our account: debit = invoice to us
// (we owe more), credit = payment received / credit note (we owe less).

const norm = s => (s || '').toString().trim().toUpperCase();

const dayNum = v => {
  if (!v) return null;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    const [y, m, d] = v.slice(0, 10).split('-').map(Number);
    return Date.UTC(y, m - 1, d) / 864e5;
  }
  const t = new Date(v);
  return isNaN(t) ? null : Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / 864e5;
};
export const isoOf = n => (n == null ? '' : new Date(n * 864e5).toISOString().slice(0, 10));

// "INV/1510", "1510", "SG-001510" → comparable forms
const refKeys = r => {
  const raw = (r || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const digits = raw.replace(/\D/g, '').replace(/^0+/, '');
  return { raw, digits };
};
const refsMatch = (a, b) => {
  const A = refKeys(a), B = refKeys(b);
  if (!A.raw || !B.raw) return false;
  if (A.raw === B.raw) return true;
  if (A.digits && B.digits && A.digits.length >= 3 && A.digits === B.digits) return true;
  const [s, l] = A.raw.length <= B.raw.length ? [A.raw, B.raw] : [B.raw, A.raw];
  return s.length >= 3 && /\d/.test(s) && l.endsWith(s);
};

const money = n => Math.round((+n || 0) * 100) / 100;

// Turn the AI extraction into typed statement lines. Fixes statements whose
// debit/credit columns are from the other side (invoices showing as credits).
export function normaliseStatement(ext) {
  const lines = (ext?.lines || []).map((l, i) => ({
    idx: i,
    day: dayNum(l.date),
    date: l.date || '',
    type: ['invoice', 'payment', 'credit_note', 'debit_note'].includes(l.type) ? l.type : 'other',
    ref: (l.ref || '').toString().trim(),
    description: (l.description || '').toString().trim(),
    debit: money(Math.abs(+l.debit || 0)),
    credit: money(Math.abs(+l.credit || 0)),
  })).filter(l => l.debit > 0 || l.credit > 0);

  const invDr = lines.filter(l => l.type === 'invoice').reduce((s, l) => s + l.debit, 0);
  const invCr = lines.filter(l => l.type === 'invoice').reduce((s, l) => s + l.credit, 0);
  const flipped = invCr > invDr;
  if (flipped) lines.forEach(l => { const d = l.debit; l.debit = l.credit; l.credit = d; });

  const bal = b => {
    if (!b || b.amount == null || b.amount === '') return null;
    const a = Math.abs(+b.amount || 0);
    let dr = (b.side || 'Dr').toString().toLowerCase().startsWith('d');
    if (flipped) dr = !dr;
    return money(dr ? a : -a);
  };
  return {
    supplierName: ext?.supplierName || '',
    periodFrom: ext?.periodFrom || '',
    periodTo: ext?.periodTo || '',
    opening: bal(ext?.openingBalance),
    closing: bal(ext?.closingBalance),
    lines,
    flipped,
  };
}

function greedy(pairs) {
  pairs.sort((a, b) => b.score - a.score);
  const usedT = new Set(), usedO = new Set(), out = [];
  for (const p of pairs) {
    if (usedT.has(p.t.idx) || usedO.has(p.o.key)) continue;
    usedT.add(p.t.idx); usedO.add(p.o.key); out.push(p);
  }
  return out;
}

export function reconcileSupplier({ statement, supplierName, invoices = [], payments = [], returns = [] }) {
  const st = statement;
  const name = norm(supplierName);
  const today = dayNum(new Date());

  const lineDays = st.lines.map(l => l.day).filter(d => d != null);
  const from = dayNum(st.periodFrom) ?? (lineDays.length ? Math.min(...lineDays) : today);
  const to = dayNum(st.periodTo) ?? (lineDays.length ? Math.max(...lineDays) : today);

  // ── our books for this supplier
  const ours = [
    ...invoices.filter(i => norm(i.supplierName) === name).map(i => ({ key: 'i' + i.id, kind: 'invoice', id: i.id, day: dayNum(i.invoiceDate || i.createdAt), ref: i.invoiceNo || '', amount: money(i.total), sign: 1 })),
    ...payments.filter(p => p.paymentType === 'supplier' && norm(p.supplierId || p.partyName) === name && !(p.mode === 'Cheque' && p.chequeStatus === 'bounced'))
      .map(p => ({ key: 'p' + p.id, kind: 'payment', id: p.id, day: dayNum(p.date || p.createdAt), ref: [p.mode, p.chequeNo && '#' + p.chequeNo, p.upiRef].filter(Boolean).join(' '), chequeNo: p.chequeNo || p.upiRef || '', amount: money(p.amount), sign: -1 })),
    ...returns.filter(r => r.type === 'supplier' && norm(r.supplierName || r.supplierId) === name)
      .map(r => ({ key: 'r' + r.id, kind: 'return', id: r.id, day: dayNum(r.date || r.createdAt), ref: 'Return', amount: money(r.total), sign: -1 })),
  ].filter(o => o.day != null);

  const before = ours.filter(o => o.day < from);
  const inPeriod = ours.filter(o => o.day >= from && o.day <= to);
  const ourOpening = money(before.reduce((s, o) => s + o.sign * o.amount, 0));
  const ourClosing = money(ourOpening + inPeriod.reduce((s, o) => s + o.sign * o.amount, 0));

  // ── their side
  const theirOpening = st.opening ?? 0;
  const computedClosing = money(theirOpening + st.lines.reduce((s, l) => s + l.debit - l.credit, 0));
  const theirClosing = st.closing ?? computedClosing;
  const statementGap = st.closing != null ? money(st.closing - computedClosing) : 0;

  const theirKind = l => (l.type === 'invoice' && l.debit > 0 ? 'invoice' : l.type === 'payment' && l.credit > 0 ? 'payment' : l.type === 'credit_note' && l.credit > 0 ? 'return' : null);
  const tAmt = l => (l.debit > 0 ? l.debit : l.credit);
  const pairs = [];
  for (const t of st.lines) {
    const kind = theirKind(t);
    if (!kind) continue;
    for (const o of inPeriod) {
      if (o.kind !== kind) continue;
      const diff = Math.abs(tAmt(t) - o.amount);
      const dd = t.day != null && o.day != null ? Math.abs(t.day - o.day) : 99;
      const refOk = refsMatch(t.ref, o.ref) || (kind === 'payment' && o.chequeNo && refsMatch(t.ref + ' ' + t.description, o.chequeNo));
      let ok = false, score = 0;
      if (kind === 'invoice') {
        if (refOk) { ok = true; score += 100; }
        else if (diff <= 1 && dd <= 7) ok = true;
      } else if (kind === 'payment') {
        if (diff <= 1 && (dd <= 7 || refOk)) ok = true;
        if (refOk) score += 50;
      } else if (diff <= 1 && dd <= 20) ok = true;
      if (!ok) continue;
      score += diff <= 1 ? 40 : 0;
      score += Math.max(0, 20 - dd);
      pairs.push({ t, o, kind, score, diff: money(tAmt(t) - o.amount) });
    }
  }
  const chosen = greedy(pairs);
  const usedT = new Set(chosen.map(p => p.t.idx)), usedO = new Set(chosen.map(p => p.o.key));

  const matched = chosen.filter(p => Math.abs(p.diff) <= 1);
  const mismatched = chosen.filter(p => Math.abs(p.diff) > 1);
  const onlyTheirs = st.lines.filter(l => !usedT.has(l.idx));
  const onlyOurs = inPeriod.filter(o => !usedO.has(o.key));

  // ── explain the difference exactly: theirClosing − ourClosing
  const sumBy = (arr, f) => money(arr.reduce((s, x) => s + f(x), 0));
  const ex = [];
  const add = (label, amount, note) => { if (Math.abs(amount) >= 0.01) ex.push({ label, amount: money(amount), note }); };
  add('Opening balance differs', theirOpening - ourOpening, 'Balance at the start of the statement period');
  add('Invoices missing in your books', sumBy(onlyTheirs.filter(l => theirKind(l) === 'invoice'), l => l.debit), 'Add these purchase invoices');
  add('Payments not in your books', -sumBy(onlyTheirs.filter(l => theirKind(l) === 'payment'), l => l.credit), 'Supplier received money you have not recorded');
  add('Credit notes not in your books', -sumBy(onlyTheirs.filter(l => theirKind(l) === 'return'), l => l.credit), 'Record the supplier return');
  add('Other entries on their statement', sumBy(onlyTheirs.filter(l => !theirKind(l)), l => l.debit - l.credit), 'Charges, discounts, adjustments');
  add('Invoices missing on their statement', -sumBy(onlyOurs.filter(o => o.kind === 'invoice'), o => o.amount), 'Check if the invoice belongs to this supplier/period');
  add('Payments not yet on their statement', sumBy(onlyOurs.filter(o => o.kind === 'payment'), o => o.amount), 'Share payment proof with the supplier');
  add('Returns not yet on their statement', sumBy(onlyOurs.filter(o => o.kind === 'return'), o => o.amount), 'Ask the supplier for a credit note');
  add('Amount differences on matched items', sumBy(mismatched, p => (p.kind === 'invoice' ? 1 : -1) * p.diff), 'Same document, different amount');
  add('Statement totals do not add up', statementGap, 'Printed closing balance ≠ opening + entries — a line may not have been read');
  const difference = money(theirClosing - ourClosing);
  add('Rounding', difference - ex.reduce((s, e) => s + e.amount, 0), 'Paise-level differences');

  return {
    supplierName: name,
    periodFrom: isoOf(from), periodTo: isoOf(to),
    theirOpening, theirClosing, computedClosing, statementGap,
    ourOpening, ourClosing, difference,
    balanced: Math.abs(difference) < 1,
    matched, mismatched, onlyTheirs, onlyOurs,
    explanation: ex,
    flipped: !!st.flipped,
    lineCount: st.lines.length,
  };
}
