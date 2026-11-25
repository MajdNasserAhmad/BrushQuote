import { test, expect } from '@playwright/test';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { localWorkspace } from './helpers/local-workspace';
const details = { full_name: 'Public Request Customer', email: 'public-request@example.invalid', phone: '+44 1234 567890', property_address: '24 Public Example Road', property_type: 'house', room_count: '3', painting_areas: 'Walls, ceilings', room_measurements: '4m by 5m', wall_condition: 'Minor cracks', work_type: 'Interior painting', preferred_start_date: '', additional_information: 'Please call in the afternoon.', ai_photo_consent: false };
function proof(slug: string, nonce = randomUUID(), age = 3000) {
  const payload = Buffer.from(JSON.stringify({ slug, issued: Date.now() - age, nonce })).toString('base64url');
  return `${payload}.${createHmac('sha256', process.env.PUBLIC_REQUEST_SIGNING_SECRET!).update(`challenge:${payload}`).digest('hex')}`;
}
async function slugOf(fixture: Awaited<ReturnType<typeof localWorkspace>>) { const result = await fixture.client.from('businesses').select('slug').eq('id', fixture.businessId).single(); return result.data!.slug; }
test('public endpoint rejects forged fields/uploads and enforces idempotency, origin and limits', async ({ request }) => {
  const fixture = await localWorkspace(); const other = await localWorkspace();
  try {
    const slug = await slugOf(fixture); const url = `/api/request/${slug}`; const headers = { origin: 'http://localhost:3000' };
    const payload = { details: JSON.stringify(details), challenge: proof(slug), website: '' };
    expect((await request.post(url, { headers: { origin: 'https://untrusted.invalid' }, multipart: payload })).status()).toBe(403);
    expect((await request.post(url, { headers, multipart: { ...payload, challenge: 'forged' } })).status()).toBe(400);
    expect((await request.post(url, { headers, multipart: { ...payload, website: 'spam.invalid' } })).status()).toBe(400);
    expect((await request.post(url, { headers, multipart: { ...payload, details: JSON.stringify({ ...details, business_id: other.businessId }) } })).status()).toBe(400);
    expect((await request.post(url, { headers, multipart: { ...payload, challenge: proof(slug), photos: { name: 'fake.png', mimeType: 'image/png', buffer: Buffer.from('not an image') } } })).status()).toBe(503);
    expect((await fixture.client.from('leads').select('id')).data).toHaveLength(0);
    const valid = { ...payload, challenge: proof(slug) };
    expect((await request.post(url, { headers, multipart: valid })).status()).toBe(200); expect((await request.post(url, { headers, multipart: valid })).status()).toBe(200);
    const leads = await fixture.client.from('leads').select('id,business_id,source'); expect(leads.data).toHaveLength(1); expect(leads.data?.[0]).toMatchObject({ business_id: fixture.businessId, source: 'public_request' });
    expect((await other.client.from('leads').select('id')).data).toEqual([]);
    expect((await fixture.client.from('notifications').select('id').eq('event_type', 'lead.request_received')).data).toHaveLength(1);
    expect((await fixture.client.rpc('reserve_public_request', { target_business: fixture.businessId, request_nonce: randomUUID(), client_digest: 'a'.repeat(64), email_digest: 'b'.repeat(64) })).error).not.toBeNull();
    expect((await request.post(url, { headers, multipart: { ...payload, challenge: proof(slug) } })).status()).toBe(200);
    expect((await request.post(url, { headers, multipart: { ...payload, challenge: proof(slug) } })).status()).toBe(429);
  } finally { await fixture.cleanup(); await other.cleanup(); }
});
test('public multistep request saves private photos, consent and business notifications', async ({ page, browser }) => {
  const fixture = await localWorkspace(); const other = await localWorkspace(); const businessContext = await browser.newContext({ baseURL: 'http://localhost:3000' });
  try {
    const slug = await slugOf(fixture); await page.goto(`/request/${slug}`); await expect(page.getByRole('heading', { name: 'A fresh start for your space.' })).toBeVisible();
    await page.getByLabel('Full name', { exact: true }).fill(details.full_name); await page.getByLabel('Email address').fill(details.email); await page.getByLabel('Phone number').fill(details.phone); await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByLabel('Property address', { exact: true }).fill(details.property_address); await page.getByLabel('Number of rooms').fill('3'); await page.getByLabel('Areas requiring painting').fill(details.painting_areas); await page.getByLabel('Wall condition').fill(details.wall_condition); await page.getByLabel('Type of painting work').fill(details.work_type); await page.getByRole('button', { name: 'Continue', exact: true }).click();
    // Five incompressible fixture images exercise the real multipart limit,
    // rather than a tiny solid-color upload that would hide hosting limits.
    const buffer = await sharp(randomBytes(800 * 800 * 3), { raw: { width: 800, height: 800, channels: 3 } }).png().toBuffer();
    expect(buffer.byteLength).toBeGreaterThan(1_800_000); expect(buffer.byteLength).toBeLessThan(2 * 1024 * 1024);
    await page.getByLabel('Property photos').setInputFiles(Array.from({ length: 5 }, (_, index) => ({ name: `room-${index}.png`, mimeType: 'image/png', buffer })));
    await page.getByRole('checkbox').check(); await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Human completion would exceed the two-second minimum; only this fast automation waits.
    await page.waitForTimeout(2100); await page.getByRole('button', { name: 'Submit quotation request' }).click(); await expect(page.getByRole('status')).toContainText('Request received');
    const photos = await fixture.client.from('lead_photos').select('lead_id,storage_path,mime_type,ai_consent_at,ai_consent_version'); expect(photos.data).toHaveLength(5); expect(photos.data?.[0]).toMatchObject({ mime_type: 'image/webp', ai_consent_at: expect.any(String), ai_consent_version: 'photo-analysis-v1' });
    const photo = photos.data![0]; expect((await other.client.storage.from('lead-photos').createSignedUrl(photo.storage_path, 60)).error).not.toBeNull();
    const publicUrl = fixture.admin.storage.from('lead-photos').getPublicUrl(photo.storage_path).data.publicUrl; expect((await page.request.get(publicUrl)).ok()).toBe(false);
    const owner = await businessContext.newPage(); await fixture.login(owner); await expect(owner.getByText('A new quotation request has arrived.', { exact: true })).toBeVisible();
    await owner.getByRole('link', { name: 'A new quotation request has arrived.' }).click(); await expect(owner.getByRole('heading', { name: details.property_address, exact: true })).toBeVisible(); await expect(owner.getByRole('img', { name: 'Property photo 1' })).toBeVisible();
    await expect.poll(() => owner.getByRole('img', { name: 'Property photo 1' }).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  } finally { await businessContext.close(); await fixture.cleanup(); await other.cleanup(); }
});
