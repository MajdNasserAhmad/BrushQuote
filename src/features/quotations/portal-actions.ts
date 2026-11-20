'use server';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { workspaceData } from '@/features/crm/data';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { publicEnvironment } from '@/lib/config/server-environment';
import { quotationDetails } from './data';
import { senderSnapshot } from './snapshot';
import { renderQuotationPdf } from './pdf';
import { accessDigest, newAccessToken } from './tokens';
import { portalResponseSchema } from './portal-schema';

export async function publishQuotation(raw: unknown): Promise<{ error?: string; url?: string }> {
  const parsed = z.object({ id: z.uuid(), version: z.number().int().positive(), confirmed: z.literal(true) }).strict().safeParse(raw);
  if (!parsed.success) return { error: 'Confirm publication of the current quotation.' };
  const env = publicEnvironment();
  if (!env.configured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { error: 'Customer portal access is not configured yet.' };
  const { supabase, businessId } = await workspaceData();
  const { quotation: q, items } = await quotationDetails(parsed.data.id);
  if (q.version !== parsed.data.version || q.status === 'cancelled') return { error: 'This quotation changed. Reload before publishing.' };
  const admin = createSupabaseAdmin(); let path = q.pdf_path; let uploaded = false;
  if (q.status === 'draft') {
    const sender = senderSnapshot.parse(q.sender_snapshot); let logo: Buffer | undefined;
    if (sender.logo_path) { const image = await supabase.storage.from('business-logos').download(sender.logo_path); if (image.error) return { error: 'The logo could not be loaded. Edit and save the draft before publishing.' }; logo = await sharp(Buffer.from(await image.data.arrayBuffer())).png().toBuffer(); }
    const bytes = await renderQuotationPdf({ ...q, status: 'sent' }, items, logo);
    path = `${businessId}/${q.id}/${randomUUID()}.pdf`;
    const upload = await admin.storage.from('quotation-pdfs').upload(path, bytes, { contentType: 'application/pdf', upsert: false });
    if (upload.error) return { error: 'The PDF could not be saved. Your quotation is still a draft.' }; uploaded = true;
  }
  if (!path) return { error: 'The issued quotation has no saved PDF. Contact support.' };
  const token = newAccessToken();
  const result = await supabase.rpc('publish_quotation', { target_business: businessId, quotation: q.id, expected_version: q.version, pdf_object: path, access_digest: accessDigest(token)! });
  if (result.error) {
    if (uploaded) {
      // A transport failure may follow a committed RPC. Never delete its live PDF.
      const current = await supabase.from('quotations').select('pdf_path').eq('business_id', businessId).eq('id', q.id).single();
      if (!current.error && current.data.pdf_path !== path) await admin.storage.from('quotation-pdfs').remove([path]);
    }
    return { error: 'Publication could not finish. Check the expiration date and reload in case another tab changed the quotation.' };
  }
  revalidatePath('/dashboard'); revalidatePath(`/dashboard/quotations/${q.id}`); revalidatePath('/dashboard/leads');
  return { url: new URL(`/quote/${token}`, env.appUrl).toString() };
}
export async function respondToQuotation(token: string, raw: unknown): Promise<{ error?: string; success?: boolean }> {
  const digest = accessDigest(token); const parsed = portalResponseSchema.safeParse(raw);
  if (!digest || !parsed.success) return { error: 'Check your response and confirmation.' };
  const result = await createSupabaseAdmin().rpc('respond_to_quotation', { access_digest: digest, decision: parsed.data.decision, message: parsed.data.message, message_request: parsed.data.request_id });
  if (result.error) return { error: result.error.code === 'P0001' ? 'Too many responses. Please wait a minute and try again.' : 'This quotation is unavailable, expired, or already decided. Reload to see its current status.' };
  revalidatePath(`/quote/${token}`); revalidatePath('/dashboard'); revalidatePath('/dashboard/quotations');
  return { success: true };
}
