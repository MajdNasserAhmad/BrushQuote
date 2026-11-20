import 'server-only';
import { z } from 'zod';
import { notFound } from 'next/navigation';
import { workspaceData } from '@/features/crm/data';
export async function schedulingOptions() {
  const { supabase, businessId, user } = await workspaceData();
  const [customers, workers, jobs, quotes, business] = await Promise.all([
    supabase.from('customers').select('id,full_name').eq('business_id', businessId).is('archived_at', null).order('full_name').limit(1000),
    supabase.from('business_memberships').select('user_id,role').eq('business_id', businessId).order('created_at'),
    supabase.from('jobs').select('id,title,customer_id').eq('business_id', businessId).neq('status', 'cancelled').order('starts_at', { ascending: false }).limit(1000),
    supabase.from('quotations').select('id,reference,customer_id,total,currency,lead_id').eq('business_id', businessId).eq('status', 'accepted').order('created_at', { ascending: false }).limit(1000),
    supabase.from('businesses').select('currency').eq('id', businessId).single(),
  ]);
  if (customers.error || workers.error || jobs.error || quotes.error || business.error) throw new Error('Scheduling options could not be loaded.');
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  return { customers: customers.data, workers: workers.data.map(w => ({ id: w.user_id, label: w.user_id === user.id ? `You (${w.role})` : `${w.role} · ${w.user_id.slice(0, 8)}` })), jobs: jobs.data, quotes: quotes.data, currency: business.data.currency, currentUser: user.id, starts: `${tomorrow}T09:00`, ends: `${tomorrow}T17:00`, timezones: ['UTC', ...Intl.supportedValuesOf('timeZone')] };
}
export async function jobDetails(id: string) {
  if (!z.uuid().safeParse(id).success) notFound(); const { supabase, businessId } = await workspaceData();
  const [job, workers, activity] = await Promise.all([
    supabase.from('jobs').select('*').eq('business_id', businessId).eq('id', id).maybeSingle(),
    supabase.from('job_assignments').select('user_id').eq('business_id', businessId).eq('job_id', id),
    supabase.from('activity_logs').select('id,event_type,created_at').eq('business_id', businessId).eq('entity_type', 'job').eq('entity_id', id).order('created_at', { ascending: false }).limit(30),
  ]);
  if (job.error || workers.error || activity.error) throw new Error('Job could not be loaded.'); if (!job.data) notFound();
  const customer = await supabase.from('customers').select('id,full_name').eq('business_id', businessId).eq('id', job.data.customer_id).single();
  if (customer.error) throw new Error('Customer could not be loaded.'); return { job: job.data, workers: workers.data, activity: activity.data, customer: customer.data };
}
export async function appointmentDetails(id: string) {
  if (!z.uuid().safeParse(id).success) notFound(); const { supabase, businessId } = await workspaceData();
  const result = await supabase.from('appointments').select('*').eq('business_id', businessId).eq('id', id).maybeSingle();
  if (result.error) throw new Error('Appointment could not be loaded.'); if (!result.data) notFound(); return result.data;
}
export async function jobList(params: Record<string, string | string[] | undefined>) {
  const { supabase, businessId } = await workspaceData();
  const filters = z.object({ page: z.coerce.number().int().min(1).max(10000).catch(1), status: z.enum(['all', 'scheduled', 'in_progress', 'completed', 'cancelled']).catch('all'), q: z.string().trim().max(100).catch('') }).parse(params);
  let query = supabase.from('jobs').select('id,title,status,starts_at,ends_at,timezone,budget,currency', { count: 'exact' }).eq('business_id', businessId);
  if (filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters.q) query = query.ilike('title', `%${filters.q.replaceAll(/[%_\\]/g, '\\$&')}%`);
  const result = await query.order('starts_at', { ascending: false }).order('id').range((filters.page - 1) * 10, filters.page * 10 - 1);
  if (result.error) throw new Error('Jobs could not be loaded.'); return { jobs: result.data, count: result.count ?? 0, filters };
}
export async function calendarData(month?: string) {
  const { supabase, businessId } = await workspaceData();
  const selected = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/).safeParse(month); const value = selected.success ? selected.data : new Date().toISOString().slice(0, 7);
  const start = new Date(`${value}-01T00:00:00Z`); const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1);
  const [jobs, appointments] = await Promise.all([
    supabase.from('jobs').select('id,title,status,starts_at,ends_at,timezone').eq('business_id', businessId).lt('starts_at', end.toISOString()).gt('ends_at', start.toISOString()).neq('status', 'cancelled').order('starts_at').limit(1000),
    supabase.from('appointments').select('id,title,status,starts_at,ends_at,timezone').eq('business_id', businessId).lt('starts_at', end.toISOString()).gt('ends_at', start.toISOString()).neq('status', 'cancelled').order('starts_at').limit(1000),
  ]);
  if (jobs.error || appointments.error) throw new Error('Calendar could not be loaded.');
  return { month: value, start, end, jobs: jobs.data, appointments: appointments.data };
}
