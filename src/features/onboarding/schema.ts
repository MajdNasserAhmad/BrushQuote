import { z } from 'zod';
export const currencies = ['GBP', 'USD', 'EUR', 'JOD', 'AED', 'SAR', 'CAD', 'AUD', 'NZD', 'CHF'] as const;
export const pricingUnits = ['square_metre', 'square_foot', 'hour', 'day', 'item'] as const;
const serviceSchema = z.object({
  name: z.string().trim().min(2, 'Enter a service name.').max(160),
  unit: z.enum(pricingUnits),
  unit_price: z.string().regex(/^\d{1,10}(\.\d{1,4})?$/, 'Enter a non-negative price with up to 4 decimal places.'),
});
export const onboardingSchema = z.object({
  name: z.string().trim().min(2, 'Enter your company name.').max(160),
  slug: z.string().min(3).max(80).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens.'),
  email: z.email('Enter a valid business email.').max(254),
  phone: z.string().trim().min(7, 'Enter your business phone.').max(40).regex(/^[+\d ()-]+$/, 'Enter a valid phone number.'),
  address: z.string().trim().min(3, 'Enter your business address.').max(1000),
  currency: z.enum(currencies),
  tax_registered: z.boolean(),
  tax_number: z.string().trim().max(80),
  tax_rate: z.string().regex(/^\d{1,3}(\.\d{1,2})?$/, 'Enter a tax rate with up to two decimals.').refine(value => Number(value) <= 100, 'Tax must be between 0 and 100%.'),
  description: z.string().trim().max(4000),
  service_areas: z.string().trim().min(2, 'Enter at least one service area.').max(10000).refine(value => value.split(',').length <= 100, 'Use no more than 100 service areas.'),
  services: z.array(serviceSchema).min(1, 'Add at least one service.').max(50).refine(values => new Set(values.map(v => v.name.toLowerCase())).size === values.length, 'Give each service a unique name.'),
}).superRefine((value, ctx) => {
  if (!value.tax_registered && Number(value.tax_rate) !== 0) ctx.addIssue({ code: 'custom', path: ['tax_rate'], message: 'Set tax to 0 when your business is not tax registered.' });
  if (!value.service_areas.split(',').some(area => area.trim())) ctx.addIssue({ code: 'custom', path: ['service_areas'], message: 'Enter at least one service area.' });
});
export type OnboardingValues = z.infer<typeof onboardingSchema>;

export function onboardingPayload(value: OnboardingValues) {
  const { services, service_areas, ...details } = value;
  return { details: { ...details, tax_rate: Number(value.tax_rate), service_areas: service_areas.split(',').map(area => area.trim()).filter(Boolean) }, services };
}
