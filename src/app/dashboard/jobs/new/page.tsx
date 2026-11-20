import { PageHeading } from '@/features/crm/presentation';
import { schedulingOptions } from '@/features/scheduling/data';
import { BookingForm } from '@/features/scheduling/form';
import { workspaceData } from '@/features/crm/data';
import { reviewedSuggestion } from '@/features/ai/review';
export const metadata = { title: 'New job' };
export default async function NewJob({ searchParams }: { searchParams: Promise<{ quotation?: string; suggestion?: string }> }) {
  const options = await schedulingOptions(); const params = await searchParams;
  const selected = options.quotes.find(q => q.id === params.quotation);
  let address = ''; if (selected?.lead_id) { const { supabase, businessId } = await workspaceData(); const lead = await supabase.from('leads').select('property_address').eq('business_id', businessId).eq('id', selected.lead_id).single(); if (lead.error) throw new Error('Source property could not be loaded.'); address = lead.data.property_address; }
  const suggestion = params.suggestion ? await reviewedSuggestion(params.suggestion, 'job_planner') : undefined; const schedule = suggestion?.schedule;
  return <><PageHeading title="New job" description="Plan the work, assign your team and reserve their time." />{suggestion && <p className="mt-5 rounded-lg bg-amber-50 p-4 text-sm">Owner review required: verify the customer, work requirements, dates and workers. Saving confirms this proposed schedule and checks current conflicts. No time has been reserved yet.</p>}<BookingForm kind="job" options={options} initial={{ ...(selected ? { quotation_id: selected.id, customer_id: selected.customer_id, budget: String(selected.total), title: `Painting work · ${selected.reference}`, property_address: address } : {}), ...(schedule ? { title: schedule.title, starts_local: schedule.starts_local, ends_local: schedule.ends_local, timezone: schedule.timezone, workers: schedule.worker_ids.filter(id => options.workers.some(w => w.id === id)), description: schedule.notes } : {}) }} /></>;
}
