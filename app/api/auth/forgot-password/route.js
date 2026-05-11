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

    const otp = generateOTP();
    console.log(`[PASSWORD RESET OTP] Email: ${email}, OTP: ${otp}, Expires: 10 minutes`);

    // In development, just log the OTP
    // In production, implement email sending and database storage

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
