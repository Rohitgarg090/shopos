# ShopOS — CA Partner Module: Phase 1 Implementation Plan

**Status**: Ready for implementation  
**Phase**: 1 (MVP)  
**Timeline**: 2 weeks  
**Owner**: Claude Code

---

## 🎯 Phase 1 Scope (MVP)

### What ships in Phase 1
1. ✅ CA Partner login (separate auth, role-based access)
2. ✅ CA Client Dashboard (grid of all linked clients with status indicators)
3. ✅ Purchase Register Export (GST-ready CSV format)
4. ✅ Bulk WhatsApp Reminders (select multiple clients → send)

### What does NOT ship in Phase 1
- ❌ GSTR-2B reconciliation (Phase 2)
- ❌ Compliance calendar (Phase 2)
- ❌ GST liability estimation (Phase 2)
- ❌ GSTIN validator (Phase 3)
- ❌ CA annotations (Phase 3)
- ❌ Document inbox (Phase 3)
- ❌ Commission tracking (Business ops, later)

---

## 📊 Database Schema Changes

### New Tables

#### 1. `ca_partners` table
```sql
create table ca_partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null,
  firm_name text,
  gstin text,
  pan text,
  address text,
  city text,
  state text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(email),
  unique(phone)
);
-- RLS: CA can only see/edit their own profile
```

#### 2. `ca_client_links` table
```sql
create table ca_client_links (
  id uuid primary key default gen_random_uuid(),
  ca_id uuid not null references ca_partners(id) on delete cascade,
  firm_id uuid not null references firms(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  created_by uuid references auth.users(id),  -- shop owner who sent invite
  unique(ca_id, firm_id)
);
-- RLS: CA sees only their own links; shop owner sees links they created
```

#### 3. `ca_annotations` table (for Phase 3, but define schema now)
```sql
create table ca_annotations (
  id uuid primary key default gen_random_uuid(),
  ca_id uuid not null references ca_partners(id) on delete cascade,
  firm_id uuid not null references firms(id) on delete cascade,
  bill_id uuid not null references bills(id) on delete cascade,
  annotation text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
-- RLS: CA sees own annotations; shop owner sees annotations from linked CA
```

### Schema Updates to Existing Tables

#### `products` table
```sql
-- ADD if not exists:
alter table products add column gst_rate integer default 18 check (gst_rate in (0, 5, 12, 18, 28));
```

---

## 🔐 Authentication & Authorization

### CA Registration Flow
1. **Sign up page for CA** (`/auth/ca-signup`)
   - Email, phone, password, name, firm name (optional), GSTIN (optional), PAN (optional)
   - Create `ca_partners` record + auth user
   - Set user role = 'ca_partner' in auth metadata

2. **Login** (`/auth/login`)
   - Check if user role = 'ca_partner'
   - If yes, redirect to `/ca/dashboard`
   - If no (shop owner), redirect to existing ShopOS app

### CA-Shop Owner Linking
1. **Shop owner invites CA** (in Settings → CA Management)
   - Enter CA phone or email
   - Check if CA exists in `ca_partners` table
   - Create `ca_client_links` record with status='pending'
   - Send notification to CA (in-app + WhatsApp/email)

2. **CA accepts/rejects** (notification link or CA dashboard)
   - Tap "Accept" or "Reject" in notification
   - Update `ca_client_links` status + accepted_at
   - CA now sees firm in dashboard

### Row Level Security (RLS)

#### `ca_client_links` policy
```sql
-- CA sees only their own links
create policy "ca_sees_own_links" on ca_client_links
  for select using (ca_id = (
    select id from ca_partners where user_id = auth.uid()
  ));

-- Shop owner sees links they created
create policy "owner_sees_own_invites" on ca_client_links
  for select using (created_by = auth.uid());
```

#### `ca_partners` policy
```sql
-- CA sees only their own profile
create policy "ca_sees_own_profile" on ca_partners
  for select using (user_id = auth.uid());
```

---

## 🎨 CA Dashboard Design

### URL Structure
```
/ca                      → Redirect to /ca/dashboard
/ca/dashboard            → Main dashboard (bulk view)
/ca/clients/:firmId      → Client detail (purchases, status, actions)
/ca/exports              → Export history (audit trail)
```

### Dashboard Grid Layout

**Header**
```
CA Name | Month/Year Selector | Filter by Status | Bulk Actions
```

**Client Grid** (responsive: 1 col mobile, 2-3 cols tablet, 4 cols desktop)
```
Each card shows:
- Client name (shop name or GSTIN)
- This month: Sales count | Purchases count
- Last invoice date (if any)
- Status indicator (🟢 Green | 🟡 Amber | 🔴 Red)
- Checkbox (for bulk selection)
- Quick actions: [View Details] [Export] [Remind]

Color-coded by status:
🟢 Green   → White card, green border
🟡 Amber   → White card, orange border  
🔴 Red     → White card, red border
```

