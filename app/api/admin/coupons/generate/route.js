export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Check if user is admin (hardcoded for now, can be improved)
const ADMIN_EMAILS = ['rohitgarg090@gmail.com', 'info@shopos.co.in']; // Your email

async function ctx(req) {
  const token = req.headers.get('authorization')?.split('Bearer ')[1];
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    return { error: 'Admin access required', status: 403 };
  }

  return { user, supabase };
}

function generateCouponCode(prefix = '', count = 1) {
  const codes = [];
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  for (let i = 0; i < count; i++) {
    let code = prefix;
    for (let j = 0; j < 6; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    codes.push(code);
  }

  return codes;
}

export async function POST(req) {
  try {
    const { user, supabase: sb } = await ctx(req);
    if (!user) return Response.json({ error: 'Admin access required' }, { status: 403 });

    const {
      count = 1,
      prefix = 'PROMO',
      discount_type,
      discount_value,
      valid_from,
      valid_until,
      applicable_plans = ['starter', 'business', 'pro'],
      applicable_to = 'all',
      applicable_billing = ['monthly', 'annual'],
      max_uses_per_coupon,
      description,
    } = await req.json();

    if (!discount_type || !discount_value) {
      return Response.json(
        { error: 'discount_type and discount_value required' },
        { status: 400 }
      );
    }

    // Generate codes
    const generatedCodes = generateCouponCode(prefix, count);
    const insertData = generatedCodes.map((code) => ({
      code,
      discount_type,
      discount_value,
      valid_from: valid_from || new Date(),
      valid_until: valid_until || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      applicable_plans,
      applicable_to,
      applicable_billing,
      max_uses: max_uses_per_coupon || null,
      description: description || `${discount_value}${discount_type === 'percentage' ? '%' : '₹'} off`,
      created_by: user.id,
    }));

    // Insert into database
    const { data: inserted, error } = await sb
      .from('coupon_codes')
      .insert(insertData)
      .select();

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({
      success: true,
      count: inserted.length,
      codes: inserted.map((c) => ({
        code: c.code,
        discount: `${c.discount_value}${c.discount_type === 'percentage' ? '%' : '₹'}`,
        description: c.description,
        validFrom: c.valid_from,
        validUntil: c.valid_until,
      })),
    });
  } catch (error) {
    console.error('Coupon generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// GET - List coupons
export async function GET(req) {
  try {
    const { user, supabase: sb } = await ctx(req);
    if (!user) return Response.json({ error: 'Admin access required' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'active'; // active, expired, all

    let query = sb.from('coupon_codes').select('*');

    if (status === 'active') {
      const now = new Date();
      query = query
        .eq('is_active', true)
        .gte('valid_until', now.toISOString());
    } else if (status === 'expired') {
      const now = new Date();
      query = query.lt('valid_until', now.toISOString());
    }

    const { data: coupons } = await query.order('created_at', {
      ascending: false,
    });

    return Response.json({
      success: true,
      count: coupons.length,
      coupons: coupons.map((c) => ({
        ...c,
        usage_percent: c.max_uses
          ? Math.round((c.current_uses / c.max_uses) * 100)
          : 'unlimited',
      })),
    });
  } catch (error) {
    console.error('Coupon list error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
