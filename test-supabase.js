import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf8');
const envLines = envContent.split('\n');
const envVars = {};
envLines.forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');

    // Test basic connection by fetching suppliers
    const { data: suppliers, error } = await supabase
      .from('suppliers')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error fetching suppliers:', error);
      return false;
    }

    console.log('Successfully connected to Supabase!');
    console.log('Sample supplier data:', suppliers);

    // Test fetching invoices
    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .limit(1);

    if (invoiceError) {
      console.error('Error fetching invoices:', invoiceError);
      return false;
    }

    console.log('Successfully fetched invoice data:', invoices);
    return true;

  } catch (err) {
    console.error('Connection test failed:', err);
    return false;
  }
}

testConnection().then(success => {
  if (success) {
    console.log('✅ Supabase database operations test passed!');
  } else {
    console.log('❌ Supabase database operations test failed!');
  }
  process.exit(success ? 0 : 1);
});
