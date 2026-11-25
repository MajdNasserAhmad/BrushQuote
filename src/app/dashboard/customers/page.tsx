import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { customerList } from '@/features/crm/data';
import { PageHeading, ListFilters, Pagination, type QueryParams } from '@/features/crm/presentation';
export const metadata = { title: 'Customers' };
export default async function Customers({ searchParams }: { searchParams: Promise<QueryParams> }) {
  const { customers, count, filters } = await customerList(await searchParams);
  return <><PageHeading title="Customers" description="Your customer relationships, all in one place."><Button asChild><Link prefetch={false} href="/dashboard/customers/new"><Plus />Add customer</Link></Button></PageHeading><ListFilters kind="customers" filters={filters} />{customers.length ? <div className="overflow-x-auto rounded-xl border border-border bg-white"><table className="data-table"><thead><tr><th scope="col">Customer</th><th scope="col">Email</th><th scope="col">Phone</th><th scope="col">Record</th></tr></thead><tbody>{customers.map(customer => <tr key={customer.id}><td><Link prefetch={false} className="font-semibold text-primary underline" href={`/dashboard/customers/${customer.id}`}>{customer.full_name}</Link></td><td>{customer.email || '—'}</td><td className="whitespace-nowrap">{customer.phone || '—'}</td><td>{customer.archived_at ? 'Archived' : 'Active'}</td></tr>)}</tbody></table></div> : <div className="panel py-12 text-center"><h2 className="text-lg font-semibold">No customers found</h2><p className="mt-2 text-sm text-muted-foreground">Add your first customer or adjust the filters.</p></div>}<Pagination count={count} filters={filters} kind="customers" /></>;
}
