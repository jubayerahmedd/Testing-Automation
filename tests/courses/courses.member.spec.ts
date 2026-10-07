import { sharedTest as test, expect } from '../../fixtures';

// One shared browser window for the whole file; tests run in order.
test.describe.configure({ mode: 'default' });

// See docs/courses-users.md. Read-only: never clicks Enroll / Get Access / Complete.
// The member (MEMBER_EMAIL) is enrolled in ENROLLED only.
const ENROLLED = { title: 'DISCUSSION COURSE', slug: 'discussion-course' };
const NOT_ENROLLED = { title: 'Paid Course', slug: 'paid-course' };
const PRIVATE_COURSE = { title: 'DEDDD', slug: 'deddd' };
const DRAFT = { title: 'New Course', slug: 'new-course' };

test.describe('Courses (member)', () => {
  test('M-01 list has no admin controls and no login button @smoke', async ({ page, coursesPage }) => {
    await coursesPage.open();
    await expect(coursesPage.createButton).toHaveCount(0);
    await expect(coursesPage.editButtons).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Log in' })).toHaveCount(0);
  });

  test('M-02 draft course is not listed', async ({ coursesPage }) => {
    await coursesPage.open();
    await expect(coursesPage.card(DRAFT.title)).toHaveCount(0);
  });

  test('M-03 enrolled course offers Watch Course, others Enroll Now @smoke', async ({ coursesPage }) => {
    await coursesPage.open();
    await expect(coursesPage.card(ENROLLED.title).getByRole('link', { name: 'Watch Course' })).toBeVisible();
    await expect(coursesPage.card(NOT_ENROLLED.title).getByRole('button', { name: 'Enroll Now' })).toBeVisible();
  });

  test('M-04 private course shows disabled Invite only', async ({ coursesPage }) => {
    await coursesPage.open();
    const card = coursesPage.card(PRIVATE_COURSE.title);
    await expect(card).toContainText('Private');
    await expect(card.getByRole('button', { name: 'Invite only' })).toBeDisabled();
  });

  test('M-05 Enrolled tab lists only enrolled courses', async ({ page, coursesPage }) => {
    await coursesPage.open();
    await page.getByText('Enrolled', { exact: true }).click();
    await expect.poll(() => coursesPage.courseTitles()).toEqual([ENROLLED.title]);
    await page.getByText('All Courses', { exact: true }).click();
    await expect.poll(async () => (await coursesPage.courseTitles()).length).toBeGreaterThan(1);
  });

  test('M-06 search and sort work for the member', async ({ coursesPage }) => {
    await coursesPage.open();
    const all = await coursesPage.courseTitles();
    await coursesPage.search.fill('physics');
    await expect.poll(() => coursesPage.courseTitles()).toEqual(['Physics for All']);
    await coursesPage.search.fill('');
    await expect.poll(() => coursesPage.courseTitles()).toEqual(all);
    await coursesPage.selectSort('Oldest');
    await expect.poll(() => coursesPage.courseTitles()).toEqual([...all].reverse());
  });

  test('M-07 Watch Course opens the lesson player @smoke', async ({ page, coursesPage }) => {
    await coursesPage.open();
    await coursesPage.card(ENROLLED.title).getByRole('link', { name: 'Watch Course' }).click();
    await expect(page).toHaveURL(new RegExp(`/courses/${ENROLLED.slug}/watch/\\d+$`));
    await expect(page.getByText('TEXT LESSON', { exact: false }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Lesson \d+ of \d+/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Complete', exact: true })).toBeVisible();
    await expect(page.getByText('Course content')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Comment' })).toBeVisible();
  });

  test('M-08 not-enrolled course page offers Get Access', async ({ courseDetailPage }) => {
    await courseDetailPage.open(NOT_ENROLLED.slug);
    await courseDetailPage.waitLoaded(NOT_ENROLLED.title);
    await expect(courseDetailPage.getAccess).toBeVisible();
  });

  test('M-09 private course page says invitation required', async ({ page, courseDetailPage }) => {
    await courseDetailPage.open(PRIVATE_COURSE.slug);
    await courseDetailPage.waitLoaded(PRIVATE_COURSE.title);
    await expect(page.getByRole('button', { name: 'Invitation required' })).toBeVisible();
    await expect(courseDetailPage.getAccess).toHaveCount(0);
  });

  test('M-10 lessons of a not-enrolled course are locked', async ({ page }) => {
    await page.goto(`/courses/${NOT_ENROLLED.slug}/watch`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText("You don't have access to this lesson")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('Enroll in this course to unlock this lesson.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'View Course' }).or(page.getByRole('link', { name: 'View Course' }))).toBeVisible();
  });

  test('M-11 editor URL is not accessible to a member', async ({ page }) => {
    await page.goto(`/courses/${NOT_ENROLLED.slug}/edit`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(`/courses/${NOT_ENROLLED.slug}$`), { timeout: 45_000 });
    await expect(page.getByRole('link', { name: 'Settings' })).toHaveCount(0);
  });

  test('M-12 draft course URL shows Course Not Found', async ({ courseDetailPage }) => {
    await courseDetailPage.open(DRAFT.slug);
    await expect(courseDetailPage.notFound).toBeVisible({ timeout: 45_000 });
  });
});
