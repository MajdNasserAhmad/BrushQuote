import 'server-only';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { accessDigest } from './tokens';
import { portalSchema } from './portal-schema';
export async function loadPortal(token: string) {
  const digest = accessDigest(token); if (!digest) return null;
  const { data, error } = await createSupabaseAdmin().rpc('portal_quotation', { access_digest: digest });
  if (error) throw new Error('The quotation portal is temporarily unavailable.');
  return data ? portalSchema.parse(data) : null;
}
