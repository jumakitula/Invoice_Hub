/*
  # Invoice Management System Schema

  1. New Tables
    - suppliers: Stores supplier/vendor information
    - purchase_orders: Tracks purchase orders for matching
    - invoices: Main invoice records with validation flags
    - invoice_line_items: Individual line items per invoice
    - invoice_validations: Tracks validation issues
    - invoice_approvals: Approval workflow history

  2. Security
    - RLS enabled on all tables
    - Public access policies for demo purposes
*/

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  tax_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text UNIQUE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  total_amount decimal(12,2),
  status text DEFAULT 'open',
  created_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  po_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
  invoice_date date,
  due_date date,
  subtotal decimal(12,2),
  tax_amount decimal(12,2),
  total_amount decimal(12,2) NOT NULL,
  currency text DEFAULT 'USD',
  status text DEFAULT 'draft',
  file_path text,
  file_type text,
  ocr_processed boolean DEFAULT false,
  has_validation_issues boolean DEFAULT false,
  is_duplicate boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create invoice_line_items table
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  description text,
  quantity decimal(10,2),
  unit_price decimal(12,2),
  line_total decimal(12,2),
  tax_rate decimal(5,2),
  created_at timestamptz DEFAULT now()
);

-- Create invoice_validations table
CREATE TABLE IF NOT EXISTS invoice_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  validation_type text NOT NULL,
  severity text DEFAULT 'warning',
  message text,
  field_name text,
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create invoice_approvals table
CREATE TABLE IF NOT EXISTS invoice_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  approver_email text,
  approved_at timestamptz,
  comments text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_line_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_validations_invoice ON invoice_validations(invoice_id);
CREATE INDEX IF NOT EXISTS idx_approvals_invoice ON invoice_approvals(invoice_id);

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_approvals ENABLE ROW LEVEL SECURITY;

-- Create policies for suppliers
CREATE POLICY "Public access to suppliers"
  ON suppliers FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create policies for purchase_orders
CREATE POLICY "Public access to purchase orders"
  ON purchase_orders FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create policies for invoices
CREATE POLICY "Public access to invoices"
  ON invoices FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create policies for invoice_line_items
CREATE POLICY "Public access to line items"
  ON invoice_line_items FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create policies for invoice_validations
CREATE POLICY "Public access to validations"
  ON invoice_validations FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create policies for invoice_approvals
CREATE POLICY "Public access to approvals"
  ON invoice_approvals FOR ALL
  USING (true)
  WITH CHECK (true);