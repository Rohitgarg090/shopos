-- Create bank_statements table if not exists
create table if not exists bank_statements (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null,
  file_name text not null,
  file_type text,
  file_data bytea,
  file_size bigint,
  description text,
  transaction_count integer default 0,
  uploaded_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_bank_statements_firm on bank_statements(firm_id, uploaded_at desc);
alter table bank_statements enable row level security;
create policy "firm bank statements" on bank_statements for all using (true) with check (true);

-- Add columns to recon_transactions for customer matching and suspense
alter table recon_transactions add column if not exists customer_id text references customers(id) on delete set null;
alter table recon_transactions add column if not exists manual_customer_match boolean default false;
alter table recon_transactions add column if not exists is_suspense boolean default false;
alter table recon_transactions add column if not exists suspense_reason text;

-- Create index for customer queries
create index if not exists idx_recon_txn_customer on recon_transactions(customer_id) where customer_id is not null;

-- Add index for suspense entries
create index if not exists idx_recon_txn_suspense on recon_transactions(session_id, is_suspense) where is_suspense = true;

-- Update RPC to include suspense stats
create or replace function refresh_session_stats(p_session_id uuid)
returns void language plpgsql security definer as $$
declare v_stats jsonb;
begin
  select jsonb_build_object(
    'total',        count(*),
    'matched',      count(*) filter (where match_status='matched' and not is_suspense),
    'likely',       count(*) filter (where match_status='likely'),
    'unmatched',    count(*) filter (where match_status='unmatched' and not is_suspense),
    'suspense',     count(*) filter (where is_suspense),
    'ignored',      count(*) filter (where match_status='ignored'),
    'totalCredits', coalesce(sum(amount) filter (where txn_type='credit'),0),
    'totalDebits',  coalesce(sum(amount) filter (where txn_type='debit'),0),
    'matchedAmt',   coalesce(sum(amount) filter (where match_status='matched'),0),
    'unmatchedAmt', coalesce(sum(amount) filter (where match_status='unmatched' and not is_suspense),0),
    'suspenseAmt',  coalesce(sum(amount) filter (where is_suspense),0)
  ) into v_stats
  from recon_transactions where session_id = p_session_id;
  update recon_sessions set stats = v_stats, updated_at = now() where id = p_session_id;
end; $$;
