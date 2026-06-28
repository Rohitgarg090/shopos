export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];

    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get trial/subscription status
    const { data: trial, error: trialError } = await supabase
      .from('trial_limits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (trialError || !trial) {
      return Response.json({
        plan: 'unknown',
        isExpired: true,
      });
    }

    // Check if trial expired
    const isExpired = new Date() > new Date(trial.trial_ends_at);

    // Normalize plan name (handle both 'trial' and 'free_trial')
    const normalizedPlan = trial.subscription_plan === 'trial' ? 'free_trial' : trial.subscription_plan;

    // Calculate remaining limits
    const limits = {
      plan: normalizedPlan,
      isExpired,
      aiScansRemaining: Math.max(0, trial.ai_scans_limit - trial.ai_scans_used),
      ewayFilesRemaining: Math.max(0, trial.eway_files_limit - trial.eway_files_used),
      eInvoiceFilesRemaining: Math.max(0, trial.einvoice_files_limit - trial.einvoice_files_used),
      firmCountLimit: trial.firm_count_limit,
      trialEndsAt: trial.trial_ends_at,
      subscriptionPlan: trial.subscription_plan,
    };

    // Count user's current firms
    const { data: firms, error: firmError } = await supabase
      .from('firm_members')
      .select('firm_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('role', 'owner');

    if (!firmError && firms) {
      limits.currentFirmCount = firms.length;
      limits.canCreateFirm = firms.length < trial.firm_count_limit;
    }

    return Response.json(limits);
  } catch (error) {
    console.error('[trial-status] Error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
