import 'server-only';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { workspaceData } from '@/features/crm/data';
export async function quotationOptions() {
  const { supabase, businessId } = await workspaceData();
  const [customers, leads, business, pricing] = await Promise.all([
    supabase.from('customers').select('id,full_name').eq('business_id', businessId).is('archived_at', null).order('full_name').limit(1000),
    supabase.from('leads').select('id,customer_id,property_address').eq('business_id', businessId).is('archived_at', null).order('created_at', { ascending: false }).limit(1000),
    supabase.from('businesses').select('currency,tax_rate,default_terms').eq('id', businessId).single(),
    supabase.from('business_pricing_rules').select('service_id,unit,unit_price,business_services!inner(name,enabled)').eq('business_id', businessId).eq('enabled', true).eq('business_services.enabled', true),
  ]);
  if (customers.error || leads.error || business.error || pricing.error) throw new Error('Quotation options could not be loaded.');
  return { defaultExpiration: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), customers: customers.data, leads: leads.data, business: business.data, services: pricing.data.map(p => ({ id: p.service_id, name: p.business_services.name, unit: p.unit, unit_price: String(p.unit_price) })) };
}
export async function quotationDetails(id: string) {
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase, businessId } = await workspaceData();
  const [quotation, items, activity, messages] = await Promise.all([
    supabase.from('quotations').select('*').eq('business_id', businessId).eq('id', id).maybeSingle(),
    supabase.from('quotation_items').select('*').eq('business_id', businessId).eq('quotation_id', id).order('position'),
    supabase.from('activity_logs').select('id,event_type,created_at').eq('business_id', businessId).eq('entity_type', 'quotation').eq('entity_id', id).order('created_at', { ascending: false }).limit(30),
    supabase.from('quotation_messages').select('id,sender_type,body,created_at').eq('business_id', businessId).eq('quotation_id', id).order('created_at', { ascending: false }).limit(100),
  ]);
  if (quotation.error || items.error || activity.error || messages.error) throw new Error('Quotation could not be loaded.');
  if (!quotation.data) notFound(); return { quotation: quotation.data, items: items.data, activity: activity.data, messages: messages.data };
}
export async function quotationList(params: Record<string, string | string[] | undefined>) {
  const { supabase, businessId } = await workspaceData();
  const filters = z.object({ q: z.string().trim().max(80).catch(''), status: z.enum(['all', 'draft', 'sent', 'accepted', 'rejected', 'expired', 'cancelled']).catch('all'), page: z.coerce.number().int().min(1).max(10000).catch(1) }).parse(params);
  let query = supabase.from('quotations').select('id,reference,status,total,currency,expires_on,customer_snapshot', { count: 'exact' }).eq('business_id', businessId);
  if (filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters.q) query = query.ilike('reference', `%${filters.q.replaceAll(/[%_\\]/g, '\\$&')}%`);
  const result = await query.order('created_at', { ascending: false }).order('id').range((filters.page - 1) * 10, filters.page * 10 - 1);
  if (result.error) throw new Error('Quotations could not be loaded.'); return { quotations: result.data, count: result.count ?? 0, filters };
}
