-- Bills: unique invoice numbers per firm + all-or-nothing save/cancel (bill, items, stock).
-- Run AFTER security_rls_lockdown.sql (uses is_firm_member). Safe to run more than once.

-- 0. The old rule made invoice numbers unique across ALL firms, so a second firm could never
--    create its own INV-001. Numbers must be unique per firm instead (next statement).
alter table public.bills drop constraint if exists bills_invoice_no_key;

-- 0b. Optional invoice details: delivery (ship-to) address, buyer's PO and destination
alter table public.bills add column if not exists ship_to jsonb;            -- null = same as billing address
alter table public.bills add column if not exists buyer_order_no text not null default '';
alter table public.bills add column if not exists buyer_order_date date;
alter table public.bills add column if not exists destination text not null default '';
alter table public.bills add column if not exists place_of_supply text not null default '';  -- state name; '' = seller's state
alter table public.bills add column if not exists gst_type text default 'cgst_sgst';           -- 'igst' when supplied to another state
-- Discount before GST: each line stores its share; taxable value = rate x qty - discount.
-- Older bills (false) took the discount off the final total after tax.
alter table public.bills add column if not exists discount_before_tax boolean not null default false;
alter table public.bill_items add column if not exists discount numeric not null default 0;

-- 1. Final safety net: an invoice number can exist only once per firm
create unique index if not exists bills_firm_invoice_unique
  on public.bills (firm_id, invoice_no)
  where invoice_no is not null and invoice_no <> '';

-- 2. Next number for a prefix = highest existing number + 1 (not "last created" + 1)
create or replace function public.next_invoice_no(p_firm_id uuid, p_prefix text)
returns text language sql stable set search_path = public as $$
  select p_prefix || '-' || lpad((coalesce(max((regexp_match(invoice_no, '(\d+)$'))[1]::bigint), 0) + 1)::text, 3, '0')
  from bills
  where firm_id = p_firm_id and left(invoice_no, length(p_prefix) + 1) = p_prefix || '-';
$$;

-- 3. Create a bill atomically. Runs as the caller, so firm RLS still applies.
create or replace function public.create_bill(p_firm_id uuid, p_prefix text, p_bill jsonb, p_items jsonb)
returns table (id integer, invoice_no text)
language plpgsql security invoker set search_path = public as $$
declare
  v_no text;
  v_id integer;
  v_date date;
  v_created timestamptz := now();
  r record;
