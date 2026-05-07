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

// Create a support ticket
export async function POST(req) {
  try {
    const { user, org, supabase: sb } = await ctx(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { title, description, category, priority = 'medium' } = await req.json();

    if (!title || !category) {
      return Response.json(
        { error: 'Title and category required' },
        { status: 400 }
      );
    }

    // Create ticket
    const { data: ticket } = await sb
      .from('support_tickets')
      .insert({
        organization_id: org.id,
        created_by: user.id,
        title,
        description,
        category,
        priority,
        status: 'open',
      })
      .select()
      .single();

    // Create initial message
    await sb.from('ticket_messages').insert({
      ticket_id: ticket.id,
      sender_id: user.id,
      message: description,
      is_internal: false,
    });

    // TODO: Trigger Claude AI support agent here
    // For now, just create the ticket

    return Response.json({
      success: true,
      ticket_id: ticket.id,
      status: ticket.status,
      message: 'Ticket created. Support team will respond shortly.',
    });
  } catch (error) {
    console.error('Ticket creation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Get tickets for organization
export async function GET(req) {
  try {
    const { user, org, supabase: sb } = await ctx(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const ticketId = searchParams.get('id');

    let query = sb
      .from('support_tickets')
      .select('*')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false });

    if (ticketId) {
      query = query.eq('id', ticketId);
    } else if (status) {
      query = query.eq('status', status);
    }

    const { data: tickets } = await query;

    // Get messages for each ticket if single ticket requested
    if (ticketId && tickets.length > 0) {
      const { data: messages } = await sb
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      return Response.json({
        success: true,
        ticket: {
          ...tickets[0],
          messages: messages || [],
        },
      });
    }

    return Response.json({
      success: true,
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    console.error('Ticket fetch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
