'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { workspaceData } from '@/features/crm/data';
import { accountSettingsSchema, businessSettingsSchema, serviceSettingsSchema } from './schema';
export async function requestPlanChange(plan: string, confirmed: boolean) {
  const { supabase, businessId } = await workspaceData();
  if (!['free', 'starter', 'professional'].includes(plan) || confirmed !== true) return { error: 'Confirm a supported plan request.' };
  const result = await supabase.rpc('request_plan_change', { target_business: businessId, requested_plan: plan, confirmed });
  if (result.error) return { error: 'Only the workspace owner can request a plan change.' };
  revalidatePath('/dashboard/settings/plan'); return { success: true };
}
export async function saveBusinessSettings(raw: unknown) {
  const { supabase, businessId } = await workspaceData(); const parsed = businessSettingsSchema.safeParse(raw);
  if (!parsed.success) return { error: 'Check the business details, tax rate and terms.' };
  const { currency_confirmed, ...details } = parsed.data;
  const result = await supabase.rpc('save_business_settings', { target_business: businessId, details: { ...details, service_areas: details.service_areas.split(',').map(s => s.trim()).filter(Boolean) }, currency_confirmed });
  if (result.error) return { error: 'Only an owner or administrator can save valid business details. Confirm any currency change.' };
  revalidatePath('/dashboard', 'layout'); return { success: true };
}
export async function saveServiceSettings(raw: unknown, service?: string, pricing?: string) {
  const { supabase, businessId } = await workspaceData(); const parsed = serviceSettingsSchema.safeParse(raw);
  if (!parsed.success || (service && !z.uuid().safeParse(service).success) || (pricing && !z.uuid().safeParse(pricing).success)) return { error: 'Check the service name, unit and price (up to four decimals).' };
  const result = await supabase.rpc('save_service_pricing', { target_business: businessId, service: service ?? null!, pricing: pricing ?? null!, details: parsed.data });
  if (result.error) return { error: 'The service could not be saved. Check permissions, unique names and pricing units.' };
  revalidatePath('/dashboard', 'layout'); return { success: true };
}
export async function saveAccountSettings(raw: unknown) {
  const { supabase, businessId, user } = await workspaceData(); const parsed = accountSettingsSchema.safeParse(raw);
  if (!parsed.success) return { error: 'Check the profile name and notification preference.' };
  const profile = await supabase.from('profiles').update({ display_name: parsed.data.display_name }).eq('id', user.id).select('id').single();
  if (profile.error) return { error: 'Your profile could not be saved.' };
  const current = await supabase.from('notification_preferences').select('user_id').eq('business_id', businessId).eq('user_id', user.id).maybeSingle();
  if (current.error) return { error: 'Profile saved; notification preferences could not be loaded.' };
  const preference = current.data ? await supabase.from('notification_preferences').update({ email_notifications: parsed.data.email_notifications }).eq('business_id', businessId).eq('user_id', user.id) : await supabase.from('notification_preferences').insert({ business_id: businessId, user_id: user.id, email_notifications: parsed.data.email_notifications });
  if (preference.error) return { error: 'Profile saved; notification preferences could not be saved. Please retry.' };
  revalidatePath('/dashboard/settings'); return { success: true };
}
export async function markNotificationRead(id: string) {
  const { supabase, businessId, user } = await workspaceData(); if (!z.uuid().safeParse(id).success) return { error: 'Invalid notification.' };
  const result = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('business_id', businessId).eq('user_id', user.id).select('id').maybeSingle();
  if (result.error || !result.data) return { error: 'Notification could not be updated.' }; revalidatePath('/dashboard/notifications'); return { success: true };
}
