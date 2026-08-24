import { createClient, SupabaseClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as any)?.env || {};
export const supabaseUrl: string = metaEnv.VITE_SUPABASE_URL || '';
export const supabaseAnonKey: string = metaEnv.VITE_SUPABASE_ANON_KEY || metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('your-anon-public-key')
);

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : (createClient('https://placeholder-project.supabase.co', 'placeholder-anon-key', {
      auth: { persistSession: false, autoRefreshToken: false },
    }) as unknown as SupabaseClient);

export default supabase;
