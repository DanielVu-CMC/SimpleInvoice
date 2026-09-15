import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import { config } from 'dotenv';
config({ path: '.env', quiet: true });
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL:
      process.env.BROWSER_BASE_URL ||
      `http://localhost:${process.env.FRONTEND_PORT || 5180}`,
    channel: existsSync('/Applications/Google Chrome.app')
      ? 'chrome'
      : undefined,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1050 },
      },
    },
  ],
});
