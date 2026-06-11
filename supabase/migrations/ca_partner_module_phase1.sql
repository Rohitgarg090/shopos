-- CA Partner Module Phase 1 Migration
-- Created: 2026-06-11
-- Tables: ca_partners, ca_client_links, ca_annotations, ca_reminder_logs

-- ============================================
-- 1. CA PARTNERS TABLE
-- ============================================
create table if not exists ca_partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  phone text not null unique,
  firm_name text,
  gstin text,
  pan text,
  address text,
  city text,
  state text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint email_format check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  constraint phone_format check (phone ~* '^\+?[0-9]{10,}$')
);

alter table ca_partners enable row level security;

-- CA sees only their own profile
create policy "ca_sees_own_profile" on ca_partners
  for select using (user_id = auth.uid());

create policy "ca_can_update_own_profile" on ca_partners
  for update using (user_id = auth.uid());

-- Allow shop owner to see CA they invited (for display purposes)
create policy "shop_owner_sees_invited_ca" on ca_partners
  for select using (
    id in (
      select ca_id from ca_client_links
      where created_by = auth.uid()
    )
  );

create index idx_ca_partners_user_id on ca_partners(user_id);
create index idx_ca_partners_email on ca_partners(email);
create index idx_ca_partners_phone on ca_partners(phone);

