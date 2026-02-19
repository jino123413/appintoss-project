import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  timeout: 120_000,
  workers: 1,
  reporter: [['list']],
  use: {
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
