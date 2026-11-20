import 'server-only';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
export async function requestBusiness(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return null;
  const { data, error } = await createSupabaseAdmin().from('businesses').select('id,name,slug,description,service_areas').eq('slug', slug).maybeSingle();
  if (error) throw new Error('The request form is temporarily unavailable.'); return data;
}
