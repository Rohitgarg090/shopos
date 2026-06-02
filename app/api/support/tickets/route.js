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

    // Get support tickets for this firm
    const { data: tickets, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('firm_id', firmId)
      .order('created_at', { ascending: false });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ tickets: tickets || [] });
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
        firm_id: firmId,
        user_id: user.id,
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
