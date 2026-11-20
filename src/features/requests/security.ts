import 'server-only';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
function secret() { const value = process.env.PUBLIC_REQUEST_SIGNING_SECRET; if (!value || value.length < 32) throw new Error('Public request protection is not configured.'); return value; }
export function requestFingerprint(value: string) { return createHmac('sha256', secret()).update(value).digest('hex'); }
export function requestChallenge(slug: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ slug, issued: now, nonce: randomUUID() })).toString('base64url');
  return `${payload}.${requestFingerprint(`challenge:${payload}`)}`;
}
export function verifyChallenge(value: string, slug: string, now = Date.now()) {
  if (value.length > 1000) return null; const [payload, signature, extra] = value.split('.');
  if (!payload || !signature || extra || !/^[0-9a-f]{64}$/.test(signature)) return null;
  const expected = requestFingerprint(`challenge:${payload}`);
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const parsed = z.object({ slug: z.string(), issued: z.number().int(), nonce: z.uuid() }).strict().parse(JSON.parse(Buffer.from(payload, 'base64url').toString()));
    if (parsed.slug !== slug || now - parsed.issued < 2000 || now - parsed.issued > 2 * 60 * 60 * 1000) return null;
    return parsed;
  } catch { return null; }
}
export async function boundedForm(request: Request, maxBytes = 12 * 1024 * 1024) {
  const length = request.headers.get('content-length');
  if (length && Number(length) > maxBytes) throw new Error('Upload too large.');
  const reader = request.body?.getReader(); if (!reader) throw new Error('Missing form.');
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > maxBytes) { await reader.cancel(); throw new Error('Upload too large.'); } chunks.push(value); } } finally { reader.releaseLock(); }
  return new Response(Buffer.concat(chunks), { headers: { 'content-type': request.headers.get('content-type') ?? '' } }).formData();
}
