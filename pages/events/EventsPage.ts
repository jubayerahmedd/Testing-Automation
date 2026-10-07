import { Page, Locator, expect } from '@playwright/test';

export type EventsView = 'calendar' | 'list';
export type TimeFilter = 'Upcoming' | 'Past' | 'All';

/** Every event created by automation starts with this, so leftovers can be found and removed. */
export const EVENT_PREFIX = 'PW Auto Event';

export class EventsPage {
  readonly heading: Locator;
  readonly newEventButton: Locator;
  readonly calendarTab: Locator;
  readonly listTab: Locator;
  readonly allEventsFilter: Locator;
  readonly hostingFilter: Locator;
  readonly manageTagsButton: Locator;
  readonly eventLinks: Locator;
  readonly tagsDialog: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Events', exact: true });
    this.newEventButton = page.getByRole('button', { name: 'New Event' });
    this.calendarTab = page.getByRole('tab', { name: 'Calendar' });
    this.listTab = page.getByRole('tab', { name: 'List' });
    this.allEventsFilter = page.getByRole('button', { name: 'All events' });
    this.hostingFilter = page.getByRole('button', { name: 'Hosting', exact: true });
    this.manageTagsButton = page.getByRole('button', { name: 'Manage tags' });
    this.eventLinks = page.locator('a[href^="/events/"]');
    this.tagsDialog = page.getByRole('dialog').filter({ hasText: 'Manage tags' });
  }

  async open(view: EventsView = 'list') {
    await this.page.goto(view === 'list' ? '/events?view=list' : '/events', { waitUntil: 'domcontentloaded' });
    // The page is rendered client-side and occasionally never hydrates on first load; reload and retry.
    let attempt = 0;
    await expect(async () => {
      if (attempt++ > 0) await this.page.reload({ waitUntil: 'domcontentloaded' });
      await expect(this.newEventButton).toBeVisible({ timeout: 15_000 });
    }).toPass({ timeout: 60_000 });
  }

  // ---------- calendar view ----------

  /** The "October 2,026" caption above the grid. */
  monthCaption(monthName: string): Locator {
    return this.page.getByText(new RegExp(`^${monthName}`)).first();
  }
  get previousMonth(): Locator { return this.page.getByRole('button', { name: 'Previous month' }); }
  get nextMonth(): Locator { return this.page.getByRole('button', { name: 'Next month' }); }
  get todayButton(): Locator { return this.page.getByRole('button', { name: 'Today' }); }
  get createOnDayButtons(): Locator { return this.page.getByRole('button', { name: 'Create event on this day' }); }

  /** An event chip in the calendar grid. */
  calendarChip(name: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(escape(name)) });
  }

  // ---------- list view ----------

  filter(name: TimeFilter): Locator {
    const all = this.page.getByRole('button', { name, exact: true });
    // The tag filter row also has an "All" chip; the time filter comes after it.
    return name === 'All' ? all.last() : all;
  }

  async selectTimeFilter(name: TimeFilter) {
    await this.filter(name).click();
  }

  /** The list-view row (a link) for an event, by title. */
  row(name: string): Locator {
    return this.eventLinks.filter({ hasText: name });
  }

  async rowTitles(): Promise<string[]> {
    const texts = await this.eventLinks.allInnerTexts();
    return texts.map((t) => t.trim());
  }

  async openEvent(name: string) {
    await this.row(name).first().click();
    await expect(this.page.getByRole('heading', { name })).toBeVisible({ timeout: 30_000 });
  }

  // ---------- tags ----------

  async openManageTags() {
    await this.manageTagsButton.click();
    await expect(this.tagsDialog).toBeVisible();
  }
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
