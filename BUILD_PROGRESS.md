# BrushQuote build progress

Updated: 2026-11-20.

## Current milestone

**Milestones 1–4: functional and security acceptance passed on the local Supabase stack and Chromium, including live Groq and signed Resend delivery verification. Milestone 5 is starting.** Firefox/WebKit runtime validation remains a recorded launch-compatibility gate; neither browser has passed locally. Production deployment is not verified. Older entries below are chronological checkpoints, superseded by later acceptance entries.

## Implemented this session

- Next.js 16.4.6 App Router, strict TypeScript 6, Tailwind 4, ESLint and Vitest configurations; scripts and CI gates.
- Shared navy/emerald design tokens, Lucide logo/favicon, shadcn-compatible Button/Input primitives, responsive landing/auth layouts, error and loading states.
- Registration, login, recovery/reset forms with React Hook Form/Zod, server actions, safe error messages and missing-configuration handling.
- Supabase SSR client/Proxy cookie refresh with no-store responses; separate server-side getUser and membership authorization; protected routes explicitly render dynamically.
- PKCE and signup/recovery token-hash callbacks, bounded return destinations and logout.
- Onboarding form and transaction RPC integration for company/contact/address, services/pricing, areas, currency/tax and description.
- Private logo processing with 2 MB/16-million-pixel limits, byte decoding, WebP re-encoding, metadata removal and authorized storage updates. Partial logo failure preserves the business and exposes a retry path.
- Workspace foundation page reads company data; no invented dashboard metrics or unfinished business tools masquerading as complete features.
- Supabase local configuration and detailed setup/acceptance documentation.

## Verification

- npm.cmd run typecheck: **passed**, project-wide strict checking.
- npm.cmd run lint: **passed**, no warnings.
- npm.cmd run test:unit: **86 passed** across 13 files. Includes auth/domain validation, images, Groq transport/schema/retry/configuration tests, approved chatbot facts, semantic AI validation and optional decimal cost estimates. Provider doubles are fictional; no live AI calls.
- npm.cmd run build: **passed**, auth/workspace routes remain dynamic.
- Chromium: **5 passed, exit code 0**, using PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 against the existing preview (navigation, unconfigured auth, protected redirects, safe callback errors, mobile widths, no browser errors and no-store headers). Playwright-managed server teardown stalls in this Windows session; an explicit existing-server option avoids that process lifecycle restriction without skipping assertions.
- Playwright MCP: reviewed desktop landing and mobile sign-in screenshots. Fixed missing favicon. Latest sign-in page reports zero console errors/warnings.
- Firefox: browser launch timeout before assertions. WebKit: missing icutu77.dll, libsharpyuv.dll, sfparse.dll, javascriptcore.dll. Full browser gate is not passed.
- SQL migrations are applied; both SQL security fixtures passed through the local Studio API. Two live integration scenarios passed against the production build: actual registration/verification/login/logout/recovery, onboarding/logo persistence, tenant and Storage isolation, rollback on invalid pricing/duplicate slugs, and concurrent onboarding serialization. Fictional test accounts/businesses were cleaned up.

## Database state

Sixteen applied migrations cover the 22 required tables plus customer_addresses and quotation_messages, authorized domain functions, and private counters/rate limits/worker reservations. Both foundation SQL security fixtures passed. Full TypeScript database definitions were generated directly from local PostgreSQL using the installed Supabase CLI and a workspace-local CLI state directory. Domain mutations beyond implemented features remain closed to clients.

## Environment

