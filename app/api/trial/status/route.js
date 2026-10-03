export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { getPlan, countOwnedFirms, ensurePlanRow, accountUsers, PLANS } from '@/lib/plan';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Current user's plan, firm usage and limits.
export async function GET(req) {
  try {
    const token = req.headers.get('authorization')?.split('Bearer ')[1];
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let plan;
    try { await ensurePlanRow(user.id); plan = await getPlan(user.id); }
    catch (e) {
      // Plan columns missing (migration not run): report full access so nothing is blocked.
      console.error('[trial-status] plan lookup failed:', e.message);
      plan = { plan: 'trial', name: 'Free Trial', firmLimit: 99, userLimit: 99, external: true, trialDaysLeft: 0, setupPending: true };
    }
    const currentFirmCount = await countOwnedFirms(user.id);
    let usersUsed = 1;
    try { usersUsed = (await accountUsers(user.id)).count; } catch { /* ignore */ }
    return Response.json({
      ...plan,
      currentFirmCount,
      canCreateFirm: currentFirmCount < plan.firmLimit,
      usersUsed,
      firmCountLimit: plan.firmLimit,
      isExpired: false,
      plans: Object.values(PLANS).filter(p => p.priceAnnual > 0),
    });
  } catch (error) {
    console.error('[trial-status] Error:', error);
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
