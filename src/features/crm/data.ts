import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { currentMembership } from '@/lib/auth/session';
import { listQuery } from './schema';
export const PAGE_SIZE = 10;
export async function workspaceData() {
  const context = await currentMembership();
  if (!context.membership) redirect('/onboarding');
  return { ...context, businessId: context.membership.business_id };
}
export async function customerList(params: Record<string, string | string[] | undefined>) {
  const { supabase, businessId } = await workspaceData();
  const filters = listQuery(params);
  let query = supabase.from('customers').select('id,full_name,email,phone,archived_at,created_at', { count: 'exact' }).eq('business_id', businessId);
  if (filters.view === 'active') query = query.is('archived_at', null);
  if (filters.view === 'archived') query = query.not('archived_at', 'is', null);
  if (filters.q) query = query.textSearch('search_document', filters.q, { type: 'websearch', config: 'simple' });
  query = filters.sort === 'name' ? query.order('full_name') : query.order('created_at', { ascending: filters.sort === 'oldest' });
  const { data, error, count } = await query.order('id').range((filters.page - 1) * PAGE_SIZE, filters.page * PAGE_SIZE - 1);
  if (error) throw new Error('Customers could not be loaded.');
  return { customers: data, count: count ?? 0, filters };
}
export async function leadList(params: Record<string, string | string[] | undefined>) {
  const { supabase, businessId } = await workspaceData(); const filters = listQuery(params);
  let query = supabase.from('leads').select('id,property_address,status,work_type,preferred_start_date,archived_at,created_at', { count: 'exact' }).eq('business_id', businessId);
  if (filters.view === 'active') query = query.is('archived_at', null);
  if (filters.view === 'archived') query = query.not('archived_at', 'is', null);
  if (filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters.q) query = query.textSearch('search_document', filters.q, { type: 'websearch', config: 'simple' });
  const { data, error, count } = await query.order('created_at', { ascending: filters.sort === 'oldest' }).order('id').range((filters.page - 1) * PAGE_SIZE, filters.page * PAGE_SIZE - 1);
  if (error) throw new Error('Leads could not be loaded.');
  return { leads: data, count: count ?? 0, filters };
}
export async function customerDetails(id: string) {
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase, businessId } = await workspaceData();
  const [{ data: customer, error }, addresses, leads, activity, quotations, jobs, messages, emails] = await Promise.all([
    supabase.from('customers').select('*').eq('business_id', businessId).eq('id', id).maybeSingle(),
    supabase.from('customer_addresses').select('*').eq('business_id', businessId).eq('customer_id', id).order('created_at'),
    supabase.from('leads').select('id,property_address,status').eq('business_id', businessId).eq('customer_id', id).order('created_at', { ascending: false }).limit(10),
    supabase.from('activity_logs').select('id,event_type,created_at').eq('business_id', businessId).eq('entity_type', 'customer').eq('entity_id', id).order('created_at', { ascending: false }).limit(20),
    supabase.from('quotations').select('id,reference,status,total,currency').eq('business_id', businessId).eq('customer_id', id).order('created_at', { ascending: false }).limit(20),
    supabase.from('jobs').select('id,title,status').eq('business_id', businessId).eq('customer_id', id).order('created_at', { ascending: false }).limit(20),
    supabase.from('quotation_messages').select('id,body,created_at,quotations!inner(customer_id,reference)').eq('business_id', businessId).eq('quotations.customer_id', id).order('created_at', { ascending: false }).limit(20),
    supabase.from('email_logs').select('id,subject,status,created_at').eq('business_id', businessId).eq('customer_id', id).order('created_at', { ascending: false }).limit(20),
  ]);
  if (error || addresses.error || leads.error || activity.error || quotations.error || jobs.error || messages.error || emails.error) throw new Error('Customer details could not be loaded.');
  if (!customer) notFound();
  return { customer, addresses: addresses.data, leads: leads.data, activity: activity.data, quotations: quotations.data, jobs: jobs.data, messages: messages.data, emails: emails.data };
}
export async function leadDetails(id: string) {
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase, businessId } = await workspaceData();
  const { data: lead, error } = await supabase.from('leads').select('*').eq('business_id', businessId).eq('id', id).maybeSingle();
  if (error) throw new Error('Lead could not be loaded.'); if (!lead) notFound();
  const [customer, activity, photos] = await Promise.all([
    supabase.from('customers').select('id,full_name,email,phone').eq('business_id', businessId).eq('id', lead.customer_id).single(),
    supabase.from('activity_logs').select('id,event_type,created_at,metadata').eq('business_id', businessId).eq('entity_type', 'lead').eq('entity_id', id).order('created_at', { ascending: false }).limit(30),
    supabase.from('lead_photos').select('id,storage_path,ai_consent_at').eq('business_id', businessId).eq('lead_id', id).order('created_at'),
  ]);
  if (customer.error || activity.error || photos.error) throw new Error('Lead context could not be loaded.');
  const photoLinks = await Promise.all(photos.data.map(async photo => {
    const signed = await supabase.storage.from('lead-photos').createSignedUrl(photo.storage_path, 300);
    if (signed.error) throw new Error('A property photo could not be loaded.');
    return { id: photo.id, url: signed.data.signedUrl, aiConsent: !!photo.ai_consent_at };
  }));
  return { lead, customer: customer.data, activity: activity.data, photos: photoLinks };
}
export async function customerOptions() {
  const { supabase, businessId } = await workspaceData();
  const { data, error } = await supabase.from('customers').select('id,full_name').eq('business_id', businessId).is('archived_at', null).order('full_name').limit(1000);
  if (error) throw new Error('Customers could not be loaded.'); return data;
}
