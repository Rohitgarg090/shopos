-- Reconciliation tables and functions

-- recon_sessions: each bank statement reconciliation run
create table if not exists recon_sessions (
  id            uuid primary key default gen_random_uuid(),
  firm_id       uuid not null,
  bank_stmt_id  integer references bank_statements(id) on delete set null,
  label         text not null default '',
  period_from   date,
  period_to     date,
  status        text not null default 'draft' check (status in ('draft','reviewing','locked')),
  stats         jsonb not null default '{}',
  created_by    uuid references auth.users(id),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  locked_at     timestamptz,
  notes         text default ''
);

create index if not exists idx_recon_sessions_firm on recon_sessions(firm_id, created_at desc);
create index if not exists idx_recon_sessions_status on recon_sessions(firm_id, status);

alter table recon_sessions enable row level security;
create policy "firm recon sessions" on recon_sessions for all using (true) with check (true);

-- recon_transactions: individual bank transactions with match state
create table if not exists recon_transactions (
  id                   uuid primary key default gen_random_uuid(),
  session_id           uuid not null references recon_sessions(id) on delete cascade,
  firm_id              uuid not null,
  txn_date             date not null,
  description          text not null default '',
  ref_no               text default '',
  amount               numeric(12,2) not null,
  txn_type             text not null check (txn_type in ('credit','debit')),
  balance              numeric(12,2) default 0,
  match_status         text not null default 'unmatched' check (match_status in ('matched','likely','unmatched','ignored')),
  match_score          integer default 0,
  matched_payment_id   integer references payments(id) on delete set null,
  matched_type         text default '',
  match_ref            text default '',
  is_reconciled        boolean default false,
  reconciled_at        timestamptz,
  manually_linked      boolean default false,
  linked_by            uuid references auth.users(id),
  linked_at            timestamptz,
  created_payment_id   integer references payments(id) on delete set null,
  notes                text default '',
  sort_order           integer default 0
);

create index if not exists idx_recon_txn_session on recon_transactions(session_id, sort_order);
create index if not exists idx_recon_txn_status on recon_transactions(session_id, match_status);
create index if not exists idx_recon_txn_payment on recon_transactions(matched_payment_id) where matched_payment_id is not null;

alter table recon_transactions enable row level security;
create policy "firm recon txns" on recon_transactions for all using (true) with check (true);

-- recon_payment_locks: prevent same payment being matched to two txns in same session
create table if not exists recon_payment_locks (
  session_id  uuid not null references recon_sessions(id) on delete cascade,
  payment_id  integer not null references payments(id) on delete cascade,
  txn_id      uuid not null references recon_transactions(id) on delete cascade,
  locked_at   timestamptz default now(),
  primary key (session_id, payment_id)
);

create index if not exists idx_recon_locks_session on recon_payment_locks(session_id);

alter table recon_payment_locks enable row level security;
create policy "firm recon locks" on recon_payment_locks for all using (true) with check (true);

-- RPC: atomically claim a payment for a session (returns true if claimed, false if already taken)
create or replace function claim_payment_for_session(
  p_session_id uuid, p_payment_id integer, p_txn_id uuid
) returns boolean language plpgsql security definer as $$
begin
  insert into recon_payment_locks(session_id, payment_id, txn_id)
  values (p_session_id, p_payment_id, p_txn_id)
  on conflict (session_id, payment_id) do nothing;
  return found;
end; $$;

-- RPC: recompute session stats from transactions and persist
create or replace function refresh_session_stats(p_session_id uuid)
returns void language plpgsql security definer as $$
declare v_stats jsonb;
begin
  select jsonb_build_object(
    'total',        count(*),
    'matched',      count(*) filter (where match_status='matched'),
    'likely',       count(*) filter (where match_status='likely'),
    'unmatched',    count(*) filter (where match_status='unmatched'),
    'ignored',      count(*) filter (where match_status='ignored'),
    'totalCredits', coalesce(sum(amount) filter (where txn_type='credit'),0),
    'totalDebits',  coalesce(sum(amount) filter (where txn_type='debit'),0),
    'matchedAmt',   coalesce(sum(amount) filter (where match_status='matched'),0),
    'unmatchedAmt', coalesce(sum(amount) filter (where match_status='unmatched'),0)
  ) into v_stats
  from recon_transactions where session_id = p_session_id;
  update recon_sessions set stats = v_stats, updated_at = now() where id = p_session_id;
end; $$;
