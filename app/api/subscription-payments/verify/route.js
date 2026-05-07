import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
  try {
    const ctx = await getContext(req);
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status });

    const { user } = ctx;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, billingPeriod } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return Response.json(
        { error: 'Missing payment details' },
        { status: 400 }
      );
    }

    // Verify signature
    const signatureString = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(signatureString)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return Response.json(
        { error: 'Payment verification failed: Invalid signature' },
        { status: 400 }
      );
    }

    // Get organization
    const { data: org } = await sb
      .from('organizations')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (!org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get subscription payment record
    const { data: payment } = await sb
      .from('subscription_payments')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('organization_id', org.id)
      .single();

    if (!payment) {
      return Response.json({ error: 'Payment record not found' }, { status: 404 });
    }

    // Update payment record
    await sb
      .from('subscription_payments')
      .update({
        status: 'completed',
        razorpay_payment_id: razorpay_payment_id,
        razorpay_signature: razorpay_signature,
      })
      .eq('id', payment.id);

    // Calculate subscription dates
    const now = new Date();
    const startDate = new Date(now);
    let endDate = new Date(now);

    if (payment.billing_period === 'annual') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Update organization
    const { error: updateError } = await sb
      .from('organizations')
      .update({
        status: 'active',
        plan: payment.plan,
        subscription_started_at: startDate.toISOString(),
        subscription_ends_at: endDate.toISOString(),
      })
      .eq('id', org.id);

    if (updateError) {
      return Response.json({ error: 'Failed to update organization' }, { status: 500 });
    }

    // Increment coupon usage if applied
    if (payment.coupon_code) {
      const { data: coupon } = await sb
        .from('coupon_codes')
        .select('id, current_uses')
        .eq('code', payment.coupon_code)
        .single();

      if (coupon) {
        await sb
          .from('coupon_codes')
          .update({ current_uses: (coupon.current_uses || 0) + 1 })
          .eq('id', coupon.id);

        await sb
          .from('coupon_usage')
          .insert({
            coupon_id: coupon.id,
            subscription_payment_id: payment.id,
            organization_id: org.id,
          });
      }
    }

    return Response.json({
      success: true,
      message: 'Payment verified successfully',
      organization: {
        id: org.id,
        plan: payment.plan,
        status: 'active',
        subscriptionEndsAt: endDate.toISOString(),
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
