# Local development setup

The local Next.js app and Supabase stack are configured. Milestones 1 and 2 passed their local functional/security gates. The instructions below also support setting up another isolated development environment. Never use a service-role key as the public key.

## Start the isolated local database

Docker Desktop must be running with Linux containers. This agent session is denied access to the Docker engine pipe even after Docker starts, so execute these commands from your normal PowerShell terminal:

```powershell
cd C:\Users\majdo\BrushQuote
npx.cmd supabase start
```

The repository now includes `supabase/config.toml` for the dedicated `brushquote` local project, PostgreSQL 17, private Storage, email confirmation and a local mail inbox. The local stack is running with this configuration; migrations and type generation have succeeded via direct PostgreSQL access. The initial container download requires network access. Do not reset an existing database containing real records.

With installed Supabase CLI 3.1, `supabase db push` targets the local database by default. Apply any pending local migrations:

```powershell
npx.cmd supabase db push
npx.cmd supabase status
```

Use the local project only for these draft migrations. No hosted production project is needed for this milestone. If a command fails, preserve its error output for diagnosis rather than skipping the failure.

## Configure the app

Create `.env.local` only if it does not exist:

```powershell
if (!(Test-Path -LiteralPath .env.local)) {
  Copy-Item -LiteralPath .env.example -Destination .env.local
}
```

Edit these values using the local stack's status output:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon or publishable key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Do not paste keys into chat. Public requests and portals require the server-only SUPABASE_SERVICE_ROLE_KEY and a random PUBLIC_REQUEST_SIGNING_SECRET of at least 32 characters. Groq requires GROQ_API_KEY; Resend later requires RESEND_API_KEY and RESEND_FROM_EMAIL. Missing AI/email credentials do not enable simulated services.

Run `npm.cmd run dev` and visit `http://localhost:3000`. Restart the app after changing environment variables. Use one hostname consistently for account creation and email callbacks so the PKCE verifier cookie is available.

## Authentication email configuration

For the local stack, confirmation/reset messages appear in the local mail inbox at `http://127.0.0.1:54324`; they are not delivered to real recipients. The repository enables email confirmation and allows the application's exact callback URLs. Hosted development projects need the same site URL and callback allowlist in Supabase Auth settings.

The `/auth/callback` route handles PKCE codes. The `/auth/confirm` route also supports token-hash email templates, with only `signup` and `recovery` types accepted:

```html
<!-- Confirm signup template -->
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Verify email</a>

<!-- Reset password template -->
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>
```

Do not disable email confirmation to get a test to pass. Supabase handles authentication request rate limiting; review the Auth rate-limit/CAPTCHA configuration before a public deployment.

## Database security fixtures

Use a fresh disposable local database with all repository migrations applied. Run `supabase/tests/identity_security.sql` and `supabase/tests/domain_security.sql` as SQL through psql (`ON_ERROR_STOP=1`) or the local Studio SQL editor at `http://127.0.0.1:54323`. Both use rollback-only fictional fixtures; errors must be resolved before the milestone is complete. These are not pgTAP scripts.

Generate the complete TypeScript database contract after schema validation. The checked-in src/lib/supabase/database.ts was generated from the local database; regenerate it after each migration.

## Required live acceptance checks

1. Register a fictional user, verify the email through the local inbox, sign in, sign out, and complete password recovery.
2. Confirm unauthenticated and unverified requests cannot open protected routes or invoke onboarding/password mutations.
3. Create a business with services/prices, tax, areas and a real image logo; reload to confirm persistence.
4. Verify duplicate slugs and invalid pricing roll back onboarding; verify concurrent submissions do not create two businesses.
5. Create a second business under a second account. Verify isolation through UI, direct APIs, database policies and signed/private Storage access.
6. Confirm the logo retry path works if Storage fails after the business transaction succeeds.
7. Run all checks documented in TESTING.md. These Milestone 1 checks passed; continue to enforce them through regression tests.

CLI guidance: https://supabase.com/docs/guides/local-development and https://supabase.com/docs/reference/cli/supabase-db-push. The CLI 3.1 behavior was checked against the official CLI source via Context7.

## Public request proxy configuration

Leave PUBLIC_REQUEST_IP_HEADER blank unless a trusted deployment proxy overwrites that header. Blank uses a shared business client bucket. Never trust arbitrary forwarded headers. The current business limit is 60 submissions/hour, with 5/client/hour and 3/email/day.
