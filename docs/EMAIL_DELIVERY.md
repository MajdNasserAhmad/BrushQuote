# Email delivery

The app uses the installed Resend SDK on the server. No email is sent by generating an AI reply or saving a draft. A workspace member must review the exact recipient, text and attachment names, then confirm sending.

## Configuration

Set these only in ignored `.env.local` or the hosting provider's server environment:

```dotenv
RESEND_API_KEY=
RESEND_FROM_EMAIL=
RESEND_WEBHOOK_SECRET=
```

Create an API key in [Resend API Keys](https://resend.com/api-keys). For initial testing, `onboarding@resend.dev` can send to your Resend account address only. For customer delivery, add and verify a domain in [Resend Domains](https://resend.com/domains) and set a plain sender address on it. Keep your existing DNS records unless Resend explicitly requires a change. Restart the app after environment changes.

Configure a Resend webhook at your public HTTPS `/api/email/webhook` endpoint and store its signing secret as `RESEND_WEBHOOK_SECRET`. Subscribe to sent, delivered, bounced, complained, failed and suppressed email events. Localhost cannot receive Resend webhooks without an explicitly configured public tunnel. Do not report a live webhook check as passed using a locally signed fixture.

## Draft and delivery behavior

- Customer addresses come from authorized active customer records. Cross-business customer, quotation and job references are rejected. A linked quotation must have a published immutable PDF; the draft snapshots the PDF attachment.
- All seven composer categories use escaped, branded HTML and a plain-text alternative. The member writes or edits the content. AI edits carry into recipient selection; nothing is automatically sent.
- Saved drafts preserve their sender, recipient, content and attachments. A draft saved before sender configuration must be recreated after configuration. Creating drafts is limited to 50 per workspace per hour.
- Confirmation claims the draft atomically. Simultaneous clicks cannot create two submissions. Every provider retry uses the same stored envelope and idempotency key.
- `submitted` means Resend accepted the request. Only an authenticated delivery event records `delivered`. Bounces, complaints and failures are distinct.
- An uncertain submission stays queued. Wait two minutes before retrying the same draft, and retry only within 23 hours of its first confirmation. Resend's idempotency window is 24 hours. After that, inspect the provider's records before any new send. There is no automatic retry worker.
- Signed webhooks are bounded to 64 KiB, verified against the original body, and record only ID/status/time. Missing local submission records return 503 for provider retry; stale events and late sent events cannot overwrite delivery evidence.

References: [idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys), [webhook verification](https://resend.com/docs/webhooks/verify-webhooks-requests), [test sender restriction](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

## Verification status

Update, 2026-11-20: full signed delivery verification passed using a temporary Cloudflare HTTPS tunnel and a Resend webhook. With `RESEND_VERIFY_WEBHOOK=true`, the live browser test waited for a real external delivery event and checked persisted delivery/event timestamps. The temporary webhook was disabled and tunnel closed afterward. No public production deployment or custom sending-domain verification is implied. Re-enable a test webhook with the current tunnel URL before repeating this mode.

After configuration and restarting the app, run `npx.cmd playwright test --config=playwright.email.config.ts`. This separate live test sends one fictional message to Resend's documented `delivered@resend.dev` test address, consumes provider quota, and checks actual provider acceptance and explicit confirmation. It does not claim an end-to-end webhook delivery test. Normal integration tests never send mail. See [Resend test recipients](https://resend.com/docs/dashboard/emails/send-test-emails).

Unit checks cover HTML escaping, draft/header validation, actual SDK signature verification, tampering, stale signatures and size limits. Local integration checks cover tenant isolation, confirmation, simultaneous claims and event ordering. On 2026-11-20, the live browser test passed with the configured Resend credentials: cancelling confirmation left the draft unsent, confirming submitted one fictional message to `delivered@resend.dev`, and the app persisted the real provider ID and submitted status. This verifies provider acceptance, not delivery. Externally delivered signed webhooks remain unverified: RESEND_WEBHOOK_SECRET and a public HTTPS endpoint are not configured. No customer emails have been sent during development.

The account preference enables reviewed email copies of business notifications. Quote publication/decisions and job/appointment changes create in-app notifications; public quote requests already do so. From Notifications, a member can create a copy addressed only to their own authenticated account address, then confirm it on the email review screen. This preference never authorizes automatic external messages.
