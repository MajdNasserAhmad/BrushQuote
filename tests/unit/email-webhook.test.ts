import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdmin: () => ({ rpc }) }));
import { POST } from '@/app/api/email/webhook/route';
const secretBytes = Buffer.from('fictional-unit-webhook-key-only');
function signed(payload: string, time = String(Math.floor(Date.now() / 1000))) {
  const id = 'msg_fixture'; const signature = createHmac('sha256', secretBytes).update(`${id}.${time}.${payload}`).digest('base64');
  return new Request('http://localhost/api/email/webhook', { method: 'POST', body: payload, headers: { 'svix-id': id, 'svix-timestamp': time, 'svix-signature': `v1,${signature}` } });
}
describe('signed Resend delivery events', () => {
  beforeEach(() => { vi.stubEnv('RESEND_API_KEY', 'unit-test-not-real'); vi.stubEnv('RESEND_WEBHOOK_SECRET', `whsec_${secretBytes.toString('base64')}`); rpc.mockReset(); rpc.mockResolvedValue({ data: true, error: null }); });
  afterEach(() => vi.unstubAllEnvs());
  it('verifies real SDK signatures and passes only provider ID, status and timestamp to the database', async () => {
    const event = { type: 'email.delivered', created_at: new Date().toISOString(), data: { email_id: 'fixture-provider-id', to: ['private@example.invalid'] } };
    expect((await POST(signed(JSON.stringify(event)))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('record_email_event', { provider: 'fixture-provider-id', event_status: 'delivered', event_time: event.created_at });
  });
  it('rejects tampered, stale and oversized payloads without database calls', async () => {
    const request = signed('{}'); const tampered = new Request(request.url, { method: 'POST', headers: request.headers, body: '{"tampered":true}' });
    expect((await POST(tampered)).status).toBe(400);
    expect((await POST(signed('{}', '1'))).status).toBe(400);
    expect((await POST(signed('a'.repeat(65537)))).status).toBe(413); expect(rpc).not.toHaveBeenCalled();
  });
  it('requests a provider retry when the submission record is not yet committed', async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    expect((await POST(signed(JSON.stringify({ type: 'email.delivered', created_at: new Date().toISOString(), data: { email_id: 'fixture' } })))).status).toBe(503);
  });
});
