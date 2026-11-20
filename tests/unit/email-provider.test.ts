import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { submitEmail } from '@/lib/email/provider';
const payload = { from: 'sender@example.invalid', to: ['recipient@example.invalid'], subject: 'Fictional test', html: '<p>Fixture</p>', text: 'Fixture' };
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('Resend submission boundary', () => {
  it('does not call a provider without configuration', async () => {
    vi.stubEnv('RESEND_API_KEY', ''); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    expect(await submitEmail(payload, 'fixture-key')).toEqual({ error: 'configuration' }); expect(fetch).not.toHaveBeenCalled();
  });
  it('preserves the idempotency key and returns acceptance without claiming delivery', async () => {
    vi.stubEnv('RESEND_API_KEY', 'unit-test-not-real'); vi.stubEnv('RESEND_FROM_EMAIL', payload.from);
    const fetch = vi.fn(async () => new Response(JSON.stringify({ id: 'fixture-provider-id' }), { status: 200, headers: { 'content-type': 'application/json' } })); vi.stubGlobal('fetch', fetch);
    expect(await submitEmail(payload, 'fixture-key')).toEqual({ providerId: 'fixture-provider-id' });
    expect(fetch).toHaveBeenCalledOnce(); const options = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(options[1].headers).get('Idempotency-Key')).toBe('fixture-key'); expect(options[1].signal).toBeInstanceOf(AbortSignal);
  });
  it('does not expose provider errors or fabricate acceptance', async () => {
    vi.stubEnv('RESEND_API_KEY', 'unit-test-not-real'); vi.stubEnv('RESEND_FROM_EMAIL', payload.from);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ name: 'validation_error', message: 'private provider detail' }), { status: 403, headers: { 'content-type': 'application/json' } })));
    expect(await submitEmail(payload, 'fixture-key')).toEqual({ error: 'provider_rejected' });
  });
});
