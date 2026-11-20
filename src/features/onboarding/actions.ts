'use server';
import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireUser, currentMembership } from '@/lib/auth/session';
import type { Database } from '@/lib/supabase/database';
import { onboardingPayload, onboardingSchema } from './schema';
import { prepareLogo } from './logo';

async function storeLogo(supabase: SupabaseClient<Database>, businessId: string, bytes: Buffer) {
  const path = `${businessId}/${randomUUID()}.webp`;
  const { error: uploadError } = await supabase.storage.from('business-logos').upload(path, bytes, { contentType: 'image/webp', upsert: false });
  if (uploadError) return false;
  const { error: updateError, data } = await supabase.from('businesses').update({ logo_path: path }).eq('id', businessId).select('id').maybeSingle();
  if (updateError || !data) { await supabase.storage.from('business-logos').remove([path]); return false; }
  return true;
}

export async function onboard(form: FormData): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  const raw = form.get('details');
  if (typeof raw !== 'string' || raw.length > 100000) return { error: 'The business details are invalid or too large.' };
  let decoded: unknown;
  try { decoded = JSON.parse(raw); } catch { return { error: 'Check your business details.' }; }
  const input = onboardingSchema.safeParse(decoded);
  if (!input.success) return { error: input.error.issues[0]?.message ?? 'Check your business details.' };
  const existing = await supabase.from('business_memberships').select('business_id').eq('user_id', user.id).limit(1);
  if (existing.error) return { error: 'Workspace setup is unavailable. Check that the database migrations have been applied.' };
  if (existing.data.length) redirect('/dashboard');
  let logo: Buffer | undefined;
  const file = form.get('logo');
  if (file instanceof File && file.size) {
    try { logo = await prepareLogo(file); } catch (error) { return { error: error instanceof Error ? error.message : 'Choose a valid logo.' }; }
  }
  const { data: businessId, error } = await supabase.rpc('onboard_business', onboardingPayload(input.data));
  if (error || !businessId) return { error: error?.code === '23505' ? 'That public address is already in use, or your workspace already exists. Choose another address or open your workspace.' : 'Your workspace could not be created. Check the details and database configuration, then try again.' };
  let logoSaved = true;
  if (logo) { try { logoSaved = await storeLogo(supabase, businessId, logo); } catch { logoSaved = false; } }
  revalidatePath('/dashboard');
  redirect(logoSaved ? '/dashboard' : '/dashboard?notice=logo-error');
}

export async function updateLogo(form: FormData): Promise<{ error?: string; message?: string }> {
  const { supabase, membership } = await currentMembership();
  if (!membership || !['owner', 'admin'].includes(membership.role)) return { error: 'Only a business owner or administrator can change the logo.' };
  const file = form.get('logo');
  if (!(file instanceof File) || !file.size) return { error: 'Choose a logo first.' };
  try {
    const bytes = await prepareLogo(file);
    const { data: current } = await supabase.from('businesses').select('logo_path').eq('id', membership.business_id).single();
    const saved = await storeLogo(supabase, membership.business_id, bytes);
    if (!saved) return { error: 'The logo could not be saved. Check the private Storage bucket configuration.' };
    // Only remove a previous path already read from this authorized business.
    if (current?.logo_path?.startsWith(`${membership.business_id}/`)) await supabase.storage.from('business-logos').remove([current.logo_path]);
  } catch (error) { return { error: error instanceof Error ? error.message : 'The logo could not be saved.' }; }
  revalidatePath('/dashboard');
  return { message: 'Company logo updated.' };
}
