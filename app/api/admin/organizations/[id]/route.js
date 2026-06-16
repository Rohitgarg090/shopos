export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { isAdminEmail, getSafeErrorMessage, validateInput } from '@/lib/security';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VALID_STATUSES = ['trial', 'active', 'suspended'];
const VALID_PLANS = ['starter', 'business', 'pro', 'free'];
const MAX_TRIAL_DAYS = 30;

async function verifyAdmin(token) {
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user || !isAdminEmail(user.email)) {
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
    let userEmail = 'N/A';
    try {
      if (org.owner_id) {
        const {
          data: { user },
        } = await supabase.auth.admin.getUserById(org.owner_id);
        userEmail = user?.email || 'N/A';
      }
    } catch (e) {
      console.error('Error fetching user:', e);
    }

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
    const trialEndsAt = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
    const now = new Date();
    const trialDaysRemaining = org.status === 'trial' && trialEndsAt
      ? Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24))
      : null;

    return Response.json({
      organization: {
        id: org.id,
        name: org.name,
        email: userEmail,
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
    return Response.json({ error: getSafeErrorMessage(error) }, { status: 500 });
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

    // Validate input
    const errors = validateInput(
      { status, plan, trialDaysToAdd },
      {
        status: { allowedValues: VALID_STATUSES },
        plan: { allowedValues: VALID_PLANS },
        trialDaysToAdd: {
          minValue: 1,
          maxValue: MAX_TRIAL_DAYS,
        },
      }
    );

    if (errors) {
      return Response.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

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
    if (status && VALID_STATUSES.includes(status)) {
      updateData.status = status;
    }

    // Handle plan change
    if (plan && VALID_PLANS.includes(plan)) {
      updateData.plan = plan;
      // Activate org if changing to a paid plan
      if (plan !== 'trial') {
        updateData.status = 'active';
      }
    }

    // Handle trial extension
    if (trialDaysToAdd && trialDaysToAdd > 0 && trialDaysToAdd <= MAX_TRIAL_DAYS) {
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
      return Response.json({ error: getSafeErrorMessage(error) }, { status: 500 });
    }

    let updateUserEmail = 'N/A';
    try {
      if (org.owner_id) {
        const {
          data: { user },
        } = await supabase.auth.admin.getUserById(org.owner_id);
        updateUserEmail = user?.email || 'N/A';
      }
    } catch (e) {
      console.error('Error fetching user for update:', e);
    }

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
        email: updateUserEmail,
        status: updated.status,
        plan: updated.plan,
        trialEndsAt: updated.trial_ends_at,
        trialDaysRemaining,
        updatedAt: updated.updated_at,
      },
    });
  } catch (error) {
    console.error('PATCH /admin/organizations/[id] error:', error);
    return Response.json({ error: getSafeErrorMessage(error) }, { status: 500 });
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
      return Response.json({ error: getSafeErrorMessage(error) }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Organization deleted' });
  } catch (error) {
    console.error('DELETE /admin/organizations/[id] error:', error);
    return Response.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}
