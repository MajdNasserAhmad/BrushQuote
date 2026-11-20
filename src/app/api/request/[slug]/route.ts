import { randomUUID } from 'node:crypto';
import { publicEnvironment } from '@/lib/config/server-environment';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { requestBusiness } from '@/features/requests/data';
import { boundedForm, requestChallenge, requestFingerprint, verifyChallenge } from '@/features/requests/security';
import { preparePhoto } from '@/features/requests/photos';
import { MAX_PHOTOS, requestSchema } from '@/features/requests/schema';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const env = publicEnvironment(); const headers = { 'Cache-Control': 'no-store' };
  if (!env.configured || request.headers.get('origin') !== new URL(env.appUrl).origin) return Response.json({ error: 'Please submit using this website.' }, { status: 403, headers });
  const business = await requestBusiness(slug); if (!business) return Response.json({ error: 'Request form unavailable.' }, { status: 404, headers });
  const failure = (error: string, status = 400) => Response.json({ error, challenge: requestChallenge(slug) }, { status, headers });
  let form: FormData;
  try { form = await boundedForm(request); } catch { return failure('The upload is too large or could not be read. Use up to five photos of 2 MB each.'); }
  if (form.get('website')) return failure('The request could not be verified.');
  const challenge = verifyChallenge(String(form.get('challenge') ?? ''), slug);
  if (!challenge) return failure('The form expired or was submitted too quickly. Wait a moment and try again.');
  let raw: unknown; try { raw = JSON.parse(String(form.get('details'))); } catch { return failure('Check the request details.'); }
  const parsed = requestSchema.safeParse(raw); if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? 'Check the request details.');
  const files = form.getAll('photos');
  if (files.length > MAX_PHOTOS || files.some(file => !(file instanceof File))) return failure('Use no more than five photos.');
  const admin = createSupabaseAdmin();
  // Trust an IP header only when explicitly configured for a proxy that overwrites it.
  // Without that guarantee use a shared business bucket; never accept spoofable headers.
  const ipHeader = process.env.PUBLIC_REQUEST_IP_HEADER;
  const client = ipHeader ? (request.headers.get(ipHeader)?.split(',')[0]?.trim().slice(0, 100) || 'unknown') : 'shared';
  const reserved = await admin.rpc('reserve_public_request', { target_business: business.id, request_nonce: challenge.nonce, client_digest: requestFingerprint(`client:${business.id}:${client}`), email_digest: requestFingerprint(`email:${business.id}:${parsed.data.email.toLowerCase()}`) });
  if (reserved.error) return reserved.error.code === 'P0001' ? failure('Too many requests. Please try again later.', 429) : failure('The request service is temporarily unavailable.', 503);
  if (reserved.data === 'completed') return Response.json({ success: true }, { headers });
  if (reserved.data === 'pending') return Response.json({ error: 'This submission is still processing. Please try again shortly.' }, { status: 409, headers });
  if (reserved.data !== 'reserved') return failure('This submission was interrupted. Please try again shortly.', 409);
  const leadId = randomUUID(); const paths: string[] = [];
  try {
    const photos: { storage_path: string; byte_size: number }[] = [];
    for (const file of files as File[]) {
      const bytes = await preparePhoto(file); const path = `${business.id}/${leadId}/${randomUUID()}.webp`;
      const upload = await admin.storage.from('lead-photos').upload(path, bytes, { contentType: 'image/webp', upsert: false });
      if (upload.error) throw new Error('Photo storage unavailable.'); paths.push(path); photos.push({ storage_path: path, byte_size: bytes.byteLength });
    }
    const values = parsed.data;
    const saved = await admin.rpc('complete_public_request', { target_business: business.id, request_nonce: challenge.nonce, new_lead: leadId, details: { ...values, painting_areas: values.painting_areas.split(',').map(v => v.trim()).filter(Boolean), room_measurements: values.room_measurements ? [{ notes: values.room_measurements }] : [] }, photos });
    if (saved.error) throw new Error('Request persistence unavailable.');
    return Response.json({ success: true }, { headers });
  } catch {
    // Determine commit state before removing any uploaded images after a transport error.
    const state = await admin.rpc('public_request_state', { target_business: business.id, request_nonce: challenge.nonce, mark_failed: true });
    if (state.data === 'completed') return Response.json({ success: true }, { headers });
    if (!state.error && state.data === 'failed' && paths.length) await admin.storage.from('lead-photos').remove(paths);
    return failure('Your request could not be saved. Check the photos are valid JPEG, PNG or WebP images up to 2 MB, then try again.', 503);
  }
}
