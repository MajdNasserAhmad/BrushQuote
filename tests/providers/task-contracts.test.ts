import { expect, test, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import Groq from 'groq-sdk';
import sharp from 'sharp';
import { aiConfig } from '@/lib/ai/config';
import { GroqProvider } from '@/lib/ai/groq-provider';
import { suggestionSchemaFor } from '@/features/ai/schema';
import { validateSuggestion } from '@/features/ai/validate';
for (const task of ['photo_analyzer', 'job_planner'] as const) test(`live ${task} structured task contract`, async () => {
  const config = aiConfig(); const client = new Groq({ apiKey: config.GROQ_API_KEY, maxRetries: 0, timeout: config.AI_TIMEOUT_MS });
  const suggestionSchema = suggestionSchemaFor(task);
  const diagnostics: unknown[] = [];
  const provider = new GroqProvider(config, {
    models: async () => (await client.models.list()).data!.map(m => m.id),
    complete: async params => {
      try {
        const response = await client.chat.completions.create(params);
        let content: unknown; try { content = JSON.parse(response.choices[0].message.content ?? ''); } catch { content = null; }
        const parsed = suggestionSchema.safeParse(content);
        diagnostics.push({ finish: response.choices[0].finish_reason, tokens: response.usage?.completion_tokens, issues: parsed.success ? [] : parsed.error.issues.map(i => ({ path: i.path, code: i.code })), fields: parsed.success ? { email: !!parsed.data.email, quote: !!parsed.data.quote_items, observations: parsed.data.observations?.length, schedule: parsed.data.schedule } : undefined });
        return response;
      } catch (error) {
        // Diagnostic inputs are fictional. Never print response bodies, keys or headers.
        const detail = error instanceof Groq.APIError ? error.error as { error?: { message?: string; code?: string } } : undefined;
        diagnostics.push({ status: error instanceof Groq.APIError ? error.status : null, code: detail?.error?.code }); throw error;
      }
    },
  });
  const worker = '00000000-0000-4000-8000-000000000001';
  const bytes = await sharp({ create: { width: 160, height: 160, channels: 3, background: '#ddddcc' } }).jpeg().toBuffer();
  try {
    const result = await provider.generate({ task, schema: suggestionSchema,
      instructions: task === 'photo_analyzer' ? 'Describe visible observations, preparation, confidence and limitations. No professional inspection or dimensions. email, quote_items and schedule must be null.' : 'Suggest a single continuous job reservation using only supplied workers, start/end and timezone. email, quote_items and observations must be null.',
      input: task === 'photo_analyzer' ? 'Artificial plain colour image for testing. Return at least one observation and state the limitations.' : JSON.stringify({ worker, date: '2026-12-01', start: '09:00', end: '17:00', timezone: 'UTC', work: 'Painting one bedroom' }),
      images: task === 'photo_analyzer' ? [{ url: `data:image/jpeg;base64,${bytes.toString('base64')}`, bytes: bytes.length, consent: true }] : [],
    }, async () => {});
    validateSuggestion(result.data, task, {}, [], [worker]); expect(result.data.summary.length).toBeGreaterThan(0);
  } catch (error) { console.info(JSON.stringify({ task, diagnostics })); throw error; }
});
