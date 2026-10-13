export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { clientIp, limitOr429 } from '@/lib/rateLimit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const same = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// POST { email, otp } — confirms the sign-up code. /api/auth/register only creates the
// account for an email that passed this check in the last 30 minutes.
export async function POST(req) {
  try {
    const body = await req.json();
    const email = (body.email || '').toLowerCase().trim();
    const otp = String(body.otp || '').trim();
    if (!email || !otp) return Response.json({ error: 'Email and OTP are required' }, { status: 400 });

    const limited = await limitOr429([
      [`verify-email:email:${email}`, 5, 600],
      [`verify-email:ip:${clientIp(req)}`, 30, 600],
    ], 'Too many wrong codes. Request a new code and try again in 10 minutes.');
    if (limited) return limited;

    // Only the newest unverified code for this email counts
    const { data: token } = await supabase
      .from('email_verification_tokens')
      .select('*')
      .eq('email', email)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!token || !same(token.otp, otp)) {
      return Response.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }
    if (new Date(token.expires_at) < new Date()) {
      return Response.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    const { error } = await supabase.from('email_verification_tokens').update({ verified: true }).eq('id', token.id);
    if (error) {
      console.error('[verify-email-otp] Failed to mark verified:', error.message);
      return Response.json({ error: 'Could not verify email. Please try again.' }, { status: 500 });
    }
    return Response.json({ success: true, message: 'Email verified successfully. Creating your account...' });
  } catch (error) {
    console.error('[verify-email-otp] Error:', error);
    return Response.json({ error: 'Could not verify email. Please try again.' }, { status: 500 });
  }
}
