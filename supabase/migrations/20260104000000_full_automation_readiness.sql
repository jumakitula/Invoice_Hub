/*
  # Full Automation Readiness Implementation

  Makes InvoiceHub automation-ready while keeping manual operation intact.
  Adds state machine, events, webhooks, idempotency, approval tokens, artifacts, audit logs, and more.
*/

-- 1. Invoice State Machine
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_state text DEFAULT 'form_submitted';
ALTER TABLE invoices ADD CONSTRAINT check_invoice_state
  CHECK (invoice_state IN ('form_submitted', 'invoice_drafted', 'awaiting_owner_confirmation', 'sent_to_customer', 'awaiting_payment', 'payment_proof_received', 'paid_confirmed', 'archived'));

-- 2. Domain Events Table
CREATE TABLE IF NOT EXISTS domain_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  processed boolean DEFAULT false
);

-- 3. Webhook Subscriptions Table
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  target_url text NOT NULL,
  secret text NOT NULL,
  is_active boolean DEFAULT true,
  retry_count integer DEFAULT 0,
  last_attempt_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Idempotency & Concurrency Control
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS locked_by_automation boolean DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS lock_expires_at timestamptz;

-- 5. Human-in-the-Loop Approval Tokens
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS owner_approval_token text UNIQUE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_confirmation_token text UNIQUE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;

-- 6. Artifact Management
CREATE TABLE IF NOT EXISTS invoice_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('form', 'pdf', 'payment_proof', 'receipt')),
  file_url text NOT NULL,
  uploaded_by text NOT NULL CHECK (uploaded_by IN ('customer', 'owner', 'automation')),
  created_at timestamptz DEFAULT now()
);

-- 7. Automation Audit Log
CREATE TABLE IF NOT EXISTS automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  action text NOT NULL,
  source text NOT NULL CHECK (source IN ('n8n', 'system')),
  payload jsonb DEFAULT '{}',
  success boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 8. Permissions & Automation Identity
CREATE TABLE IF NOT EXISTS api_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  api_key_hash text UNIQUE NOT NULL,
  permissions jsonb DEFAULT '["invoice:read"]',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_domain_events_type ON domain_events(event_type);
CREATE INDEX IF NOT EXISTS idx_domain_events_aggregate ON domain_events(aggregate_id);
CREATE INDEX IF NOT EXISTS idx_domain_events_processed ON domain_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_active ON webhook_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_event ON webhook_subscriptions(event_type);
CREATE INDEX IF NOT EXISTS idx_invoices_state ON invoices(invoice_state);
CREATE INDEX IF NOT EXISTS idx_invoices_idempotency ON invoices(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_invoices_locked ON invoices(locked_by_automation);
CREATE INDEX IF NOT EXISTS idx_invoices_approval_token ON invoices(owner_approval_token);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_token ON invoices(payment_confirmation_token);
CREATE INDEX IF NOT EXISTS idx_artifacts_invoice ON invoice_artifacts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_invoice ON automation_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_api_clients_key ON api_clients(api_key_hash);

-- Enable RLS on new tables
ALTER TABLE domain_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_clients ENABLE ROW LEVEL SECURITY;

-- Policies for new tables
CREATE POLICY "Service access to domain events" ON domain_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service access to webhook subscriptions" ON webhook_subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service access to invoice artifacts" ON invoice_artifacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service access to automation logs" ON automation_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service access to api clients" ON api_clients FOR ALL USING (true) WITH CHECK (true);

-- Functions for state transitions and events
CREATE OR REPLACE FUNCTION transition_invoice_state(
  p_invoice_id uuid,
  p_new_state text,
  p_payload jsonb DEFAULT '{}'
) RETURNS void AS $$
DECLARE
  old_state text;
BEGIN
  -- Get current state
  SELECT invoice_state INTO old_state FROM invoices WHERE id = p_invoice_id;

  -- Validate transition
  IF NOT is_valid_state_transition(old_state, p_new_state) THEN
    RAISE EXCEPTION 'Invalid state transition from % to %', old_state, p_new_state;
  END IF;

  -- Update state
  UPDATE invoices
  SET invoice_state = p_new_state, updated_at = now()
  WHERE id = p_invoice_id;

  -- Emit domain event
  INSERT INTO domain_events (event_type, aggregate_id, payload)
  VALUES ('invoice.state_changed', p_invoice_id, p_payload || jsonb_build_object('old_state', old_state, 'new_state', p_new_state));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_valid_state_transition(p_old_state text, p_new_state text) RETURNS boolean AS $$
BEGIN
  RETURN CASE
    WHEN p_old_state = 'form_submitted' AND p_new_state = 'invoice_drafted' THEN true
    WHEN p_old_state = 'invoice_drafted' AND p_new_state = 'awaiting_owner_confirmation' THEN true
    WHEN p_old_state = 'awaiting_owner_confirmation' AND p_new_state = 'sent_to_customer' THEN true
    WHEN p_old_state = 'sent_to_customer' AND p_new_state = 'awaiting_payment' THEN true
    WHEN p_old_state = 'awaiting_payment' AND p_new_state = 'payment_proof_received' THEN true
    WHEN p_old_state = 'payment_proof_received' AND p_new_state = 'paid_confirmed' THEN true
    WHEN p_old_state = 'paid_confirmed' AND p_new_state = 'archived' THEN true
    ELSE false
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION emit_domain_event(
  p_event_type text,
  p_aggregate_id uuid,
  p_payload jsonb DEFAULT '{}'
) RETURNS uuid AS $$
DECLARE
  event_id uuid;
BEGIN
  INSERT INTO domain_events (event_type, aggregate_id, payload)
  VALUES (p_event_type, p_aggregate_id, p_payload)
  RETURNING id INTO event_id;

  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_secure_token() RETURNS text AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION process_webhook_events() RETURNS void AS $$
DECLARE
  webhook_record record;
  event_record record;
BEGIN
  -- Process pending events
  FOR event_record IN
    SELECT * FROM domain_events WHERE processed = false ORDER BY created_at LIMIT 10
  LOOP
    -- Find active webhooks for this event type
    FOR webhook_record IN
      SELECT * FROM webhook_subscriptions
      WHERE event_type = event_record.event_type AND is_active = true
    LOOP
      -- TODO: Implement actual HTTP POST with retry logic
      -- For now, just mark as processed
      UPDATE domain_events SET processed = true WHERE id = event_record.id;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired locks
CREATE OR REPLACE FUNCTION cleanup_expired_locks() RETURNS void AS $$
BEGIN
  UPDATE invoices
  SET locked_by_automation = false, lock_expires_at = null
  WHERE lock_expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
