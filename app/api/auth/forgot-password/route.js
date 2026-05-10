import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Simple email sender using fetch
async function sendEmail(to, subject, html) {
  try {
    // Using Resend API if available
    if (process.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@shopos.in',
          to,
          subject,
          html,
        }),
      });
      return response.ok;
    }
    // Fallback: Log to console in development
    console.log(`[EMAIL] To: ${to}, Subject: ${subject}`);
    console.log(html);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return Response.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    const user = users?.find(u => u.email === email);

    if (!user) {
      // For security, don't reveal if email exists
      return Response.json({
        success: true,
        message: 'If an account exists with this email, you will receive an OTP shortly.',
      });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Store OTP in a temporary table or use Supabase storage
    // For this implementation, we'll use a simple approach: store in a recovery tokens table
    const { error: otpError } = await supabase
      .from('password_reset_tokens')
      .insert({
        email,
        otp,
        expires_at: expiresAt,
        used: false,
      });

    if (otpError) {
      console.error('OTP storage error:', otpError);
      return Response.json(
        { error: 'Failed to generate OTP' },
        { status: 500 }
      );
    }

    // Send OTP via email
    await sendEmail(
      email,
      'ShopOS - Password Reset OTP',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>You requested to reset your ShopOS account password.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="font-size: 12px; color: #666; margin: 0 0 10px 0;">Your OTP expires in 10 minutes</p>
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1B5E8A; margin: 0;">${otp}</p>
          </div>
          <p style="color: #666; font-size: 14px;">
            If you didn't request a password reset, please ignore this email or contact support.
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            ShopOS Team
          </p>
        </div>
      `
    );

    return Response.json({
      success: true,
      message: 'OTP sent to your email',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
