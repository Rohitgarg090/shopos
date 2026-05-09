import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAILS = ['rohitgargof@gmail.com'];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PLAN_PRICES = {
  starter: 799,
  business: 1499,
  pro: 2499,
  free: 0,
};

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

    // Get all organizations
    const { data: allOrgs, error } = await supabase
      .from('organizations')
      .select('*')
      .is('deleted_at', null);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Calculate counts
    const totalCustomers = allOrgs.length;
    const trialCount = allOrgs.filter((o) => o.status === 'trial').length;
    const activeCount = allOrgs.filter((o) => o.status === 'active').length;
    const suspendedCount = allOrgs.filter((o) => o.status === 'suspended').length;

    // Calculate MRR and plan distribution
    let mrr = 0;
    const planDistribution = { starter: 0, business: 0, pro: 0, free: 0 };

    allOrgs.forEach((org) => {
      if (org.status === 'active' || org.status === 'trial') {
        const price = PLAN_PRICES[org.plan] || 0;
        mrr += price;
        planDistribution[org.plan] = (planDistribution[org.plan] || 0) + 1;
      }
    });

    const arr = mrr * 12;

    // Calculate new signups this month and last month
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const newThisMonth = allOrgs.filter((o) => {
      const created = new Date(o.created_at);
      return created >= thisMonthStart;
    }).length;

    const newLastMonth = allOrgs.filter((o) => {
      const created = new Date(o.created_at);
      return created >= lastMonthStart && created <= lastMonthEnd;
    }).length;

    // Calculate conversion rate
    const conversionRate =
      activeCount + trialCount > 0
        ? Math.round((activeCount / (activeCount + trialCount)) * 100)
        : 0;

    // Revenue by month (last 6 months)
    const revenueByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      let monthRevenue = 0;
      allOrgs.forEach((org) => {
        const created = new Date(org.created_at);
        if (created >= monthStart && created <= monthEnd && org.status === 'active') {
          monthRevenue += PLAN_PRICES[org.plan] || 0;
        }
      });

      revenueByMonth.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: monthRevenue,
      });
    }

    return Response.json({
      totalCustomers,
      trialCount,
      activeCount,
      suspendedCount,
      mrr,
      arr,
      newThisMonth,
      newLastMonth,
      conversionRate,
      planDistribution,
      revenueByMonth,
    });
  } catch (error) {
    console.error('GET /admin/analytics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
