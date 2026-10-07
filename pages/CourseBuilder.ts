import { Page, Locator, expect } from '@playwright/test';
import path from 'path';

export const FILES = path.resolve(__dirname, '..', 'fixtures', 'files');
export const file = (name: string) => path.join(FILES, name);

/**
 * Pick an already-processed video from the media gallery instead of uploading one. Uploaded
 * videos are transcoded by an external service and stayed in "Processing..." indefinitely
 * (and a stuck upload cannot be selected), so uploading a video is not usable in a test.
 */
export const EXISTING_VIDEO = 'existing-video';

export type LessonType = 'Video' | 'Text' | 'Audio' | 'PDF' | 'Slides' | 'Download' | 'Embedded';

export interface LessonSettings {
  prerequisite?: boolean;
  freePreview?: boolean;
  discussions?: boolean; // on by default
  allowDownload?: boolean;
  motivationalPopup?: boolean;
}

export interface LessonSpec {
  type: LessonType;
  name: string;
  /** Rich-text body: "Content" for Text lessons, "Description" for all others. */
  body: string;
  /** Fixture uploaded through the media gallery (Video/Audio/PDF/Slides/Download). */
  media?: string;
  /** Link for Embedded lessons. */
  embedUrl?: string;
  /** Handout uploaded as the "Downloadable resource". */
  resource?: string;
  settings?: LessonSettings;
  published?: boolean;
}

// Order of the five switches on the lesson form.
const SWITCH_INDEX: Record<keyof LessonSettings, number> = {
  prerequisite: 0,
  freePreview: 1,
  discussions: 2,
  allowDownload: 3,
  motivationalPopup: 4,
};

export class CourseBuilder {
  constructor(private readonly page: Page) {}

  // ---------- gallery ----------

