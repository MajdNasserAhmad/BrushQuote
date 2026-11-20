'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { workspaceData } from '@/features/crm/data';
import { appointmentSchema, jobSchema } from './schema';
function failure(code?: string) {
  if (code === '23P01') return 'This worker already has a job or appointment during that time. Choose another worker or time.';
  if (code === '40001') return 'This record changed in another tab. Reload before saving.';
  if (code === '23505') return 'This quotation already has a job.';
  if (code === '22023' || code === '23514') return 'Check the dates, timezone and budget. Times during a daylight-saving clock change may be unavailable.';
  return 'The booking could not be saved. Check the customer, linked records and worker access.';
}
export async function saveJob(raw: unknown, id?: string, version = 0, confirmedCancel = false): Promise<{ error?: string }> {
  const { supabase, businessId } = await workspaceData(); const parsed = jobSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check job details.' };
  if (id && !z.uuid().safeParse(id).success) return { error: 'Invalid job.' };
  if (parsed.data.status === 'cancelled' && confirmedCancel !== true) return { error: 'Confirm cancellation before saving.' };
  const result = await supabase.rpc('save_job', { target_business: businessId, job: id ?? null!, expected_version: version, details: parsed.data });
  if (result.error || !result.data) return { error: failure(result.error?.code) };
  revalidatePath('/dashboard'); revalidatePath('/dashboard/jobs'); revalidatePath('/dashboard/calendar'); redirect(`/dashboard/jobs/${result.data}`);
}
export async function saveAppointment(raw: unknown, id?: string, version = 0, confirmedCancel = false): Promise<{ error?: string }> {
  const { supabase, businessId } = await workspaceData(); const parsed = appointmentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check appointment details.' };
  if (id && !z.uuid().safeParse(id).success) return { error: 'Invalid appointment.' };
  if (parsed.data.status === 'cancelled' && confirmedCancel !== true) return { error: 'Confirm cancellation before saving.' };
  const result = await supabase.rpc('save_appointment', { target_business: businessId, appointment: id ?? null!, expected_version: version, details: parsed.data });
  if (result.error || !result.data) return { error: failure(result.error?.code) };
  revalidatePath('/dashboard'); revalidatePath('/dashboard/calendar'); redirect(`/dashboard/appointments/${result.data}`);
}
