# Security Audit Report - ShopOS

**Date:** June 3, 2026  
**Severity Summary:** 🔴 CRITICAL (4) | 🟠 HIGH (8) | 🟡 MEDIUM (6)

---

## Critical Vulnerabilities 🔴

### 1. **Inefficient User Lookup - Potential DoS**
**File:** `app/api/auth/register/route.js:62`  
**Issue:** Using `supabase.auth.admin.listUsers()` loads ALL users into memory
```js
const { data: existingUsers } = await supabase.auth.admin.listUsers();
const existingUser = existingUsers?.users?.find(u => u.email === email);
```
**Risk:** Memory exhaustion, performance degradation as user base grows  
**Fix:** Use `supabase.auth.admin.getUserByEmail(email)` instead

---

### 2. **Weak Password Validation**
**File:** `app/api/auth/register/route.js:19`  
**Issue:** Only requires 6 characters minimum
```js
if (password.length < 6) { ... }
```
**Risk:** Easy password cracking, brute force attacks  
**Fix:** Enforce minimum 12 characters + complexity requirements (uppercase, number, special char)

---

### 3. **No Rate Limiting on Authentication Endpoints**
**Files:** 
- `app/api/auth/register/route.js`
- `app/api/subscription-payments/create-order/route.js`
- `app/api/send-notification/route.js`

**Risk:** Brute force attacks, credential stuffing, spam  
**Fix:** Implement rate limiting (max 5 requests per 15 minutes per IP)

---

### 4. **Admin Email Hardcoded Instead of Environment Variable**
**Files:**
- `app/api/admin/organizations/route.js:3`
- `app/api/admin/organizations/[id]/route.js:3`
- Multiple other admin routes

**Issue:**
```js
const ADMIN_EMAILS = ['rohitgarg090@gmail.com', 'info@shopos.co.in'];
```
**Risk:** Exposing admin emails in source code, can't change without redeployment  
**Fix:**
```js
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
```

---

## High Severity Vulnerabilities 🟠

### 5. **Missing Input Validation on Plan/Status Fields**
**File:** `app/api/admin/organizations/[id]/route.js:109-125`  
**Issue:** No validation on `status` and `plan` fields
```js
const { status, plan, trialDaysToAdd, notes } = await req.json();
if (status) {
  updateData.status = status;  // No validation!
}
```
**Risk:** Arbitrary status values, data corruption  
**Fix:** Whitelist allowed values
```js
const VALID_STATUSES = ['trial', 'active', 'suspended'];
const VALID_PLANS = ['starter', 'business', 'pro'];
if (status && !VALID_STATUSES.includes(status)) {
  return Response.json({ error: 'Invalid status' }, { status: 400 });
}
```

---

### 6. **No Validation on Trial Extension Duration**
**File:** `app/api/admin/organizations/[id]/route.js:138`  
**Issue:** `trialDaysToAdd` not validated
```js
if (trialDaysToAdd) {
  const newTrialEnds = new Date(currentTrialEnds.getTime() + trialDaysToAdd * 24 * 60 * 60 * 1000);
}
```
**Risk:** Negative values, extremely large values (90+ days), data corruption  
**Fix:**
```js
const MAX_TRIAL_DAYS = 30;
if (trialDaysToAdd && (trialDaysToAdd < 1 || trialDaysToAdd > MAX_TRIAL_DAYS)) {
  return Response.json({ error: 'Invalid trial days' }, { status: 400 });
}
```

---

### 7. **Weak Password Generation in Admin Panel**
**File:** `app/api/admin/organizations/route.js:22-27`  
**Issue:** Predictable password pattern
```js
const names = ['Sharma', 'Patel', 'Kumar', 'Singh', 'Verma', 'Gupta'];
const name = names[Math.floor(Math.random() * names.length)];
const num = Math.floor(1000 + Math.random() * 9000);
return `${name}@${num}`;  // e.g., "Sharma@4821"
```
**Risk:** 6000 possible passwords (6 names × 1000 numbers)  
**Fix:** Use crypto-secure random password generator
```js
const crypto = require('crypto');
const password = crypto.randomBytes(16).toString('hex'); // 32 chars, 256-bit entropy
```

---

### 8. **No Authorization Check for Firm Operations**
**File:** `app/api/send-notification/route.js` (and similar routes)  
**Issue:** User can send notifications to any firm if they know the firm ID
```js
const c = await ctx(req); // Auth user
if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// But doesn't verify user owns/manages the firm!
```
**Risk:** User can spam customers of other firms  
**Fix:** Add firm ownership check:
```js
const { data: firmMember } = await c.sb
  .from('firm_members')
  .select('role')
  .eq('firm_id', c.firmId)
  .eq('user_id', c.user.id)
  .single();

if (!firmMember || !['owner', 'manager'].includes(firmMember.role)) {
  return Response.json({ error: 'Not authorized for this firm' }, { status: 403 });
}
```

---

### 9. **Phone Number Validation Too Permissive**
**Files:**
- `app/api/whatsapp/send/route.js:45-52`
- `app/api/send-notification/route.js:16-23`

**Issue:** No length validation after cleaning
```js
let cleaned = customerNumber.replace(/[^0-9+]/g, '');
// No check if length is valid!
```
**Risk:** Sending to invalid numbers, API errors  
**Fix:**
```js
if (cleaned.replace('+', '').length < 10 || cleaned.length > 15) {
  return Response.json({ error: 'Invalid phone number' }, { status: 400 });
}
```

---

