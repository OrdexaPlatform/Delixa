const rawUrl = process.env.VITE_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
let url = rawUrl.trim().replace(/\/+$/, '');
if (!url.includes('.') && !url.includes('/')) url = `https://${url}.supabase.co`;

async function test() {
  const res = await fetch(`${url}/rest/v1/?apikey=${key}`);
  const json = await res.json();
  const cs = json.definitions.courier_settlements.properties;
  console.log('courier_settlements columns:', Object.keys(cs));
  const ms = json.definitions.merchant_settlements.properties;
  console.log('merchant_settlements columns:', Object.keys(ms));
}
test();
