import { test, expect } from '../../fixtures/events';
import { EVENT_PREFIX } from '../../pages/events/EventsPage';
import { daysFromNow, EventSpec } from '../../pages/events/EventFormModal';
import { deleteLeftoverEvents } from '../../pages/events/eventCleanup';

// Full life of one event as the admin: create → read → update (every step of the wizard) → delete.
//
// This WRITES to the live community. Every event is named "PW Auto Event ..." so leftovers from a
// failed run are found and removed first (E-00); nothing created by people is touched. The event
// always ends deleted (E-14), so a green run leaves nothing behind.
//
// Steps depend on each other, so they run in order in one browser window.
// Tagged @write: excluded from `npm test`; run with `npm run test:write`.

const RUN = Date.now().toString(36);
const NAME = `${EVENT_PREFIX} ${RUN}`;
const EDITED = `${NAME} (edited)`;
const DESCRIPTION = 'Created by Playwright automation. Safe to delete.';
const DATE = daysFromNow(21);

const SPEC: EventSpec = {
  name: NAME,
  description: DESCRIPTION,
  date: DATE,
  type: 'Virtual Event',
  link: 'https://meet.google.com/abc-defg-hij',
  speakers: [{ name: 'Sam Speaker', title: 'Lead Tester' }],
  agenda: [{ title: 'Opening session', description: 'Welcome and intro' }],
};

