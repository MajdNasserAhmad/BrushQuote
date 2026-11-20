import 'server-only';
import { workspaceData } from '@/features/crm/data';
import { aiConfig } from '@/lib/ai/config';
import { subscriptionSummarySchema } from '@/features/settings/subscription';
export async function aiWorkspace() {
  const context = await workspaceData(); const { supabase, businessId, user } = context;
  const now = new Date(); const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const [settings, recent, usage, customers, leads, conversations, photoAnalyses, subscription] = await Promise.all([
    supabase.from('business_ai_settings').select('*').eq('business_id', businessId).maybeSingle(),
    supabase.from('ai_results').select('id,created_at,ai_usage!inner(task,model)').eq('business_id', businessId).eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('ai_usage').select('status,input_tokens,output_tokens,estimated_cost_usd,created_at').eq('business_id', businessId).gte('created_at', month).order('created_at').limit(1001),
    supabase.from('customers').select('id,full_name').eq('business_id', businessId).is('archived_at', null).order('full_name').limit(1000),
    supabase.from('leads').select('id,customer_id,property_address').eq('business_id', businessId).is('archived_at', null).order('created_at', { ascending: false }).limit(1000),
    supabase.from('ai_conversations').select('id,title').eq('business_id', businessId).eq('user_id', user.id).is('archived_at', null).order('updated_at', { ascending: false }).limit(10),
    supabase.from('ai_results').select('id,created_at,ai_usage!inner(task,status)').eq('business_id', businessId).eq('user_id', user.id).eq('ai_usage.task', 'photo_analyzer').eq('ai_usage.status', 'succeeded').order('created_at', { ascending: false }).limit(20),
    supabase.rpc('subscription_summary', { target_business: businessId }),
  ]);
  if (settings.error || recent.error || usage.error || customers.error || leads.error || conversations.error || photoAnalyses.error || subscription.error) throw new Error('AI workspace could not be loaded.');
  const plan = subscriptionSummarySchema.parse(subscription.data).plan;
  let configured = false; let enabled = false; let models: string[] = [];
  try { const config = aiConfig(); configured = !!config.GROQ_API_KEY; enabled = config.AI_ENABLED; models = [config.GROQ_TEXT_MODEL, config.GROQ_REASONING_MODEL, config.GROQ_VISION_MODEL]; } catch { /* Show configuration state, never expose environment values. */ }
  return { configured, enabled, models, plan, dailyLimit: Math.min(plan.daily_ai, settings.data?.daily_limit ?? 20), monthlyLimit: Math.min(plan.monthly_ai, settings.data?.monthly_limit ?? 200), conversations: conversations.data, photoAnalyses: photoAnalyses.data.map(p => ({ id: p.id, label: `${new Date(p.created_at).toISOString().slice(0, 16).replace('T', ' ')} UTC` })), canManage: ['owner', 'admin'].includes(context.membership!.role), settings: settings.data ?? { enabled: true, vision_enabled: true, reasoning_enabled: false, daily_limit: 20, monthly_limit: 200 }, recent: recent.data, customers: customers.data, leads: leads.data,
    usage: { month: usage.data.length, day: usage.data.filter(u => u.created_at >= day).length, inputTokens: usage.data.reduce((sum, u) => sum + (u.input_tokens ?? 0), 0), outputTokens: usage.data.reduce((sum, u) => sum + (u.output_tokens ?? 0), 0), incompleteTokens: usage.data.some(u => u.input_tokens === null || u.output_tokens === null), cost: usage.data.length && usage.data.every(u => u.estimated_cost_usd !== null) ? usage.data.reduce((sum, u) => sum + u.estimated_cost_usd!, 0).toFixed(8) : null },
  };
}
