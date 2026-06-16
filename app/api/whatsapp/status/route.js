export const dynamic = 'force-dynamic';
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

export async function GET(req) {
  try {
    const c = await ctx(req);
    if (!c) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const firmId = new URL(req.url).searchParams.get('firmId');
    if (!firmId) return Response.json({ error: 'firmId required' }, { status: 400 });

    // Get WhatsApp connection status
    const { data: connection, error } = await adminClient
      .from('whatsapp_connections')
      .select('phone_number, is_verified, session_status, error_message, last_activity')
      .eq('firm_id', firmId)
      .eq('is_verified', true)
      .single();

    if (error || !connection) {
      return Response.json({
        connected: false,
        message: 'No WhatsApp connected yet',
      });
    }

    return Response.json({
      connected: connection.session_status === 'connected',
      phoneNumber: connection.phone_number,
      status: connection.session_status,
      lastActivity: connection.last_activity,
      error: connection.error_message,
    });
  } catch (error) {
    console.error('[whatsapp/status] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
