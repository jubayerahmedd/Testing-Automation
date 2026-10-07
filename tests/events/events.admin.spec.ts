import { test, expect } from '../../fixtures/events';
import { daysFromNow } from '../../pages/events/EventFormModal';

// One shared browser window for the whole file; tests run in order.
test.describe.configure({ mode: 'default' });

// See docs/events/events-admin.md. Read-only: nothing here saves an event (the wizard is always cancelled).

test.describe('Events (admin) - read', () => {
  test.beforeEach(async ({ eventsPage }) => {
    await eventsPage.open('calendar');
  });

  test('EV-01 shows admin controls @smoke', async ({ eventsPage }) => {
    await expect(eventsPage.heading).toBeVisible();
    await expect(eventsPage.newEventButton).toBeVisible();
    await expect(eventsPage.calendarTab).toBeVisible();
    await expect(eventsPage.listTab).toBeVisible();
    await expect(eventsPage.allEventsFilter).toBeVisible();
    await expect(eventsPage.hostingFilter).toBeVisible();
    await expect(eventsPage.manageTagsButton).toBeVisible();
  });

  test('EV-02 calendar shows the current month with a day grid and legend', async ({ page, eventsPage }) => {
    const month = new Date().toLocaleString('en-US', { month: 'long' });
    await expect(eventsPage.monthCaption(month)).toBeVisible();
    for (const day of ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']) {
      await expect(page.getByText(new RegExp('^' + day + '$', 'i')).first()).toBeVisible();
    }
    for (const key of ['Multi-day', 'Single session', "You're registered", 'Recurring']) {
      await expect(page.getByText(key, { exact: true })).toBeVisible();
    }
    await expect(eventsPage.createOnDayButtons.first()).toBeVisible();
  });

  test('EV-03 calendar navigation: next, previous and Today', async ({ eventsPage }) => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleString('en-US', { month: 'long' });
    const current = now.toLocaleString('en-US', { month: 'long' });
    await eventsPage.nextMonth.click();
    await expect(eventsPage.monthCaption(next)).toBeVisible();
    await eventsPage.todayButton.click();
    await expect(eventsPage.monthCaption(current)).toBeVisible();
    await eventsPage.previousMonth.click();
    await expect(eventsPage.monthCaption(current)).toBeHidden();
    await eventsPage.todayButton.click();
    await expect(eventsPage.monthCaption(current)).toBeVisible();
  });

  test('EV-04 clicking a day in the calendar opens the wizard', async ({ page, eventsPage, eventForm }) => {
    await eventsPage.createOnDayButtons.last().click();
    await expect(eventForm.dialog).toBeVisible();
    await eventForm.cancel();
    await expect(page).toHaveURL(/\/events/);
  });

  test('EV-05 list view lists events with host and RSVP', async ({ eventsPage }) => {
    await eventsPage.listTab.click();
    await expect(eventsPage.eventLinks.first()).toBeVisible();
    await expect(eventsPage.eventLinks.first()).toContainText('By ');
    await expect(eventsPage.eventLinks.first()).toContainText('RSVP');
  });

  test('EV-06 list view Upcoming / Past / All filters', async ({ eventsPage }) => {
    await eventsPage.listTab.click();
    await eventsPage.selectTimeFilter('Upcoming');
    await expect(eventsPage.eventLinks.first()).toBeVisible();
    const upcoming = await eventsPage.rowTitles();

    await eventsPage.selectTimeFilter('Past');
    await expect.poll(() => eventsPage.rowTitles()).not.toEqual(upcoming);
    const past = await eventsPage.rowTitles();
    expect(past.length).toBeGreaterThan(0);

    await eventsPage.selectTimeFilter('All');
    await expect.poll(async () => (await eventsPage.rowTitles()).length).toBeGreaterThanOrEqual(upcoming.length + past.length);
  });

  test('EV-07 Hosting filter shows only events hosted by the admin', async ({ eventsPage }) => {
    await eventsPage.listTab.click();
    await expect(eventsPage.eventLinks.first()).toBeVisible();
    await eventsPage.hostingFilter.click();
    await expect(eventsPage.eventLinks.first()).toBeVisible();
    for (const text of await eventsPage.rowTitles()) expect(text).toContain('By Jubayer Ahmed');
    await eventsPage.allEventsFilter.click();
  });

  test('EV-08 opening an event shows its detail page @smoke', async ({ page, eventsPage, eventDetail }) => {
    await eventsPage.listTab.click();
    const link = eventsPage.eventLinks.first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/events\/[\w-]+\?d=/);
    await expect(eventDetail.backLink).toBeVisible();
    await expect(page.getByText('Discussion', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add to Calendar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share event' })).toBeVisible();
    await eventDetail.backLink.click();
    await expect(page).toHaveURL(/\/events/);
  });

  test('EV-09 Manage tags dialog opens and closes', async ({ eventsPage }) => {
    await eventsPage.openManageTags();
    await expect(eventsPage.tagsDialog).toContainText('Rename or remove the tags used across your events.');
    await eventsPage.tagsDialog.getByRole('button', { name: 'Close' }).click();
    await expect(eventsPage.tagsDialog).toBeHidden();
  });
});

