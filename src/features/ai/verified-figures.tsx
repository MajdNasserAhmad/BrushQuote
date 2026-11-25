import { z } from 'zod';
import Link from 'next/link';
import { workspaceData } from '@/features/crm/data';
import { money } from '@/features/quotations/schema';
const schema = z.object({ acceptance_rate_percent: z.string().nullable(), dashboard: z.object({ accepted_quotations: z.number(), pending_quotations: z.number(), revenue: z.array(z.object({ currency: z.string(), quoted: z.string(), accepted: z.string() })) }) });
export async function VerifiedFigures() {
  const { supabase, businessId } = await workspaceData(); const result = await supabase.rpc('ai_business_metrics', { target_business: businessId }); if (result.error) throw new Error('Verified figures could not be loaded.');
  const data = schema.parse(result.data);
  return <details className="panel mt-6"><summary className="cursor-pointer font-semibold">Verified business figures</summary><p className="mt-4 text-sm text-muted-foreground">Database-calculated figures. Compare AI interpretations against these values. Quotation values are not payments collected.</p><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3"><div><dt>Accepted quotations</dt><dd className="mt-1 font-semibold">{data.dashboard.accepted_quotations}</dd></div><div><dt>Pending quotations</dt><dd className="mt-1 font-semibold">{data.dashboard.pending_quotations}</dd></div><div><dt>Acceptance rate · all issued quotations</dt><dd className="mt-1 font-semibold">{data.acceptance_rate_percent === null ? 'No issued quotations' : `${data.acceptance_rate_percent}%`}</dd></div></dl><ul className="mt-4 space-y-3 text-sm">{data.dashboard.revenue.map(row => <li key={row.currency}>{row.currency}: quoted {money(row.quoted, row.currency)} · accepted {money(row.accepted, row.currency)}</li>)}</ul><Link prefetch={false} className="mt-4 inline-block text-sm text-primary underline" href="/dashboard">View revenue history and activity</Link></details>;
}
