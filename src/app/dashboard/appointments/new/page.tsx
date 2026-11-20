import { PageHeading } from '@/features/crm/presentation';
import { schedulingOptions } from '@/features/scheduling/data';
import { BookingForm } from '@/features/scheduling/form';
export const metadata = { title: 'New appointment' };
export default async function NewAppointment({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const options = await schedulingOptions(); const params = await searchParams; const job = options.jobs.find(j => j.id === params.job);
  return <><PageHeading title="New appointment" description="Book an inspection or customer visit." /><BookingForm kind="appointment" options={options} initial={job ? { job_id: job.id, customer_id: job.customer_id } : undefined} /></>;
}
