import { defineConfig, devices } from '@playwright/test';
import { env } from './utils/env';

export const STORAGE_STATE = '.auth/user.json';
export const STORAGE_STATE_MEMBER = '.auth/member.json';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: env.baseUrl,
    navigationTimeout: 60_000,
    actionTimeout: 15_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'setup-member', testMatch: /auth\.member\.setup\.ts/ },
    {
      name: 'chromium',
      testIgnore: [
        /auth\.(member\.)?setup\.ts/,
        /tests\/auth\/login\.spec\.ts/,
        /\.guest\.spec\.ts/,
        /\.member\.spec\.ts/,
        /tests\/api\//,
      ],
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'chromium-member',
      testMatch: /\.member\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE_MEMBER },
      dependencies: ['setup-member'],
    },
    {
      name: 'chromium-guest',
      testMatch: [/tests\/auth\/login\.spec\.ts/, /\.guest\.spec\.ts/],
      use: { ...devices['Desktop Chrome'] },
    },
    { name: 'api', testMatch: /tests\/api\/.*\.spec\.ts/ },
  ],
});
