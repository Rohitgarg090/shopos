export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper to get auth context
async function ctx(req) {
  const token = req.headers.get('authorization')?.split('Bearer ')[1];
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) return { error: 'Unauthorized', status: 401 };

  return { user, supabase };
}

export async function POST(req) {
  try {
    const { user, supabase: sb } = await ctx(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { code, plan, billing_period, amount } = await req.json();

    if (!code || !plan) {
      return Response.json(
        { error: 'Code and plan required' },
        { status: 400 }
      );
    }

    // Find coupon
    const { data: coupon } = await sb
      .from('coupon_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (!coupon) {
      return Response.json({ error: 'Invalid coupon code', valid: false }, { status: 400 });
    }

    const now = new Date();

    // Check if valid
    if (coupon.valid_from > now) {
      return Response.json(
        { error: 'Coupon not yet active', valid: false },
        { status: 400 }
      );
    }

    if (coupon.valid_until && coupon.valid_until < now) {
      return Response.json(
        { error: 'Coupon has expired', valid: false },
        { status: 400 }
      );
    }

    // Check max uses
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return Response.json(
        { error: 'Coupon usage limit reached', valid: false },
        { status: 400 }
      );
    }

    // Check plan applicability
    if (
      !coupon.applicable_plans.includes(plan) &&
      !coupon.applicable_plans.includes('all')
    ) {
      return Response.json(
        { error: 'Not applicable to this plan', valid: false },
        { status: 400 }
      );
    }

    // Check billing period
    if (
      billing_period &&
      !coupon.applicable_billing.includes(billing_period) &&
      !coupon.applicable_billing.includes('all')
    ) {
      return Response.json(
        { error: 'Not applicable to this billing period', valid: false },
        { status: 400 }
      );
    }

    // Check minimum amount
    if (coupon.min_amount && amount < coupon.min_amount) {
      return Response.json(
        {
          error: `Minimum purchase ₹${coupon.min_amount / 100} required`,
          valid: false,
        },
        { status: 400 }
      );
    }

    // Calculate discount
    let discount_amount = 0;
    let discount_percent = 0;

    if (coupon.discount_type === 'percentage') {
      discount_percent = coupon.discount_value;
      discount_amount = Math.floor((amount * coupon.discount_value) / 100);
    } else {
      discount_amount = coupon.discount_value;
      discount_percent = amount > 0 ? Math.round((coupon.discount_value / amount) * 100) : 0;
    }

    return Response.json({
      valid: true,
      code: coupon.code,
      description: coupon.description,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      discount_amount: discount_amount,
      discount_percent: discount_percent,
      final_amount: Math.max(0, amount - discount_amount),
      max_uses: coupon.max_uses,
      current_uses: coupon.current_uses,
      remaining_uses: coupon.max_uses ? coupon.max_uses - coupon.current_uses : 'unlimited',
    });
  } catch (error) {
    console.error('Coupon validation error:', error);
    return Response.json(
      { error: error.message, valid: false },
      { status: 500 }
    );
  }
}
