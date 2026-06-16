export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return Response.json(
        { error: 'Email, OTP, and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return Response.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if OTP exists and is valid
    const { data: tokenData, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .eq('used', false)
      .single();

    if (tokenError || !tokenData) {
      return Response.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // Check if OTP is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return Response.json(
        { error: 'OTP has expired' },
        { status: 400 }
      );
    }

    // Update password - use Supabase reset password flow with service role
    try {
      // Use the admin API to update password
      // First get list of users and find the one with matching email
      const { data: users, error: listError } = await supabase.auth.admin.listUsers({
        pageSize: 1000,
      });

      let userId = null;
      if (users && Array.isArray(users)) {
        const foundUser = users.find(u => u.email === email);
        userId = foundUser?.id;
      } else if (users && users.users && Array.isArray(users.users)) {
        const foundUser = users.users.find(u => u.email === email);
        userId = foundUser?.id;
      }

      if (!userId) {
        return Response.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Update the user's password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (updateError) {
        console.error('Update password error:', updateError);
        return Response.json(
          { error: updateError.message || 'Failed to update password' },
          { status: 500 }
        );
      }
    } catch (updateException) {
      console.error('Password update exception:', updateException);
      return Response.json(
        { error: updateException.message || 'Failed to reset password' },
        { status: 500 }
      );
    }

    // Mark OTP as used
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', tokenData.id);

    return Response.json({
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.',
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
