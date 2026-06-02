-- WhatsApp connections per firm
-- Stores encrypted session data and verified phone numbers

create table if not exists whatsapp_connections (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  phone_number text not null,
  is_verified boolean default false,
  otp text,
  otp_expires_at timestamptz,
  otp_attempts integer default 0,
  session_data text, -- encrypted Baileys session (JSON)
  session_status text default 'disconnected' check (session_status in ('disconnected', 'connecting', 'connected', 'failed')),
  last_activity timestamptz,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(firm_id, phone_number)
);

create index idx_wa_firm on whatsapp_connections(firm_id);
create index idx_wa_verified on whatsapp_connections(is_verified);
create index idx_wa_status on whatsapp_connections(session_status);

alter table whatsapp_connections enable row level security;
create policy "firm_own_whatsapp" on whatsapp_connections
  for all using (firm_id in (select firm_id from firm_members where user_id = auth.uid() and status = 'active'));
