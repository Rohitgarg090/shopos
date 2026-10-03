'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const PLANS = [
  { id: 'business4', name: 'Business 4', price: 1499, firms: 4, tag: '' },
  { id: 'business10', name: 'Business 10', price: 2499, firms: 10, tag: 'Best value' },
];
const FEATURES = [
  'Unlimited invoices, customers & products',
  'AI invoice scanning (supplier bills)',
  'AI bank & supplier statement reconciliation',
  'E-Way Bill & E-Invoice',
  'Email, WhatsApp & SMS sending',
  'Team members with roles (owner, manager, staff)',
];

export default function BillingPopup({ isOpen, onClose, reason, planInfo, onPaid }) {
  const [selected, setSelected] = useState('business4');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [done, setDone] = useState(null);

  if (!isOpen) return null;
  const current = planInfo?.plan;

  const pay = async () => {
    setLoading(true); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Please sign in again');
      const plan = PLANS.find(p => p.id === selected);

      const res = await fetch('/api/subscription-payments/create-order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.id, billingPeriod: 'annual', couponCode: couponCode.trim() || null }),
      });
      const order = await res.json().catch(() => ({}));
      if (!res.ok || !order.orderId) throw new Error(order.error || 'Could not start payment');
      if (!window.Razorpay) throw new Error('Payment window could not load — check your internet and retry');

      const rzp = new window.Razorpay({
        key: order.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        order_id: order.orderId,
        amount: order.amount,
        currency: 'INR',
        name: 'ShopOS',
        description: `${plan.name} — 1 year`,
        prefill: { email: session.user?.email || '' },
        theme: { color: '#1B5E8A' },
        handler: async (r) => {
          try {
            const v = await fetch('/api/subscription-payments/verify', {
              method: 'POST',
              headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ razorpay_order_id: r.razorpay_order_id, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature }),
            });
            const vj = await v.json().catch(() => ({}));
            if (!v.ok) throw new Error(vj.error || 'Verification failed');
            setDone(plan.name);
            onPaid && onPaid();
          } catch (e) {
            setError('Payment received but not confirmed: ' + e.message + '. Contact support with order ' + r.razorpay_order_id);
          } finally { setLoading(false); }
        },
        modal: { ondismiss: () => setLoading(false) },
      });
      rzp.open();
    } catch (e) {
      setError(e.message); setLoading(false);
    }
  };

  const wrap = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 16 };
  const box = { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', fontFamily: "'Inter',system-ui,sans-serif", color: '#1A1A18' };

  if (done) return (
    <div style={wrap} onClick={onClose}>
      <div style={{ ...box, maxWidth: 420, padding: 28, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#EBF5E4', color: '#2E6B1F', fontSize: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>✓</div>
        <div style={{ fontSize: 19, fontWeight: 800 }}>You're on {done}</div>
        <div style={{ fontSize: 13, color: '#666', margin: '6px 0 18px' }}>All features are unlocked for 1 year. Thank you!</div>
        <button onClick={onClose} style={{ background: '#1B5E8A', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 22px', fontWeight: 700, cursor: 'pointer' }}>Continue</button>
      </div>
    </div>
  );

  return (
    <div style={wrap} onClick={onClose}>
      <div style={box} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 22px 14px', borderBottom: '1px solid #EEE', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800 }}>Upgrade ShopOS</div>
            <div style={{ fontSize: 12.5, color: '#666', marginTop: 3 }}>
              {current ? <>You're on <strong>{planInfo.name}</strong>{current === 'trial' ? ` · ${planInfo.trialDaysLeft} day${planInfo.trialDaysLeft === 1 ? '' : 's'} left` : ''}. </> : null}Simple yearly pricing.
            </div>
          </div>
          <button onClick={onClose} aria-label='Close' style={{ background: 'none', border: 'none', fontSize: 22, color: '#999', cursor: 'pointer', alignSelf: 'flex-start' }}>×</button>
        </div>

        {reason && <div style={{ margin: '14px 22px 0', padding: '10px 12px', background: '#FDF0E0', color: '#8A4F06', borderRadius: 9, fontSize: 12.5, fontWeight: 600 }}>{reason}</div>}

        <div style={{ padding: '16px 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
          {PLANS.map(p => {
            const on = selected === p.id, isCurrent = current === p.id;
            return (
              <button key={p.id} onClick={() => setSelected(p.id)} disabled={isCurrent}
                style={{ textAlign: 'left', padding: 16, borderRadius: 12, cursor: isCurrent ? 'default' : 'pointer', background: on ? '#F0F6FB' : '#fff', border: '2px solid ' + (on ? '#1B5E8A' : '#E3E1D9'), position: 'relative', opacity: isCurrent ? 0.6 : 1 }}>
                {p.tag && <span style={{ position: 'absolute', top: -10, right: 12, background: '#1B5E8A', color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 10 }}>{p.tag}</span>}
                <div style={{ fontSize: 14, fontWeight: 800 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Up to {p.firms} firms</div>
                <div style={{ marginTop: 10 }}><span style={{ fontSize: 26, fontWeight: 800 }}>₹{p.price.toLocaleString('en-IN')}</span><span style={{ fontSize: 12, color: '#666' }}> /year</span></div>
                <div style={{ fontSize: 11, color: '#2E6B1F', fontWeight: 600, marginTop: 2 }}>≈ ₹{Math.round(p.price / 12)}/month</div>
                {isCurrent && <div style={{ fontSize: 11, fontWeight: 700, color: '#1B5E8A', marginTop: 6 }}>Current plan</div>}
              </button>
            );
          })}
        </div>

        <div style={{ padding: '0 22px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Both plans include</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '6px 14px' }}>
            {FEATURES.map(f => <div key={f} style={{ fontSize: 12.5, display: 'flex', gap: 7 }}><span style={{ color: '#2E6B1F', fontWeight: 800 }}>✓</span>{f}</div>)}
          </div>
          <div style={{ fontSize: 11.5, color: '#888', marginTop: 10 }}>Free plan: 1 firm with billing, inventory, ledger & accounts — without AI, E-Way, E-Invoice and messaging.</div>
        </div>

        <div style={{ padding: '16px 22px 20px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid #EEE', marginTop: 16 }}>
          <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder='Coupon code (optional)'
            style={{ flex: 1, minWidth: 160, padding: '9px 12px', border: '1px solid #E3E1D9', borderRadius: 9, fontSize: 13 }} />
          <button onClick={pay} disabled={loading || current === selected}
            style={{ background: '#1B5E8A', color: '#fff', border: 'none', borderRadius: 9, padding: '11px 20px', fontWeight: 700, fontSize: 14, cursor: loading ? 'wait' : 'pointer', opacity: loading || current === selected ? 0.6 : 1 }}>
            {loading ? 'Opening payment…' : `Pay ₹${PLANS.find(p => p.id === selected).price.toLocaleString('en-IN')} / year`}
          </button>
          {error && <div style={{ width: '100%', fontSize: 12.5, color: '#9B2626', background: '#FDF0F0', padding: '8px 12px', borderRadius: 8 }}>{error}</div>}
          <div style={{ width: '100%', fontSize: 11, color: '#999' }}>Secure payment via Razorpay (UPI, cards, netbanking). Renewing early adds a year to your current plan.</div>
        </div>
      </div>
    </div>
  );
}
