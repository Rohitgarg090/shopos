-- SECURITY: lock every business table to members of its own firm.
-- Replaces whatever policies exist today (several were "using (true)", readable by anyone
-- with the public anon key). The server's service-role key bypasses RLS, so admin/CA/payment
-- routes are unaffected. Safe to run more than once.

-- 1. Is the logged-in user the owner or an active member of this firm?
create or replace function public.is_firm_member(fid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select fid is not null and auth.uid() is not null and (
    exists (select 1 from firms f where f.id = fid and f.owner_id = auth.uid())
    or exists (select 1 from firm_members m where m.firm_id = fid and m.user_id = auth.uid() and m.status = 'active')
  );
$$;
create or replace function public.is_firm_owner(fid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select fid is not null and exists (select 1 from firms f where f.id = fid and f.owner_id = auth.uid());
$$;
revoke all on function public.is_firm_member(uuid) from public, anon;
revoke all on function public.is_firm_owner(uuid) from public, anon;
grant execute on function public.is_firm_member(uuid) to authenticated;
grant execute on function public.is_firm_owner(uuid) to authenticated;

-- helper: drop every existing policy on a table
create or replace function pg_temp.drop_policies(tbl text) returns void language plpgsql as $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = tbl loop
    execute format('drop policy %I on public.%I', p.policyname, tbl);
  end loop;
end $$;

-- 1b. Older payment rows were saved without firm_id; fill it in so they stay visible
update payments p set firm_id = b.firm_id from bills b
  where p.firm_id is null and p.bill_id = b.id;
update payments p set firm_id = c.firm_id from customers c
  where p.firm_id is null and p.customer_id is not null and c.id::text = p.customer_id::text and c.firm_id is not null;
update payments p set firm_id = x.firm_id
  from (select upper(trim(supplier_name)) as n, (array_agg(distinct firm_id))[1] as firm_id, count(distinct firm_id) as k
        from supplier_invoices where firm_id is not null group by 1) x
  where p.firm_id is null and p.payment_type = 'supplier' and upper(trim(p.supplier_id)) = x.n and x.k = 1;

-- 2. Tables with a firm_id: firm members only (read + write)
do $$
declare t text;
begin
  foreach t in array array[
    'bills','customers','products','payments','supplier_invoices','returns','cheque_records',
    'bank_statements','customer_statements','e_invoices','notification_log','recon_sessions',
    'recon_transactions','supplier_statements','supplier_recon_sessions','supplier_recon_transactions'
  ] loop
    if to_regclass('public.' || t) is null then continue; end if;
    perform pg_temp.drop_policies(t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy firm_members_only on public.%I for all to authenticated using (public.is_firm_member(firm_id)) with check (public.is_firm_member(firm_id))', t);
  end loop;
end $$;

-- 3. Child tables: follow their parent row
select pg_temp.drop_policies('bill_items');
alter table public.bill_items enable row level security;
create policy firm_members_only on public.bill_items for all to authenticated
  using (exists (select 1 from bills b where b.id = bill_id and public.is_firm_member(b.firm_id)))
  with check (exists (select 1 from bills b where b.id = bill_id and public.is_firm_member(b.firm_id)));

select pg_temp.drop_policies('return_items');
alter table public.return_items enable row level security;
create policy firm_members_only on public.return_items for all to authenticated
  using (exists (select 1 from returns r where r.id = return_id and public.is_firm_member(r.firm_id)))
  with check (exists (select 1 from returns r where r.id = return_id and public.is_firm_member(r.firm_id)));

select pg_temp.drop_policies('recon_payment_locks');
alter table public.recon_payment_locks enable row level security;
create policy firm_members_only on public.recon_payment_locks for all to authenticated
  using (exists (select 1 from recon_sessions s where s.id = session_id and public.is_firm_member(s.firm_id)))
  with check (exists (select 1 from recon_sessions s where s.id = session_id and public.is_firm_member(s.firm_id)));

do $$ begin
  if to_regclass('public.supplier_recon_invoice_locks') is not null then
    perform pg_temp.drop_policies('supplier_recon_invoice_locks');
    alter table public.supplier_recon_invoice_locks enable row level security;
    create policy firm_members_only on public.supplier_recon_invoice_locks for all to authenticated
      using (exists (select 1 from supplier_recon_sessions s where s.id = session_id and public.is_firm_member(s.firm_id)))
      with check (exists (select 1 from supplier_recon_sessions s where s.id = session_id and public.is_firm_member(s.firm_id)));
  end if;
end $$;

-- 4. firm_settings holds portal passwords, API keys and bank details: owner only.
--    (Staff-facing routes read it with the server key after checking membership.)
select pg_temp.drop_policies('firm_settings');
alter table public.firm_settings enable row level security;
create policy owner_only on public.firm_settings for all to authenticated
  using (public.is_firm_owner(firm_id)) with check (public.is_firm_owner(firm_id));

-- 5. Server-only tables: RLS on with no policies = no access except the service-role key
do $$
declare t text;
begin
  foreach t in array array['sandbox_auth_tokens','password_reset_tokens','coupon_codes','coupon_usage',
    'audit_logs','data_migrations','feature_flags','onboarding_tasks','org_analytics','system_announcements'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    perform pg_temp.drop_policies(t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- 6. Stock functions ran with full privileges for anyone: restrict to the firm's own products
create or replace function public.decrement_stock(p_sku text, p_qty integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  update products set qty = greatest(0, qty - p_qty)
  where sku = p_sku and (auth.uid() is null or public.is_firm_member(firm_id));
end $$;
create or replace function public.increment_stock(p_sku text, p_qty integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  update products set qty = qty + p_qty
  where sku = p_sku and (auth.uid() is null or public.is_firm_member(firm_id));
end $$;
revoke all on function public.decrement_stock(text, integer) from public, anon;
revoke all on function public.increment_stock(text, integer) from public, anon;
grant execute on function public.decrement_stock(text, integer) to authenticated;
grant execute on function public.increment_stock(text, integer) to authenticated;
grant execute on function public.decrement_stock(text, integer) to service_role;
grant execute on function public.increment_stock(text, integer) to service_role;

-- 7. Rate limiting for public routes (password reset, OTPs, sign-up). Server-only.
create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  hits integer not null default 0
);
alter table public.rate_limits enable row level security;

create or replace function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_hits integer;
begin
  insert into rate_limits (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when rate_limits.window_start < now() - make_interval(secs => p_window_seconds) then 1 else rate_limits.hits + 1 end,
    window_start = case when rate_limits.window_start < now() - make_interval(secs => p_window_seconds) then now() else rate_limits.window_start end
  returning hits into v_hits;
  return v_hits <= p_limit;
end $$;
revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;

-- old counters are useless after a day
delete from public.rate_limits where window_start < now() - interval '1 day';

notify pgrst, 'reload schema';

-- Payments still without a firm (should be 0; these would be hidden)
select count(*) as payments_without_firm from payments where firm_id is null;

-- Check: every table above should show rls_enabled = true and no "true" policies
select c.relname as table_name, c.relrowsecurity as rls_enabled,
       coalesce(string_agg(p.policyname || ' [' || p.qual || ']', '; '), '(server only)') as policies
from pg_class c join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
left join pg_policies p on p.tablename = c.relname and p.schemaname = 'public'
where c.relkind = 'r' and c.relname in ('bills','bill_items','customers','products','payments','firm_settings',
  'recon_sessions','returns','return_items','supplier_invoices','coupon_codes','password_reset_tokens')
group by c.relname, c.relrowsecurity order by c.relname;
