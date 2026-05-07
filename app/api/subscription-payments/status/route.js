import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getContext(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { error: 'No authorization token', status: 401 };
    }

    const token = authHeader.slice(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { error: 'Invalid token', status: 401 };
    }

    return { user, token };
  } catch (err) {
    return { error: err.message, status: 401 };
  }
}

export async function GET(req) {
  const ctx = await getContext(req);
  if (ctx.error) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  try {
    let { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', ctx.user.id)
      .single();

    // Auto-create organization if it doesn't exist
    if (orgError || !org) {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      const { data: newOrg, error: createError } = await supabase
        .from('organizations')
        .insert({
          owner_id: ctx.user.id,
          name: ctx.user.email?.split('@')[0] || 'Organization',
          email: ctx.user.email,
          status: 'trial',
          plan: 'starter',
          trial_started_at: new Date().toISOString(),
          trial_ends_at: trialEndsAt.toISOString(),
        })
        .select()
        .single();

      if (createError || !newOrg) {
        return Response.json({
          status: 'trial',
          plan: 'starter',
          trialDaysRemaining: 14,
          trialStartedAt: new Date().toISOString(),
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        });
      }
      org = newOrg;
    }

    const trialEnds = new Date(org.trial_ends_at);
    const today = new Date();
    const daysRemaining = Math.ceil((trialEnds - today) / (1000 * 60 * 60 * 24));

    return Response.json({
      id: org.id,
      status: org.status,
      plan: org.plan,
      trialDaysRemaining: Math.max(0, daysRemaining),
      trialStartedAt: org.trial_started_at,
      trialEndsAt: org.trial_ends_at,
      subscriptionStartedAt: org.subscription_started_at,
      subscriptionEndsAt: org.subscription_ends_at,
      seatsPurchased: org.seats_purchased,
      seatsUsed: org.seats_used,
      name: org.name,
      email: org.email,
      phone: org.phone,
      organization_id: org.id
    });
  } catch (error) {
    console.error('Status check error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
