// Builds the e-Invoice (IRN) request in the government schema v1.1 and lists every missing or invalid
// value instead of inventing one. Each problem carries a `fix` key the UI can turn into an input.
import { stateCodeFromGstin, stateCodeFromName, GST_STATES } from './gstStates';

const stateName = code => Object.keys(GST_STATES).find(k => GST_STATES[k] === +code) || '';

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const DOC_NO_RE = /^[A-Z1-9][A-Z0-9/-]{0,15}$/i;            // NIC: max 16, no leading 0, / or -
const GST_RATES = [0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28];
const r2 = n => Math.round((+n || 0) * 100) / 100;
const r3 = n => Math.round((+n || 0) * 1000) / 1000;
const txt = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const pin6 = v => { const p = String(v ?? '').replace(/\D/g, ''); return p.length === 6 && p[0] !== '0' ? +p : null; };
const phone = v => { const p = String(v ?? '').replace(/\D/g, '').slice(-10); return p.length >= 6 ? p : undefined; };
const email = v => (/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim()) && String(v).trim().length >= 6 ? String(v).trim().slice(0, 100) : undefined);
const st = c => String(c).padStart(2, '0');

// Invoice date as DD/MM/YYYY in India time (the server runs in UTC)
export const istDate = d => new Date(d).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });

export function splitAddr(a) {
  const s = txt(a, 200);
  if (s.length <= 100) return [s, ''];
  const cut = s.lastIndexOf(',', 100) > 40 ? s.lastIndexOf(',', 100) + 1 : 100;
  return [s.slice(0, cut).trim(), s.slice(cut).trim().slice(0, 100)];
}

/**
 * firm:     { gstin, name, address, city?, state, pincode, mobile?, email? }
 * bill:     bills row (+ place_of_supply, ship_to, discount, total, invoice_no, created_at)
 * items:    bill_items rows
 * customer: customers row (or null)
 */
