import { loadEnvFile } from 'node:process';
import { defineConfig, devices } from '@playwright/test';
loadEnvFile('.env.local');
export default defineConfig({
  testDir: './tests/integration',
  timeout: 120000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://localhost:3000', ...devices['Desktop Chrome'], trace: 'off', screenshot: 'off', video: 'off' },
  // Start the configured local app separately. Never run this suite on production.
});
