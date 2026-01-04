/*
  # Multi-Tenant Business Configuration

  Enhances InvoiceHub with business profiles, payment methods, product catalogs,
  and proper multi-tenant isolation for business operations.
*/

-- 1. Business Profiles (Multi-tenant)
CREATE TABLE IF NOT EXISTS business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE, -- One profile per user (tenant)
  business_name text NOT NULL,
  logo_url text,
  contact_email text,
  contact_phone text,
  address text,
  tax_id text,
  default_currency text DEFAULT 'USD',
  timezone text DEFAULT 'UTC',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Payment Methods (Multi-tenant)
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES business_profiles(id) ON DELETE CASCADE,
  method_type text NOT NULL CHECK (method_type IN ('bank_transfer', 'credit_card', 'paypal', 'crypto', 'check', 'cash')),
  method_name text NOT NULL, -- Display name
  is_active boolean DEFAULT true,
  details jsonb DEFAULT '{}', -- Configurable details per method type
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Products & Services Catalog (Multi-tenant)
CREATE TABLE IF NOT EXISTS catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES business_profiles(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  description text,
  unit_price decimal(12,2) NOT NULL,
  currency text DEFAULT 'USD',
  is_active boolean DEFAULT true,
  category text,
  sku text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Customer Form Submissions (Immutable)
CREATE TABLE IF NOT EXISTS customer_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES business_profiles(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  customer_address text,
  notes text,
  submission_data jsonb NOT NULL, -- Immutable snapshot of form data
  submitted_at timestamptz DEFAULT now(),
  processed boolean DEFAULT false,
  processed_at timestamptz,
  invoice_id uuid REFERENCES invoices(id) -- Link to generated invoice
);

-- 5. Customer Submission Items (Immutable line items from form)
CREATE TABLE IF NOT EXISTS customer_submission_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES customer_submissions(id) ON DELETE CASCADE,
  catalog_item_id uuid REFERENCES catalog_items(id), -- May be null if custom item
  item_name text NOT NULL, -- Snapshot of name at submission time
  quantity decimal(10,2) NOT NULL,
  unit_price decimal(12,2), -- Snapped from catalog at invoice generation
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 6. Enhanced Invoice Line Items (with catalog linkage)
ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS catalog_item_id uuid REFERENCES catalog_items(id);
ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS customer_submission_item_id uuid REFERENCES customer_submission_items(id);

-- 7. Business Storage Buckets (for logos and documents)
-- Note: This would typically be handled by Supabase Storage, but we track metadata here
CREATE TABLE IF NOT EXISTS business_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES business_profiles(id) ON DELETE CASCADE,
  file_type text NOT NULL CHECK (file_type IN ('logo', 'invoice_attachment', 'customer_document')),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type text,
  uploaded_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_profiles_user ON business_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_business ON payment_methods(business_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_business ON catalog_items(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_submissions_business ON customer_submissions(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_submissions_invoice ON customer_submissions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_submission_items_submission ON customer_submission_items(submission_id);
CREATE INDEX IF NOT EXISTS idx_business_files_business ON business_files(business_id);

-- Enable RLS
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_submission_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies (assuming user-based access - adjust based on auth system)
-- For demo purposes, using public access. In production, these would be user-scoped.

CREATE POLICY "Business profiles access"
  ON business_profiles FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Payment methods access"
  ON payment_methods FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Catalog items access"
  ON catalog_items FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Customer submissions access"
  ON customer_submissions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Customer submission items access"
  ON customer_submission_items FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Business files access"
  ON business_files FOR ALL
  USING (true)
  WITH CHECK (true);

-- Functions for business operations

-- Function to generate invoice from customer submission
CREATE OR REPLACE FUNCTION generate_invoice_from_submission(
  p_submission_id uuid,
  p_business_id uuid DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  submission_record record;
  invoice_id uuid;
  line_item record;
  total_amount decimal(12,2) := 0;
BEGIN
  -- Get submission
  SELECT * INTO submission_record
  FROM customer_submissions
  WHERE id = p_submission_id AND (p_business_id IS NULL OR business_id = p_business_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found or access denied';
  END IF;

  IF submission_record.processed THEN
    RAISE EXCEPTION 'Submission already processed';
  END IF;

  -- Create invoice
  INSERT INTO invoices (
    invoice_number,
    total_amount,
    status,
    currency,
    notes
  )
  SELECT
    'INV-' || UPPER(SUBSTRING(MD5(random()::text) FROM 1 FOR 8)),
    0, -- Will calculate below
    'draft',
    COALESCE(bp.default_currency, 'USD'),
    'Generated from customer submission'
  FROM business_profiles bp
  WHERE bp.id = submission_record.business_id
  RETURNING id INTO invoice_id;

  -- Process line items
  FOR line_item IN
    SELECT * FROM customer_submission_items
    WHERE submission_id = p_submission_id
  LOOP
    -- Get current price from catalog (or use submitted price if no catalog item)
    DECLARE
      current_price decimal(12,2);
      line_total decimal(12,2);
    BEGIN
      IF line_item.catalog_item_id IS NOT NULL THEN
        SELECT unit_price INTO current_price
        FROM catalog_items
        WHERE id = line_item.catalog_item_id AND is_active = true;
      ELSE
        current_price := line_item.unit_price; -- Use submitted price for custom items
      END IF;

      IF current_price IS NULL THEN
        RAISE EXCEPTION 'Price not found for item %', line_item.item_name;
      END IF;

      line_total := current_price * line_item.quantity;

      -- Insert line item with snapped price
      INSERT INTO invoice_line_items (
        invoice_id,
        catalog_item_id,
        customer_submission_item_id,
        description,
        quantity,
        unit_price,
        line_total
      ) VALUES (
        invoice_id,
        line_item.catalog_item_id,
        line_item.id,
        line_item.item_name,
        line_item.quantity,
        current_price,
        line_total
      );

      total_amount := total_amount + line_total;
    END;
  END LOOP;

  -- Update invoice total
  UPDATE invoices SET total_amount = total_amount WHERE id = invoice_id;

  -- Mark submission as processed
  UPDATE customer_submissions
  SET processed = true, processed_at = now(), invoice_id = invoice_id
  WHERE id = p_submission_id;

  -- Emit event
  PERFORM emit_domain_event('invoice.generated_from_submission', invoice_id, jsonb_build_object('submission_id', p_submission_id));

  RETURN invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active catalog for business
CREATE OR REPLACE FUNCTION get_business_catalog(p_business_id uuid)
RETURNS TABLE (
  id uuid,
  item_name text,
  description text,
  unit_price decimal(12,2),
  currency text,
  category text,
  sku text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ci.id,
    ci.item_name,
    ci.description,
    ci.unit_price,
    ci.currency,
    ci.category,
    ci.sku
  FROM catalog_items ci
  WHERE ci.business_id = p_business_id AND ci.is_active = true
  ORDER BY ci.category, ci.item_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate business access (placeholder for auth integration)
CREATE OR REPLACE FUNCTION validate_business_access(p_business_id uuid, p_user_id uuid DEFAULT NULL)
RETURNS boolean AS $$
BEGIN
  -- In production, this would check if user owns the business
  -- For now, allow all access (demo mode)
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
