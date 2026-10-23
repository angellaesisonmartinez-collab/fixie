import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_URL) ||
  'https://ieznsbzddanjwmnpvncs.supabase.co';

const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file for VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Bypass navigator.locks in browser to prevent indefinite hanging/deadlocks
    lock: async (_name, _acquireTimeout, fn) => await fn(),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Safely creates a unique Realtime channel to avoid duplicate channel subscription errors
 * (e.g. "cannot add 'postgres_changes' callbacks after subscribe()") during React StrictMode
 * remounts or multiple concurrent component instances.
 */
export function safeRealtimeChannel(baseName) {
  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return supabase.channel(`${baseName}_${uniqueSuffix}`);
}

/**
 * Safely removes a Realtime channel without throwing or crashing.
 */
export function safeRemoveChannel(channel) {
  if (!channel) return;
  try {
    supabase.removeChannel(channel);
  } catch (err) {
    console.warn('Realtime channel remove note:', err);
  }
}

