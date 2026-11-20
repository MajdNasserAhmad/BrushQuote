import { PageHeading } from '@/features/crm/presentation';
import { appointmentDetails, schedulingOptions } from '@/features/scheduling/data';
import { BookingForm } from '@/features/scheduling/form';
import { localDateTime, appointmentStatuses } from '@/features/scheduling/schema';
export const metadata = { title: 'Edit appointment' };
export default async function EditAppointment({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const [a, options] = await Promise.all([appointmentDetails(id), schedulingOptions()]);
  return <><PageHeading title={`Edit ${a.title}`} /><BookingForm kind="appointment" id={id} version={a.version} options={options} initial={{ customer_id: a.customer_id, job_id: a.job_id ?? '', assigned_user_id: a.assigned_user_id, title: a.title, status: appointmentStatuses.find(s => s === a.status), starts_local: localDateTime(a.starts_at, a.timezone), ends_local: localDateTime(a.ends_at, a.timezone), timezone: a.timezone, notes: a.notes }} /></>;
}
