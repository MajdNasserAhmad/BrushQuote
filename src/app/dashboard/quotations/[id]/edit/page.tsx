import { redirect } from 'next/navigation';
import { PageHeading } from '@/features/crm/presentation';
import { quotationDetails, quotationOptions } from '@/features/quotations/data';
import { QuotationForm } from '@/features/quotations/form';
export const metadata = { title: 'Edit quotation' };
export default async function EditQuotation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const [{ quotation: q, items }, options] = await Promise.all([quotationDetails(id), quotationOptions()]);
  if (q.status !== 'draft') redirect(`/dashboard/quotations/${id}`);
  return <><PageHeading title={`Edit ${q.reference}`} description={`Draft version ${q.version}`} /><QuotationForm id={id} version={q.version} options={options} initial={{ customer_id: q.customer_id, lead_id: q.lead_id ?? '', expires_on: q.expires_on, items: items.map(i => ({ service_id: i.service_id ?? '', description: i.description, unit: i.unit, quantity: String(i.quantity), unit_price: String(i.unit_price) })), discount_amount: String(q.discount_amount), additional_charges: String(q.additional_charges), tax_rate: String(q.tax_rate), terms: q.terms, customer_notes: q.customer_notes, internal_notes: q.internal_notes }} /></>;
}
