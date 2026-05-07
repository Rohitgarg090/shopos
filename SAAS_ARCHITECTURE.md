# ShopOS SaaS - Complete Architecture Overview

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ShopOS App (React Components)                        │  │
│  │ - Signup Flow (Trial Auto-Start)                     │  │
│  │ - Billing Dashboard                                  │  │
│  │ - Settings (Coupon Entry)                            │  │
│  │ - Upgrade Modal (Razorpay Checkout)                  │  │
│  │ - Support Ticket Form                                │  │
│  │ - Data Import Wizard                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
           ↓                    ↓                    ↓
┌──────────────────────────────────────────────────────────┐
│              NEXT.JS API ROUTES                          │
│                                                           │
│  ┌─ PAYMENTS ─────────────────────────────────┐          │
│  │ POST /api/payments/create-order            │          │
│  │ POST /api/payments/razorpay-webhook        │          │
│  │ POST /api/payments/verify                  │          │
│  └─────────────────────────────────────────────┘          │
│                                                           │
│  ┌─ COUPONS ──────────────────────────────────┐          │
│  │ POST /api/coupons/validate                 │          │
│  │ POST /api/admin/coupons/generate           │          │
│  │ GET  /api/admin/coupons/list               │          │
│  └─────────────────────────────────────────────┘          │
│                                                           │
│  ┌─ SUBSCRIPTIONS ────────────────────────────┐          │
│  │ GET  /api/subscriptions/status             │          │
│  │ POST /api/subscriptions/extend-trial       │          │
│  │ POST /api/subscriptions/upgrade            │          │
│  │ POST /api/subscriptions/cancel             │          │
│  └─────────────────────────────────────────────┘          │
│                                                           │
│  ┌─ SUPPORT ──────────────────────────────────┐          │
│  │ POST /api/support/tickets                  │          │
│  │ GET  /api/support/tickets                  │          │
│  │ POST /api/support/tickets/[id]/messages    │          │
│  └─────────────────────────────────────────────┘          │
│                                                           │
│  ┌─ DATA MIGRATION ───────────────────────────┐          │
│  │ POST /api/data-migration/validate-import   │          │
│  │ POST /api/data-migration/execute-import    │          │
│  │ GET  /api/data-migration/status            │          │
│  └─────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────┘
           ↓                    ↓                    ↓
┌──────────────────────────────────────────────────────────┐
│           EXTERNAL SERVICES                              │
│                                                           │
│  ┌─ RAZORPAY ─────────────────────────────────┐          │
│  │ - Create Payment Orders                    │          │
│  │ - Checkout Widget                          │          │
│  │ - Webhook Notifications                    │          │
│  │ - Invoice Generation                       │          │
│  └─────────────────────────────────────────────┘          │
│                                                           │
│  ┌─ SUPABASE (Database + Auth) ───────────────┐          │
│  │ - PostgreSQL                               │          │
│  │ - Row-Level Security                       │          │
│  │ - Auth (Supabase Auth)                     │          │
│  │ - Real-time Subscriptions                  │          │
│  └─────────────────────────────────────────────┘          │
│                                                           │
│  ┌─ CLAUDE AGENT (Support AI) ────────────────┐          │
│  │ - Auto-response to support tickets         │          │
│  │ - Issue categorization                     │          │
│  │ - Knowledge base retrieval                 │          │
│  └─────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────────────────┐
│           DATABASE SCHEMA                                │
│                                                           │
│  Core Tenant Tables:                                     │
│  - organizations (tenants)                               │
│  - subscription_plans                                    │
│  - payments                                              │
│  - coupon_codes                                          │
│  - coupon_usage                                          │
│                                                           │
│  Support Tables:                                         │
│  - support_tickets                                       │
│  - ticket_messages                                       │
│                                                           │
│  Migration Tables:                                       │
│  - data_migrations                                       │
│                                                           │
│  Extended Tables:                                        │
│  - firms (org_id added)                                  │
│  - products (org_id added)                               │
│  - customers (org_id added)                              │
│  - bills (org_id added)                                  │
│  - payments_saas (payments)                              │
│  - users_teams (org_id added)                            │
│                                                           │
│  Audit Tables:                                           │
│  - audit_logs (org_id, user_id, action)                  │
│  - org_analytics (usage stats)                           │
│  - feature_flags (per-org features)                      │
└──────────────────────────────────────────────────────────┘
```

---

## 📊 DATA FLOW

### 1. User Signup Flow
```
User enters email → Signup API
                    ↓
            Create auth.users entry (Supabase)
                    ↓
            Create organizations entry (trial=true)
                    ↓
            Set trial_ends_at = now + 14 days
                    ↓
            Generate session token
                    ↓
            Redirect to app (no payment needed)
