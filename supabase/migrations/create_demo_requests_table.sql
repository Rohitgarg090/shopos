-- Demo Requests Table
create table demo_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  mobile text not null,
  city text not null,
  status text default 'pending' check(status in ('pending', 'scheduled', 'completed', 'cancelled')),
  demo_scheduled_at timestamp,
  notes text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Indexes
create index idx_demo_requests_email on demo_requests(email);
create index idx_demo_requests_status on demo_requests(status);
create index idx_demo_requests_created_at on demo_requests(created_at desc);

-- Disable RLS (public table for form submissions)
alter table demo_requests disable row level security;
