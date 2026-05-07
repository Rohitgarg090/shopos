import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function ctx(req) {
  const token = req.headers.get('authorization')?.split('Bearer ')[1];
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) return { error: 'Unauthorized', status: 401 };

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user.id)
    .single();

  return { user, org, supabase };
}

// Add message to support ticket
export async function POST(req, { params }) {
  try {
    const { user, org, supabase: sb } = await ctx(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

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
      .eq('organization_id', org.id)
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
