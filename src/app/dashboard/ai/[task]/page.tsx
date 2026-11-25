import { notFound } from 'next/navigation';
import { PageHeading } from '@/features/crm/presentation';
import { aiWorkspace } from '@/features/ai/data';
import { AIForm } from '@/features/ai/form';
import { taskSchema, tools } from '@/features/ai/schema';
import Link from 'next/link';
import { workspaceData } from '@/features/crm/data';
import { ChatbotSettings } from '@/features/ai/chatbot-form';
import { VerifiedFigures } from '@/features/ai/verified-figures';
export default async function AITool({ params }: { params: Promise<{ task: string }> }) {
  const parsed = taskSchema.safeParse((await params).task); if (!parsed.success) notFound(); const task = parsed.data;
  const data = await aiWorkspace();
  if (task === 'customer_chatbot') {
    const { supabase, businessId } = await workspaceData();
    const [settings, faqs, business] = await Promise.all([supabase.from('business_chatbot_settings').select('*').eq('business_id', businessId).maybeSingle(), supabase.from('business_faqs').select('question,answer').eq('business_id', businessId).order('position'), supabase.from('businesses').select('slug').eq('id', businessId).single()]);
    if (settings.error || faqs.error || business.error) throw new Error('Chatbot settings could not be loaded.');
    return <><PageHeading title={tools[task].title} description={tools[task].description} /><p className="mt-5 text-sm text-muted-foreground">Groq selects relevant facts from your approved public information. It cannot read customer records or create prices and appointments. Public requests share your workspace AI quota.</p>{settings.data?.enabled && <Link prefetch={false} className="mt-4 inline-block text-primary underline" href={`/chat/${business.data.slug}`}>Open public chatbot</Link>}<ChatbotSettings canManage={data.canManage} initial={{ enabled: false, approved_business_info: '', pricing_policy: '', business_hours: '', fallback_message: 'Please contact us through the quotation request form.', ...settings.data, faqs: faqs.data }} /></>;
  }
  return <><PageHeading title={tools[task].title} description={tools[task].description} />{['business_analyst', 'business_assistant'].includes(task) && <VerifiedFigures />}<AIForm task={task} options={data} available={data.configured && data.enabled && data.settings.enabled && data.plan.ai_tasks.includes(task)} /></>;
}
