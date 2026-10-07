import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly openLoginButton: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;

  constructor(private readonly page: Page) {
    this.openLoginButton = page.getByRole('button', { name: 'Log in' }).first();
    this.email = page.locator('#email');
    this.password = page.locator('#password');
    this.submit = page.getByRole('button', { name: 'Log in' }).last();
  }

  async open() {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
    // Next.js hydrates after DOMContentLoaded; retry the click until the modal opens.
    await expect(async () => {
      await this.openLoginButton.click();
      await expect(this.email).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 45_000 });
  }

  async login(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
