import { sharedTest } from './index';
import { EventsPage } from '../pages/events/EventsPage';
import { EventFormModal } from '../pages/events/EventFormModal';
import { EventDetailPage } from '../pages/events/EventDetailPage';

type EventFixtures = {
  eventsPage: EventsPage;
  eventForm: EventFormModal;
  eventDetail: EventDetailPage;
};

/** Events feature fixtures on top of the shared single-window `sharedTest`. */
export const test = sharedTest.extend<EventFixtures>({
  eventsPage: async ({ page }, use) => use(new EventsPage(page)),
  eventForm: async ({ page }, use) => use(new EventFormModal(page)),
  eventDetail: async ({ page }, use) => use(new EventDetailPage(page)),
});
export { expect } from './index';
