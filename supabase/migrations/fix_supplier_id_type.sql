-- Fix supplier_id column type to text (for storing supplier name)
-- This migration handles the case where the column might exist as UUID

-- Check if supplier_id column exists and is not text
-- If it exists as UUID, we need to recreate it as text
BEGIN;

-- Drop the column if it exists as UUID and recreate as text
ALTER TABLE IF EXISTS payments
  DROP COLUMN IF EXISTS supplier_id CASCADE;

-- Add supplier_id as text
ALTER TABLE IF EXISTS payments
  ADD COLUMN IF NOT EXISTS supplier_id text;

-- Create index for fast filtering
CREATE INDEX IF NOT EXISTS idx_payments_supplier_id ON payments(supplier_id)
  WHERE payment_type = 'supplier';

COMMIT;