- User installed foundation dependencies; versions/lockfile preserved. Added Sharp 0.35.5 as an explicit dependency using its already installed Next.js dependency and npm's offline lockfile update.
- External npm downloads remain denied in this session.
- Docker is now installed/responding, but the session is denied access to its config/engine pipe. This is not a reason to reinstall Docker.
- Supabase CLI uses workspace-local SUPABASE_HOME. Direct local PostgreSQL migration application and type generation succeeded; Docker engine access is unnecessary for these operations.
- Supabase is running on localhost. Configured the local public key in ignored .env.local without displaying it. Auth is enabled. Docker engine commands remain restricted, but the intended local Studio/SQL and PostgreSQL interfaces are accessible.
- Original Playwright examples are preserved but excluded from application E2E runs. Chromium/Firefox/WebKit projects remain configured.
- No remote database writes, real email sends, AI calls, deployment or Git initialization performed.

## Historical transition from foundation to core SaaS

1. Keep Firefox/WebKit runtime compatibility open for Milestone 5; Chromium functional/security checks passed.
2. Build Milestone 2 incrementally: dashboard, customers/leads, public requests/photos, quotations/PDF/secure portal, jobs/appointments.
3. Add authorized domain mutations and audit trails, validating each feature against the local database before proceeding.
4. User installed @react-pdf/renderer 4.9.0, groq-sdk 1.6.0 and resend 6.38.1 in this repository; confirmed with npm.cmd ls.

## Milestone 2 — verified CRM slice

- Shared responsive workspace navigation; customer/lead list, create, detail and edit routes.
- Search, status/archive filters, sorting and pagination; contact details, multiple addresses, property requirements, notes and activity history.
- Archive/restore requires an explicit confirmation dialog. Data remains scoped to the authenticated membership, including cross-table relationships.
- Database RPCs provide atomic edits and audit records. Failed address edits roll back the entire customer mutation. Direct unaudited client writes remain prohibited.
- TypeScript, ESLint and production build passed. Unit suite: 58 passed. Two live CRM integration tests passed, including API isolation/rollback and browser workflows. Both foundation live integration scenarios passed again after the workspace layout change.
- Playwright MCP verified customer list navigation and mobile width. All fictional fixture users/businesses were removed.
- Quotations, jobs, communication history and lead photographs will be connected as their Milestone 2 slices are built; this is not a claim that the entire milestone is complete.

## Next step

Implement and verify Milestone 3 incrementally, beginning with the server-only Groq provider, validated model routing and usage reservations. User explicitly authorized continuing subsequent milestones while away. Preserve all verification gates; do not claim AI/email provider verification without credentials.

## Milestone 2 — quotation checkpoint

- Draft editor, customer/lead selection, service prices, item quantities/prices, discounts, charges, VAT, terms and notes.
- One PostgreSQL numeric calculation function is authoritative for preview/save. Round each line to currency precision, subtotal rounded lines, subtract fixed discount, add charges, then calculate/round tax. GBP and other supported currencies use two decimals; JOD uses three. Unit prices accept four decimals.
- Atomic references, identity snapshots, audit history, version checks and draft-only editing. Failed writes roll back items and totals.
- Branded React PDF output; issued PDFs are immutable private Storage objects. Customer/private business notes are excluded.
- Confirmed publication, 256-bit random bearer links, hash-only token storage, 90-day link expiry, replacement revocation, no-store/no-referrer/noindex responses.
- Public portal supports PDF download, confirmed acceptance/rejection and messages. Database row locks serialize decisions; retries are idempotent; messages are limited to ten responses/minute per token.
- Two draft/calculation integration scenarios passed and two portal integration scenarios passed on the production build. These include concurrent edits/decisions, forged totals, cross-tenant operations, rollback, currency rounding, expired links, frozen PDFs, anonymous customer flow, mobile layout and private-data exclusion.
- Fixed mobile grid overflow found by the browser test; display preserves four-decimal unit prices. TypeScript, ESLint, 58 unit tests, production build and all 8 live integration scenarios passed. Playwright MCP verified desktop/mobile portal, totals, and cancelled decision confirmation; reviewed both screenshots. Browser bundle scan found no server credential.
- Local service credential is configured only in ignored .env.local; no key is displayed or passed to browser code. No actual email has been sent.

