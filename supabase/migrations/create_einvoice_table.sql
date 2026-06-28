-- e-Invoice Management Table
-- Stores e-Invoice data generated via Sandbox API

CREATE TABLE IF NOT EXISTS e_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  bill_id integer NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,

  -- e-Invoice identifiers
  irn text UNIQUE NOT NULL,
  ack_no text,

  -- Invoice data
  signed_invoice_json text,
  qr_code_url text,

  -- Status tracking
  status text CHECK (status IN ('generated', 'cancelled', 'rejected', 'pending')) DEFAULT 'pending',
  error_message text,

  -- Sync status
  synced_to_gstr1 boolean DEFAULT false,
  synced_to_ewb boolean DEFAULT false,
  synced_to_gst boolean DEFAULT false,

  -- Timestamps
  generated_at timestamptz DEFAULT now(),
  cancelled_at timestamptz,
  acknowledged_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),

  -- Audit
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for faster queries
CREATE INDEX idx_e_invoices_firm_id ON e_invoices(firm_id);
CREATE INDEX idx_e_invoices_bill_id ON e_invoices(bill_id);
CREATE INDEX idx_e_invoices_irn ON e_invoices(irn);
CREATE INDEX idx_e_invoices_status ON e_invoices(status);
CREATE INDEX idx_e_invoices_created_at ON e_invoices(created_at DESC);

-- RLS is disabled - access control is handled at API level via firmId from context
-- This follows the same pattern as bills, customers, and other tables in the codebase
