# Architecture and implementation plan

## Inspection (2026-11-15)

All existing source/configuration files were read: `package.json`, `package-lock.json` (root package and installed dependencies inspected), `.gitignore`, `playwright.config.ts`, `tests/example.spec.ts`, `.github/workflows/playwright.yml`.

- Existing dependencies: Playwright ^1.65.1, @types/node ^26.6.6, Supabase CLI ^3.1.0.
- Node v24.22.1, npm 11.19.1, Git 2.56.0.windows.1.
- No Next.js source, TypeScript config, environment file, or Git metadata.
- Existing Playwright configuration covers Chromium, Firefox and WebKit; tests target playwright.dev.
- Docker unavailable. No service credential environment variable names found.
- Connected Supabase project reports an empty public schema. No remote changes made.
- npm registry requests fail with EACCES; offline installation fails with ENOTCACHED.

## Application boundaries

Use Next.js App Router, React and strict TypeScript. Organize `src/app` into marketing, auth, protected workspace, and public request/quotation routes. Keep interactive React Hook Form components small. Use Tailwind tokens and shadcn/ui primitives for the navy/emerald/light design system, with accessible focus, labels, errors, skeletons and mobile navigation.

Use `src/lib/supabase` for SSR clients, session refresh and generated database types; `src/lib/auth` for authenticated user and membership resolution; `src/features` for domain validation and server-side use cases. Every action independently authorizes its caller. Cookie refresh in Next.js Proxy is not the authorization boundary. Use the user's Supabase session so RLS remains effective.

Server actions handle authenticated mutations and framework origin checks. Route handlers handle auth callbacks, public requests, token portals and provider webhooks, with explicit validation, rate limits and CSRF/origin protection where applicable. Public endpoints use narrowly scoped server operations and never return private records. Never authorize using a supplied business ID alone.

Quote prices/totals use fixed-precision decimal arithmetic with explicit rounding; persist price/tax snapshots. Allocate quote references transactionally. Store only cryptographic hashes of random customer portal tokens; enforce expiry, revocation and decision idempotency.

Private Storage buckets contain tenant-prefixed object keys and RLS policies. Validate actual file bytes and sizes server-side before uploads; provide expiring signed URLs. Do not use public image URLs for customer photographs.

Groq lives behind a server-only provider interface; tasks use Zod schemas, capability-aware model routing, bounded retry/timeout handling, usage reservations and configurable cost accounting. Supabase is the source for verified business metrics; the model cannot execute SQL. Resend and PDF rendering have separate adapters.

## Preservation

Keep all six original tracked-candidate files and extend only as necessary. Preserve the original Playwright tests as reference until actual application flow tests replace them. Do not regenerate the repository using create-next-app, delete the npm lockfile, or alter existing browser projects unnecessarily.

## Dependencies

Resolve stable compatible versions through npm and official documentation, then lock the resolved versions. Version verification/installation is currently blocked; cached archive versions are not proof of the latest stable release.

| Milestone | Runtime | Development |
| --- | --- | --- |
| 1 | next, react, react-dom, @supabase/supabase-js, @supabase/ssr, server-only, zod, react-hook-form, @hookform/resolvers, lucide-react, class-variance-authority, clsx, tailwind-merge, shadcn/ui generated components and their required Radix primitives | typescript, @types/react, @types/react-dom, tailwindcss, @tailwindcss/postcss, eslint, eslint-config-next, vitest; retain Playwright, @types/node, Supabase CLI |
| 2 | @react-pdf/renderer, Sharp; PostgreSQL NUMERIC provides authoritative decimal calculations | Database/integration test support |
| 3 | groq-sdk | Provider fixtures and contract tests |
| 4 | resend | Webhook fixtures |

Once registry access is available, install foundation runtime and development groups separately, inspect peer dependency resolution, then add application configs and run checks. Do not install later-milestone services preemptively. Do not replace the lockfile manually or claim an offline install succeeded.

## Milestones and exit gates

1. **Foundation:** structure/dependencies; design system; all specified schema tables and policies; SSR auth (register/verify/login/logout/recover); atomic onboarding with logo, contact, services, areas, currency/tax and pricing. Verify persistence, protected routes, two-tenant isolation and malicious direct API calls.
2. **Core SaaS:** real-data dashboard, customers/leads, public request form and private photos, quote builder/PDF/secure decision portal, jobs/appointments with conflict checks. Verify complete business workflows.
3. **Groq AI:** centralized provider, capability verification, seven AI features and command center. Verify structured output failures, limits, unavailable credentials/models, rate limits, consent and confirmation gates.
4. **Commercial:** business/account/AI settings, tier architecture, usage limits, notifications, actual Resend delivery and webhook verification. No payment gateway required initially.
5. **Quality/launch:** remaining marketing pages/sections (sample testimonials labeled), isolated fictional demo seed, full regression/security suite, responsive/a11y review, performance, deployment readiness and production deployment configuration.

Each milestone must pass TypeScript, ESLint, relevant tests and production build. Run browser checks against the actual app and database security tests against an isolated test database. Never proceed past a critical failing or unavailable exit gate. Marketing foundation can be built during Milestone 1, but full marketing completion is tracked separately from working business functionality.

## Documentation consulted

- https://nextjs.org/docs/app/getting-started/installation
- https://supabase.com/docs/guides/auth/server-side/nextjs
- Context7 `/vercel/next.js` and `/supabase/supabase`: Proxy session refresh, server cookie handling and email token confirmation.
