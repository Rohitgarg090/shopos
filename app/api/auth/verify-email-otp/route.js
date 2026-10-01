export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return Response.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    // Check if OTP exists and is valid
    const { data: tokenData, error: tokenError } = await supabase
      .from('email_verification_tokens')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .eq('verified', false)
      .single();

    if (tokenError || !tokenData) {
      console.log('[verify-email-otp] Invalid or expired OTP for:', email);
      return Response.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // Check if OTP is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      console.log('[verify-email-otp] OTP expired for:', email);
      return Response.json(
        { error: 'OTP has expired' },
        { status: 400 }
      );
    }

    // Mark OTP as verified
    const { error: updateError } = await supabase
      .from('email_verification_tokens')
      .update({ verified: true })
      .eq('id', tokenData.id);

    if (updateError) {
      console.error('[verify-email-otp] Failed to mark OTP as verified:', updateError);
      return Response.json(
        { error: 'Failed to verify email' },
        { status: 500 }
      );
    }

    console.log('[verify-email-otp] ✅ Email verified for:', email);
    return Response.json({
      success: true,
      message: 'Email verified successfully! You can now complete your registration.',
      verifiedEmail: email,
      verifiedName: tokenData.name,
    });
  } catch (error) {
    console.error('[verify-email-otp] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
