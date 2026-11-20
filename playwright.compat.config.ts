import integration from './playwright.integration.config';
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({ ...integration, projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'], launchOptions: { timeout: 15000 } } },
] });
