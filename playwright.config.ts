
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './investigation',
  timeout: 60000,
  use: {
    baseURL: 'https://pulseearn.online',
    trace: 'on-first-retry',
    screenshot: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
