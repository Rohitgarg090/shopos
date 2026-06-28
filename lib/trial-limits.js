import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get user's trial/subscription info
 */
export async function getTrialStatus(userId) {
  const { data, error } = await supabase
    .from('trial_limits')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('[trial-limits] Get trial status error:', error);
    return null;
  }

  return data;
}

/**
 * Check if trial is expired
 */
export function isTrialExpired(trialData) {
  if (!trialData || !trialData.trial_ends_at) return false;
  return new Date() > new Date(trialData.trial_ends_at);
}

/**
 * Check if user can access AI scanning
 */
export async function canAccessAIScanning(userId) {
  const trial = await getTrialStatus(userId);
  if (!trial) return false; // No trial record = no access

  // Check if trial expired
  if (isTrialExpired(trial)) {
    return false; // Trial expired, no AI access
  }

  // Free trial: check if used < 10
  if (trial.subscription_plan === 'free_trial') {
    return trial.ai_scans_used < trial.ai_scans_limit;
  }

  // Basic: 50/month
  if (trial.subscription_plan === 'basic') {
    resetMonthlyLimitsIfNeeded(trial);
    return trial.ai_scans_used_this_month < 50;
  }

  // Business/Pro: unlimited
  return true;
}

/**
 * Check if user can access e-Way integration
 */
export async function canAccessEWay(userId) {
  const trial = await getTrialStatus(userId);
  if (!trial) return false;

  if (isTrialExpired(trial)) {
    return false;
  }

  // Free trial: 5 files
  if (trial.subscription_plan === 'free_trial') {
    return trial.eway_files_used < trial.eway_files_limit;
  }

  // Basic: blocked (not in pricing)
  if (trial.subscription_plan === 'basic') {
    return false;
  }

  // Business/Pro: unlimited
  return true;
}

/**
 * Check if user can access e-Invoice generation
 */
export async function canAccessEInvoice(userId) {
  const trial = await getTrialStatus(userId);
  if (!trial) return false;

  if (isTrialExpired(trial)) {
    return false;
  }

  // Free trial: 5 files
  if (trial.subscription_plan === 'free_trial') {
    return trial.einvoice_files_used < trial.einvoice_files_limit;
  }

  // Basic: blocked
  if (trial.subscription_plan === 'basic') {
    return false;
  }

  // Business/Pro: unlimited
  return true;
}

/**
 * Check if user can send email/WhatsApp
 */
export async function canAccessEmailWhatsApp(userId) {
  const trial = await getTrialStatus(userId);
  if (!trial) return false;

  // Free trial: allowed
  if (trial.subscription_plan === 'free_trial') {
    return !isTrialExpired(trial); // Allowed during trial, blocked after
  }

  // All paid plans: allowed
  return ['basic', 'business', 'business_pro'].includes(trial.subscription_plan);
}

/**
 * Get firm count limit for user
 */
export async function getFirmCountLimit(userId) {
  const trial = await getTrialStatus(userId);
  if (!trial) return 1; // Default to 1 firm

  const limits = {
    free_trial: 1,
    basic: 1,
    business: 3,
    business_pro: Infinity,
  };

  return limits[trial.subscription_plan] || 1;
}

/**
 * Check if user can create another firm
 */