```

### 2. Trial Management Flow
```
App loads → Check subscription/status
                    ↓
            Is trial active?
            YES → Allow access
            NO → Show upgrade modal
                    ↓
            User clicks "Extend Trial"
                    ↓
            POST /subscriptions/extend-trial
                    ↓
            Set trial_ends_at += 7 days
                    ↓
            Return to app (extended)
```

### 3. Payment Flow
```
User selects plan → Collect plan + billing_period
                    ↓
            User enters coupon (optional)
                    ↓
            POST /payments/create-order
                    ├─ Validate coupon (if provided)
                    ├─ Calculate discount
                    ├─ Create Razorpay order
                    └─ Return order_id + amount
                    ↓
            Razorpay checkout modal opens
                    ↓
            User enters card details
                    ↓
            Razorpay authorizes payment
                    ↓
            Razorpay sends webhook: payment.authorized
                    ↓
            /api/payments/razorpay-webhook receives event
                    ├─ Verify signature
                    ├─ Update payments table (status=paid)
                    ├─ Update organizations (status=active)
                    └─ Increment coupon usage count
                    ↓
            Send confirmation email
                    ↓
            User sees "Payment successful!"
```

### 4. Coupon Validation Flow
```
User enters coupon code → POST /coupons/validate
                    ↓
            Check code exists
            Check not expired
            Check usage limit not reached
            Check plan applicable
            Check billing period applicable
                    ↓
            Calculate discount
                    ↓
            Return discount details + final amount
                    ↓
            User sees "₹1,234 with coupon applied"
```

### 5. Data Import Flow
```
User uploads CSV → POST /data-migration/validate-import
                    ├─ Parse CSV
                    ├─ Validate headers
                    ├─ Check required fields
                    └─ Return field mapping suggestions
                    ↓
            User reviews mapping
                    ↓
            POST /data-migration/execute-import
                    ├─ Re-validate data
                    ├─ Check for duplicates
                    ├─ Import records (customers/products/bills)
                    └─ Return import report
                    ↓
            User sees "Imported 150 customers, 5 duplicates"
```

---

## 🔐 Security Architecture

### Authentication Layer
```
Request → Supabase JWT token
           ↓
        Verify token validity
           ↓
        Extract user_id
           ↓
        Fetch organization (where owner_id = user_id)
           ↓
        Add to request context
```

### Authorization Layer
```
API Request → Check organization_id in header/body
               ↓
            Query includes WHERE organization_id = ?
               ↓
            Row-Level Security policies enforce this
               ↓
            User cannot see/modify other orgs' data
```

### Data Isolation
```
Supabase RLS Policies:
- organizations: SELECT where owner_id = current_user
- payments: SELECT where org belongs to current_user
- coupons: SELECT where accessible to user's org
- support_tickets: SELECT where organization_id = user's org

+ Application-level checks in all API routes
```

---

## 💳 Payment Processing

### Razorpay Integration Points

```
1. CREATE ORDER
   POST /api/payments/create-order
   ├─ Accepts: plan, billing_period, coupon_code
   ├─ Returns: razorpay_order_id, razorpay_key_id
   └─ Payment record created with status=pending

2. CHECKOUT
   Client-side Razorpay.Checkout()
   ├─ Opens modal
   ├─ User enters card
   └─ Returns payment_id

3. WEBHOOK VERIFICATION
   POST /api/payments/razorpay-webhook
   ├─ Receives: payment.authorized event
   ├─ Verifies: signature
   ├─ Updates: payment record, organization subscription
   └─ Logs: audit trail

4. CONFIRMATION
   - User sees success message
   - Email sent with invoice
   - Subscription active
```

### Payment Status States

```
PENDING     → Order created, waiting for payment
    ↓
PAID        → Payment authorized, subscription active
    ↓
FAILED      → Payment rejected
    ↓
REFUNDED    → Money returned to customer
```

---

## 🎟️ Coupon System Architecture

### Coupon Code Types

```
1. PERCENTAGE OFF
   - discount_type: "percentage"
   - discount_value: 30 (means 30%)
   - Use case: "30% off annual plans"

2. FIXED AMOUNT
   - discount_type: "fixed"
   - discount_value: 50000 (₹500 in paise)
   - Use case: "₹500 off orders over ₹2000"

