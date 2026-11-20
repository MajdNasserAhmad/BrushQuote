import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Activity, Detail, PageHeading, Status } from '@/features/crm/presentation';
import { jobDetails } from '@/features/scheduling/data';
import { displayTime } from '@/features/scheduling/schema';
import { money } from '@/features/quotations/schema';
export const metadata = { title: 'Job details' };
export default async function JobDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { job: j, workers, customer, activity } = await jobDetails(id);
  return <><Link className="mb-5 inline-block text-sm text-primary underline" href="/dashboard/jobs">All jobs</Link><PageHeading title={j.title} description={j.property_address}><Button asChild><Link href={`/dashboard/jobs/${id}/edit`}>Edit job</Link></Button><Button variant="outline" asChild><Link href={`/dashboard/appointments/new?job=${id}`}>Add appointment</Link></Button></PageHeading><div className="mt-5"><Status value={j.status} /></div><div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"><section className="panel"><dl className="grid gap-6 sm:grid-cols-2"><Detail label="Customer"><Link href={`/dashboard/customers/${customer.id}`} className="text-primary underline">{customer.full_name}</Link></Detail><Detail label="Budget">{money(j.budget, j.currency)}</Detail><Detail label={`Start (${j.timezone})`}>{displayTime(j.starts_at, j.timezone)}</Detail><Detail label="Planned finish">{displayTime(j.ends_at, j.timezone)}</Detail><Detail label="Assigned workers">{workers.map(w => w.user_id.slice(0, 8)).join(', ')}</Detail><Detail label="Completed">{j.completed_at ? displayTime(j.completed_at, j.timezone) : 'Not completed'}</Detail><Detail label="Description">{j.description}</Detail><Detail label="Internal notes">{j.internal_notes}</Detail>{j.quotation_id && <Detail label="Source quotation"><Link className="text-primary underline" href={`/dashboard/quotations/${j.quotation_id}`}>View accepted quotation</Link></Detail>}</dl></section><Activity events={activity} /></div></>;
}
