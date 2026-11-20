import { z } from 'zod';
export const jobStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const;
export const appointmentStatuses = ['scheduled', 'completed', 'cancelled'] as const;
const timeFields = { starts_local: z.iso.datetime({ local: true, message: 'Choose a valid start date and time.' }), ends_local: z.iso.datetime({ local: true, message: 'Choose a valid end date and time.' }), timezone: z.string().max(100).refine(value => { try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; } }, 'Choose a valid timezone.') };
export const jobSchema = z.object({ customer_id: z.uuid('Choose a customer.'), quotation_id: z.union([z.uuid(), z.literal('')]), title: z.string().trim().min(2).max(200), property_address: z.string().trim().min(3).max(1000), description: z.string().max(20000), status: z.enum(jobStatuses), ...timeFields, budget: z.string().regex(/^\d{1,10}(\.\d{1,4})?$/, 'Enter a non-negative budget.'), workers: z.array(z.uuid()).min(1, 'Assign at least one worker.').max(50), internal_notes: z.string().max(20000) }).strict().refine(value => value.ends_local > value.starts_local, { path: ['ends_local'], message: 'End must be after start.' });
export const appointmentSchema = z.object({ customer_id: z.uuid('Choose a customer.'), job_id: z.union([z.uuid(), z.literal('')]), assigned_user_id: z.uuid('Choose a worker.'), title: z.string().trim().min(2).max(200), status: z.enum(appointmentStatuses), ...timeFields, notes: z.string().max(10000) }).strict().refine(value => value.ends_local > value.starts_local, { path: ['ends_local'], message: 'End must be after start.' });
export type JobInput = z.infer<typeof jobSchema>;
export type AppointmentInput = z.infer<typeof appointmentSchema>;
export function localDateTime(instant: string, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(instant));
  const get = (type: string) => parts.find(part => part.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
export function displayTime(instant: string, timezone: string) { return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(instant)); }
