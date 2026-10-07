import { test, expect } from '../../fixtures';
import { NAV_ITEMS } from '../../pages/NavBar';

test.describe('Main navigation (authenticated)', () => {
  for (const item of NAV_ITEMS) {
    test(`${item.name} page loads @smoke`, async ({ page, navBar }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await navBar.link(item.name).click();
      await expect(page).toHaveURL(new RegExp(`${item.path}$|${item.path}[/?]`));
    });
  }
});
