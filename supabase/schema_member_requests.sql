-- firm_join_requests: controlled registration approval workflow
-- Users register with a Firm ID, owner/manager approves with role assignment

create table if not exists firm_join_requests (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  name text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  role text default 'staff' check (role in ('owner', 'manager', 'staff')),
  requested_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  notes text
);

create index idx_fjr_firm_id on firm_join_requests(firm_id);
create index idx_fjr_user_id on firm_join_requests(user_id);
create index idx_fjr_status on firm_join_requests(status);

alter table firm_join_requests enable row level security;

-- Users can read their own requests
create policy "user_own_requests" on firm_join_requests
  for select using (user_id = auth.uid());
