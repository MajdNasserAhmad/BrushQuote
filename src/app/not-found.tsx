import Link from 'next/link';
import { Button } from '@/components/ui/button';
export default function NotFound() { return <main id="main" className="mx-auto max-w-lg px-6 py-28"><p className="text-sm text-primary">404</p><h1 className="mt-3 text-3xl font-semibold">This page isn’t here.</h1><p className="my-6 text-muted-foreground">Check the address or return to BrushQuote.</p><Button asChild><Link href="/">Back home</Link></Button></main>; }
