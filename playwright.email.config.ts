import integration from './playwright.integration.config';
import { defineConfig } from '@playwright/test';
export default defineConfig({ ...integration, testDir: './tests/live-email', expect: { timeout: 30000 } });