3. TIERED
   - Created multiple codes with same discount
   - Each code has max_uses limit
   - Use case: "100 codes, each good for 10 uses"

4. TIME-LIMITED
   - valid_from & valid_until dates
   - Use case: "Monsoon sale: 20% off till Friday"

5. PLAN-SPECIFIC
   - applicable_plans: ["starter", "business"]
   - Use case: "Starter plan only: 25% off"

6. BILLING-SPECIFIC
   - applicable_billing: ["annual"]
   - Use case: "Annual subscribers: 40% off"

7. ONE-TIME
   - max_uses_per_coupon: 1
   - Use case: Referral codes
```

### Coupon Usage Tracking

```
coupon_codes table:
- code (unique)
- discount details
- validity dates
- usage limits
- creation date

coupon_usage table:
- which code (FK)
- which org (FK)
- which payment (FK)
- when used

Query to check remaining uses:
SELECT 
  c.code,
  c.max_uses,
  COUNT(u.id) as used,
  (c.max_uses - COUNT(u.id)) as remaining
FROM coupon_codes c
LEFT JOIN coupon_usage u ON c.id = u.coupon_id
WHERE c.code = 'PROMO123'
GROUP BY c.id
```

---

## 📞 Support System Architecture

### Ticket Lifecycle

```
1. CREATE TICKET
   User fills form (title, description, category)
   ↓
   POST /support/tickets
   ├─ Create support_tickets record
   ├─ Create initial message
   ├─ Trigger Claude AI support agent
   └─ Return ticket_id

2. CLAUDE AI RESPONSE
   Claude agent reviews ticket
   ├─ Understands issue category
   ├─ Suggests solution from knowledge base
   ├─ Inserts AI response as ticket message
   └─ Marks status: open → waiting_response

3. USER REPLIES
   POST /support/tickets/{id}/messages
   ├─ Create new message
   ├─ Update ticket.updated_at
   ├─ Re-trigger Claude if needed
   └─ Send notification to support team

4. ASSIGNMENT & RESOLUTION
   Admin assigns to support agent
   ├─ Agent reviews AI suggestions
   ├─ Agent provides final solution
   ├─ Mark status: resolved
   └─ Send resolution email
```

### Claude Support Integration

```
Future enhancement:
Incoming support ticket
    ↓
Claude Agent System:
├─ Analyze ticket
├─ Search knowledge base (FAQ, docs, previous tickets)
├─ Categorize issue (billing, technical, migration, etc.)
├─ Suggest solution
├─ Auto-response if confidence > 80%
├─ Escalate to human if < 80%
└─ Log for analytics

Benefits:
- Instant response to common issues
- 24/7 support availability
- Reduce support team workload
- Better SLA compliance
```

---

## 📊 Data Import Architecture

### CSV Import Workflow

```
1. VALIDATION PHASE
   User uploads CSV
   ├─ Parse CSV headers
   ├─ Check required fields present
   ├─ Suggest field mapping
   └─ Ask for confirmation

2. MAPPING PHASE
   User verifies field mapping
   ├─ "Name" column → customer_name
   ├─ "Phone" column → phone
   ├─ "Email" column → email
   └─ Submit mapping

3. EXECUTION PHASE
   Execute import
   ├─ For each CSV row:
   │  ├─ Apply field mapping
   │  ├─ Validate data
   │  ├─ Check for duplicates
   │  ├─ Insert into database
   │  └─ Track errors
   ├─ Create audit log
   └─ Generate import report

4. REPORT PHASE
   Show import results
   ├─ "Imported: 150 customers"
   ├─ "Duplicates skipped: 5"
   ├─ "Errors: 2"
   └─ Show error details
```

### Supported Imports

```
CUSTOMERS
├─ Fields: name, phone, email, address, city, state, gstin, opening_balance
├─ From: Tally, QuickBooks, manual CSV
└─ Validation: name + phone required, duplicate check on phone

PRODUCTS
├─ Fields: name, price, sku, hsn, gst, category, quantity
├─ From: Tally, manual CSV
└─ Validation: name + price required, duplicate check on sku

BILLS
├─ Fields: invoice_no, customer_name, date, total, items
├─ From: Tally (planned), manual CSV
└─ Validation: customer exists, invoice_no unique per org

PAYMENTS
├─ Fields: invoice_no, amount, date, mode, status
├─ From: Bank statements (planned)
└─ Validation: match to existing bills
```

---

## 📈 Usage Analytics

### Metrics Tracked

```
per_organization:
- total_invoices (lifetime)
- total_revenue (lifetime)
- active_customers (this month)
- total_customers (lifetime)
- days_since_activity
- is_active (boolean)