### Bulk Actions Bar (sticky at bottom on mobile)
```
[Select All] [Clear] | Action: [Export] [Send Reminder] [View Selected]
Visible only if 1+ clients selected
```

### Client Detail View

**Client Info Section**
```
GSTIN | Shop Name | Phone | Email | Firm Type
```

**Month Selector**
```
Previous Month | [June 2026] | Next Month
```

**Status Summary**
```
Sales This Month: 42 invoices | Total: Rs. 2,45,000
Purchases This Month: 28 invoices | Total: Rs. 1,05,000
Status: 🟡 Amber (last entry 6 days ago)
```

**Quick Actions**
```
[📊 View Bills] [📦 View Purchases] [💾 Export] [📱 Send Reminder]
```

---

## 📄 Purchase Register Export (GST-Ready Format)

### CSV Columns (in order)
```
Invoice Date | Invoice Number | Supplier Name | Supplier GSTIN | 
Taxable Value | IGST | CGST | SGST | Total GST | Total Amount | HSN Code | Description
```

### Logic
1. Fetch all purchase bills for selected client + month
2. For each bill:
   - If bill contains line items → sum by HSN code
   - If bill is flat rate → use bill rate as line item
3. For each line item:
   - Taxable Value = (item.rate * item.qty)
   - GST amount = (taxable value * gst_rate / 100)
   - If intra-state (default): CGST = SGST = GST / 2, IGST = 0
   - If inter-state: IGST = GST, CGST = SGST = 0 (for Phase 2)
4. Generate CSV, offer download

### Export API
```
POST /api/ca/export-purchase-register
Body: {
  caId: uuid,
  firmId: uuid,
  month: "2026-06",  // YYYY-MM format
  format: "csv" | "excel"  // csv for Phase 1
}
Response: File download
```

---

## 📱 Bulk WhatsApp Reminders

### UI Flow
1. **Select clients** on dashboard (checkboxes)
2. **Tap "Send Reminder"** button
3. **Modal opens**:
   - Shows selected client count
   - Pre-filled message template:
     ```
     Hi [ClientName],
     
     Please update your invoices in Shopos before [DueDate] 
     so your GST return can be filed on time.
     
     Data checked: Sales [✓/✗] | Purchases [✓/✗]
     
     [https://shopos.app/client-dashboard link]
     
     Questions? Reply to this message or contact your accountant.
     ```
   - Option to customize message
   - Preview of which clients will receive
   - Confirm button

4. **Send** (bulk API call)
5. **Confirmation** shows: X messages sent, list of recipients

### Bulk Reminder API
```
POST /api/ca/send-bulk-reminders
Body: {
  caId: uuid,
  firmIds: [uuid, uuid, ...],  // multiple firms OR
  clientIds: [uuid, uuid, ...], // multiple clients
  messageTemplate: string,
  dueDate: "2026-06-20",
  sendVia: "whatsapp" | "email" | "both"
}
Response: {
  success: true,
  sent: 12,
  failed: 0,
  failureDetails: []
}
```

### Logic
1. Validate CA has access to all selected clients
2. For each client:
   - Get shop owner's phone/email
   - Send via Twilio/email service
   - Log attempt + result in `ca_reminder_logs` table (new, for audit)
3. Return aggregate success/failure count

---

## 🗄️ Data Access Permissions

### CA Can See
- ✅ All linked clients' purchase bills
- ✅ All linked clients' sales bills (read-only, summary only)
- ✅ All linked clients' product list (read-only)
- ✅ All linked clients' customer list (read-only)
- ❌ All linked clients' payment records (not in Phase 1)
- ❌ All linked clients' settings (not in Phase 1)

### API Middleware Check (every CA API endpoint)
```
1. Get CA ID from auth token
2. Get firm ID from request
3. Query: does this CA have accepted link to this firm?
4. If yes, proceed. If no, return 403 Forbidden.
```

---

## 📋 API Routes Summary (Phase 1)

### Authentication
```
POST /api/ca/auth/signup          → Create CA partner account
POST /api/ca/auth/login           → Login (reuses existing)
GET  /api/ca/auth/me              → Get current CA profile
```

### CA Client Links (Invitations)
```
POST /api/ca/links/invite         → Shop owner invites CA
GET  /api/ca/links                → CA sees all pending/accepted links
PATCH /api/ca/links/:id           → CA accepts/rejects invite
GET  /api/ca/links/:firmId        → Get link status for firm
```

### CA Dashboard
```
GET /api/ca/dashboard             → Get all linked clients + status
GET /api/ca/clients/:firmId       → Get single client detail + month data
GET /api/ca/clients/:firmId/status → Status indicator data
```

