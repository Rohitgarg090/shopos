# ShopOS SaaS - EASY STEP-BY-STEP SETUP GUIDE
## Copy & Paste Everything - No Thinking Required!

---

## ⏱️ TOTAL TIME: 5-7 DAYS

```
Day 1: Setup (2 hours)
Day 2-3: Build UI (6 hours) 
Day 4: Test (2 hours)
Day 5: Deploy (1 hour)
```

---

# 🚀 DAY 1: SETUP (2 HOURS)

## STEP 1.1: Setup Database Migration (15 MIN)

### What You're Doing:
Creating the database tables ShopOS needs for payments, coupons, subscriptions, etc.

### EXACT STEPS:

**Step 1:** Go to https://app.supabase.com
- Login with your account
- Click on your project

**Step 2:** In the left menu, click **SQL Editor**
- Look for purple button "SQL Editor" in left sidebar
- Click it

**Step 3:** Click **New Query** (blue button on top right)

**Step 4:** Copy the ENTIRE content of this file:
```
/Users/rohitgarg/Downloads/shopos/supabase/schema_saas.sql
```

**Step 5:** Paste everything into the SQL editor (Ctrl+A to select all, Ctrl+V to paste)

**Step 6:** Click **Run** button (or press Ctrl+Enter)
- You should see: "Success" messages
- This creates 11 new tables in your database

**Step 7:** Verify it worked:
- Click **Table Editor** in left menu
- Scroll down
- Look for these new tables:
  ```
  ✓ organizations
  ✓ subscription_plans  
  ✓ payments
  ✓ coupon_codes
  ✓ coupon_usage
  ✓ support_tickets
  ✓ ticket_messages
  ✓ data_migrations
  ✓ onboarding_tasks
  ✓ audit_logs
  ✓ org_analytics
  ```
  
If you see all 11 tables → **SUCCESS!** ✅

---

## STEP 1.2: Create Razorpay Account (30 MIN)

### What You're Doing:
Setting up payment processing with Razorpay (Indian payment gateway)

### EXACT STEPS:

**Step 1:** Go to https://razorpay.com

**Step 2:** Click **Sign Up** (top right button)

**Step 3:** Fill the form:
```
Email:    rohitgarg090@gmail.com
Phone:    Your mobile number (with country code: +91)
Password: Create a strong password
```

**Step 4:** Click **Sign Up**

**Step 5:** You'll get an OTP on your phone
- Enter the OTP
- Verify

**Step 6:** Fill business details:
```
Business Name:    ShopOS
Business Type:    Software/SaaS
Business Address: Your address
City:             Your city
State:            Your state
```

**Step 7:** Click **Complete Sign Up**

**Step 8:** You're now in Razorpay Dashboard
- Look for **Settings** in the left menu
- Click it

**Step 9:** Click **API Keys** (should be highlighted)

**Step 10:** You'll see two tabs: **Test** and **Live**
- Make sure you're on **Test** tab (for now)
- You'll see:
  ```
  Key ID:     rzp_test_xxxxxxxxxx
  Key Secret: (long string of characters)
  ```

**Step 11:** Copy these keys:
- **Key ID:** Copy the full string (starts with rzp_test_)
- **Key Secret:** Copy the full string

**Write them down or save in notepad!** You'll need them in next step.

✅ **Razorpay Setup Complete!**

---

## STEP 1.3: Add Razorpay Keys to Your App (15 MIN)

### What You're Doing:
Connecting your app to Razorpay so payments work

### EXACT STEPS:

**Step 1:** Open your project in VS Code
- File → Open Folder
- Navigate to: `/Users/rohitgarg/Downloads/shopos`
- Click Open

**Step 2:** In VS Code, look for `.env.local` file (in root folder)
- If you don't see it, create it:
  - Right-click in Explorer panel
  - New File
  - Name it: `.env.local`

**Step 3:** Open `.env.local` file

**Step 4:** Add these lines at the bottom:
```
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=whsec_test_xxxxxxxx
```

