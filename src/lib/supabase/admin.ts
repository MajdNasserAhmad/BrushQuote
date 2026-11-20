import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { publicEnvironment } from '@/lib/config/server-environment';
import type { Database } from './database';
export function createSupabaseAdmin() {
  const env = publicEnvironment(); const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env.configured || !key) throw new Error('Server-side Supabase access is not configured.');
  return createClient<Database>(env.supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
