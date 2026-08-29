import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const rawUrl = process.env.VITE_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let url = rawUrl.trim().replace(/\/+$/, '');
if (!url.includes('.') && !url.includes('/')) {
  url = `https://${url}.supabase.co`;
}

if(!url || !key) {
  console.log('No credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.rpc('exec_sql', { sql_string: 'SELECT 1' });
  console.log('exec_sql:', error ? error.message : data);
  const { data: d2, error: e2 } = await supabase.rpc('run_sql', { sql: 'SELECT 1' });
  console.log('run_sql:', e2 ? e2.message : d2);
  const { data: d3, error: e3 } = await supabase.rpc('execute_sql', { query: 'SELECT 1' });
  console.log('execute_sql:', e3 ? e3.message : d3);
}
test();