## Milestone 2 ? public requests verified

- Public /request/[slug] multistep form, required field validation, private photo uploads and per-photo optional Groq assessment consent.
- HMAC challenges bound to business and age, honeypot, bounded streamed uploads, image byte decoding/re-encoding and metadata stripping.
- Database submission limits: 60/business/hour, 5/client/business/hour, 3/email/business/day. Without a configured trusted proxy header, client requests share one business bucket. Document this deployment setting before launch.
- Atomic customer/lead/photo metadata/notification creation, no overwrite by unverified email, idempotent completion and conservative storage cleanup on transport failures.
- Business dashboard shows request link and notifications; lead details show authorized expiring photo URLs and recorded consent.
- TypeScript, ESLint, 62 unit tests, production build and both public-request integration tests passed. Playwright MCP verified mobile layout and required-field feedback. Earlier complete integration run passed all eight prior scenarios.
- Public-request signing secret configured in ignored local environment; no secret displayed.

## Milestone 2 ? final acceptance

- Jobs and appointments: atomic edits, accepted-quotation budgets, time zones, daylight-saving validation, cross-table worker collision exclusion, cancellation confirmation, calendar and list views.
- Real dashboard counts, six-month revenue by currency, activity and upcoming appointments; customer quotation/job/message history. No invented metrics or mixed-currency totals.
- TypeScript, ESLint, all 64 unit tests, production build and all 14 live integration scenarios passed. Playwright MCP reviewed dashboard/calendar and mobile/public workflows. Fictional integration fixtures were cleaned up.
- Cross-browser runtime limitations above remain explicit launch checks. External Groq and Resend verification has not occurred; no real email or AI call was made.

## Milestone 3 ? infrastructure and workspace checkpoint (in progress)

- Server-only Groq SDK adapter, documented capability routing, account model availability check before generation, strict JSON schemas plus Zod validation, JSON-mode support for the configured supported fallback model, bounded retries/Retry-After and timeouts. Never switches models silently.
- Missing/disabled configuration is explicit. No real Groq call or response has been verified: GROQ_API_KEY remains absent.
- Database-enforced UTC daily/monthly request budgets, short-window/concurrency limits, usage reservations, real reported token accounting, optional versioned decimal cost estimates and private per-user results/cache. Failed/interrupted calls consume quota.
- AI command center and six authenticated task forms, scoped business/lead/service/scheduling context, editable email drafts, quotation/job review handoff. Private photo consent is checked before downloading/recompressing at most three images for Groq. No automatic quote/schedule save or email sending.
- Public chatbot approval/settings and FAQ storage, approved-fact-only response rendering, bounded requests, origin/HMAC checks, service-only quota reservation, and clearly labeled non-AI fallback. Conversation storage is private per user and business.
- New migrations 202611190001 through 202611190004 applied, generated database types refreshed.
- Latest TypeScript and ESLint passed; 83 unit tests passed. Provider doubles are explicitly fictional. Three live database scenarios passed: quota races/tenant isolation, private conversations, public chatbot approval/budget. Earlier runtime checkpoint build and two integration scenarios passed; Playwright MCP reviewed desktop AI workspace and mobile email form. Current expanded build/browser checks still underway.
- Remaining: complete conversational UI and reporting context, strengthen generated-content/approval workflow tests, finish AI integration documentation, run full regression/MCP and live Groq text/vision verification. Milestone 3 is not complete; do not begin Milestone 4 yet.

## Milestone 3 ? current verification checkpoint

