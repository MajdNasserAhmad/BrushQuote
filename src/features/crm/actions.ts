'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { currentMembership } from '@/lib/auth/session';
import { customerSchema, leadSchema } from './schema';

export async function saveCustomer(raw: unknown, id?: string): Promise<{ error?: string }> {
  const { supabase, membership } = await currentMembership();
  if (!membership) redirect('/onboarding');
  const parsed = customerSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the customer details.' };
  if (id && !z.uuid().safeParse(id).success) return { error: 'Customer unavailable.' };
  const { addresses, ...details } = parsed.data;
  const result = await supabase.rpc('save_customer', {
    target_business: membership.business_id, customer: id ?? null!,
    details: { ...details, addresses: addresses.split('\n').map(line => line.trim()).filter(Boolean).map((address, index) => ({ label: `Property ${index + 1}`, address })) },
  });
  if (result.error || !result.data) return { error: 'The customer could not be saved. Check your access and try again.' };
  revalidatePath('/dashboard'); revalidatePath('/dashboard/customers');
  redirect(`/dashboard/customers/${result.data}`);
}

export async function saveLead(raw: unknown, id?: string): Promise<{ error?: string }> {
  const { supabase, membership } = await currentMembership();
  if (!membership) redirect('/onboarding');
  const parsed = leadSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the lead details.' };
  if (id && !z.uuid().safeParse(id).success) return { error: 'Lead unavailable.' };
  const values = parsed.data;
  const result = await supabase.rpc('save_lead', { target_business: membership.business_id, lead: id ?? null!, details: {
    ...values,
    painting_areas: values.painting_areas.split(',').map(value => value.trim()).filter(Boolean),
    room_measurements: values.room_measurements ? [{ notes: values.room_measurements }] : [],
  } });
  if (result.error || !result.data) return { error: 'The lead could not be saved. Check the customer, your access and the entered details.' };
  revalidatePath('/dashboard'); revalidatePath('/dashboard/leads');
  redirect(`/dashboard/leads/${result.data}`);
}

export async function setArchived(kind: 'customer' | 'lead', id: string, archived: boolean): Promise<{ error?: string }> {
  const input = z.object({ kind: z.enum(['customer', 'lead']), id: z.uuid(), archived: z.boolean() }).safeParse({ kind, id, archived });
  if (!input.success) return { error: 'Invalid record.' };
  const { supabase, membership } = await currentMembership();
  if (!membership) redirect('/onboarding');
  const { error } = await supabase.rpc('set_crm_archived', { target_business: membership.business_id, record_kind: kind, record_id: id, archived });
  if (error) return { error: 'This record could not be changed. Check your access and try again.' };
  revalidatePath('/dashboard'); revalidatePath(`/dashboard/${kind}s`);
  redirect(`/dashboard/${kind}s/${id}`);
}
