-- Add state and pincode columns to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS state text DEFAULT 'Madhya Pradesh',
ADD COLUMN IF NOT EXISTS pincode text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_state ON customers(state);
CREATE INDEX IF NOT EXISTS idx_customers_pincode ON customers(pincode);
