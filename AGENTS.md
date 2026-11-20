# BrushQuote working instructions

- Follow `docs/BRUSHQUOTE_SPECIFICATION.md`; record progress in `BUILD_PROGRESS.md`.
- Complete and verify the current milestone before starting the next. Do not claim blocked or untested features are complete.
- Preserve the existing npm lockfile, Playwright configuration and workflow; extend them deliberately.
- On this Windows environment use `npm.cmd` and `npx.cmd`. Do not change PowerShell execution policy.
- Never commit credentials, log sensitive data, or use service-role credentials in browser code.
- Every business-owned record needs tenant isolation, including cross-table relationships. Derive permissions from the authenticated user.
- Financial totals and appointment collision checks are deterministic server-side code.
- Groq only for the initial AI implementation. Validate account model availability and capabilities; never fabricate AI responses.
- AI-generated emails, quotes, schedules and external/destructive actions require explicit user confirmation in the product.
- Consult Context7 and official documentation for framework APIs. Use Playwright MCP for browser verification when the app runs.
- Gate each milestone on TypeScript, ESLint, relevant unit/integration/browser tests, and production build. Document unavailable checks separately.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
