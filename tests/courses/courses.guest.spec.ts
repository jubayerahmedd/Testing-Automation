import { test, expect } from '../../fixtures';

// Stable fixtures in the community's data (see docs/courses-exploration.md).
const PHYSICS = { title: 'Physics for All', slug: 'physics-for-all' };
const PRIVATE_COURSE = 'DEDDD';
const DRAFT_COURSE = 'New Course';

test.describe('Courses list (guest)', () => {
  test.beforeEach(async ({ coursesPage }) => {
    await coursesPage.open();
  });

  test('C-01 page loads with heading and title @smoke', async ({ page, coursesPage }) => {
    await expect(page).toHaveTitle(/^Courses \| /);
    await expect(coursesPage.heading).toBeVisible();
    await expect(page.getByText('Learn, grow, and master new skills')).toBeVisible();
  });

  test('C-02 cards show title, price and call to action @smoke', async ({ coursesPage }) => {
    expect(await coursesPage.titles.count()).toBeGreaterThan(0);
    const card = coursesPage.card(PHYSICS.title);
    await expect(card).toContainText(/USD 10/);
    await expect(card).toContainText('Lifetime');
    await expect(card.getByRole('button', { name: 'Enroll Now' })).toBeVisible();
  });

  test('C-03 draft course and admin controls are hidden', async ({ coursesPage }) => {
    await expect(coursesPage.card(DRAFT_COURSE)).toHaveCount(0);
    await expect(coursesPage.createButton).toHaveCount(0);
    await expect(coursesPage.editButtons).toHaveCount(0);
  });

  test('C-04 search filters to matching course', async ({ coursesPage }) => {
    await coursesPage.search.fill('physics');
    await expect.poll(() => coursesPage.courseTitles()).toEqual([PHYSICS.title]);
  });

  test('C-05 search with no match shows empty state', async ({ page, coursesPage }) => {
    await coursesPage.search.fill('zzzqqq');
    await expect(coursesPage.emptyState).toBeVisible();
    await expect(page.getByText('Try a different search term.')).toBeVisible();
    await expect(coursesPage.titles).toHaveCount(0);
  });

  test('C-06 clearing search restores the full list', async ({ coursesPage }) => {
    const all = await coursesPage.courseTitles();
    await coursesPage.search.fill('physics');
    await expect.poll(() => coursesPage.courseTitles()).toEqual([PHYSICS.title]);
    await coursesPage.search.fill('');
    await expect.poll(() => coursesPage.courseTitles()).toEqual(all);
  });

  test('C-07 Oldest sort reverses Newest order', async ({ coursesPage }) => {
    const newest = await coursesPage.courseTitles();
    expect(newest.length).toBeGreaterThan(1);
    await coursesPage.selectSort('Oldest');
    await expect.poll(() => coursesPage.courseTitles()).toEqual([...newest].reverse());
    await coursesPage.selectSort('Newest');
    await expect.poll(() => coursesPage.courseTitles()).toEqual(newest);
  });

  test('C-08 grid/list toggle keeps the same courses', async ({ coursesPage }) => {
    const before = await coursesPage.courseTitles();
    await expect(coursesPage.viewTabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await coursesPage.viewTabs.nth(1).click();
    await expect(coursesPage.viewTabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => coursesPage.courseTitles()).toEqual(before);
    await coursesPage.viewTabs.nth(0).click();
    await expect(coursesPage.viewTabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => coursesPage.courseTitles()).toEqual(before);
  });

  test('C-09 private course shows disabled Invite only', async ({ coursesPage }) => {
    const card = coursesPage.card(PRIVATE_COURSE);
    await expect(card).toContainText('Private');
    await expect(card.getByRole('button', { name: 'Invite only' })).toBeDisabled();
  });

  test('C-10 clicking a card opens the course page @smoke', async ({ page, coursesPage, courseDetailPage }) => {
    await coursesPage.openCourse(PHYSICS.slug);
    await expect(page).toHaveURL(new RegExp(`/courses/${PHYSICS.slug}$`));
    await courseDetailPage.waitLoaded(PHYSICS.title);
    await expect(page).toHaveTitle(PHYSICS.title);
  });
});

test.describe('Course detail (guest)', () => {
  test('C-11 shows about, curriculum and expandable lessons', async ({ courseDetailPage, page }) => {
    await courseDetailPage.open(PHYSICS.slug);
    await courseDetailPage.waitLoaded(PHYSICS.title);
    await expect(courseDetailPage.about).toBeVisible();
    await expect(courseDetailPage.curriculum).toBeVisible();
    await expect(page.getByText('2 chapters · 4 lessons')).toBeVisible();
    await expect(page.getByText('1.1: What is Physics?')).toBeVisible();

    await courseDetailPage.expandAll.click();
    await expect(page.getByText(/2\.1: Newton/)).toBeVisible();
  });

  test('C-12 shows price and Get Access', async ({ courseDetailPage, page }) => {
    await courseDetailPage.open(PHYSICS.slug);
    await courseDetailPage.waitLoaded(PHYSICS.title);
    await expect(page.getByText('USD 10', { exact: true })).toBeVisible();
    await expect(page.getByText('/ Lifetime')).toBeVisible();
    await expect(courseDetailPage.getAccess).toBeVisible();
  });

  test('C-13 unknown slug shows not-found and links back', async ({ page, courseDetailPage }) => {
    await courseDetailPage.open('does-not-exist');
    await expect(courseDetailPage.notFound).toBeVisible({ timeout: 45_000 });
    await page.getByRole('link', { name: 'Back to Courses' }).or(page.getByRole('button', { name: 'Back to Courses' })).click();
    await expect(page).toHaveURL(/\/courses$/);
  });
});