test.describe('Events (admin) - create wizard validation', () => {
  test.beforeEach(async ({ eventsPage, eventForm }) => {
    await eventsPage.open('calendar');
    await eventsPage.newEventButton.click();
    await expect(eventForm.dialog).toBeVisible();
  });

  test('EV-10 wizard opens on step 1 with all fields', async ({ eventForm }) => {
    await expect(eventForm.dialog).toContainText('Create Event');
    for (const step of ['Basics', 'When & Where', 'Registration', 'Speakers & Agenda'] as const) {
      await expect(eventForm.step(step)).toBeVisible();
    }
    await expect(eventForm.nameInput).toBeVisible();
    await expect(eventForm.descriptionEditor).toBeVisible();
    await expect(eventForm.dialog.getByText('Tags')).toBeVisible();
    await expect(eventForm.dialog.getByText('Cover Image *')).toBeVisible();
    await expect(eventForm.dialog).toContainText('Jubayer Ahmed'); // default host
    await expect(eventForm.cancelButton).toBeVisible();
    await expect(eventForm.nextButton).toBeVisible();
  });

  test('EV-11 empty step 1 shows name and cover validation and stays on step 1', async ({ eventForm }) => {
    await eventForm.next();
    await expect(eventForm.dialog.getByText('Event name is required.')).toBeVisible();
    await expect(eventForm.dialog.getByText('A cover image is required.')).toBeVisible();
    await expect(eventForm.onStep(1)).toBeVisible();
    await expect(eventForm.onStep(2)).toBeHidden();
  });

  test('EV-12 name counter tracks the 120 character limit', async ({ eventForm }) => {
    await expect(eventForm.nameCounter).toHaveText('0/120');
    await eventForm.nameInput.fill('Counter check');
    await expect(eventForm.nameCounter).toHaveText('13/120');
    await eventForm.nameInput.fill('x'.repeat(130));
    await expect(eventForm.nameCounter).toHaveText('120/120');
  });

  test('EV-13 step 2 requires a date and an address (In Person)', async ({ eventForm }) => {
    await eventForm.fillBasics({ name: 'PW Auto validation (never saved)' });
    await eventForm.next();
    await expect(eventForm.onStep(2)).toBeVisible();
    await eventForm.next();
    await expect(eventForm.dialog.getByText('Please pick an event date.')).toBeVisible();
    await expect(eventForm.dialog.getByText('An address is required for in-person events.')).toBeVisible();
    await expect(eventForm.onStep(3)).toBeHidden();
  });

  test('EV-14 step 2 requires an event link for a Virtual event', async ({ eventForm }) => {
    await eventForm.fillBasics({ name: 'PW Auto validation (never saved)' });
    await eventForm.next();
    await eventForm.setType('Virtual Event');
    await eventForm.pickDate(eventForm.startDate, daysFromNow(3));
    await eventForm.next();
    await expect(eventForm.dialog.getByText('An event link is required for a custom virtual event.')).toBeVisible();
    await expect(eventForm.onStep(3)).toBeHidden();
  });

  test('EV-15 Back keeps the values entered on previous steps', async ({ eventForm }) => {
    await eventForm.fillBasics({ name: 'PW Auto keep values (never saved)' });
    await eventForm.next();
    await eventForm.back();
    await expect(eventForm.nameInput).toHaveValue('PW Auto keep values (never saved)');
    await expect(eventForm.dialog.getByRole('button', { name: 'Change image' })).toBeVisible();
  });

  test('EV-16 External registration requires a registration link', async ({ eventForm }) => {
    await eventForm.fillBasics({ name: 'PW Auto validation (never saved)' });
    await eventForm.next();
    await eventForm.fillWhenWhere({ date: daysFromNow(3), type: 'Virtual Event' });
    await eventForm.next();
    await eventForm.setRegistrationType('External');
    await expect(eventForm.registrationLinkInput).toBeVisible();
    await eventForm.next();
    await expect(eventForm.onStep(4)).toBeHidden();
    await expect(eventForm.onStep(3)).toBeVisible();
  });

  test('EV-17 Cancel closes the wizard without creating an event', async ({ page, eventsPage, eventForm }) => {
    await eventForm.nameInput.fill('PW Auto should not be created');
    await eventForm.cancel();
    await eventsPage.listTab.click();
    await expect(eventsPage.eventLinks.first()).toBeVisible();
    await expect(eventsPage.row('PW Auto should not be created')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('EV-18 the close (x) button also discards the wizard', async ({ eventForm }) => {
    await eventForm.nameInput.fill('PW Auto should not be created');
    await eventForm.closeButton.click();
    await expect(eventForm.dialog).toBeHidden();
  });
});
