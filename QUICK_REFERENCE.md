# ShopOS SaaS - Quick Reference Card

## 🎯 LAUNCHING TODAY

### Your Pricing (Use This)
```
Starter:   ₹799/mo   |  ₹6,999/yr    (27% discount)
Business:  ₹1,499/mo |  ₹12,999/yr   (28% discount)
Pro:       ₹2,499/mo |  ₹21,999/yr   (27% discount)

Trial:     14 days free (auto-activated on signup)
```

### What's Built & Ready
```
✅ Database schema (multi-tenant)
✅ Payment APIs (Razorpay)
✅ Trial management
✅ Coupon system
✅ Support ticketing (APIs)
✅ Data migration (APIs)
✅ Subscription status
```

### What You Need to Build (UI)
```
⚠️ Billing dashboard component
⚠️ Upgrade modal
⚠️ Trial extension UI
⚠️ Coupon input field
⚠️ Support ticket form (basic)
⚠️ Settings integration
```

---

## 📊 KEY API ENDPOINTS

### Payments
```
POST   /api/payments/create-order          → Start payment
POST   /api/payments/razorpay-webhook      → Receive payment confirmation
```

### Coupons
```
POST   /api/coupons/validate               → Check if coupon valid
POST   /api/admin/coupons/generate         → Create new coupon codes
GET    /api/admin/coupons/list             → View all coupons
```

### Subscriptions
```
GET    /api/subscriptions/status           → Check trial/subscription status
POST   /api/subscriptions/extend-trial     → Extend trial 7 more days
```

### Support
```
POST   /api/support/tickets                → Create support ticket
GET    /api/support/tickets                → List tickets
POST   /api/support/tickets/[id]/messages  → Add message to ticket
```

### Data Migration
```
POST   /api/data-migration/validate-import → Validate CSV
POST   /api/data-migration/execute-import  → Execute import
```

---

## 💳 RAZORPAY SETUP (5 MIN)

1. Go to https://razorpay.com → Sign Up
2. Get API keys from Settings → API Keys
3. Add to `.env.local`:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxx
   RAZORPAY_KEY_SECRET=xxxx
   RAZORPAY_WEBHOOK_SECRET=xxxx
   ```
4. Setup webhook: https://dashboard.razorpay.com/app/settings/webhooks
5. Webhook URL: `https://yourdomain.com/api/payments/razorpay-webhook`
6. Test with card: `4111 1111 1111 1111`

---

## 🎫 GENERATE COUPON CODES (INSTANT)

### For you (Admin):
```bash
curl -X POST http://localhost:3000/api/admin/coupons/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "count": 10,
    "prefix": "LAUNCH",
    "discount_type": "percentage",
    "discount_value": 30,
    "applicable_plans": ["starter", "business", "pro"],
    "valid_until": "2026-06-07"
  }'
```

### Common codes to generate:
```
FIRST50    → 50% off first month (monthly plans)
ANNUAL40   → 40% off annual plans
SAVE500    → ₹500 fixed discount
STARTUP20  → 20% off for startups
REFER25    → 25% referral discount
```

---

## 📁 FILES CREATED

### Database
```
supabase/schema_saas.sql          → Run this first (PostgreSQL schema)
```

### APIs (All Ready)
```
app/api/payments/create-order/route.js
app/api/payments/razorpay-webhook/route.js
app/api/coupons/validate/route.js
app/api/admin/coupons/generate/route.js
app/api/subscriptions/status/route.js
app/api/subscriptions/extend-trial/route.js
app/api/support/tickets/route.js
app/api/support/tickets/[id]/messages/route.js
app/api/data-migration/validate-import/route.js
app/api/data-migration/execute-import/route.js
```

### Documentation
```
SAAS_IMPLEMENTATION.md    → Step-by-step setup
SAAS_ARCHITECTURE.md      → Complete architecture
RAZORPAY_SETUP.md         → Razorpay integration guide
QUICK_REFERENCE.md        → This file
```

---

## 🚀 LAUNCH TIMELINE (REALISTIC)

```
TODAY (Day 1)
├─ Run database migration
├─ Setup Razorpay account
└─ Add API keys to .env

TOMORROW (Day 2)
├─ Build billing dashboard component
├─ Build upgrade modal
└─ Add trial check to app startup

DAY 3
├─ Test payment flow (test card)
├─ Setup Razorpay webhook
└─ QA all features

DAY 4
├─ Deploy to staging
├─ Final testing
└─ Generate marketing coupon codes

DAY 5
├─ Switch Razorpay to LIVE mode
├─ Deploy to production
└─ LAUNCH! 🚀

WEEK 2
├─ Monitor payment success rate
├─ Gather customer feedback
└─ Plan Phase 1 features
```

---

## 📧 CUSTOMER JOURNEY

