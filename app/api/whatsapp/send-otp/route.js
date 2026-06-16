export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req) {
  try {
    const { firmId, phoneNumber } = await req.json();

    if (!firmId || !phoneNumber) {
      return Response.json(
        { error: 'Firm ID and phone number required' },
        { status: 400 }
      );
    }

    // Clean phone number
    let cleaned = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

    // Check if connection exists
    const { data: existing } = await adminClient
      .from('whatsapp_connections')
      .select('id, otp_attempts')
      .eq('firm_id', firmId)
      .eq('phone_number', cleaned)
      .single();

    if (existing && existing.otp_attempts > 5) {
      return Response.json(
        { error: 'Too many OTP attempts. Try again later.' },
        { status: 429 }
      );
    }

    // Upsert connection with OTP
    const { error } = await adminClient
      .from('whatsapp_connections')
      .upsert({
        firm_id: firmId,
        phone_number: cleaned,
        otp,
        otp_expires_at: expiresAt,
        otp_attempts: (existing?.otp_attempts || 0) + 1,
      }, {
        onConflict: 'firm_id,phone_number',
      });

    if (error) {
      console.error('[whatsapp/send-otp] DB error:', error);
      return Response.json({ error: 'Failed to generate OTP' }, { status: 500 });
    }

    console.log(`[whatsapp/send-otp] OTP generated for ${cleaned}: ${otp}`);

    return Response.json({
      success: true,
      message: `OTP sent to +${cleaned}. Enter it in 10 minutes.`,
      phoneNumber: cleaned,
    });
  } catch (error) {
    console.error('[whatsapp/send-otp] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
