# ShopOS — Wholesale Clothing POS v3.0
> Complete feature list + step-by-step deployment guide

---

## ✅ COMPLETE FEATURE LIST

### 🔐 Authentication
- Email + password login via Supabase Auth
- Sign up / sign in with confirmation email
- Protected app — no data visible without login
- Logout button with user email shown in navbar

### 📊 Dashboard
- Live metrics: Today's Sales, Outstanding, Cheques Pending, Customers, Bills Today
- 7-day sales bar chart (interactive visual)
- Recent bills table with payment status
- Low stock alerts (≤10 pieces)

### 📦 Product Catalog
- Add/Edit/Delete products with Article No. (supplier code), Name, Category, Size, Color, Price, GST Rate, Qty, HSN
- Auto-generated 9-digit unique barcode (SKU) per product
- QR code generated automatically using qrserver.com
- Categories: Kids, Girls, Men, Women, Jeans, Tops, Jackets, Hosiery, Woollen, Suits, Others
- GST rates: 0%, 5%, 12%, 18%, 28%
- Search by name, article number, or barcode

### 📷 Scan Supplier Invoice
- Camera/photo upload → Google Gemini AI reads invoice
- Extracts: article number, name, sizes (comma-separated), quantity, price, GST
- Multi-size handling: if M,L,XL listed → creates separate product per size
- Editable extracted table before adding to catalog
- Manual item entry form
- "Print QR Labels" button goes directly to QR label printer

### 🏷 QR Label Printer (NEW)
- Select any product from catalog
- Set how many labels to print (e.g., 8 for qty 8)
- Each label contains:
  - QR code (unique per label)
  - Unique barcode number (for manual entry if scanner not working)
  - Article / Supplier code
  - Size
  - Product name
  - NO PRICE on labels (price can be changed separately)
- Printable A4 sheet: 4 labels per row, 90mm × 40mm each
- Works with standard A4 paper or label sheets

### 🛒 POS / Sell
- 3-step flow: Customer → Items → Checkout
- Barcode scan (USB scanner or camera)
- Product grid with category filter and search
- Cart with qty +/− controls, running total
- GST mode: Price excl. GST or incl. GST toggle
- **Discount**: Optional rupee discount on total — if ₹0, NOT shown on invoice
- **Relative/Walk-in mode**: No GST, no GSTIN, 10% markup silently added as "Misc. Charges"
- Auto-generates sequential invoice number (INV/2025/0001 format)

### 👤 Customers
- Add/Edit/Remove customers
- Fields: Name, Mobile, Shop Name, GSTIN, Email (for invoices), City/Area
- Per-customer stats: bills count, total billed, total paid, balance

### 🧾 Bills & Invoices
- List all bills with: Invoice #, Date, Customer, Total, Paid, Status
- **Payment status badges**: Paid (green), Partial (amber), Unpaid (red)
- **Bilty / LR Number**: Add transport dispatch number per invoice, shown on invoice and ledger
- Print invoice → new browser window, formatted for A4
- **Download PDF** using jsPDF + html2canvas (client-side, no server needed)
- **Email invoice** using mailto: with configurable email template
- Record payment button per bill

### 📄 Invoice Format
- Firm logo (if uploaded in settings)
- Firm name, address, GSTIN, mobile
- QR code (encodes: Invoice No, Date, Party, Total, Firm Name — for mobile verification)
- Unique sequential invoice number (INV/2025/0001)
- Bill To: customer name, address, GSTIN
- Items table: #, Description, Category, Size, Qty, Rate, GST%, CGST, SGST, Total
- GST Summary table: Rate → Taxable → CGST → SGST → Total Tax (CGST = SGST = GST/2 for intra-state)
- Discount line (only shown if discount > 0)
- Grand Total, Amount Paid, Balance Due
- Amount in Words
- Bank details for NEFT/RTGS
- Terms & Conditions (configurable)
- Authorised signatory space
- Bilty/LR number if added
- "CASH MEMO" for relative/walk-in sales

### 💰 Payment Collection
- 3 modes: Cash, Online (UPI), Cheque
- **Common fields (all modes)**: Party Name, City, Amount (₹), Date, Amount in Words (auto)
- **Cash**: Remarks
- **UPI/Online**: App (PhonePe/GPay/Paytm/BHIM/Other), UTR/Transaction Reference
- **Cheque**: Cheque number, Bank name, Received date, Date on cheque, Expected clearance date, Area/Branch, Initial status
- **Cheque Status Pipeline** (colour-coded, manually advance):
  - 🟡 Deposited → 🟢 Cleared ✓
  - 🟡 Deposited → 🔴 Bounced ✗ → 🔵 Re-Deposited → 🟢 Re-Cleared ✓✓
  - Status visible in Bills list and Ledger, one-click advance buttons

