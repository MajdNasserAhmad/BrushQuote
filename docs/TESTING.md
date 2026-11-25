# Testing

## Verified baseline

2026-11-25 launch-preparation checkpoint: production build, TypeScript, ESLint, 96 unit tests and four deployment-configuration tests passed. Chromium's 27 unaffected integration scenarios passed together; its expanded five-photo workflow passed after replacing an immediate image-width assertion with a decode-aware poll. All 27 workflow scenarios passed in each of Firefox and WebKit on Linux. The HMAC-dependent raw API scenario was excluded from the credential-restricted Linux bundle and passed separately on Windows. The earlier WebKit navigation-error assertions now pass with speculative route prefetch disabled. Windows WebKit had a large-upload timeout after submission during the full run; Linux results do not erase that observation.

The focused final Windows WebKit public-request rerun passed both scenarios in 10 seconds, including five large photos. No error assertion was suppressed or timeout increased. The previous full-run timeout remains part of the record.

Linux verification used the official `mcr.microsoft.com/playwright:v1.65.1-noble` image with a source-only test bundle, local Supabase's public anon key and a localhost-to-host app bridge. Never mount the complete repository or copy `.env.local` into a container: it contains unrelated external-service credentials. The Linux test bundle intentionally omits the HMAC-dependent endpoint test and contains no external provider credentials. Integration fixtures use the local Studio admin interface for isolated fictional accounts, so run this only against the dedicated local stack. Current GitHub CI also runs deployment-guard tests alongside the preserved three-browser public suite.

Milestones 1–4 are accepted locally; see BUILD_PROGRESS.md for dated evidence. Live Groq text, reasoning, vision and all seven workflows passed. Real Resend test-recipient acceptance and an externally delivered signed delivery event passed. The temporary webhook and tunnel were disabled afterward. No customer email was sent by these checks.

Milestone 5 is in progress. The marketing/demo checkpoint passed TypeScript, ESLint, production build, 96 unit tests and 28 Chromium integration scenarios. Subsequent local registration-origin changes require regression verification before acceptance; consult the latest BUILD_PROGRESS.md checkpoint.

## Commands

Run from C:\Users\majdo\BrushQuote using npm.cmd on Windows:

- npm.cmd run typecheck
- npm.cmd run lint
- npm.cmd run test:unit
- npm.cmd run build
- npm.cmd run start -- --hostname 127.0.0.1 --port 3000
- In another terminal: npm.cmd run test:integration

The integration suite requires the isolated local Supabase instance and .env.local. It uses fictional accounts, real auth/database/Storage operations and a production Next.js server. Fixture cleanup is scoped to generated business/user IDs. Never run these fixtures against production. It covers auth/email confirmation/recovery, atomic onboarding, tenant and Storage isolation, CRM, exact quotation calculations/PDFs, secure portals, public photo requests, scheduling collisions/time zones and dashboard aggregates. AI provider unit tests use explicitly fictional transport doubles; they do not demonstrate live Groq capability.

## Public missing-configuration suite

The original three-browser Playwright configuration and workflow are preserved. npm.cmd run test:e2e expects an unconfigured application. Use a separate production build without Supabase variables; do not point it at the configured workspace server. PLAYWRIGHT_BASE_URL can select an already-running isolated preview (for example http://127.0.0.1:3001), then run npm.cmd run test:e2e -- --project=chromium --workers=1. This avoids the managed-server teardown stall observed in this Windows session. Chromium's five foundation scenarios passed. Linux CI retains managed-server mode.

## SQL fixtures and types

Both rollback-only foundation fixtures passed against local PostgreSQL: supabase/tests/identity_security.sql and supabase/tests/domain_security.sql. Run them through Studio SQL or psql with ON_ERROR_STOP=1 after applying migrations. src/lib/supabase/database.ts is generated from the actual local public schema, not a handwritten subset.

## Outstanding external/runtime checks

- WebKit now launches and its public mobile scenario passed. Full cross-browser regression is still open. Run npx.cmd playwright test --config=playwright.compat.config.ts --project=webkit against the configured local production server.
- Latest full WebKit result: 27/28 passed. CRM actions pass but its page-error assertion detects RSC access-control messages during navigation. Request diagnostics also show cancelled prefetches. A similar cancellation-before-pagehide issue is discussed at https://github.com/microsoft/playwright/issues/42823; this is supporting context, not proof of an identical cause in BrushQuote. Keep the assertion and investigate without disabling browser security or adding permissive CORS headers.
- Windows Application Control blocks the installed unsigned Playwright Firefox executable. Local Firefox verification is unavailable; do not bypass the operating-system policy. The original three-browser CI workflow is preserved.
- Live Groq and real signed Resend delivery were verified separately; normal integration tests use fictional fixtures and do not send mail. Repeating external delivery requires an active HTTPS webhook and matching secret.
- Production deployment, hosted authentication email, a customer-authorized sender, public support contact and remote database verification remain launch gates.
- Both rollback-only SQL security fixtures passed again on 2026-11-20. npm audit --omit=dev reported zero known production dependency vulnerabilities at that checkpoint.
