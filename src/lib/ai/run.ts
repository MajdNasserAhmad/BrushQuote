import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { workspaceData } from '@/features/crm/data';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/database';
import { aiConfig, routeModel } from './config';
import { AIError } from './errors';
import { GroqProvider, providerSchema } from './groq-provider';
import { estimatedCost } from './pricing';
import type { AIRequest, AIUsage } from './provider';
import { subscriptionSummarySchema } from '@/features/settings/subscription';

export async function runWorkspaceAI<T>(context: Awaited<ReturnType<typeof workspaceData>>, request: AIRequest<T>, validate?: (data: T) => Promise<void>) {
  const { businessId, user, supabase } = context;
  const subscription = await supabase.rpc('subscription_summary', { target_business: businessId });
  if (subscription.error) throw new AIError('storage');
  if (!subscriptionSummarySchema.parse(subscription.data).plan.ai_tasks.includes(request.task)) throw new AIError('plan_feature');
  const settings = await supabase.from('business_ai_settings').select('*').eq('business_id', businessId).maybeSingle();
  if (settings.error) throw new AIError('storage');
  request = { ...request, useReasoning: request.task !== 'photo_analyzer' && (request.useReasoning || settings.data?.default_model_role === 'reasoning') };
  const config = aiConfig(); const selected = routeModel(request.task, config, request.useReasoning);
  if (settings.data && (!settings.data.enabled || (request.useReasoning && !settings.data.reasoning_enabled))) throw new AIError('disabled');
  if (request.task === 'photo_analyzer' && settings.data && !settings.data.vision_enabled) throw new AIError('vision_disabled');
  // Fingerprints contain no raw prompt. Cache is isolated by business AND user.
  // Signed photo URLs are deliberately not reused; callers supply current consent each time.
  const fingerprint = createHash('sha256').update(JSON.stringify({ version: 1, model: selected.model, task: request.task, instructions: request.instructions, input: request.input, schema: providerSchema(request.schema), maxTokens: config.AI_MAX_OUTPUT_TOKENS })).digest('hex');
  if (!request.images?.length) {
    const cached = await supabase.from('ai_results').select('id,content,ai_usage!inner(model,task)').eq('business_id', businessId).eq('user_id', user.id).eq('cache_key', fingerprint).gte('created_at', new Date(Date.now() - 86400000).toISOString()).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (cached.error) throw new AIError('storage');
    if (cached.data) {
      const parsed = request.schema.safeParse(cached.data.content);
      if (parsed.success) { await validate?.(parsed.data); return { id: cached.data.id, data: parsed.data, model: cached.data.ai_usage.model, cached: true }; }
    }
  }
  const provider = new GroqProvider(config);
  // A missing/unavailable model doesn't consume the workspace generation quota.
  await provider.verifyModel(request.task, request.useReasoning);
  estimatedCost(selected.model, { inputTokens: 0, outputTokens: 0, attempts: 0 });
  const admin = createSupabaseAdmin();
  const reserved = await admin.rpc('reserve_ai_request', { target_business: businessId, actor: user.id, request: randomUUID(), task_name: request.task, model_name: selected.model, reasoning: request.useReasoning ?? false });
  if (reserved.error || !reserved.data) throw new AIError(reserved.error?.message.includes('AI_USAGE_LIMIT') ? 'usage_limit' : reserved.error?.message.includes('AI_PLAN_FEATURE') ? 'plan_feature' : reserved.error?.message.includes('AI_DISABLED') ? 'disabled' : 'storage');
  const usageId = reserved.data;
  async function recordUsage(usage: AIUsage) {
    const result = await admin.from('ai_usage').update({ input_tokens: usage.inputTokens, output_tokens: usage.outputTokens, attempts: usage.attempts, ...estimatedCost(selected.model, usage) }).eq('business_id', businessId).eq('user_id', user.id).eq('id', usageId).eq('status', 'reserved').select('id').single();
    if (result.error) throw new AIError('storage');
  }
  try {
    const result = await provider.generate(request, recordUsage);
    await validate?.(result.data);
    const stored = await admin.rpc('complete_ai_request', { target_business: businessId, actor: user.id, usage: usageId, output: JSON.parse(JSON.stringify(result.data)) as Json, fingerprint });
    if (stored.error || !stored.data) throw new AIError('storage');
    return { id: stored.data, data: result.data, model: result.model, cached: false };
  } catch (error) {
    const safe = error instanceof AIError ? error : new AIError('provider_unavailable');
    // Conditional update preserves a committed success after an ambiguous transport failure.
    await admin.from('ai_usage').update({ status: 'failed', completed_at: new Date().toISOString(), error_code: safe.code }).eq('business_id', businessId).eq('user_id', user.id).eq('id', usageId).eq('status', 'reserved');
    throw safe;
  }
}
