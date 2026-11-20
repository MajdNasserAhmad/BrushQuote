import { z } from 'zod';
export const chatbotSettingsSchema = z.strictObject({ enabled: z.boolean(), approved_business_info: z.string().max(8000), pricing_policy: z.string().max(3000), business_hours: z.string().max(1000), fallback_message: z.string().trim().min(1).max(1000), faqs: z.array(z.strictObject({ question: z.string().trim().min(1).max(300), answer: z.string().trim().min(1).max(1000) })).max(10), confirmed: z.literal(true) });
export const chatbotAnswerSchema = z.strictObject({ fact_ids: z.array(z.string().min(1).max(50)).max(4), needs_human: z.boolean() });
export const publicChatSchema = z.strictObject({ question: z.string().trim().min(2).max(1500), challenge: z.string().max(1000), website: z.literal(''), confirmed: z.literal(true) });
export type ApprovedFact = { id: string; text: string };
export function approvedAnswer(output: z.infer<typeof chatbotAnswerSchema>, facts: ApprovedFact[]) {
  if (output.fact_ids.some(id => !facts.some(fact => fact.id === id))) throw new Error('Unknown approved fact.');
  return [...new Set(output.fact_ids)].map(id => facts.find(fact => fact.id === id)!.text);
}
