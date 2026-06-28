-- Add GST Portal credentials for GSTR-2B reconciliation via Sandbox API

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS gst_portal_username text;

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS gst_portal_password text;

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS gst_credentials_updated_at timestamptz;
