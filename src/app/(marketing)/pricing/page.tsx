import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { publicEnvironment } from '@/lib/config/server-environment';
import { createSupabaseServer } from '@/lib/supabase/server';
export const metadata = { title: 'Plans and limits' };
export const dynamic = 'force-dynamic';
export default async function PricingPage() {
  const env = publicEnvironment();
  const result = env.configured ? await (await createSupabaseServer()).from('subscription_plans').select('id,name,daily_ai,monthly_ai,monthly_quotes,ai_tasks').order('monthly_ai') : null;
  return <><h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">A plan for your next stage.</h1><p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">New workspaces start with a 14-day Professional trial, then Free limits apply. Existing records remain available. Paid pricing has not been announced, and online payment is not enabled.</p><p className="mt-4 text-sm text-muted-foreground">Plan changes are reviewed manually. No automatic charge is taken and requesting a plan does not immediately change access.</p>{result?.data && !result.error ? <div className="mt-12 grid gap-6 lg:grid-cols-3">{result.data.map(plan => <article className="panel" key={plan.id}><h2 className="text-2xl font-semibold">{plan.name}</h2><p className="mt-3 font-medium text-primary">{plan.id === 'free' ? 'No subscription charge' : 'Pricing to be announced'}</p><ul className="my-7 space-y-3 text-sm"><li>{plan.daily_ai} AI requests per day</li><li>{plan.monthly_ai} AI requests per month</li><li>{plan.monthly_quotes} new quotations per month</li><li>{plan.ai_tasks.length} AI tools included</li></ul><Button asChild variant="outline"><Link href="/register">Start with a trial</Link></Button></article>)}</div> : <p role="status" className="panel mt-10">Plan limits could not be loaded. Please check again when the service is configured and available.</p>}<p className="mt-7 text-sm text-muted-foreground">UTC calendar limits apply. Workspace administrators can set lower AI limits. Failed AI requests count toward the request allowance.</p></>;
}
