'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { workspaceData } from '@/features/crm/data';
import { amountsSchema, quotationSchema, type QuoteAmounts } from './schema';
export async function previewQuotation(raw: unknown): Promise<{ error?: string; amounts?: QuoteAmounts }> {
  const { supabase, businessId } = await workspaceData(); const parsed = quotationSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check quotation fields.' };
  const result = await supabase.rpc('preview_quotation', { target_business: businessId, details: parsed.data });
  if (result.error) return { error: 'Check amounts: discount cannot exceed subtotal, and discount/charges must use the currency precision.' };
  return { amounts: amountsSchema.parse(result.data) };
}
export async function saveQuotation(raw: unknown, id?: string, version?: number): Promise<{ error?: string }> {
  const { supabase, businessId } = await workspaceData(); const parsed = quotationSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check quotation fields.' };
  if (id && (!z.uuid().safeParse(id).success || !z.number().int().positive().safeParse(version).success)) return { error: 'Invalid quotation version.' };
  const result = await supabase.rpc('save_quotation', { target_business: businessId, quotation: id ?? null!, expected_version: version ?? 0, details: parsed.data });
  if (result.error?.code === '40001') return { error: 'This quotation changed in another tab or is no longer a draft. Reload before editing.' };
  if (result.error?.message.includes('QUOTATION_PLAN_LIMIT')) return { error: 'Your plan?s monthly quotation limit has been reached. Existing quotations can still be edited.' };
  if (result.error || !result.data) return { error: 'Quotation could not be saved. Check amounts, expiration date, and the selected customer/lead.' };
  revalidatePath('/dashboard'); revalidatePath('/dashboard/quotations');
  redirect(`/dashboard/quotations/${result.data}`);
}
