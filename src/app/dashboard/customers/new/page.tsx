import { CustomerForm } from '@/features/crm/forms';
import { PageHeading } from '@/features/crm/presentation';
export const metadata = { title: 'Add customer' };
export default function NewCustomer() { return <><PageHeading title="Add customer" description="Save contact details and property addresses." /><CustomerForm /></>; }
