import { test, expect } from '../../fixtures';
import { env } from '../../utils/env';

test.describe('Login', () => {
  test('valid credentials log the user in @smoke', async ({ page, loginPage }) => {
    await loginPage.open();
    await loginPage.login(env.email, env.password);
    await expect(loginPage.email).toBeHidden();
    await expect(page.getByRole('button', { name: 'Log in' })).toHaveCount(0);
  });

  test('wrong password keeps login form open', async ({ loginPage }) => {
    await loginPage.open();
    await loginPage.login(env.email, 'Wrong@Pass123');
    await expect(loginPage.email).toBeVisible();
  });

  test('empty submit does not log in', async ({ loginPage }) => {
    await loginPage.open();
    await loginPage.submit.click();
    await expect(loginPage.email).toBeVisible();
  });
});
