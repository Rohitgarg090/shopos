# ShopOS SaaS Implementation Guide

## 🚀 Phase 0 MVP - LAUNCH IN 3-5 DAYS

### What You're Launching:
- ✅ 14-day free trial (automatic from signup)
- ✅ Razorpay payment integration
- ✅ Basic coupon system
- ✅ Plan selection on signup
- ✅ Billing dashboard
- ✅ Trial blocking logic

### What's NOT yet (Phase 1-2):
- Data migration tools
- Support ticketing system
- Advanced analytics

---

## 📋 DATABASE SETUP

### 1. Run the migration
```bash
# Upload supabase/schema_saas.sql to Supabase
# Execute it in SQL editor or via CLI

supabase migration up
```

---

## 🔧 ENVIRONMENT VARIABLES

Add to `.env.local`:

```bash
# Razorpay (Get from https://dashboard.razorpay.com)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx

# For production: rzp_live_xxxx

# Admin email for coupon generation
ADMIN_EMAIL=rohitgarg090@gmail.com
```

---

## 🛠️ IMPLEMENTATION CHECKLIST

### Step 1: Update ShopOS Component (2 hours)

**Changes needed:**
1. Check if user is in trial/active status before loading app
2. Show upgrade modal if trial ended
3. Add billing dashboard to Settings

**File: `components/ShopOS.jsx`**

```javascript
// Add this effect at the beginning of ShopOS component
useEffect(() => {
  if (!ses) return;
  
  // Check subscription status
  const checkSubscription = async () => {
    try {
      const res = await api.get('/api/subscriptions/status');
      
      if (res.organization.status === 'trial') {
        // Check if trial expired
        const trialEndsAt = new Date(res.trial.endsAt);
        if (trialEndsAt < new Date()) {
          // Show upgrade modal
          setShowUpgradeModal(true);
          setPage(''); // Block navigation
        }
      } else if (res.organization.status === 'suspended') {
        // Show suspension notice
        alert('Your subscription has expired. Please upgrade to continue.');
        await logout();
      }
    } catch (err) {
      console.error('Subscription check failed:', err);
    }
  };
  
  checkSubscription();
}, [ses]);
```

### Step 2: Create Billing Dashboard Component (3 hours)

**New file: `components/BillingDashboard.jsx`**

```jsx
"use client";
import React, { useState, useEffect } from "react";
import { api } from "@/lib/api-client";

export default function BillingDashboard({ firm, theme, setPage }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await api.get("/api/subscriptions/status");
      setSubscription(res);
    } catch (err) {
      console.error("Failed to fetch subscription:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan, billingPeriod) => {
    try {
      const res = await api.post("/api/payments/create-order", {
        plan,
        billing_period: billingPeriod,
        coupon_code: couponCode || null,
      });

      // Open Razorpay checkout
      const options = {
        key: res.razorpay_key_id,
        order_id: res.razorpay_order_id,
        amount: res.amount,
        currency: "INR",
        name: "ShopOS",
        description: `Upgrade to ${plan} plan`,
        handler: (response) => {
          // Payment successful - webhook handles it
          alert("Payment successful! Your plan will be activated shortly.");
          fetchSubscription();
        },
        prefill: {
          email: subscription?.organization?.email || "",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  if (loading) return <div>Loading billing info...</div>;

  return (
    <div>
      <h2>Billing & Subscription</h2>

      {/* Current Plan */}
      <div style={{ marginBottom: 20, padding: 16, border: "1px solid #ddd" }}>
        <h3>{subscription.organization.planName}</h3>
        <p>Status: {subscription.organization.status}</p>

        {subscription.trial.isActive && (
          <div style={{ background: "#e3f2fd", padding: 12, borderRadius: 8 }}>
            <strong>Trial Active</strong>
            <p>{subscription.trial.daysRemaining} days remaining</p>
            {subscription.trial.canBeExtended && (
              <button onClick={() => extendTrial()}>Extend Trial 7 Days</button>
            )}
          </div>
        )}

        {subscription.subscription.isActive && (
          <div style={{ background: "#e8f5e9", padding: 12, borderRadius: 8 }}>
            <strong>Subscription Active</strong>
            <p>Renews: {new Date(subscription.subscription.renewalDate).toLocaleDateString()}</p>
          </div>
        )}
      </div>

      {/* Upgrade Plans */}
      <h3>Available Plans</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {[
          {
            id: "starter",
            name: "Starter",
            monthly: 799,
            annual: 6999,
            features: ["1 firm", "2 users"],
          },
          {
            id: "business",
            name: "Business",
            monthly: 1499,
            annual: 12999,
            features: ["3 firms", "5 users"],
          },
          {
            id: "pro",
            name: "Pro",
            monthly: 2499,
            annual: 21999,
            features: ["Unlimited firms", "Unlimited users"],
          },
        ].map((plan) => (
          <div
            key={plan.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 16,
              cursor: "pointer",
            }}
          >
            <h4>{plan.name}</h4>
            <p>₹{plan.monthly}/month | ₹{plan.annual}/year</p>
            <ul>
              {plan.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button onClick={() => handleUpgrade(plan.id, "monthly")}>
              Upgrade Monthly
            </button>
            <button onClick={() => handleUpgrade(plan.id, "annual")}>
              Upgrade Annually (Save 28%)
            </button>
          </div>
        ))}
      </div>

      {/* Coupon Code */}
      <div style={{ marginTop: 20 }}>
        <label>Have a coupon code?</label>
        <input
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
          placeholder="Enter coupon code"
        />
        <button onClick={() => validateCoupon()}>Apply Coupon</button>
      </div>
    </div>
  );
}
```