**Step 5:** Replace with YOUR keys from Razorpay:
- `rzp_test_xxxxxxxxxx` → Your actual Key ID
- `xxxxxxxxxxxxxxxxxx` → Your actual Key Secret
- For WEBHOOK_SECRET, leave as is for now (we'll update later)

**Step 6:** Save the file (Ctrl+S)

**Step 7:** Restart your dev server:
- In VS Code terminal: Press `Ctrl+C` to stop
- Then type: `npm run dev`
- Press Enter

✅ **Keys Added!**

---

## STEP 1.4: Verify Everything Works (10 MIN)

### Test that APIs are working

**Step 1:** Open Terminal in VS Code
- Press `Ctrl+` (backtick) to open terminal
- Or: View → Terminal

**Step 2:** Make sure you're in the right directory:
```bash
cd /Users/rohitgarg/Downloads/shopos
```

**Step 3:** Run this command to test the database connection:
```bash
npm run dev
```

**Step 4:** You should see:
```
✓ Compiled client and server successfully
✓ Ready in 2.5s
```

**Step 5:** Open your app:
- Go to http://localhost:3000 in browser
- Login with your account
- You should see the app loads normally

✅ **DAY 1 COMPLETE!** Database setup, Razorpay ready, API keys configured.

---

# 💻 DAY 2-3: BUILD UI COMPONENTS (6 HOURS)

## STEP 2.1: Create Billing Dashboard Component (2 HOURS)

### What You're Doing:
Creating a page where users can see their subscription and upgrade to paid plans

### EXACT STEPS:

**Step 1:** Create new file:
- Right-click on `components` folder
- New File
- Name it: `BillingDashboard.jsx`

**Step 2:** Copy and paste this code EXACTLY:

```jsx
"use client";
import React, { useState, useEffect } from "react";
import { api } from "@/lib/api-client";

const S = {
  card: { padding: 20, border: "1px solid #ddd", borderRadius: 12, marginBottom: 20 },
  h2: { fontSize: 24, fontWeight: 700, marginBottom: 16 },
  h3: { fontSize: 18, fontWeight: 700, marginBottom: 12 },
  btn: { 
    padding: "10px 20px", 
    background: "#1B5E8A", 
    color: "#fff", 
    border: "none", 
    borderRadius: 8, 
    cursor: "pointer",
    fontWeight: 600,
    marginRight: 10,
    marginBottom: 10
  },
  input: {
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 10,
    marginRight: 10,
    width: 250
  }
};

export default function BillingDashboard() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("starter");
  const [selectedBilling, setSelectedBilling] = useState("monthly");

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

  const handleUpgrade = async () => {
    try {
      const res = await api.post("/api/payments/create-order", {
        plan: selectedPlan,
        billing_period: selectedBilling,
        coupon_code: couponCode || null,
      });

      // Open Razorpay checkout
      const options = {
        key: res.razorpay_key_id,
        order_id: res.razorpay_order_id,
        amount: res.amount,
        currency: "INR",
        name: "ShopOS",
        description: `Upgrade to ${selectedPlan} plan`,
        handler: (response) => {
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

  if (loading) return <div style={S.card}>Loading subscription information...</div>;

  return (
    <div>
      <div style={S.h2}>Billing & Subscription</div>

      {/* Current Plan */}
      {subscription && (
        <div style={S.card}>
          <div style={S.h3}>Current Plan</div>
          <p><strong>Plan:</strong> {subscription.organization.planName}</p>
          <p><strong>Status:</strong> {subscription.organization.status}</p>

          {subscription.trial.isActive && (
            <div style={{ background: "#e3f2fd", padding: 12, borderRadius: 8, marginTop: 10 }}>
              <strong>🎉 Trial Active</strong>
              <p>{subscription.trial.daysRemaining} days remaining</p>
            </div>
          )}

          {subscription.subscription.isActive && (
            <div style={{ background: "#e8f5e9", padding: 12, borderRadius: 8, marginTop: 10 }}>
              <strong>✓ Subscription Active</strong>
              <p>Renews: {new Date(subscription.subscription.renewalDate).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      )}

      {/* Upgrade Plans */}
      <div style={S.h2}>Upgrade Your Plan</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
        {[
          { id: "starter", name: "Starter", monthlyPrice: 799, annualPrice: 6999, features: ["1 firm", "2 users", "Basic features"] },
          { id: "business", name: "Business", monthlyPrice: 1499, annualPrice: 12999, features: ["3 firms", "5 users", "Advanced features"] },
          { id: "pro", name: "Pro", monthlyPrice: 2499, annualPrice: 21999, features: ["Unlimited firms", "Unlimited users", "All features"] },
        ].map((plan) => (
          <div key={plan.id} style={{ ...S.card, border: selectedPlan === plan.id ? "2px solid #1B5E8A" : "1px solid #ddd" }}>
            <div style={S.h3}>{plan.name}</div>
            <p>
              <strong>Monthly:</strong> ₹{plan.monthlyPrice}/mo | 
              <strong style={{ marginLeft: 10 }}>Annual:</strong> ₹{plan.annualPrice}/yr
            </p>
            <ul>
              {plan.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button 
              style={{...S.btn, background: selectedPlan === plan.id ? "#1B5E8A" : "#ccc"}}
              onClick={() => setSelectedPlan(plan.id)}
            >
              Select {plan.name}
            </button>
          </div>
        ))}
      </div>

      {/* Billing Period Selection */}
      <div style={S.card}>
        <div style={S.h3}>Select Billing Period</div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ marginRight: 20 }}>
            <input 
              type="radio" 
              value="monthly" 
              checked={selectedBilling === "monthly"}
              onChange={(e) => setSelectedBilling(e.target.value)}
            />
            {" "}Monthly
          </label>
          <label>
            <input 
              type="radio" 
              value="annual" 
              checked={selectedBilling === "annual"}
              onChange={(e) => setSelectedBilling(e.target.value)}
            />
            {" "}Annual (Save 27-28%)
          </label>
        </div>
      </div>

      {/* Coupon Code */}
      <div style={S.card}>
        <div style={S.h3}>Have a Coupon Code?</div>
        <input
          style={S.input}
          type="text"
          placeholder="Enter coupon code"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
        />
      </div>

      {/* Upgrade Button */}
      <div style={S.card}>
        <button style={{...S.btn, background: "#27ae60", padding: "12px 30px", fontSize: 16}} onClick={handleUpgrade}>
          💳 Continue to Payment
        </button>
        <p style={{ color: "#666", marginTop: 10 }}>Secured by Razorpay</p>
      </div>
    </div>
  );
}
```

**Step 3:** Save the file (Ctrl+S)

✅ **Billing Dashboard Created!**

---

## STEP 2.2: Add Billing Dashboard to Settings (30 MIN)

### What You're Doing:
Making the billing page visible in the Settings tab

### EXACT STEPS:

**Step 1:** Open `components/ShopOS.jsx`

**Step 2:** Find where Settings page is rendered
- Press Ctrl+F to search
- Search for: `page==='settings'`
- You'll find something like:
```jsx
{page==='settings'&&<Settings .../>}
```

**Step 3:** Add BillingDashboard import at the top with other imports:
```jsx
import BillingDashboard from '@/components/BillingDashboard';
```

**Step 4:** In the Settings component, add a tab for Billing:
- Find the Settings component in ShopOS.jsx
- Look for where tabs are defined
- Add this line to create a Billing tab:

```jsx
{tab==='billing'&&<BillingDashboard/>}
```

**Step 5:** Add a button in Settings to go to Billing tab:
- Find the Settings heading
- Add this button nearby:
```jsx
<button onClick={() => setTab('billing')} style={{...S.btn('pri')}}>
  💳 Billing & Subscription
</button>
```

**Step 6:** Save the file (Ctrl+S)

**Step 7:** Go to http://localhost:3000
- Login
- Go to Settings
- You should now see Billing Dashboard!

✅ **Billing Dashboard Integrated!**

---

## STEP 2.3: Add Trial Check on App Startup (1 HOUR)

### What You're Doing:
Checking if user's trial expired, and if so, showing upgrade modal

### EXACT STEPS:

**Step 1:** Open `components/ShopOS.jsx`

**Step 2:** Find the main ShopOS function (around line 196):
```jsx
export default function ShopOS(){
```

**Step 3:** Add this code right after `const[ses,setSes]=useState(null);` line:

```jsx
const[showUpgradeModal,setShowUpgradeModal]=useState(false);
const[subscriptionStatus,setSubscriptionStatus]=useState(null);

useEffect(()=>{
  if(!ses)return;
  const checkSubscription=async()=>{
    try{
      const res=await api.get('/api/subscriptions/status');
      setSubscriptionStatus(res);
      
      // If trial ended, show upgrade modal
      if(res.organization.status==='trial'&&res.trial.daysRemaining<=0){
        setShowUpgradeModal(true);
        setPage(''); // Block navigation
      }
    }catch(err){
      console.error('Subscription check failed:',err);
    }
  };
  checkSubscription();
},[ses]);
```

**Step 4:** Add this modal render before the main return statement:

```jsx
if(showUpgradeModal){
  return<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
    <div style={{background:'#fff',padding:40,borderRadius:12,maxWidth:500,textAlign:'center'}}>
      <h2>Your Trial Has Ended!</h2>
      <p>Upgrade to a paid plan to continue using ShopOS</p>
      <button style={{padding:'12px 24px',background:'#1B5E8A',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontSize:16}} onClick={()=>{setShowUpgradeModal(false);setPage('settings');}}>
        Choose Your Plan
      </button>
    </div>
  </div>;
}
```

**Step 5:** Save the file (Ctrl+S)

**Step 6:** Test in browser:
- http://localhost:3000
- If your trial shows as expired, you'll see the upgrade modal

✅ **Trial Check Added!**

---

## STEP 2.4: Add Razorpay Script to Layout (10 MIN)

### What You're Doing:
Loading Razorpay payment widget on your app

### EXACT STEPS:

**Step 1:** Open `app/layout.jsx`

**Step 2:** Find the `<head>` section

**Step 3:** Add this line before closing `</head>`:
```jsx
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

**Step 4:** Save the file (Ctrl+S)

✅ **Razorpay Script Added!**

---

## STEP 2.5: Test the Billing Flow (2 HOURS)

### What You're Doing:
Making sure everything works before going live

### EXACT STEPS:

**Step 1:** Restart dev server
- Press Ctrl+C in terminal
- Type: `npm run dev`
- Press Enter

**Step 2:** Go to http://localhost:3000

**Step 3:** Login with your account

**Step 4:** Go to Settings

**Step 5:** Click "Billing & Subscription" tab

**Step 6:** You should see:
- ✓ Current plan status
- ✓ Trial days remaining
- ✓ Three plan cards (Starter, Business, Pro)
- ✓ Billing period selector
- ✓ Coupon code input
- ✓ "Continue to Payment" button

**Step 7:** Try to upgrade:
- Select "Business" plan
- Select "Monthly"
- Click "Continue to Payment"

**Step 8:** Razorpay checkout should open:
- You should see the amount
- All fields

✅ **Billing Flow Working!**

---

# 🧪 DAY 4: TESTING (2 HOURS)

## STEP 3.1: Test Payment with Test Card (1 HOUR)

### What You're Doing:
Testing payment processing without real money

### EXACT STEPS:

**Step 1:** In the Razorpay checkout that opened:
```
Card Number:  4111 1111 1111 1111
Expiry:       12/25
CVV:          123
Name:         Your Name
Email:        your@email.com
```

**Step 2:** Click Pay

**Step 3:** You should see "Payment successful!" message

**Step 4:** Verify in database:
- Go to Supabase
- Table Editor
- Click "payments" table
- You should see a new row with status="paid"

**Step 5:** Check organizations table:
- You should see your organization status changed to "active"

✅ **Payment Processing Works!**

---

## STEP 3.2: Test Coupon Code (30 MIN)

### What You're Doing:
Testing that discount codes work properly

### EXACT STEPS:

**Step 1:** Generate a test coupon code
- Open VS Code Terminal
- Copy this command:

```bash
curl -X POST http://localhost:3000/api/admin/coupons/generate \
  -H "Authorization: Bearer $(curl -s http://localhost:3000/api/auth/session | jq -r '.session.access_token')" \
  -H "Content-Type: application/json" \
  -d '{
    "count": 1,
    "prefix": "TEST",
    "discount_type": "percentage",
    "discount_value": 30,
    "applicable_plans": ["starter", "business", "pro"],
    "applicable_billing": ["monthly", "annual"]
  }'
