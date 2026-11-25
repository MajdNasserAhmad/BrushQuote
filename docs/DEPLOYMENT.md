# Deployment preparation

Status: local application verified incrementally; no public production deployment exists. The user has not yet created hosted Supabase or Netlify accounts. Zero spend is a requirement. Do not purchase a domain, upgrade a plan or enable paid usage without explicit authorization.

## Local testing

Open http://localhost:3000. Local Supabase captures signup and password-reset messages at http://127.0.0.1:54324 instead of delivering them to personal mailboxes. Follow the confirmation link in the same browser used to register. There is no numeric code. Auth entry pages redirect the supported local IP address to localhost before setting PKCE cookies.

The isolated sample workspace is documented in DEMO.md. It contains fictional records and blocks outbound email at both the server-action and database layers. Its ignored credentials file must not be published.

## Prepared Node-server deployment

`render.yaml` prepares an optional Render Node web service on the free compute plan. It uses the existing npm lockfile, Node 24, the normal production build/start commands, `/api/health` for liveness, and manual deployment triggers. It creates no paid disk or database. It has not been deployed: account connection, production settings and hosted acceptance tests remain required.

Internal links fetch routes on navigation rather than automatically prefetching them. This reduces speculative server requests and avoids cancelled background requests surfacing as WebKit navigation errors. The tradeoff is that navigation may wait for a route fetch; existing loading states remain in place. Browser error assertions are retained, and no CORS or authentication checks were weakened.

This full-server approach avoids depending on Netlify's function payload/runtime model. The application's current five-photo/2 MB-per-photo validation remains intact; no silent feature reduction was made. Verify five near-limit photos, PDF generation, long AI responses and memory use on the actual host before launch. Render Free has limited resources and sleeps after 15 idle minutes, with a cold start that can take about a minute; it is a preview/beta option, not an uptime guarantee. Source: https://render.com/docs/free and https://render.com/docs/deploy-nextjs-app.

Set the public URL/Supabase values before building (Next.js embeds public variables at build time). Enter server credentials only in hosting environment settings. `npm.cmd run check:deployment` validates configuration shape without displaying values and rejects local origins, browser service-role keys, weak signing secrets, test senders, missing contact addresses and unverified forwarded-IP configuration. Passing it does not establish that credentials work or that SMTP/webhook delivery is configured. Four isolated fixture tests run with `npm.cmd run test:deployment` and in CI. `/api/health` reports process liveness only, not database/provider readiness.

## Netlify alternative requires additional work

Netlify is a candidate because its Free plan permits commercial projects and provides a hosted address; see https://www.netlify.com/platform/ and https://www.netlify.com/pricing/. Free usage is capped and service can pause when the allowance is exhausted. Vercel Hobby's personal/noncommercial restriction makes it unsuitable for this commercial launch.

Before choosing Netlify, resolve its function payload and execution limits against this application. The current public photo request allows a bounded 12 MB multipart body, while buffered binary function requests have a substantially smaller effective limit. AI retries may also exceed a synchronous function deadline. Verify the current limits at https://docs.netlify.com/build/functions/configuration/. Do not silently reduce specification requirements, claim compatibility from a successful build alone, or deploy an upload flow that fails at the hosting edge. A direct authorized Storage upload design or another compatible host needs implementation and security testing before acceptance.

## Hosted services and launch sequence

1. Create free hosting/database service accounts without purchasing upgrades. Choose a compatible host after the above checks. Source is versioned on main in the private GitHub repository https://github.com/MajdNasserAhmad/BrushQuote. Local credentials and generated/test data are ignored; configure deployment secrets separately in the selected host.
2. Create a separate hosted Supabase project. Apply the ordered migrations, verify RLS/composite tenant relationships and private Storage policies remotely, and configure production application/callback URLs. Never migrate local test users, inbox contents or demo credentials into production.
3. Configure hosted authentication mail independently of the application's quote-email integration. Verify actual signup and recovery delivery to intended beta users and the provider's current recipient restrictions. A working local inbox does not prove hosted delivery.
4. Configure server secrets in hosting settings; expose only the public Supabase URL/key and public application URL to the browser. Configure a public SUPPORT_EMAIL for the contact page. Never commit .env.local, service-role keys, Groq/Resend keys or webhook secrets.
5. Verify sender authorization for customer-facing mail. The Resend test sender and designated test recipient prove integration only; they do not authorize sending business mail to arbitrary customers. The user currently has no custom domain. Resolve this launch dependency without purchasing anything automatically.
6. Configure a stable HTTPS Resend webhook, store its signing secret server-side, and repeat verified signed delivery against the deployed app. The earlier temporary tunnel and webhook are disabled and are not deployment resources.
7. Run production-build, type/lint/unit gates, remote auth, tenant isolation, upload/PDF, scheduling, AI confirmation and email-delivery acceptance checks. Complete Chromium/WebKit and Firefox verification in an allowed environment. Check free-plan caps, function deadlines and actual mobile workflows before inviting real customers.

## Hosted auth and delivery settings

- In Supabase Auth URL Configuration, set Site URL to the exact production HTTPS origin. Allow the application's `/auth/callback` URL and recovery callback (`/auth/callback?flow=recovery`) on that origin. Do not use a wildcard across arbitrary domains. Recheck the application's redirect URLs after any host change.
- Keep email confirmation enabled. Configure custom SMTP in Supabase Auth; the application's Resend API settings do not configure Auth SMTP. Supabase's built-in hosted sender is restricted to project-team addresses and is unsuitable for general customer signups. See https://supabase.com/docs/guides/auth/auth-smtp and https://supabase.com/docs/guides/auth/redirect-urls.
- Configure an authorized sender and a permanent Resend webhook at `https://YOUR-HOST/api/email/webhook`. Use the new endpoint's signing secret, not the disabled temporary tunnel's secret. Verify actual signed event persistence before accepting customer email delivery.
- Test signup and password recovery from a fresh browser, customer/tenant isolation with two separate accounts, and invalid/expired links. Do not run the local destructive fixture suite against a live customer database.

Do not mark Milestone 5 complete until these checks and missing public contact/sender configuration are resolved. Account credentials should be entered directly into the relevant service or local environment, never pasted into chat.
