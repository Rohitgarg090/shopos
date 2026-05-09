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

export async function PATCH(req, { params }) {
  try {
    const token = req.headers.get('authorization')?.split('Bearer ')[1];
    const admin = await verifyAdmin(token);

    if (!admin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { isActive, title, message, type, target, targetOrgIds, showUntil } = await req.json();

    const updateData = {};

    if (isActive !== undefined) {
      updateData.is_active = isActive;
    }

    if (title) {
      updateData.title = title;
    }

    if (message) {
      updateData.message = message;
    }

    if (type) {
      updateData.type = type;
    }

    if (target) {
      updateData.target = target;
    }

    if (targetOrgIds) {
      updateData.target_org_ids = targetOrgIds;
    }

    if (showUntil !== undefined) {
      updateData.show_until = showUntil;
    }

    updateData.updated_at = new Date().toISOString();

    const { data: announcement, error } = await supabase
      .from('system_announcements')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, announcement });
  } catch (error) {
    console.error('PATCH /admin/announcements/[id] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const token = req.headers.get('authorization')?.split('Bearer ')[1];
    const admin = await verifyAdmin(token);

    if (!admin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const { error } = await supabase
      .from('system_announcements')
      .delete()
      .eq('id', id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    console.error('DELETE /admin/announcements/[id] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
