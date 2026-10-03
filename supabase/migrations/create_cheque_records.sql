-- Create cheque_records table for tracking cheques given and received
create table if not exists cheque_records (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null,
  cheque_no text not null,
  cheque_date date,
  amount decimal(12, 2),
  bank_name text,
  cheque_type text, -- 'given' or 'received'
  party_name text, -- supplier name if given, customer name if received
  party_type text, -- 'supplier' or 'customer'
  payment_id uuid, -- link to payments table
  status text default 'deposited', -- 'deposited', 'cleared', 'bounced', 'redeposited', 'recleared'
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Columns used by /api/cheque-records (safe to re-run)
alter table cheque_records add column if not exists bank text;
alter table cheque_records add column if not exists received_date date;
alter table cheque_records add column if not exists clearance_date date;
alter table cheque_records add column if not exists remarks text;
alter table cheque_records add column if not exists customer_id text;

-- Create indexes for fast lookup
create index if not exists idx_cheque_records_firm_id on cheque_records(firm_id);
create index if not exists idx_cheque_records_cheque_no on cheque_records(cheque_no);
create index if not exists idx_cheque_records_status on cheque_records(status);
create index if not exists idx_cheque_records_cheque_type on cheque_records(cheque_type);

-- Make PostgREST pick up the new table/columns immediately
notify pgrst, 'reload schema';
