import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];
    const firmId = req.headers.get('x-firm-id');

    if (!token || !firmId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if fetching a single ticket with details
    const url = new URL(req.url);
    const ticketId = url.searchParams.get('id');

    if (ticketId) {
      // Fetch single ticket with messages
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .eq('organization_id', firmId)
        .single();

      if (ticketError || !ticket) {
        return Response.json({ error: 'Ticket not found' }, { status: 404 });
      }

      // Fetch messages for this ticket
      const { data: messages, error: msgError } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (!msgError) {
        ticket.messages = messages || [];
      }

      return Response.json({ success: true, ticket });
    }

    // Get all support tickets for this organization
    const { data: tickets, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('organization_id', firmId)
      .order('created_at', { ascending: false });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // For list view, fetch message counts for each ticket
    const ticketsWithCounts = await Promise.all(
      (tickets || []).map(async (ticket) => {
        const { count } = await supabase
          .from('ticket_messages')
          .select('id', { count: 'exact', head: true })
          .eq('ticket_id', ticket.id);
        return { ...ticket, messages: Array(count || 0) };
      })
    );

    return Response.json({ tickets: ticketsWithCounts || [] });
  } catch (error) {
    console.error('[support] GET tickets error:', error);
    return Response.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];
    const firmId = req.headers.get('x-firm-id');

    if (!token || !firmId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, category, priority } = await req.json();

    if (!title || !description) {
      return Response.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        organization_id: firmId,
        created_by: user.id,
        title,
        description,
        category: category || 'general',
        priority: priority || 'medium',
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ ticket });
  } catch (error) {
    console.error('[support] POST error:', error);
    return Response.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
