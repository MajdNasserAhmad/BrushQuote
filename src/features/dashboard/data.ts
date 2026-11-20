import 'server-only';
import { z } from 'zod';
import { workspaceData } from '@/features/crm/data';
const metricsSchema = z.object({ customers: z.number(), new_leads: z.number(), pending_quotations: z.number(), accepted_quotations: z.number(), rejected_quotations: z.number(), active_jobs: z.number(), completed_jobs: z.number(), revenue: z.array(z.object({ currency: z.string(), quoted: z.string(), accepted: z.string() })), monthly_revenue: z.array(z.object({ month: z.string(), currency: z.string(), quoted: z.string(), accepted: z.string() })) });
export async function dashboardData() {
  const context = await workspaceData(); const { supabase, businessId } = context;
  const [business, metrics, customers, requests, quotes, appointments, activity] = await Promise.all([
    supabase.from('businesses').select('*').eq('id', businessId).single(),
    supabase.rpc('dashboard_metrics', { target_business: businessId }),
    supabase.from('customers').select('id,full_name,created_at').eq('business_id', businessId).is('archived_at', null).order('created_at', { ascending: false }).limit(5),
    supabase.from('leads').select('id,property_address,status').eq('business_id', businessId).eq('source', 'public_request').is('archived_at', null).order('created_at', { ascending: false }).limit(5),
    supabase.from('quotations').select('id,reference,status,total,currency').eq('business_id', businessId).order('created_at', { ascending: false }).limit(5),
    supabase.from('appointments').select('id,title,starts_at,timezone').eq('business_id', businessId).eq('status', 'scheduled').gte('starts_at', new Date().toISOString()).order('starts_at').limit(5),
    supabase.from('activity_logs').select('id,event_type,created_at,entity_type,entity_id').eq('business_id', businessId).order('created_at', { ascending: false }).limit(10),
  ]);
  if (business.error || metrics.error || customers.error || requests.error || quotes.error || appointments.error || activity.error) throw new Error('Dashboard data could not be loaded.');
  const now = new Date(); const months = Array.from({ length: 6 }, (_, index) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1)).toISOString().slice(0, 7));
  return { ...context, business: business.data, metrics: metricsSchema.parse(metrics.data), customers: customers.data, requests: requests.data, quotes: quotes.data, appointments: appointments.data, activity: activity.data, months };
}