```

**Step 2:** Paste and run the command

**Step 3:** You should see:
```json
{
  "success": true,
  "codes": ["TEST123456"]
}
```

**Note:** The exact code will be different, but format same.

**Step 4:** Try to upgrade again with the coupon:
- Go to Billing tab
- Enter the coupon code (from above)
- Click "Continue to Payment"
- You should see amount reduced by 30%

✅ **Coupon System Works!**

---

## STEP 3.3: Test Trial Extension (15 MIN)

### What You're Doing:
Verifying users can extend their trial once

### EXACT STEPS:

**Step 1:** If you still have active trial:
- Go to Billing tab
- You should see "Trial Active - X days remaining"

**Step 2:** Click "Extend Trial" button (if visible)

**Step 3:** Confirm modal should say "Trial extended by 7 days"

**Step 4:** Verify in Supabase:
- Go to Table Editor
- Click "organizations" table
- Find your organization row
- Check `trial_ends_at` increased by 7 days

✅ **Trial Extension Works!**

---

# 🚀 DAY 5: DEPLOYMENT (1 HOUR)

## STEP 4.1: Switch to Razorpay LIVE Mode (15 MIN)

### What You're Doing:
Moving from test payments to real payments

### EXACT STEPS:

**Step 1:** Go to https://dashboard.razorpay.com

**Step 2:** Click Settings → API Keys

**Step 3:** Switch to **LIVE** tab (blue button at top)

**Step 4:** Copy:
```
Key ID:     rzp_live_xxxxxxxxxx
Key Secret: (long string)
```

**Step 5:** Go back to VS Code

**Step 6:** Open `.env.local`

**Step 7:** Replace TEST keys with LIVE keys:
```
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxx
```

**Step 8:** Save file (Ctrl+S)

**Step 9:** Restart dev server:
- Ctrl+C in terminal
- `npm run dev`
- Enter

✅ **Switched to Live Mode!**

---

## STEP 4.2: Deploy to Production (30 MIN)

### What You're Doing:
Making your app live on the internet

### EXACT STEPS:

**Option A: Using Vercel (Recommended)**

**Step 1:** Go to https://vercel.com

**Step 2:** Click "Sign Up"
- Use GitHub account or create account

**Step 3:** Click "New Project"

**Step 4:** Select your ShopOS repository from GitHub

**Step 5:** Configure environment variables:
- Click "Environment Variables"
- Add your keys:
  ```
  RAZORPAY_KEY_ID = rzp_live_xxx
  RAZORPAY_KEY_SECRET = xxx
  RAZORPAY_WEBHOOK_SECRET = whsec_xxx
  ```

**Step 6:** Click "Deploy"

**Step 7:** Wait for deployment (5-10 minutes)

**Step 8:** You'll get a live URL like: `https://shopOS-xyz.vercel.app`

