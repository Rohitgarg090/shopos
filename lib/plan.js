// Single source of truth for subscription plans and feature access (server only).
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const PLANS = {
  // users = total people on the account, including the owner
  trial:      { id: 'trial',      name: 'Free Trial',  firms: 1,  users: 1,  external: true,  priceAnnual: 0 },
  free:       { id: 'free',       name: 'Free',        firms: 1,  users: 1,  external: false, priceAnnual: 0 },
  business4:  { id: 'business4',  name: 'Business 4',  firms: 4,  users: 4,  external: true,  priceAnnual: 1499 },
  business10: { id: 'business10', name: 'Business 10', firms: 10, users: 25, external: true,  priceAnnual: 2499 },
};
export const PAID_PLAN_IDS = ['business4', 'business10'];

const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export function resolvePlan(row, now = new Date()) {
  const paidUntil = row?.paid_until ? new Date(row.paid_until) : null;
  const trialEnds = row?.trial_ends_at ? new Date(row.trial_ends_at) : null;
  let id = 'free';
  if (row && PAID_PLAN_IDS.includes(row.paid_plan) && paidUntil && paidUntil > now) id = row.paid_plan;
  else if (trialEnds && trialEnds > now) id = 'trial';
  const p = PLANS[id];
  return {
    plan: id,
    name: p.name,
    firmLimit: p.firms,
    userLimit: p.users,
    external: p.external,
    trialEndsAt: row?.trial_ends_at || null,
    paidPlan: row?.paid_plan || null,
    paidUntil: row?.paid_until || null,
    trialDaysLeft: id === 'trial' ? Math.max(0, Math.ceil((trialEnds - now) / 864e5)) : 0,
  };
}

export async function getPlan(userId) {
  const { data, error } = await admin().from('trial_limits')
    .select('user_id,trial_ends_at,paid_plan,paid_until').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message); // e.g. migration not run yet — callers fail open
  return resolvePlan(data);
}

// Plans belong to the firm owner: a staff member of a paid firm gets the owner's plan.
export async function getPlanForFirm(userId, firmId) {
  if (firmId) {
    const { data: firm } = await admin().from('firms').select('owner_id').eq('id', firmId).maybeSingle();
    if (firm?.owner_id) return getPlan(firm.owner_id);
  }
  return getPlan(userId);
}

export async function countOwnedFirms(userId) {
  const { count } = await admin().from('firms').select('id', { count: 'exact', head: true }).eq('owner_id', userId);
  return count || 0;
}

const FEATURE_LABEL = {
  ai: 'AI scanning',
  eway: 'E-Way Bill',
  einvoice: 'E-Invoice',
  messaging: 'Email / WhatsApp / SMS sending',
};

// Returns a 402 response when the firm's plan can't use external services, else null.
export async function blockIfFree(userId, firmId, feature) {
  try {
    const p = await getPlanForFirm(userId, firmId);
    if (p.external) return null;
    return NextResponse.json({
      error: `${FEATURE_LABEL[feature] || 'This feature'} is available on Business plans. Upgrade to use it.`,
      code: 'PLAN_REQUIRED', feature, plan: p.plan,
    }, { status: 402 });
  } catch (e) {
    console.error('[plan] check failed, allowing request:', e.message);
    return null;
  }
}

// New accounts that somehow skipped registration get the standard 14-day trial.
export async function ensurePlanRow(userId) {
  const db = admin();
  const { data, error } = await db.from('trial_limits').select('user_id').eq('user_id', userId).maybeSingle();
  if (error || data) return;
  const ends = new Date(); ends.setDate(ends.getDate() + 14);
  await db.from('trial_limits').insert({ user_id: userId, is_trial: true, trial_started_at: new Date().toISOString(), trial_ends_at: ends.toISOString() });
}

// People on the owner's account (owner + distinct active/invited members across all owned firms).
export async function accountUsers(ownerId) {
  const db = admin();
  const { data: firms } = await db.from('firms').select('id').eq('owner_id', ownerId);
  const ids = (firms || []).map(f => f.id);
  const people = new Set();
  if (ids.length) {
    const { data: rows } = await db.from('firm_members').select('user_id,status').in('firm_id', ids).in('status', ['active', 'invited']);
    (rows || []).forEach(r => { if (r.user_id && r.user_id !== ownerId) people.add(r.user_id); });
  }
  return { people, count: people.size + 1 };
}

// Returns a 402 response if adding `newUserId` to `firmId` would exceed the owner's user limit, else null.
export async function blockIfNoSeat(firmId, newUserId) {
  try {
    const { data: firm } = await admin().from('firms').select('owner_id').eq('id', firmId).maybeSingle();
    if (!firm?.owner_id || newUserId === firm.owner_id) return null;
    const plan = await getPlan(firm.owner_id);
    const { people, count } = await accountUsers(firm.owner_id);
    if (people.has(newUserId) || count < plan.userLimit) return null;
    return NextResponse.json({
      error: plan.userLimit === 1
        ? `The ${plan.name} plan is for 1 user only. Upgrade to Business 4 (4 users) or Business 10 (25 users) to add team members.`
        : `Your ${plan.name} plan allows ${plan.userLimit} users (you have ${count}). Upgrade or remove a member to add someone new.`,
      code: 'PLAN_REQUIRED', feature: 'users', plan: plan.plan, userLimit: plan.userLimit, users: count,
    }, { status: 402 });
  } catch (e) {
    console.error('[plan] seat check failed, allowing:', e.message);
    return null;
  }
}
