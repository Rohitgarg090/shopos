# Razorpay Integration Setup Guide

## Step 1: Create Razorpay Account

1. Go to https://razorpay.com
2. Click "Sign Up"
3. Fill in:
   - Email: rohitgarg090@gmail.com
   - Phone: Your phone
   - Business type: Software/SaaS
4. Verify OTP
5. Fill business details

---

## Step 2: Get API Keys

### Get Keys from Dashboard:

1. Login to https://dashboard.razorpay.com
2. Go to **Settings → API Keys**
3. You'll see two tabs: **Test** and **Live**
4. Copy from **Test** tab first:
   - Key ID (starts with `rzp_test_`)
   - Key Secret (long string)

### Test Card for Testing:
```
Card Number: 4111 1111 1111 1111
Expiry: 12/25
CVV: 123
```

---

## Step 3: Configure .env.local

```bash
# Add to .env.local

RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=whsec_test_xxxxxxxxxxxx

# This will be set later after webhook creation
```

---

## Step 4: Setup Webhook

### Create Webhook:

1. Go to https://dashboard.razorpay.com/app/settings/webhooks
2. Click **Add Webhook**
3. **Webhook URL:** 
   ```
   https://yourdomain.com/api/payments/razorpay-webhook
   
   For local testing:
   https://your-ngrok-url.ngrok.io/api/payments/razorpay-webhook
   ```

4. **Select Events** (check these):
   - ✅ payment.authorized
   - ✅ payment.failed
   - ✅ subscription.activated
   - ✅ subscription.expired
   - ✅ subscription.halted

5. Click **Create Webhook**
6. Copy **Secret** from webhook details
7. Add to `.env.local`:
   ```
   RAZORPAY_WEBHOOK_SECRET=whsec_test_xxxxx
   ```

---

## Step 5: Setup Local Testing with ngrok

### Install ngrok:
```bash
# MacOS
brew install ngrok

# Or download from https://ngrok.com
```

### Start ngrok tunnel:
```bash
ngrok http 3000
```

You'll see:
```
Forwarding                    https://abc123.ngrok.io -> http://localhost:3000
```

Copy the HTTPS URL and use it in webhook settings above.

---

## Step 6: Test Payment Flow

### 1. Start your app:
```bash
npm run dev
```

### 2. Go to billing page (development)
```
http://localhost:3000
- Login
- Go to Settings → Billing
```

### 3. Click "Upgrade Monthly"

### 4. Use test card:
```
4111 1111 1111 1111 / 12/25 / 123
```

### 5. Check webhook logs:
- Go to Razorpay dashboard → Settings → Webhooks
- Click on your webhook
- You should see recent deliveries

---

## Step 7: Monitor Payments

### In Razorpay Dashboard:
- **Payments** → See all payments
- **Settings → Webhooks** → See delivery history
- **Reports** → Revenue reports

### In Your Database:
```sql
SELECT * FROM payments WHERE status = 'paid';
SELECT * FROM organizations WHERE status = 'active';
```

---

## Step 8: Go Live (Later)

When you're ready to go live:

1. Go to Razorpay Settings → API Keys
2. Switch to **Live** tab
3. Copy Live Key ID and Secret
4. Update `.env.local` with live keys
5. Create webhook for production domain
6. Test one payment with live card
7. Monitor first few payments closely

---

## Razorpay Live Keys Format

```
Test:
Key ID: rzp_test_xxxxxxxxxxxx
Key Secret: (shorter secret for test)

Live:
Key ID: rzp_live_xxxxxxxxxxxx
Key Secret: (same format, different keys)
```

---

## Common Issues

### "Invalid Signature" Error
- Webhook secret is wrong
- Check webhook settings in dashboard
- Make sure SECRET matches exactly

### Payment shows in Razorpay but not in database
- Webhook didn't fire
- Check ngrok tunnel is still running
- Check webhook delivery logs in dashboard

### "Gateway error"
- API keys are wrong format
- Check key ID and secret
- Make sure using TEST keys for testing

### Customer sees "Invalid order"
- Order wasn't created in database
- Check `/api/payments/create-order` response
- Verify authorization header is correct

---

## TESTING SCENARIO

### Complete Payment Flow Test:

```
1. Create free trial org
   ↓
2. Day 10 → Show "3 days left" email
   ↓
3. Day 14 → Redirect to upgrade page
   ↓
4. User clicks "Upgrade to Pro Annual"
   ↓
5. System creates Razorpay order
   ↓
6. Razorpay checkout modal opens
   ↓
7. User enters test card: 4111 1111 1111 1111
   ↓
8. Payment authorized
   ↓
9. Webhook fires payment.authorized event
   ↓
10. Database updates:
    - payments.status = 'paid'
    - organizations.status = 'active'
    - organizations.plan = 'pro'
    ↓
11. User sees "Payment successful!"
    ↓
12. Subscription active for 1 year
```

---

## RAZORPAY SETTINGS CHECKLIST

- [ ] Account created
- [ ] Business details filled
- [ ] API keys copied to .env.local
- [ ] Webhook created and secret added
- [ ] Test payment successful
- [ ] Webhook delivery confirmed in dashboard
- [ ] Database updated correctly after payment

---

## INVOICE GENERATION (Future)

Razorpay automatically generates invoices for payments. You can:
1. Download from Razorpay dashboard
2. Send to customer
3. Store in S3/storage

---

## REFUND HANDLING (Future)

To issue refund after payment:
```bash
curl -u KEY_ID:KEY_SECRET \
  -X POST https://api.razorpay.com/v1/refunds \
  -d "payment_id=pay_xxxx&amount=100000"
```

---

## MONTHLY SUBSCRIPTION (Future)

For auto-recurring subscriptions:
```javascript
const subscription = await razorpay.subscriptions.create({
  plan_id: planId,
  customer_notify: 1,
  quantity: 1,
  total_count: 12, // 12 months
  addons_items: [...]
});
```

---

## RESOURCES

- **Dashboard**: https://dashboard.razorpay.com
- **Docs**: https://razorpay.com/docs/
- **Test Cards**: https://razorpay.com/docs/payment-gateway/test-card-numbers/
- **Webhook Events**: https://razorpay.com/docs/webhooks/event-types/
- **API Reference**: https://razorpay.com/docs/api/

---

## SUPPORT

If issues arise:
1. Check Razorpay status: https://status.razorpay.com
2. Review webhook logs in dashboard
3. Contact Razorpay: support@razorpay.com
4. Razorpay docs: https://razorpay.com/docs
