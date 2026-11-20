import { describe, expect, it } from 'vitest';
import { approvedAnswer, chatbotSettingsSchema } from '@/features/ai/chatbot-schema';
import { generateSchema, suggestionSchema, suggestionSchemaFor } from '@/features/ai/schema';
describe('AI content boundaries', () => {
  it('constrains unrelated output fields to null for each task', () => {
    const output = { summary: 'Visible paint', suggestions: [], questions: [], email: { subject: 'Wrong task', body: 'Unexpected email' }, quote_items: null, schedule: null, observations: [{ observation: 'Plain colour', preparation: 'Inspect first', confidence: 'low', limitation: 'Artificial image', inspection_needed: true }], actions: [] };
    expect(suggestionSchemaFor('photo_analyzer').safeParse(output).success).toBe(false);
    expect(suggestionSchemaFor('photo_analyzer').safeParse({ ...output, email: null }).success).toBe(true);
    expect(suggestionSchemaFor('email_assistant').safeParse({ ...output, observations: null }).success).toBe(true);
  });
  it('public chatbot returns only approved facts and rejects invented source IDs', () => {
    const facts = [{ id: 'pricing', text: 'An inspection is required for a final price.' }];
    expect(approvedAnswer({ fact_ids: ['pricing', 'pricing'], needs_human: false }, facts)).toEqual([facts[0].text]);
    expect(() => approvedAnswer({ fact_ids: ['private-customer-record'], needs_human: false }, facts)).toThrow('Unknown approved fact');
  });
  it('requires explicit transmission confirmation and rejects business ID injection', () => {
    const input = { task: 'email_assistant', prompt: 'Draft a reply', transmission_confirmed: true };
    expect(generateSchema.safeParse(input).success).toBe(true);
    expect(generateSchema.safeParse({ ...input, transmission_confirmed: false }).success).toBe(false);
    expect(generateSchema.safeParse({ ...input, business_id: 'forged' }).success).toBe(false);
  });
  it('requires public knowledge approval', () => {
    expect(chatbotSettingsSchema.safeParse({ enabled: true, approved_business_info: 'Approved', pricing_policy: '', business_hours: '', fallback_message: 'Contact us.', faqs: [], confirmed: false }).success).toBe(false);
  });
  it('does not admit model-generated prices or arbitrary action URLs', () => {
    const output = { summary: 'Suggestion', suggestions: [], questions: [], email: null, quote_items: null, schedule: null, observations: null, actions: [] };
    expect(suggestionSchema.safeParse(output).success).toBe(true);
    expect(suggestionSchema.safeParse({ ...output, total: '100' }).success).toBe(false);
    expect(suggestionSchema.safeParse({ ...output, actions: ['https://example.invalid/action'] }).success).toBe(false);
  });
});
