/*
  # Subscription Enforcement Implementation

  Adds plan definitions, feature flags, usage tracking, and chiwawapay integration
  for complete subscription enforcement in InvoiceHub.
*/

-- 1. Plan Definitions Table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  price_monthly decimal(10,2) NOT NULL,
  price_yearly decimal(10,2),
  currency text DEFAULT 'TZS',
  features jsonb NOT NULL DEFAULT '{}', -- Feature flags and limits
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Usage Tracking Table
CREATE TABLE IF NOT EXISTS usage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  metric_type text NOT NULL, -- 'invoices_created', 'api_calls', 'storage_used', etc.
  metric_value integer NOT NULL DEFAULT 0,
  billing_period_start timestamptz NOT NULL,
  billing_period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, metric_type, billing_period_start)
);

-- 3. Enhance subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES subscription_plans(id);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS usage_limits jsonb DEFAULT '{}';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS feature_flags jsonb DEFAULT '{}';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly'));
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_billing_date timestamptz;

-- 4. Chiwawapay Payment Logs
CREATE TABLE IF NOT EXISTS chiwawapay_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'TZS',
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  payment_method text DEFAULT 'chiwawapay',
  request_payload jsonb,
  response_payload jsonb,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 5. API Keys table (replacing api_clients for consistency)
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_hash text UNIQUE NOT NULL,
  permissions jsonb DEFAULT '["read"]',
  is_active boolean DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_user_period ON usage_metrics(user_id, billing_period_start);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_type ON usage_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_chiwawapay_logs_transaction ON chiwawapay_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_chiwawapay_logs_user ON chiwawapay_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE chiwawapay_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public read subscription plans" ON subscription_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view their usage metrics" ON usage_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their payment logs" ON chiwawapay_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their API keys" ON api_keys FOR ALL USING (auth.uid() = user_id);

-- Insert default plans
INSERT INTO subscription_plans (plan_name, display_name, description, price_monthly, features) VALUES
('free', 'Free', 'Basic features for getting started', 0, '{
  "max_invoices_per_month": 5,
  "max_api_calls_per_month": 100,
  "storage_limit_mb": 10,
  "automation_enabled": false,
  "webhooks_enabled": false,
  "custom_branding": false
}'),
('basic', 'Basic', 'Essential features for small businesses', 15000, '{
  "max_invoices_per_month": 100,
  "max_api_calls_per_month": 1000,
  "storage_limit_mb": 100,
  "automation_enabled": true,
  "webhooks_enabled": true,
  "custom_branding": false
}'),
('premium', 'Premium', 'Advanced features for growing businesses', 35000, '{
  "max_invoices_per_month": 500,
  "max_api_calls_per_month": 5000,
  "storage_limit_mb": 1000,
  "automation_enabled": true,
  "webhooks_enabled": true,
  "custom_branding": true,
  "multi_user": true,
  "advanced_reporting": true
}');

-- Update existing subscriptions to use plan_id
UPDATE subscriptions SET plan_id = (SELECT id FROM subscription_plans WHERE plan_name = 'free') WHERE plan_name = 'basic' OR plan_name IS NULL;
UPDATE subscriptions SET plan_id = (SELECT id FROM subscription_plans WHERE plan_name = 'basic') WHERE plan_name = 'basic';
UPDATE subscriptions SET plan_id = (SELECT id FROM subscription_plans WHERE plan_name = 'premium') WHERE plan_name = 'premium';

-- Function to check subscription and feature access
CREATE OR REPLACE FUNCTION check_subscription_access(
  p_user_id uuid,
  p_feature text DEFAULT NULL,
  p_operation text DEFAULT 'read'
) RETURNS jsonb AS $$
DECLARE
  sub_record record;
  plan_record record;
  usage_record record;
  current_period_start timestamptz;
  current_period_end timestamptz;
  result jsonb;
