-- GSTR-2B Reconciliation tables

CREATE TABLE IF NOT EXISTS gstr2b_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ca_id uuid NOT NULL REFERENCES ca_partners(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  supplier_gstin text NOT NULL,
  supplier_name text,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  invoice_amount numeric NOT NULL,
  gst_amount numeric,
  hsn_sac text,
  fetched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(firm_id, month_year, supplier_gstin, invoice_number)
);

CREATE TABLE IF NOT EXISTS gstr2b_reconciliation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ca_id uuid NOT NULL REFERENCES ca_partners(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  gstr2b_invoice_id uuid REFERENCES gstr2b_data(id) ON DELETE CASCADE,
  purchase_invoice_number text,
  purchase_amount numeric,
  purchase_gst numeric,
  gstr2b_amount numeric,
  gstr2b_gst numeric,
  status text CHECK (status IN ('matched', 'mismatch', 'not_in_gstr2b', 'extra_in_gstr2b', 'pending', 'ignored', 'under_review')),
  amount_diff numeric,
  gst_diff numeric,
  notes text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_gstr2b_data_firm_month ON gstr2b_data(firm_id, month_year);
CREATE INDEX idx_gstr2b_data_gstin_invoice ON gstr2b_data(supplier_gstin, invoice_number);
CREATE INDEX idx_gstr2b_recon_firm_month ON gstr2b_reconciliation(firm_id, month_year);
CREATE INDEX idx_gstr2b_recon_status ON gstr2b_reconciliation(status);

-- Enable RLS
ALTER TABLE gstr2b_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE gstr2b_reconciliation ENABLE ROW LEVEL SECURITY;

-- CA can view GSTR-2B data for their linked clients
CREATE POLICY "ca_sees_gstr2b_data" ON gstr2b_data
  FOR SELECT USING (
    ca_id = (SELECT id FROM ca_partners WHERE user_id = auth.uid())
  );

CREATE POLICY "ca_can_create_gstr2b_data" ON gstr2b_data
  FOR INSERT WITH CHECK (
    ca_id = (SELECT id FROM ca_partners WHERE user_id = auth.uid())
  );

-- CA can view reconciliation
CREATE POLICY "ca_sees_gstr2b_reconciliation" ON gstr2b_reconciliation
  FOR SELECT USING (
    ca_id = (SELECT id FROM ca_partners WHERE user_id = auth.uid())
  );

CREATE POLICY "ca_can_update_gstr2b_reconciliation" ON gstr2b_reconciliation
  FOR UPDATE USING (
    ca_id = (SELECT id FROM ca_partners WHERE user_id = auth.uid())
  );
