const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://eeviezqpfiimkbejxrhi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVldmllenFwZmlpbWtiZWp4cmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNTUyNTgsImV4cCI6MjA3ODczMTI1OH0.DgIH8WiEWqEwbi5TMFq_Rzafe9wBiq8a0-oE3nCcxmg'
);

async function test() {
  const { data, error } = await supabase.from('audit_logs').select('*').limit(1);
  console.log('Error:', JSON.stringify(error, null, 2));
  console.log('Data:', data);
}

test();
