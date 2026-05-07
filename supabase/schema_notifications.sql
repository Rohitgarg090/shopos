-- Notification logging and history

create table if not exists notification_log (
  id          uuid primary key default gen_random_uuid(),
  firm_id     uuid not null,
  customer_id uuid,
  bill_id     integer,
  type        text not null check (type in ('invoice','payment','reminder','broadcast')),
  channel     text not null check (channel in ('whatsapp','sms','both','failed')),
  mobile      text not null,
  message     text not null default '',
  status      text not null default 'sent' check (status in ('sent','failed','pending')),
  error       text default '',
  sent_at     timestamptz default now()
);

create index if not exists idx_notif_firm on notification_log(firm_id, sent_at desc);
create index if not exists idx_notif_customer on notification_log(customer_id);
create index if not exists idx_notif_bill on notification_log(bill_id);

alter table notification_log enable row level security;
create policy "firm notifications" on notification_log for all using (true) with check (true);
