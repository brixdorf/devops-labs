import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 15 * 60 * 1000,
  expect: { timeout: 30000 },
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: '/tmp/devops-labs-e2e-results',
  use: {
    baseURL: process.env.DEVOPS_LABS_URL || 'http://devops-labs-app-1:8800',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    permissions: ['clipboard-read', 'clipboard-write'],
  },
});
