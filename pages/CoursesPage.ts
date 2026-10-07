import { Page, Locator, expect } from '@playwright/test';

export class CoursesPage {
  readonly heading: Locator;
  readonly search: Locator;
  readonly viewTabs: Locator;
  readonly sort: Locator;
  readonly titles: Locator;
  readonly emptyState: Locator;
  readonly createButton: Locator;
  readonly editButtons: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Courses', exact: true });
    this.search = page.getByPlaceholder('Search courses');
    this.viewTabs = page.getByRole('tab');
    this.sort = page.getByRole('combobox');
    this.titles = page.locator('h4');
    this.emptyState = page.getByText('No courses found');
    this.createButton = page.getByRole('button', { name: 'Create Course' });
    this.editButtons = page.getByRole('button', { name: 'Edit Course' });
  }

  async open() {
    await this.page.goto('/courses', { waitUntil: 'domcontentloaded' });
    // The list is fetched client-side; wait for the first card instead of networkidle.
    // The app occasionally never hydrates on first load; reload and retry.
    let attempt = 0;
    await expect(async () => {
      if (attempt++ > 0) await this.page.reload({ waitUntil: 'domcontentloaded' });
      await expect(this.titles.first()).toBeVisible({ timeout: 15_000 });
    }).toPass({ timeout: 60_000 });
  }

  /** Outermost ancestor of the card title that still contains only this one card (image, badges, body, CTA). */
  card(title: string): Locator {
    return this.titles
      .filter({ hasText: title })
      .locator('xpath=ancestor::div[count(.//h4)=1][last()]');
  }

  async courseTitles(): Promise<string[]> {
    return (await this.titles.allInnerTexts()).map((t) => t.trim());
  }

  async selectSort(name: 'Newest' | 'Oldest') {
    await this.sort.click();
    await this.page.getByRole('option', { name, exact: true }).click();
  }

  async openCourse(slug: string) {
    await this.page.locator(`a[href="/courses/${slug}"]`).first().click();
  }
}