- All seven AI feature entry points now have implemented server/UI flows: quote/photo/email/analysis/planning/business conversation and opt-in public approved-knowledge chatbot. Saved conversations reopen privately; reviewed photo observations can inform Quote Copilot; direct verified figures accompany analyst views. Model selection is configured on the server; broader commercial settings/tier controls remain Milestone 4.
- Human review handoff tested with clearly labeled fictional generated-content fixtures: cancel/accept review, no automatic writes, current service prices, missing quantity validation, explicit draft/job save, private conversation reopening. This is not a live generation claim.
- Latest production build, TypeScript, ESLint and all 86 unit tests passed. Full live app/database integration suite: 20 scenarios passed against the production server and local Supabase. Playwright MCP reviewed desktop AI workspace, mobile email and public chatbot fallback; fixtures cleaned. Browser bundle scan found no configured server secrets.
- Server is running at http://localhost:3000. AI settings, privacy/consent and setup instructions are documented in docs/AI_INTEGRATION.md.
- GROQ_API_KEY is still absent. No real account model discovery, text completion or image completion has run. The separate npm.cmd run test:ai:live command is ready and deliberately fails without a key. After configuring it, restart the app, run provider contracts and exercise all seven real AI flows (including persisted usage, actual consented vision, structured outputs and editable drafts). Fix failures before closing Milestone 3.
- Do not start Milestone 4 until these live AI gates pass. Firefox/WebKit launch compatibility remains an explicit Milestone 5 check. Resend, commercial settings/tier architecture and production deployment are not complete.

- Final follow-up: fixed repeat-save validation for AI/chatbot settings by passing only editable fields into form defaults. TypeScript, ESLint, 86 unit tests and production build passed again; both affected browser scenarios passed with save ? reload ? edit ? save coverage. Full 20-scenario suite passed immediately before this narrow fix.

## Live Groq checkpoint after user configured key

- GROQ_API_KEY is configured; never printed. Initial sandbox networking returned EACCES. Approved network-enabled provider execution reached Groq. Account lists all three configured models.
- Live provider contracts: text and synthetic-image vision both passed on rerun. An earlier vision request failed; direct reproduction succeeded. No silent model changes.
- Added separate playwright.ai.config.ts and tests/live-ai/workflows.spec.ts. Full live browser run recorded 5/7 passed: email, quote, analyst (reasoning model), contextual business assistant, public chatbot. Photo Analyzer and Job Planner failed; do not close Milestone 3. Trace/screenshots/video disabled, fictional fixture records cleaned by test finally blocks.
- Photo retry recorded provider_unavailable with unknown tokens on its first attempt. Prior photo attempt reported invalid_output. Investigate provider rejection metadata, output truncation/schema/semantic validation and planner failure before marking complete. Key is valid; no further user setup is currently required.
- Latest TypeScript check passed. Local production server restarted with network permission to access Groq. Milestone 4 has not started.

## Milestone 3 acceptance (2026-11-19)

- Fixed photo-task cross-field output by constraining unrelated fields to null. Provider prompts now include validated format/length requirements; planner minute timestamps pass real generation. Provider JSON-generation rejection gets at most one repair within the existing three-attempt budget.
- TypeScript, ESLint, production build and 88 unit tests passed; all 20 local app/database integration scenarios passed. Live Groq: all six authenticated task flows passed together, including vision and reasoning, persisted real usage, consent, contextual continuation and unsaved draft/schedule assertions. Public chatbot answered correctly; its usage assertion was corrected to allow explicitly unknown usage after a rejected attempt and the standalone live scenario passed. Live photo/planner contract pair passed.
- Playwright MCP reviewed an actual Groq-generated editable email on mobile; no overflow. Fictional fixtures cleaned. No real emails sent.
- Milestone 3 functional/security gates passed. Groq account rate limits still cause honest retry-later states; no silent model switching. Firefox/WebKit launch checks remain open for Milestone 5. Begin Milestone 4 incrementally: business/account settings, tiers and limits, notifications, then confirmed Resend delivery.

## Milestone 4 local verification (2026-11-20; live email gate open)

