import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { WorkspaceNav } from '@/components/workspace-nav';
import { logout } from '@/features/auth/actions';
import { workspaceData } from '@/features/crm/data';
export const dynamic = 'force-dynamic';
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { supabase, businessId } = await workspaceData();
  const { data, error } = await supabase.from('businesses').select('name,is_demo').eq('id', businessId).single();
  if (error) throw new Error('Your workspace could not be loaded.');
  return <div className="min-h-screen lg:grid lg:grid-cols-[230px_minmax(0,1fr)]"><aside className="border-b border-border bg-white p-5 lg:border-r lg:border-b-0"><Brand /><WorkspaceNav /></aside><div className="min-w-0"><header className="flex items-center justify-between gap-4 border-b border-border bg-white px-5 py-4 sm:px-9"><p className="truncate text-sm font-semibold">{data.name}</p><form action={logout}><Button variant="outline" size="sm">Sign out</Button></form></header><main id="main" className="mx-auto max-w-6xl px-5 py-9 sm:px-9">{data.is_demo && <aside aria-label="Sample workspace" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>Sample workspace</strong><p className="mt-2">All seeded customers, requests, quotations and bookings are fictional. Do not enter real customer data here. Email sending is disabled; AI is off by default and no AI responses are simulated.</p></aside>}{children}</main></div></div>;
}
