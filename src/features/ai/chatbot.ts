import 'server-only';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import type { ApprovedFact } from './chatbot-schema';
export async function publicChatbot(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return null;
  const admin = createSupabaseAdmin();
  // Deliberately separate from workspace context: this reads no customers, prices,
  // quotations, appointments, internal notes or private result/conversation records.
  const business = await admin.from('businesses').select('id,name,service_areas').eq('slug', slug).maybeSingle();
  if (business.error) throw new Error('Chatbot unavailable.'); if (!business.data) return null;
  const id = business.data.id;
  const [settings, services, faqs] = await Promise.all([
    admin.from('business_chatbot_settings').select('enabled,approved_at,approved_business_info,pricing_policy,business_hours,fallback_message').eq('business_id', id).eq('enabled', true).not('approved_at', 'is', null).maybeSingle(),
    admin.from('business_services').select('name').eq('business_id', id).eq('enabled', true).order('name').limit(100),
    admin.from('business_faqs').select('id,question,answer').eq('business_id', id).eq('published', true).order('position').limit(10),
  ]);
  if (settings.error || services.error || faqs.error) throw new Error('Chatbot unavailable.'); if (!settings.data) return null;
  const facts: ApprovedFact[] = [
    { id: 'about', text: settings.data.approved_business_info },
    { id: 'hours', text: settings.data.business_hours },
    { id: 'pricing', text: settings.data.pricing_policy },
    { id: 'services', text: `Services: ${services.data.map(s => s.name).join(', ')}.` },
    { id: 'areas', text: `Service areas: ${business.data.service_areas.join(', ')}.` },
    { id: 'process', text: 'Use the quotation request form to share your project details. The business will review your request; submitting does not confirm a price or appointment.' },
    ...faqs.data.map(faq => ({ id: `faq-${faq.id}`, text: `${faq.question}\n${faq.answer}` })),
  ].filter(fact => fact.text.trim());
  return { id, name: business.data.name, fallback: settings.data.fallback_message, facts };
}