- Business/contact/tax/currency settings, explicit currency-change confirmation, logo reuse, atomic service/pricing updates, disabled-service filtering and default quotation terms. Account profile, password recovery link and notification-copy preference.
- Free/Starter/Professional database catalog, 14-day Professional trials, automatic Free limits after expiry, tenant-isolated subscriptions, owner-confirmed pending plan requests and atomic AI/quotation quota enforcement. No payment processing or automatic charges. Supported configured text/reasoning model preference persists; vision remains separately configured.
- Notification inbox/read state and events for public requests, quotation publication/decisions and job/appointment changes. Opt-in reviewed notification copies address only the authenticated member and still require separate send confirmation.
- Resend server adapter, escaped branded HTML/plain text, editable AI email handoff, customer-derived recipients, immutable issued quotation PDF attachments, saved draft review and explicit send confirmation. Atomic claim, stable idempotency key/envelope, bounded request timeout and conservative handling of uncertain submissions. Submitted is distinct from delivered.
- Signed delivery webhook verifies the original bounded body using the actual SDK; tenant-scoped history, event ordering and replay-safe updates. No raw provider/customer payload logging. Setup and retry behavior documented in docs/EMAIL_DELIVERY.md; plan operations in docs/SUBSCRIPTIONS.md.
- Migrations through 202611200001 applied locally; generated database types refreshed. Production build, TypeScript, ESLint, 96 unit tests and all 26 live local app/database integration scenarios passed. Fixed a broad status-message test selector and an accessible model-selector label found during verification. Browser bundle scan found no configured server secrets.
- Playwright MCP reviewed mobile plan/email composer; screenshots checked, no horizontal overflow, fictional fixtures cleaned. Normal integration tests never send email. Separate playwright.email.config.ts is ready for one real provider acceptance check against Resend's designated test recipient; it has not run with credentials.
- RESEND_API_KEY, RESEND_FROM_EMAIL and RESEND_WEBHOOK_SECRET were absent at the last check. User was given Resend signup/key/free-plan instructions and the initial test sender. Real submission, sender/domain authorization and externally delivered signed webhooks remain unverified. Milestone 4 is not accepted yet; do not advance to Milestone 5 until its live email gate is resolved. No customer email, remote deployment or automatic plan activation occurred.

## Resend live submission checkpoint (2026-11-20)

- User configured RESEND_API_KEY and RESEND_FROM_EMAIL in ignored .env.local. Presence checked without printing values; app restarted to load them.
- `npx.cmd playwright test --config=playwright.email.config.ts`: 1 passed. Real Resend test-recipient submission succeeded, cancelled confirmation left the draft untouched, explicit confirmation persisted the real provider ID and submitted status, and refreshing offered no duplicate send. Fictional local fixture cleaned. No customer mailbox was used.
- This proves provider acceptance with the configured sender, not customer delivery or custom-domain readiness. RESEND_WEBHOOK_SECRET is absent and no public HTTPS webhook endpoint is configured. The signed external event gate remains open; unit signature verification and database event ordering passed earlier. Milestone 4 is not claimed fully complete, and Milestone 5 has not started.

## Milestone 4 acceptance — signed delivery verified (2026-11-20)

- User downloaded the 64-bit cloudflared executable. Started a temporary Cloudflare tunnel and created a temporary Resend webhook using the authorized account key. Saved its signing secret directly in ignored .env.local without displaying it.
- Live browser test with RESEND_VERIFY_WEBHOOK=true passed: confirmed one fictional message to Resend's designated test recipient, received a real signed external event through HTTPS, and verified persisted delivered status, delivery timestamp and provider event timestamp. No manually fabricated event was used for this acceptance check.
- Fixed a test race: the send button temporarily changes its label while pending, so the test now waits for database acceptance before checking removal. An initial test exited too early; the corrected full delivery test passed. TypeScript and ESLint passed afterward; the unchanged application build, 96 unit tests and 26 integration checks passed at the prior checkpoint.
- Disabled the temporary Resend webhook and closed the tunnel after verification. The local app remains available; the temporary public URL is not a deployment. Future live tests must enable a webhook with the current tunnel address. RESEND_TEST_WEBHOOK_ID is local test metadata only.
- Milestone 4 accepted. Milestone 5 starts with browser compatibility, security/quality checks, isolated demo data and deployment preparation. The user has a zero-spend preference; do not purchase hosting, a domain or advertising. Vercel Hobby's non-commercial restriction must be considered before selecting a launch host.

