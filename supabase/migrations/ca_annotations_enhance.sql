-- Enhance ca_annotations table with tag and status fields for Phase 2

ALTER TABLE ca_annotations
ADD COLUMN IF NOT EXISTS tag text DEFAULT 'general',
ADD COLUMN IF NOT EXISTS status text DEFAULT 'open' CHECK (status IN ('open', 'resolved'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ca_annotations_firm_id_status ON ca_annotations(firm_id, status);
CREATE INDEX IF NOT EXISTS idx_ca_annotations_bill_id ON ca_annotations(bill_id);

-- Add RLS policy for CA to update their own annotations
CREATE POLICY "ca_can_update_own_annotations" ON ca_annotations
  FOR UPDATE USING (
    ca_id = (select id from ca_partners where user_id = auth.uid())
  );

-- Add RLS policy for CA to delete their own annotations
CREATE POLICY "ca_can_delete_own_annotations" ON ca_annotations
  FOR DELETE USING (
    ca_id = (select id from ca_partners where user_id = auth.uid())
  );
