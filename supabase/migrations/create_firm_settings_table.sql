-- Create firm_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS firm_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_id uuid,

  -- Firm Info
  name text,
  shoptype text DEFAULT 'Wholesale',
  gstin text,
  address text,
  mobile text,
  email text,
  city text,
  state text DEFAULT 'Madhya Pradesh',
  state_code text,
  pincode text,

  -- Email & Communication
  sender_email text,
  email_subject text,
  email_body text,

  -- Banking & Finance
  bank_name text,
  bank_account text,
  bank_ifsc text,

  -- Invoice Settings
  invoice_prefix text DEFAULT 'INV',
  invoice_seq integer DEFAULT 1,

  -- API Keys & Integrations
  gemini_key text,
  ewb_username text,
  ewb_password text,
  msg91_key text,
  msg91_sms_template text,
  msg91_wa_template text,

  -- Logo & Branding
  logo text,

  -- Features & Flags
  interest_enabled boolean DEFAULT false,
  interest_on_opening_balance boolean DEFAULT false,
  notif_enabled boolean DEFAULT true,

  -- Terms & Conditions
  terms text,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_firm_settings_user_id ON firm_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_firm_settings_firm_id ON firm_settings(firm_id);

-- Enable RLS
ALTER TABLE firm_settings ENABLE ROW LEVEL SECURITY;

-- Allow users to read/write their own settings
CREATE POLICY "Users can read their own settings" ON firm_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON firm_settings
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON firm_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