---

**Option B: Using Your Own Server**

**Step 1:** Run build:
```bash
npm run build
```

**Step 2:** Run production:
```bash
npm run start
```

**Step 3:** Use a service like ngrok or your own domain to expose to internet

---

## STEP 4.3: Setup Razorpay Webhook for Production (15 MIN)

### What You're Doing:
Telling Razorpay where to send payment confirmations

### EXACT STEPS:

**Step 1:** Go to https://dashboard.razorpay.com

**Step 2:** Click Settings → Webhooks

**Step 3:** Click "Create Webhook" (or "Add Webhook")

**Step 4:** Fill in:
```
Webhook URL: https://your-production-domain.com/api/payments/razorpay-webhook
```

(Replace `your-production-domain` with your actual domain from Vercel or your server)

**Step 5:** Select events to subscribe:
- ✅ payment.authorized
- ✅ payment.failed
- ✅ subscription.activated
- ✅ subscription.expired

**Step 6:** Click "Create"

**Step 7:** Copy the **Webhook Secret**

**Step 8:** Update `.env.local` on production (in Vercel or your server):
```
RAZORPAY_WEBHOOK_SECRET=whsec_live_xxx
```

✅ **Webhook Connected!**

---

## STEP 4.4: Test Live Payment (15 MIN)

