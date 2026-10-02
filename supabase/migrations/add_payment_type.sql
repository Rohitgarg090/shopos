-- Add payment type to differentiate customer vs supplier payments
alter table payments add column if not exists payment_type text default 'customer';

-- Create index for filtering by payment type
create index if not exists idx_payments_type on payments(payment_type);

-- Add supplier reference for supplier payments
alter table payments add column if not exists supplier_id uuid;
alter table payments add column if not exists supplier_invoice_id uuid;
