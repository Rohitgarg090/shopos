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

    const { data: announcements, error } = await supabase
      .from('system_announcements')
      .select('*')
      .order('created_at', { ascending: false });

    // If table doesn't exist or error, return empty array
    if (error) {
      console.error('Announcements query error:', error);
      return Response.json({ announcements: [] });
    }

    return Response.json({ announcements: announcements || [] });
  } catch (error) {
    console.error('GET /admin/announcements error:', error);
    // Return empty array instead of error to keep admin panel working
    return Response.json({ announcements: [] });
  }
}

export async function POST(req) {
  try {
    const token = req.headers.get('authorization')?.split('Bearer ')[1];
    const admin = await verifyAdmin(token);

    if (!admin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, message, type, target, targetOrgIds, showUntil } = await req.json();

    if (!title || !message) {
      return Response.json(
        { error: 'Title and message required' },
        { status: 400 }
      );
    }

    const { data: announcement, error } = await supabase
      .from('system_announcements')
      .insert({
        title,
        message,
        type: type || 'info',
        target: target || 'all',
        target_org_ids: targetOrgIds || [],
        is_active: true,
        show_from: new Date().toISOString(),
        show_until: showUntil || null,
        created_by: admin.email,
      })
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, announcement });
  } catch (error) {
    console.error('POST /admin/announcements error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
