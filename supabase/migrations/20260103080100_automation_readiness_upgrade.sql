/*
  # Automation Readiness Upgrade

  Enhances the Invoice Management System for n8n automation compatibility.
  Adds event-driven processing, webhooks, token-based approvals, and API key auth.
*/

-- Add automation fields to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'received';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS automation_source text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS external_reference_id text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS raw_document_url text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS extracted_data jsonb;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS extraction_confidence decimal(3,2);

-- Add automation fields to invoice_validations table
ALTER TABLE invoice_validations ADD COLUMN IF NOT EXISTS source text DEFAULT 'system';
ALTER TABLE invoice_validations ADD COLUMN IF NOT EXISTS rule_code text;
ALTER TABLE invoice_validations ADD COLUMN IF NOT EXISTS auto_resolvable boolean DEFAULT false;
ALTER TABLE invoice_validations ADD COLUMN IF NOT EXISTS resolved_by text;

-- Add token-based approval fields to invoice_approvals table
ALTER TABLE invoice_approvals ADD COLUMN IF NOT EXISTS approval_token text UNIQUE;
ALTER TABLE invoice_approvals ADD COLUMN IF NOT EXISTS approval_method text DEFAULT 'ui';
ALTER TABLE invoice_approvals ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Create webhook_events table for outgoing webhooks
CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  status text DEFAULT 'pending',
  retry_count integer DEFAULT 0,
  last_attempt_at timestamptz,
  next_retry_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create api_keys table for automation authentication
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_hash text UNIQUE NOT NULL,
  permissions jsonb DEFAULT '["read"]',
  is_active boolean DEFAULT true,
  created_by text,
  expires_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create automation_locks table for preventing concurrent processing
CREATE TABLE IF NOT EXISTS automation_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE UNIQUE,
  locked_by text NOT NULL,
  locked_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '5 minutes'),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_processing_status ON invoices(processing_status);
CREATE INDEX IF NOT EXISTS idx_invoices_external_ref ON invoices(external_reference_id);
CREATE INDEX IF NOT EXISTS idx_invoices_idempotency ON invoices(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_invoice ON webhook_events(invoice_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_retry ON webhook_events(next_retry_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_automation_locks_invoice ON automation_locks(invoice_id);
CREATE INDEX IF NOT EXISTS idx_automation_locks_expires ON automation_locks(expires_at);

-- Enable RLS on new tables
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_locks ENABLE ROW LEVEL SECURITY;

-- Create policies for webhook_events
CREATE POLICY "Service access to webhook events"
  ON webhook_events FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create policies for api_keys
CREATE POLICY "Service access to api keys"
  ON api_keys FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create policies for automation_locks
CREATE POLICY "Service access to automation locks"
  ON automation_locks FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add constraints
ALTER TABLE invoices ADD CONSTRAINT check_processing_status
  CHECK (processing_status IN ('received', 'extracting', 'extracted', 'validating', 'validation_failed', 'awaiting_approval', 'approved', 'rejected', 'posted', 'archived'));

ALTER TABLE invoice_validations ADD CONSTRAINT check_validation_source
  CHECK (source IN ('system', 'automation', 'user'));

ALTER TABLE invoice_approvals ADD CONSTRAINT check_approval_method
  CHECK (approval_method IN ('ui', 'email', 'api'));

ALTER TABLE webhook_events ADD CONSTRAINT check_webhook_status
  CHECK (status IN ('pending', 'sent', 'failed', 'expired'));

-- Create function to emit webhook events
CREATE OR REPLACE FUNCTION emit_webhook_event(
  p_event_type text,
  p_invoice_id uuid,
  p_payload jsonb DEFAULT '{}'
) RETURNS uuid AS $$
DECLARE
  event_id uuid;
BEGIN
  INSERT INTO webhook_events (event_type, invoice_id, payload)
  VALUES (p_event_type, p_invoice_id, p_payload)
  RETURNING id INTO event_id;

  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update processing status and emit events
CREATE OR REPLACE FUNCTION update_invoice_processing_status(
  p_invoice_id uuid,
  p_new_status text,
  p_payload jsonb DEFAULT '{}'
) RETURNS void AS $$
DECLARE
  old_status text;
BEGIN
  -- Get current status
  SELECT processing_status INTO old_status
  FROM invoices WHERE id = p_invoice_id;

  -- Update status
  UPDATE invoices
  SET processing_status = p_new_status, updated_at = now()
  WHERE id = p_invoice_id;

  -- Emit webhook event
  PERFORM emit_webhook_event(
    'invoice.' || p_new_status,
    p_invoice_id,
    p_payload || jsonb_build_object('previous_status', old_status)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate approval tokens
CREATE OR REPLACE FUNCTION generate_approval_token() RETURNS text AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up expired locks
CREATE OR REPLACE FUNCTION cleanup_expired_automation_locks() RETURNS void AS $$
BEGIN
  DELETE FROM automation_locks WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
