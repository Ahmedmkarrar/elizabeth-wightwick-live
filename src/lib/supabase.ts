import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: (url, opts) => fetch(url, { ...opts, cache: 'no-store' }) },
});

export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
  global: { fetch: (url, opts) => fetch(url, { ...opts, cache: 'no-store' }) },
});
