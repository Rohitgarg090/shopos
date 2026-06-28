-- CA Partner Phase 2: GST Payment Tracking
-- Track GST payments made by firms

CREATE TABLE IF NOT EXISTS ca_gst_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ca_id uuid NOT NULL REFERENCES ca_partners(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  month_year text NOT NULL, -- YYYY-MM format (the month GST is for)
  amount numeric NOT NULL,
  payment_date date NOT NULL,
  payment_method text CHECK (payment_method IN ('bank_transfer', 'cheque', 'neft', 'rtgs', 'imps', 'other')),
  reference_number text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(firm_id, month_year, payment_date, reference_number)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_gst_payments_firm_id ON ca_gst_payments(firm_id);
CREATE INDEX IF NOT EXISTS idx_gst_payments_ca_id ON ca_gst_payments(ca_id);
CREATE INDEX IF NOT EXISTS idx_gst_payments_month_year ON ca_gst_payments(month_year);
CREATE INDEX IF NOT EXISTS idx_gst_payments_payment_date ON ca_gst_payments(payment_date);

-- Enable RLS
ALTER TABLE ca_gst_payments ENABLE ROW LEVEL SECURITY;

-- CA can view GST payments for their linked clients
CREATE POLICY "ca_sees_gst_payments" ON ca_gst_payments
  FOR SELECT USING (
    ca_id = (SELECT id FROM ca_partners WHERE user_id = auth.uid())
  );

-- CA can insert GST payments
CREATE POLICY "ca_can_create_gst_payments" ON ca_gst_payments
  FOR INSERT WITH CHECK (
    ca_id = (SELECT id FROM ca_partners WHERE user_id = auth.uid())
  );

-- CA can update GST payments
CREATE POLICY "ca_can_update_gst_payments" ON ca_gst_payments
  FOR UPDATE USING (
    ca_id = (SELECT id FROM ca_partners WHERE user_id = auth.uid())
  );

-- CA can delete GST payments
CREATE POLICY "ca_can_delete_gst_payments" ON ca_gst_payments
  FOR DELETE USING (
    ca_id = (SELECT id FROM ca_partners WHERE user_id = auth.uid())
  );