### What You're Doing:
Making sure real payments work

### EXACT STEPS:

**Step 1:** Go to your live URL (Vercel or your domain)

**Step 2:** Create a new account or login

**Step 3:** Go to Billing & Subscription

**Step 4:** Try to upgrade with a REAL payment card
- Use your own Visa/Mastercard
- Amount will be charged to your card
- You'll get email confirmation

**Step 5:** Verify payment in Razorpay dashboard:
- Settings → API Keys
- Click "Payments" section
- You should see your payment listed

✅ **Live Payment Successful!**

---

# 📊 AFTER DEPLOYMENT: MONITORING

## What to Check Daily:

**1. Razorpay Dashboard:**
- Go to https://dashboard.razorpay.com
- Check "Payments" section
- Look for recent transactions

**2. Your Database:**
- Go to Supabase
- Click "payments" table
- Check for new payment records

**3. Subscription Status:**
- Go to "organizations" table
- Check if `status` shows "active" for paid customers

---

# 🎁 BONUS: GENERATE COUPON CODES FOR CUSTOMERS

### How to Create Discount Codes

**Step 1:** Open Terminal in VS Code

**Step 2:** Copy this command and fill in your numbers:

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
    "valid_until": "2026-06-07",
    "description": "30% off - Launch Special"
  }'
