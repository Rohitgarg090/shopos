-- Add all missing columns to firm_settings table
-- This enables saving business settings: name, GSTIN, email, bank details, invoice settings, etc.

-- Basic firm info
ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS user_id uuid;

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS firm_id uuid;

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS name text;

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS shoptype text DEFAULT 'Wholesale';

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS gstin text;

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS address text;

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS mobile text;

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS city text;

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS state text DEFAULT 'Madhya Pradesh';

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS state_code text;

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS pincode text;

-- Email & communication
ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS sender_email text;

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS email_subject text;

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS email_body text;

-- Banking & finance
ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS bank_name text;

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS bank_account text;

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS bank_ifsc text;

-- Invoice settings
ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS invoice_prefix text DEFAULT 'INV';

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS invoice_seq integer DEFAULT 1;

-- API Keys & integrations
ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS gemini_key text;

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS ewb_username text;

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS ewb_password text;

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS msg91_key text;

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS msg91_sms_template text;

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS msg91_wa_template text;

-- Logo & branding
ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS logo text;

-- Features & flags
ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS interest_enabled boolean DEFAULT false;

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS interest_on_opening_balance boolean DEFAULT false;

ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS notif_enabled boolean DEFAULT true;

-- Timestamps
ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Terms & conditions
ALTER TABLE IF EXISTS firm_settings
ADD COLUMN IF NOT EXISTS terms text;
