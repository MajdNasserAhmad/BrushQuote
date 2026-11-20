import { z } from 'zod';
const decimal = z.string().regex(/^\d{1,10}(\.\d{1,4})?$/, 'Use a non-negative amount with up to four decimals.');
export const quoteItemSchema = z.object({ service_id: z.union([z.uuid(), z.literal('')]), description: z.string().trim().min(1, 'Describe this item.').max(4000), unit: z.string().trim().min(1).max(40), quantity: decimal.refine(value => Number(value) > 0, 'Quantity must be greater than zero.'), unit_price: decimal }).strict();
export const quotationSchema = z.object({ customer_id: z.uuid('Choose a customer.'), lead_id: z.union([z.uuid(), z.literal('')]), expires_on: z.iso.date('Choose a valid expiration date.'), items: z.array(quoteItemSchema).min(1).max(100), discount_amount: decimal, additional_charges: decimal, tax_rate: z.string().regex(/^\d{1,3}(\.\d{1,2})?$/).refine(value => Number(value) <= 100, 'Tax must be at most 100%.'), terms: z.string().max(20000), customer_notes: z.string().max(10000), internal_notes: z.string().max(20000) }).strict();
export type QuotationInput = z.infer<typeof quotationSchema>;
export const amountsSchema = z.object({ line_totals: z.array(z.string()), subtotal: z.string(), discount_amount: z.string(), additional_charges: z.string(), tax_rate: z.string(), tax_amount: z.string(), total: z.string(), currency: z.string() });
export type QuoteAmounts = z.infer<typeof amountsSchema>;
// Formatting only. Authoritative arithmetic and rounding run in PostgreSQL.
export function money(value: string | number, currency: string) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number(value)); }
export function unitPrice(value: string | number, currency: string) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 4 }).format(Number(value)); }
