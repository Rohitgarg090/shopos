-- Demo Request Table
create table if not exists demo_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  contact_number text not null,
  city text not null,
  company_name text,
  message text,
  status text default 'pending' check (status in ('pending', 'contacted', 'converted', 'rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  contacted_by text,
  contacted_at timestamptz
);

-- Add indexes
create index if not exists idx_demo_requests_email on demo_requests(email);
create index if not exists idx_demo_requests_status on demo_requests(status);
create index if not exists idx_demo_requests_created_at on demo_requests(created_at desc);

-- Enable RLS
alter table demo_requests enable row level security;

-- Allow public insert (for landing page)
create policy "allow_public_insert" on demo_requests
  for insert with check (true);

-- Allow admins to view and update
create policy "allow_admin_select" on demo_requests
  for select using (
    exists (
      select 1 from auth.users
      where auth.uid() = id
      and email in ('rohitgarg090@gmail.com', 'info@shopos.co.in')
    )
  );

create policy "allow_admin_update" on demo_requests
  for update using (
    exists (
      select 1 from auth.users
      where auth.uid() = id
      and email in ('rohitgarg090@gmail.com', 'info@shopos.co.in')
    )
  );