### Purchase Register Export
```
POST /api/ca/export-purchase-register → Download CSV
GET  /api/ca/exports              → List previous exports (for audit)
```

### Bulk WhatsApp Reminders
```
POST /api/ca/send-bulk-reminders  → Send to multiple clients
GET  /api/ca/reminder-logs        → Get history of sent reminders
```

---

## 🎯 Implementation Steps (Week-by-Week)

### Week 1

**Day 1-2: Database Setup**
- [ ] Create `ca_partners` table + RLS
- [ ] Create `ca_client_links` table + RLS  
- [ ] Create `ca_annotations` table (schema only, no UI)
- [ ] Add `gst_rate` to `products` table
- [ ] Create `ca_reminder_logs` table (audit trail)
- [ ] Deploy migration

**Day 3-4: CA Authentication**
- [ ] Create `/ca/auth/signup` page
- [ ] Create `/ca/auth/login` page (conditional redirect)
- [ ] Create CA partner signup API route
- [ ] Implement JWT role-based access control
- [ ] Test CA login flow

**Day 5: CA-Shop Owner Linking**
- [ ] Add "CA Management" section to Shop Owner Settings
- [ ] Create CA invite flow (enter email/phone, send invite)
- [ ] Create CA notification system (in-app alert)
- [ ] Create accept/reject API
- [ ] Test linking workflow

### Week 2

**Day 6-7: CA Dashboard**
- [ ] Design CA dashboard grid layout (responsive)
- [ ] Create `/ca/dashboard` page
- [ ] Implement client status indicator logic (🟢🟡🔴)
- [ ] Create bulk checkbox selection
- [ ] Implement month/year selector
- [ ] Test on mobile and desktop

**Day 8-9: Export & Reminders**
- [ ] Create Purchase Register export API
- [ ] Create CSV generator (correct GST format)
- [ ] Test export with real data
- [ ] Create Bulk Reminder modal UI
- [ ] Implement reminder sending API
- [ ] Test reminder delivery

**Day 10: Testing & Polish**
- [ ] End-to-end testing (signup → invite → link → dashboard → export → remind)
- [ ] Mobile responsiveness check
- [ ] Error handling and validation
- [ ] Documentation
- [ ] Deploy to staging/production

---

## ✅ Success Criteria

**CA can:**
- [ ] Sign up as CA partner
- [ ] Receive invite from shop owner (WhatsApp notification)
- [ ] Accept invite and gain access to firm
- [ ] See dashboard with all linked clients in one view
- [ ] Identify status of each client (green/amber/red)
- [ ] Export purchase register for any client + month in GST-ready format
- [ ] Send WhatsApp reminder to multiple clients at once with 1 click
- [ ] See export history (audit trail)

**Shop owner can:**
- [ ] Find and invite CA by email/phone
- [ ] See which CA has access to their firm
- [ ] Revoke CA access (Phase 1.5)
- [ ] Cannot see CA's notes/annotations (Phase 3 feature)

---

## 🚀 Phase 2 Roadmap (after Phase 1 ships & gets CA feedback)

1. GSTR-2B reconciliation (upload JSON → compare → color-coded results)
2. Compliance calendar (show deadlines for all clients)
3. Estimated GST liability (show gross GST owed, daily update)
4. Support for multi-state businesses (IGST calculation)

---

## 🔄 Dependencies & Blockers

**Blockers**: None  
**Dependencies**: 
- Existing Supabase setup (firm, bills, products tables)
- Existing WhatsApp/email infrastructure (for reminders)
- Existing auth system (JWT, role management)

**Nice-to-haves for Phase 1**:
- Email invite as backup to WhatsApp (Phase 1.5)
- Remind CA of pending invites (Phase 1.5)
- Revoke CA access UI (Phase 1.5)

---

## 📝 Notes for Developers

1. **Bulk is the UX principle**: Every screen shows ALL clients by default, not one at a time.
2. **CA dashboard should load in <2 seconds** even with 80+ clients.
3. **Status indicators are simple**: 🟢 = invoices exist, 🟡 = stale, 🔴 = missing. No complex rules.
4. **Export format is GST-compliant**: Verify with a real CA before shipping.
5. **WhatsApp sender ID**: Make sure CA's phone number shows, not Shopos generic number.
6. **RLS is critical**: CA can ONLY see their linked clients. Test edge cases (firm access after revoke, etc).

---

## 🎬 Ready to Start?

**Approval needed on:**
- [ ] Database schema (confirm all tables/fields)
- [ ] API route structure (confirm endpoints)
- [ ] CA dashboard design (confirm layout)
- [ ] Status indicator logic (confirm thresholds)
- [ ] GST export format (confirm column order)

Once approved, implementation can begin immediately.
