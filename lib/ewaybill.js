// Builds and validates a NIC E-Way Bill (consignor "generate") payload from a ShopOS bill.
// Pure: safe to use on the client (readiness check) and the server (actual filing).
import { stateCodeFromName, stateCodeFromGstin } from './gstStates';

const GSTIN_RE = /^[0-9]{2}[0-9A-Z]{13}$/;
const r2 = n => Math.round((+n || 0) * 100) / 100;
const clean = (s, max) => (s || '').toString().replace(/[^A-Za-z0-9 #,\-/.]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const ddmmyyyy = d => { const t = new Date(d); return `${String(t.getDate()).padStart(2, '0')}/${String(t.getMonth() + 1).padStart(2, '0')}/${t.getFullYear()}`; };
const splitAddr = a => { const s = clean(a, 240); return [s.slice(0, 120), s.slice(120, 240)]; };

export const TRANS_MODES = [['1', 'Road'], ['2', 'Rail'], ['3', 'Air'], ['4', 'Ship']];
export const normVehicle = v => (v || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');

// problems: [{field, msg}] — anything that must be fixed before filing
export function buildEwbPayload({ bill, firm, customer, transport = {} }) {
  const problems = [];
  const need = (cond, field, msg) => { if (!cond) problems.push({ field, msg }); };

  const fromGstin = (firm.gstin || '').toUpperCase().trim();
  need(GSTIN_RE.test(fromGstin), 'firm.gstin', 'Your firm GSTIN is missing or invalid (Settings → Firm details)');
  const fromState = stateCodeFromGstin(fromGstin) || +firm.stateCode || stateCodeFromName(firm.state);
  const fromPin = +String(firm.pincode || '').replace(/\D/g, '');
  need(fromPin >= 100000 && fromPin <= 999999, 'firm.pincode', 'Your shop PIN code is missing (Settings → E-Way Bill)');

  const custGst = (customer?.gst || bill.customerGST || '').toUpperCase().trim();
  const toGstin = GSTIN_RE.test(custGst) ? custGst : 'URP';
  const toState = stateCodeFromGstin(toGstin) || stateCodeFromName(customer?.state) || fromState;
  const toPin = +String(customer?.pincode || '').replace(/\D/g, '');
  need(toPin >= 100000 && toPin <= 999999, 'customer.pincode', `Customer PIN code is missing for ${bill.customerName || 'this customer'}`);
  need(!!toState, 'customer.state', 'Customer state is missing');

  const docNo = (bill.invoiceNo || '').toString().replace(/[^A-Za-z0-9/-]/g, '').slice(0, 16);
  need(!!docNo, 'bill.invoiceNo', 'Invoice number is missing');
  const billDay = new Date(bill.date);
  need(!isNaN(billDay) && billDay <= new Date(), 'bill.date', 'Invoice date is invalid or in the future');

  const defHsn = String(transport.defaultHsn || '').trim();
  const items = (bill.items || []).map(i => (/^\d{4,8}$/.test(String(i.hsn || '').trim()) || !/^\d{4,8}$/.test(defHsn) ? i : { ...i, hsn: defHsn }));
  need(items.length > 0, 'bill.items', 'The bill has no items');
  const noHsn = items.filter(i => !/^\d{4,8}$/.test(String(i.hsn || '').trim()));
  need(noHsn.length === 0, 'items.hsn', `HSN code missing on ${noHsn.length} item(s): ${noHsn.slice(0, 3).map(i => i.name).join(', ')}`);

  // transport
  const mode = String(transport.mode || '1');
  const vehicleNo = normVehicle(transport.vehicleNo);
  const transporterId = (transport.transporterId || '').toUpperCase().trim();
  const distance = Math.round(+transport.distance || 0);
  need(distance >= 0 && distance <= 4000, 'transport.distance', 'Distance must be between 0 and 4000 km (0 = auto)');
  if (transporterId) need(GSTIN_RE.test(transporterId), 'transport.transporterId', 'Transporter ID must be a 15-character GSTIN / TRANSIN');
  if (mode === '1') need(vehicleNo.length >= 7 && vehicleNo.length <= 15 || !!transporterId, 'transport.vehicleNo', 'Enter the vehicle number (e.g. MP07AB1234), or a transporter ID if they will add the vehicle');
  else need(!!(transport.transDocNo || '').trim(), 'transport.transDocNo', 'Enter the RR / airway bill / bill of lading number');

  // values — inter-state supplies carry IGST instead of CGST + SGST
  const inter = fromState && toState && fromState !== toState;
  const lines = items.map(i => {
    const taxable = r2((+i.rate || 0) * (+i.qty || 0));
    const rate = +i.gstRate || 0;
    return {
      productName: clean(i.name, 100) || 'Item',
      productDesc: clean([i.name, i.articleNo, i.size].filter(Boolean).join(' '), 100),
      hsnCode: +String(i.hsn || '').trim() || 0,
      quantity: +i.qty || 0,
      qtyUnit: 'PCS',
      cgstRate: inter ? 0 : rate / 2,
      sgstRate: inter ? 0 : rate / 2,
      igstRate: inter ? rate : 0,
      cessRate: 0,
      cessNonadvol: 0,
      taxableAmount: taxable,
      _tax: r2(i.gstAmt != null ? i.gstAmt : taxable * rate / 100),
    };
  });
  const totalValue = r2(lines.reduce((s, l) => s + l.taxableAmount, 0));
  const tax = r2(lines.reduce((s, l) => s + l._tax, 0));
  const totInvValue = r2(bill.total);
  const otherValue = r2(totInvValue - totalValue - tax);
  lines.forEach(l => delete l._tax);

  const [fromAddr1, fromAddr2] = splitAddr(firm.address);
  const [toAddr1, toAddr2] = splitAddr(customer?.addr || bill.customerAddr);
  const payload = {
    supplyType: 'O', subSupplyType: '1', subSupplyDesc: '', docType: 'INV', docNo, docDate: ddmmyyyy(bill.date),
    fromGstin, fromTrdName: clean(firm.name, 100), fromAddr1, fromAddr2, fromPlace: clean(firm.city || firm.state, 50),
    fromPincode: fromPin, fromStateCode: fromState || 0, actFromStateCode: fromState || 0,
    toGstin, toTrdName: clean(customer?.shopname || bill.customerName, 100), toAddr1, toAddr2, toPlace: clean(customer?.state || '', 50),
    toPincode: toPin, toStateCode: toState || 0, actToStateCode: toState || 0,
    transactionType: 1,
    otherValue, totalValue,
    cgstValue: inter ? 0 : r2(tax / 2), sgstValue: inter ? 0 : r2(tax - r2(tax / 2)), igstValue: inter ? tax : 0,
    cessValue: 0, cessNonAdvolValue: 0, totInvValue,
    transMode: mode, transDistance: String(distance),
    transporterId, transporterName: clean(transport.transporterName, 100),
    transDocNo: clean(transport.transDocNo, 15).replace(/[^A-Za-z0-9/-]/g, ''),
    transDocDate: transport.transDocNo ? ddmmyyyy(transport.transDocDate || new Date()) : '',
    vehicleNo, vehicleType: vehicleNo ? 'R' : '',
    itemList: lines,
  };
  return { payload, problems, interState: !!inter, totals: { totalValue, tax, otherValue, totInvValue } };
}
