import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
export function newAccessToken() { return randomBytes(32).toString('base64url'); }
export function accessDigest(token: string) { return /^[A-Za-z0-9_-]{43}$/.test(token) ? createHash('sha256').update(token).digest('hex') : null; }
