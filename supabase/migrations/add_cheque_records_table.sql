-- Cheque Records table for standalone cheques (not linked to invoices)
create table if not exists cheque_records (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null,
  customer_id text,
  party_name text not null,
  bank text,
  cheque_no text,
  cheque_date date,
  received_date date,
  clearance_date date,
  amount numeric(12,2),
  status text default 'received',
  remarks text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_cheque_records_firm on cheque_records(firm_id);
create index if not exists idx_cheque_records_customer on cheque_records(customer_id);
create index if not exists idx_cheque_records_status on cheque_records(status);

-- Enable RLS (permissive, filtered at app level)
alter table cheque_records enable row level security;
create policy "cheque_records permissive" on cheque_records for all using (true) with check (true);
