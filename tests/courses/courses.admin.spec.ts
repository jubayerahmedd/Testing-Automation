import { sharedTest as test, expect } from '../../fixtures';

// One shared browser window for the whole file; tests run in order.
test.describe.configure({ mode: 'default' });

// See docs/courses-admin.md. Read-only: nothing here creates or changes a course.
const DRAFT = { title: 'New Course', slug: 'new-course' };
const PUBLISHED = { title: 'Paid Course', slug: 'paid-course' };

test.describe('Courses (admin)', () => {
  test.beforeEach(async ({ coursesPage }) => {
    await coursesPage.open();
  });

  test('A-01 shows admin controls @smoke', async ({ coursesPage }) => {
    await expect(coursesPage.createButton).toBeVisible();
    await expect(coursesPage.editButtons.first()).toBeVisible();
  });

  test('A-02 draft and published badges are shown', async ({ coursesPage }) => {
    await expect(coursesPage.card(DRAFT.title)).toContainText('Draft');
    await expect(coursesPage.card(PUBLISHED.title)).toContainText('Published');
  });

  test('A-03 Create Course modal shows all fields', async ({ page, coursesPage }) => {
    await coursesPage.createButton.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText("Let's set up your course channel")).toBeVisible();
    await expect(dialog.locator('#name')).toBeVisible();
    await expect(dialog.locator('#shortDescription')).toBeVisible();
    for (const option of ['Public', 'Private', 'Secret', 'Publish', 'Draft']) {
      await expect(dialog.getByRole('button', { name: new RegExp(`^${option}`) })).toBeVisible();
    }
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Create Course' })).toBeVisible();
  });

  test('A-04 empty submit shows validation and keeps modal open', async ({ page, coursesPage }) => {
    await coursesPage.createButton.click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Create Course' }).click();
    await expect(dialog.getByText('Please enter a course title')).toBeVisible();
    await expect(dialog.getByText('Please use .jpg or .png image', { exact: true }).last()).toBeVisible();
    await expect(dialog).toBeVisible();
  });

  test('A-05 Cancel closes the modal without creating a course', async ({ page, coursesPage }) => {
    const before = await coursesPage.courseTitles();
    await coursesPage.createButton.click();
    await page.getByRole('dialog').locator('#name').fill('Should not be created');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    expect(await coursesPage.courseTitles()).toEqual(before);
  });

  test('A-06 Edit Course opens the editor for that course @smoke', async ({ page, coursesPage }) => {
    await coursesPage.card(PUBLISHED.title).getByRole('button', { name: 'Edit Course' }).click();
    await expect(page).toHaveURL(new RegExp(`/courses/${PUBLISHED.slug}/edit$`));
  });

  test('A-07 draft course page shows the draft-preview banner', async ({ page, courseDetailPage }) => {
    await courseDetailPage.open(DRAFT.slug);
    await courseDetailPage.waitLoaded(DRAFT.title);
    await expect(page.getByText('Draft preview — only course managers can see this page')).toBeVisible();
  });

  test('A-08 admin cannot purchase own course', async ({ page, courseDetailPage }) => {
    await courseDetailPage.open(PUBLISHED.slug);
    await courseDetailPage.waitLoaded(PUBLISHED.title);
    await expect(page.getByText('Log in as a member to purchase this course.')).toBeVisible();
    await expect(courseDetailPage.getAccess).toHaveCount(0);
  });

  test('A-09 search and sort work for the admin list', async ({ coursesPage }) => {
    const all = await coursesPage.courseTitles();
    expect(all).toContain(DRAFT.title);
    await coursesPage.search.fill('physics');
    await expect.poll(() => coursesPage.courseTitles()).toEqual(['Physics for All']);
    await coursesPage.search.fill('');
    await expect.poll(() => coursesPage.courseTitles()).toEqual(all);
    await coursesPage.selectSort('Oldest');
    await expect.poll(() => coursesPage.courseTitles()).toEqual([...all].reverse());
  });
});
