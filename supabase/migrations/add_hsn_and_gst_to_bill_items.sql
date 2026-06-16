-- Add HSN Code and GST Rate to bill_items table
-- This is essential for GST compliance and CA invoicing

-- Ensure hsn column exists (may already exist as 'hsn')
ALTER TABLE bill_items
ADD COLUMN IF NOT EXISTS hsn text;

-- Ensure gst_rate column exists
ALTER TABLE bill_items
ADD COLUMN IF NOT EXISTS gst_rate integer DEFAULT 18
CHECK (gst_rate IN (0, 5, 12, 18, 28));

-- Create index on hsn for faster queries
CREATE INDEX IF NOT EXISTS idx_bill_items_hsn ON bill_items(hsn);

-- Create index on gst_rate for GST reporting
CREATE INDEX IF NOT EXISTS idx_bill_items_gst_rate ON bill_items(gst_rate);

-- Index on bills table for CA dashboard queries (use created_at, not date)
CREATE INDEX IF NOT EXISTS idx_bills_firm_id_created_at ON bills(firm_id, created_at);

-- Index on firm_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_bills_firm_id ON bills(firm_id);