### Step 3: Update Auth/Signup Flow (2 hours)

**Changes to signup to create organization:**

```javascript
// In signup success callback
const handleSignupSuccess = async (session) => {
  // Create organization
  const org = await api.post('/api/organizations/create', {
    name: userEmail.split('@')[0],
  });
  
  // Trial automatically starts (14 days)
  // User can now login and has free access
  setSes(session);
};
```

### Step 4: Add Razorpay Script (30 mins)

**File: `app/layout.jsx`**

```jsx
<head>
  {/* ... existing head content ... */}
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
```

### Step 5: Create Upgrade Modal (1 hour)

**New file: `components/UpgradeModal.jsx`**

```jsx
// Component to show when trial ends
// Reusable for showing upgrade prompts
```

---

## 📱 RAZORPAY WEBHOOK SETUP

1. Go to https://dashboard.razorpay.com/app/settings/webhooks
2. Add webhook endpoint:
   ```
   https://yourdomain.com/api/payments/razorpay-webhook
   ```
3. Subscribe to events:
   - `payment.authorized`
   - `payment.failed`
   - `subscription.activated`
   - `subscription.expired`

4. Copy webhook secret to `.env.local` as `RAZORPAY_WEBHOOK_SECRET`

---

## 🎫 COUPON CODE GENERATION

### For Admin (You)

```bash
# Generate 10 promotional codes for 30% off on annual plans
curl -X POST http://localhost:3000/api/admin/coupons/generate \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "count": 10,
    "prefix": "EARLY30",
    "discount_type": "percentage",
    "discount_value": 30,
    "applicable_plans": ["starter", "business", "pro"],
    "applicable_billing": ["annual"],
    "valid_until": "2026-06-07",
    "description": "Early adopter: 30% off annual plans"
  }'
```

### Response:
```json
{
  "success": true,
  "codes": [
    "EARLY30ABC123",
    "EARLY30DEF456",
    // ... 10 total
  ]
}
```

### Share codes with customers:
- Email campaigns
- Social media
- Word-of-mouth
- Referral program

---

## 💳 COUPON EXAMPLES TO GENERATE

```javascript
// 1st Month 50% Discount
{
  prefix: "FIRST50",
  discount_type: "percentage",
  discount_value: 50,
  applicable_plans: ["starter", "business", "pro"],
  applicable_billing: ["monthly"],
  max_uses_per_coupon: 100,
  valid_until: "2026-06-30"
}

// Annual Discount
{
  prefix: "ANNUAL40",
  discount_type: "percentage",
  discount_value: 40,
  applicable_billing: ["annual"],
  max_uses_per_coupon: 50,
}

// Starter Plan Only
{
  prefix: "STARTER25",
  discount_type: "percentage",
  discount_value: 25,
  applicable_plans: ["starter"],
}

// Fixed Amount
{
  prefix: "SAVE500",
  discount_type: "fixed",
  discount_value: 50000, // ₹500 in paise
  min_amount: 199900, // Min ₹1999
}

// Referral Code (for specific customer)
{
  code: "REF_ROHIT_20",
  discount_type: "percentage",
  discount_value: 20,
  max_uses_per_coupon: 1, // One-time use
}
```

---

## 📊 PRICING STRATEGY

### ShopOS Pricing (Your Decision)

**Recommended:**
```
Starter:   ₹799/mo   |  ₹6,999/yr   (27% discount)
Business:  ₹1,499/mo |  ₹12,999/yr  (28% discount)
Pro:       ₹2,499/mo |  ₹21,999/yr  (27% discount)
```

**Alternative (Higher):**
```
Starter:   ₹999/mo   |  ₹8,999/yr
Business:  ₹1,999/mo |  ₹15,999/yr
Pro:       ₹2,999/mo |  ₹24,999/yr
```

