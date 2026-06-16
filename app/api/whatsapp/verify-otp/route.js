export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let ongoingSessions = {}; // Store ongoing Baileys sessions in memory

export async function POST(req) {
  try {
    const { firmId, phoneNumber, otp } = await req.json();

    if (!firmId || !phoneNumber || !otp) {
      return Response.json(
        { error: 'Firm ID, phone number, and OTP required' },
        { status: 400 }
      );
    }

    // Clean phone number
    let cleaned = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }

    // Verify OTP
    const { data: connection, error: fetchError } = await adminClient
      .from('whatsapp_connections')
      .select('*')
      .eq('firm_id', firmId)
      .eq('phone_number', cleaned)
      .single();

    if (fetchError || !connection) {
      return Response.json({ error: 'Connection not found' }, { status: 404 });
    }

    if (connection.otp !== otp) {
      return Response.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    if (new Date(connection.otp_expires_at) < new Date()) {
      return Response.json({ error: 'OTP expired' }, { status: 400 });
    }

    // Update status to "connecting" and prepare for Baileys
    await adminClient
      .from('whatsapp_connections')
      .update({
        session_status: 'connecting',
        otp: null,
        otp_attempts: 0,
      })
      .eq('id', connection.id);

    console.log(`[whatsapp/verify-otp] OTP verified for ${cleaned}, initiating Baileys connection`);

    // Return success - client will initiate QR code scan
    // The actual Baileys connection happens in a background process or when user scans QR
    return Response.json({
      success: true,
      message: 'OTP verified. Your WhatsApp will be connected shortly. Keep the browser open.',
      connectionId: connection.id,
      phoneNumber: cleaned,
      status: 'connecting',
    });
  } catch (error) {
    console.error('[whatsapp/verify-otp] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
