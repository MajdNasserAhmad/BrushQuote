'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { workspaceData } from '@/features/crm/data';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/database';
import { emailConfiguration, submitEmail, type OutgoingEmail } from '@/lib/email/provider';
import { emailDraftSchema, emailHTML } from './schema';
import { publicEnvironment } from '@/lib/config/server-environment';

export async function reviewNotificationEmail(id: string) {
  const { supabase, businessId, user } = await workspaceData();
  if (!z.uuid().safeParse(id).success || !user.email) return { error: 'Notification is unavailable.' };
  const [notification, business] = await Promise.all([
    supabase.from('notifications').select('message,destination_path').eq('business_id', businessId).eq('user_id', user.id).eq('id', id).single(),
    supabase.from('businesses').select('name').eq('id', businessId).single(),
  ]);
  if (notification.error || business.error) return { error: 'Notification is unavailable.' };
  const subject = `${business.data.name.slice(0, 140)} — workspace update`;
  const environment = publicEnvironment(); if (!environment.configured) return { error: 'Workspace configuration is unavailable.' };
  const body = `${notification.data.message}${notification.data.destination_path ? `\n\nView in BrushQuote: ${new URL(notification.data.destination_path, environment.appUrl).href}` : ''}`;
  const envelope = { from: emailConfiguration()?.from ?? 'unconfigured@example.invalid', to: [user.email], subject, text: body, html: emailHTML(business.data.name, subject, body) };
  const result = await createSupabaseAdmin().rpc('create_notification_email', { target_business: businessId, actor: user.id, notification: id, envelope });
  if (result.error || !result.data) return { error: 'Enable notification email copies in account settings, then try again. No email was sent.' };
  revalidatePath('/dashboard/emails'); return { id: result.data };
}

export async function emailCustomers() {
  const { supabase, businessId } = await workspaceData();
  const result = await supabase.from('customers').select('id,full_name,email').eq('business_id', businessId).is('archived_at', null).order('full_name').limit(1000);
  if (result.error) return { error: 'Customer options could not be loaded.' };
  return { customers: result.data };
}

export async function saveEmailDraft(raw: unknown) {
  const { supabase, businessId, user } = await workspaceData(); const parsed = emailDraftSchema.safeParse(raw);
  if (!parsed.success) return { error: 'Check the customer, subject and message.' };
  const input = parsed.data;
  const [business, customer] = await Promise.all([
    supabase.from('businesses').select('name,email').eq('id', businessId).single(),
    supabase.from('customers').select('email').eq('business_id', businessId).eq('id', input.customer_id).is('archived_at', null).single(),
  ]);
  if (business.error || customer.error || !z.email().safeParse(customer.data?.email).success) return { error: 'Choose an active customer with a valid saved email address.' };
  const payload: OutgoingEmail = { from: emailConfiguration()?.from ?? 'unconfigured@example.invalid', to: [customer.data!.email!], subject: input.subject, text: input.body, html: emailHTML(business.data.name, input.subject, input.body), ...(z.email().safeParse(business.data.email).success ? { replyTo: business.data.email } : {}) };
  if (input.quotation_id) {
    const quote = await supabase.from('quotations').select('reference,pdf_path,status').eq('business_id', businessId).eq('customer_id', input.customer_id).eq('id', input.quotation_id).single();
    if (quote.error || !quote.data.pdf_path || !['sent', 'accepted', 'rejected'].includes(quote.data.status)) return { error: 'Publish this customer’s quotation before attaching its issued PDF.' };
    const pdf = await supabase.storage.from('quotation-pdfs').download(quote.data.pdf_path);
    if (pdf.error || pdf.data.size > 5_000_000) return { error: 'The issued quotation PDF could not be attached.' };
    payload.attachments = [{ filename: `${quote.data.reference.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`, content: Buffer.from(await pdf.data.arrayBuffer()).toString('base64') }];
  }
  const result = await createSupabaseAdmin().rpc('create_email_draft', { target_business: businessId, actor: user.id, customer: input.customer_id, quotation: input.quotation_id || null!, job: input.job_id || null!, kind: input.template, envelope: payload as unknown as Json });
  if (result.error || !result.data) return { error: 'The draft could not be saved. Check linked records or try again later.' };
  revalidatePath('/dashboard/emails'); return { id: result.data };
}

export async function sendReviewedEmail(id: string, confirmed: boolean) {
  const { supabase, businessId, user } = await workspaceData();
  if (!z.uuid().safeParse(id).success || confirmed !== true) return { error: 'Explicit send confirmation is required.' };
  const business = await supabase.from('businesses').select('is_demo').eq('id', businessId).single();
  if (business.error) return { error: 'Workspace could not be verified. Nothing was sent.' };
  if (business.data.is_demo) return { error: 'Sample workspaces cannot send email. Review drafts here, and use your own workspace for real customers.' };
  const config = emailConfiguration(); if (!config) return { error: 'Email delivery is not configured. Add RESEND_API_KEY and a verified RESEND_FROM_EMAIL on the server. Nothing was sent.' };
  const draft = await supabase.from('email_logs').select('payload').eq('business_id', businessId).eq('id', id).single();
  if (draft.error || !draft.data.payload || (draft.data.payload as { from?: string }).from !== config.from) return { error: 'This draft uses an old or unconfigured sender. Create a new draft with the current sender.' };
  const admin = createSupabaseAdmin(); const claimed = await admin.rpc('claim_email_send', { target_business: businessId, actor: user.id, email: id, confirmed });
  if (claimed.error || !claimed.data) return { error: 'This email is already processed or awaiting reconciliation. Retry an uncertain submission after two minutes, within 23 hours of confirmation.' };
  const item = claimed.data; const result = await submitEmail(item.payload as unknown as OutgoingEmail, item.idempotency_key);
  if (result.error) {
    // Transport failures and provider errors may be ambiguous. Retain the exact envelope/key for safe retries.
    await admin.from('email_logs').update({ failure_code: result.error }).eq('business_id', businessId).eq('id', id).eq('status', 'queued');
    revalidatePath('/dashboard/emails'); return { error: 'Delivery is not confirmed. The submission remains queued; retry after two minutes using this same draft. Do not create a duplicate message.' };
  }
  const saved = await admin.from('email_logs').update({ status: 'submitted', provider_id: result.providerId, submitted_at: new Date().toISOString(), failure_code: null }).eq('business_id', businessId).eq('id', id).eq('status', 'queued').select('id').single();
  revalidatePath('/dashboard/emails');
  if (saved.error) return { error: 'Resend accepted the message, but the local status could not be saved. Retry this same draft after two minutes to reconcile it; do not create a duplicate.' };
  return { success: 'Resend accepted the email. Delivery is not yet confirmed.' };
}