## Milestone 5 initial browser check (2026-11-20)

- WebKit now launches and passed the public mobile-layout scenario against the production build. This supersedes its earlier missing-DLL result; the full WebKit suite is not yet verified.
- Firefox fails before page creation with `browserType.launch: spawn UNKNOWN`, both within the sandbox and with approved unsandboxed execution. Its application/browser checks remain unavailable; investigate the installed Firefox executable before claiming cross-browser acceptance.
- Remaining: complete cross-browser regression, security/performance review, isolated sample workspace and a zero-spend deployment plan compatible with business use. No paid service or production deployment has been created.

## Milestone 5 marketing, demo and registration checkpoint (2026-11-20)

- Added public Features, How it works, Plans, About and Contact pages, shared navigation/footer and expanded homepage. Pricing reads actual plan limits; paid prices are explicitly unannounced. Illustrative data/testimonial are labelled fictional. SUPPORT_EMAIL is still missing, so Contact explicitly reports the preview limitation. No invented customer claims or automatic billing.
- Applied 202611200002_demo_workspaces.sql and regenerated schema types. Seeded one separate fictional sample business using normal tenant-scoped quotation/scheduling RPCs. Its credentials remain in ignored .local-demo/credentials.json. A persistent banner labels the workspace; authenticated users cannot clear its demo flag, and both server actions and database guards prevent outbound demo email. Real customer records were not changed. See docs/DEMO.md.
- Auth pages now explain local Mailpit delivery and link to http://127.0.0.1:54324. Registration uses links rather than numeric codes. Fixed supported local IP/localhost entry mismatch with config redirects limited to auth entry pages and excluding Server Actions. Proxy hostname normalization made the first attempt ineffective; broad redirects interfered with internal action navigation and were narrowed. Final Chromium and WebKit registration checks pass signup, real local confirmation, onboarding, login/logout, tenant isolation and recovery, including entry at 127.0.0.1. Playwright MCP independently verified canonical redirect and visible inbox link.
- TypeScript, ESLint, 96 unit tests and production build passed. Marketing/demo checkpoint previously passed all 28 Chromium integration scenarios; final regression follows below. Both rollback-only SQL security fixtures passed again. npm audit --omit=dev returned zero known production vulnerabilities.
- Full WebKit run: 27/28 passed. CRM CRUD/search/pagination/archive actions pass, but its no-page-errors assertion detects RSC access-control messages during navigation. Narrow reproduction also fails; request diagnostics show cancelled prefetch requests. Cause is not conclusively resolved. Do not suppress the assertion or claim WebKit acceptance. Temporary diagnostic logging removed.
- Firefox executable is blocked by Windows Application Control, confirmed directly; local browser verification remains unavailable. No policy bypass was attempted. Existing Playwright configuration/CI workflow and npm lockfile preserved.
- User has neither hosted Supabase nor Netlify account yet. docs/DEPLOYMENT.md records zero-spend setup, separate hosted auth-email requirements, support/sender configuration and Netlify upload/runtime compatibility gates. No production deployment, paid account, domain or advertising purchase occurred. Temporary Resend tunnel/webhook remain disabled.
- Milestone 5 remains open: resolve WebKit console errors, verify Firefox in an allowed environment, finish performance/hosting compatibility work and complete hosted deployment/security/email acceptance after account setup.
- Final regression after narrowing auth redirects: all 28 Chromium integration scenarios passed against the rebuilt production server. TypeScript/build, ESLint and 96 unit tests passed; browser bundle scan found zero configured server-secret matches. Local app remains running at http://localhost:3000. WebKit remains 27/28; no claim of full launch acceptance.

