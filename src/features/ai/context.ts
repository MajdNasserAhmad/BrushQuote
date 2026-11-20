import 'server-only';
import sharp from 'sharp';
import { workspaceData } from '@/features/crm/data';
import { AIError } from '@/lib/ai/errors';
import type { AIImage } from '@/lib/ai/provider';
import { suggestionSchema, type GenerateInput } from './schema';
export async function taskContext(context: Awaited<ReturnType<typeof workspaceData>>, input: GenerateInput) {
  const { supabase, businessId } = context;
  const facts: Record<string, unknown> = { request: input.prompt };
  const images: AIImage[] = [];
  const business = await supabase.from('businesses').select('name,currency,service_areas').eq('id', businessId).single();
  if (business.error) throw new AIError('storage'); facts.business = business.data;
  if (input.customer_id) {
    const customer = await supabase.from('customers').select('id,full_name').eq('business_id', businessId).eq('id', input.customer_id).is('archived_at', null).maybeSingle();
    if (customer.error || !customer.data) throw new AIError('invalid_input'); facts.customer = customer.data;
  }
  if (input.lead_id) {
    const lead = await supabase.from('leads').select('id,customer_id,property_type,room_count,painting_areas,room_measurements,wall_condition,work_type,preferred_start_date,additional_information').eq('business_id', businessId).eq('id', input.lead_id).is('archived_at', null).maybeSingle();
    if (lead.error || !lead.data || (input.customer_id && lead.data.customer_id !== input.customer_id)) throw new AIError('invalid_input'); facts.lead = lead.data;
  }
  if (input.task === 'quote_generator' || input.task === 'job_planner') {
    const services = await supabase.from('business_pricing_rules').select('service_id,unit,unit_price,business_services!inner(name,enabled)').eq('business_id', businessId).eq('enabled', true).eq('business_services.enabled', true).limit(100);
    if (services.error) throw new AIError('storage'); facts.services = services.data;
  }
  if (input.task === 'quote_generator' && input.photo_analysis_id) {
    const analysis = await supabase.from('ai_results').select('content,ai_usage!inner(task,status)').eq('business_id', businessId).eq('user_id', context.user.id).eq('id', input.photo_analysis_id).maybeSingle();
    if (analysis.error || !analysis.data || analysis.data.ai_usage.task !== 'photo_analyzer' || analysis.data.ai_usage.status !== 'succeeded') throw new AIError('invalid_input');
    const parsed = suggestionSchema.safeParse(analysis.data.content); if (!parsed.success || !parsed.data.observations) throw new AIError('invalid_input');
    facts.reviewed_photo_observations = parsed.data.observations;
    facts.photo_limitations = 'User-selected earlier AI observations, not a professional inspection. No exact dimensions may be inferred; observations may be incomplete or out of date.';
  }
  if (input.task === 'business_analyst' || input.task === 'business_assistant') {
    const [metrics, quotes, jobs] = await Promise.all([
      supabase.rpc('ai_business_metrics', { target_business: businessId }),
      supabase.from('quotations').select('reference,status,total,currency,expires_on').eq('business_id', businessId).eq('status', 'sent').order('expires_on').limit(20),
      supabase.from('jobs').select('title,status,starts_at,ends_at').eq('business_id', businessId).in('status', ['scheduled', 'in_progress']).order('starts_at').limit(20),
    ]);
    if (metrics.error || quotes.error || jobs.error) throw new AIError('storage');
    facts.metrics = metrics.data; facts.pending_quotations_first_20 = quotes.data; facts.active_jobs_first_20 = jobs.data;
    facts.metric_definitions = 'Revenue means quotation values, not collected payments. Currency groups are separate. Monthly values are grouped by quotation issue date, not acceptance or payment date. Counts in metrics are complete; detail lists are limited to 20.';
  }
  if (input.task === 'business_assistant' && input.conversation_id) {
    const conversation = await supabase.from('ai_conversations').select('id').eq('business_id', businessId).eq('user_id', context.user.id).eq('id', input.conversation_id).is('archived_at', null).maybeSingle();
    if (conversation.error || !conversation.data) throw new AIError('invalid_input');
    const messages = await supabase.from('ai_messages').select('role,content').eq('business_id', businessId).eq('conversation_id', input.conversation_id).order('sequence', { ascending: false }).limit(6);
    if (messages.error) throw new AIError('storage'); facts.previous_conversation = messages.data.reverse().map(m => ({ role: m.role, content: m.content.slice(0, 1500) }));
  }
  if (input.task === 'job_planner') {
    if (!input.customer_id) throw new AIError('invalid_input');
    const now = new Date(); const horizon = new Date(now.getTime() + 90 * 86400000).toISOString();
    const [workers, jobs, appointments] = await Promise.all([
      supabase.from('business_memberships').select('user_id,role').eq('business_id', businessId).limit(50),
      supabase.from('jobs').select('starts_at,ends_at,timezone,job_assignments(user_id)').eq('business_id', businessId).in('status', ['scheduled', 'in_progress']).gte('ends_at', now.toISOString()).lte('starts_at', horizon).limit(100),
      supabase.from('appointments').select('assigned_user_id,starts_at,ends_at,timezone').eq('business_id', businessId).eq('status', 'scheduled').gte('ends_at', now.toISOString()).lte('starts_at', horizon).limit(100),
    ]);
    if (workers.error || jobs.error || appointments.error) throw new AIError('storage');
    facts.workers = workers.data; facts.reserved_jobs = jobs.data; facts.reserved_appointments = appointments.data;
    facts.availability = { start: now.toISOString(), end: horizon, limitation: 'Up to 100 active jobs and 100 appointments, next 90 days only. No knowledge of leave or working hours. Final conflicts are always checked on save.' };
  }
  if (input.task === 'photo_analyzer') {
    if (!input.lead_id || !input.photo_ids.length) throw new AIError('invalid_input');
    const photos = await supabase.from('lead_photos').select('id,storage_path,ai_consent_at,byte_size').eq('business_id', businessId).eq('lead_id', input.lead_id).in('id', input.photo_ids);
    if (photos.error || photos.data.length !== new Set(input.photo_ids).size || photos.data.some(photo => !photo.ai_consent_at)) throw new AIError('invalid_input');
    for (const photo of photos.data) {
      if (photo.byte_size > 2 * 1024 * 1024) throw new AIError('invalid_input');
      const downloaded = await supabase.storage.from('lead-photos').download(photo.storage_path);
      if (downloaded.error || downloaded.data.size > 2 * 1024 * 1024) throw new AIError('storage');
      const bytes = await sharp(Buffer.from(await downloaded.data.arrayBuffer()), { limitInputPixels: 20000000 }).rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer();
      if (bytes.length > 1024 * 1024) throw new AIError('invalid_input');
      images.push({ url: `data:image/jpeg;base64,${bytes.toString('base64')}`, bytes: bytes.length, consent: true });
    }
  }
  return { facts, images };
}
