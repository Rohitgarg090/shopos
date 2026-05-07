-- ============================================
-- SHOPJOS SAAS MULTI-TENANT SCHEMA
-- ============================================

-- 1. ORGANIZATIONS (Tenants)
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'trial' check (status in ('trial', 'active', 'suspended', 'cancelled')),
  plan text not null default 'starter' check (plan in ('starter', 'business', 'pro', 'enterprise')),

  -- Trial management
  trial_started_at timestamptz default now(),
  trial_ends_at timestamptz default now() + interval '14 days',
  trial_extended_at timestamptz,
  trial_extended_until timestamptz,

  -- Subscription
  subscription_started_at timestamptz,
  subscription_ends_at timestamptz,
  renewal_date timestamptz,
  auto_renew boolean default true,

  -- Razorpay
  razorpay_customer_id text,
  razorpay_subscription_id text,

  -- Seat limits
  seats_purchased integer default 2,
  seats_used integer default 1,

  -- Metadata
  logo text,
  address text,
  phone text,
  gst_number text,
  email text,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create index idx_org_owner on organizations(owner_id);
create index idx_org_status on organizations(status);
create index idx_org_plan on organizations(plan);

alter table organizations enable row level security;
create policy "org_owner_access" on organizations for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ============================================
-- 2. SUBSCRIPTION & BILLING
-- ============================================

create table if not exists subscription_plans (
  id text primary key,
  name text not null,
  description text,
  price_monthly integer not null, -- in paise (₹799 = 79900 paise)
  price_annual integer not null,
  seats integer default 2,
  firms_limit integer,
  features jsonb,
  created_at timestamptz default now()
);

insert into subscription_plans (id, name, description, price_monthly, price_annual, seats, firms_limit, features) values
  ('starter', 'Starter', '1 firm, 2 users', 79900, 699900, 2, 1, '{"invoices": true, "analytics": true, "customers": true, "support": "email"}'),
  ('business', 'Business', '3 firms, 5 users', 149900, 1299900, 5, 3, '{"invoices": true, "analytics": true, "customers": true, "suppliers": true, "bank_reconciliation": true, "support": "priority"}'),
  ('pro', 'Pro', 'Unlimited firms & users', 249900, 2199900, 999, 999, '{"invoices": true, "analytics": true, "customers": true, "suppliers": true, "bank_reconciliation": true, "data_migration": true, "api_access": true, "support": "priority"}');

-- ============================================
-- 3. SUBSCRIPTION PAYMENTS (SaaS Plans)
-- ============================================
-- Separate table for SaaS subscription payments (not customer bill payments)

create table if not exists subscription_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  amount integer not null, -- in paise
  currency text default 'INR',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),

  -- Razorpay details
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  razorpay_signature text,

  -- Plan info
  plan text not null references subscription_plans(id),
  billing_period text check (billing_period in ('monthly', 'annual')),
  coupon_code text,
  discount_amount integer default 0,

  -- Dates
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  paid_at timestamptz,

  -- Metadata
  metadata jsonb
);

create index idx_sub_payment_org on subscription_payments(organization_id);
create index idx_sub_payment_status on subscription_payments(status);
create index idx_sub_payment_date on subscription_payments(created_at desc);
create index idx_sub_payment_razorpay on subscription_payments(razorpay_order_id);

-- ============================================
-- 4. COUPON CODES
-- ============================================

create table if not exists coupon_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value integer not null, -- percentage (0-100) or amount in paise

  -- Validity
  valid_from timestamptz default now(),
  valid_until timestamptz,

  -- Usage limits
  max_uses integer,
  current_uses integer default 0,
  max_uses_per_customer integer default 1,

  -- Applicability
  applicable_plans text[] default array['starter', 'business', 'pro'], -- which plans apply
  applicable_to text default 'all' check (applicable_to in ('all', 'new_customers', 'existing_customers')),
  applicable_billing text[] default array['monthly', 'annual'], -- monthly, annual, or both
  min_amount integer, -- minimum purchase amount required

  -- Metadata
  description text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  is_active boolean default true
);

create index idx_coupon_code on coupon_codes(code);
create index idx_coupon_valid on coupon_codes(valid_from, valid_until);

