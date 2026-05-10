-- Create password reset tokens table
create table if not exists password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  otp text not null,
  expires_at timestamptz not null,
  used boolean default false,
  created_at timestamptz default now()
);

-- Create index for faster lookups
create index if not exists idx_password_reset_email_otp on password_reset_tokens(email, otp);
create index if not exists idx_password_reset_expires on password_reset_tokens(expires_at);
