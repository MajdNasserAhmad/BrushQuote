import sharp from 'sharp';
import { expect, test } from 'vitest';
import { MAX_LOGO_BYTES, prepareLogo } from '../../src/features/onboarding/logo';
const file = (bytes: Buffer, type = 'image/png') => ({ size: bytes.length, type, arrayBuffer: async () => Uint8Array.from(bytes).buffer });
test('decodes a real image and outputs a bounded WebP without EXIF', async () => {
  const source = await sharp({ create: { width: 800, height: 400, channels: 3, background: '#13755d' } }).png().toBuffer();
  const result = await prepareLogo(file(source));
  const metadata = await sharp(result).metadata();
  expect(metadata.format).toBe('webp');
  expect(metadata.width).toBe(512);
  expect(metadata.height).toBe(256);
  expect(metadata.exif).toBeUndefined();
});
test('rejects forged image MIME, SVG content and malformed bytes', async () => {
  await expect(prepareLogo(file(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>')))).rejects.toThrow('could not be read');
  await expect(prepareLogo(file(Buffer.from('not an image')))).rejects.toThrow('could not be read');
  await expect(prepareLogo(file(Buffer.from('anything'), 'image/svg+xml'))).rejects.toThrow('PNG, JPEG or WebP');
});
test('rejects oversized and empty uploads before decoding', async () => {
  await expect(prepareLogo({ size: MAX_LOGO_BYTES + 1, type: 'image/png', arrayBuffer: async () => { throw new Error('Should not read bytes'); } })).rejects.toThrow('2 MB');
  await expect(prepareLogo(file(Buffer.alloc(0)))).rejects.toThrow('2 MB');
});
