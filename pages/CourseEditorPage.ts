import { Page, Locator, expect } from '@playwright/test';

export const EDITOR_TABS = [
  { name: 'Curriculum', suffix: '' },
  { name: 'Drip', suffix: '/drip' },
  { name: 'Staff', suffix: '/staff' },
  { name: 'Enrollments', suffix: '/enrollments' },
  { name: 'Settings', suffix: '/setting' },
] as const;

export const SETTINGS_SECTIONS = [
  { name: 'General', suffix: '', marker: /Basic Information/i },
  { name: 'Visibility', suffix: '/visibility', marker: /Who can see and discover/i },
  { name: 'Access Control', suffix: '/access-control', marker: /Course Roles/i },
  { name: 'Pricing', suffix: '/pricing', marker: /Set what learners pay/i },
  { name: 'Branding', suffix: '/branding', marker: /Cover image/i },
  { name: 'Lock Screen', suffix: '/lock-screen', marker: /Lock screen type/i },
  { name: 'Engagement', suffix: '/engagement', marker: /Motivational popup/i },
  { name: 'Certificate', suffix: '/certificate', marker: /Award a certificate on completion/i },
  { name: 'Awarded', suffix: '/awarded-certificates', marker: /Awarded certificates/i },
] as const;

export class CourseEditorPage {
  readonly dialog: Locator;

  constructor(private readonly page: Page, readonly slug = 'paid-course') {
    this.dialog = page.getByRole('dialog');
  }

  get base() { return `/courses/${this.slug}/edit`; }

  /** Header navigation exists twice (desktop + mobile); use the visible one. */
  navLink(name: string): Locator {
    return this.page.getByRole('link', { name, exact: true }).filter({ visible: true }).first();
  }

  async open(suffix = '') {
    await this.page.goto(`${this.base}${suffix}`, { waitUntil: 'domcontentloaded' });
    // The app occasionally never hydrates on first load; reload and retry.
    let attempt = 0;
    await expect(async () => {
      if (attempt++ > 0) await this.page.reload({ waitUntil: 'domcontentloaded' });
      await expect(this.navLink('Curriculum')).toBeVisible({ timeout: 15_000 });
    }).toPass({ timeout: 60_000 });
  }

  chapterLink(): Locator {
    return this.page.locator('a[href*="/edit/chapter/"]:not([href$="/create"])').first();
  }
}

