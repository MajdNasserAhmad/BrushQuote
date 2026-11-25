import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageHeading, Pagination, Status, type QueryParams } from '@/features/crm/presentation';
import { jobList } from '@/features/scheduling/data';
import { jobStatuses, displayTime } from '@/features/scheduling/schema';
import { statusLabel } from '@/features/crm/schema';
import { money } from '@/features/quotations/schema';
export const metadata = { title: 'Jobs' };
export default async function Jobs({ searchParams }: { searchParams: Promise<QueryParams> }) {
  const { jobs, count, filters } = await jobList(await searchParams);
  return <><PageHeading title="Jobs" description="Track painting work from scheduling to completion."><Button variant="outline" asChild><Link prefetch={false} href="/dashboard/calendar">Calendar</Link></Button><Button asChild><Link prefetch={false} href="/dashboard/jobs/new">New job</Link></Button></PageHeading><form className="my-7 flex flex-wrap items-end gap-3"><div className="grow"><label className="label" htmlFor="q">Search jobs</label><input className="field" id="q" name="q" defaultValue={filters.q} /></div><div><label className="label" htmlFor="status">Status</label><select className="field" id="status" name="status" defaultValue={filters.status}>{['all', ...jobStatuses].map(s => <option value={s} key={s}>{statusLabel(s)}</option>)}</select></div><Button>Apply filters</Button></form>{jobs.length ? <div className="overflow-x-auto rounded-xl border border-border bg-white"><table className="data-table"><thead><tr><th>Job</th><th>Status</th><th>Starts</th><th>Budget</th></tr></thead><tbody>{jobs.map(j => <tr key={j.id}><td><Link prefetch={false} className="font-semibold text-primary underline" href={`/dashboard/jobs/${j.id}`}>{j.title}</Link></td><td><Status value={j.status} /></td><td>{displayTime(j.starts_at, j.timezone)}<span className="block text-xs text-muted-foreground">{j.timezone}</span></td><td className="whitespace-nowrap">{money(j.budget, j.currency)}</td></tr>)}</tbody></table></div> : <section className="panel text-center"><h2 className="font-semibold">No jobs found</h2><p className="mt-3 text-sm text-muted-foreground">Create a job or change the filters.</p></section>}<Pagination kind="jobs" count={count} filters={filters} /></>;
}