## GitHub source upload (2026-11-20)

- At the user's request, initialized Git on main, checked upload candidates for configured credentials and credential patterns, and committed 237 source/documentation/configuration files. No matches were found. .env.local, .local-demo credentials, dependencies, generated builds and test output remain ignored; Supabase branch metadata is also ignored. Existing lockfile and CI workflow preserved.
- User completed GitHub CLI browser authentication as MajdNasserAhmad. Created private repository https://github.com/MajdNasserAhmad/BrushQuote and pushed main with origin tracking. Initial source commit: 70fa30f. README now states the verified working-MVP status and remaining launch gates.
- This is a source backup/upload, not a hosted application or Milestone 5 completion. GitHub Actions results are separate from previously passing local checks.

## Milestone 5 launch preparation (2026-11-25)

- Disabled speculative Next Link prefetching across workspace and public navigation. The earlier CRM and public-page WebKit errors came from cancelled background route requests during navigation. Navigation still uses the router, but route data is fetched on click. Existing page-error assertions remain intact; authentication and CORS protections are unchanged.
- Added an optional Render Free Node-server Blueprint, manual deployment triggers, no paid disk/database resources, explicit environment inputs and a non-sensitive `/api/health` liveness endpoint. This prepares a full-server alternative to Netlify's function body/runtime constraints; no hosting account or deployment was created. Actual hosted memory, upload and provider deadline acceptance remains required.
- Added `check:deployment` with no secret-value output and four fixture tests included in CI. The current local configuration correctly fails production checks for local origins, a missing support email and the Resend test sender. Shape validation does not claim credential validity, SMTP readiness or sender ownership.
- Expanded the public upload workflow to five valid PNG fixtures of roughly 1.9 MB each. The submission and private persistence passed; corrected its image assertion to wait for decoding instead of equating element visibility with loaded pixels. Chromium's affected pair passed after that correction. The remaining 27 Chromium scenarios passed in the full regression run.
- Production build, TypeScript, ESLint, all 96 unit tests and four deployment tests passed. Health endpoint returned 200 with no-store; Playwright MCP verified mobile registration and the local inbox link. Browser bundle and upload-candidate scans found no configured server-secret matches. Dependency lockfile unchanged.
- Repaired a missing Windows WebKit runtime DLL with the official browser installer. Windows Application Control still prevents local Firefox execution, so tested Firefox in the official Linux Playwright image using an isolated source bundle and a localhost bridge. No external-provider keys or private signing secret were supplied to the container. All 27 Firefox workflow scenarios passed; the one HMAC-dependent raw API scenario is separately covered on Windows. A first container attempt was rejected for including .env.local; the approved replacement excluded server/API credentials. An initial Linux run without the localhost bridge could not connect and is not counted as application acceptance.
- Remaining external gates: hosted Supabase and production migrations/security verification; hosting account/URL; real Auth SMTP; authorized business sender and permanent signed webhook; public support address; deployed end-to-end acceptance. No credentials, support address, domain or production-delivery claim was fabricated. Milestone 5 remains open until these are completed.
- Linux WebKit also passed all 27 workflow scenarios, including the five-photo upload and the original CRM/public-navigation page-error assertions. Windows WebKit's full run passed the other 27 scenarios but timed out in the large-upload workflow after submission; the Linux result is recorded separately rather than treating that timeout as a pass.
- Focused final Windows WebKit rerun: both public-request scenarios passed, including five large photos (10 seconds total). The earlier full-run timeout is retained above; there was no suppressed assertion or timeout increase. Chromium's corresponding pair also passed. All current integration scenarios now have passing coverage on Windows Chromium/WebKit, and both Linux workflow suites passed together independently.
