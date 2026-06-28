-- CA Partner Phase 2: Compliance Calendar
-- Track GST filing deadlines, reminders, and completion status

CREATE TABLE IF NOT EXISTS ca_compliance_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ca_id uuid NOT NULL REFERENCES ca_partners(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  deadline_type text NOT NULL CHECK (deadline_type IN ('gstr1', 'gstr2b', 'gstr3b', 'itc04', 'gstr5', 'gstr6', 'monthly_return')),
  month_year text NOT NULL, -- YYYY-MM format
  due_date date NOT NULL,
  reminder_date date,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'missed')),
  notes text,
  reminded_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_compliance_firm_id ON ca_compliance_deadlines(firm_id);
CREATE INDEX IF NOT EXISTS idx_compliance_ca_id ON ca_compliance_deadlines(ca_id);
CREATE INDEX IF NOT EXISTS idx_compliance_month_year ON ca_compliance_deadlines(month_year);
CREATE INDEX IF NOT EXISTS idx_compliance_status ON ca_compliance_deadlines(status);
CREATE INDEX IF NOT EXISTS idx_compliance_firm_month ON ca_compliance_deadlines(firm_id, month_year);

-- Enable RLS
ALTER TABLE ca_compliance_deadlines ENABLE ROW LEVEL SECURITY;

-- CA can view compliance deadlines for their linked clients
CREATE POLICY "ca_sees_compliance_deadlines" ON ca_compliance_deadlines
  FOR SELECT USING (
    ca_id = (SELECT id FROM ca_partners WHERE user_id = auth.uid())
  );

-- CA can insert compliance deadlines for their linked clients
CREATE POLICY "ca_can_create_compliance_deadlines" ON ca_compliance_deadlines
  FOR INSERT WITH CHECK (
    ca_id = (SELECT id FROM ca_partners WHERE user_id = auth.uid())
  );

-- CA can update compliance deadlines
CREATE POLICY "ca_can_update_compliance_deadlines" ON ca_compliance_deadlines
  FOR UPDATE USING (
    ca_id = (SELECT id FROM ca_partners WHERE user_id = auth.uid())
  );

-- CA can delete compliance deadlines
CREATE POLICY "ca_can_delete_compliance_deadlines" ON ca_compliance_deadlines
  FOR DELETE USING (
    ca_id = (SELECT id FROM ca_partners WHERE user_id = auth.uid())
  );

-- Helper function to get deadline type display name
CREATE OR REPLACE FUNCTION get_deadline_display_name(deadline_type TEXT)
RETURNS TEXT AS $$
BEGIN
  CASE deadline_type
    WHEN 'gstr1' THEN RETURN 'GSTR-1 (Sales Register)';
    WHEN 'gstr2b' THEN RETURN 'GSTR-2B (Purchase Register)';
    WHEN 'gstr3b' THEN RETURN 'GSTR-3B (Summary)';
    WHEN 'itc04' THEN RETURN 'ITC-04 (Input Credit Notice)';
    WHEN 'gstr5' THEN RETURN 'GSTR-5 (Composition)';
    WHEN 'gstr6' THEN RETURN 'GSTR-6 (TDS/TCS)';
    WHEN 'monthly_return' THEN RETURN 'Monthly Return';
    ELSE RETURN deadline_type;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
