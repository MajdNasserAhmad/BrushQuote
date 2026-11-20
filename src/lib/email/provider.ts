import 'server-only';
import { Resend } from 'resend';
import { z } from 'zod';
export function emailConfiguration() {
  const key = process.env.RESEND_API_KEY?.trim(); const from = process.env.RESEND_FROM_EMAIL?.trim();
  return key && z.email().safeParse(from).success ? { key, from: from! } : null;
}
export type OutgoingEmail = { from: string; to: string[]; subject: string; html: string; text: string; replyTo?: string; attachments?: { filename: string; content: string }[] };
export async function submitEmail(payload: OutgoingEmail, idempotencyKey: string) {
  const config = emailConfiguration(); if (!config) return { error: 'configuration' as const };
  try {
    const result = await new Resend(config.key).emails.send(payload, { idempotencyKey, signal: AbortSignal.timeout(20000) });
    if (result.error || !result.data?.id) return { error: 'provider_rejected' as const };
    return { providerId: result.data.id };
  } catch { return { error: 'unknown' as const }; }
}
