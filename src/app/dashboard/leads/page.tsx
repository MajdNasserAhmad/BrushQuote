import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { leadList } from '@/features/crm/data';
import { PageHeading, ListFilters, Pagination, Status, type QueryParams } from '@/features/crm/presentation';
export const metadata = { title: 'Leads' };
export default async function Leads({ searchParams }: { searchParams: Promise<QueryParams> }) {
  const { leads, count, filters } = await leadList(await searchParams);
  return <><PageHeading title="Leads" description="From the first enquiry to a confirmed project."><Button asChild><Link prefetch={false} href="/dashboard/leads/new"><Plus />Add lead</Link></Button></PageHeading><ListFilters kind="leads" filters={filters} />{leads.length ? <div className="overflow-x-auto rounded-xl border border-border bg-white"><table className="data-table"><thead><tr><th scope="col">Property</th><th scope="col">Work type</th><th scope="col">Status</th><th scope="col">Preferred start</th></tr></thead><tbody>{leads.map(lead => <tr key={lead.id}><td><Link prefetch={false} className="font-semibold text-primary underline" href={`/dashboard/leads/${lead.id}`}>{lead.property_address}</Link>{lead.archived_at && <p className="mt-1 text-xs">Archived</p>}</td><td>{lead.work_type}</td><td><Status value={lead.status} /></td><td className="whitespace-nowrap">{lead.preferred_start_date || 'Not provided'}</td></tr>)}</tbody></table></div> : <div className="panel py-12 text-center"><h2 className="text-lg font-semibold">No leads found</h2><p className="mt-2 text-sm text-muted-foreground">Add a lead or adjust the filters to see more enquiries.</p></div>}<Pagination count={count} filters={filters} kind="leads" /></>;
}
