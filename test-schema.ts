import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.VITE_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let url = rawUrl.trim().replace(/\/+$/, '');
if (!url.includes('.') && !url.includes('/')) url = `https://${url}.supabase.co`;

const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.from('courier_settlements').select('*').limit(1);
  if (error) console.error('courier_settlements error:', error.message);
  else console.log('courier_settlements columns:', data && data.length > 0 ? Object.keys(data[0]) : 'empty but no error');
  
  const { data: mData, error: mError } = await supabase.from('merchant_settlements').select('*').limit(1);
  if (mError) console.error('merchant_settlements error:', mError.message);
  else console.log('merchant_settlements columns:', mData && mData.length > 0 ? Object.keys(mData[0]) : 'empty but no error');
}
test();