-- ============================================
-- 2. CA CLIENT LINKS TABLE
-- ============================================
create table if not exists ca_client_links (
  id uuid primary key default gen_random_uuid(),
  ca_id uuid not null references ca_partners(id) on delete cascade,
  firm_id uuid not null references public.firms(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  created_by uuid not null references auth.users(id),  -- shop owner who sent invite
  updated_at timestamptz default now(),

  unique(ca_id, firm_id),
  constraint firm_belongs_to_owner check (
    created_by in (
      select user_id from public.firms where id = firm_id
    )
  )
);

alter table ca_client_links enable row level security;

-- CA sees only their own links
create policy "ca_sees_own_links" on ca_client_links
  for select using (
    ca_id = (select id from ca_partners where user_id = auth.uid())
  );

-- CA can update their own links (to accept/reject)
create policy "ca_can_update_own_links" on ca_client_links
  for update using (
    ca_id = (select id from ca_partners where user_id = auth.uid())
  );

-- Shop owner sees links they created
create policy "owner_sees_own_invites" on ca_client_links
  for select using (created_by = auth.uid());

-- Shop owner can delete links they created
create policy "owner_can_delete_own_invites" on ca_client_links
  for delete using (created_by = auth.uid());

create index idx_ca_client_links_ca_id on ca_client_links(ca_id);
create index idx_ca_client_links_firm_id on ca_client_links(firm_id);
create index idx_ca_client_links_status on ca_client_links(status);
create index idx_ca_client_links_created_by on ca_client_links(created_by);

-- ============================================
-- 3. CA ANNOTATIONS TABLE (Schema only, Phase 3 UI)
-- ============================================
create table if not exists ca_annotations (
  id uuid primary key default gen_random_uuid(),
  ca_id uuid not null references ca_partners(id) on delete cascade,
  firm_id uuid not null references public.firms(id) on delete cascade,
  bill_id uuid not null references public.bills(id) on delete cascade,
  annotation text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table ca_annotations enable row level security;

-- CA can see annotations on their linked clients' bills
create policy "ca_sees_own_annotations" on ca_annotations
  for select using (
    ca_id = (select id from ca_partners where user_id = auth.uid())
  );

-- CA can insert annotations on their linked clients' bills
create policy "ca_can_create_annotations" on ca_annotations
  for insert with check (
    ca_id = (select id from ca_partners where user_id = auth.uid())
    and firm_id in (
      select firm_id from ca_client_links
      where ca_id = (select id from ca_partners where user_id = auth.uid())
      and status = 'accepted'
    )
  );

-- Shop owner sees annotations from linked CA
create policy "owner_sees_ca_annotations" on ca_annotations
  for select using (
    firm_id in (
      select id from public.firms where user_id = auth.uid()
    )
  );

create index idx_ca_annotations_ca_id on ca_annotations(ca_id);
create index idx_ca_annotations_bill_id on ca_annotations(bill_id);
create index idx_ca_annotations_firm_id on ca_annotations(firm_id);

-- ============================================
-- 4. CA REMINDER LOGS TABLE (Audit trail)
-- ============================================
create table if not exists ca_reminder_logs (
  id uuid primary key default gen_random_uuid(),
  ca_id uuid not null references ca_partners(id) on delete cascade,
  firm_id uuid not null references public.firms(id) on delete cascade,
  client_id uuid references public.customers(id),  -- optional, for per-client tracking
  message_type text check (message_type in ('whatsapp', 'email')),
  recipient_phone text,
  recipient_email text,
  message_content text not null,
  status text check (status in ('sent', 'failed', 'pending')),
  error_message text,
  sent_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table ca_reminder_logs enable row level security;

-- CA sees only their own reminder logs
create policy "ca_sees_own_reminder_logs" on ca_reminder_logs
  for select using (
    ca_id = (select id from ca_partners where user_id = auth.uid())
  );

-- Shop owner sees reminders sent to their firm
create policy "owner_sees_reminders_to_firm" on ca_reminder_logs
  for select using (
    firm_id in (select id from public.firms where user_id = auth.uid())
  );

create index idx_ca_reminder_logs_ca_id on ca_reminder_logs(ca_id);
create index idx_ca_reminder_logs_firm_id on ca_reminder_logs(firm_id);
create index idx_ca_reminder_logs_sent_at on ca_reminder_logs(sent_at);

-- ============================================
-- 5. UPDATE PRODUCTS TABLE - Add GST Rate
-- ============================================
alter table if exists public.products
  add column if not exists gst_rate integer default 18 check (gst_rate in (0, 5, 12, 18, 28));

create index if not exists idx_products_gst_rate on public.products(gst_rate);

-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================
grant usage on schema public to authenticated;
grant all privileges on table ca_partners to authenticated;
grant all privileges on table ca_client_links to authenticated;
grant all privileges on table ca_annotations to authenticated;
grant all privileges on table ca_reminder_logs to authenticated;

-- ============================================
-- 7. HELPER FUNCTION: Get CA Status for Client
-- ============================================
create or replace function get_ca_dashboard_status(p_firm_id uuid, p_month_year text)
returns table (
  client_id uuid,
  sales_count bigint,
  purchases_count bigint,
  last_invoice_date date,
  status text
) as $$
declare
  v_month_start date;
  v_month_end date;
begin
  -- Parse month_year (YYYY-MM format)
  v_month_start := (p_month_year || '-01')::date;
  v_month_end := (v_month_start + interval '1 month' - interval '1 day')::date;

  return query
  select
    c.id,
    (select count(*) from public.bills where firm_id = p_firm_id and customer_id = c.id and date >= v_month_start and date <= v_month_end)::bigint as sales_count,
    (select count(*) from public.bills where firm_id = p_firm_id and is_purchase = true and date >= v_month_start and date <= v_month_end)::bigint as purchases_count,
    (select max(date) from public.bills where firm_id = p_firm_id and customer_id = c.id)::date as last_invoice_date,
    case
      when (select count(*) from public.bills where firm_id = p_firm_id and customer_id = c.id and date >= v_month_start and date <= v_month_end) > 0
        and (select count(*) from public.bills where firm_id = p_firm_id and is_purchase = true and date >= v_month_start and date <= v_month_end) > 0
      then 'green'
      when (select max(date) from public.bills where firm_id = p_firm_id and customer_id = c.id)::date < current_date - interval '5 days'
      then 'amber'
      else 'red'
    end as status
  from public.customers c
  where c.firm_id = p_firm_id;
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================
-- 8. HELPER FUNCTION: Check CA Access
-- ============================================
create or replace function check_ca_firm_access(p_ca_id uuid, p_firm_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from ca_client_links
    where ca_id = p_ca_id
      and firm_id = p_firm_id
      and status = 'accepted'
  );
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
