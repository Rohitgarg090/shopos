-- Add HSN Code and GST Rate to bill_items table
-- This is essential for GST compliance and CA invoicing

-- Add hsn_code column (HSN/SAC code from GST)
ALTER TABLE bill_items
ADD COLUMN IF NOT EXISTS hsn_code text;

-- Add gst_rate column (5, 12, 18, 28)
ALTER TABLE bill_items
ADD COLUMN IF NOT EXISTS gst_rate integer DEFAULT 18
CHECK (gst_rate IN (0, 5, 12, 18, 28));

-- Create index on hsn_code for faster queries
CREATE INDEX IF NOT EXISTS idx_bill_items_hsn_code ON bill_items(hsn_code);

-- Create index on gst_rate for GST reporting
CREATE INDEX IF NOT EXISTS idx_bill_items_gst_rate ON bill_items(gst_rate);

-- Optional: If you want to track HSN/SAC master data separately
-- CREATE TABLE IF NOT EXISTS hsn_codes (
--   id text primary key,
--   code text not null unique,
--   description text,
--   gst_rate integer check (gst_rate in (0, 5, 12, 18, 28)),
--   created_at timestamptz default now()
-- );

-- Index on bills table for CA dashboard queries
CREATE INDEX IF NOT EXISTS idx_bills_firm_id_date ON bills(firm_id, date);
CREATE INDEX IF NOT EXISTS idx_bills_is_purchase ON bills(is_purchase);
