import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendEmailViaResend(email, otp) {
  console.log('\n📧 [sendEmail] Starting email send');
  console.log('[sendEmail] Target email:', email);
  console.log('[sendEmail] OTP:', otp);

  if (!process.env.RESEND_API_KEY) {
    console.log('[sendEmail] ⚠️ RESEND_API_KEY not configured - dev mode');
    console.log(`[DEV] Email would be sent to ${email} with OTP: ${otp}`);
    return true;
  }

  console.log('[sendEmail] ✅ RESEND_API_KEY found');
  console.log('[sendEmail] Using sender email:', process.env.RESEND_FROM_EMAIL || 'info@shopos.co.in');

  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'info@shopos.co.in';
    const payload = {
      from: fromEmail,
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
    };

    console.log('[sendEmail] Calling Resend API at https://api.resend.com/emails');
    console.log('[sendEmail] Payload:', JSON.stringify({from: payload.from, to: payload.to, subject: payload.subject}, null, 2));

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('[sendEmail] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.json();
      console.error('[sendEmail] ❌ Resend API error:', JSON.stringify(error, null, 2));
      return false;
    }

    const result = await response.json();
    console.log('[sendEmail] ✅ Resend API success:', JSON.stringify(result, null, 2));
    console.log(`✅ Email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error('[sendEmail] ❌ Exception:', error.message);
    console.error('[sendEmail] Stack:', error.stack);
    return false;
  }
}

export async function POST(req) {
  console.log('\n🔐 [forgot-password] POST request received');
  try {
    const { email } = await req.json();
    console.log('[forgot-password] Email:', email);

    if (!email) {
      console.log('[forgot-password] ❌ Email missing');
      return Response.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    console.log(`[forgot-password] Generated OTP: ${otp}`);
    console.log(`[forgot-password] OTP expires at: ${expiresAt}`);

    // Store OTP in database
    console.log('[forgot-password] Storing OTP in database...');
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
        console.error('[forgot-password] ❌ Failed to store OTP in database:', insertError);
        // Continue to send email anyway
      } else {
        console.log(`[forgot-password] ✅ OTP stored in database for ${email}`);
      }
    } catch (dbError) {
      console.error('[forgot-password] ❌ Database error:', dbError);
      // Continue to send email anyway
    }

    // Send email
    console.log('[forgot-password] Sending OTP email...');
    const emailSent = await sendEmailViaResend(email, otp);
    console.log('[forgot-password] Email send result:', emailSent);

    // Always return success for security (don't reveal if email exists)
    console.log('[forgot-password] ✅ Returning success response');
    return Response.json({
      success: true,
      message: 'If an account exists with this email, you will receive an OTP shortly.',
    });
  } catch (error) {
    console.error('[forgot-password] ❌ Forgot password error:', error.message);
    console.error('[forgot-password] Stack:', error.stack);
    return Response.json({
      success: true,
      message: 'If an account exists with this email, you will receive an OTP shortly.',
    });
  }
}
