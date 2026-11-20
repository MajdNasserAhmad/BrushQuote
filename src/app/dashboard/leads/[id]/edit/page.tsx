import { redirect } from 'next/navigation';
import { customerOptions, leadDetails } from '@/features/crm/data';
import { LeadForm } from '@/features/crm/forms';
import { PageHeading } from '@/features/crm/presentation';
import { leadSchema } from '@/features/crm/schema';
export const metadata = { title: 'Edit lead' };
export default async function EditLead({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const [{ lead }, customers] = await Promise.all([leadDetails(id), customerOptions()]);
  if (lead.archived_at) redirect(`/dashboard/leads/${id}`);
  const measurements = Array.isArray(lead.room_measurements) ? lead.room_measurements.map(m => typeof m === 'object' && m !== null && 'notes' in m && typeof m.notes === 'string' ? m.notes : '').filter(Boolean).join('\n') : '';
  const initial = leadSchema.parse({ customer_id: lead.customer_id, status: lead.status, property_address: lead.property_address, property_type: lead.property_type, room_count: lead.room_count?.toString() ?? '', painting_areas: lead.painting_areas.join(', '), room_measurements: measurements, wall_condition: lead.wall_condition, work_type: lead.work_type, preferred_start_date: lead.preferred_start_date ?? '', additional_information: lead.additional_information, internal_notes: lead.internal_notes });
  return <><PageHeading title="Edit lead" /><LeadForm id={id} customers={customers} initial={initial} /></>;
}
