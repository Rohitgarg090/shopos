-- ShopOS v3 Schema — Run in Supabase SQL Editor
create table if not exists products (
  id text primary key default gen_random_uuid()::text, name text not null,
  sku text unique not null, cat text not null default 'Others', sub text,
  size text default 'Free Size', color text, price numeric(10,2) not null default 0,
  gst integer not null default 5, qty integer not null default 0,
  hsn text, article_no text default '', created_at timestamptz default now()
);
create table if not exists customers (
  id text primary key default gen_random_uuid()::text, name text not null,
  phone text not null, shopname text, gst text, addr text, email text,
  created_at timestamptz default now()
);
create table if not exists bills (
  id serial primary key, invoice_no text unique,
  customer_id text references customers(id) on delete set null,
  customer_name text not null, customer_phone text, customer_gst text,
  customer_email text, customer_addr text, is_relative boolean default false,
  subtotal numeric(10,2) default 0, discount numeric(10,2) default 0,
  gst_total numeric(10,2) default 0, markup numeric(10,2) default 0,
  total numeric(10,2) not null default 0, bilty_no text default '',
  created_at timestamptz default now()
);
create table if not exists bill_items (
  id serial primary key, bill_id integer references bills(id) on delete cascade,
  product_sku text, name text not null, cat text, size text, color text,
  article_no text default '', qty integer not null, rate numeric(10,2) not null,
  gst_rate integer not null, gst_amt numeric(10,2) not null, total numeric(10,2) not null
);
create table if not exists payments (
  id serial primary key, bill_id integer references bills(id) on delete set null,
  mode text not null, amount numeric(10,2) not null, date date,
  party_name text, city text, remarks text,
  upi_app text default '', upi_ref text default '',
  cheque_no text default '', bank text default '',
  received_date date, cheque_date date, clearance_date date,
  area_name text default '', cheque_status text default '',
  created_at timestamptz default now()
);
create index if not exists idx_products_sku on products(sku);
create index if not exists idx_bills_invoice on bills(invoice_no);
create index if not exists idx_bills_created on bills(created_at desc);
create index if not exists idx_bill_items_bill on bill_items(bill_id);
create index if not exists idx_payments_bill on payments(bill_id);
alter table products enable row level security;
alter table customers enable row level security;
alter table bills enable row level security;
alter table bill_items enable row level security;
alter table payments enable row level security;
create policy "all products" on products for all using (true) with check (true);
create policy "all customers" on customers for all using (true) with check (true);
create policy "all bills" on bills for all using (true) with check (true);
create policy "all bill_items" on bill_items for all using (true) with check (true);
create policy "all payments" on payments for all using (true) with check (true);
insert into products (name,sku,cat,sub,size,color,price,gst,qty,hsn,article_no) values
  ('Boys Graphic Tshirt','100000001','Kids','T-Shirts','M','Blue',180,5,40,'6109','KID001'),
  ('Girls Floral Frock','100000002','Girls','Frocks','L','Pink',350,5,25,'6104','GRL002'),
  ('Mens Denim Jeans','100000003','Jeans','Regular','32','Dark Blue',650,12,30,'6203','JNS003'),
  ('Womens Kurti Set','100000004','Women','Kurti','M','Green',520,5,18,'6211','WOM004'),
  ('Mens Formal Shirt','100000005','Men','Shirts','L','White',420,12,22,'6205','MEN005'),
  ('Kids Hooded Jacket','100000006','Jackets','Hooded','L','Red',450,12,12,'6202','KID006')
on conflict (sku) do nothing;
