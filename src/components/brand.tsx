import Link from 'next/link';
import { PaintRoller } from 'lucide-react';
export function Brand() {
  return <Link prefetch={false} href="/" className="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight" aria-label="BrushQuote home"><span className="rounded-lg bg-primary p-2 text-white"><PaintRoller size={21} strokeWidth={1.8} /></span>BrushQuote<span className="text-primary">.</span></Link>;
}
