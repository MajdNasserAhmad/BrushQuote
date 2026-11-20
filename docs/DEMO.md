# Isolated local demo

Run `node scripts/seed-demo.mjs` from the repository with the local Supabase stack running. The script refuses remote Supabase URLs and refuses to overwrite an existing recorded demo.

Open `.local-demo/credentials.json` locally for the randomly generated account's email and password. Sign out of your normal account first, or use a separate browser profile, then visit `http://localhost:3000/login`. Never share or commit the credentials file; the whole `.local-demo/` directory is ignored.

The fictional Willow & Brush workspace contains three customers, three property requests, three draft quotations, three services/prices, one scheduled job and one site-visit appointment. Dates are relative to creation. All quotation totals and scheduling reservations use the normal authenticated database functions. Nothing is inserted into your own business.

A persistent workspace banner labels sample data. The demo flag is operator-controlled and members cannot remove it. The database blocks email sending from demo workspaces even if a client tries to bypass the screen. AI starts disabled; there are no fake AI responses. Enabling real AI requires the normal administrator setting and per-request sharing confirmation and uses the configured provider quota.

Use only fictional information in this workspace. Creating or editing sample records is allowed. There is no automatic reset or delete operation: a failed seed leaves its isolated IDs and state in the local credentials file for diagnosis instead of touching existing records.

Registration in the separate local test environment still uses Mailpit at `http://127.0.0.1:54324`. Its emails do not reach personal inboxes. Production authentication needs a hosted Supabase project and separately configured auth-email delivery; the application's Resend sender alone does not configure Supabase Auth SMTP.