### 📒 Ledger / Statement
- All invoices (debit) and payments (credit) in chronological order
- Running balance per row
- Cheque status badge with advance buttons directly in ledger
- Bilty number shown per invoice row
- Filter by party name or type (All/Invoice/Payment)
- Totals row: Total Invoiced, Total Received, Net Outstanding

### ⚙️ Settings
- **Firm Details**: Name, Business Type, GSTIN, Mobile, Email, State, Address
- **Logo**: Upload PNG/JPG logo displayed on every invoice header
- **Invoice Prefix**: INV, GST, BILL — generates INV/2025/0001 format
- **Bank Details**: Bank name, Account number, IFSC (shown on invoice)
- **Terms & Conditions**: Multi-line, printed on every invoice
- **Email Template**: Configurable with variables {customerName}, {invoiceNo}, {date}, {amount}, {firmName}, {mobile}
- **Gemini API Key**: For AI bill scanning (stored in localStorage)

---

## 🚀 DEPLOYMENT GUIDE — Step by Step

### Prerequisites
- Computer with Node.js 18+ installed
- GitHub account (free)
- Internet connection

### Step 1 — Prepare the project locally

```bash
# Unzip the downloaded shopos.zip
unzip shopos.zip
cd shopos

# Install dependencies
npm install
```

### Step 2 — Set up Supabase (free database + auth)

1. Go to **https://supabase.com** → Sign up / Log in
2. Click **"New project"**
   - Name: `shopos`
   - Database password: save this securely
   - Region: Singapore (closest to India)
3. Wait ~2 minutes for project to start

4. Go to **SQL Editor** → **New Query**
5. Copy the entire contents of `supabase/schema.sql` → **Run**
6. Go to **SQL Editor** → **New Query** again
7. Copy the contents of `supabase/functions.sql` → **Run**

8. Go to **Authentication → Providers**
   - Ensure "Email" is enabled
   - You can disable "Confirm email" for easier testing (Supabase dashboard → Auth → Settings → uncheck "Enable email confirmations")

9. Go to **Project Settings → API**
   - Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 3 — Get Google Gemini API key (free, for bill scanning)

1. Go to **https://aistudio.google.com/app/apikey**
2. Click **"Create API key"**
3. Copy it — you'll add it in the app Settings page (not needed for deployment)

### Step 4 — Configure environment variables

```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local with a text editor:
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 5 — Test locally

```bash
npm run dev
# Open http://localhost:3000
# Click "Create Account" to register your first user
# Add your firm details in ⚙️ Settings
# Add Gemini API key in Settings for bill scanning
```

### Step 6 — Push to GitHub

```bash
git init
git add .
git commit -m "ShopOS v3 — Full POS System"
# Create a new repository at github.com
git remote add origin https://github.com/YOUR_USERNAME/shopos.git
git push -u origin main
```

### Step 7 — Deploy to Vercel (free hosting)

1. Go to **https://vercel.com** → Sign up with GitHub
2. Click **"Add New Project"** → Import your `shopos` repository
3. In **"Environment Variables"** section, add both:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
   ```
4. Click **Deploy** → waits ~2 minutes → live!

Your app is now at: `https://shopos-yourname.vercel.app`

### Step 8 — First-time setup in the app

1. Open your Vercel URL
2. Click **"Create Account"** → enter email + password
3. Check email for confirmation (if enabled in Supabase)
4. Log in → go to **⚙️ Settings**
5. Fill in firm name, GSTIN, address, mobile
6. Add your logo (optional)
7. Set your invoice prefix (INV, GST, BILL, etc.)
8. Customise Terms & Conditions
9. Add Gemini API key if you want bill scanning
10. Click **Save All Settings**

### Step 9 — Custom domain (optional, free)

1. Vercel Dashboard → your project → **Settings → Domains**
2. Add `shopos.yourdomain.com`
3. Add CNAME record at your registrar → Vercel handles SSL automatically

---

## 🔒 Security Notes

- The app uses Supabase's open RLS policies (anyone can read/write data)
- This is fine for single-device/single-user use with login protection
- For multi-user with role separation, update RLS policies to use `auth.uid()`
- Never commit your `.env.local` file to GitHub (it's in .gitignore)

---

## 🆓 Free Tier Limits

| Service | Free Limit | Notes |
|---------|-----------|-------|
| Vercel | Unlimited deploys, 100GB bandwidth | More than enough |
| Supabase | 500MB DB, 50,000 rows, 2GB bandwidth | Good for ~years of data |
| Gemini Flash | 15 req/min, 1M tokens/day | Plenty for scanning |
| jsPDF | Client-side only | No cost ever |

---

## 📱 Mobile Usage

- Works on any mobile browser (Chrome Android recommended)
- Camera barcode scanning: tap 📷 Camera button in POS
- USB barcode scanner: plug into laptop/PC, works as keyboard input
- QR label printer: works on desktop Chrome for best print results
