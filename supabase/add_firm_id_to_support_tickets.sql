-- Add firm_id column to support_tickets table
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS firm_id UUID;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_firm_id ON support_tickets(firm_id);

-- Update existing rows if needed (set to a default firm if they exist)
-- Note: This assumes there's at least one firm. Adjust as needed for your use case.
