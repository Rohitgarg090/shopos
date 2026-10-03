-- Add supplier_id to returns table for consistency with customer_id
-- This ensures supplier returns are properly identified like customer returns

alter table returns add column if not exists supplier_id text;

-- Create index for faster filtering by supplier
create index if not exists idx_returns_supplier_id on returns(supplier_id)
  where type = 'supplier';

-- Add constraint to ensure customer returns have customer_id and supplier returns have supplier_id
-- (Note: This is informational - actual constraint enforcement would require CHECK or TRIGGER)
