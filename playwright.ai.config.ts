import integration from './playwright.integration.config';
import { defineConfig } from '@playwright/test';
export default defineConfig({ ...integration, testDir: './tests/live-ai', expect: { timeout: 60000 } });
