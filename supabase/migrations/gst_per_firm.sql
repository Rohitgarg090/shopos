-- Per-firm GST portal credentials + E-Way Bill history. Safe to run more than once.
alter table firm_settings add column if not exists einv_username text;
alter table firm_settings add column if not exists einv_password text;

alter table bills add column if not exists ewb_date timestamptz;
alter table bills add column if not exists ewb_cancelled_no text;
alter table bills add column if not exists ewb_cancelled_at timestamptz;
alter table bills add column if not exists ewb_cancel_reason text;

notify pgrst, 'reload schema';
