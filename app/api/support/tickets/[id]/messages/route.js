import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function ctx(req) {
  const token = req.headers.get('authorization')?.split('Bearer ')[1];
  const orgId = req.headers.get('x-firm-id');
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user || !orgId) return { error: 'Unauthorized', status: 401 };

  return { user, orgId, supabase };
}

// Get messages for ticket (used by SupportTickets component to fetch messages)
export async function GET(req, { params }) {
  try {
    const { user, orgId, supabase: sb } = await ctx(req);
    if (!user || !orgId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: ticketId } = params;

    // Verify ticket belongs to org
    const { data: ticket } = await sb
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .eq('organization_id', orgId)
      .single();

    if (!ticket) {
      return Response.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const { data: messages, error } = await sb
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
        let senderName = 'Support Team';
        let isSupport = false;

        try {
          if (msg.sender_id && msg.sender_id !== user.id) {
            const {
              data: { user: sender },
            } = await supabase.auth.admin.getUserById(msg.sender_id);
            if (sender) {
              senderName = 'Support Team';
              isSupport = true;
            }
          }
        } catch (e) {
          console.error('Error fetching sender:', e);
        }

        return {
          ...msg,
          senderName,
          isSupport,
        };
      })
    );

    return Response.json({ messages: enriched });
  } catch (error) {
    console.error('GET messages error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Add message to support ticket
export async function POST(req, { params }) {
  try {
    const { user, orgId, supabase: sb } = await ctx(req);
    if (!user || !orgId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: ticketId } = params;
    const { message } = await req.json();

    if (!message) {
      return Response.json({ error: 'Message required' }, { status: 400 });
    }

    // Verify ticket belongs to org
    const { data: ticket } = await sb
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .eq('organization_id', orgId)
      .single();

    if (!ticket) {
      return Response.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Add message
    const { data: newMessage } = await sb
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: user.id,
        message,
        is_internal: false,
      })
      .select()
      .single();

    // Update ticket updated_at
    await sb
      .from('support_tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ticketId);

    return Response.json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error('Message creation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
