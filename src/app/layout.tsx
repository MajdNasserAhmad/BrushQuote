import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: { default: 'BrushQuote | A better finish starts here', template: '%s | BrushQuote' }, description: 'A considered workspace for painting and decorating businesses.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-4">Skip to content</a>{children}</body></html>;
}
