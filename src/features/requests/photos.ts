import 'server-only';
import sharp from 'sharp';
import { MAX_PHOTO_BYTES } from './schema';
export async function preparePhoto(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size < 1 || file.size > MAX_PHOTO_BYTES) throw new Error('Use JPEG, PNG or WebP photos up to 2 MB each.');
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const image = sharp(bytes, { limitInputPixels: 20000000, failOn: 'warning' });
    const metadata = await image.metadata();
    if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages ?? 1) > 1) throw new Error('Unsupported image.');
    const buffer = await image.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    if (buffer.byteLength > MAX_PHOTO_BYTES) throw new Error('Processed image too large.');
    return buffer;
  } catch { throw new Error('One of the photos could not be read. Use a valid JPEG, PNG or WebP image.'); }
}
