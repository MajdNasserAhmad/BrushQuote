import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageHeading } from '@/features/crm/presentation';
import { quotationOptions } from '@/features/quotations/data';
import { QuotationForm } from '@/features/quotations/form';
import { reviewedSuggestion } from '@/features/ai/review';
export const metadata = { title: 'New quotation' };
export default async function NewQuotation({ searchParams }: { searchParams: Promise<{ lead?: string; customer?: string; suggestion?: string }> }) {
  const options = await quotationOptions(); const params = await searchParams; const lead = options.leads.find(l => l.id === params.lead);
  const customer = lead?.customer_id ?? (options.customers.some(c => c.id === params.customer) ? params.customer : '');
  const suggestion = params.suggestion ? await reviewedSuggestion(params.suggestion, 'quote_generator') : undefined;
  const items = suggestion?.quote_items?.map(item => { const service = options.services.find(s => s.id === item.service_id); if (!service) throw new Error('A suggested service is no longer available. Generate a new suggestion.'); return { service_id: service.id, description: item.description, quantity: item.quantity ?? '', unit: service.unit, unit_price: service.unit_price }; });
  return <><PageHeading title="New quotation" description="Build a clear, itemised proposal for your customer." />{suggestion && <p className="mt-5 rounded-lg bg-amber-50 p-4 text-sm">AI suggestions require your review. Select the customer and property, verify every measurement, and edit the items before saving. Missing measurements are left blank. Prices come from your current service rates; totals are calculated on the server.</p>}{options.customers.length ? <QuotationForm options={options} initial={{ customer_id: customer, lead_id: lead?.id ?? '', expires_on: options.defaultExpiration, terms: options.business.default_terms, ...(items?.length ? { items } : {}) }} /> : <section className="panel mt-7"><p className="mb-4">Add a customer before creating a quotation.</p><Button asChild><Link prefetch={false} href="/dashboard/customers/new">Add customer</Link></Button></section>}</>;
}
