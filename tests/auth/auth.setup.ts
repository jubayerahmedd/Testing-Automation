import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { env } from '../../utils/env';
import { STORAGE_STATE } from '../../playwright.config';

setup('authenticate and save session', async ({ page }) => {
  const login = new LoginPage(page);
  await login.open();
  await login.login(env.email, env.password);
  await expect(login.email).toBeHidden();
  await page.waitForLoadState('networkidle');
  // The access/refresh cookies are set a moment after the modal closes; saving earlier
  // yields a session that the API rejects with 401.
  await expect
    .poll(async () => (await page.context().cookies()).map((c) => c.name), { timeout: 30_000 })
    .toEqual(expect.arrayContaining(['__Host-ecom_at', '__Host-ecom_rt']));
  await page.context().storageState({ path: STORAGE_STATE });
});