-- Track coupon usage per organization
create table if not exists coupon_usage (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupon_codes(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  subscription_payment_id uuid references subscription_payments(id),
  used_at timestamptz default now()
);

create index idx_coupon_usage_org on coupon_usage(organization_id);

-- ============================================
-- 5. SUPPORT TICKETING
-- ============================================

create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete set null,

  title text not null,
  description text,
  category text check (category in ('billing', 'technical', 'migration', 'feature_request', 'other')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text default 'open' check (status in ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),

  -- Assignment
  assigned_to uuid references auth.users(id),
  assigned_at timestamptz,

  -- Dates
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  resolved_at timestamptz,

  -- AI Support
  claude_session_id text, -- for Claude agent context
  suggested_solution text,

  metadata jsonb
);

create index idx_ticket_org on support_tickets(organization_id);
create index idx_ticket_status on support_tickets(status);
create index idx_ticket_created on support_tickets(created_at desc);

-- Support ticket messages/thread
create table if not exists ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete set null,
  message text not null,
  is_internal boolean default false, -- visible only to support team

  -- AI Response
  is_ai_response boolean default false,
  ai_model text,

  attachments jsonb, -- file URLs

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_message_ticket on ticket_messages(ticket_id);

-- ============================================
-- 6. DATA MIGRATION
-- ============================================

create table if not exists data_migrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,

  source_system text not null, -- 'csv', 'tally', 'quickbooks', etc.
  import_type text, -- 'products', 'customers', 'bills', 'all'
  status text default 'pending' check (status in ('pending', 'in_progress', 'validating', 'completed', 'failed')),

  -- File info
  file_name text,
  file_size integer,
  file_path text,

  -- Progress
  total_records integer,
  processed_records integer,
  skipped_records integer,
  error_records integer,

  -- Results
  imported_count integer,
  duplicate_count integer,
  validation_errors jsonb,

  created_at timestamptz default now(),
  completed_at timestamptz,

  metadata jsonb
);

create index idx_migration_org on data_migrations(organization_id);
create index idx_migration_status on data_migrations(status);

-- ============================================
-- 7. ONBOARDING CHECKLIST
-- ============================================

create table if not exists onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,

  task_type text not null check (task_type in ('add_team', 'setup_firms', 'import_data', 'configure_invoices', 'connect_bank', 'test_payment')),
  title text not null,
  description text,
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed')),

  -- Optional related records
  related_entity_type text, -- 'firm', 'user', 'migration'
  related_entity_id uuid,

  created_at timestamptz default now(),
  completed_at timestamptz
);

create index idx_onboarding_org on onboarding_tasks(organization_id);

-- ============================================
-- 8. UPDATE EXISTING TABLES FOR MULTI-TENANCY
-- ============================================

-- Note: organization_id columns will be added to existing tables
-- (firms, users_teams, etc.) in a separate migration after verifying
-- that those tables exist. This keeps the SaaS schema independent.

-- ============================================
-- 9. AUDIT LOG
-- ============================================

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references auth.users(id),

  action text not null, -- 'create', 'update', 'delete', 'view'
  entity_type text not null, -- 'bill', 'customer', 'product', etc.
  entity_id uuid,

  old_values jsonb,
  new_values jsonb,

  ip_address text,
  user_agent text,

  created_at timestamptz default now()
);

create index idx_audit_org on audit_logs(organization_id);
create index idx_audit_date on audit_logs(created_at desc);

-- ============================================
-- 10. ANALYTICS
-- ============================================

create table if not exists org_analytics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations(id) on delete cascade,

  -- Monthly stats
  total_invoices integer default 0,
  total_revenue decimal default 0,
  avg_invoice_value decimal default 0,

  -- Customer stats
  total_customers integer default 0,
  active_customers integer default 0,
  repeat_customers integer default 0,

  -- Product stats
  total_products integer default 0,
  active_products integer default 0,

  -- Usage
  last_invoice_at timestamptz,
  days_since_activity integer,
  is_active boolean default true,

  updated_at timestamptz default now()
);

-- ============================================
-- 11. FEATURE FLAGS
-- ============================================

create table if not exists feature_flags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,

  feature_name text not null,
  is_enabled boolean default false,

  -- Global or organization-specific
  is_global boolean default false,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index idx_feature_flag on feature_flags(organization_id, feature_name);