```
Day 0: Signup
  ├─ User enters email/password
  ├─ Auto-create trial organization
  ├─ Trial enabled for 14 days
  └─ Welcome email sent

Day 7: Mid-trial
  ├─ User creating invoices
  └─ (No action needed)

Day 10: Trial Warning
  ├─ Email: "4 days left in trial"
  ├─ Show in-app: "Upgrade to continue"
  └─ Provide coupon code

Day 14: Trial Ends
  ├─ Block app access (show modal)
  ├─ Redirect to billing page
  ├─ Force upgrade
  └─ Option: "Extend trial 7 days" (once only)

Day 15+: Payment Received
  ├─ Subscription activated
  ├─ Full app access
  ├─ Confirmation email with invoice
  └─ Support ticket available

Day 45: Before Renewal
  ├─ Email: "5 days until renewal"
  ├─ Show renewal date
  └─ Option to downgrade plan
```

---

## 💡 COUPON STRATEGY

### Pre-Launch Coupons
```
Early Adopter: 30% off annual plans
  Code: EARLY30 (50 codes, expire 2026-06-07)
  
First Month: 50% off first month only
  Code: FIRST50 (100 codes, monthly only)
  
Referral: 25% both referrer & referee
  Code: REFER25 (unlimited)
```

### Seasonal Coupons
```
Monsoon Sale: 20% off everything
  Valid: June-September
  
Year-End: 35% off annual plans
  Valid: Dec 1-31
  
Black Friday: 40% off everything
  Valid: Specific dates
```

---

## 🔍 MONITORING CHECKLIST

### Daily
```
☐ Razorpay dashboard → Recent payments
☐ Webhook logs → Any failed deliveries?
☐ Database → New organizations created?
☐ Payment success rate > 95%?
```

### Weekly
```
☐ Trial to paid conversion rate
☐ Coupon usage stats
☐ Support tickets pending
☐ Any payment failures to investigate
```

### Monthly
```
☐ MRR (Monthly Recurring Revenue)
☐ Active customers
☐ Churn rate
☐ Plan distribution
☐ Customer feedback
```

---

## 🐛 TROUBLESHOOTING

### Payment fails - "Invalid Signature"
→ Check RAZORPAY_WEBHOOK_SECRET in .env.local

### Order created but payment not showing in database
→ Webhook didn't fire; check ngrok tunnel or webhook URL

### Trial extension button missing
→ Trial already extended? Users can only extend once

### Coupon says "Expired" but should be valid
→ Check valid_from and valid_until in database; check timezone

### Customer can't upgrade
→ Check auth token is valid
→ Check organization_id is in database

---

## 💰 REVENUE CALCULATION

### Monthly Recurring Revenue (MRR)
```
Starter (2 customers):      ₹799 × 2   = ₹1,598
Business (5 customers):     ₹1,499 × 5 = ₹7,495
Pro (1 customer):           ₹2,499 × 1 = ₹2,499
                                Total   = ₹11,592 MRR
```

### Annual Recurring Revenue (ARR)
```
MRR × 12 = ₹11,592 × 12 = ₹139,104 ARR
```

### With Coupons Applied
```
Customer 1: Starter annual with 30% off
  Price: ₹6,999 - ₹2,099 = ₹4,900 (one-time)
  
Customer 2: Pro monthly (auto-renews)
  Price: ₹2,499 (recurring)

Blended: Mix of discounted + full price
Typical: 20-40% take discount codes
```

---

## 📞 WHEN TO ESCALATE

```
❌ Payment stuck in "pending" for 24+ hours
   → Check Razorpay dashboard manually

❌ Webhook not firing
   → Test webhook delivery from dashboard

❌ Customer says they paid but we don't see it
   → Manual lookup in Razorpay + database

❌ Coupon not working
   → Verify all conditions in database

❌ Trial not extending
   → Check if already extended before
```

---

## 🎯 SUCCESS = 

```
Week 1: ✅ 14-day trial working, payment processing
Week 2: ✅ 10+ paid customers, 0 payment failures
Week 3: ✅ 20+ paying customers, $500+ MRR
Month 1: ✅ 50+ paying customers, $2,500+ MRR
```

---

## 📚 NEXT STEPS

### If you're stuck:
1. Check SAAS_IMPLEMENTATION.md (step-by-step)
2. Check RAZORPAY_SETUP.md (Razorpay help)
3. Check SAAS_ARCHITECTURE.md (deep dive)

### After Phase 0 launch:
1. **Week 2-3**: Add data migration UI
2. **Week 3-4**: Add support ticketing UI
3. **Week 4**: Analytics & reporting
4. **Week 5**: API documentation for integrations

---

## 🎉 YOU'VE GOT THIS!

Everything is built. You just need to:
1. ✅ Setup Razorpay (30 min)
2. ✅ Run database migration (2 min)
3. ⚠️ Build 5 React components (6 hours)
4. ⚠️ Test payment flow (1 hour)
5. 🚀 Deploy (30 min)

That's it. You're running a SaaS with 14-day trials, payments, coupons, and support.

Good luck! 🚀
