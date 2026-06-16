export const dynamic = 'force-dynamic';
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

export async function POST(req) {
  const ctx = await getContext(req);
  if (ctx.error) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  try {
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', ctx.user.id)
      .single();

    if (orgError || !org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (org.trial_extended_at) {
      return Response.json({ error: 'Trial already extended once' }, { status: 400 });
    }

    const newTrialEndsAt = new Date(org.trial_ends_at);
    newTrialEndsAt.setDate(newTrialEndsAt.getDate() + 7);

    const { data: updated, error: updateError } = await supabase
      .from('organizations')
      .update({
        trial_ends_at: newTrialEndsAt.toISOString(),
        trial_extended_at: new Date().toISOString(),
        trial_extended_until: newTrialEndsAt.toISOString()
      })
      .eq('id', org.id)
      .select()
      .single();

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: 'Trial extended by 7 days',
      newTrialEndsAt: updated.trial_ends_at
    });
  } catch (error) {
    console.error('Extend trial error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
