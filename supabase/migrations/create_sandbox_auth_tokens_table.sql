-- Sandbox authentication tokens cache
create table sandbox_auth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  gstin text not null,
  access_token text not null,
  expires_at bigint not null,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(user_id, gstin)
);

-- Index for quick lookups
create index idx_sandbox_tokens_user_id on sandbox_auth_tokens(user_id);
create index idx_sandbox_tokens_expires_at on sandbox_auth_tokens(expires_at);

-- Enable RLS
alter table sandbox_auth_tokens enable row level security;

-- Only users can access their own tokens
create policy "Users can view own tokens" on sandbox_auth_tokens
  for select using (user_id = auth.uid());

create policy "Users can update own tokens" on sandbox_auth_tokens
  for update using (user_id = auth.uid());

create policy "Users can insert own tokens" on sandbox_auth_tokens
  for insert with check (user_id = auth.uid());
