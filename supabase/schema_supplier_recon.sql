-- Supplier Reconciliation tables and functions

-- supplier_recon_sessions: each supplier statement reconciliation run
create table if not exists supplier_recon_sessions (
  id              uuid primary key default gen_random_uuid(),
  firm_id         uuid not null,
  supplier_name   text not null default '',
  statement_id    integer references supplier_statements(id) on delete set null,
  label           text not null default '',
  period_from     date,
  period_to       date,
  status          text not null default 'draft' check (status in ('draft','reviewing','locked')),
  stats           jsonb not null default '{}',
  created_by      uuid references auth.users(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  locked_at       timestamptz,
  notes           text default ''
);

create index if not exists idx_sup_recon_firm on supplier_recon_sessions(firm_id, created_at desc);
create index if not exists idx_sup_recon_supplier on supplier_recon_sessions(firm_id, supplier_name);

alter table supplier_recon_sessions enable row level security;
create policy "firm supplier recon sessions" on supplier_recon_sessions for all using (true) with check (true);

-- supplier_recon_transactions: individual supplier statement lines with match state
create table if not exists supplier_recon_transactions (
  id                   uuid primary key default gen_random_uuid(),
  session_id           uuid not null references supplier_recon_sessions(id) on delete cascade,
  firm_id              uuid not null,
  txn_date             date not null,
  description          text not null default '',
  invoice_no           text default '',
  amount               numeric(12,2) not null,
  txn_type             text not null check (txn_type in ('invoice','credit_note','other')),
  match_status         text not null default 'unmatched' check (match_status in ('matched','likely','unmatched','ignored','disputed')),
  match_score          integer default 0,
  matched_invoice_id   integer references supplier_invoices(id) on delete set null,
  match_ref            text default '',
  is_reconciled        boolean default false,
  reconciled_at        timestamptz,
  manually_linked      boolean default false,
  notes                text default '',
  sort_order           integer default 0
);

create index if not exists idx_sup_recon_txn_session on supplier_recon_transactions(session_id, sort_order);
create index if not exists idx_sup_recon_txn_status on supplier_recon_transactions(session_id, match_status);
create index if not exists idx_sup_recon_txn_invoice on supplier_recon_transactions(matched_invoice_id) where matched_invoice_id is not null;

alter table supplier_recon_transactions enable row level security;
create policy "firm supplier recon txns" on supplier_recon_transactions for all using (true) with check (true);

-- supplier_recon_invoice_locks: prevent same invoice being matched to two txns in same session
create table if not exists supplier_recon_invoice_locks (
  session_id   uuid not null references supplier_recon_sessions(id) on delete cascade,
  invoice_id   integer not null references supplier_invoices(id) on delete cascade,
  txn_id       uuid not null references supplier_recon_transactions(id) on delete cascade,
  locked_at    timestamptz default now(),
  primary key (session_id, invoice_id)
);

create index if not exists idx_sup_recon_locks_session on supplier_recon_invoice_locks(session_id);

alter table supplier_recon_invoice_locks enable row level security;
create policy "firm supplier recon locks" on supplier_recon_invoice_locks for all using (true) with check (true);

-- RPC: atomically claim an invoice for a session (returns true if claimed, false if already taken)
create or replace function claim_invoice_for_supplier_session(
  p_session_id uuid, p_invoice_id uuid, p_txn_id uuid
) returns boolean language plpgsql security definer as $$
begin
  insert into supplier_recon_invoice_locks(session_id, invoice_id, txn_id)
  values (p_session_id, p_invoice_id, p_txn_id)
  on conflict (session_id, invoice_id) do nothing;
  return found;
end; $$;

-- RPC: recompute supplier session stats from transactions and persist
create or replace function refresh_supplier_session_stats(p_session_id uuid)
returns void language plpgsql security definer as $$
declare v_stats jsonb;
begin
  select jsonb_build_object(
    'total',        count(*),
    'matched',      count(*) filter (where match_status='matched'),
    'likely',       count(*) filter (where match_status='likely'),
    'unmatched',    count(*) filter (where match_status='unmatched'),
    'disputed',     count(*) filter (where match_status='disputed'),
    'ignored',      count(*) filter (where match_status='ignored'),
    'totalAmount',  coalesce(sum(amount),0),
    'matchedAmt',   coalesce(sum(amount) filter (where match_status='matched'),0),
    'unmatchedAmt', coalesce(sum(amount) filter (where match_status='unmatched'),0),
    'disputedAmt',  coalesce(sum(amount) filter (where match_status='disputed'),0)
  ) into v_stats
  from supplier_recon_transactions where session_id = p_session_id;
  update supplier_recon_sessions set stats = v_stats, updated_at = now() where id = p_session_id;
end; $$;