test.describe('Event lifecycle (admin) @write', () => {
  test.describe.configure({ mode: 'serial', timeout: 180_000 });

  let name = NAME;

  test('E-00 remove leftover automation events', async ({ eventsPage, eventDetail }) => {
    await deleteLeftoverEvents(eventsPage, eventDetail);
    await eventsPage.open('list');
    await expect(eventsPage.row(EVENT_PREFIX)).toHaveCount(0);
  });

  // ---------- create ----------

  test('E-01 create a free virtual event with a speaker and an agenda session', async ({ page, eventsPage, eventForm }) => {
    await eventsPage.open('list');
    await eventsPage.newEventButton.click();
    await expect(eventForm.dialog).toContainText('Create Event');
    await eventForm.create(SPEC);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  // ---------- read ----------

  test('E-02 new event is listed in the list view', async ({ eventsPage }) => {
    await eventsPage.open('list');
    await expect(eventsPage.row(NAME)).toHaveCount(1);
    await expect(eventsPage.row(NAME)).toContainText('Online');
    await expect(eventsPage.row(NAME)).toContainText('By Jubayer Ahmed');
  });

  test('E-03 new event is on its day in the calendar', async ({ page, eventsPage }) => {
    await eventsPage.open('calendar');
    const now = new Date();
    const months = (DATE.getFullYear() - now.getFullYear()) * 12 + DATE.getMonth() - now.getMonth();
    for (let i = 0; i < months; i++) await eventsPage.nextMonth.click();
    await expect(eventsPage.calendarChip(NAME)).toBeVisible();
    await eventsPage.calendarChip(NAME).click();
    await expect(page.getByRole('heading', { name: NAME })).toBeVisible({ timeout: 30_000 });
  });

  test('E-04 detail page shows everything entered in the wizard @smoke', async ({ page, eventsPage, eventDetail }) => {
    await eventsPage.open('list');
    await eventsPage.openEvent(NAME);
    await expect(page).toHaveURL(/\/events\/pw-auto-event-[\w-]+\?d=/);
    await expect(eventDetail.summary('DATE')).toContainText(DATE.toLocaleString('en-US', { month: 'short', day: 'numeric' }));
    await expect(eventDetail.summary('TIME')).toContainText('4:00 – 5:00 PM');
    await expect(eventDetail.summary('WHERE')).toContainText('Online');
    await expect(page.getByText(DESCRIPTION)).toBeVisible();
    await expect(page.getByText('Opening session')).toBeVisible();
    await expect(page.getByText('Welcome and intro')).toBeVisible();
    await expect(page.getByText('Sam Speaker')).toBeVisible();
    await expect(page.getByText('Lead Tester')).toBeVisible();
    await expect(page.getByText('Virtual event')).toBeVisible();
    await expect(page.getByText('1 hour')).toBeVisible();
    await expect(page.getByText('Free · no card required')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Event link' }).or(page.getByRole('button', { name: 'Event link' }))).toBeVisible();
    await expect(page.getByText("You're going")).toBeVisible(); // the host is registered automatically
  });

  test('E-05 kebab menu offers Edit / Attendees / Copy ID / Delete', async ({ page, eventDetail }) => {
    await eventDetail.openMenu(NAME);
    for (const item of ['Edit Event', 'Attendees', 'Copy ID', 'Delete Event']) {
      await expect(page.getByRole('menuitem', { name: item })).toBeVisible();
    }
    await page.keyboard.press('Escape');
  });

  test('E-06 Attendees dialog opens', async ({ eventDetail }) => {
    await eventDetail.clickMenuItem(NAME, 'Attendees');
    await expect(eventDetail.attendeesDialog).toBeVisible();
    await expect(eventDetail.attendeesDialog).toContainText(NAME);
    await eventDetail.attendeesDialog.getByRole('button', { name: 'Close' }).click();
    await expect(eventDetail.attendeesDialog).toBeHidden();
  });

  test('E-07 admin can comment in the event discussion', async ({ page, eventDetail }) => {
    const comment = `Automation comment ${RUN}`;
    await eventDetail.postComment(comment);
    await expect(page.getByText(comment)).toBeVisible({ timeout: 30_000 });
  });

  // ---------- update ----------

  test('E-08 edit wizard opens pre-filled with the saved values', async ({ eventDetail, eventForm }) => {
    await eventDetail.clickMenuItem(NAME, 'Edit Event');
    await expect(eventForm.dialog).toContainText('Edit Event');
    await expect(eventForm.nameInput).toHaveValue(NAME);
    await expect(eventForm.descriptionEditor).toContainText(DESCRIPTION);
    await expect(eventForm.dialog.getByRole('button', { name: 'Change image' })).toBeVisible();
    await expect(eventForm.submitButton).toHaveText(/Update Event/);
    await eventForm.cancel();
  });

  test('E-09 edit Basics: rename and change the description', async ({ page, eventDetail, eventForm }) => {
    await eventDetail.clickMenuItem(NAME, 'Edit Event');
    await eventForm.nameInput.fill(EDITED);
    await eventForm.descriptionEditor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('Updated by Playwright automation.');
    await eventForm.submitButton.click();
    await expect(eventForm.dialog).toBeHidden({ timeout: 60_000 });
    name = EDITED;
    await expect(eventDetail.title(EDITED)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Updated by Playwright automation.')).toBeVisible();
    await expect(page.getByText(DESCRIPTION)).toHaveCount(0);
  });

  test('E-10 edit When & Where: change the end time', async ({ eventDetail, eventForm }) => {
    await eventDetail.clickMenuItem(name, 'Edit Event');
    await eventForm.step('When & Where').click();
    await expect(eventForm.onStep(2)).toBeVisible();
    await eventForm.setTime('end', 6);
    await eventForm.submitButton.click();
    await expect(eventForm.dialog).toBeHidden({ timeout: 60_000 });
    await expect(eventDetail.summary('TIME')).toContainText('4:00 – 6:00 PM');
    await expect(eventDetail.summary('TIME')).not.toContainText('5:00 PM');
  });

  test('E-11 edit Registration: set a max attendee limit and button text', async ({ eventDetail, eventForm }) => {
    await eventDetail.clickMenuItem(name, 'Edit Event');
    await eventForm.step('Registration').click();
    await expect(eventForm.onStep(3)).toBeVisible();
    await eventForm.maxAttendeesInput.fill('25');
    await eventForm.registerButtonTextInput.fill('Join us');
    await eventForm.submitButton.click();
    await expect(eventForm.dialog).toBeHidden({ timeout: 60_000 });

    // Reopen: the saved values come back.
    await eventDetail.clickMenuItem(name, 'Edit Event');
    await eventForm.step('Registration').click();
    await expect(eventForm.maxAttendeesInput).toHaveValue('25');
    await expect(eventForm.registerButtonTextInput).toHaveValue('Join us');
    await eventForm.cancel();
  });

  test('E-12 edit Speakers & Agenda: add a guest and a second session', async ({ page, eventDetail, eventForm }) => {
    await eventDetail.clickMenuItem(name, 'Edit Event');
    await eventForm.step('Speakers & Agenda').click();
    await expect(eventForm.onStep(4)).toBeVisible();
    await eventForm.dialog.getByRole('button', { name: 'Add speaker' }).click();
    await eventForm.dialog.getByPlaceholder('Name *').nth(1).fill('Gina Guest');
    await eventForm.dialog.getByRole('combobox').filter({ hasText: /^(Speaker|Guest)$/ }).nth(1).click();
    await page.getByRole('option', { name: 'Guest' }).click();
    await eventForm.dialog.getByRole('button', { name: 'Add session' }).click();
    await eventForm.dialog.getByPlaceholder('Session title *').nth(1).fill('Closing session');
    await eventForm.submitButton.click();
    await expect(eventForm.dialog).toBeHidden({ timeout: 60_000 });
    await expect(page.getByText('Gina Guest')).toBeVisible();
    await expect(page.getByText('Closing session')).toBeVisible();
    await expect(page.getByText('2 sessions')).toBeVisible();
  });

  test('E-13 updated name shows in the list', async ({ eventsPage }) => {
    await eventsPage.open('list');
    await expect(eventsPage.row(EDITED)).toHaveCount(1);
  });

  // ---------- delete ----------

  test('E-14 Delete asks for confirmation; Cancel keeps the event', async ({ eventsPage, eventDetail }) => {
    await eventsPage.open('list');
    await eventsPage.openEvent(name);
    await eventDetail.clickMenuItem(name, 'Delete Event');
    await expect(eventDetail.deleteDialog).toContainText(`Are you sure you want to delete "${name}"?`);
    await expect(eventDetail.deleteDialog).toContainText('This action cannot be undone.');
    await eventDetail.deleteDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(eventDetail.deleteDialog).toBeHidden();
    await expect(eventDetail.title(name)).toBeVisible();
  });

  test('E-15 confirming Delete removes the event', async ({ page, eventsPage, eventDetail }) => {
    await eventDetail.deleteEvent(name);
    await expect(page).toHaveURL(/\/events(\?|$)/, { timeout: 30_000 });
    await eventsPage.open('list');
    await expect(eventsPage.row(EVENT_PREFIX)).toHaveCount(0);
  });

  test('E-16 deleted event is gone from the calendar', async ({ eventsPage }) => {
    await eventsPage.open('calendar');
    const now = new Date();
    const months = (DATE.getFullYear() - now.getFullYear()) * 12 + DATE.getMonth() - now.getMonth();
    for (let i = 0; i < months; i++) await eventsPage.nextMonth.click();
    await expect(eventsPage.calendarChip(EVENT_PREFIX)).toHaveCount(0);
  });
});
