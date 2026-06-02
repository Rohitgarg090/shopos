import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAILS = ['rohitgarg090@gmail.com', 'info@shopos.co.in'];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyAdmin(token) {
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    return null;
  }

  return user;
}

export async function GET(req, { params }) {
  try {
    const token = req.headers.get('authorization')?.split('Bearer ')[1];
    const admin = await verifyAdmin(token);

    if (!admin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: ticketId } = params;

    const { data: messages, error } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Enrich messages with sender info
    const enriched = await Promise.all(
      messages.map(async (msg) => {
        let senderName = 'System';
        let senderEmail = 'info@shopos.co.in';

        try {
          if (msg.sender_id) {
            const {
              data: { user },
            } = await supabase.auth.admin.getUserById(msg.sender_id);
            if (user) {
              senderEmail = user.email;
              senderName = user.user_metadata?.name || user.email.split('@')[0];
            }
          }
        } catch (e) {
          console.error('Error fetching sender:', e);
        }

        return {
          id: msg.id,
          ticketId: msg.ticket_id,
          senderId: msg.sender_id,
          senderName,
          senderEmail,
          message: msg.message,
          isInternal: msg.is_internal,
          createdAt: msg.created_at,
        };
      })
    );

    return Response.json({ messages: enriched });
  } catch (error) {
    console.error('GET messages error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const token = req.headers.get('authorization')?.split('Bearer ')[1];
    const admin = await verifyAdmin(token);

    if (!admin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: ticketId } = params;
    const { message } = await req.json();

    if (!message) {
      return Response.json({ error: 'Message required' }, { status: 400 });
    }

    // Create message
    const { data: newMessage, error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: admin.id,
        message,
        is_internal: false,
      })
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Update ticket updated_at
    await supabase
      .from('support_tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ticketId);

    return Response.json({
      success: true,
      message: {
        id: newMessage.id,
        ticketId: newMessage.ticket_id,
        senderId: newMessage.sender_id,
        senderName: admin.email.split('@')[0],
        senderEmail: admin.email,
        message: newMessage.message,
        isInternal: newMessage.is_internal,
        createdAt: newMessage.created_at,
      },
    });
  } catch (error) {
    console.error('POST message error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
