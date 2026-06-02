import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function PATCH(req, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return Response.json({ error: 'ID is required' }, { status: 400 });
    }

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];

    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminEmails = (process.env.ADMIN_EMAILS || 'rohitgarg090@gmail.com,info@shopos.co.in')
      .split(',')
      .map(e => e.trim().toLowerCase());

    if (!adminEmails.includes((user.email || '').toLowerCase())) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    const { status } = await req.json();

    if (!status) {
      return Response.json({ error: 'Status is required' }, { status: 400 });
    }

    // Update demo request
    const { data, error } = await supabase
      .from('demo_requests')
      .update({
        status,
        contacted_at: new Date().toISOString(),
        contacted_by: user.email,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ request: data });
  } catch (error) {
    console.error('[demo-request] PATCH error:', error);
    return Response.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
