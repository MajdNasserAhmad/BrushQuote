import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publicEnvironment } from '@/lib/config/server-environment';
import type { Database } from './database';

export async function createSupabaseServer(writable = false) {
  const env = publicEnvironment();
  if (!env.configured) throw new Error('Supabase is not configured.');
  const jar = await cookies();
  return createServerClient<Database>(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        // Proxy refreshes cookies for read-only Server Components. Actions and
        // route handlers pass writable=true, so persistence failures propagate.
        if (writable) values.forEach(({ name, value, options }) => jar.set(name, value, options));
      },
    },
  });
}