### 10. **User Input Directly in WhatsApp Messages**
**File:** `app/api/whatsapp/send/route.js:58`  
**Issue:** `firmName` not sanitized
```js
const message = `📄 *Invoice from ${firmName || 'Business'}*\n\n...`;
```
**Risk:** Message injection (though WhatsApp escapes it), HTML encoding issues  
**Fix:** Sanitize input:
```js
const sanitize = (str) => (str || '').replace(/[<>\"']/g, '');
const message = `📄 *Invoice from ${sanitize(firmName)}*\n\n...`;
```

---

### 11. **No CSRF Protection on State-Changing Operations**
**Issue:** POST/PATCH/DELETE requests don't validate CSRF tokens  
**Risk:** Cross-site request forgery attacks  
**Fix:** Add CSRF token validation (Next.js middleware or package)

---

### 12. **Detailed Error Messages Expose Database Structure**
**Files:** Multiple API routes return `error.message` directly
**Issue:**
```js
return Response.json({ error: error.message }, { status: 500 });
```
**Risk:** Leaking database schema, SQL error details to attackers  
**Fix:**
```js
console.error('Error details:', error);
return Response.json({ error: 'An error occurred' }, { status: 500 });
```

---

## Medium Severity Vulnerabilities 🟡

### 13. **No Pagination on Admin Organization List**
**File:** `app/api/admin/organizations/route.js:40-48`  
**Issue:** Returns all organizations without pagination
**Risk:** Performance issues, data exposure when loading thousands of records  
**Fix:** Implement offset/limit pagination

---

### 14. **Missing Timestamps Validation**
**Files:** Trial calculation routines  
**Risk:** Time-based race conditions, timezone issues  
**Fix:** Validate timestamps server-side, use UTC consistently

---

### 15. **No Logging of Admin Actions**
**Files:** All admin routes  
**Risk:** Audit trail missing for compliance  
**Fix:** Log all admin actions (who changed what, when)

---

### 16. **Razorpay Key Exposed in Responses**
**File:** `app/api/subscription-payments/create-order/route.js:170`  
**Issue:**
```js
return Response.json({
  orderId: razorpayOrder.id,
  keyId: RAZORPAY_KEY_ID,  // Sending public key is OK
  ...
});
```
**Risk:** Minimal (public key), but verify it's intentional  
**Status:** Low risk if it's truly public

---

### 17. **No Validation on JSON Size**
**Issue:** No limit on request body size  
**Risk:** Upload large payloads → memory exhaustion  
**Fix:** Add middleware to limit body size to 1MB max

---

### 18. **Potential SQL Injection in Custom Queries**
**Risk:** Low (using Supabase parameterized queries), but verify all queries use `.eq()` style

---

## Recommended Fixes Priority

### Phase 1 (Do Immediately) 🔴
1. Fix user lookup: Replace `listUsers()` with `getUserByEmail()`
2. Add admin email to environment variables
3. Enforce stronger password policy (12+ chars, complexity)
4. Add input validation for status, plan, trialDaysToAdd
5. Add firm ownership verification

### Phase 2 (This Week) 🟠
6. Implement rate limiting on auth/payment endpoints
7. Improve password generation for admin-created accounts
8. Add phone number length validation
9. Sanitize user input in messages
10. Add CSRF protection
11. Hide detailed error messages from responses

### Phase 3 (This Sprint) 🟡
12. Add pagination to admin endpoints
13. Implement admin action logging
14. Add request body size limits
15. Add comprehensive input validation across all endpoints
16. Review all Supabase queries for injection risks

---

## Implementation Template

Here's a helper function to use in all routes:

```js
function validateInput(data, rules) {
  const errors = {};
  
  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];
    
    if (rule.required && !value) {
      errors[field] = `${field} is required`;
    }
    if (rule.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors[field] = `${field} must be valid email`;
    }
    if (rule.minLength && value?.length < rule.minLength) {
      errors[field] = `${field} must be at least ${rule.minLength} characters`;
    }
    if (rule.allowedValues && value && !rule.allowedValues.includes(value)) {
      errors[field] = `${field} must be one of: ${rule.allowedValues.join(', ')}`;
    }
  }
  
  return Object.keys(errors).length === 0 ? null : errors;
}

// Usage:
const errors = validateInput(req.body, {
  email: { required: true, type: 'email' },
  password: { required: true, minLength: 12 },
  status: { required: true, allowedValues: ['trial', 'active', 'suspended'] }
});

if (errors) {
  return Response.json({ error: 'Validation failed', details: errors }, { status: 400 });
}
```

---

## Environment Variables Needed

Add to `.env`:
```
ADMIN_EMAILS=rohitgarg090@gmail.com,info@shopos.co.in
RATE_LIMIT_REQUESTS=5
RATE_LIMIT_WINDOW_MINUTES=15
MAX_REQUEST_BODY_SIZE=1000000
MIN_PASSWORD_LENGTH=12
```

---

## Testing Checklist

- [ ] Try registering with 5-character password (should fail)
- [ ] Try changing org status to invalid value (should fail)
- [ ] Try extending trial by -999 days (should fail)
- [ ] Try sending SMS to invalid phone number (should fail)
- [ ] Try accessing admin routes with non-admin email (should fail)
- [ ] Try accessing another user's firm data (should fail)
- [ ] Send 10 registration requests from same IP in 30 seconds (should rate limit)

---

**Next Steps:** Review each section and prioritize fixes. Start with Critical vulnerabilities immediately.
