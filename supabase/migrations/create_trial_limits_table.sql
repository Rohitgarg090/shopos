-- Trial Limits Table (for tracking free trial usage and feature limits)
CREATE TABLE trial_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Trial tracking
  is_trial BOOLEAN DEFAULT TRUE,
  trial_started_at TIMESTAMP DEFAULT NOW(),
  trial_ends_at TIMESTAMP,
  
  -- Subscription tier (free_trial, basic, business, business_pro)
  subscription_plan TEXT DEFAULT 'free_trial' CHECK(subscription_plan IN ('free_trial', 'basic', 'business', 'business_pro')),
  subscription_started_at TIMESTAMP,
  
  -- AI Invoice Scanning limits per trial (10 total for free trial)
  ai_scans_used INT DEFAULT 0,
  ai_scans_limit INT DEFAULT 10, -- Free trial: 10, Basic: 50/month, Business+: unlimited
  
  -- e-Way bill integration limits (5 total for free trial)
  eway_files_used INT DEFAULT 0,
  eway_files_limit INT DEFAULT 5, -- Free trial: 5, Business+: unlimited
  
  -- e-Invoice generation limits (5 total for free trial)
  einvoice_files_used INT DEFAULT 0,
  einvoice_files_limit INT DEFAULT 5, -- Free trial: 5, Business+: unlimited
  
  -- Monthly resets (for counting monthly limits like Basic plan's 50 AI scans/month)
  current_month_starts_at TIMESTAMP,
  ai_scans_used_this_month INT DEFAULT 0,
  eway_files_used_this_month INT DEFAULT 0,
  einvoice_files_used_this_month INT DEFAULT 0,
  
  -- Firm limits
  firm_count_limit INT DEFAULT 1, -- 1 for trial/basic, 3 for business, unlimited for pro
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_trial_limits_user_id ON trial_limits(user_id);
CREATE INDEX idx_trial_limits_trial_ends_at ON trial_limits(trial_ends_at);
CREATE INDEX idx_trial_limits_subscription_plan ON trial_limits(subscription_plan);

-- Enable RLS
ALTER TABLE trial_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own trial limits
CREATE POLICY "Users can view own trial limits" ON trial_limits
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own trial limits" ON trial_limits
  FOR UPDATE
  USING (auth.uid() = user_id);
