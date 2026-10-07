import { test as base, Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { NavBar } from '../pages/NavBar';
import { CoursesPage } from '../pages/CoursesPage';
import { CourseDetailPage } from '../pages/CourseDetailPage';
import { CourseEditorPage } from '../pages/CourseEditorPage';
import { CourseBuilder } from '../pages/CourseBuilder';

type Fixtures = {
  loginPage: LoginPage;
  navBar: NavBar;
  coursesPage: CoursesPage;
  courseDetailPage: CourseDetailPage;
  courseEditor: CourseEditorPage;
  builder: CourseBuilder;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  navBar: async ({ page }, use) => use(new NavBar(page)),
  coursesPage: async ({ page }, use) => use(new CoursesPage(page)),
  courseDetailPage: async ({ page }, use) => use(new CourseDetailPage(page)),
  courseEditor: async ({ page }, use) => use(new CourseEditorPage(page)),
  builder: async ({ page }, use) => use(new CourseBuilder(page)),
});
export { expect } from '@playwright/test';

/**
 * Same as `test`, but every test in a worker reuses ONE browser window/page instead of
 * getting a fresh context each time. Use with `--workers=1` to see a single window run
 * everything. Tests must navigate first (page objects' open()) and not rely on clean state.
 */
export const sharedTest = test.extend<{}, { sharedPage: Page }>({
  sharedPage: [
    async ({ browser }, use, workerInfo) => {
      const { storageState, baseURL, viewport, userAgent } = workerInfo.project.use;
      const context = await browser.newContext({ storageState, baseURL, viewport, userAgent });
      const page = await context.newPage();
      await use(page);
      await context.close();
    },
    { scope: 'worker' },
  ],
  page: async ({ sharedPage }, use) => {
    await use(sharedPage);
  },
});
