import { z } from 'zod';
import { currencies, pricingUnits } from '@/features/onboarding/schema';
export const businessSettingsSchema = z.strictObject({
  name: z.string().trim().min(2).max(160), email: z.email().max(254), phone: z.string().trim().min(7).max(40).regex(/^[+\d ()-]+$/), address: z.string().trim().min(3).max(1000), currency: z.enum(currencies),
  tax_registered: z.boolean(), tax_rate: z.string().regex(/^\d{1,3}(\.\d{1,2})?$/).refine(v => Number(v) <= 100), tax_number: z.string().max(80), description: z.string().max(4000),
  service_areas: z.string().trim().min(2).max(10000).refine(v => v.split(',').filter(s => s.trim()).length <= 100), default_terms: z.string().max(10000), currency_confirmed: z.boolean(),
}).refine(v => v.tax_registered || Number(v.tax_rate) === 0, { message: 'Tax must be zero when not tax registered.', path: ['tax_rate'] });
export const serviceSettingsSchema = z.strictObject({ name: z.string().trim().min(2).max(160), description: z.string().max(2000), enabled: z.boolean(), unit: z.enum(pricingUnits), unit_price: z.string().regex(/^\d{1,10}(\.\d{1,4})?$/) });
export const accountSettingsSchema = z.strictObject({ display_name: z.string().trim().max(120), email_notifications: z.boolean() });
export type BusinessSettings = z.infer<typeof businessSettingsSchema>;
export type ServiceSettings = z.infer<typeof serviceSettingsSchema>;
