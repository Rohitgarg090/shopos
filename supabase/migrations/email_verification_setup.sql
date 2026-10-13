-- Sign-up email verification codes. This table was missing in the live database, so every
-- sign-up failed at "verify code". Server-only (RLS on, no policies). Safe to run more than once.
create table if not exists public.email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  otp text not null,
  name text,
  expires_at timestamptz not null,
  verified boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_email_verify_email on public.email_verification_tokens(email, created_at desc);
alter table public.email_verification_tokens enable row level security;
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='email_verification_tokens' loop
    execute format('drop policy %I on public.email_verification_tokens', p.policyname);
  end loop;
end $$;

-- codes older than a day are useless
delete from public.email_verification_tokens where created_at < now() - interval '1 day';

notify pgrst, 'reload schema';
