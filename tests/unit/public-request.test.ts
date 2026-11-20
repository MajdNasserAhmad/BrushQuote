import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import sharp from 'sharp';
import { boundedForm, requestChallenge, verifyChallenge } from '../../src/features/requests/security';
import { preparePhoto } from '../../src/features/requests/photos';
import { requestSchema } from '../../src/features/requests/schema';
beforeEach(() => { vi.stubEnv('PUBLIC_REQUEST_SIGNING_SECRET', 'test-only-signing-secret-with-at-least-32-characters'); });
describe('public request protection', () => {
  it('binds challenges to the business and rejects tampering, rapid submissions and expiry', () => {
    const now = 1800000000000; const token = requestChallenge('test-painting', now);
    expect(verifyChallenge(token, 'test-painting', now + 3000)?.nonce).toBeTruthy();
    expect(verifyChallenge(token, 'other-business', now + 3000)).toBeNull();
    expect(verifyChallenge(token + '0', 'test-painting', now + 3000)).toBeNull();
    expect(verifyChallenge(token, 'test-painting', now + 1000)).toBeNull();
    expect(verifyChallenge(token, 'test-painting', now + 7200001)).toBeNull();
  });
  it('bounds actual streamed bytes even without content-length', async () => {
    const request = new Request('http://localhost/request', { method: 'POST', body: 'x'.repeat(100), headers: { 'content-type': 'application/x-www-form-urlencoded' } });
    await expect(boundedForm(request, 50)).rejects.toThrow('Upload too large');
  });
  it('validates image bytes and strips metadata while bounding dimensions', async () => {
    await expect(preparePhoto(new File(['<svg>bad</svg>'], 'fake.png', { type: 'image/png' }))).rejects.toThrow();
    const bytes = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: 'green' } }).withMetadata({ exif: { IFD0: { Artist: 'Fixture' } } }).jpeg().toBuffer();
    const output = await preparePhoto(new File([new Uint8Array(bytes)], 'photo.jpg', { type: 'image/jpeg' })); const meta = await sharp(output).metadata();
    expect(meta.format).toBe('webp'); expect(meta.width).toBe(1600); expect(meta.exif).toBeUndefined();
  });
  it('rejects a missing contact number and forged internal fields', () => {
    const valid = { full_name: 'Alex Example', email: 'alex@example.invalid', phone: '0123456789', property_address: '18 Test Road', property_type: 'house', room_count: '2', painting_areas: 'Walls', room_measurements: '', wall_condition: 'Good', work_type: 'Interior', preferred_start_date: '', additional_information: '', ai_photo_consent: false };
    expect(requestSchema.safeParse(valid).success).toBe(true);
    expect(requestSchema.safeParse({ ...valid, phone: '' }).success).toBe(false);
    expect(requestSchema.safeParse({ ...valid, business_id: 'injected' }).success).toBe(false);
  });
});
