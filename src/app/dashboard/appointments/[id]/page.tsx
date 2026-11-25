import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Detail, PageHeading, Status } from '@/features/crm/presentation';
import { appointmentDetails } from '@/features/scheduling/data';
import { displayTime } from '@/features/scheduling/schema';
export const metadata = { title: 'Appointment details' };
export default async function Appointment({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const a = await appointmentDetails(id);
  return <><PageHeading title={a.title}><Button asChild><Link prefetch={false} href={`/dashboard/appointments/${id}/edit`}>Edit appointment</Link></Button><Button variant="outline" asChild><Link prefetch={false} href="/dashboard/calendar">Calendar</Link></Button></PageHeading><div className="mt-5"><Status value={a.status} /></div><section className="panel mt-7"><dl className="grid gap-6 sm:grid-cols-2"><Detail label={`Start (${a.timezone})`}>{displayTime(a.starts_at, a.timezone)}</Detail><Detail label="End">{displayTime(a.ends_at, a.timezone)}</Detail><Detail label="Customer"><Link prefetch={false} className="text-primary underline" href={`/dashboard/customers/${a.customer_id}`}>View customer</Link></Detail><Detail label="Worker">{a.assigned_user_id.slice(0, 8)}</Detail><Detail label="Notes">{a.notes}</Detail>{a.job_id && <Detail label="Related job"><Link prefetch={false} className="text-primary underline" href={`/dashboard/jobs/${a.job_id}`}>View job</Link></Detail>}</dl></section></>;
}
