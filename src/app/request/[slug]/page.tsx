import { notFound } from 'next/navigation';
import { Brand } from '@/components/brand';
import { requestBusiness } from '@/features/requests/data';
import { requestChallenge } from '@/features/requests/security';
import { PublicRequestForm } from '@/features/requests/form';
import Link from 'next/link';
import { publicChatbot } from '@/features/ai/chatbot';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Request a painting quotation' };
export default async function PublicRequest({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const business = await requestBusiness(slug); if (!business) notFound();
  const chatbot = await publicChatbot(slug);
  return <main id="main" className="mx-auto max-w-3xl px-5 py-10"><Brand /><p className="mt-10 text-sm font-semibold uppercase tracking-widest text-primary">{business.name}</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">A fresh start for your space.</h1><p className="mt-4 leading-relaxed text-muted-foreground">Tell us about your painting project and request a quotation. No account needed.</p>{business.service_areas.length > 0 && <p className="mt-4 text-sm text-muted-foreground">Serving {business.service_areas.join(', ')}.</p>}{chatbot && <Link prefetch={false} href={`/chat/${slug}`} className="mt-4 inline-block text-sm text-primary underline">Questions about our services? Ask our customer assistant.</Link>}<PublicRequestForm slug={slug} initialChallenge={requestChallenge(slug)} /></main>;
}