export function buildEInvoice({ firm, bill, items, customer }) {
  const problems = [];
  const need = (ok, msg, fix) => { if (!ok) problems.push({ msg, ...(fix ? { fix } : {}) }); };

  // ── Document
  const docNo = txt(bill.invoice_no, 16);
  need(DOC_NO_RE.test(docNo), `Invoice number "${bill.invoice_no}" can't be e-invoiced: use up to 16 letters, digits, / or -, not starting with 0, / or -`);
  need(bill.status !== 'cancelled', 'This invoice is cancelled');
  const docDate = new Date(bill.created_at);
  need(!isNaN(docDate) && docDate <= new Date(Date.now() + 5 * 60e3), 'Invoice date is invalid or in the future');

  // ── Seller (your firm)
  const sGstin = txt(firm.gstin, 15).toUpperCase();
  need(GSTIN_RE.test(sGstin), 'Your firm GSTIN is missing or invalid (Settings → Account & Firm)');
  const sState = stateCodeFromGstin(sGstin);
  const [sA1, sA2] = splitAddr(firm.address);
  need(sA1.length >= 3, 'Your firm address is missing (Settings → Account & Firm)');
  const sPin = pin6(firm.pincode);
  need(!!sPin, 'Your firm PIN code is missing (Settings → E-Way Bill / GST portal)');
  need(txt(firm.name, 100).length >= 3, 'Your firm name is missing');

  // ── Buyer — e-invoicing covers supplies to GST-registered buyers (B2B) only
  const bGstin = txt(customer?.gst || bill.customer_gst, 15).toUpperCase();
  need(GSTIN_RE.test(bGstin), bGstin ? `Buyer GSTIN "${bGstin}" is not valid` : 'E-Invoice is only for GST-registered buyers — add the customer\'s GSTIN', { key: 'customer.gst', label: 'Buyer GSTIN', value: bGstin });
  const bState = stateCodeFromGstin(bGstin);
  const bName = txt(customer?.shopname || customer?.name || bill.customer_name, 100);
  need(bName.length >= 3, 'Buyer name must be at least 3 characters');
  const bAddr = customer?.addr || bill.customer_addr;
  const [bA1, bA2] = splitAddr(bAddr);
  need(bA1.length >= 3, 'Buyer address is missing', { key: 'customer.addr', label: 'Buyer address', value: bA1 });
  const bPin = pin6(customer?.pincode);
  need(!!bPin, 'Buyer PIN code is missing', { key: 'customer.pincode', label: 'Buyer PIN code', value: customer?.pincode || '' });
  const bLoc = txt(bill.customer_city || customer?.state || '', 50);

  // ── Place of supply decides IGST vs CGST + SGST
  const pos = stateCodeFromName(bill.place_of_supply) || bState || sState;
  const inter = !!(sState && pos && sState !== pos);

  // ── Items
  const list = (items || []).map((it, i) => {
    const hsn = String(it.hsn || it.hsn_code || '').trim();
    const qty = +it.qty || 0, rate = +it.rate || 0, gstRt = +it.gst_rate;
    need(/^\d{4,8}$/.test(hsn), `HSN code missing on item ${i + 1} (${it.name})`, { key: 'item.hsn', id: it.id, label: `HSN for ${it.name}`, value: hsn });
    need(qty > 0, `Item ${i + 1} (${it.name}): quantity must be more than 0`);
    need(rate >= 0, `Item ${i + 1} (${it.name}): rate is invalid`);
    need(it.gst_rate !== null && it.gst_rate !== undefined && it.gst_rate !== '' && GST_RATES.includes(gstRt), `Item ${i + 1} (${it.name}): GST rate ${it.gst_rate ?? 'blank'}% is not a valid GST rate`);
    const tot = r2(qty * rate), tax = r2(tot * (gstRt || 0) / 100);
    const igst = inter ? tax : 0, cgst = inter ? 0 : r2(tax / 2), sgst = inter ? 0 : r2(tax - r2(tax / 2));
    return {
      SlNo: String(i + 1), PrdDesc: txt([it.name, it.article_no, it.size].filter(Boolean).join(' '), 300) || 'Item',
      IsServc: 'N', HsnCd: hsn, Qty: r3(qty), Unit: 'PCS', UnitPrice: r3(rate), TotAmt: tot,
      Discount: 0, AssAmt: tot, GstRt: gstRt || 0, IgstAmt: igst, CgstAmt: cgst, SgstAmt: sgst,
      CesRt: 0, CesAmt: 0, CesNonAdvlAmt: 0, StateCesRt: 0, StateCesAmt: 0, StateCesNonAdvlAmt: 0, OthChrg: 0,
      TotItemVal: r2(tot + igst + cgst + sgst),
    };
  });
  need(list.length > 0, 'The invoice has no items');

  const sum = k => r2(list.reduce((s, l) => s + l[k], 0));
  const assVal = sum('AssAmt'), cgstV = sum('CgstAmt'), sgstV = sum('SgstAmt'), igstV = sum('IgstAmt');
  const discount = r2(bill.discount);
  const computed = r2(assVal + cgstV + sgstV + igstV - discount);
  const total = r2(bill.total);
  const rnd = r2(total - computed);
  need(Math.abs(rnd) < 10, `Invoice total (${total}) doesn't match its items and tax (${computed}) — check the bill`);

  // ── Delivery address (Bill To - Ship To)
  const ship = bill.ship_to || null;
  let shipDtls;
  if (ship) {
    const shipPin = pin6(ship.pincode);
    const shipState = stateCodeFromGstin(ship.gstin) || stateCodeFromName(ship.state);
    need(!!shipPin, 'Delivery address PIN code is missing', { key: 'ship.pincode', label: 'Delivery PIN code', value: ship.pincode || '' });
    need(!!shipState, 'Delivery address state is missing');
    const [a1, a2] = splitAddr([ship.addr, ship.city].filter(Boolean).join(', '));
    shipDtls = {
      ...(GSTIN_RE.test(ship.gstin || '') ? { Gstin: ship.gstin } : {}),
      LglNm: txt(ship.name, 100), TrdNm: txt(ship.name, 100), Addr1: a1, ...(a2.length >= 3 ? { Addr2: a2 } : {}),
      Loc: txt(ship.city || ship.state || stateName(shipState), 50), Pin: shipPin, Stcd: st(shipState || pos),
    };
  }

  const payload = {
    Version: '1.1',
    TranDtls: { TaxSch: 'GST', SupTyp: 'B2B', RegRev: 'N', IgstOnIntra: 'N' },   // RegRev Y only for reverse-charge supplies
    DocDtls: { Typ: 'INV', No: docNo, Dt: istDate(bill.created_at) },
    SellerDtls: {
      Gstin: sGstin, LglNm: txt(firm.name, 100), TrdNm: txt(firm.name, 100), Addr1: sA1, ...(sA2.length >= 3 ? { Addr2: sA2 } : {}),
      Loc: txt(firm.city || firm.state || stateName(sState), 50), Pin: sPin, Stcd: st(sState),
      ...(phone(firm.mobile) ? { Ph: phone(firm.mobile) } : {}), ...(email(firm.email) ? { Em: email(firm.email) } : {}),
    },
    BuyerDtls: {
      Gstin: bGstin, LglNm: bName, TrdNm: bName, Pos: st(pos), Addr1: bA1, ...(bA2.length >= 3 ? { Addr2: bA2 } : {}),
      Loc: bLoc.length >= 3 ? bLoc : (txt(customer?.state, 50) || stateName(bState)), Pin: bPin, Stcd: st(bState),
      ...(phone(customer?.phone || bill.customer_phone) ? { Ph: phone(customer?.phone || bill.customer_phone) } : {}),
      ...(email(customer?.email || bill.customer_email) ? { Em: email(customer?.email || bill.customer_email) } : {}),
    },
    ...(shipDtls ? { ShipDtls: shipDtls } : {}),
    ItemList: list,
    ValDtls: { AssVal: assVal, CgstVal: cgstV, SgstVal: sgstV, IgstVal: igstV, CesVal: 0, StCesVal: 0, Discount: discount, OthChrg: 0, RndOffAmt: rnd, TotInvVal: total },
  };
  return { payload, problems, interState: inter };
}
