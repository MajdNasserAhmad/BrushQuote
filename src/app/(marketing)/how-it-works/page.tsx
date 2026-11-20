import { MarketingCTA, Workflow } from '@/components/marketing';
export const metadata = { title: 'How it works' };
export default function HowItWorksPage() {
  return <><h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">A clear path from enquiry to booked work.</h1><p className="mt-6 max-w-2xl text-lg text-muted-foreground">Set up once, then follow the details through each stage. You decide what gets sent and when work is confirmed.</p><section className="my-14"><h2 className="sr-only">Three steps</h2><Workflow /></section><section className="panel mb-14"><h2 className="text-2xl font-semibold">Review is part of the workflow.</h2><p className="mt-4 leading-relaxed text-muted-foreground">Save a quotation draft before publication. Read and edit an AI email before choosing its recipient. Confirm sending separately. Check suggested dates and workers before saving a job. BrushQuote keeps suggestions distinct from agreed work.</p></section><MarketingCTA /></>;
}
