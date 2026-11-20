'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { workspaceData } from '@/features/crm/data';
import { AIError } from '@/lib/ai/errors';
import { runWorkspaceAI } from '@/lib/ai/run';
import { aiSettingsSchema, generateSchema, suggestionSchemaFor, type AISuggestion } from './schema';
import { taskContext } from './context';
import { validateSuggestion } from './validate';
const instructions = {
  quote_generator: 'Suggest work scope, preparation, materials and labour requirements, estimated duration, and clarification questions. quote_items may use only supplied service IDs. Do not output prices or totals. Quantity must be null unless supported by measurements explicitly present in the input; quote the exact supporting measurement text in measurement_evidence. If measurements are missing, ask questions; never infer dimensions from photographs. email, schedule and observations must be null.',
  photo_analyzer: 'Describe visible surface observations, possible preparation, painting work and inspection needs. These are suggestions, not a professional inspection. Never diagnose hidden structural defects or hazardous materials, and never claim precise measurements. State confidence and limitations for every observation. Ask clarification questions. email, quote_items and schedule must be null.',
  email_assistant: 'Return an editable email draft. Do not claim an email was sent. Do not invent payment debts, dates, prices or appointments. Ask for missing facts or use clearly marked placeholders. quote_items, schedule and observations must be null.',
  business_analyst: 'Interpret only verified metrics supplied. Do not invent missing data or recompute financial totals. Never call quoted/accepted amounts collected revenue. Report missing metrics as unavailable. Distinguish suggestions from facts. email, quote_items, schedule and observations must be null.',
  business_assistant: 'Answer using only the supplied bounded workspace context. Acknowledge information not provided. Recommend allowed navigation actions, never claim actions were executed. email, quote_items, schedule and observations must be null.',
  job_planner: 'Suggest a single continuous job time reservation, using only the supplied worker IDs and explicit requirements. Explain preparation/work phases in suggestions. Use a real IANA time zone. Avoid supplied reserved intervals and stay within the supplied availability window. Never promise availability: the owner must review and the database must validate conflicts before saving. Ask for missing dates/duration rather than inventing them; schedule may be null. email, quote_items and observations must be null.',
} as const;
export type GenerateState = { error?: string; id?: string; data?: AISuggestion; model?: string; cached?: boolean; conversationId?: string };
export async function generateSuggestion(raw: unknown): Promise<GenerateState> {
  const context = await workspaceData(); const parsed = generateSchema.safeParse(raw);
  if (!parsed.success) return { error: 'Check the required inputs and confirm sharing the selected context with Groq.' };
  try {
    const input = parsed.data; const { facts, images } = await taskContext(context, input);
    const result = await runWorkspaceAI(context, { task: input.task, instructions: `${instructions[input.task]}${input.task === 'email_assistant' ? ` Tone: ${input.tone}. Email purpose: ${input.purpose}.` : ''}`, input: JSON.stringify(facts), schema: suggestionSchemaFor(input.task), images, useReasoning: input.reasoning }, async data => {
      // Re-read current membership/service IDs before storing or reusing a result.
      const [services, workers] = await Promise.all([context.supabase.from('business_pricing_rules').select('service_id').eq('business_id', context.businessId), context.supabase.from('business_memberships').select('user_id').eq('business_id', context.businessId)]);
      if (services.error || workers.error) throw new AIError('storage');
      validateSuggestion(data, input.task, facts, services.data.map(s => s.service_id), workers.data.map(w => w.user_id));
    });
    let conversationId: string | undefined;
    if (input.task === 'business_assistant') {
      const exchange = await context.supabase.rpc('save_ai_exchange', { target_business: context.businessId, target_conversation: input.conversation_id || null!, result: result.id, question: input.prompt });
      if (exchange.error || !exchange.data) throw new AIError('storage'); conversationId = exchange.data;
    }
    revalidatePath('/dashboard/ai'); return { ...result, conversationId };
  } catch (error) { return { error: error instanceof AIError ? error.message : 'AI could not complete this request. Nothing was applied.' }; }
}
export async function saveAISettings(raw: unknown) {
  const { supabase, businessId } = await workspaceData(); const parsed = aiSettingsSchema.safeParse(raw);
  if (!parsed.success) return { error: 'Check the AI settings and request limits.' };
  const result = await supabase.rpc('save_ai_settings', { target_business: businessId, settings: parsed.data });
  if (result.error) return { error: 'Only a workspace owner or administrator can update valid AI settings.' };
  revalidatePath('/dashboard/ai'); return { success: true };
}
export async function listAnalysisPhotos(leadId: string) {
  const { supabase, businessId } = await workspaceData();
  if (!z.uuid().safeParse(leadId).success) return [];
  const result = await supabase.from('lead_photos').select('id,ai_consent_at').eq('business_id', businessId).eq('lead_id', leadId).order('created_at').limit(5);
  if (result.error) throw new Error('Photos could not be loaded.');
  return result.data.map((photo, index) => ({ id: photo.id, label: `Photo ${index + 1}`, consent: !!photo.ai_consent_at }));
}
