import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Helper to normalize and validate URL
export const normalizeUrl = (rawUrl: string): string => {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let trimmed = rawUrl.trim().replace(/\/+$/, '');
  if (!trimmed) return '';

  // If it's a bare project ref (e.g. 20 alphanumeric chars with no dots or slashes)
  if (!trimmed.includes('.') && !trimmed.includes('/')) {
    return `https://${trimmed}.supabase.co`;
  }

  // If protocol missing (e.g. user provided "abc.supabase.co"), prepend https://
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.origin;
    }
  } catch (_) {
    return '';
  }
  return '';
};

// Safely retrieve environment variables across Vite, window globals, or local storage
const getEnv = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const val = (import.meta.env as any)[key];
      if (val && typeof val === 'string' && val.trim()) return val.trim();
    }
  } catch (_) {}

  try {
    if (typeof window !== 'undefined') {
      if ((window as any).__ENV__ && (window as any).__ENV__[key]) {
        const val = (window as any).__ENV__[key];
        if (val && typeof val === 'string' && val.trim()) return val.trim();
      }
      const localVal = window.localStorage?.getItem(key);
      if (localVal && typeof localVal === 'string' && localVal.trim()) return localVal.trim();
    }
  } catch (_) {}

  return '';
};

const rawUrl =
  getEnv('VITE_SUPABASE_URL') ||
  getEnv('SUPABASE_URL') ||
  '';

export const supabaseUrl: string = normalizeUrl(rawUrl);

export const supabaseAnonKey: string =
  getEnv('VITE_SUPABASE_ANON_KEY') ||
  getEnv('SUPABASE_ANON_KEY') ||
  getEnv('VITE_SUPABASE_PUBLISHABLE_KEY') ||
  '';

export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('placeholder-project') &&
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('placeholder-anon-key') &&
  !supabaseAnonKey.includes('your-anon-public-key')
);

// Safe default to prevent initialization crashes while offline or before keys are set
const defaultSafeUrl = 'https://placeholder-project.supabase.co';
const defaultSafeKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder-anon-key';

const clientUrl = isSupabaseConfigured ? supabaseUrl : (supabaseUrl || defaultSafeUrl);
const clientKey = isSupabaseConfigured ? supabaseAnonKey : (supabaseAnonKey || defaultSafeKey);

export const supabase: SupabaseClient = createClient(clientUrl, clientKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export default supabase;


