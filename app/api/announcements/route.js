export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req) {
  try {
    const token = req.headers.get('authorization')?.split('Bearer ')[1];

    if (!token) {
      return Response.json({ announcements: [] });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return Response.json({ announcements: [] });
    }

    // Get user's organization
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (!org) {
      return Response.json({ announcements: [] });
    }

    // Get active announcements
    const now = new Date().toISOString();

    let announcements = [];
    try {
      const { data, error } = await supabase
        .from('system_announcements')
        .select('*')
        .eq('is_active', true)
        .lte('show_from', now)
        .or(`show_until.is.null,show_until.gte.${now}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching announcements:', error);
      } else {
        announcements = data || [];
      }
    } catch (e) {
      console.error('Announcements fetch exception:', e);
    }

    // Filter announcements by target
    const filtered = announcements.filter((announcement) => {
      if (announcement.target === 'all') {
        return true;
      }

      if (announcement.target === org.status) {
        return true;
      }

      if (
        announcement.target === 'specific' &&
        announcement.target_org_ids &&
        announcement.target_org_ids.includes(org.id)
      ) {
        return true;
      }

      return false;
    });

    return Response.json({ announcements: filtered });
  } catch (error) {
    console.error('GET /api/announcements error:', error);
    return Response.json({ announcements: [] });
  }
}
