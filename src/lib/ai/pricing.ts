import 'server-only';
import { z } from 'zod';
import { AIError } from './errors';
import type { AIUsage } from './provider';
const price = z.string().regex(/^\d{1,6}(\.\d{1,8})?$/);
const pricingSchema = z.record(z.string().min(1).max(160), z.strictObject({ input_per_million: price, output_per_million: price, version: z.string().min(1).max(100) }));
export function estimatedCost(model: string, usage: AIUsage, configuration = process.env.AI_MODEL_PRICING_JSON) {
  if (!configuration?.trim() || usage.inputTokens === null || usage.outputTokens === null) return { estimated_cost_usd: null, pricing_version: null };
  let decoded: unknown;
  try { decoded = JSON.parse(configuration); } catch { throw new AIError('configuration'); }
  const parsed = pricingSchema.safeParse(decoded);
  if (!parsed.success) throw new AIError('configuration');
  const rate = parsed.data[model];
  if (!rate) return { estimated_cost_usd: null, pricing_version: null };
  const scaled = (value: string) => { const [whole, fraction = ''] = value.split('.'); return BigInt(whole) * 100000000n + BigInt(fraction.padEnd(8, '0')); };
  const numerator = BigInt(usage.inputTokens) * scaled(rate.input_per_million) + BigInt(usage.outputTokens) * scaled(rate.output_per_million);
  const amount = (numerator + 500000n) / 1000000n;
  // Numeric column is generated as number; the final bounded decimal is a display estimate only.
  return { estimated_cost_usd: Number(`${amount / 100000000n}.${(amount % 100000000n).toString().padStart(8, '0')}`), pricing_version: rate.version };
}
