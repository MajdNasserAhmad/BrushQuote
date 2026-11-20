import 'server-only';
import { redirect } from 'next/navigation';
import { publicEnvironment } from '@/lib/config/server-environment';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function requireUser() {
  if (!publicEnvironment().configured) redirect('/login?setup=1');
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || !data.user.email_confirmed_at) redirect('/login');
  return { supabase, user: data.user };
}

export async function currentMembership() {
  const { supabase, user } = await requireUser();
  // Resolve an actual membership, never trust a business ID from the browser.
  const { data, error } = await supabase.from('business_memberships').select('business_id,role').eq('user_id', user.id).order('created_at').limit(1).maybeSingle();
  if (error) throw new Error('Workspace membership could not be loaded. Check database migrations.');
  return { supabase, user, membership: data };
}
