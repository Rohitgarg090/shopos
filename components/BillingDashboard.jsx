'use client';
import { useState, useEffect } from 'react';
import { ChevronRight, Check, Zap, BarChart3, Users, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function BillingDashboard() {
  const [org, setOrg] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [couponCode, setCouponCode] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('[BillingDashboard] selectedPlan changed to:', selectedPlan);
  }, [selectedPlan]);

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      monthlyPrice: 799,
      annualPrice: 6999,
      firms: '1 firm',
      users: '2 users',
      features: ['Invoices', 'Basic Analytics', 'Customers', 'Email Support'],
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'business',
      name: 'Business',
      monthlyPrice: 1499,
      annualPrice: 12999,
      firms: '3 firms',
      users: '5 users',
      features: ['Everything in Starter', 'Advanced Analytics', 'Suppliers', 'Bank Reconciliation', 'Priority Support'],
      color: 'from-purple-500 to-purple-600',
      popular: true
    },
    {
      id: 'pro',
      name: 'Pro',
      monthlyPrice: 2499,
      annualPrice: 21999,
      firms: 'Unlimited',
      users: 'Unlimited',
      features: ['Everything in Business', 'Data Migration', 'API Access', 'Dedicated Support'],
      color: 'from-amber-500 to-amber-600'
    }
  ];

  useEffect(() => {
    console.log('[BillingDashboard] Component mounted');
    fetchOrgStatus();
  }, []);

  const fetchOrgStatus = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/subscription-payments/status', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setOrg(data);
      } else {
        setError(data.error || 'Failed to load subscription details');
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load subscription details');
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    console.log('[BillingDashboard] handleUpgrade called, selectedPlan:', selectedPlan);
    if (!selectedPlan) {
      console.log('[BillingDashboard] No plan selected, returning');
      return;
    }
    console.log('[BillingDashboard] Setting loading to true');
    setLoading(true);
    try {
      console.log('[BillingDashboard] Getting session...');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[BillingDashboard] Session:', session?.user?.email || 'NO SESSION');
      if (!session?.access_token) {
        console.log('[BillingDashboard] No access token');
        setError('Authentication required');
        setLoading(false);
        return;
      }
      console.log('[BillingDashboard] Session OK, proceeding...');

      // Calculate amount
      const planDetails = plans.find(p => p.id === selectedPlan);
      let amount = billingPeriod === 'annual' ? planDetails.annualPrice * 100 : planDetails.monthlyPrice * 100; // Convert to paise

      // Apply coupon discount if provided
      if (couponCode) {
        // Simple 10% discount for demo
        amount = Math.floor(amount * 0.9);
      }

      // Step 1: Create order on backend
      const createOrderRes = await fetch('/api/subscription-payments/create-order', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan: selectedPlan,
          billingPeriod: billingPeriod,
          couponCode: couponCode || null,
          amount: amount
        })
      });

      if (!createOrderRes.ok) {
        const errData = await createOrderRes.json();
        setError(errData.error || 'Failed to create order');
        setLoading(false);
        return;
      }

      const orderData = await createOrderRes.json();

      if (!orderData.orderId) {
        setError('Failed to create payment order: ' + (orderData.error?.description || orderData.error || 'Unknown error'));
        setLoading(false);
        return;
      }

      // Step 2: Open Razorpay checkout
      if (!window.Razorpay) {
        setError('Razorpay script not loaded');
        setLoading(false);
        return;
      }

      const options = {
        key: orderData.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        order_id: orderData.orderId,
        amount: orderData.amount,
        currency: 'INR',
        name: 'ShopOS',
        description: `${planDetails.name} Plan - ${billingPeriod === 'annual' ? 'Annual' : 'Monthly'}`,
        prefill: {
          name: org?.name || 'Customer',
          email: org?.email || '',
          contact: org?.phone || ''
        },
        handler: async (paymentResponse) => {
          // Step 3: Verify payment on backend
          try {
            const verifyRes = await fetch('/api/subscription-payments/verify', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                plan: selectedPlan,
                billingPeriod: billingPeriod
              })
            });

            if (verifyRes.ok) {
              window.location.href = '/settings?billing_success=true';
            } else {
              const errData = await verifyRes.json();
              setError('Payment verification failed: ' + (errData.error || 'Unknown error'));
            }
          } catch (err) {
            setError('Verification error: ' + err.message);
          }
          setLoading(false);
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          }
        },
        theme: { color: '#3b82f6' }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError('Error: ' + err.message);
      setLoading(false);
    }
  };

  if (loading || !org) {
    console.log('[BillingDashboard] Still loading or no org - loading:', loading, 'org:', org?.name || 'NONE');
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  console.log('[BillingDashboard] Rendering main content - selectedPlan:', selectedPlan, 'loading:', loading);

  const daysRemaining = org.trialDaysRemaining || 0;
  const isOnTrial = org.status === 'trial';

  return (
    <div className="w-full space-y-8 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">Billing & Subscription</h2>
        {isOnTrial ? (
          <div className="flex items-center justify-between mt-6">
            <div>
              <p className="text-slate-300 mb-2">You're on a free trial</p>
              <p className="text-2xl font-bold text-blue-400">{daysRemaining} days remaining</p>
            </div>
            <div className="text-right">
              <p className="text-slate-300">Current Status</p>
              <p className="text-lg font-semibold text-green-400">Active Trial</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between mt-6">
            <div>
              <p className="text-slate-300 mb-2">Current Plan</p>
              <p className="text-2xl font-bold text-green-400">
                {org.plan ? org.plan.charAt(0).toUpperCase() + org.plan.slice(1) : 'None'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-300">Status</p>
              <p className="text-lg font-semibold text-green-400">Active</p>
            </div>
          </div>
        )}
      </div>

      {/* Billing Period Selector */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-slate-700">Billing Period</label>
        <div className="flex gap-4">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              billingPeriod === 'monthly'
                ? 'bg-blue-600 text-white shadow-lg scale-105'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('annual')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all relative ${
              billingPeriod === 'annual'
                ? 'bg-blue-600 text-white shadow-lg scale-105'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Annual
            <span className="absolute top-0 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Save 27%</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const price = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
          const isSelected = selectedPlan === plan.id;

          return (
            <div
              key={plan.id}
              onClick={() => {
                console.log('[BillingDashboard] Plan card clicked:', plan.id);
                setSelectedPlan(plan.id);
              }}
              className={`relative rounded-2xl p-6 cursor-pointer transition-all duration-300 ${
                isSelected
                  ? 'ring-2 ring-blue-500 shadow-2xl scale-105'
                  : 'shadow-md hover:shadow-lg hover:scale-102'
              } ${plan.popular ? 'bg-white border-2 border-blue-500' : 'bg-white border border-slate-200'}`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-gradient-to-r from-amber-400 via-pink-500 to-red-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}

              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${plan.color} flex items-center justify-center text-white mb-4`}>
                <Zap size={24} />
              </div>

              <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>

              <div className="mb-4">
                <span className="text-4xl font-bold text-slate-900">₹{price}</span>
                <span className="text-slate-600 ml-2">/{billingPeriod === 'annual' ? 'year' : 'month'}</span>
              </div>

              <div className="space-y-2 mb-6 pb-6 border-b border-slate-200">
                <div className="flex items-center gap-2 text-slate-600">
                  <BarChart3 size={16} className="text-blue-500" />
                  <span className="text-sm">{plan.firms}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Users size={16} className="text-blue-500" />
                  <span className="text-sm">{plan.users}</span>
                </div>
              </div>

              <div className="space-y-3">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Check size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-600">{feature}</span>
                  </div>
                ))}
              </div>

              {isSelected && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center">
                  <Check size={16} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Coupon Code */}
      <div className="bg-blue-50 rounded-xl p-4 space-y-3">
        <label className="block text-sm font-semibold text-slate-700">Have a coupon code?</label>
        <input
          type="text"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          placeholder="Enter coupon code"
          className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {typeof error === 'string' ? error : error?.error?.description || error?.error || 'An error occurred'}
        </div>
      )}

      {/* CTA Button */}
      <button
        onClick={() => {
          console.log('[BillingDashboard] Button clicked! selectedPlan:', selectedPlan, 'loading:', loading);
          handleUpgrade();
        }}
        disabled={!selectedPlan || loading}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-2 text-lg shadow-lg hover:shadow-xl"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            Processing...
          </>
        ) : (
          <>
            Continue to Payment
            <ChevronRight size={20} />
          </>
        )}
      </button>

      {/* Footer Note */}
      <div className="bg-slate-50 rounded-lg p-4 text-center text-sm text-slate-600">
        <Lock size={16} className="inline mr-2" />
        Your payment is secure and processed by Razorpay
      </div>
    </div>
  );
}
