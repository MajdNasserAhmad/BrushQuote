import { Resend } from 'resend';
import { z } from 'zod';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const statuses: Record<string, string> = { 'email.sent': 'submitted', 'email.delivered': 'delivered', 'email.bounced': 'bounced', 'email.complained': 'complained', 'email.failed': 'failed', 'email.suppressed': 'failed' };
export async function POST(request: Request) {
  const key = process.env.RESEND_API_KEY; const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!key || !secret) return new Response('Webhook not configured', { status: 503 });
  const id = request.headers.get('svix-id'); const timestamp = request.headers.get('svix-timestamp'); const signature = request.headers.get('svix-signature');
  if (!id || !timestamp || !signature) return new Response('Missing signature', { status: 400 });
  const reader = request.body?.getReader(); if (!reader) return new Response('Missing body', { status: 400 });
  let payload: string;
  try {
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 65536) { await reader.cancel(); return new Response('Too large', { status: 413 }); } chunks.push(part.value); }
    payload = Buffer.concat(chunks).toString('utf8');
  } catch { return new Response('Invalid body', { status: 400 }); } finally { reader.releaseLock(); }
  let verified: unknown;
  try { verified = new Resend(key).webhooks.verify({ payload, headers: { id, timestamp, signature }, webhookSecret: secret }); } catch { return new Response('Invalid signature', { status: 400 }); }
  const parsed = z.object({ type: z.string(), created_at: z.iso.datetime({ offset: true }), data: z.object({ email_id: z.string().min(1).max(200) }) }).safeParse(verified);
  if (!parsed.success) return new Response('Invalid event', { status: 400 });
  const status = statuses[parsed.data.type]; if (!status) return new Response('Ignored', { status: 200 });
  const result = await createSupabaseAdmin().rpc('record_email_event', { provider: parsed.data.data.email_id, event_status: status, event_time: parsed.data.created_at });
  // The webhook may race the submission transaction. A non-2xx response asks Resend to retry.
  if (result.error || !result.data) return new Response('Awaiting email record', { status: 503 });
  return new Response('Recorded', { status: 200 });
}
