# e-Invoice Integration Testing Guide

## Overview
Complete testing guide for Phase 1, 2, and 3 e-Invoice features with Sandbox API integration.

---

## Phase 1: Core e-Invoice Generation

### Test 1.1: Generate e-Invoice
**Steps:**
1. Go to **Bills** section
2. Find a bill you want to generate e-Invoice for
3. Click on the bill to view details
4. Scroll to e-Invoice section
5. Click "📄 Generate e-Invoice" button
4. Verify:
   - ✅ Button changes to "⏳ Generating e-Invoice..." (loading state)
   - ✅ After 2-3 seconds, IRN appears in success message
   - ✅ Status badge shows "✅ Generated"
   - ✅ IRN displays in large font (e.g., "123456789012A1Z5")
   - ✅ ACK# shows (if available)
   - ✅ No error message displayed

**Expected Output:**
```
✅ e-Invoice generated! IRN: 123456789012A1Z5
Status: Generated
```

**Failed Test Indicators:**
- Red error message appears
- Button stays in loading state > 5 seconds
- IRN field is blank
- Console shows "Failed to run sql query" error

---

### Test 1.2: QR Code Generation
**Steps:**
1. After successful e-Invoice generation
2. Look for QR code section
3. Verify:
   - ✅ QR code image displays
   - ✅ Image is square and centered
   - ✅ "📥 Download QR Code" button appears
4. Click "📥 Download QR Code"
5. Verify:
   - ✅ Browser downloads `einvoice-qr-{billNo}.png` file
   - ✅ File opens correctly in image viewer
   - ✅ QR code is readable by scanner app

**Test QR Code:**
- Use phone camera or QR scanner app
- Scan the downloaded QR code
- Should contain e-Invoice data

---

### Test 1.3: Error Handling
**Steps:**
1. Try generating e-Invoice without firm GSTIN:
   - Go to firm settings and clear GSTIN field
   - Try to generate e-Invoice
   - Verify: ✅ Error message: "Firm GSTIN not configured"

2. Try generating with invalid credentials:
   - Disconnect from internet
   - Try to generate
   - Verify: ✅ Error message appears

**Expected Errors:**
- "Firm GSTIN not configured" → Configure in firm settings
- "Firm not found" → Contact support
- "Failed to generate e-Invoice from Sandbox" → Check internet & Sandbox API

---

## Phase 2: e-Invoice Workflow

### Test 2.1: View Details
**Steps:**
1. Go to **Bills** section
2. Open a bill that has an e-Invoice (shows status "✅ Generated")
3. Click "📋 View Details" button on the e-Invoice section
4. Verify modal opens with:
   - ✅ QR code display (large, centered)
   - ✅ Invoice number, date, IRN, ACK#
   - ✅ Buyer details (name, GSTIN, email, mobile)
   - ✅ Signed JSON preview
   - ✅ Timeline (generated date/time)
   - ✅ Close button (×) in top-right

3. Click "📥 Download Signed JSON"
4. Verify:
   - ✅ Browser downloads `einvoice-{IRN}.json`
   - ✅ JSON file contains valid invoice data
   - ✅ File is readable and parseable

---

### Test 2.2: Print e-Invoice
**Steps:**
1. Click "🖨️ Print" button
2. Verify:
   - ✅ Print dialog opens
   - ✅ Preview shows invoice with QR code
   - ✅ Print to PDF option available
3. Print or save as PDF
4. Verify PDF contains:
   - ✅ Invoice details
   - ✅ QR code visible and scannable
   - ✅ All customer information

---

### Test 2.3: Cancel e-Invoice
**Steps:**
1. Click "❌ Cancel" button on e-Invoice
2. Verify:
   - ✅ Confirmation dialog appears: "Are you sure you want to cancel this e-Invoice?"
3. Click "OK" (or "Cancel" to abort)
4. If confirmed:
   - ✅ Button changes to "⏳ Cancelling..."
   - ✅ After 2-3 seconds, status changes to "❌ Cancelled"
   - ✅ IRN still visible but status badge shows "❌ Cancelled"
   - ✅ Action buttons disappear or become disabled
5. Refresh page
   - ✅ Status persists as "Cancelled"

**Failed Test Indicators:**
- Confirmation dialog doesn't appear
- Cancel request hangs > 5 seconds
- Status doesn't update
- Error message: "Cannot sync cancelled e-Invoice"

---

### Test 2.4: Modal Edge Cases
**Steps:**
1. Open details modal
2. Scroll through entire modal
   - ✅ All sections visible and readable
   - ✅ No overlapping text
3. Click close button (×)
   - ✅ Modal closes smoothly
4. Click anywhere outside modal
   - ✅ Modal closes (if implemented)

---

## Phase 3: Auto-Sync Integration

### Test 3.1: Sync to GSTR-1
**Steps:**
1. Click "Sync to GSTR-1" button (if visible in UI)
2. Verify:
   - ✅ API call succeeds to `/api/einvoice/[id]/sync-gstr1`
   - ✅ Response includes: `synced_to_gstr1: true`
   - ✅ Success message: "e-Invoice synced to GSTR-1 successfully"