```

**Step 3:** Replace YOUR_TOKEN with your actual session token

**Step 4:** Run the command

**Step 5:** You'll get back 10 coupon codes like:
```
LAUNCH123456
LAUNCH789012
...
```

**Step 6:** Share these codes with customers!

---

# ✅ LAUNCH CHECKLIST

Before you declare yourself LIVE:

```
☐ Database migration complete
☐ Razorpay account created with LIVE keys
☐ BillingDashboard component built
☐ Billing page shows up in Settings
☐ Trial check working (blocks expired trials)
☐ Test payment successful
☐ Live payment successful
☐ Webhook configured
☐ Can generate coupon codes
☐ Deployed to production
☐ All pages load on production URL
☐ Users can signup and get trial
☐ Users can upgrade to paid plans
```

Once all checked → **YOU'RE LIVE!** 🚀

---

# 🐛 TROUBLESHOOTING

### Problem: "Razorpay is not defined"
**Solution:** 
- Make sure you added the script to `app/layout.jsx`
- Restart dev server

### Problem: "Payment fails - Invalid Signature"
**Solution:**
- Check RAZORPAY_WEBHOOK_SECRET in .env.local is correct
- Copy from Razorpay dashboard exactly

### Problem: "Database migration failed"
**Solution:**
- Go to Supabase SQL Editor
- Clear the query
- Try again, copy the entire schema_saas.sql file
- Make sure to execute (press Run)

### Problem: "Can't see billing page in Settings"
**Solution:**
- Make sure you imported BillingDashboard in ShopOS.jsx
- Make sure you added the tab in Settings component
- Restart dev server (Ctrl+C then npm run dev)

### Problem: "Upgrade button doesn't work"
**Solution:**
- Check console for errors (F12 → Console)
- Make sure Razorpay script loaded (check <head> in browser)
- Make sure API keys in .env.local are correct

---

# 📞 NEED HELP?

If you're stuck:

1. **Check the docs:**
   - SAAS_IMPLEMENTATION.md
   - QUICK_REFERENCE.md
   - RAZORPAY_SETUP.md

2. **Check error messages:**
   - Browser console (F12 → Console)
   - VS Code terminal
   - Supabase dashboard (check for SQL errors)

3. **Check Razorpay status:**
   - https://status.razorpay.com
   - Make sure service is up

4. **Verify files exist:**
   - supabase/schema_saas.sql
   - app/api/payments/create-order/route.js
   - app/api/payments/razorpay-webhook/route.js
   - All other API files

---

# 🎉 YOU DID IT!

You now have a complete SaaS platform:
- ✅ Free 14-day trials
- ✅ Paid subscription plans  
- ✅ Payment processing
- ✅ Discount coupon codes
- ✅ Support infrastructure
- ✅ Data migration tools

**Congratulations! Your SaaS is LIVE!** 🚀

Now go get your first 10 paying customers! 💰

