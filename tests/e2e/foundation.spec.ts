import { expect, test } from '@playwright/test';

test('home connects to registration and login', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Better business.');
  await page.getByRole('link', { name: 'Create your workspace' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Make room for better work.');
  await expect(page.getByRole('button', { name: 'Create account' })).toBeDisabled();
  await expect(page.getByText('Authentication needs configuration')).toBeVisible();
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('private routes fail closed without a configured session', async ({ page }) => {
  for (const path of ['/dashboard', '/onboarding', '/reset-password']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  }
});

test('verification errors are safe and recovery navigation works', async ({ page, baseURL }) => {
  await page.goto('/auth/confirm?type=recovery&token_hash=invalid&next=https://attacker.invalid');
  await expect(page).toHaveURL(url => ['127.0.0.1', 'localhost'].includes(url.hostname) && url.port === new URL(baseURL!).port && url.pathname === '/login' && url.search === '?error=verification');
  await expect(page.getByRole('main').getByRole('alert')).toContainText('invalid or expired');
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page.getByRole('heading', { name: 'Let’s get you back in.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send reset link' })).toBeDisabled();
});

test('mobile layout fits and navigation remains reachable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ['/', '/login', '/register', '/forgot-password']) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
});

test('public pages have no browser errors and auth responses are not cached', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const response = await page.goto('/login');
  expect(response?.headers()['cache-control']).toContain('no-store');
  expect(response?.headers()['x-content-type-options']).toBe('nosniff');
  await page.getByLabel('Email address').fill('test@example.invalid');
  expect(errors).toEqual([]);
});
