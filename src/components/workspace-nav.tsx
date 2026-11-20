'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, ClipboardList, FileText, CalendarDays, PaintRoller, Sparkles, Settings, Bell, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
const links = [{ href: '/dashboard/ai', label: 'AI workspace', icon: Sparkles }, { href: '/dashboard', label: 'Overview', icon: LayoutDashboard }, { href: '/dashboard/customers', label: 'Customers', icon: Users }, { href: '/dashboard/leads', label: 'Leads', icon: ClipboardList }, { href: '/dashboard/quotations', label: 'Quotations', icon: FileText }, { href: '/dashboard/jobs', label: 'Jobs', icon: PaintRoller }, { href: '/dashboard/calendar', label: 'Calendar', icon: CalendarDays }, { href: '/dashboard/emails', label: 'Email', icon: Mail }, { href: '/dashboard/notifications', label: 'Notifications', icon: Bell }, { href: '/dashboard/settings', label: 'Settings', icon: Settings }];
export function WorkspaceNav() {
  const pathname = usePathname();
  return <nav aria-label="Workspace navigation" className="mt-7 flex flex-wrap gap-2 lg:flex-col">{links.map(({ href, label, icon: Icon }) => {
    const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));
    return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={cn('flex items-center gap-3 rounded-lg p-3 text-sm font-semibold', active ? 'bg-muted text-primary' : 'text-muted-foreground hover:bg-muted')}><Icon size={18} /><span>{label}</span></Link>;
  })}</nav>;
}
