import { sharedTest as test, expect } from '../../fixtures';
import { EDITOR_TABS, SETTINGS_SECTIONS } from '../../pages/CourseEditorPage';

// One shared browser window for the whole file; tests run in order.
test.describe.configure({ mode: 'default' });

// See docs/courses-editor.md. Read-only: no Save / Delete / Enroll / Add buttons are confirmed.
test.describe('Course editor (admin)', () => {
  test('E-01 header navigation reaches every tab @smoke', async ({ page, courseEditor }) => {
    await courseEditor.open();
    for (const tab of EDITOR_TABS.slice(1)) {
      await courseEditor.navLink(tab.name).click();
      await expect(page).toHaveURL(new RegExp(`${courseEditor.base}${tab.suffix}$`));
    }
  });

  test('E-02 curriculum shows stats and chapter list', async ({ page, courseEditor }) => {
    await courseEditor.open();
    await expect(page.getByText('Select a lesson to start editing')).toBeVisible();
    await expect(page.getByText('Chapters', { exact: true })).toBeVisible();
    await expect(page.getByText('Lessons', { exact: true })).toBeVisible();
    await expect(page.getByText('Enrolled', { exact: true })).toBeVisible();
    await expect(courseEditor.chapterLink()).toBeVisible();
    await expect(page.getByRole('link', { name: 'New chapter' })).toBeVisible();
  });

  test('E-03 drip shows release types', async ({ page, courseEditor }) => {
    await courseEditor.open('/drip');
    for (const type of ['Immediately', 'Enrollment based', 'Specific dates']) {
      await expect(page.getByText(type, { exact: true })).toBeVisible();
    }
    await expect(page.getByRole('button', { name: 'Save schedule' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Discard' })).toBeVisible();
  });

  test('E-04 staff lists instructor and Add dialog opens and closes', async ({ page, courseEditor }) => {
    await courseEditor.open('/staff');
    await expect(page.getByText('Instructor', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('jubayer@appifylab.com')).toBeVisible();
    await page.getByRole('button', { name: 'Add staff member' }).click();
    await expect(courseEditor.dialog.getByText('Add Staff Member')).toBeVisible();
    await expect(courseEditor.dialog.getByText('Search Member')).toBeVisible();
    await courseEditor.dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(courseEditor.dialog).toBeHidden();
  });

  test('E-05 enrollments lists students and Enroll dialog opens and closes', async ({ page, courseEditor }) => {
    await courseEditor.open('/enrollments');
    await expect(page.getByText(/\d+ students? enrolled/)).toBeVisible();
    await expect(page.getByPlaceholder('Search students')).toBeVisible();
    await page.getByRole('button', { name: 'Enroll student' }).click();
    await expect(courseEditor.dialog.getByText('Add a student')).toBeVisible();
    await courseEditor.dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(courseEditor.dialog).toBeHidden();
  });

  test('E-06 general settings fields are populated', async ({ page, courseEditor }) => {
    await courseEditor.open('/setting');
    await expect(page.locator('#name')).toHaveValue('Paid Course');
    await expect(page.locator('#slug')).toHaveValue('paid-course');
    await expect(page.locator('#level')).toBeVisible();
    await expect(page.locator('#shortDescription')).toBeVisible();
  });

  for (const section of SETTINGS_SECTIONS) {
    test(`E-07 settings › ${section.name} loads`, async ({ page, courseEditor }) => {
      await courseEditor.open(`/setting${section.suffix}`);
      await expect(page.getByText(section.marker).first()).toBeVisible();
    });
  }

  test('E-08 pricing shows existing prices', async ({ page, courseEditor }) => {
    await courseEditor.open('/setting/pricing');
    await expect(page.getByText('/ Lifetime').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add New Price' })).toBeVisible();
  });

  test('E-09 chapter editor loads with danger zone', async ({ page, courseEditor }) => {
    await courseEditor.open();
    await courseEditor.chapterLink().click();
    await expect(page).toHaveURL(/\/edit\/chapter\/\d+$/);
    await expect(page.locator('#name')).not.toHaveValue('');
    await expect(page.getByText('Danger Zone')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete Chapter' })).toBeVisible();
  });

  test('E-10 preview opens the learner player', async ({ page, courseEditor }) => {
    await courseEditor.open();
    // Preview may open in a new tab; handle both.
    const popup = page.context().waitForEvent('page', { timeout: 5_000 }).catch(() => null);
    await page.getByText('Preview', { exact: true }).filter({ visible: true }).first().click();
    const player = (await popup) ?? page;
    await expect(player).toHaveURL(/\/courses\/paid-course\/watch\/\d+$/);
    await expect(player.getByRole('link', { name: 'Back to course' })).toBeVisible();
    await expect(player.getByText(/Lesson \d+ of \d+/)).toBeVisible();
    await expect(player.getByText('Course content')).toBeVisible();
  });
});
