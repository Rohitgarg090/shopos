# CA Partner Module Phase 2 Plan

## Overview
Enhance CA Partner functionality with reconciliation, compliance tracking, and liability estimation tools.

**Duration**: 2-3 weeks | **Risk Level**: Low (builds on Phase 1)

---

## Phase 2 Features

### 1. GSTR-2B Reconciliation
**Goal**: Match supplier invoices against GST return data to identify discrepancies

**Components**:
- Upload GSTR-2B Excel file
- Parse and extract: Invoice #, Supplier GSTIN, Amount, ITC claimed
- Match against CA's purchase register
- Show reconciliation status: ✅ Matched, ⚠️ Amount Mismatch, ❌ Missing, 🔍 Awaiting Invoice

**Database Changes**:
```sql
CREATE TABLE ca_gstr2b_uploads (
  id uuid PRIMARY KEY,
  ca_id uuid REFERENCES ca_partners(id),
  firm_id uuid REFERENCES firms(id),
  file_name text,
  upload_date timestamptz,
  total_records int,
  matched_count int,
  unmatched_count int,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE ca_gstr2b_records (
  id uuid PRIMARY KEY,
  upload_id uuid REFERENCES ca_gstr2b_uploads(id),
  invoice_no text,
  supplier_gstin text,
  supplier_name text,
  invoice_date date,
  amount numeric,
  itc_claimed numeric,
  matched_bill_id int REFERENCES bills(id),
  match_status text, -- matched, amount_mismatch, missing
  discrepancy_notes text,
  created_at timestamptz DEFAULT now()
);
```

**APIs**:
- `POST /api/ca/gstr2b/upload` - Upload GSTR-2B Excel
- `GET /api/ca/gstr2b/reconciliation?firm_id=...` - Get reconciliation status
- `PATCH /api/ca/gstr2b/records/:id` - Mark as reviewed/resolved
- `DELETE /api/ca/gstr2b/uploads/:id` - Delete upload

**UI** (CA Dashboard):
- New tab: "GSTR-2B Reconciliation"
- File upload input
- Reconciliation table showing status for each GSTR-2B record
- Filter: Matched / Unmatched / Amount Mismatch
- Action buttons: Mark as reviewed, Add note

