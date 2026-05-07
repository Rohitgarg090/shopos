'use client';
import { X, Check, Zap } from 'lucide-react';
import { useState } from 'react';

export default function BillingPopup({ isOpen, onClose }) {
  const [billingPeriod, setBillingPeriod] = useState('monthly');

  if (!isOpen) return null;

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      monthlyPrice: 799,
      annualPrice: 6999,
      firms: '1 firm',
      users: '2 users',
      features: ['Invoices', 'Basic Analytics', 'Customers', 'Email Support'],
      popular: false
    },
    {
      id: 'business',
      name: 'Business',
      monthlyPrice: 1499,
      annualPrice: 12999,
      firms: '3 firms',
      users: '5 users',
      features: ['Everything in Starter', 'Advanced Analytics', 'Suppliers', 'Bank Reconciliation', 'Priority Support'],
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
      popular: false
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" style={{top: 60}}>
      {/* Glasmorphic modal */}
      <div className="relative w-full max-w-5xl max-h-[calc(100vh-120px)] overflow-y-auto rounded-3xl backdrop-blur-3xl border border-white border-opacity-30 bg-gradient-to-br from-white/10 to-white/5 shadow-2xl p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition z-10"
        >
          <X size={24} className="text-white" />
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-3">
            Choose Your Plan
          </h2>
          <p className="text-white text-opacity-70 text-lg max-w-2xl mx-auto">
            Flexible pricing for every business size. Start free, upgrade anytime.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex rounded-full p-1 bg-white bg-opacity-10 backdrop-blur-md border border-white border-opacity-20">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-full font-semibold transition ${
                billingPeriod === 'monthly'
                  ? 'bg-white bg-opacity-20 text-white shadow-lg'
                  : 'text-white text-opacity-70 hover:text-opacity-100'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-6 py-2 rounded-full font-semibold transition ${
                billingPeriod === 'annual'
                  ? 'bg-white bg-opacity-20 text-white shadow-lg'
                  : 'text-white text-opacity-70 hover:text-opacity-100'
              }`}
            >
              Annual
              <span className="ml-2 text-xs bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2 py-0.5 rounded-full">
                Save 27%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => {
            const price = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl backdrop-blur-xl border transition-all duration-300 p-8 group hover:shadow-2xl ${
                  plan.popular
                    ? 'bg-gradient-to-br from-white/20 to-white/10 border-white border-opacity-40 ring-2 ring-white ring-opacity-50 scale-105 md:scale-100'
                    : 'bg-white bg-opacity-10 border-white border-opacity-20 hover:bg-opacity-15 hover:border-opacity-30'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-pink-600 text-white text-sm font-bold px-4 py-1 rounded-full shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">₹{price}</span>
                    <span className="text-white text-opacity-60">/{billingPeriod === 'annual' ? 'year' : 'month'}</span>
                  </div>
                </div>

                <div className="mb-8 pb-8 border-b border-white border-opacity-20 space-y-2">
                  <div className="flex items-center gap-2 text-white text-opacity-80">
                    <span className="font-semibold">{plan.firms}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white text-opacity-80">
                    <span className="font-semibold">{plan.users}</span>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Check size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-white text-opacity-80 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition ${
                    plan.popular
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-lg'
                      : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30 border border-white border-opacity-30'
                  }`}
                >
                  Get Started
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center pt-8 border-t border-white border-opacity-20">
          <p className="text-white text-opacity-60 text-sm">
            14-day free trial included. No credit card required.
          </p>
        </div>
      </div>
    </div>
  );
}
