export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendEmailViaResend(email, otp, name) {
  console.log('\n📧 [sendVerificationEmail] Starting email send');
  console.log('[sendVerificationEmail] Target email:', email);
  console.log('[sendVerificationEmail] OTP:', otp);

  if (!process.env.RESEND_API_KEY) {
    console.log('[sendVerificationEmail] ⚠️ RESEND_API_KEY not configured - dev mode');
    console.log(`[DEV] Email would be sent to ${email} with OTP: ${otp}`);
    return true;
  }

  console.log('[sendVerificationEmail] ✅ RESEND_API_KEY found');
  console.log('[sendVerificationEmail] Using sender email:', process.env.RESEND_FROM_EMAIL || 'info@shopos.co.in');

  try {
    let fromEmail = process.env.RESEND_FROM_EMAIL || 'info@shopos.co.in';
    // Add display name if not already present
    if (!fromEmail.includes('<')) {
      fromEmail = `ShopOS Verification <${fromEmail}>`;
    }
    const payload = {
      from: fromEmail,
      to: email,
      subject: 'ShopOS - Email Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to ShopOS!</h2>
          <p>Hi ${name || 'there'},</p>
          <p>Thank you for registering with ShopOS. Please verify your email to complete your registration.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="font-size: 12px; color: #666; margin: 0 0 10px 0;">Your OTP expires in 10 minutes</p>
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1B5E8A; margin: 0;">${otp}</p>
          </div>
          <p style="color: #666; font-size: 14px;">
            If you didn't create this account, please ignore this email or contact support.
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            ShopOS Team
          </p>
        </div>
      `,
    };

    console.log('[sendVerificationEmail] Calling Resend API at https://api.resend.com/emails');
    console.log('[sendVerificationEmail] Payload:', JSON.stringify({from: payload.from, to: payload.to, subject: payload.subject}, null, 2));

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('[sendVerificationEmail] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.json();
      console.error('[sendVerificationEmail] ❌ Resend API error:', JSON.stringify(error, null, 2));
      return false;
    }

    const result = await response.json();
    console.log('[sendVerificationEmail] ✅ Resend API success:', JSON.stringify(result, null, 2));
    console.log(`✅ Email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error('[sendVerificationEmail] ❌ Exception:', error.message);
    console.error('[sendVerificationEmail] Stack:', error.stack);
    return false;
  }
}

export async function POST(req) {
  console.log('\n🔐 [send-verification-email] POST request received');
  try {
    const { email, name } = await req.json();
    console.log('[send-verification-email] Email:', email, 'Name:', name);

    if (!email) {
      console.log('[send-verification-email] ❌ Email missing');
      return Response.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if email is already registered
    const { data: users } = await supabase.auth.admin.listUsers({
      pageSize: 1000,
    });

    let existingUser = null;
    if (users && Array.isArray(users)) {
      existingUser = users.find(u => u.email === email);
    } else if (users && users.users && Array.isArray(users.users)) {
      existingUser = users.users.find(u => u.email === email);
    }

    if (existingUser) {
      console.log('[send-verification-email] Email already registered:', email);
      return Response.json(
        { error: 'This email is already registered. Please sign in instead.' },
        { status: 400 }
      );
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    console.log(`[send-verification-email] Generated OTP: ${otp}`);
    console.log(`[send-verification-email] OTP expires at: ${expiresAt}`);

    // Delete old OTP for this email if exists
    await supabase
      .from('email_verification_tokens')
      .delete()
      .eq('email', email)
      .eq('verified', false);

    // Store OTP in database
    console.log('[send-verification-email] Storing OTP in database...');
    try {
      const { error: insertError } = await supabase
        .from('email_verification_tokens')
        .insert({
          email,
          otp,
          name: name || '',
          expires_at: expiresAt,
          verified: false,
        });

      if (insertError) {
        console.error('[send-verification-email] ❌ Failed to store OTP in database:', insertError);
        // Continue to send email anyway
      } else {
        console.log(`[send-verification-email] ✅ OTP stored in database for ${email}`);
      }
    } catch (dbError) {
      console.error('[send-verification-email] ❌ Database error:', dbError);
      // Continue to send email anyway
    }

    // Send email
    console.log('[send-verification-email] Sending OTP email...');
    const emailSent = await sendEmailViaResend(email, otp, name);
    console.log('[send-verification-email] Email send result:', emailSent);

    console.log('[send-verification-email] ✅ Returning success response');
    return Response.json({
      success: true,
      message: 'Verification OTP sent to your email. It will expire in 10 minutes.',
    });
  } catch (error) {
    console.error('[send-verification-email] ❌ Error:', error.message);
    console.error('[send-verification-email] Stack:', error.stack);
    return Response.json({
      error: error.message || 'Failed to send verification email',
    }, { status: 500 });
  }
}
