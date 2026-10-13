export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { clientIp, limitOr429 } from '@/lib/rateLimit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findUserIdByEmail(email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = (data?.users || []).find(u => (u.email || '').toLowerCase() === email);
    if (hit) return hit.id;
    if (!data?.users || data.users.length < 1000) return null;
  }
  return null;
}

const same = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// POST { email, otp, newPassword } — reset password with the emailed 6-digit code
export async function POST(req) {
  try {
    const body = await req.json();
    const email = (body.email || '').toLowerCase().trim();
    const otp = String(body.otp || '').trim();
    const newPassword = body.newPassword || '';

    if (!email || !otp || !newPassword) {
      return Response.json({ error: 'Email, OTP, and new password are required' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Brute-force protection: 5 tries per email and 30 per IP every 10 minutes
    const limited = await limitOr429([
      [`reset-verify:email:${email}`, 5, 600],
      [`reset-verify:ip:${clientIp(req)}`, 30, 600],
    ], 'Too many wrong codes. Request a new code and try again in 10 minutes.');
    if (limited) return limited;

    // Only the newest unused code for this email is valid
    const { data: tokenData } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('email', email)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!tokenData || !same(tokenData.otp, otp)) {
      return Response.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }
    if (new Date(tokenData.expires_at) < new Date()) {
      return Response.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    const userId = await findUserIdByEmail(email);
    if (!userId) return Response.json({ error: 'Invalid or expired OTP' }, { status: 400 });

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
    if (updateError) {
      console.error('Update password error:', updateError);
      return Response.json({ error: updateError.message || 'Failed to update password' }, { status: 500 });
    }

    // Burn this and any other outstanding codes for the email
    await supabase.from('password_reset_tokens').update({ used: true }).eq('email', email).eq('used', false);

    return Response.json({
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.',
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return Response.json({ error: 'Could not reset password. Please try again.' }, { status: 500 });
  }
}
