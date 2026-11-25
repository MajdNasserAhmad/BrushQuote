import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { leadStatuses, listQuery, statusLabel } from './schema';
import { PAGE_SIZE } from './data';
export type QueryParams = Record<string, string | string[] | undefined>;
export function PageHeading({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight">{title}</h1>{description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}</div><div className="flex flex-wrap gap-3">{children}</div></div>;
}
export function ListFilters({ filters, kind }: { filters: ReturnType<typeof listQuery>; kind: 'customers' | 'leads' }) {
  return <form className="my-7 grid items-end gap-3 sm:grid-cols-2 xl:flex"><div className="xl:flex-1"><label htmlFor="q" className="label">Search {kind}</label><input className="field" id="q" name="q" defaultValue={filters.q} maxLength={100} placeholder={kind === 'customers' ? 'Name, email or phone' : 'Property address or work type'} /></div><div><label className="label" htmlFor="view">Records</label><select className="field" name="view" id="view" defaultValue={filters.view}>{['active', 'archived', 'all'].map(v => <option key={v} value={v}>{statusLabel(v)}</option>)}</select></div>{kind === 'leads' && <div><label htmlFor="status" className="label">Status</label><select id="status" name="status" className="field" defaultValue={filters.status}>{['all', ...leadStatuses].map(v => <option key={v} value={v}>{statusLabel(v)}</option>)}</select></div>}<div><label htmlFor="sort" className="label">Sort</label><select className="field" name="sort" id="sort" defaultValue={filters.sort}><option value="newest">Newest first</option><option value="oldest">Oldest first</option>{kind === 'customers' && <option value="name">Name A–Z</option>}</select></div><Button>Apply filters</Button><Button asChild variant="ghost"><Link prefetch={false} href={`/dashboard/${kind}`}>Reset</Link></Button></form>;
}
export function Pagination({ count, filters, kind }: { count: number; filters: Record<string, string | number> & { page: number }; kind: string }) {
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const href = (page: number) => `/dashboard/${kind}?${new URLSearchParams(Object.entries({ ...filters, page }).map(([key, value]) => [key, String(value)]))}`;
  return <nav aria-label="Pagination" className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm"><p>{count} {kind} · Page {filters.page} of {pages}</p><div className="flex gap-3">{filters.page > 1 && <Button asChild variant="outline" size="sm"><Link prefetch={false} href={href(filters.page - 1)}>Previous</Link></Button>}{filters.page < pages && <Button asChild variant="outline" size="sm"><Link prefetch={false} href={href(filters.page + 1)}>Next</Link></Button>}</div></nav>;
}
export function Status({ value }: { value: string }) { return <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-semibold text-primary">{statusLabel(value)}</span>; }
export function Detail({ label, children }: { label: string; children?: React.ReactNode }) { return <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-2 whitespace-pre-wrap break-words text-sm">{children || 'Not provided'}</dd></div>; }
export function Activity({ events }: { events: { id: string; event_type: string; created_at: string }[] }) {
  return <section className="panel"><h2 className="text-lg font-semibold">Activity history</h2>{events.length ? <ol className="mt-4 space-y-4">{events.map(event => <li key={event.id} className="border-l-2 border-primary pl-4 text-sm"><p>{statusLabel(event.event_type.replaceAll('.', ' '))}</p><time className="mt-1 block text-xs text-muted-foreground" dateTime={event.created_at}>{new Date(event.created_at).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC</time></li>)}</ol> : <p className="mt-4 text-sm text-muted-foreground">No activity recorded.</p>}</section>;
}
