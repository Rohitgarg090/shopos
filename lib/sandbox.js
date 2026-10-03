// Sandbox.co.in (Quicko) GSP client — shared by E-Way Bill and E-Invoice routes (server only).
// Every firm files with its OWN portal API credentials stored in firm_settings.
import { createClient } from '@supabase/supabase-js';

export const SANDBOX_BASE = process.env.SANDBOX_BASE_URL || 'https://api.sandbox.co.in';
const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const sandboxConfigured = () => !!(process.env.SANDBOX_API_KEY && process.env.SANDBOX_API_SECRET);

// Tokens are cached per server instance; a cold start simply re-authenticates.
const cache = new Map();
const fromCache = k => { const t = cache.get(k); return t && t.exp > Date.now() ? t.token : null; };

export async function platformToken() {
  const hit = fromCache('platform'); if (hit) return hit;
  const res = await fetch(`${SANDBOX_BASE}/authenticate`, { method: 'POST', headers: {
    accept: 'application/json', 'x-api-key': process.env.SANDBOX_API_KEY, 'x-api-secret': process.env.SANDBOX_API_SECRET, 'x-api-version': '1.0.0' } });
  const j = await res.json().catch(() => ({}));
  const token = j?.data?.access_token || j?.access_token;
  if (!res.ok || !token) throw new Error('GST service login failed: ' + (j?.message || res.status));
  cache.set('platform', { token, exp: Date.now() + 23 * 3600e3 });
  return token;
}

const AUTH_PATH = {
  ewb: '/gst/compliance/e-way-bill/tax-payer/authenticate',
  einvoice: '/gst/compliance/e-invoice/tax-payer/authenticate',
};
const LABEL = { ewb: 'E-Way Bill', einvoice: 'E-Invoice' };

// Taxpayer session for one GSTIN on the E-Way Bill or E-Invoice system.
export async function taxpayerToken(kind, gstin, username, password, force = false) {
  const key = `${kind}:${gstin}:${username}`;
  const hit = !force && fromCache(key); if (hit) return hit;
  const res = await fetch(`${SANDBOX_BASE}${AUTH_PATH[kind]}${force ? '?force=true' : ''}`, { method: 'POST', headers: {
    'Content-Type': 'application/json', authorization: await platformToken(), 'x-api-key': process.env.SANDBOX_API_KEY, 'x-api-version': '1.0.0' },
    body: JSON.stringify({ username, password, gstin }) });
  const j = await res.json().catch(() => ({}));
  const token = j?.data?.access_token;
  if (!res.ok || !token) {
    const msg = j?.data?.message || j?.message || j?.data?.error?.message || ('error ' + res.status);
    throw new Error(`${LABEL[kind]} login failed for ${gstin}: ${msg}. Check the ${LABEL[kind]} API username/password in Settings and that "Quicko Infosoft" is registered as your GSP on the government portal.`);
  }
  const exp = j?.data?.expiry ? +new Date(j.data.expiry) : Date.now() + 5 * 3600e3;
  cache.set(key, { token, exp: Math.min(exp - 60e3, Date.now() + 5 * 3600e3) });
  return token;
}

export const gstHeaders = token => ({ 'Content-Type': 'application/json', authorization: token, 'x-api-key': process.env.SANDBOX_API_KEY, 'x-api-version': '1.0.0' });

// Calls a taxpayer endpoint, retrying once with a fresh session if the token was rejected.
export async function gstCall(kind, creds, path, body) {
  const go = async force => fetch(`${SANDBOX_BASE}${path}`, { method: 'POST',
    headers: gstHeaders(await taxpayerToken(kind, creds.gstin, creds.username, creds.password, force)), body: JSON.stringify(body) });
  let res = await go(false);
  if (res.status === 401 || res.status === 403) res = await go(true);
  const j = await res.json().catch(() => ({}));
  return { res, j };
}

// Firm's GST settings + portal credentials. `kind` decides which credentials are required.
export async function firmGst(firmId, kind) {
  const { data: fs } = await admin().from('firm_settings').select('*').eq('firm_id', firmId)
    .order('updated_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
  if (!fs) return { error: 'Firm settings not found — fill in Settings first' };
  const gstin = (fs.gstin || '').toUpperCase().trim();
  if (!/^[0-9]{2}[0-9A-Z]{13}$/.test(gstin)) return { error: 'Your firm GSTIN is missing or invalid (Settings → Firm details)' };
  const username = kind === 'ewb' ? fs.ewb_username : fs.einv_username;
  const password = kind === 'ewb' ? fs.ewb_password : fs.einv_password;
  if (!username || !password) return { error: `Add this firm's ${LABEL[kind]} API username & password in Settings → GST Portal Credentials` };
  return { fs, creds: { gstin, username, password } };
}
