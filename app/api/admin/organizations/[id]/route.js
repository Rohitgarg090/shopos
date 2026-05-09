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

export async function GET(req, { params }) {
  try {
    const token = req.headers.get('authorization')?.split('Bearer ')[1];
    const admin = await verifyAdmin(token);

    if (!admin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const { data: org, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get owner email
    const {
      data: { user },
    } = await supabase.auth.admin.getUserById(org.owner_id);

    // Get associated firm
    const { data: firm } = await supabase
      .from('firms')
      .select('*')
      .eq('owner_id', org.owner_id)
      .single();

    // Get firm settings
    const { data: settings } = await supabase
      .from('firm_settings')
      .select('*')
      .eq('user_id', org.owner_id)
      .single();

    // Calculate trial days remaining
    const trialEndsAt = new Date(org.trial_ends_at);
    const now = new Date();
    const trialDaysRemaining = org.status === 'trial'
      ? Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24))
      : null;

    return Response.json({
      organization: {
        id: org.id,
        name: org.name,
        email: user?.email || 'N/A',
        status: org.status,
        plan: org.plan,
        trialEndsAt: org.trial_ends_at,
        trialDaysRemaining,
        createdAt: org.created_at,
        updatedAt: org.updated_at,
        owner_id: org.owner_id,
      },
      firm,
      settings,
    });
  } catch (error) {
    console.error('GET /admin/organizations/[id] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const token = req.headers.get('authorization')?.split('Bearer ')[1];
    const admin = await verifyAdmin(token);

    if (!admin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { status, plan, trialDaysToAdd, notes } = await req.json();

    const { data: org, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    const updateData = {};

    // Handle status update
    if (status) {
      updateData.status = status;
    }

    // Handle plan change
    if (plan) {
      updateData.plan = plan;
      // Activate org if changing to a paid plan
      if (plan !== 'trial') {
        updateData.status = 'active';
      }
    }

    // Handle trial extension
    if (trialDaysToAdd) {
      const currentTrialEnds = org.trial_ends_at
        ? new Date(org.trial_ends_at)
        : new Date();
      const newTrialEnds = new Date(
        currentTrialEnds.getTime() + trialDaysToAdd * 24 * 60 * 60 * 1000
      );
      updateData.trial_ends_at = newTrialEnds.toISOString();
    }

    // Handle free plan (never expires)
    if (plan === 'free') {
      updateData.status = 'active';
      updateData.plan = 'starter';
      updateData.trial_ends_at = null;
    }

    const { data: updated, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const {
      data: { user },
    } = await supabase.auth.admin.getUserById(org.owner_id);

    const trialEndsAt = updated.trial_ends_at
      ? new Date(updated.trial_ends_at)
      : null;
    const now = new Date();
    const trialDaysRemaining =
      updated.status === 'trial' && trialEndsAt
        ? Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24))
        : null;

    return Response.json({
      success: true,
      organization: {
        id: updated.id,
        name: updated.name,
        email: user?.email || 'N/A',
        status: updated.status,
        plan: updated.plan,
        trialEndsAt: updated.trial_ends_at,
        trialDaysRemaining,
        updatedAt: updated.updated_at,
      },
    });
  } catch (error) {
    console.error('PATCH /admin/organizations/[id] error:', error);
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

    // Soft delete by setting deleted_at timestamp
    const { error } = await supabase
      .from('organizations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Organization deleted' });
  } catch (error) {
    console.error('DELETE /admin/organizations/[id] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
