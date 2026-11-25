import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Brand } from '@/components/brand';
import { publicChatbot } from '@/features/ai/chatbot';
import { PublicChat } from '@/features/ai/chatbot-form';
import { requestChallenge } from '@/features/requests/security';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Customer assistant', robots: { index: false, follow: false } };
export default async function Chat({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const chatbot = await publicChatbot(slug); if (!chatbot) notFound();
  return <main id="main" className="mx-auto max-w-2xl px-5 py-10"><Brand /><h1 className="mt-10 text-3xl font-semibold">Ask {chatbot.name}</h1><p className="mt-4 text-muted-foreground">Find approved information about our services, areas and process. Prices and appointments are confirmed by our team.</p><PublicChat slug={slug} initialChallenge={requestChallenge(`chat:${slug}`)} /><Link prefetch={false} className="mt-7 inline-block font-medium text-primary underline" href={`/request/${slug}`}>Request a painting quotation</Link></main>;
}
