import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendEmailViaResend(email, otp) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[DEV] Email would be sent to ${email} with OTP: ${otp}`);
    return true;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: email,
        subject: 'ShopOS - Password Reset OTP',
        html: `
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
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Resend API error:', error);
      return false;
    }

    console.log(`✅ Email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
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

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    console.log(`[PASSWORD RESET OTP] Email: ${email}, OTP: ${otp}, Expires: 10 minutes`);

    // Store OTP in database
    try {
      const { error: insertError } = await supabase
        .from('password_reset_tokens')
        .insert({
          email,
          otp,
          expires_at: expiresAt,
          used: false,
        });

      if (insertError) {
        console.error('Failed to store OTP in database:', insertError);
        // Continue to send email anyway
      } else {
        console.log(`✅ OTP stored in database for ${email}`);
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Continue to send email anyway
    }

    // Send email
    await sendEmailViaResend(email, otp);

    // Always return success for security (don't reveal if email exists)
    return Response.json({
      success: true,
      message: 'If an account exists with this email, you will receive an OTP shortly.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return Response.json({
      success: true,
      message: 'If an account exists with this email, you will receive an OTP shortly.',
    });
  }
}