per_subscription:
- plan (starter/business/pro)
- status (trial/active/suspended)
- seats_used / seats_purchased
- monthly_recurring_revenue (MRR)
- churn_risk (high/medium/low)
```

### Dashboard Queries

```sql
-- Revenue per month
SELECT DATE_TRUNC('month', paid_at) as month, SUM(amount) as revenue
FROM payments
WHERE status = 'paid'
GROUP BY month
ORDER BY month DESC;

-- Active organizations
SELECT COUNT(*) as active
FROM organizations
WHERE status = 'active'
AND subscription_ends_at > NOW();

-- Plan distribution
SELECT plan, COUNT(*) as count
FROM organizations
WHERE status IN ('active', 'trial')
GROUP BY plan;

-- Churn analysis
SELECT COUNT(*) as churned
FROM organizations
WHERE status = 'cancelled'
AND cancelled_at > NOW() - INTERVAL '30 days';
```

---

## 🚀 Deployment Architecture

### Development
```
localhost:3000
├─ Next.JS dev server
├─ Supabase local (optional)
└─ Razorpay test mode
```

### Staging
```
staging.shopOS.com
├─ Next.JS (deployed to Vercel)
├─ Supabase (staging project)
└─ Razorpay test mode
```

### Production
```
app.shopOS.com
├─ Next.JS (deployed to Vercel)
├─ Supabase (production project)
├─ Razorpay live mode
├─ CDN for static assets
└─ Email service (SendGrid, Resend, etc.)
```

### Database Backups
```
Supabase handles:
- Daily automated backups
- Point-in-time recovery
- Replication to secondary region
```

---

## 📋 Checklist for Launch

### Pre-Launch (Week 1)
- [ ] Database migration complete
- [ ] All APIs tested and working
- [ ] Razorpay account setup
- [ ] Webhook configured and tested
- [ ] Test payment successful
- [ ] UI components built
- [ ] Signup flow includes trial auto-start

### Launch Day
- [ ] Deploy to production
- [ ] Set Razorpay webhook to production domain
- [ ] Test payment flow end-to-end
- [ ] Monitor server logs
- [ ] Have support email ready
- [ ] Share launch announcement

### Post-Launch (Week 2)
- [ ] Monitor payment success rate
- [ ] Check webhook delivery logs
- [ ] Gather customer feedback
- [ ] Fix any issues
- [ ] Plan Phase 1 (Data migration, Support)

---

## 📞 Support & Escalation

### Issue Categories

```
BILLING ISSUES
├─ Payment failed
├─ Wrong amount charged
├─ Subscription cancelled unexpectedly
└─ Coupon not applying

TECHNICAL ISSUES
├─ Can't login
├─ App crashes
├─ Data not saving
└─ Slow performance

FEATURE REQUESTS
├─ Need X functionality
├─ Integration with Y service
└─ Custom development

DATA MIGRATION
├─ Help importing from old system
├─ Data validation issues
└─ Custom mapping
```

### Response SLAs

```
URGENT (Billing, Access Lost)
├─ Response: 1 hour
├─ Resolution: 4 hours
└─ Escalate to: Founders

HIGH (Feature broken, Data loss risk)
├─ Response: 4 hours
├─ Resolution: 24 hours
└─ Escalate to: Support lead

MEDIUM (Minor bugs, Questions)
├─ Response: 8 hours
├─ Resolution: 48 hours
└─ Handle by: Support team

LOW (Feature requests, Enhancement)
├─ Response: 24 hours
├─ Resolution: 7 days
└─ Handle by: Product team
```

---

## 🎯 Success Metrics

### Business Metrics
```
Week 1:
- Signups: 50+
- Trial conversion: > 10%
- Payment success rate: > 95%

Month 1:
- Active paying customers: 50+
- Monthly Recurring Revenue (MRR): ₹50,000+
- Churn rate: < 5%

Quarter 1:
- Active customers: 200+
- MRR: ₹500,000+
- Customer satisfaction (NPS): > 40
```

### Technical Metrics
```
- API uptime: > 99.9%
- Payment processing: < 2s
- Webhook delivery: > 99%
- Support response time: < 2 hours
- Database latency: < 100ms
```

---

This architecture enables ShopOS to scale to thousands of customers while maintaining data security, payment reliability, and responsive support. The modular design allows you to add features in phases without disrupting the core system.