3. Try syncing again:
   - ✅ System prevents duplicate sync (or skips silently)

**Validate GSTR-1 Sync Data:**
```
Expected data sent to Sandbox:
{
  "irn": "123456789012A1Z5",
  "invoice_number": "INV-001",
  "invoice_date": "2026-06-24",
  "buyer_gstin": "27AABCT1234H2Z1",
  "total_taxable_value": 10000,
  "total_tax": 1800,
  "total_invoice_value": 11800
}
```

---

### Test 3.2: Sync to e-Way Bill
**Steps:**
1. Click "Sync to e-Way Bill" button (if visible in UI)
2. Fill e-Way Bill details:
   - Mode of transport: ROAD (default)
   - Vehicle number: (e.g., "KA01AB1234")
   - Transporter ID: (optional)
3. Click "Generate e-Way Bill"
4. Verify:
   - ✅ API call succeeds to `/api/einvoice/[id]/sync-ewb`
   - ✅ Response includes e-Way Bill number
   - ✅ Success message: "e-Way Bill generated successfully"
5. Verify database update:
   - ✅ `synced_to_ewb: true` in e_invoices table

---

### Test 3.3: Batch Sync Operations
**Steps:**
1. Select multiple e-invoices (checkbox feature, if implemented)
2. Click "Batch Sync" dropdown
3. Choose sync type:
   - GSTR-1
   - e-Way Bill
   - GST System
4. Click "Sync All"
5. Verify response:
   ```
   {
     "success": true,
     "syncType": "gstr1",
     "results": {
       "successful": [
         {"id": "...", "message": "Synced successfully"}
       ],
       "failed": [],
       "skipped": [
         {"id": "...", "reason": "Already synced to GSTR1"}
       ]
     },
     "summary": {
       "total": 5,
       "successful": 4,
       "failed": 0,
       "skipped": 1
     }
   }
   ```

---

## Integration Testing

### Test I.1: Complete e-Invoice Workflow
**Scenario:** Create invoice in POS → Go to Bills → Generate e-Invoice → Print → Sync to GSTR-1 → Cancel

**Steps:**
1. Create new bill/invoice in **POS/Sell** section
   - ✅ Bill created and saved
2. Go to **Bills** section
   - ✅ Find your newly created bill in the list
3. Click on bill to view details
   - ✅ Bill details display
4. Generate e-Invoice
   - ✅ IRN generated
5. View Details
   - ✅ All data visible in modal
6. Print
   - ✅ PDF generates with QR
7. Sync to GSTR-1
   - ✅ Sync succeeds
8. Cancel (to test cancellation)
   - ✅ Status changes to Cancelled
9. Verify in database:
   - ✅ e_invoices row has irn, status='cancelled', synced_to_gstr1=true

---

### Test I.2: Multiple Invoices
**Steps:**
1. In POS/Sell, create 3 different bills
2. Go to Bills section
3. For each bill, generate e-Invoice
   - ✅ All 3 generate with unique IRNs
4. Open 1st bill and cancel its e-Invoice
   - ✅ Only 1st shows "❌ Cancelled"
5. View 2nd and 3rd bills
   - ✅ Still show "✅ Generated" status
6. Batch sync 2nd and 3rd e-Invoices to GSTR-1
   - ✅ Both succeed
7. Try syncing 1st (cancelled) e-Invoice to GSTR-1
   - ✅ Error: "Cannot sync cancelled e-Invoice"

---

## Database Validation

### Check 1: e_invoices Table
```sql
SELECT * FROM e_invoices WHERE firm_id = '{{firmId}}' ORDER BY created_at DESC LIMIT 10;

Expected columns:
- id (uuid)
- firm_id (uuid)
- bill_id (integer)
- irn (text, unique)
- ack_no (text)
- signed_invoice_json (text)
- qr_code_url (text)
- status (enum: generated, cancelled, rejected, pending)
- synced_to_gstr1 (boolean)
- synced_to_ewb (boolean)
- synced_to_gst (boolean)
- generated_at (timestamp)
- cancelled_at (timestamp)
- created_at (timestamp)
```

---

### Check 2: RLS Policies
```sql
-- Verify RLS is NOT enabled (access control via API)
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'e_invoices';

Expected result: relrowsecurity = false
(RLS disabled, access control at API layer)
```

---

## API Testing (Postman / curl)

### Test A.1: Generate e-Invoice
```bash
curl -X POST http://localhost:3000/api/einvoice/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "firmId": "firm-uuid-here",
    "billId": 123
  }'

Expected response (200):
{
  "success": true,
  "eInvoice": {
    "id": "uuid",
    "irn": "123456789012A1Z5",
    "ack_no": "12345678",
    "qr_code_url": "https://...",
    "status": "generated"
  },
  "message": "e-Invoice generated successfully. IRN: 123456789012A1Z5"
}
```

### Test A.2: Get e-Invoice Details
```bash
curl -X GET http://localhost:3000/api/einvoice/[id]/details \
  -H "Authorization: Bearer YOUR_TOKEN"

Expected response (200):
{
  "eInvoice": {...},
  "bill": {...},
  "customer": {...},
  "signedJSON": {...}
}
```

