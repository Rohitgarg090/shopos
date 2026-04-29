-- =====================================================
-- ShopOS Schema v2 — run in Supabase SQL Editor
-- =====================================================

-- (Keep existing tables: products, customers, bills, bill_items)
-- Run schema.sql first if starting fresh, then this file.

-- FIRM SETTINGS (single row)
create table if not exists firm_settings (
  id        integer primary key default 1,
  firm_name text    default 'My Garments',
  gstin     text,
  address   text,
  mobile    text,
  email     text,
  city      text    default 'Jabalpur',
  state     text    default 'Madhya Pradesh',
  pincode   text,
  terms     text    default '1. Subject to local jurisdiction.
2. Goods once sold will not be taken back in any case.
3. Add 18% interest if payment not done in 45 days.
4. All disputes subject to local court only.',
  constraint single_row check (id = 1)
);
insert into firm_settings (id) values (1) on conflict do nothing;

-- PAYMENTS TABLE
create table if not exists payments (
  id            serial primary key,
  customer_id   text references customers(id) on delete set null,
  customer_name text    not null,
  mode          text    not null check (mode in ('cash','online','cheque')),
  amount        numeric(10,2) not null,
  amount_words  text,
  payment_date  date    not null default current_date,
  city          text,
  -- Online fields
  reference_no  text,
  online_mode   text,       -- PhonePay, GooglePay, NEFT, RTGS
  -- Cheque fields
  cheque_no     text,
  bank_name     text,
  received_date date,
  cheque_date   date,
  clearance_date date,
  area          text,
  notes         text,
  created_at    timestamptz default now()
);

-- Add invoice_no and gst_type to bills if not exists
alter table bills add column if not exists invoice_no    text;
alter table bills add column if not exists gst_type      text default 'cgst_sgst';
alter table bills add column if not exists is_dummy      boolean default false;
alter table bills add column if not exists customer_city text;

-- RLS policies for new tables
alter table payments     enable row level security;
alter table firm_settings enable row level security;
create policy "Allow all on payments"      on payments      for all using (true) with check (true);
create policy "Allow all on firm_settings" on firm_settings for all using (true) with check (true);

-- Indexes
create index if not exists idx_payments_customer on payments(customer_id);
create index if not exists idx_payments_date     on payments(payment_date desc);

-- Stock decrement function (safe upsert)
create or replace function decrement_stock(p_sku text, p_qty integer)
returns void language plpgsql security definer as $$
begin
  update products set qty = greatest(0, qty - p_qty) where sku = p_sku;
end;
$$;
