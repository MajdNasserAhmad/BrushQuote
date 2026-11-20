import { MarketingFooter, MarketingHeader } from '@/components/marketing';
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <><MarketingHeader /><main id="main" className="mx-auto max-w-7xl px-6 pt-12 pb-20 lg:px-12">{children}</main><MarketingFooter /></>;
}
