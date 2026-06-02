import { createClient } from '@supabase/supabase-js';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req) {
  try {
    const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user } } = await sb.auth.getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Get user's latest join request
    const { data: requests } = await adminClient
      .from('firm_join_requests')
      .select('id, firm_id, status, role, name, requested_at, reviewed_at, notes')
      .eq('user_id', user.id)
      .order('requested_at', { ascending: false })
      .limit(5);

    if (!requests || requests.length === 0) {
      return Response.json({ pending: false, request: null });
    }

    // Enrich with firm name
    const enriched = await Promise.all(
      requests.map(async (r) => {
        const { data: firm } = await adminClient
          .from('firms')
          .select('name')
          .eq('id', r.firm_id)
          .single();
        return { ...r, firmName: firm?.name || 'Unknown Firm' };
      })
    );

    const pendingOrRejected = enriched.find(r => r.status === 'pending' || r.status === 'rejected');

    return Response.json({
      pending: pendingOrRejected?.status === 'pending',
      request: pendingOrRejected || null,
      all: enriched,
    });
  } catch (error) {
    console.error('[firm-requests/me] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