export async function canCreateFirm(userId) {
  const trial = await getTrialStatus(userId);
  if (!trial) return false;

  const limit = getFirmCountLimit(userId);
  if (limit === Infinity) return true;

  // Count existing firms for this user
  const { data: firms, error } = await supabase
    .from('firm_members')
    .select('firm_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('role', 'owner'); // Count owned firms only

  if (error) {
    console.error('[trial-limits] Count firms error:', error);
    return false;
  }

  return (firms?.length || 0) < limit;
}

/**
 * Increment AI scan count
 */
export async function incrementAIScanCount(userId) {
  const trial = await getTrialStatus(userId);
  if (!trial) return false;

  if (trial.subscription_plan === 'free_trial') {
    const { error } = await supabase
      .from('trial_limits')
      .update({ ai_scans_used: trial.ai_scans_used + 1 })
      .eq('user_id', userId);

    if (error) {
      console.error('[trial-limits] Increment AI scan error:', error);
      return false;
    }
  } else if (trial.subscription_plan === 'basic') {
    resetMonthlyLimitsIfNeeded(trial);
    const { error } = await supabase
      .from('trial_limits')
      .update({ ai_scans_used_this_month: trial.ai_scans_used_this_month + 1 })
      .eq('user_id', userId);

    if (error) {
      console.error('[trial-limits] Increment monthly AI scan error:', error);
      return false;
    }
  }

  return true;
}

/**
 * Increment e-Way file count
 */
export async function incrementEWayCount(userId) {
  const trial = await getTrialStatus(userId);
  if (!trial) return false;

  if (trial.subscription_plan === 'free_trial') {
    const { error } = await supabase
      .from('trial_limits')
      .update({ eway_files_used: trial.eway_files_used + 1 })
      .eq('user_id', userId);

    if (error) {
      console.error('[trial-limits] Increment e-Way count error:', error);
      return false;
    }
  }

  return true;
}

/**
 * Increment e-Invoice file count
 */
export async function incrementEInvoiceCount(userId) {
  const trial = await getTrialStatus(userId);
  if (!trial) return false;

  if (trial.subscription_plan === 'free_trial') {
    const { error } = await supabase
      .from('trial_limits')
      .update({ einvoice_files_used: trial.einvoice_files_used + 1 })
      .eq('user_id', userId);

    if (error) {
      console.error('[trial-limits] Increment e-Invoice count error:', error);
      return false;
    }
  }

  return true;
}

/**
 * Reset monthly limits if needed
 */
export async function resetMonthlyLimitsIfNeeded(trialData) {
  if (!trialData.current_month_starts_at) return;

  const currentMonthStart = new Date(trialData.current_month_starts_at);
  const now = new Date();

  // Check if month has changed
  if (currentMonthStart.getMonth() !== now.getMonth() ||
      currentMonthStart.getFullYear() !== now.getFullYear()) {

    // Reset monthly counters
    const { error } = await supabase
      .from('trial_limits')
      .update({
        ai_scans_used_this_month: 0,
        eway_files_used_this_month: 0,
        einvoice_files_used_this_month: 0,
        current_month_starts_at: now,
      })
      .eq('user_id', trialData.user_id);

    if (error) {
      console.error('[trial-limits] Reset monthly limits error:', error);
    }
  }
}

/**
 * Get remaining limits for user
 */
export async function getRemainingLimits(userId) {
  const trial = await getTrialStatus(userId);
  if (!trial) return null;

  if (trial.subscription_plan === 'free_trial') {
    return {
      plan: 'free_trial',
      aiScansRemaining: Math.max(0, trial.ai_scans_limit - trial.ai_scans_used),
      ewayFilesRemaining: Math.max(0, trial.eway_files_limit - trial.eway_files_used),
      eInvoiceFilesRemaining: Math.max(0, trial.einvoice_files_limit - trial.einvoice_files_used),
      trialEndsAt: trial.trial_ends_at,
      isExpired: isTrialExpired(trial),
    };
  }

  if (trial.subscription_plan === 'basic') {
    resetMonthlyLimitsIfNeeded(trial);
    return {
      plan: 'basic',
      aiScansRemaining: Math.max(0, 50 - trial.ai_scans_used_this_month),
      ewayFilesRemaining: 0, // Not available
      eInvoiceFilesRemaining: 0, // Not available
    };
  }

  return {
    plan: trial.subscription_plan,
    aiScansRemaining: Infinity,
    ewayFilesRemaining: Infinity,
    eInvoiceFilesRemaining: Infinity,
  };
}
