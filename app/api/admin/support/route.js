export const dynamic = 'force-dynamic';
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
        let userEmail = 'N/A';
        let orgName = 'N/A';
        let orgId = null;

        try {
          // Get user info
          if (ticket.user_id) {
            const {
              data: { user },
            } = await supabase.auth.admin.getUserById(ticket.user_id);
            userEmail = user?.email || 'N/A';
          }

          // Get organization info
          if (ticket.user_id) {
            const { data: org } = await supabase
              .from('organizations')
              .select('*')
              .eq('owner_id', ticket.user_id)
              .single();

            if (org) {
              orgName = org.name;
              orgId = org.id;
            }
          }
        } catch (e) {
          console.error('Error enriching ticket:', ticket.id, e);
        }

        return {
          id: ticket.id,
          title: ticket.title,
          description: ticket.description,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          createdAt: ticket.created_at,
          updatedAt: ticket.updated_at,
          customerEmail: userEmail,
          customerName: orgName,
          customerId: ticket.user_id,
          orgId: orgId,
        };
      })
    );

    return Response.json({ tickets: enriched });
  } catch (error) {
    console.error('GET /admin/support error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
