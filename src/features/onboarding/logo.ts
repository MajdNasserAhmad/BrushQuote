import sharp from 'sharp';

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
export async function prepareLogo(file: { size: number; type: string; arrayBuffer: () => Promise<ArrayBuffer> }) {
  if (file.size <= 0 || file.size > MAX_LOGO_BYTES) throw new Error('Use a logo smaller than 2 MB.');
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Use a PNG, JPEG or WebP logo.');
  try {
    const source = Buffer.from(await file.arrayBuffer());
    if (source.length !== file.size) throw new Error('Invalid file length');
    const image = sharp(source, { limitInputPixels: 16_000_000, failOn: 'warning', animated: false });
    const metadata = await image.metadata();
    if (!['png', 'jpeg', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) > 1) throw new Error('Unsupported image');
    // Decode and re-encode pixels, stripping metadata and any appended content.
    return await image.rotate().resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  } catch { throw new Error('This logo could not be read. Choose a valid PNG, JPEG or WebP image.'); }
}
