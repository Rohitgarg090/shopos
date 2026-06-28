-- Add columns for manual override tracking

ALTER TABLE IF EXISTS gstr2b_reconciliation
ADD COLUMN IF NOT EXISTS manually_matched boolean DEFAULT false;

ALTER TABLE IF EXISTS gstr2b_reconciliation
ADD COLUMN IF NOT EXISTS updated_by_ca_id uuid;

ALTER TABLE IF EXISTS gstr2b_reconciliation
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
