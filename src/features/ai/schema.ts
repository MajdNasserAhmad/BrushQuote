import { z } from 'zod';
export const tools = {
  quote_generator: { title: 'Quote Copilot', description: 'Turn property requirements and your service prices into an editable proposal.' },
  photo_analyzer: { title: 'Photo Analyzer', description: 'Review visible painting conditions in customer photos shared with consent.' },
  email_assistant: { title: 'Email Assistant', description: 'Write a customer reply, introduction or follow-up in your preferred tone.' },
  business_analyst: { title: 'Business Analyst', description: 'Interpret verified business figures and identify follow-up opportunities.' },
  customer_chatbot: { title: 'Customer Chatbot', description: 'Help visitors using only business information you approve for the public.' },
  job_planner: { title: 'Job Planner', description: 'Suggest a work plan using team availability and project requirements.' },
  business_assistant: { title: 'Business Assistant', description: 'Ask about your workspace and review suggestions before taking action.' },
} as const;
export const taskSchema = z.enum(['quote_generator', 'photo_analyzer', 'email_assistant', 'business_analyst', 'customer_chatbot', 'job_planner', 'business_assistant']);
const shortText = z.string().min(1).max(1000);
export const suggestionSchema = z.strictObject({
  summary: z.string().min(1).max(3000),
  suggestions: z.array(shortText).max(12),
  questions: z.array(shortText).max(10),
  email: z.strictObject({ subject: z.string().min(1).max(200), body: z.string().min(1).max(10000) }).nullable(),
  quote_items: z.array(z.strictObject({ service_id: z.uuid(), description: shortText, quantity: z.string().regex(/^\d{1,7}(\.\d{1,4})?$/).nullable(), measurement_evidence: shortText.nullable() })).max(30).nullable(),
  schedule: z.strictObject({ title: z.string().min(1).max(200), starts_local: z.string().regex(/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/), ends_local: z.string().regex(/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/), timezone: z.string().min(1).max(100), worker_ids: z.array(z.uuid()).min(1).max(50), notes: z.string().max(5000) }).nullable(),
  observations: z.array(z.strictObject({ observation: shortText, preparation: shortText, confidence: z.enum(['low', 'medium', 'high']), limitation: shortText, inspection_needed: z.boolean() })).max(12).nullable(),
  actions: z.array(z.enum(['view_quotations', 'view_customers', 'view_jobs', 'draft_email', 'view_report'])).max(5),
});
export type AISuggestion = z.infer<typeof suggestionSchema>;
export function suggestionSchemaFor(task: Exclude<z.infer<typeof taskSchema>, 'customer_chatbot'>): z.ZodType<AISuggestion> {
  return suggestionSchema.extend({
    email: task === 'email_assistant' ? suggestionSchema.shape.email.unwrap() : z.null(),
    quote_items: task === 'quote_generator' ? suggestionSchema.shape.quote_items : z.null(),
    schedule: task === 'job_planner' ? suggestionSchema.shape.schedule : z.null(),
    observations: task === 'photo_analyzer' ? suggestionSchema.shape.observations.unwrap().min(1) : z.null(),
  });
}
export const generateSchema = z.strictObject({
  task: taskSchema.exclude(['customer_chatbot']),
  prompt: z.string().trim().min(3).max(6000),
  customer_id: z.union([z.uuid(), z.literal('')]).default(''),
  lead_id: z.union([z.uuid(), z.literal('')]).default(''),
  tone: z.enum(['professional', 'friendly', 'formal', 'short and direct']).default('professional'),
  purpose: z.enum(['new customer reply', 'quotation introduction', 'quotation follow-up', 'appointment confirmation', 'payment reminder', 'thank-you message', 'professional customer response']).default('new customer reply'),
  reasoning: z.boolean().default(false),
  conversation_id: z.union([z.uuid(), z.literal('')]).default(''),
  photo_analysis_id: z.union([z.uuid(), z.literal('')]).default(''),
  photo_ids: z.array(z.uuid()).max(3).default([]),
  transmission_confirmed: z.literal(true),
});
export type GenerateInput = z.infer<typeof generateSchema>;
export const aiSettingsSchema = z.strictObject({ default_model_role: z.enum(['text', 'reasoning']).default('text'), enabled: z.boolean(), vision_enabled: z.boolean(), reasoning_enabled: z.boolean(), daily_limit: z.number().int().min(0).max(100), monthly_limit: z.number().int().min(0).max(1000) });
