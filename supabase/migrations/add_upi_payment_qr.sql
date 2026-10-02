-- Add UPI payment QR fields to firm_settings
alter table firm_settings add column if not exists upi_id text;
alter table firm_settings add column if not exists upi_qr_image text;

-- Create index for quick lookup (optional)
create index if not exists idx_firm_settings_upi on firm_settings(firm_id) where upi_id is not null;
