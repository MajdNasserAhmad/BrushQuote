import { redirect } from 'next/navigation';
import { customerDetails } from '@/features/crm/data';
import { CustomerForm } from '@/features/crm/forms';
import { PageHeading } from '@/features/crm/presentation';
export const metadata = { title: 'Edit customer' };
export default async function EditCustomer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { customer, addresses } = await customerDetails(id);
  if (customer.archived_at) redirect(`/dashboard/customers/${id}`);
  return <><PageHeading title="Edit customer" /><CustomerForm id={id} initial={{ full_name: customer.full_name, email: customer.email ?? '', phone: customer.phone ?? '', addresses: addresses.map(a => a.address).join('\n'), internal_notes: customer.internal_notes }} /></>;
}
