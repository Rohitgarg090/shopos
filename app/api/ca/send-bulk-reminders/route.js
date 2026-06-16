export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST /api/ca/send-bulk-reminders - Send reminders to multiple clients
export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];

    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is CA
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.user_metadata?.role !== 'ca_partner') {
      return Response.json(
        { error: 'Not a CA partner account' },
        { status: 403 }
      );
    }

    const { firmIds, messageTemplate, sendVia } = await req.json();

    if (!firmIds || firmIds.length === 0 || !messageTemplate || !sendVia) {
      return Response.json(
        { error: 'firmIds (array), messageTemplate, and sendVia are required' },
        { status: 400 }
      );
    }

    if (!['whatsapp', 'email', 'both'].includes(sendVia)) {
      return Response.json(
        { error: 'sendVia must be whatsapp, email, or both' },
        { status: 400 }
      );
    }

    // Get CA profile
    const { data: caData } = await supabase
      .from('ca_partners')
      .select('id, phone, email')
      .eq('user_id', user.id)
      .single();

    if (!caData) {
      return Response.json(
        { error: 'CA profile not found' },
        { status: 404 }
      );
    }

    // Verify CA has access to all firms
    const { data: accessCheck } = await supabase
      .from('ca_client_links')
      .select('id, firm_id')
      .eq('ca_id', caData.id)
      .eq('status', 'accepted')
      .in('firm_id', firmIds);

    if (!accessCheck || accessCheck.length !== firmIds.length) {
      return Response.json(
        { error: 'No access to some firms' },
        { status: 403 }
      );
    }

    // Get firm owners' phones/emails for sending reminders
    const { data: firmOwners } = await supabase
      .from('firms')
      .select('id, user_id, users(email, phone)')
      .in('id', firmIds);

    if (!firmOwners) {
      return Response.json(
        { error: 'Could not fetch firm details' },
        { status: 500 }
      );
    }

    // Send reminders and log
    const results = [];
    const logEntries = [];

    for (const firm of firmOwners) {
      const ownerPhone = firm.users?.phone;
      const ownerEmail = firm.users?.email;

      // Send WhatsApp
      if (sendVia === 'whatsapp' || sendVia === 'both') {
        if (ownerPhone) {
          try {
            // TODO: Integrate with Twilio or WhatsApp business API
            // For now, just log the intent
            console.log('[send-bulk-reminders] Would send WhatsApp to:', ownerPhone);

            logEntries.push({
              ca_id: caData.id,
              firm_id: firm.id,
              message_type: 'whatsapp',
              recipient_phone: ownerPhone,
              message_content: messageTemplate,
              status: 'sent', // In production, mark as 'pending' until Twilio confirms
            });

            results.push({
              firmId: firm.id,
              whatsapp: { success: true, phone: ownerPhone },
            });
          } catch (err) {
            console.error('[send-bulk-reminders] WhatsApp error:', err);
            results.push({
              firmId: firm.id,
              whatsapp: { success: false, error: err.message },
            });
          }
        }
      }

      // Send Email
      if (sendVia === 'email' || sendVia === 'both') {
        if (ownerEmail) {
          try {
            // TODO: Integrate with Resend or SendGrid
            // For now, just log the intent
            console.log('[send-bulk-reminders] Would send email to:', ownerEmail);

            logEntries.push({
              ca_id: caData.id,
              firm_id: firm.id,
              message_type: 'email',
              recipient_email: ownerEmail,
              message_content: messageTemplate,
              status: 'sent',
            });

            results.push({
              firmId: firm.id,
              email: { success: true, email: ownerEmail },
            });
          } catch (err) {
            console.error('[send-bulk-reminders] Email error:', err);
            results.push({
              firmId: firm.id,
              email: { success: false, error: err.message },
            });
          }
        }
      }
    }

    // Log all reminders
    if (logEntries.length > 0) {
      const { error: logError } = await supabase
        .from('ca_reminder_logs')
        .insert(logEntries);

      if (logError) {
        console.error('[send-bulk-reminders] Log error:', logError);
      }
    }

    const sentCount = logEntries.filter(l => l.status === 'sent').length;
    const failedCount = logEntries.length - sentCount;

    return Response.json({
      success: true,
      message: `Reminders sent to ${sentCount} clients`,
      summary: {
        total: firmIds.length,
        sent: sentCount,
        failed: failedCount,
      },
      results,
    });
  } catch (error) {
    console.error('[send-bulk-reminders] Error:', error);
    return Response.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// GET /api/ca/send-bulk-reminders - Get reminder history
export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];

    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is CA
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.user_metadata?.role !== 'ca_partner') {
      return Response.json(
        { error: 'Not a CA partner account' },
        { status: 403 }
      );
    }

    // Get CA ID
    const { data: caData } = await supabase
      .from('ca_partners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!caData) {
      return Response.json(
        { error: 'CA profile not found' },
        { status: 404 }
      );
    }

    // Get reminder logs (last 100)
    const { data: logs, error: logsError } = await supabase
      .from('ca_reminder_logs')
      .select(`
        id,
        firm_id,
        firms(name),
        message_type,
        recipient_phone,
        recipient_email,
        status,
        sent_at
      `)
      .eq('ca_id', caData.id)
      .order('sent_at', { ascending: false })
      .limit(100);

    if (logsError) {
      return Response.json(
        { error: logsError.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      logs: logs || [],
    });
  } catch (error) {
    console.error('[send-bulk-reminders-get] Error:', error);
    return Response.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
