import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAILS = ['rohitgargof@gmail.com'];

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

export async function GET(req) {
  try {
    const token = req.headers.get('authorization')?.split('Bearer ')[1];
    const admin = await verifyAdmin(token);

    if (!admin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = new URL(req.url).searchParams.get('status') || 'all';

    let query = supabase.from('support_tickets').select('*');

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: tickets, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Enrich tickets with customer info
    const enriched = await Promise.all(
      tickets.map(async (ticket) => {
        // Get user info
        const {
          data: { user },
        } = await supabase.auth.admin.getUserById(ticket.user_id);

        // Get organization info
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('owner_id', ticket.user_id)
          .single();

        return {
          id: ticket.id,
          title: ticket.title,
          description: ticket.description,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          createdAt: ticket.created_at,
          updatedAt: ticket.updated_at,
          customerEmail: user?.email || 'N/A',
          customerName: org?.name || 'N/A',
          customerId: ticket.user_id,
          orgId: org?.id,
        };
      })
    );

    return Response.json({ tickets: enriched });
  } catch (error) {
    console.error('GET /admin/support error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
