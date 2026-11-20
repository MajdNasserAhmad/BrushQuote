import { test, expect } from '@playwright/test';
test('public marketing navigation, actual plan limits and mobile pages work without signing in', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await expect(page.getByText('Illustrative sample data', { exact: false })).toBeVisible();
  await expect(page.getByText('Fictional testimonial example', { exact: false })).toBeVisible();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Plans', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A plan for your next stage.' })).toBeVisible();
  await expect(page.getByText('5 AI requests per day', { exact: true })).toBeVisible();
  await expect(page.getByText('1000 AI requests per month', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ['/', '/features', '/how-it-works', '/pricing', '/about', '/contact', '/register']) {
    const response = await page.goto(path); expect([200, 304]).toContain(response?.status());
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});
