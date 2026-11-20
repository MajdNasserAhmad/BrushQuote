import { z } from 'zod';
export const emailTypes = ['customer_message', 'new_quote_request', 'quotation_sent', 'quotation_accepted', 'quotation_rejected', 'appointment_confirmation', 'job_update'] as const;
export const emailLabels: Record<typeof emailTypes[number], string> = { customer_message: 'Customer message', new_quote_request: 'New quote request', quotation_sent: 'Quotation sent', quotation_accepted: 'Quotation accepted', quotation_rejected: 'Quotation rejected', appointment_confirmation: 'Appointment confirmation', job_update: 'Job update' };
export const emailDraftSchema = z.object({
  customer_id: z.uuid(), quotation_id: z.union([z.uuid(), z.literal('')]), job_id: z.union([z.uuid(), z.literal('')]),
  template: z.enum(emailTypes), subject: z.string().trim().min(1).max(200).refine(s => !/[\r\n]/.test(s)), body: z.string().trim().min(1).max(10000),
}).strict();
export type EmailDraft = z.infer<typeof emailDraftSchema>;
export function escapeHTML(value: string) { return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!); }
export function emailHTML(business: string, subject: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#142739"><table role="presentation" style="width:100%;padding:24px"><tr><td><table role="presentation" style="max-width:600px;width:100%;margin:auto;background:white;border-radius:12px"><tr><td style="padding:28px;border-bottom:4px solid #087e69;font-weight:bold;font-size:20px">${escapeHTML(business)}</td></tr><tr><td style="padding:28px"><h1 style="font-size:22px;margin-top:0">${escapeHTML(subject)}</h1><div style="font-size:16px;line-height:1.6;white-space:pre-wrap">${escapeHTML(body).replace(/\r?\n/g, '<br>')}</div></td></tr><tr><td style="padding:20px 28px;color:#526270;font-size:12px">Sent by ${escapeHTML(business)} using BrushQuote.</td></tr></table></td></tr></table></body></html>`;
}
