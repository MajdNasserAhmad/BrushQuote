import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import Groq from 'groq-sdk';
import { z } from 'zod';
import type { ChatCompletion } from 'groq-sdk/resources/chat/completions';
import { aiConfig, routeModel } from '@/lib/ai/config';
import { GroqProvider, providerSchema, retryDelay } from '@/lib/ai/groq-provider';

const model = 'openai/gpt-oss-20b';
const config = aiConfig({ GROQ_API_KEY: 'unit-test-not-a-real-key' });
const schema = z.strictObject({ subject: z.string().min(2).max(100), body: z.string().min(2).max(1000) });
const request = { task: 'email_assistant' as const, input: 'Fictional painting inquiry.', instructions: 'Draft a reply without sending.', schema };
function completion(content = JSON.stringify({ subject: 'Test subject', body: 'Fictional test reply.' }), selectedModel = model): ChatCompletion {
  return { id: 'fixture', created: 1, object: 'chat.completion', model: selectedModel, choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content }, logprobs: null }], usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 } };
}
function setup(responses: ChatCompletion[] = [completion()], environment = config) {
  const api = { models: vi.fn(async () => [model, 'qwen/qwen3.8-27b', 'llama-3.3-70b-versatile']), complete: vi.fn(async () => responses.shift()!) };
  const sleep = vi.fn(async () => {}); const record = vi.fn(async () => {});
  return { provider: new GroqProvider(environment, api, sleep), api, sleep, record };
}
describe('Groq configuration and model boundaries', () => {
  it('fails closed on missing keys, disabled AI, unknown providers and unsupported capabilities', async () => {
    expect(() => routeModel('email_assistant', aiConfig({}))).toThrow('not configured');
    expect(() => aiConfig({ AI_PROVIDER: 'another-provider' })).toThrow('not configured');
    expect(() => routeModel('email_assistant', { ...config, AI_ENABLED: false })).toThrow('disabled');
    expect(() => routeModel('photo_analyzer', { ...config, AI_VISION_ENABLED: false })).toThrow('disabled');
    expect(() => routeModel('photo_analyzer', { ...config, GROQ_VISION_MODEL: model })).toThrow('capability');
    expect(() => routeModel('email_assistant', { ...config, GROQ_TEXT_MODEL: 'unreviewed' })).toThrow('capability');
    const run = setup([], aiConfig({})); await expect(run.provider.generate(request, run.record)).rejects.toThrow('not configured'); expect(run.api.models).not.toHaveBeenCalled();
  });
  it('checks actual account models and refuses an unavailable configured model', async () => {
    const run = setup(); run.api.models.mockResolvedValue([]);
    await expect(run.provider.generate(request, run.record)).rejects.toThrow('unavailable to this Groq account'); expect(run.api.complete).not.toHaveBeenCalled();
  });
  it('does not route to the expensive model by default', () => {
    expect(routeModel('business_analyst', config).model).toBe(model);
    expect(routeModel('business_analyst', config, true).model).toBe('openai/gpt-oss-120b');
  });
});
describe('validated generation', () => {
  it('uses strict JSON, validates content and records real usage without exposing provider errors', async () => {
    const run = setup(); const result = await run.provider.generate(request, run.record);
    expect(result.data.subject).toBe('Test subject'); expect(result.usage).toEqual({ inputTokens: 50, outputTokens: 20, attempts: 1 });
    expect(run.api.complete.mock.calls[0]).toBeDefined(); expect(run.record).toHaveBeenCalledWith(result.usage);
    expect(providerSchema(schema)).toEqual({ type: 'object', properties: { subject: { type: 'string' }, body: { type: 'string' } }, required: ['subject', 'body'], additionalProperties: false });
  });
  it('repairs malformed output once and accounts for both completions', async () => {
    const run = setup([completion('not json'), completion()]);
    expect((await run.provider.generate(request, run.record)).usage.inputTokens).toBe(100); expect(run.api.complete).toHaveBeenCalledTimes(2);
  });
  it('rejects unknown fields, overlong values, repeated invalid output and truncated responses', async () => {
    const run = setup([completion('{"subject":"X","body":"Y","send":true}'), completion('{}')]);
    await expect(run.provider.generate(request, run.record)).rejects.toThrow('valid complete response'); expect(run.api.complete).toHaveBeenCalledTimes(2);
    const truncated = completion(); truncated.choices[0].finish_reason = 'length';
    const other = setup([truncated]); await expect(other.provider.generate(request, other.record)).rejects.toThrow('valid complete response');
    const long = setup([completion(JSON.stringify({ subject: 'x'.repeat(101), body: 'long subject' })), completion('{}')]);
    await expect(long.provider.generate(request, long.record)).rejects.toThrow('valid complete response');
  });
  it('rejects unexpected model substitution and missing token counts remain unknown', async () => {
    const run = setup([completion(undefined, 'different-model')]); await expect(run.provider.generate(request, run.record)).rejects.toThrow('valid complete response');
    const unknown = completion(); delete unknown.usage;
    const other = setup([unknown]); expect((await other.provider.generate(request, other.record)).usage.inputTokens).toBeNull();
  });
  it('validates JSON-mode responses too', async () => {
    const run = setup([completion(undefined, 'llama-3.3-70b-versatile')], { ...config, GROQ_TEXT_MODEL: 'llama-3.3-70b-versatile' });
    await expect(run.provider.generate(request, run.record)).resolves.toMatchObject({ model: 'llama-3.3-70b-versatile' });
  });
  it('rejects oversized input and images without consent before contacting Groq', async () => {
    const run = setup(); await expect(run.provider.generate({ ...request, input: 'x'.repeat(25000) }, run.record)).rejects.toThrow('request length');
    await expect(run.provider.generate({ ...request, task: 'photo_analyzer', images: [{ url: 'https://example.invalid/photo', bytes: 100, consent: false as true }] }, run.record)).rejects.toThrow('request length');
    await expect(run.provider.generate({ ...request, task: 'photo_analyzer', images: Array.from({ length: 4 }, () => ({ url: 'https://example.invalid/photo', bytes: 100, consent: true as const })) }, run.record)).rejects.toThrow('request length');
    expect(run.api.models).not.toHaveBeenCalled();
  });
});
describe('bounded retries and safe failures', () => {
  it('repairs a provider JSON rejection once without retrying unrelated bad requests', async () => {
    const rejected = new Groq.BadRequestError(400, { error: { code: 'json_validate_failed' } }, 'invalid output', new Headers());
    const run = setup(); run.api.complete.mockRejectedValueOnce(rejected);
    expect((await run.provider.generate(request, run.record)).data.subject).toBe('Test subject'); expect(run.api.complete).toHaveBeenCalledTimes(2);
    const repeated = setup(); repeated.api.complete.mockRejectedValue(rejected);
    await expect(repeated.provider.generate(request, repeated.record)).rejects.toThrow('valid complete response'); expect(repeated.api.complete).toHaveBeenCalledTimes(2);
    const other = setup(); other.api.complete.mockRejectedValue(new Groq.BadRequestError(400, { error: { code: 'invalid_request' } }, 'bad parameter', new Headers()));
    await expect(other.provider.generate(request, other.record)).rejects.toThrow('could not complete'); expect(other.api.complete).toHaveBeenCalledTimes(1);
  });
  it('honours short Retry-After and never retries earlier than a long one', async () => {
    const run = setup(); run.api.complete.mockRejectedValueOnce(new Groq.RateLimitError(429, {}, 'secret provider detail', new Headers({ 'retry-after': '2' })));
    await run.provider.generate(request, run.record); expect(run.sleep).toHaveBeenCalledWith(2000);
    const long = setup(); long.api.complete.mockRejectedValue(new Groq.RateLimitError(429, {}, 'secret', new Headers({ 'retry-after': '60' })));
    await expect(long.provider.generate(request, long.record)).rejects.toThrow('request limit'); expect(long.api.complete).toHaveBeenCalledTimes(1);
    expect(retryDelay(new Groq.RateLimitError(429, {}, '', new Headers({ 'retry-after': new Date(4000).toUTCString() })), 0, 1000)).toBe(3000);
  });
  it('caps attempts and does not retry ambiguous connection failures', async () => {
    const run = setup(); run.api.complete.mockRejectedValue(new Groq.InternalServerError(503, {}, 'secret', new Headers()));
    await expect(run.provider.generate(request, run.record)).rejects.toThrow('could not complete'); expect(run.api.complete).toHaveBeenCalledTimes(3);
    const timeout = setup(); timeout.api.complete.mockRejectedValue(new Groq.APIConnectionTimeoutError());
    await expect(timeout.provider.generate(request, timeout.record)).rejects.toThrow('could not complete'); expect(timeout.api.complete).toHaveBeenCalledTimes(1);
  });
  it('stops if usage persistence fails and does not expose arbitrary error messages', async () => {
    const run = setup(); run.record.mockRejectedValue(new Error('usage failed'));
    await expect(run.provider.generate(request, run.record)).rejects.toThrow('usage failed'); expect(run.api.complete).toHaveBeenCalledTimes(1);
    const other = setup(); other.api.models.mockRejectedValue(new Error('secret value'));
    await expect(other.provider.verifyModel('email_assistant')).rejects.toThrow('Groq could not complete');
  });
});
