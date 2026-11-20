import { test, expect, type Page } from '@playwright/test';
import { randomUUID, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const studio = 'http://127.0.0.1:54323';
const inbox = 'http://127.0.0.1:54324';
const suffix = randomUUID().slice(0, 12);
const users = [0, 1].map(index => ({ email: `brushquote-test-${suffix}-${index}@example.invalid`, password: randomBytes(24).toString('base64url'), slug: `test-${suffix}-${index}` }));

async function sql(query: string) {
  const response = await fetch(`${studio}/api/platform/pg-meta/default/query`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }) });
  if (!response.ok) throw new Error('Local fixture database operation failed.');
  return response.json();
}

async function verificationLink(email: string, type: 'signup' | 'recovery') {
  let link: string | undefined;
  await expect.poll(async () => {
    const data = await (await fetch(`${inbox}/api/v1/messages`)).json();
    for (const message of data.messages ?? []) {
      if (!message.To?.some((to: { Address: string }) => to.Address === email)) continue;
      const content = await (await fetch(`${inbox}/api/v1/message/${message.ID}`)).json();
      for (const candidate of `${content.HTML ?? ''}\n${content.Text ?? ''}`.match(/https?:\/\/[^\s"<>]+/g) ?? []) {
        const value = candidate.replaceAll('&amp;', '&');
        const url = new URL(value);
        if (url.searchParams.get('type') === type && ['127.0.0.1', 'localhost'].includes(url.hostname)) { link = value; return true; }
      }
    }
    return false;
  }, { timeout: 30000, intervals: [250, 500, 1000] }).toBe(true);
  return link!;
}

async function registerAndOnboard(page: Page, index: number) {
  const user = users[index];
  await page.goto(index === 1 ? 'http://127.0.0.1:3000/register' : '/register');
  await expect(page).toHaveURL('http://localhost:3000/register');
  await expect(page.getByRole('complementary', { name: 'Local test email' })).toContainText('not your personal email inbox');
  await expect(page.getByRole('link', { name: 'Open local test inbox' })).toHaveAttribute('href', 'http://127.0.0.1:54324');
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('verification email');
  await page.goto(await verificationLink(user.email, 'signup'));
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('Company name', { exact: true }).fill(`Fictional Test Painting ${index}`);
  await page.getByLabel('Public address name').fill(user.slug);
  await page.getByLabel('Business phone').fill('+44 1234 567890');
  await page.getByLabel('Business address').fill('1 Fictional Test Street');
  await page.getByLabel('Service areas').fill('Bristol, Bath');
  await page.getByLabel('Service name').fill('Interior painting');
  await page.getByLabel('Unit price').fill('12.3456');
  const image = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#13755d' } }).png().toBuffer();
  await page.getByLabel('Company logo (optional)').setInputFiles({ name: 'fixture.png', mimeType: 'image/png', buffer: image });
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(`Fictional Test Painting ${index}`);
  await page.getByText('Company profile', { exact: true }).click();
  await expect(page.getByRole('img', { name: `Fictional Test Painting ${index} logo` })).toBeVisible();
  await page.reload();
  await page.getByText('Company profile', { exact: true }).click();
  await expect(page.getByText('GBP · 0%')).toBeVisible();
}

test.afterAll(async () => {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:54321') return;
  const settings = await (await fetch(`${studio}/api/platform/projects/default/settings`)).json();
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, settings.service_api_keys.find((key: { name: string }) => key.name === 'service_role key').api_key, { auth: { persistSession: false } });
  // Only delete UUID-scoped fixture accounts/businesses created by this run.
  for (const user of users) {
    const { data } = await admin.from('businesses').select('logo_path').eq('slug', user.slug);
    const paths = data?.map(row => row.logo_path).filter((path): path is string => typeof path === 'string') ?? [];
    if (paths.length) expect((await admin.storage.from('business-logos').remove(paths)).error).toBeNull();
    await sql(`delete from public.businesses where slug = '${user.slug}'; delete from auth.users where email = '${user.email}';`);
  }
});

test('real email verification, onboarding, sessions, isolation and recovery', async ({ page, browser }) => {
  test.skip(process.env.NEXT_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:54321', 'Only the dedicated local stack is supported.');
  await registerAndOnboard(page, 0);
  const second = await browser.newContext({ baseURL: 'http://localhost:3000' });
  try {
    await registerAndOnboard(await second.newPage(), 1);
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    expect((await client.auth.signInWithPassword({ email: users[0].email, password: users[0].password })).error).toBeNull();
    const foreign = (await sql(`select id,logo_path from public.businesses where slug='${users[1].slug}'`))[0];
    const deniedRead = await client.from('businesses').select('id').eq('id', foreign.id);
    expect(deniedRead.error).toBeNull(); expect(deniedRead.data).toEqual([]);
    const deniedWrite = await client.from('businesses').update({ name: 'Unauthorized change' }).eq('id', foreign.id).select('id');
    expect(deniedWrite.data).toEqual([]);
    expect((await client.storage.from('business-logos').createSignedUrl(foreign.logo_path, 60)).error).not.toBeNull();
    const anonymous = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    expect((await anonymous.from('businesses').select('id')).error).not.toBeNull();
  } finally { await second.close(); }

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/dashboard'); await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('Email address').fill(users[0].email);
  await page.getByLabel('Password', { exact: true }).fill(users[0].password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page.getByRole('heading', { name: 'Let’s get you back in.' })).toBeVisible();
  await page.getByLabel('Email address').fill(users[0].email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('status')).toContainText('password reset link');
  await page.goto(await verificationLink(users[0].email, 'recovery'));
  await expect(page).toHaveURL(/\/reset-password$/);
  const previousPassword = users[0].password;
  users[0].password = randomBytes(24).toString('base64url');
  await page.getByLabel('New password').fill(users[0].password);
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByRole('status')).toContainText('password has been updated');
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  expect((await client.auth.signInWithPassword({ email: users[0].email, password: previousPassword })).error).not.toBeNull();
  expect((await client.auth.signInWithPassword({ email: users[0].email, password: users[0].password })).error).toBeNull();
});