  get gallery(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: 'Upload From Gallery' });
  }

  /**
   * Click `trigger` (opens the gallery), then either upload `source` into it, or - for
   * `EXISTING_VIDEO` - pick a video that is already in the gallery, and confirm with Select.
   */
  async uploadViaGallery(trigger: Locator, source: string) {
    await trigger.click();
    await expect(this.gallery).toBeVisible();
    const select = this.gallery.getByRole('button', { name: 'Select', exact: true });
    const cards = this.gallery.locator('[aria-describedby="gallery-item-card"]');
    // Cards still being transcoded ("Processing...") cannot be selected.
    const readyCards = cards.filter({ hasNotText: 'Processing...' });

    if (source === EXISTING_VIDEO) {
      await expect(readyCards.first()).toBeVisible({ timeout: 30_000 });
      await readyCards.first().click();
    } else {
      // The shared gallery keeps same-named copies from earlier runs, so key off the upload request.
      const registered = this.page.waitForResponse((r) => r.url().includes('/gallery/uploads/register') && r.ok(), {
        timeout: 120_000,
      });
      await this.gallery.locator('input[type=file]').setInputFiles(source);
      await registered;
      // The new upload is auto-selected a moment after it registers. Give it a few seconds, then fall
      // back to ticking a card with the same file name (never "the first card": it may be an old file).
      const sameName = readyCards.filter({ hasText: path.basename(source) }).first();
      await expect(select).toBeEnabled({ timeout: 5_000 }).catch(async () => {
        await expect(sameName).toBeVisible({ timeout: 30_000 });
        await sameName.click();
      });
    }
    await expect(select).toBeEnabled();
    await select.click();
    await expect(this.gallery).toBeHidden();
  }

  // ---------- course ----------

  courseCard(title: string): Locator {
    return this.page
      .locator('h4')
      .filter({ hasText: new RegExp(`^${title}$`) })
      .locator('xpath=ancestor::div[count(.//h4)=1][last()]');
  }

  /** Delete every course titled exactly `title` from the /courses list. Returns whether any was deleted. */
  async deleteCourseIfExists(title: string): Promise<boolean> {
    let deleted = false;
    while ((await this.courseCard(title).count()) > 0) {
      await this.deleteFirstCourse(title);
      deleted = true;
    }
    return deleted;
  }

  private async deleteFirstCourse(title: string) {
    const cards = this.courseCard(title);
    const before = await cards.count();
    await cards.first().getByRole('button', { name: 'Course actions' }).click();
    await this.page.getByRole('menuitem', { name: 'Delete course' }).click();
    const dialog = this.page.getByRole('dialog').filter({ hasText: 'Delete course?' });
    await expect(dialog).toContainText(`"${title}"`);
    await dialog.getByRole('textbox').fill('DELETE');
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(dialog).toBeHidden({ timeout: 30_000 });
    await expect(cards).toHaveCount(before - 1, { timeout: 30_000 });
  }

  async createCourse(opts: { name: string; description: string; thumbnail: string; draft?: boolean }) {
    await this.page.getByRole('button', { name: 'Create Course' }).click();
    const dialog = this.page.getByRole('dialog').filter({ hasText: "Let's set up your course channel" });
    await dialog.locator('#name').fill(opts.name);
    await dialog.locator('#shortDescription').fill(opts.description);
    await this.uploadViaGallery(dialog.getByRole('button', { name: /Select Image/ }), opts.thumbnail);
    await this.page.getByRole('dialog').filter({ hasText: 'Crop thumbnail' }).getByRole('button', { name: 'Apply' }).click();
    await expect(dialog.getByText('Replace')).toBeVisible({ timeout: 60_000 });
    if (opts.draft ?? true) await dialog.getByRole('button', { name: /^Draft/ }).click();
    await dialog.getByRole('button', { name: 'Create Course' }).click();
  }

  /** The Draft/Published switch in the page header (the left rail has a status badge with the same name). */
  private get publishToggle(): Locator {
    return this.page.locator('button:text-is("Published")');
  }

  // ---------- chapter ----------

  async createChapter(slug: string, name: string, published = true): Promise<string> {
    await this.page.goto(`/courses/${slug}/edit/chapter/create`, { waitUntil: 'domcontentloaded' });
    await this.page.locator('#name').fill(name);
    if (published) await this.publishToggle.click();
    await this.page.getByRole('button', { name: 'Create', exact: true }).click();
    // The app lands on the new chapter's "create lesson" form.
    await expect(this.page).toHaveURL(/\/edit\/chapter\/(\d+)\/lesson\/create$/, { timeout: 30_000 });
    return /chapter\/(\d+)\//.exec(this.page.url())![1];
  }

  // ---------- lesson ----------

  async openNewLessonForm(slug: string, chapterId: string) {
    await this.page.goto(`/courses/${slug}/edit/chapter/${chapterId}/lesson/create`, { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByText('LESSON TYPE', { exact: false }).first()).toBeVisible({ timeout: 45_000 });
  }

  private async setSwitch(key: keyof LessonSettings, on: boolean) {
    const sw = this.page.getByRole('switch').nth(SWITCH_INDEX[key]);
    if ((await sw.getAttribute('aria-checked')) !== String(on)) await sw.click();
    await expect(sw).toHaveAttribute('aria-checked', String(on));
  }

  async fillLesson(spec: LessonSpec) {
    const page = this.page;
    await page.locator('#name').fill(spec.name);
    await page.getByRole('button', { name: spec.type, exact: true }).click();

    if (spec.type === 'Embedded') {
      await page.locator('#url').fill(spec.embedUrl!);
    } else if (spec.media) {
      await this.uploadViaGallery(page.getByText('Browse files', { exact: true }).first(), spec.media);
    }

    const editor = page.locator('.tiptap.ProseMirror').first();
    await editor.click();
    await page.keyboard.type(spec.body);
    await expect(editor).toContainText(spec.body);

    for (const key of Object.keys(spec.settings ?? {}) as (keyof LessonSettings)[]) {
      await this.setSwitch(key, spec.settings![key]!);
    }

    if (spec.resource) {
      // The resource uploader is always the last "Browse files" on the form.
      await this.uploadViaGallery(page.getByText('Browse files', { exact: true }).last(), spec.resource);
    }

    if (spec.published ?? true) await this.publishToggle.click();
  }

  async saveLesson(): Promise<string> {
    await this.page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(this.page).toHaveURL(/\/edit\/chapter\/\d+\/lesson\/(\d+)$/, { timeout: 60_000 });
    return /lesson\/(\d+)$/.exec(this.page.url())![1];
  }
}
