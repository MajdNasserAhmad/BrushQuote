import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MarketingHeader, MarketingFooter, FeatureCards, Workflow, SamplePreview } from '@/components/marketing';
import { Button } from '@/components/ui/button';

export default function Home() {
  return <>
    <MarketingHeader />
    <main id="main">
      <section className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-16 lg:grid-cols-2 lg:px-12 lg:py-24">
        <div><p className="mb-7 flex items-center gap-3 text-xs font-bold uppercase tracking-[.18em] text-primary"><span className="h-px w-8 bg-primary" /> Built for the painting trade</p>
          <h1 className="max-w-xl text-5xl leading-[1.08] font-semibold tracking-[-.045em] sm:text-6xl lg:text-7xl">Good work.<br />Great finish.<br /><span className="text-primary">Better business.</span></h1>
          <p className="mt-7 max-w-md text-lg leading-relaxed text-muted-foreground">You bring the craft. Keep customers, quotations, site visits and jobs together, with AI assistance when you need a second opinion.</p>
          <div className="mt-9 flex flex-wrap gap-3"><Button asChild size="lg"><Link href="/register">Create your workspace <ArrowRight /></Link></Button><Button asChild size="lg" variant="outline"><Link href="/login">Welcome back</Link></Button></div>
          <p className="mt-5 text-xs text-muted-foreground">Business accounts · Your services · Your pricing</p>
        </div>
        <SamplePreview />
      </section>
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-12"><h2 className="mb-8 text-3xl font-semibold">Less chasing. More clarity.</h2><FeatureCards /></section>
      <section className="border-y border-border bg-white"><div className="mx-auto max-w-7xl px-6 py-16 lg:px-12"><h2 className="mb-9 text-3xl font-semibold">From the first question to the final coat.</h2><Workflow /></div></section>
      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 md:grid-cols-2 lg:px-12"><div><p className="text-sm font-semibold text-primary">AI ASSISTANCE, WITH YOUR APPROVAL</p><h2 className="mt-4 text-3xl font-semibold">A second pair of eyes. You make the call.</h2><p className="mt-5 leading-relaxed text-muted-foreground">Explore scope with Quote Copilot, draft a customer reply, review consented photos or ask about verified business figures. Every suggestion is a starting point for your review.</p><Link href="/features" className="mt-5 inline-block font-semibold text-primary underline">Explore all seven AI tools</Link></div><div className="panel"><h2 className="text-2xl font-semibold">Start small. Keep control.</h2><p className="mt-4 leading-relaxed text-muted-foreground">Free, Starter and Professional plans provide different feature and usage limits. Start with a 14-day trial; no automatic payment is taken.</p><Link href="/pricing" className="mt-5 inline-block font-semibold text-primary underline">Compare plans and limits</Link></div></section>
      <section className="mx-auto max-w-7xl px-6 pb-16 lg:px-12"><div className="panel"><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Fictional testimonial example - not a customer endorsement</p><blockquote className="mt-5 max-w-3xl text-2xl leading-relaxed">&ldquo;I want the property notes, the quote and the work dates in one place, so I can see what needs my attention.&rdquo;</blockquote><p className="mt-4 text-sm text-muted-foreground">Illustrative feedback from a fictional painting business. Real customer feedback will replace this sample after user testing.</p></div></section>
      <section className="mx-auto max-w-4xl px-6 pb-20"><h2 className="mb-7 text-3xl font-semibold">A few things you might be wondering.</h2>{[
        ['Does AI set my prices?', 'No. You set service rates and verify quantities. Financial totals are calculated on the server using deterministic rules.'],
        ['Will emails or jobs be created automatically?', 'No. Review generated content, then explicitly confirm saving a booking or sending a message.'],
        ['Can customers accept a quotation?', 'Yes. Publish a reviewed quotation and share its private link. Customers can view the issued PDF and confirm acceptance or rejection.'],
        ['Does photo analysis replace a site visit?', 'No. It describes visible conditions with limitations. Measurements, hidden problems and final scope still need your judgement.'],
        ['Can I start without paying for a subscription?', 'New workspaces get a 14-day Professional trial followed by Free limits. Paid pricing is not yet announced and automatic billing is not enabled.'],
      ].map(([question, answer]) => <details key={question} className="border-b border-border py-5"><summary className="cursor-pointer font-semibold">{question}</summary><p className="mt-3 leading-relaxed text-muted-foreground">{answer}</p></details>)}</section>
    </main><MarketingFooter />
  </>;
}
