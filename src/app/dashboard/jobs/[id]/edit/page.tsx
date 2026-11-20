import { PageHeading } from '@/features/crm/presentation';
import { jobDetails, schedulingOptions } from '@/features/scheduling/data';
import { BookingForm } from '@/features/scheduling/form';
import { localDateTime, jobStatuses } from '@/features/scheduling/schema';
export const metadata = { title: 'Edit job' };
export default async function EditJob({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const [{ job: j, workers }, options] = await Promise.all([jobDetails(id), schedulingOptions()]);
  return <><PageHeading title={`Edit ${j.title}`} /><BookingForm kind="job" id={id} version={j.version} options={options} initial={{ customer_id: j.customer_id, quotation_id: j.quotation_id ?? '', title: j.title, property_address: j.property_address, description: j.description, status: jobStatuses.find(s => s === j.status), starts_local: localDateTime(j.starts_at, j.timezone), ends_local: localDateTime(j.ends_at, j.timezone), timezone: j.timezone, budget: String(j.budget), workers: workers.map(w => w.user_id), internal_notes: j.internal_notes }} /></>;
}
