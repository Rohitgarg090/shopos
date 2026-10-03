// GST state codes (as used on GSTINs and E-Way Bills)
export const GST_STATES = {
  'Jammu and Kashmir': 1, 'Himachal Pradesh': 2, 'Punjab': 3, 'Chandigarh': 4, 'Uttarakhand': 5,
  'Haryana': 6, 'Delhi': 7, 'Rajasthan': 8, 'Uttar Pradesh': 9, 'Bihar': 10, 'Sikkim': 11,
  'Arunachal Pradesh': 12, 'Nagaland': 13, 'Manipur': 14, 'Mizoram': 15, 'Tripura': 16,
  'Meghalaya': 17, 'Assam': 18, 'West Bengal': 19, 'Jharkhand': 20, 'Odisha': 21,
  'Chhattisgarh': 22, 'Madhya Pradesh': 23, 'Gujarat': 24, 'Dadra and Nagar Haveli and Daman and Diu': 26,
  'Maharashtra': 27, 'Karnataka': 29, 'Goa': 30, 'Lakshadweep': 31, 'Kerala': 32, 'Tamil Nadu': 33,
  'Puducherry': 34, 'Andaman and Nicobar Islands': 35, 'Telangana': 36, 'Andhra Pradesh': 37, 'Ladakh': 38,
};

const ALIASES = { 'mp': 23, 'm.p': 23, 'm.p.': 23, 'up': 9, 'u.p': 9, 'maharastra': 27, 'orissa': 21, 'pondicherry': 34,
  'j&k': 1, 'jammu & kashmir': 1, 'new delhi': 7, 'nct of delhi': 7, 'daman and diu': 26, 'dadra and nagar haveli': 26,
  'andaman & nicobar': 35, 'chattisgarh': 22, 'telengana': 36 };

export function stateCodeFromName(name) {
  const n = (name || '').toString().trim().toLowerCase();
  if (!n) return null;
  if (/^\d{1,2}$/.test(n)) return +n;
  if (ALIASES[n]) return ALIASES[n];
  const hit = Object.entries(GST_STATES).find(([k]) => k.toLowerCase() === n || k.toLowerCase().replace(/ and /g, ' & ') === n);
  return hit ? hit[1] : null;
}

export const stateCodeFromGstin = g => (/^\d{2}[0-9A-Z]{13}$/.test((g || '').toUpperCase()) ? +g.slice(0, 2) : null);
