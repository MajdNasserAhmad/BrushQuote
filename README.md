# BrushQuote

AI-powered business management for painting and decorating contractors.

**Working MVP: Milestones 1–4 passed local acceptance, including live Groq and signed Resend delivery verification. Milestone 5 (quality and launch) is in progress; this is not a deployed production service.** See BUILD_PROGRESS.md for precise checks, limitations and next steps.

## Run the app

Use Node 24 LTS. On Windows use npm.cmd and npx.cmd; do not change PowerShell execution policy.

```powershell
npm.cmd run dev
```

Open http://localhost:3000. Without Supabase configuration, marketing/auth pages render a clear setup message and auth submission is disabled. Protected routes redirect to login. No demo credentials or fake backend responses are used.

Follow [LOCAL_SETUP.md](docs/LOCAL_SETUP.md) to start Supabase, configure .env.local, verify email callbacks and test the database. Docker is installed, but this agent session cannot access its engine pipe. Run the local-stack commands from a normal terminal.

## Implemented foundation

- App Router, strict TypeScript, Tailwind tokens, shadcn-compatible Button/Input primitives, Lucide branding and responsive layouts.
- Landing page, auth forms, callback handlers, protected onboarding, workspace foundation page, error/loading states.
- Supabase SSR cookie refresh and independent server-side user/membership checks.
- React Hook Form and Zod validation, transactional onboarding RPC integration, private logo upload with Sharp decoding/re-encoding.
- Applied database migrations, generated types, tenant RLS, private Storage, transactional CRM/quotations/scheduling and isolated AI records.

Core SaaS includes real dashboard metrics, customer/lead CRM, public photo requests, deterministic quotation totals/PDFs, secure customer portals and jobs/appointments. The AI workspace provides Groq task forms, approval flows, usage controls, private conversations and an opt-in public chatbot. Business settings, plan limits, notifications and confirmed email delivery are implemented. Your own installation requires server-side provider credentials; none are included.

## Checks

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:unit
npm.cmd run build
npm.cmd run test:e2e -- --project=chromium
```

Latest local checks: TypeScript, ESLint, production build, 96 unit tests and 28 Chromium integration scenarios passed. WebKit passed 27/28 scenarios; a CRM navigation-error check remains open. Windows Application Control blocks the local Firefox automation executable. See [Testing](docs/TESTING.md) and BUILD_PROGRESS.md for details. Integration tests use a production build and local Supabase with fictional fixtures and scoped cleanup. The original e2e suite expects a separate unconfigured build.

## Documents

- [Specification](docs/BRUSHQUOTE_SPECIFICATION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [Local setup](docs/LOCAL_SETUP.md)
- [Testing](docs/TESTING.md)
- [AI integration plan](docs/AI_INTEGRATION.md)
- [Progress](BUILD_PROGRESS.md)
- [Isolated sample workspace](docs/DEMO.md)
- [Deployment requirements and open gates](docs/DEPLOYMENT.md)

The original Playwright example, browser projects and npm lockfile were preserved. CI includes typecheck, lint, Vitest, build and application browser tests. Groq is server-only; all seven AI workflows have passed live verification. Resend draft review, confirmed submission and signed delivery tracking are implemented and verified with the provider's test recipient. See [email setup](docs/EMAIL_DELIVERY.md) and [subscription architecture](docs/SUBSCRIPTIONS.md). Temporary test tunnels are not production deployments. Never commit credentials.