### Test A.3: Cancel e-Invoice
```bash
curl -X POST http://localhost:3000/api/einvoice/[id]/cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"reason": "Cancelled per user request"}'

Expected response (200):
{
  "success": true,
  "eInvoice": {"status": "cancelled", ...},
  "message": "e-Invoice cancelled successfully"
}
```

---

## Sandbox API Integration Testing

### Check S.1: API Credentials
Verify Vercel environment variables are set:
```bash
# In terminal (not committed to repo):
echo $SANDBOX_API_KEY
echo $SANDBOX_API_SECRET
echo $SANDBOX_ENV

# Should output actual values (not empty)
```

### Check S.2: Sandbox API Response Format
1. Generate e-Invoice and capture network request:
   - Open browser DevTools → Network tab
   - Click "Generate e-Invoice"
   - Find `POST /api/einvoice/generate` request
   - Check Response tab
   - Verify JSON structure matches expected format

2. Check Sandbox API call status:
   - Look for nested requests to `api.sandbox.co.in` or `api-sandbox.sandbox.co.in`
   - Verify status 200 (success)
   - Check response time < 5 seconds

---

## Performance Testing

### Test P.1: Load Time
**Steps:**
1. Open invoice page with e-Invoice section
2. Measure initial load:
   - ✅ Page renders in < 2 seconds
   - ✅ e-Invoice button visible in < 3 seconds
3. Click "Generate e-Invoice"
   - ✅ Request completes in < 5 seconds
   - ✅ Response received before loading state expires

### Test P.2: Batch Operations
**Steps:**
1. Create 20 e-invoices
2. Run batch sync for all 20
3. Measure:
   - ✅ Batch completes in < 30 seconds
   - ✅ No timeouts
   - ✅ All 20 processed

---

## Edge Cases

### Test E.1: Cancelled Invoice
**Steps:**
1. Generate e-Invoice
2. Cancel it
3. Try all actions:
   - ✅ View Details: Works (shows cancelled status)
   - ✅ Print: Works (shows "CANCELLED" watermark)
   - ✅ Download QR: Works (shows old QR)
   - ✅ Sync to GSTR-1: Error "Cannot sync cancelled e-Invoice"

### Test E.2: Missing Data
**Steps:**
1. Try generating e-Invoice for bill with:
   - No customer assigned: ✅ Error "Customer not found"
   - No items: ✅ Error or warning "No items in bill"
   - No GSTIN: ✅ Can proceed (marks buyer_gstin as empty)

### Test E.3: Duplicate Generation
**Steps:**
1. Generate e-Invoice once
   - ✅ Success
2. Click "Generate e-Invoice" again
   - ✅ Shows existing e-Invoice instead of generating new one
   - OR ✅ Prevents duplicate with error "e-Invoice already exists"

---

## Rollback Testing

### Test R.1: Revert Sync
**Steps:**
1. Sync e-Invoice to GSTR-1
   - ✅ synced_to_gstr1 = true
2. Cancel e-Invoice
   - ✅ synced_to_gstr1 remains true (shows it was synced before cancel)
3. Create new e-Invoice
   - ✅ Can generate and sync independently

---

## Success Criteria

✅ **Phase 1**: All e-invoices generate with unique IRNs, QR codes download correctly, errors handled gracefully

✅ **Phase 2**: Details modal displays complete information, print works, cancellation updates status

✅ **Phase 3**: Sync to GSTR-1 succeeds, e-Way Bill generation works, batch operations process multiple items

✅ **Integration**: Complete workflow from generation → sync → cancel works seamlessly

✅ **Performance**: All operations complete within acceptable timeframes

✅ **Edge Cases**: Graceful handling of missing data, duplicates, and invalid operations

---

## Known Limitations & TODOs

- [ ] Batch UI selection checkboxes not yet implemented (API ready)
- [ ] Auto-sync scheduling not implemented (API structure ready)
- [ ] GST System sync not implemented (endpoint structure ready)
- [ ] Webhook notifications for sync completion not implemented

---

## Contacts & Support

- **Sandbox API Docs**: https://developer.sandbox.co.in/
- **Sandbox Support**: support@sandbox.co.in
- **Internal Testing**: test@shopos.com

---

## Test Checklist Summary

```
Phase 1: Core Generation
  [ ] Generate e-Invoice
  [ ] Download QR Code
  [ ] Error handling

Phase 2: Workflow  
  [ ] View Details modal
  [ ] Print invoice
  [ ] Cancel e-Invoice
  [ ] Download Signed JSON

Phase 3: Auto-Sync
  [ ] Sync to GSTR-1
  [ ] Sync to e-Way Bill
  [ ] Batch sync operations

Integration
  [ ] Complete workflow
  [ ] Multiple invoices
  [ ] Database validation

Performance
  [ ] Load time < 2s
  [ ] Generate time < 5s
  [ ] Batch sync < 30s

Edge Cases
  [ ] Cancelled invoice handling
  [ ] Missing data validation
  [ ] Duplicate prevention
```

---

**Last Updated**: 2026-06-24
**Status**: Phase 3 Complete - Ready for Testing
