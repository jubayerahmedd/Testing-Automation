import { sharedTest as test, expect } from '../../fixtures';
import { EXISTING_VIDEO, file, LessonSpec } from '../../pages/CourseBuilder';

// Builds a complete course from scratch: 1 chapter + one lesson of every type, using the
// lesson features (media upload, rich-text body, switches, downloadable resource).
//
// This WRITES to the live community. The course is a Draft (invisible to members/guests) and is
// always called COURSE; any leftover from a previous run is deleted first. By default the course
// is kept afterwards so you can inspect it; set CLEANUP_TEST_COURSE=1 to delete it at the end.
//
// Steps depend on each other, so they run in order in one browser window.
// Tagged @write: excluded from `npm test`; run with `npm run test:write`.

const COURSE = 'Automation Test Course';
const CHAPTER = 'Chapter 1 - All Lesson Types';

const LESSONS: LessonSpec[] = [
  {
    type: 'Video',
    name: 'Video lesson',
    body: 'Video lesson description with a downloadable handout.',
    media: EXISTING_VIDEO,
    resource: file('sample-resource.pdf'),
    settings: { freePreview: true, allowDownload: true },
  },
  {
    type: 'Text',
    name: 'Text lesson',
    body: 'Text lesson content. This lesson is a prerequisite for the next one.',
    settings: { prerequisite: true },
  },
  {
    type: 'Audio',
    name: 'Audio lesson',
    body: 'Audio lesson description with discussions turned off.',
    media: file('sample-audio.wav'),
    settings: { discussions: false },
  },
  {
    type: 'PDF',
    name: 'PDF lesson',
    body: 'PDF lesson description.',
    media: file('sample.pdf'),
    resource: file('sample-resource.pdf'),
    settings: { freePreview: true },
  },
  {
    type: 'Slides',
    name: 'Slides lesson',
    body: 'Slides lesson description.',
    media: file('sample-slides.pptx'),
  },
  {
    type: 'Download',
    name: 'Download lesson',
    body: 'Download lesson description.',
    media: file('sample-download.zip'),
  },
  {
    type: 'Embedded',
    name: 'Embedded lesson',
    body: 'Embedded lesson description.',
    embedUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  },
];

test.describe('Create a full course @write', () => {
  test.describe.configure({ mode: 'serial', timeout: 180_000 });

  // A deleted course keeps its slug reserved, so the new one gets a suffix (automation-test-course-2, ...-22e2ca69);
  // read the slug from the URL.
  let slug: string;
  let chapterId: string;

  test('S-00 remove any leftover test course', async ({ coursesPage, builder }) => {
    await coursesPage.open();
    await builder.deleteCourseIfExists(COURSE);
    await expect(builder.courseCard(COURSE)).toHaveCount(0);
  });

  test('S-01 create a draft course with a thumbnail', async ({ page, coursesPage, builder }) => {
    await coursesPage.open();
    await builder.createCourse({
      name: COURSE,
      description: 'Created by Playwright automation. Safe to delete.',
      thumbnail: file('thumbnail.png'),
    });
    await expect(page).toHaveURL(/\/courses\/automation-test-course[\w-]*\/edit$/, { timeout: 60_000 });
    slug = /courses\/([^/]+)\/edit/.exec(page.url())![1];
    await expect(page.getByText('0 ch · 0 lessons').first()).toBeVisible({ timeout: 30_000 });
  });

  test('S-02 add a chapter', async ({ page, builder }) => {
    chapterId = await builder.createChapter(slug, CHAPTER);
    await expect(page.getByText(CHAPTER).first()).toBeVisible();
    await expect(page.getByText('1 ch · 0 lessons').first()).toBeVisible();
  });

  const lessonIds: Record<string, string> = {};

  for (const lesson of LESSONS) {
    test(`S-03 add ${lesson.type} lesson`, async ({ page, builder }) => {
      await builder.openNewLessonForm(slug, chapterId);
      await builder.fillLesson(lesson);
      lessonIds[lesson.type] = await builder.saveLesson();
      await expect(page.getByText(lesson.name).first()).toBeVisible();
    });
  }

  test('S-03b saved lessons keep their name, body and settings', async ({ page, builder }) => {
    const SWITCHES = ['prerequisite', 'freePreview', 'discussions', 'allowDownload', 'motivationalPopup'] as const;
    for (const lesson of LESSONS) {
      await page.goto(`/courses/${slug}/edit/chapter/${chapterId}/lesson/${lessonIds[lesson.type]}`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(page.locator('#name'), `${lesson.type}: name`).toHaveValue(lesson.name, { timeout: 45_000 });
      await expect(page.locator('.tiptap.ProseMirror').first(), `${lesson.type}: body`).toContainText(lesson.body);
      // Switches default to off, except "Enable discussions" which defaults to on.
      for (const [i, key] of SWITCHES.entries()) {
        const expected = lesson.settings?.[key] ?? key === 'discussions';
        await expect(page.getByRole('switch').nth(i), `${lesson.type}: ${key}`).toHaveAttribute('aria-checked', String(expected));
      }
    }
  });

  test('S-04 curriculum has 1 chapter and 7 lessons', async ({ page }) => {
    await page.goto(`/courses/${slug}/edit`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('1 ch · 7 lessons').first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('1 published').first()).toBeVisible(); // chapters
    // The chapter page lists every lesson with its status.
    await page.goto(`/courses/${slug}/edit/chapter/${chapterId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#name')).toHaveValue(CHAPTER, { timeout: 45_000 });
    for (const lesson of LESSONS) {
      await expect(page.getByText(lesson.name, { exact: true }).first()).toBeVisible();
    }
  });

  test('S-05 admin preview lists every lesson in the player', async ({ page }) => {
    await page.goto(`/courses/${slug}/watch`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Course content' })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('0 of 7 lessons complete')).toBeVisible();
    for (const lesson of LESSONS) {
      await expect(page.getByText(lesson.name, { exact: true }).first()).toBeVisible();
    }
  });

  test('S-06 course is listed as a Draft', async ({ coursesPage, builder }) => {
    await coursesPage.open();
    await expect(builder.courseCard(COURSE)).toContainText('Draft');
  });

  test('S-07 clean up the test course (only when CLEANUP_TEST_COURSE=1)', async ({ coursesPage, builder }) => {
    test.skip(!process.env.CLEANUP_TEST_COURSE, 'Keeping the course for inspection; set CLEANUP_TEST_COURSE=1 to delete it.');
    await coursesPage.open();
    expect(await builder.deleteCourseIfExists(COURSE)).toBe(true);
  });
});
