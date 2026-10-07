import { expect } from '@playwright/test';
import { EventsPage, EVENT_PREFIX } from './EventsPage';
import { EventDetailPage } from './EventDetailPage';

/**
 * Deletes every event whose title starts with the automation prefix (leftovers from a failed
 * or interrupted run). Never touches events created by people. Returns how many were removed.
 */
export async function deleteLeftoverEvents(events: EventsPage, detail: EventDetailPage): Promise<number> {
  let removed = 0;
  for (let guard = 0; guard < 30; guard++) {
    await events.open('list');
    await events.selectTimeFilter('All');
    await expect(events.eventLinks.first()).toBeVisible({ timeout: 30_000 });
    const leftover = events.row(EVENT_PREFIX).first();
    if (!(await leftover.isVisible())) break;
    const lines = (await leftover.innerText()).split('\n').map((l) => l.trim());
    const title = lines.find((l) => l.startsWith(EVENT_PREFIX))!;
    await leftover.click();
    await expect(detail.title(title)).toBeVisible({ timeout: 30_000 });
    await detail.deleteEvent(title);
    removed++;
  }
  return removed;
}
