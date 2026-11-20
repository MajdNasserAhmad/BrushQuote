import { expect, test, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { z } from 'zod';
import sharp from 'sharp';
import { aiConfig } from '@/lib/ai/config';
import { GroqProvider } from '@/lib/ai/groq-provider';
import { suggestionSchema } from '@/features/ai/schema';
import type { AIUsage } from '@/lib/ai/provider';
// Explicit live contract checks: this file is excluded from the ordinary unit suite.
// Only fictional text and a generated plain colour image are transmitted to Groq.
test('live Groq text model produces a validated editable email with reported usage', async () => {
  if (!process.env.GROQ_API_KEY?.trim()) throw new Error('Live verification requires GROQ_API_KEY in .env.local. No provider call was attempted.');
  const provider = new GroqProvider(aiConfig()); let recorded: AIUsage | undefined;
  const result = await provider.generate({ task: 'email_assistant', schema: suggestionSchema, instructions: 'Write a brief professional email draft. Fill summary and email. Return empty suggestions/questions/actions arrays. quote_items, schedule and observations must be null. Do not invent a price or date.', input: 'Fictional test: Example Painting wants to thank Example Customer for asking about painting one bedroom. Ask for room measurements and a convenient inspection time. Do not send anything.' }, async usage => { recorded = usage; });
  expect(result.data.email?.subject.length).toBeGreaterThan(0); expect(result.data.email?.body.length).toBeGreaterThan(20);
  expect(recorded?.inputTokens).toBeGreaterThan(0); expect(recorded?.outputTokens).toBeGreaterThan(0);
});
test('live Groq configured vision model accepts an artificial image and validates structured output', async () => {
  if (!process.env.GROQ_API_KEY?.trim()) throw new Error('Live vision verification requires GROQ_API_KEY. No provider call was attempted.');
  const buffer = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#00aa00' } }).jpeg().toBuffer();
  const schema = z.strictObject({ dominant_colour: z.enum(['green', 'red', 'blue', 'other']), limitations: z.string().min(1).max(1000) });
  const provider = new GroqProvider(aiConfig());
  const result = await provider.generate({ task: 'photo_analyzer', schema, instructions: 'Identify the dominant colour. State that an artificial colour image cannot establish real property conditions or dimensions.', input: 'Artificial test image, no customer photograph or personal information.', images: [{ url: `data:image/jpeg;base64,${buffer.toString('base64')}`, bytes: buffer.length, consent: true }] }, async () => {});
  expect(result.data.dominant_colour).toBe('green'); expect(result.usage.inputTokens).toBeGreaterThan(0);
});
