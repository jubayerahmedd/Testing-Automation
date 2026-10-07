import { test, expect } from '@playwright/test';

test.describe('Public endpoints', () => {
  for (const path of ['/', '/events', '/courses', '/blogs', '/leaderboard']) {
    test(`GET ${path} responds 200`, async ({ request }) => {
      const res = await request.get(path, { timeout: 60_000 });
      expect(res.status()).toBe(200);
    });
  }
});
