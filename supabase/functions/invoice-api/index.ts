// Helper function to hash the key and verify it against the database
async function verifyApiKey(supabase: any, req: Request) {
  const providedKey = req.headers.get("x-api-key");
  if (!providedKey) return { valid: false, userId: null, permissions: [] };

  try {
    // Hash the provided plain-text key to match the database 'key_hash'
    const encoder = new TextEncoder();
    const data = encoder.encode(providedKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedKey = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Check the api_keys table for the hash
    const { data: keyData, error } = await supabase
      .from('api_keys')
      .select('user_id, permissions')
      .eq('key_hash', hashedKey)
      .eq('is_active', true)
      .single();

    if (error || !keyData) return { valid: false, userId: null, permissions: [] };

    // Update last used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('key_hash', hashedKey);

    return {
      valid: true,
      userId: keyData.user_id,
      permissions: keyData.permissions || []
    };
  } catch (err) {
    console.error("Verification error:", err);
    return { valid: false, userId: null, permissions: [] };
  }
}

// Helper function to check subscription access
async function checkSubscriptionAccess(supabase: any, userId: string, operation: string = 'read', feature?: string) {
  try {
    const { data, error } = await supabase.rpc('check_subscription_access', {
      p_user_id: userId,
      p_operation: operation,
      p_feature: feature
    });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Subscription check error:", err);
    return { allowed: false, reason: 'subscription_check_failed' };
  }
}

// Helper function to increment usage
async function incrementUsage(supabase: any, userId: string, metricType: string) {
  try {
    await supabase.rpc('increment_usage_metric', {
      p_user_id: userId,
      p_metric_type: metricType
    });
  } catch (err) {
    console.error("Usage increment error:", err);
  }
}
=======
// Helper function to hash the key and verify it against the database
async function verifyApiKey(supabase: any, req: Request) {
  const providedKey = req.headers.get("x-api-key");
  if (!providedKey) return { valid: false, userId: null, permissions: [] };

  try {
    // Hash the provided plain-text key to match the database 'key_hash'
    const encoder = new TextEncoder();
    const data = encoder.encode(providedKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedKey = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Check the api_keys table for the hash
    const { data: keyData, error } = await supabase
      .from('api_keys')
      .select('user_id, permissions')
      .eq('key_hash', hashedKey)
      .eq('is_active', true)
      .single();

    if (error || !keyData) return { valid: false, userId: null, permissions: [] };

    // Update last used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('key_hash', hashedKey);

    return {
      valid: true,
      userId: keyData.user_id,
      permissions: keyData.permissions || []
    };
  } catch (err) {
    console.error("Verification error:", err);
    return { valid: false, userId: null, permissions: [] };
  }
}

// Helper function to check subscription access
async function checkSubscriptionAccess(supabase: any, userId: string, operation: string = 'read', feature?: string) {
  try {
    const { data, error } = await supabase.rpc('check_subscription_access', {
      p_user_id: userId,
      p_operation: operation,
      p_feature: feature
    });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Subscription check error:", err);
    return { allowed: false, reason: 'subscription_check_failed' };
  }
}

// Helper function to increment usage
async function incrementUsage(supabase: any, userId: string, metricType: string) {
  try {
    await supabase.rpc('increment_usage_metric', {
      p_user_id: userId,
      p_metric_type: metricType
    });
  } catch (err) {
    console.error("Usage increment error:", err);
  }
}
