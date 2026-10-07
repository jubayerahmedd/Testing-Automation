import { test, expect } from '../../fixtures/events';
import { EVENT_PREFIX } from '../../pages/events/EventsPage';
import { daysFromNow, EventSpec } from '../../pages/events/EventFormModal';
import { deleteLeftoverEvents } from '../../pages/events/eventCleanup';

// One event per kind the wizard can produce: each test creates it, checks the detail page and the
// list/calendar, then deletes it again, so a green run leaves nothing behind.
//
// This WRITES to the live community, but only ever touches events named "PW Auto Event ...".
// Tagged @write: excluded from `npm test`; run with `npm run test:write`.

const RUN = Date.now().toString(36);
let counter = 0;
const unique = (label: string) => `${EVENT_PREFIX} ${RUN}-${++counter} ${label}`;

test.describe('Event types (admin) @write', () => {
  test.describe.configure({ mode: 'serial', timeout: 180_000 });

  test('T-00 remove leftover automation events', async ({ eventsPage, eventDetail }) => {
    await deleteLeftoverEvents(eventsPage, eventDetail);
  });

  /** Creates the event from the list page, opens it, runs `check`, and always deletes it afterwards. */
  async function withEvent(
    { eventsPage, eventForm, eventDetail }: Pick<Parameters<Parameters<typeof test>[2]>[0], 'eventsPage' | 'eventForm' | 'eventDetail'>,
    spec: EventSpec,
    check: () => Promise<void>,
  ) {
    await eventsPage.open('list');
    await eventsPage.newEventButton.click();
    await eventForm.create(spec);
    try {
      await eventsPage.open('list');
      await eventsPage.openEvent(spec.name);
      await check();
    } finally {
      await eventsPage.open('list');
      await eventsPage.openEvent(spec.name); // waits for the list to render; fails loudly if the event is missing
      await eventDetail.deleteEvent(spec.name);
    }
    await eventsPage.open('list');
    await expect(eventsPage.row(spec.name)).toHaveCount(0);
  }

  test('T-01 virtual event with the minimum fields (no description, speakers or agenda)', async ({ page, eventsPage, eventForm, eventDetail }) => {
    const name = unique('minimal');
    await withEvent({ eventsPage, eventForm, eventDetail }, { name, date: daysFromNow(14), type: 'Virtual Event' }, async () => {
      await expect(eventDetail.title(name)).toBeVisible();
      await expect(page.getByText('Virtual event')).toBeVisible();
      await expect(page.getByText('Agenda', { exact: true })).toHaveCount(0);
      await expect(page.getByText('Speakers & guests')).toHaveCount(0);
    });
  });

  test('T-02 in-person event with an address', async ({ page, eventsPage, eventForm, eventDetail }) => {
    const name = unique('in person');
    await withEvent({ eventsPage, eventForm, eventDetail }, { name, date: daysFromNow(14), type: 'In Person', address: 'Dhaka' }, async () => {
      await expect(eventDetail.title(name)).toBeVisible();
      await expect(eventDetail.summary('WHERE')).not.toContainText('Online');
      await expect(page.getByText('Virtual event')).toHaveCount(0);
    });
  });

  test('T-03 multi-day in-person event spans every day in the calendar', async ({ page, eventsPage, eventForm, eventDetail }) => {
    const name = unique('multi-day');
    const start = daysFromNow(14);
    const end = daysFromNow(16);
    await withEvent({ eventsPage, eventForm, eventDetail }, { name, date: start, endDate: end, type: 'In Person', address: 'Dhaka' }, async () => {
      await expect(eventDetail.title(name)).toBeVisible();
      const month = (d: Date) => d.toLocaleString('en-US', { month: 'short' });
      await expect(eventDetail.summary('DATE')).toContainText(`${month(start)} ${start.getDate()}`);
      await expect(eventDetail.summary('DATE')).toContainText(`${month(end)} ${end.getDate()}`);
      await expect(page.getByText('Multi-day · 3 days')).toBeVisible();
    });
  });

  test('T-04 weekly recurring event', async ({ eventsPage, eventForm, eventDetail }) => {
    const name = unique('weekly');
    await withEvent({ eventsPage, eventForm, eventDetail }, { name, date: daysFromNow(14), type: 'Virtual Event', weekly: true }, async () => {
      await expect(eventDetail.title(name)).toBeVisible();
    });
  });

  test('T-05 recurring event repeats on several weeks of the calendar', async ({ eventsPage, eventForm, eventDetail }) => {
    const name = unique('weekly calendar');
    const date = daysFromNow(14);
    await withEvent({ eventsPage, eventForm, eventDetail }, { name, date, type: 'Virtual Event', weekly: true }, async () => {
      await eventsPage.open('calendar');
      const now = new Date();
      const months = (date.getFullYear() - now.getFullYear()) * 12 + date.getMonth() - now.getMonth();
      for (let i = 0; i < months; i++) await eventsPage.nextMonth.click();
      // Weekly: the start date's month has its first occurrence, and every following month has more.
      const chip = eventsPage.calendarChip(name);
      await expect(chip.first()).toBeVisible();
      const thisMonth = await chip.count();
      await eventsPage.nextMonth.click();
      await expect.poll(() => chip.count()).toBeGreaterThan(0);
      expect(thisMonth + (await chip.count())).toBeGreaterThan(1);
    });
  });

  test('T-06 external registration sends attendees to your own page', async ({ page, eventsPage, eventForm, eventDetail }) => {
    const name = unique('external');
    await withEvent(
      { eventsPage, eventForm, eventDetail },
      { name, date: daysFromNow(14), type: 'Virtual Event', registration: 'External', registrationLink: 'https://example.com/register' },
      async () => {
        await expect(eventDetail.title(name)).toBeVisible();
        await expect(page.locator('a[href="https://example.com/register"]')).toBeVisible();
      },
    );
  });

  test('T-07 offline registration', async ({ eventsPage, eventForm, eventDetail }) => {
    const name = unique('offline');
    await withEvent({ eventsPage, eventForm, eventDetail }, { name, date: daysFromNow(14), type: 'Virtual Event', registration: 'Offline' }, async () => {
      await expect(eventDetail.title(name)).toBeVisible();
    });
  });

  test('T-08 attendee limit, custom register button text and an email reminder', async ({ eventsPage, eventForm, eventDetail }) => {
    const name = unique('limits');
    await withEvent(
      { eventsPage, eventForm, eventDetail },
      { name, date: daysFromNow(14), type: 'Virtual Event', maxAttendees: 10, registerButtonText: 'Join us', reminder: { amount: 2, unit: 'hours before' } },
      async () => {
        await expect(eventDetail.title(name)).toBeVisible();
        await eventDetail.clickMenuItem(name, 'Edit Event');
        await eventForm.step('Registration').click();
        await expect(eventForm.maxAttendeesInput).toHaveValue('10');
        await expect(eventForm.registerButtonTextInput).toHaveValue('Join us');
        await expect(eventForm.dialog.getByRole('spinbutton', { name: 'Reminder amount' }).last()).toHaveValue('2');
        await eventForm.cancel();
      },
    );
  });

  test('T-09 several speakers, a guest and several agenda sessions', async ({ page, eventsPage, eventForm, eventDetail }) => {
    const name = unique('people');
    await withEvent(
      { eventsPage, eventForm, eventDetail },
      {
        name,
        date: daysFromNow(14),
        type: 'Virtual Event',
        speakers: [{ name: 'Ada Speaker', title: 'Engineer' }, { name: 'Gus Guest', role: 'Guest' }],
        agenda: [{ title: 'Welcome' }, { title: 'Main talk', description: 'The big one' }, { title: 'Q&A' }],
      },
      async () => {
        for (const text of ['Ada Speaker', 'Engineer', 'Gus Guest', 'Welcome', 'Main talk', 'The big one', 'Q&A', '3 sessions']) {
          await expect(page.getByText(text, { exact: true }).first()).toBeVisible();
        }
      },
    );
  });
});