**Competitive Analysis:**
- **Tally**: ₹999-2,999/month
- **Marq ERP**: ₹1,500-3,500/month
- **Vyapaar**: ₹799-1,999/month

---

## 🚦 DEPLOYMENT CHECKLIST

### Before Going Live:

- [ ] Run database migration (`schema_saas.sql`)
- [ ] Set Razorpay test keys in `.env.local`
- [ ] Test payment flow with test card: `4111111111111111`
- [ ] Configure Razorpay webhook
- [ ] Create test coupons
- [ ] Test trial expiration logic
- [ ] Setup email templates for:
  - Trial ending (day 10)
  - Payment confirmation
  - Upgrade reminders
- [ ] Add Terms of Service & Privacy Policy
- [ ] Create support email (support@shopOS.com)

### Go Live Checklist:

- [ ] Switch to Razorpay live keys
- [ ] Deploy to production
- [ ] Test payment flow end-to-end
- [ ] Monitor webhooks in Razorpay dashboard
- [ ] Setup email notifications
- [ ] Document pricing & plans
- [ ] Create FAQ page

---

## 📈 PHASE 1 (Week 2-3) - DATA MIGRATION

APIs are already built, just need UI:
1. Import CSV wizard
2. Field mapping interface
3. Data validation preview
4. Import progress tracker

Files ready:
- `/api/data-migration/validate-import`
- `/api/data-migration/execute-import`

---

## 📞 PHASE 2 (Week 3-4) - SUPPORT SYSTEM

APIs ready, need:
1. Support ticket form
2. Ticket list/details UI
3. Claude AI integration for auto-responses
4. Email notifications

File ready:
- `/api/support/tickets`
- `/api/support/tickets/[id]/messages`

---

## 🔐 SECURITY NOTES

1. **Webhook Verification**: Always verify Razorpay signature
2. **Organization Isolation**: All queries include `organization_id` check
3. **Row-Level Security**: Enabled on all tables
4. **Admin Access**: Hardcoded email check (improve to role-based)
5. **Payment Storage**: Don't store full card details (Razorpay handles)

---

## 💡 QUICK START COMMANDS

```bash
# 1. Install dependencies
npm install razorpay csv-parse

# 2. Run migrations
# (Via Supabase dashboard)

# 3. Test API endpoints
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/subscriptions/status

# 4. Generate test coupon
curl -X POST http://localhost:3000/api/admin/coupons/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"count": 5, "prefix": "TEST", "discount_type": "percentage", "discount_value": 10}'

# 5. Deploy
npm run build
npm run start
```

---

## 🆘 TROUBLESHOOTING

### Payment fails with "Invalid signature"
- Check Razorpay webhook secret is correct
- Verify webhook endpoint is public (no auth required)

### Coupon code not working
- Check `valid_from` and `valid_until` dates
- Verify `applicable_plans` includes the plan being purchased
- Check coupon is marked `is_active = true`

### Trial shows expired but should be active
- Check `trial_ends_at` timestamp in organizations table
- Verify system clock is correct

### Organization not found
- Ensure organization was created during signup
- Check `owner_id` matches authenticated user

---

## 📧 EMAIL TEMPLATES TO CREATE

1. **Welcome Email** (on signup)
   - 14-day trial activated
   - Link to app
   - FAQ/docs

2. **Trial Ending Soon** (day 10)
   - 4 days left
   - Upgrade link
   - Coupon code (if applicable)

3. **Payment Confirmation**
   - Plan details
   - Next renewal date
   - Invoice PDF

4. **Renewal Reminder** (3 days before expiry)
   - Renewal date
   - Current plan
   - Upgrade options

---

## 📞 SUPPORT EMAIL SETUP

```
support@shopOS.com

Auto-reply:
"Thanks for contacting ShopOS support!
We typically respond within 24 hours.
If urgent, call +91-XXXXX-XXXXX

Ticket #: {TICKET_ID}"
```

---

## 🎯 SUCCESS METRICS TO TRACK

1. **Free Trial Conversion Rate**: % converting to paid
2. **Churn Rate**: % cancelling after payment
3. **Plan Upgrade Rate**: % upgrading from starter to business/pro
4. **Coupon Usage Rate**: % using discount codes
5. **Average Revenue Per User (ARPU)**

---

## WHAT'S NEXT

After Phase 0 MVP (Week 2):
1. **Data Migration UI** - Let customers import from old systems
2. **Support Tickets** - Claude-powered support automation
3. **Analytics Dashboard** - Show usage, ROI, etc.
4. **API Access** - For custom integrations
5. **White-labeling** - Resell to partners

---

**Questions? Review the API files:**
- `/api/payments/create-order`
- `/api/payments/razorpay-webhook`
- `/api/coupons/validate`
- `/api/subscriptions/status`
- `/api/admin/coupons/generate`
