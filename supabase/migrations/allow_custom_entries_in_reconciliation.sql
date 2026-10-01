-- Allow custom entries in customer_id field (remove foreign key constraint)
-- This lets us store both customer IDs and custom text (Salary, Interest, EMI, etc.)

alter table recon_transactions
drop constraint if exists recon_transactions_customer_id_fkey;

-- Now customer_id is just a text field that can hold:
-- - customer UUIDs (for customer payments)
-- - custom text (Bank Interest, Salary, EMI, Loan, etc.)
