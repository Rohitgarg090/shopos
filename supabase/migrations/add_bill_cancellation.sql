-- Add cancellation support to bills table
alter table bills add column if not exists status text default 'active';
alter table bills add column if not exists cancelled_at timestamptz;
alter table bills add column if not exists cancel_reason text;

-- Create index for faster filtering
create index if not exists idx_bills_status on bills(status);
