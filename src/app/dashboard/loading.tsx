export default function Loading() {
  return <main id="main" aria-busy="true" aria-label="Loading workspace" className="mx-auto max-w-5xl p-10"><p className="sr-only">Loading your workspace…</p><div className="h-9 w-2/3 animate-pulse rounded-lg bg-muted" /><div className="mt-8 grid gap-6 md:grid-cols-2"><div className="h-80 animate-pulse rounded-2xl bg-muted" /><div className="h-56 animate-pulse rounded-2xl bg-muted" /></div></main>;
}
