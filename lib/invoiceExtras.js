// Optional invoice details: delivery (ship-to) address, buyer's purchase order and destination.
import { stateCodeFromName, stateCodeFromGstin } from './gstStates';

const str = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

// Returns { value } or { error }. null/empty = same as billing address.
export function cleanShipTo(s) {
  if (!s || typeof s !== 'object') return { value: null };
  const v = {
    name: str(s.name, 100), gstin: str(s.gstin, 15).toUpperCase(), addr: str(s.addr, 200),
    city: str(s.city, 50), state: str(s.state, 50), pincode: str(s.pincode, 6).replace(/\D/g, ''),
  };
  if (!v.name && !v.addr && !v.city && !v.pincode) return { value: null };
  if (!v.name) return { error: 'Delivery address: enter the receiver name' };
  if (!v.addr) return { error: 'Delivery address: enter the address' };
  if (v.gstin && !GSTIN_RE.test(v.gstin)) return { error: 'Delivery address: GSTIN looks wrong (15 characters, e.g. 23ABCDE1234F1Z5)' };
  if (v.pincode && v.pincode.length !== 6) return { error: 'Delivery address: PIN code must be 6 digits' };
  if (v.state && !stateCodeFromName(v.state)) return { error: 'Delivery address: choose a valid state' };
  if (v.gstin && v.state && stateCodeFromGstin(v.gstin) !== stateCodeFromName(v.state)) return { error: 'Delivery address: the GSTIN belongs to a different state than the one selected' };
  return { value: v };
}

export function cleanExtras(b) {
  const ship = cleanShipTo(b.shipTo);
  if (ship.error) return { error: ship.error };
  const od = /^\d{4}-\d{2}-\d{2}$/.test(b.buyerOrderDate || '') ? b.buyerOrderDate : '';
  return {
    value: {
      ship_to: ship.value,
      buyer_order_no: str(b.buyerOrderNo, 40),
      buyer_order_date: od,
      destination: str(b.destination, 60),
    },
  };
}

// State code of the delivery address (from its GSTIN, else its state name)
export const shipToStateCode = s => (s ? stateCodeFromGstin(s.gstin) || stateCodeFromName(s.state) : null);
