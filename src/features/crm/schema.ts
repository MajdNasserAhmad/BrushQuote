import { z } from 'zod';
export const leadStatuses = ['new', 'contacted', 'inspection_required', 'quote_sent', 'won', 'lost'] as const;
export const customerSchema = z.object({
  full_name: z.string().trim().min(2, 'Enter the customer’s full name.').max(160),
  email: z.union([z.email('Enter a valid email address.').max(254), z.literal('')]),
  phone: z.string().trim().max(40).refine(value => !value || /^[+\d ()-]{3,40}$/.test(value), 'Enter a valid phone number.'),
  addresses: z.string().max(10000).refine(value => value.split('\n').filter(line => line.trim()).length <= 10, 'Use no more than 10 addresses.').refine(value => value.split('\n').every(line => !line.trim() || (line.trim().length >= 3 && line.trim().length <= 1000)), 'Each address must contain 3–1000 characters.'),
  internal_notes: z.string().max(20000),
}).strict();
export type CustomerInput = z.infer<typeof customerSchema>;
export const leadSchema = z.object({
  customer_id: z.uuid('Choose a customer.'),
  status: z.enum(leadStatuses),
  property_address: z.string().trim().min(3, 'Enter the property address.').max(1000),
  property_type: z.enum(['house', 'flat', 'commercial', 'other']),
  room_count: z.string().refine(value => !value || (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 1000), 'Use a room count between 1 and 1000.'),
  painting_areas: z.string().max(10000).refine(value => value.split(',').length <= 100, 'Use no more than 100 areas.'),
  room_measurements: z.string().max(10000),
  wall_condition: z.string().max(2000),
  work_type: z.string().trim().min(2, 'Describe the type of painting work.').max(200),
  preferred_start_date: z.union([z.iso.date('Use a valid date.'), z.literal('')]),
  additional_information: z.string().max(10000),
  internal_notes: z.string().max(20000),
}).strict();
export type LeadInput = z.infer<typeof leadSchema>;
export function listQuery(params: Record<string, string | string[] | undefined>) {
  const parsed = z.object({
    q: z.string().trim().max(100).catch(''),
    page: z.coerce.number().int().min(1).max(10000).catch(1),
    view: z.enum(['active', 'archived', 'all']).catch('active'),
    sort: z.enum(['newest', 'oldest', 'name']).catch('newest'),
    status: z.enum(['all', ...leadStatuses]).catch('all'),
  }).parse(params);
  return parsed;
}
export function statusLabel(status: string) { return status.replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase()); }
