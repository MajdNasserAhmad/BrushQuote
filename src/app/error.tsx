'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main id="main" className="mx-auto max-w-lg px-6 py-28"><h1 className="text-3xl font-semibold">We couldn’t load this page.</h1><p className="my-6 text-muted-foreground">Please try again. If the problem continues, check the service configuration.</p><Button onClick={reset}>Try again</Button></main>; }
