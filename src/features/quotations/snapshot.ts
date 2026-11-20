import { z } from 'zod';
export const senderSnapshot = z.object({ name: z.string(), email: z.string(), phone: z.string(), address: z.string(), tax_number: z.string().nullable(), logo_path: z.string().nullable() });
export const customerSnapshot = z.object({ name: z.string(), email: z.string().nullable(), phone: z.string().nullable(), addresses: z.array(z.string()) });
