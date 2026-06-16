export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

async function getContext(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { error: 'No authorization token', status: 401 };
    }

    const token = authHeader.slice(7);
    const { data: { user }, error } = await sb.auth.getUser(token);

    if (error || !user) {
      return { error: 'Invalid token', status: 401 };
    }

    return { user };
  } catch (err) {
    return { error: err.message, status: 401 };
  }
}

export async function POST(req) {
  console.log('[create-order] ========== NEW REQUEST ==========');
  console.log('[create-order] POST /api/subscription-payments/create-order');
  try {
    const ctx = await getContext(req);
    if (ctx.error) {
      console.log('[create-order] Auth failed:', ctx.error);
      return Response.json({ error: ctx.error }, { status: ctx.status });
    }

    const { user } = ctx;
    const body = await req.json();
    const { plan, billingPeriod, couponCode } = body;

    console.log('[create-order] ✓ Auth OK');
    console.log('[create-order] User:', user.id, '| Plan:', plan, '| Period:', billingPeriod, '| Coupon:', couponCode || 'NONE');

    if (!plan || !billingPeriod) {
      console.log('[create-order] ✗ Missing plan or billingPeriod');
      return Response.json(
        { error: 'Plan and billing period required' },
        { status: 400 }
      );
    }

    // Get organization
    console.log('[create-order] Fetching organization for user:', user.id);
    const { data: org, error: orgError } = await sb
      .from('organizations')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (orgError) console.log('[create-order] Org error:', orgError.message);
    console.log('[create-order] Org found:', org?.id || 'NOT FOUND');

    if (!org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get plan details
    const { data: planData, error: planError } = await sb
      .from('subscription_plans')
      .select('*')
      .eq('id', plan)
      .single();

    console.log('[create-order] Plan lookup:', plan, planData?.id || 'NOT FOUND', planError?.message);

    if (!planData) {
      return Response.json({ error: `Plan not found: ${plan}` }, { status: 404 });
    }

    // Determine price
    let amount = billingPeriod === 'annual' ? planData.price_annual : planData.price_monthly;

    console.log('[create-order] Amount:', amount, 'Period:', billingPeriod);

    if (!amount || amount <= 0) {
      return Response.json({ error: `Invalid plan pricing: ${amount}` }, { status: 400 });
    }

    let discountAmount = 0;

    // Validate and apply coupon if provided
    if (couponCode) {
      const { data: coupon } = await sb
        .from('coupon_codes')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (coupon) {
        const now = new Date();
        if (!coupon.valid_from || new Date(coupon.valid_from) <= now) {
          if (!coupon.valid_until || new Date(coupon.valid_until) >= now) {
            if (!coupon.max_uses || coupon.current_uses < coupon.max_uses) {
              if (coupon.applicable_plans.includes(plan) || coupon.applicable_plans.includes('all')) {
                if (coupon.applicable_billing.includes(billingPeriod) || coupon.applicable_billing.includes('all')) {
                  if (coupon.discount_type === 'percentage') {
                    discountAmount = Math.floor((amount * coupon.discount_value) / 100);
                  } else {
                    discountAmount = coupon.discount_value;
                  }
                }
              }
            }
          }
        }
      }
    }

    const finalAmount = Math.max(0, amount - discountAmount);
    console.log('[create-order] Final amount after discount:', finalAmount, '| Discount:', discountAmount);

    // Create Razorpay order via API
    // Receipt must be max 40 chars, so use short format
    const timestamp = Date.now().toString().slice(-8);
    const receipt = `${org.id.slice(0, 20)}_${timestamp}`.slice(0, 40);

    console.log('[create-order] Creating Razorpay order...');
    console.log('[create-order] Receipt:', receipt, '| KeyID check:', RAZORPAY_KEY_ID ? '✓ SET' : '✗ MISSING');

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: finalAmount,
        currency: 'INR',
        receipt: receipt,
        notes: {
          organization_id: org.id,
          plan: plan,
          billing_period: billingPeriod,
        }
      })
    });

    const razorpayOrder = await response.json();

    if (!response.ok) {
      console.log('[create-order] ✗ Razorpay error:', response.status, razorpayOrder.error || razorpayOrder);
      return Response.json({ error: razorpayOrder.error || 'Failed to create order' }, { status: 400 });
    }

    console.log('[create-order] ✓ Razorpay order created:', razorpayOrder.id);

    // Store payment record
    console.log('[create-order] Storing payment record in DB...');
    const { data: payment, error: paymentError } = await sb
      .from('subscription_payments')
      .insert({
        organization_id: org.id,
        amount: finalAmount,
        plan: plan,
        billing_period: billingPeriod,
        coupon_code: couponCode || null,
        discount_amount: discountAmount,
        razorpay_order_id: razorpayOrder.id,
        status: 'pending',
      })
      .select()
      .single();

    if (paymentError) {
      console.log('[create-order] ✗ Payment record error:', paymentError.message);
    } else {
      console.log('[create-order] ✓ Payment record saved:', payment?.id);
    }

    console.log('[create-order] ✓ RETURNING SUCCESS');
    return Response.json({
      orderId: razorpayOrder.id,
      amount: finalAmount,
      originalAmount: amount,
      discountAmount: discountAmount,
      currency: 'INR',
      keyId: RAZORPAY_KEY_ID,
      organization: {
        id: org.id,
        name: org.name,
        email: org.email,
        phone: org.phone,
      }
    });
  } catch (error) {
    console.error('[create-order] ✗ EXCEPTION:', error.message);
    console.error('[create-order] Stack:', error.stack);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
