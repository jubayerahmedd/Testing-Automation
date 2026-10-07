import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { env } from '../../utils/env';
import { STORAGE_STATE_MEMBER } from '../../playwright.config';

setup('authenticate member and save session', async ({ page }) => {
  const login = new LoginPage(page);
  await login.open();
  await login.login(env.memberEmail, env.memberPassword);
  await expect(login.email).toBeHidden();
  await page.waitForLoadState('networkidle');
  // See auth.setup.ts: the session is only valid once these cookies exist.
  await expect
    .poll(async () => (await page.context().cookies()).map((c) => c.name), { timeout: 30_000 })
    .toEqual(expect.arrayContaining(['__Host-ecom_at', '__Host-ecom_rt']));
  // A member who has not finished the "Tell us a bit about you" onboarding is redirected to
  // /welcome from every page ("Skip for now" does nothing), so fail early with a clear message.
  await page.goto('/courses', { waitUntil: 'domcontentloaded' });
  await expect(page, 'member must complete profile onboarding once, manually').not.toHaveURL(/\/welcome/);
  await page.context().storageState({ path: STORAGE_STATE_MEMBER });
});
