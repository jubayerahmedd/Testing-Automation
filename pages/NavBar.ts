import { Page } from '@playwright/test';

export const NAV_ITEMS = [
  { name: 'Home', path: '/feeds' },
  { name: 'Events', path: '/events' },
  { name: 'Courses', path: '/courses' },
  { name: 'Blogs', path: '/blogs' },
  { name: 'Leaderboard', path: '/leaderboard' },
  { name: 'Certificates', path: '/certificates' },
] as const;

export class NavBar {
  constructor(private readonly page: Page) {}
  link(name: string) { return this.page.getByRole('link', { name, exact: true }); }
}
