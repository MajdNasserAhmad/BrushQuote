import { defineConfig } from '@playwright/test';

// No browser required: keeps the original browser configuration intact.
export default defineConfig({
  testDir: './tests/foundation',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  workers: 1,
  reporter: 'list',
});
