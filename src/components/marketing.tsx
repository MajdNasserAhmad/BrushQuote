import Link from 'next/link';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { Brand } from './brand';
import { Button } from './ui/button';
export const marketingLinks = [['/features', 'Features'], ['/how-it-works', 'How it works'], ['/pricing', 'Plans'], ['/about', 'About'], ['/contact', 'Contact']] as const;
export const featureGroups = [
  ['A clear view of every enquiry', 'Keep customer details, property requests, photos and follow-ups together. Move from an enquiry to a reviewed quotation without losing the context.'],
  ['Quotes you can stand behind', 'Build from your service rates, review tax and totals, download a branded PDF and share a private acceptance link. You approve the final price.'],
  ['A calendar that respects your time', 'Plan site visits and jobs, assign people and check for overlapping bookings before anything is reserved.'],
  ['Useful AI, with your approval', 'Draft replies, explore work scope, review consented photos and ask about your business. Groq provides suggestions; you confirm changes and sending.'],
] as const;
export const workflowSteps = [
  ['Make the workspace yours', 'Add your company, services, rates, currency and quotation terms. Keep each business in its own workspace.'],
  ['Turn a request into a clear quote', 'Collect the property details, inspect what needs checking and build a quote from verified measurements. AI can help with the wording.'],
  ['Agree the work and plan the job', 'Review and send the quotation, collect the customer’s decision, then schedule the work with a final availability check.'],
] as const;
export function MarketingHeader() {
  return <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-6 py-7 lg:px-12"><Brand /><nav aria-label="Main navigation" className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-semibold">{marketingLinks.map(([href, label]) => <Link key={href} href={href} className="hover:text-primary">{label}</Link>)}<Link href="/login">Log in</Link><Button asChild size="sm"><Link href="/register">Get started <ArrowRight /></Link></Button></nav></header>;
}
export function MarketingFooter() {
  return <footer className="border-t border-border bg-white"><div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-8 px-6 py-10 lg:px-12"><div><Brand /><p className="mt-4 max-w-sm text-sm text-muted-foreground">Built for the craft and the business behind it.</p></div><nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-3 text-sm">{marketingLinks.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</nav></div></footer>;
}
export function FeatureCards() {
  return <div className="grid gap-5 md:grid-cols-2">{featureGroups.map(([title, body]) => <article className="panel" key={title}><Check className="mb-5 text-primary" size={24} /><h3 className="text-xl font-semibold">{title}</h3><p className="mt-3 leading-relaxed text-muted-foreground">{body}</p></article>)}</div>;
}
export function Workflow() {
  return <ol className="grid gap-8 md:grid-cols-3">{workflowSteps.map(([title, body], i) => <li key={title}><p className="text-sm font-semibold text-primary">0{i + 1}</p><h3 className="mt-4 text-xl font-semibold">{title}</h3><p className="mt-3 leading-relaxed text-muted-foreground">{body}</p></li>)}</ol>;
}
export function SamplePreview() {
  return <section aria-label="Illustrative sample dashboard" className="paper-grid rounded-3xl border border-border bg-[#eff3eb] p-6 sm:p-9"><p className="text-xs font-bold uppercase tracking-widest text-primary">Illustrative sample data · not live activity</p><div className="mt-5 rounded-xl border border-border bg-white p-6 shadow-sm"><p className="text-xs text-muted-foreground">WILLOW & BRUSH · FICTIONAL COMPANY</p><h2 className="mt-2 text-xl font-semibold">A calmer working day.</h2><div className="mt-6 space-y-4">{[['Site visit', 'Meadow Road bedrooms', 'Prepare measurements'], ['Quotation', 'Orchard Close living room', 'Draft ready to review'], ['Scheduled job', 'Studio refresh', 'Check the work plan']].map(([type, title, action]) => <div className="rounded-lg bg-muted p-4" key={type}><p className="text-xs font-semibold uppercase tracking-wide text-primary">{type}</p><p className="mt-2 font-medium">{title}</p><p className="mt-1 text-sm text-muted-foreground">{action}</p></div>)}</div><p className="mt-5 flex items-center gap-2 text-sm text-primary"><Sparkles size={18} /> Assistance when you need it. Decisions stay yours.</p></div></section>;
}
export function MarketingCTA() {
  return <section className="rounded-2xl bg-[#142c39] p-8 text-white sm:p-12"><h2 className="text-3xl font-semibold">Make room for the work you do best.</h2><p className="mt-4 max-w-xl leading-relaxed text-white/75">Start with your services and your next enquiry. Review every quote, message and booking before it leaves your hands.</p><Button asChild className="mt-7"><Link href="/register">Create your workspace <ArrowRight /></Link></Button></section>;
}
