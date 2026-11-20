import { z } from 'zod';
export const subscriptionSummarySchema = z.object({
  plan: z.object({ id: z.enum(['free', 'starter', 'professional']), name: z.string(), daily_ai: z.number(), monthly_ai: z.number(), monthly_quotes: z.number(), ai_tasks: z.array(z.string()) }),
  subscription: z.object({ status: z.enum(['trial', 'active']), trial_ends_at: z.string().nullable() }).nullable(), ai_used: z.number(), quotes_used: z.number(),
});
