// Fixed-window rate limiting backed by the hit_rate_limit() SQL function (server only).
// Fails open if the function is missing so a missed migration never locks users out.
import { createClient } from '@supabase/supabase-js';

const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export function clientIp(req) {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

export async function allow(key, limit, windowSeconds) {
  try {
    const { data, error } = await admin().rpc('hit_rate_limit', { p_key: key, p_limit: limit, p_window_seconds: windowSeconds });
    if (error) { console.error('[rateLimit]', error.message); return true; }
    return data !== false;
  } catch (e) { console.error('[rateLimit]', e.message); return true; }
}

// Returns a 429 Response if any of the given [key, limit, windowSeconds] buckets is exhausted, else null.
export async function limitOr429(buckets, message) {
  for (const [key, limit, win] of buckets) {
    if (!(await allow(key, limit, win))) {
      return Response.json({ error: message || 'Too many attempts. Please wait a few minutes and try again.' }, { status: 429 });
    }
  }
  return null;
}
