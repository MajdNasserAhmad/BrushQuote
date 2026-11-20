import { z } from 'zod';
import { customerSchema, leadSchema } from '@/features/crm/schema';
export const requestSchema = z.object({
  full_name: customerSchema.shape.full_name,
  email: z.email('Enter a valid email address.').max(254),
  phone: customerSchema.shape.phone.refine(value => value.length >= 7, 'Enter a contact phone number.'),
  property_address: leadSchema.shape.property_address,
  property_type: leadSchema.shape.property_type,
  room_count: leadSchema.shape.room_count.refine(value => value !== '', 'Enter the number of rooms.'),
  painting_areas: leadSchema.shape.painting_areas.refine(value => value.trim().length >= 2, 'Describe the areas requiring painting.'),
  room_measurements: leadSchema.shape.room_measurements,
  wall_condition: leadSchema.shape.wall_condition.min(2, 'Describe the wall condition.'),
  work_type: leadSchema.shape.work_type,
  preferred_start_date: leadSchema.shape.preferred_start_date,
  additional_information: leadSchema.shape.additional_information,
  ai_photo_consent: z.boolean(),
}).strict();
export type RequestInput = z.infer<typeof requestSchema>;
export const MAX_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
