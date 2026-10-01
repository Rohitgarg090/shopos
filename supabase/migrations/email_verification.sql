-- Create email verification tokens table for registration
create table if not exists email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  otp text not null,
  name text,
  expires_at timestamptz not null,
  verified boolean default false,
  created_at timestamptz default now()
);

-- Create index for faster lookups
create index if not exists idx_email_verify_email_otp on email_verification_tokens(email, otp);
create index if not exists idx_email_verify_expires on email_verification_tokens(expires_at);
create index if not exists idx_email_verify_email on email_verification_tokens(email);