begin
  if not public.is_firm_member(p_firm_id) then
    raise exception 'You are not a member of this firm' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A bill needs at least one item' using errcode = 'P0001';
  end if;

  -- one bill at a time per firm: numbering and stock checks can't interleave between counters
  perform pg_advisory_xact_lock(hashtextextended('shopos-bill:' || p_firm_id::text, 0));

  -- stock check (same product on several lines is summed)
  for r in
    select e->>'sku' as sku, max(e->>'name') as name, sum((e->>'qty')::numeric) as need
    from jsonb_array_elements(p_items) e
    where coalesce(e->>'sku', '') <> ''
    group by e->>'sku'
  loop
    perform 1 from products p where p.sku = r.sku and p.firm_id = p_firm_id and p.qty < r.need;
    if found then
      raise exception 'Not enough stock for % (needed %, available %)', r.name, r.need,
        (select p.qty from products p where p.sku = r.sku and p.firm_id = p_firm_id)
        using errcode = 'P0001';
    end if;
  end loop;

  -- Optional bill date (YYYY-MM-DD) for backdated invoices; never in the future (India time).
  if coalesce(p_bill->>'bill_date', '') <> '' then
    v_date := (p_bill->>'bill_date')::date;
    if v_date > (now() at time zone 'Asia/Kolkata')::date then
      raise exception 'Invoice date cannot be in the future' using errcode = 'P0001';
    end if;
    if v_date < (now() at time zone 'Asia/Kolkata')::date then
      v_created := (v_date::text || ' 12:00:00')::timestamp at time zone 'Asia/Kolkata';
    end if;
  end if;

  v_no := public.next_invoice_no(p_firm_id, p_prefix);

  insert into bills (invoice_no, customer_id, customer_name, customer_phone, customer_gst, customer_email,
                     customer_addr, is_relative, subtotal, discount, gst_total, markup, total,
                     transport_name, lr_number, firm_id, created_at,
                     ship_to, buyer_order_no, buyer_order_date, destination, place_of_supply, gst_type, discount_before_tax)
  values (v_no, nullif(p_bill->>'customer_id', ''), p_bill->>'customer_name', coalesce(p_bill->>'customer_phone', ''),
          coalesce(p_bill->>'customer_gst', ''), coalesce(p_bill->>'customer_email', ''), coalesce(p_bill->>'customer_addr', ''),
          coalesce((p_bill->>'is_relative')::boolean, false), coalesce((p_bill->>'subtotal')::numeric, 0),
          coalesce((p_bill->>'discount')::numeric, 0), coalesce((p_bill->>'gst_total')::numeric, 0),
          coalesce((p_bill->>'markup')::numeric, 0), coalesce((p_bill->>'total')::numeric, 0),
          coalesce(p_bill->>'transport_name', ''), coalesce(p_bill->>'lr_number', ''), p_firm_id, v_created,
          case when jsonb_typeof(p_bill->'ship_to') = 'object' then p_bill->'ship_to' end,
          coalesce(p_bill->>'buyer_order_no', ''), nullif(p_bill->>'buyer_order_date', '')::date,
          coalesce(p_bill->>'destination', ''), coalesce(p_bill->>'place_of_supply', ''),
          case when p_bill->>'gst_type' = 'igst' then 'igst' else 'cgst_sgst' end,
          coalesce((p_bill->>'discount_before_tax')::boolean, false))
  returning bills.id into v_id;

  insert into bill_items (bill_id, product_sku, name, cat, size, color, article_no, hsn, qty, rate, gst_rate, gst_amt, total, discount)
  select v_id, nullif(e->>'sku', ''), e->>'name', e->>'cat', e->>'size', coalesce(e->>'color', ''),
         coalesce(e->>'article_no', ''), coalesce(e->>'hsn', ''), (e->>'qty')::numeric::integer,
         coalesce((e->>'rate')::numeric, 0), coalesce((e->>'gst_rate')::numeric, 0)::integer,
         coalesce((e->>'gst_amt')::numeric, 0), coalesce((e->>'total')::numeric, 0), coalesce((e->>'discount')::numeric, 0)
  from jsonb_array_elements(p_items) e;

  update products p set qty = p.qty - x.need
  from (select e->>'sku' as sku, sum((e->>'qty')::numeric) as need
        from jsonb_array_elements(p_items) e where coalesce(e->>'sku', '') <> '' group by 1) x
  where p.sku = x.sku and p.firm_id = p_firm_id;

  return query select v_id, v_no;
end $$;

-- 4. Cancel a bill atomically: restore stock once, then mark cancelled
create or replace function public.cancel_bill(p_bill_id integer, p_reason text)
returns setof public.bills
language plpgsql security invoker set search_path = public as $$
declare b public.bills;
begin
  select * into b from bills where bills.id = p_bill_id for update;
  if not found or not public.is_firm_member(b.firm_id) then
    raise exception 'Bill not found' using errcode = 'P0002';
  end if;
  if b.status = 'cancelled' then
    raise exception 'Bill already cancelled' using errcode = 'P0001';
  end if;

  update products p set qty = p.qty + x.q
  from (select product_sku as sku, sum(qty) as q from bill_items
        where bill_id = p_bill_id and coalesce(product_sku, '') <> '' group by 1) x
  where p.sku = x.sku and p.firm_id = b.firm_id;

  return query
    update bills set status = 'cancelled', cancelled_at = now(), cancel_reason = coalesce(p_reason, '')
    where bills.id = p_bill_id returning *;
end $$;

revoke all on function public.create_bill(uuid, text, jsonb, jsonb) from public, anon;
revoke all on function public.cancel_bill(integer, text) from public, anon;
revoke all on function public.next_invoice_no(uuid, text) from public, anon;
grant execute on function public.create_bill(uuid, text, jsonb, jsonb) to authenticated, service_role;
grant execute on function public.cancel_bill(integer, text) to authenticated, service_role;
grant execute on function public.next_invoice_no(uuid, text) to authenticated, service_role;

notify pgrst, 'reload schema';
