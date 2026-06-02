import { createClient } from '@supabase/supabase-js';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function ctx(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user } } = await sb.auth.getUser();
  return user ? { user } : null;
}

export async function POST(req) {
  try {
    const c = await ctx(req);
    if (!c) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { firmId, customerNumber, invoiceNo, amount, pdfBase64 } = await req.json();

    if (!firmId || !customerNumber || !invoiceNo) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Clean phone number
    let cleaned = customerNumber.replace(/[^0-9]/g, '');
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }

    // Check if WhatsApp is connected
    const { data: connection } = await adminClient
      .from('whatsapp_connections')
      .select('session_status, is_verified, error_message')
      .eq('firm_id', firmId)
      .eq('is_verified', true)
      .single();

    if (!connection || connection.session_status !== 'connected') {
      return Response.json(
        {
          error: 'WhatsApp not connected. Please connect in Settings first.',
          status: connection?.session_status || 'disconnected',
        },
        { status: 400 }
      );
    }

    // TODO: Integrate with Baileys to actually send the message
    // For now, return success with instructions
    console.log(`[whatsapp/send-invoice] Would send invoice ${invoiceNo} to ${cleaned} via WhatsApp`);

    // Update last activity
    await adminClient
      .from('whatsapp_connections')
      .update({ last_activity: new Date().toISOString() })
      .eq('firm_id', firmId)
      .eq('is_verified', true);

    return Response.json({
      success: true,
      message: `Invoice sent to ${cleaned}`,
      customerNumber: cleaned,
      invoiceNo,
    });
  } catch (error) {
    console.error('[whatsapp/send-invoice] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
