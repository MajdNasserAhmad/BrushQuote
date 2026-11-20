import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { estimatedCost } from '@/lib/ai/pricing';
describe('AI cost estimates', () => {
  const pricing = JSON.stringify({ model: { input_per_million: '0.075', output_per_million: '0.30', version: 'fictional-unit-test-rate' } });
  it('uses configured decimal prices and reported token counts', () => {
    expect(estimatedCost('model', { inputTokens: 1000, outputTokens: 100, attempts: 1 }, pricing)).toEqual({ estimated_cost_usd: 0.000105, pricing_version: 'fictional-unit-test-rate' });
  });
  it('never presents unavailable rates or unknown usage as zero cost', () => {
    expect(estimatedCost('model', { inputTokens: 1000, outputTokens: 100, attempts: 1 }, '')).toEqual({ estimated_cost_usd: null, pricing_version: null });
    expect(estimatedCost('model', { inputTokens: null, outputTokens: 100, attempts: 1 }, pricing).estimated_cost_usd).toBeNull();
    expect(estimatedCost('missing', { inputTokens: 1, outputTokens: 1, attempts: 1 }, pricing).estimated_cost_usd).toBeNull();
  });
  it('rejects malformed or negative rate configuration', () => {
    expect(() => estimatedCost('model', { inputTokens: 1, outputTokens: 1, attempts: 1 }, 'invalid')).toThrow('not configured');
    expect(() => estimatedCost('model', { inputTokens: 1, outputTokens: 1, attempts: 1 }, pricing.replace('0.075', '-1'))).toThrow('not configured');
  });
});