BEGIN
  -- Get current subscription
  SELECT * INTO sub_record FROM subscriptions
  WHERE user_id = p_user_id AND status IN ('trial', 'active')
  ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_active_subscription');
  END IF;

  -- Get plan details
  SELECT * INTO plan_record FROM subscription_plans WHERE id = sub_record.plan_id;

  -- Check if subscription is expired
  IF sub_record.status = 'trial' AND now() > sub_record.trial_end THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'trial_expired');
  END IF;

  IF sub_record.status = 'active' AND sub_record.subscription_end IS NOT NULL AND now() > sub_record.subscription_end THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'subscription_expired');
  END IF;

  -- For read operations, allow if subscription is valid
  IF p_operation = 'read' THEN
    RETURN jsonb_build_object('allowed', true, 'plan', plan_record.plan_name);
  END IF;

  -- Check feature access
  IF p_feature IS NOT NULL AND NOT (plan_record.features->>p_feature)::boolean THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'feature_not_available', 'plan', plan_record.plan_name);
  END IF;

  -- Check usage limits for write operations
  IF p_operation = 'write' THEN
    -- Calculate current billing period
    current_period_start := date_trunc('month', now());
    current_period_end := current_period_start + interval '1 month';

    -- Check invoice creation limit
    SELECT * INTO usage_record FROM usage_metrics
    WHERE user_id = p_user_id AND metric_type = 'invoices_created'
    AND billing_period_start = current_period_start;

    IF FOUND AND usage_record.metric_value >= (plan_record.features->>'max_invoices_per_month')::int THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'usage_limit_exceeded', 'limit', plan_record.features->>'max_invoices_per_month');
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', true, 'plan', plan_record.plan_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage metrics
CREATE OR REPLACE FUNCTION increment_usage_metric(
  p_user_id uuid,
  p_metric_type text,
  p_increment integer DEFAULT 1
) RETURNS void AS $$
DECLARE
  current_period_start timestamptz;
BEGIN
  current_period_start := date_trunc('month', now());

  INSERT INTO usage_metrics (user_id, metric_type, metric_value, billing_period_start, billing_period_end)
  VALUES (p_user_id, p_metric_type, p_increment, current_period_start, current_period_start + interval '1 month')
  ON CONFLICT (user_id, metric_type, billing_period_start)
  DO UPDATE SET
    metric_value = usage_metrics.metric_value + p_increment,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle chiwawapay webhook
CREATE OR REPLACE FUNCTION process_chiwawapay_webhook(
  p_transaction_id text,
  p_status text,
  p_amount decimal,
  p_payload jsonb
) RETURNS jsonb AS $$
DECLARE
  payment_record record;
  sub_record record;
  result jsonb;
BEGIN
  -- Log the webhook
  INSERT INTO chiwawapay_logs (transaction_id, user_id, subscription_id, amount, status, response_payload)
  SELECT
    p_transaction_id,
    p.user_id,
    p.subscription_id,
    p_amount,
    p_status,
    p_payload
  FROM payments p
  WHERE p.transaction_id = p_transaction_id;

  -- Find the payment record
  SELECT * INTO payment_record FROM payments WHERE transaction_id = p_transaction_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'payment_not_found');
  END IF;

  -- Update payment status
  UPDATE payments SET
    status = CASE WHEN p_status = 'completed' THEN 'completed' ELSE 'failed' END,
    payment_date = CASE WHEN p_status = 'completed' THEN now() ELSE null END,
    updated_at = now()
  WHERE id = payment_record.id;

  -- If payment completed, activate subscription
  IF p_status = 'completed' THEN
    UPDATE subscriptions SET
      status = 'active',
      subscription_start = COALESCE(subscription_start, now()),
      subscription_end = CASE
        WHEN billing_cycle = 'monthly' THEN COALESCE(subscription_end, now()) + interval '1 month'
        ELSE COALESCE(subscription_end, now()) + interval '1 year'
      END,
      last_payment_date = now(),
      updated_at = now()
    WHERE id = payment_record.subscription_id;

    -- Emit payment success event
    PERFORM emit_domain_event('payment.completed', payment_record.id, jsonb_build_object('amount', p_amount));
  END IF;

  RETURN jsonb_build_object('success', true, 'payment_id', payment_record.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
