import { Page, Locator, expect } from '@playwright/test';

export class CourseDetailPage {
  readonly backLink: Locator;
  readonly about: Locator;
  readonly curriculum: Locator;
  readonly expandAll: Locator;
  readonly getAccess: Locator;
  readonly notFound: Locator;

  constructor(private readonly page: Page) {
    this.backLink = page.getByRole('link', { name: 'Back to courses' });
    this.about = page.getByText('About This Course');
    this.curriculum = page.getByText('Course Curriculum');
    this.expandAll = page.getByText('Expand all chapters');
    this.getAccess = page.getByRole('button', { name: 'Get Access' });
    this.notFound = page.getByText('Course Not Found');
  }

  async open(slug: string) {
    await this.page.goto(`/courses/${slug}`, { waitUntil: 'domcontentloaded' });
  }

  title(name: string): Locator {
    return this.page.getByRole('heading', { name }).first();
  }

  async waitLoaded(name: string) {
    await expect(this.title(name)).toBeVisible({ timeout: 45_000 });
  }
}