**Logic**:
1. Parse Excel file (columns: Invoice #, Supplier GSTIN, Amount, ITC)
2. Match with bills: invoice_no + supplier_gstin
3. Validate amount matches (within ±2% tolerance)
4. Mark status and show discrepancies

---

### 2. Compliance Calendar
**Goal**: Show GST filing deadlines and compliance dates for firm

**Components**:
- Pre-populated calendar with GST deadlines
- Configurable reminder dates
- Status tracking: Not Started, In Progress, Completed, Missed

**Database Changes**:
```sql
CREATE TABLE ca_compliance_deadlines (
  id uuid PRIMARY KEY,
  firm_id uuid REFERENCES firms(id),
  deadline_type text, -- gstr1, gstr2b, gstr3b, itc04, gstr5, gstr6, monthly_return
  month_year text, -- YYYY-MM format
  due_date date,
  reminder_date date,
  status text DEFAULT 'not_started', -- not_started, in_progress, completed, missed
  notes text,
  created_at timestamptz DEFAULT now()
);
```

**Pre-populated Deadlines** (for India GST):
- GSTR-1: 11th of next month (sales)
- GSTR-2B: 12th of next month (purchases, auto-generated)
- GSTR-3B: 20th of next month (summary)
- ITC04: 30th (input credit notice)
- Quarterly: 21st of next month

**APIs**:
- `GET /api/ca/compliance-calendar?firm_id=...&month=...` - Get deadlines for period
- `PATCH /api/ca/compliance-calendar/:id` - Update status/notes
- `POST /api/ca/compliance-calendar/reminders` - Send bulk reminders

**UI** (CA Dashboard):
- New tab: "Compliance Calendar"
- Month/Year selector
- Calendar view showing:
  - 🟢 Completed (green)
  - 🟡 In Progress (yellow)
  - 🔴 Missed (red)
  - ⚪ Not Started (grey)
- Click deadline → modal with notes/status/reminders
- Bulk reminder option for selected deadlines

---

### 3. Estimated GST Liability
**Goal**: Project GST liability based on invoices and margins

**Components**:
- Monthly/Quarterly/Annual GST calculation
- Show: Output GST, Input GST, Net GST Payable
- Breakdown by GST rate (0%, 5%, 12%, 18%, 28%)
- Compare with GSTR-3B filed amount

**Database Changes**: None needed (calculate on-the-fly from bills table)

**APIs**:
- `GET /api/ca/gst-liability?firm_id=...&period=month|quarter|year&month=...` - Calculate liability
- Returns: {outputGST, inputGST, netPayable, breakdown: {0: {...}, 5: {...}, ...}, margin: %}

**Calculation Logic**:
```
For period:
  Output GST = SUM(bill.gst) where bill.type = 'sales'
  Input GST = SUM(bill.gst) where bill.type = 'purchase'
  Net GST = Output GST - Input GST
  
  If Net GST > 0: Payable (firm owes)
  If Net GST < 0: Refund (firm gets back)
```

**UI** (CA Dashboard):
- New tab: "GST Liability"
- Period selector: Monthly / Quarterly / Annual
- Date range selector
- Cards showing:
  - Output GST (sales tax)
  - Input GST (purchase tax)
  - Net GST Payable/Refund (prominent, color-coded)
- Table breakdown by GST rate
- Margin analysis (if applicable)
- Export as PDF option

---

### 4. CA Annotations on Bills (Enhanced)
**Goal**: Allow CA to add compliance notes on bills

**Status**: Database table exists (ca_annotations), UI not yet implemented

**Database**: Already exists
```sql
CREATE TABLE ca_annotations (
  id uuid PRIMARY KEY,
  ca_id uuid REFERENCES ca_partners(id),
  firm_id uuid REFERENCES firms(id),
  bill_id int REFERENCES bills(id),
  annotation text,
  tag text, -- compliance_issue, itc_ineligible, missing_gstin, etc.
  status text DEFAULT 'open', -- open, resolved
  created_at timestamptz DEFAULT now()
);
```

**APIs**:
- `POST /api/ca/annotations` - Add note to bill
- `GET /api/ca/annotations?firm_id=...` - Get all annotations
- `PATCH /api/ca/annotations/:id` - Update/resolve annotation
- `DELETE /api/ca/annotations/:id` - Delete annotation

**UI**:
- Add "Notes" button to each bill in CA purchase register export
- Modal: Add CA annotation with tag (dropdown)
- Show annotations in bill detail view
- Filter annotations by status/tag

---

## Implementation Order (Dependency-based)

### Week 1: Foundation
1. **CA Annotations UI** (database exists, just add UI)
   - Time: 2-3 days
   - Risk: Very Low
   - Blockers: None

2. **Compliance Calendar** (no complex logic)
   - Time: 2-3 days
   - Risk: Low
   - Blockers: None

### Week 2: Core Logic
3. **Estimated GST Liability** (calculation only, no new tables)
   - Time: 2-3 days
   - Risk: Low
   - Blockers: None

### Week 3: Integration
4. **GSTR-2B Reconciliation** (most complex, depends on above)
   - Time: 3-4 days
   - Risk: Medium (Excel parsing, matching logic)
   - Blockers: None

---

## Testing Plan

### Unit Tests
- GST calculation logic (various rates, periods)
- GSTR-2B matching algorithm (invoice match, amount tolerance)
- Date calculations (deadlines, reminders)

### Integration Tests
- End-to-end GSTR-2B upload and reconciliation
- Compliance deadline creation and reminders
- GST liability calculation vs actual GSTR-3B

### Manual Testing (Checklist)
- [ ] Upload sample GSTR-2B Excel
- [ ] Verify matching works correctly
- [ ] Check compliance calendar displays correctly
- [ ] Verify GST calculations match manual calculation
- [ ] Test annotations on bills
- [ ] Test reminder emails/WhatsApp
- [ ] No breakage of Phase 1 features

---

## Risk Mitigation

### Database
- ✅ New tables only (no modifications to existing)
- ✅ RLS policies for CA access control
- ✅ Migrations are additive, reversible

### APIs
- ✅ New endpoints only (no modifications to existing)
- ✅ Follow existing auth patterns
- ✅ Test with Postman before UI integration

### UI
- ✅ New tabs only (no modifications to existing CA dashboard)
- ✅ Mobile-responsive design
- ✅ Test on mobile and desktop

### Rollback Plan
If issues arise:
1. Disable new tabs in CA dashboard (frontend)
2. New APIs stay dormant (no callers)
3. New database tables remain (no harm, no dependencies)
4. Full rollback: drop new tables, remove new endpoints

---

## Success Criteria

✅ CA Partner Phase 2 complete when:
1. GSTR-2B reconciliation working (upload, match, show status)
2. Compliance calendar showing GST deadlines
3. GST liability calculations accurate
4. Annotations UI functional
5. All Phase 1 features still working
6. No new bugs introduced
7. Mobile responsive
8. <2% of test cases failing

---

## Post-Phase-2 (Future)
- GSTR-2B API integration (auto-fetch from GST portal)
- ITC reconciliation (GSTR-4, GSTR-6)
- GST credit utilization analysis
- Estimated vs Actual liability tracking
- Compliance violation alerts

