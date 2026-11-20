import Link from 'next/link';
import { customerOptions } from '@/features/crm/data';
import { LeadForm } from '@/features/crm/forms';
import { PageHeading } from '@/features/crm/presentation';
import { Button } from '@/components/ui/button';
export const metadata = { title: 'Add lead' };
export default async function NewLead({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const customers = await customerOptions(); const selected = (await searchParams).customer;
  return <><PageHeading title="Add lead" description="Record the property and painting requirements." />{customers.length ? <LeadForm customers={customers} initial={{ customer_id: customers.some(c => c.id === selected) ? selected : '' }} /> : <section className="panel mt-7"><p className="mb-4">Add a customer before creating a lead.</p><Button asChild><Link href="/dashboard/customers/new">Add customer</Link></Button></section>}</>;
}
