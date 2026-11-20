import { z } from 'zod';
import { customerSnapshot, senderSnapshot } from './snapshot';
export const portalSchema = z.object({
  quote: z.object({ reference: z.string(), status: z.enum(['sent', 'accepted', 'rejected', 'expired']), currency: z.string(), issued_on: z.string(), expires_on: z.string(), decided_at: z.string().nullable(), sender_snapshot: senderSnapshot.omit({ logo_path: true }), customer_snapshot: customerSnapshot, subtotal: z.string(), discount_amount: z.string(), additional_charges: z.string(), tax_rate: z.string(), tax_amount: z.string(), total: z.string(), terms: z.string(), customer_notes: z.string() }).strict(),
  items: z.array(z.object({ description: z.string(), unit: z.string(), quantity: z.string(), unit_price: z.string(), line_total: z.string() }).strict()),
  messages: z.array(z.object({ id: z.uuid(), sender_type: z.enum(['customer', 'member']), body: z.string(), created_at: z.string() }).strict()),
  pdf_path: z.string(),
}).strict();
export const portalResponseSchema = z.object({ decision: z.enum(['accepted', 'rejected', 'message']), message: z.string().trim().max(2000), request_id: z.uuid(), confirmed: z.literal(true) }).strict().refine(v => v.decision !== 'message' || v.message.length > 0, 'Enter a message.');
