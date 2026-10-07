import { Page, Locator, expect } from '@playwright/test';
import path from 'path';

export const COVER_FIXTURE = path.resolve(__dirname, '..', '..', 'fixtures', 'files', 'thumbnail.png');

export type EventType = 'Virtual Event' | 'In Person';
export type RegistrationType = 'Internal' | 'External' | 'Offline';
export type ReminderUnit = 'minutes before' | 'hours before' | 'days before';

export interface Speaker { name: string; title?: string; role?: 'Speaker' | 'Guest' }
export interface Session { title: string; description?: string }

export interface EventSpec {
  name: string;
  description?: string;
  /** Day the event starts. */
  date: Date;
  /** Last day of a multi-day event (In Person only). */
  endDate?: Date;
  type: EventType;
  /** Meeting link, for Virtual events. */
  link?: string;
  /** Address, for In Person events: the first autocomplete suggestion is chosen. */
  address?: string;
  /** Weekly recurrence (single-day events only). */
  weekly?: boolean;
  registration?: RegistrationType;
  /** Required for External registration. */
  registrationLink?: string;
  maxAttendees?: number;
  registerButtonText?: string;
  reminder?: { amount: number; unit?: ReminderUnit };
  speakers?: Speaker[];
  agenda?: Session[];
}

/** The 4-step Create Event / Edit Event wizard: Basics → When & Where → Registration → Speakers & Agenda. */
export class EventFormModal {
  readonly dialog: Locator;
  readonly nameInput: Locator;
  readonly descriptionEditor: Locator;
  readonly nameCounter: Locator;
  readonly cancelButton: Locator;
  readonly backButton: Locator;
  readonly nextButton: Locator;
  readonly submitButton: Locator;
  readonly closeButton: Locator;
  readonly gallery: Locator;

  constructor(private readonly page: Page) {
    // The stepper ("Speakers & Agenda") identifies the wizard; the gallery, crop and recurrence dialogs lack it.
    this.dialog = page.getByRole('dialog').filter({ hasText: 'Speakers & Agenda' }).first();
    this.nameInput = this.dialog.getByPlaceholder('Enter event name');
    this.descriptionEditor = this.dialog.locator('.ProseMirror');
    this.nameCounter = this.dialog.getByText(/^\d+\/120$/);
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel' });
    this.backButton = this.dialog.getByRole('button', { name: 'Back' });
    this.nextButton = this.dialog.getByRole('button', { name: /^Next/ });
    this.submitButton = this.dialog.getByRole('button', { name: /^(Create|Update) Event$/ });
    this.closeButton = this.dialog.getByRole('button', { name: 'Close' });
    this.gallery = page.getByRole('dialog').filter({ hasText: 'Upload From Gallery' });
  }

  // ---------- navigation ----------

  step(label: 'Basics' | 'When & Where' | 'Registration' | 'Speakers & Agenda'): Locator {
    return this.dialog.getByRole('button', { name: label });
  }

  async next() { await this.nextButton.click(); }
  async back() { await this.backButton.click(); }
  async cancel() {
    await this.cancelButton.click();
    await expect(this.dialog).toBeHidden();
  }

  /** A control that only exists on that step, to assert which step the wizard is on. */
  onStep(n: 1 | 2 | 3 | 4): Locator {
    return [this.nameInput, this.dialog.getByText('Timezone *'), this.dialog.getByText('Registration type'), this.submitButton][n - 1];
  }

  // ---------- step 1: Basics ----------

  async fillBasics(opts: { name: string; description?: string; cover?: boolean }) {
    await this.nameInput.fill(opts.name);
    if (opts.description) {
      await this.descriptionEditor.click();
      await this.page.keyboard.type(opts.description);
    }
    if (opts.cover ?? true) await this.chooseCover();
  }

  /**
   * Cover image through the media gallery. Reuses an existing image so every run doesn't pile up
   * another upload; only uploads when the gallery is empty.
   */
  async chooseCover() {
    await this.dialog.getByRole('button', { name: /Upload cover image|Change image/ }).click();
    await expect(this.gallery).toBeVisible();
    const cards = this.gallery.locator('[aria-describedby="gallery-item-card"]');
    const hasCard = await cards.first().waitFor({ timeout: 15_000 }).then(() => true, () => false);
    if (hasCard) {
      await cards.first().click();
    } else {
      const registered = this.page.waitForResponse((r) => r.url().includes('/gallery/uploads/register') && r.ok(), { timeout: 120_000 });
      await this.gallery.locator('input[type=file]').setInputFiles(COVER_FIXTURE);
      await registered;
    }
    await this.gallery.getByRole('button', { name: 'Select', exact: true }).click();
    await this.page.getByRole('dialog').filter({ hasText: 'Crop event image' }).getByRole('button', { name: 'Apply' }).click();
    await expect(this.dialog.getByRole('button', { name: 'Change image' })).toBeVisible({ timeout: 60_000 });
  }

  // ---------- step 2: When & Where ----------

  private dateTrigger(label: RegExp): Locator {
    return this.dialog.getByText(label).locator('xpath=following::button[1]');
  }

  /** Virtual events only have a single "Date"; In Person events have "Start date" and "End date". */
  get startDate(): Locator { return this.dateTrigger(/^(Start date|Date) \*$/); }
  get endDate(): Locator { return this.dateTrigger(/^End date/); }

  async pickDate(trigger: Locator, date: Date) {
    await trigger.click();
    const iso = isoDay(date);
    const cell = this.page.locator(`td[data-day="${iso}"]:not([data-outside])`).last();
    for (let i = 0; i < 24 && !(await cell.isVisible()); i++) {
      await this.page.getByRole('button', { name: 'Go to the Next Month' }).last().click();
    }
    await cell.getByRole('button').click();
    // Popover closes on pick; if it doesn't (range pickers), clicking the section title is harmless.
    await expect(cell).toBeHidden({ timeout: 5_000 }).catch(() => this.dialog.getByText('DATE & TIME').click());
  }

  async setType(type: EventType) {
    await this.dialog.getByRole('combobox').filter({ hasText: /^(In Person|Virtual Event)$/ }).click();
    await this.page.getByRole('option', { name: type }).click();
  }

  async setTime(which: 'start' | 'end', hour: number, minute = '00') {
    const i = which === 'start' ? 0 : 1;
    await this.dialog.getByRole('combobox', { name: 'Hour' }).nth(i).click();
    await this.page.getByRole('option', { name: String(hour), exact: true }).click();
    await this.dialog.getByRole('combobox', { name: 'Minute' }).nth(i).click();
    await this.page.getByRole('option', { name: minute, exact: true }).click();
  }

  get addressInput(): Locator { return this.dialog.getByPlaceholder('Start typing an address…'); }
  get linkInput(): Locator { return this.dialog.getByPlaceholder('https://meet.google.com/...'); }

  /** Types in the address box and clicks the first autocomplete suggestion (plain buttons under the input). */
  async chooseAddress(query: string) {
    await this.addressInput.click();
    await this.addressInput.pressSequentially(query, { delay: 60 });
    const first = this.addressInput.locator('xpath=../following-sibling::div[1]//button').first();
    await first.click({ timeout: 20_000 });
    await expect(this.addressInput).not.toHaveValue(query, { timeout: 10_000 });
  }

  async setWeeklyRecurrence() {
    await this.dialog.getByRole('button', { name: 'Set Recurrence' }).click();
    const rec = this.page.getByRole('dialog').filter({ hasText: 'REPEAT EVERY' });
    await expect(rec).toContainText('This event repeats every week');
    await rec.getByRole('button', { name: 'Done' }).click();
    await expect(rec).toBeHidden();
  }

  async fillWhenWhere(spec: Pick<EventSpec, 'date' | 'endDate' | 'type' | 'link' | 'address' | 'weekly'>) {
    await this.setType(spec.type);
    await this.pickDate(this.startDate, spec.date);
    if (spec.endDate) await this.pickDate(this.endDate, spec.endDate);
    if (spec.type === 'Virtual Event') await this.linkInput.fill(spec.link ?? 'https://meet.google.com/abc-defg-hij');
    if (spec.type === 'In Person') await this.chooseAddress(spec.address ?? 'Dhaka');
    if (spec.weekly) await this.setWeeklyRecurrence();
  }

  // ---------- step 3: Registration ----------

  async setRegistrationType(type: RegistrationType) {
    await this.dialog.getByRole('combobox').filter({ hasText: /^(Internal|External|Offline)$/ }).click();
    await this.page.getByRole('option', { name: type }).click();
  }

  get registrationLinkInput(): Locator { return this.dialog.getByPlaceholder('https://your-registration-page.com/…'); }
  get maxAttendeesInput(): Locator { return this.dialog.getByPlaceholder('Unlimited'); }
  get registerButtonTextInput(): Locator { return this.dialog.getByPlaceholder('Register (default)'); }

  async fillRegistration(spec: Pick<EventSpec, 'registration' | 'registrationLink' | 'maxAttendees' | 'registerButtonText' | 'reminder'>) {
    const type = spec.registration ?? 'Internal';
    if (type !== 'Internal') await this.setRegistrationType(type);
    if (type === 'External') await this.registrationLinkInput.fill(spec.registrationLink ?? 'https://example.com/register');
    if (type === 'Internal') {
      if (spec.maxAttendees) await this.maxAttendeesInput.fill(String(spec.maxAttendees));
      if (spec.registerButtonText) await this.registerButtonTextInput.fill(spec.registerButtonText);
      if (spec.reminder) {
        await this.dialog.getByRole('button', { name: 'Add', exact: true }).click();
        const amount = this.dialog.getByRole('spinbutton', { name: 'Reminder amount' }).last();
        await amount.fill(String(spec.reminder.amount));
        if (spec.reminder.unit) {
          await this.dialog.getByRole('combobox').filter({ hasText: /before$/ }).last().click();
          await this.page.getByRole('option', { name: spec.reminder.unit }).click();
        }
      }
    }
  }

  // ---------- step 4: Speakers & Agenda ----------

  async addSpeakers(speakers: Speaker[]) {
    if (!speakers.length) return;
    await this.dialog.getByText('Add speakers or guests').click();
    for (const [i, s] of speakers.entries()) {
      if (i > 0) await this.dialog.getByRole('button', { name: 'Add speaker' }).click();
      await this.dialog.getByPlaceholder('Name *').nth(i).fill(s.name);
      if (s.title) await this.dialog.getByPlaceholder(/Title, e\.g\./).nth(i).fill(s.title);
      if (s.role === 'Guest') {
        await this.dialog.getByRole('combobox').filter({ hasText: /^(Speaker|Guest)$/ }).nth(i).click();
        await this.page.getByRole('option', { name: 'Guest' }).click();
      }
    }
  }

  async addAgenda(sessions: Session[]) {
    if (!sessions.length) return;
    await this.dialog.getByText('Add an agenda').click();
    for (const [i, s] of sessions.entries()) {
      if (i > 0) await this.dialog.getByRole('button', { name: 'Add session' }).click();
      await this.dialog.getByPlaceholder('Session title *').nth(i).fill(s.title);
      if (s.description) await this.dialog.getByPlaceholder(/What happens in this session/).nth(i).fill(s.description);
    }
  }

  // ---------- whole flow ----------

  /** Fills all four steps for a new event and submits. */
  async create(spec: EventSpec) {
    await this.fillBasics(spec);
    await this.next();
    await this.fillWhenWhere(spec);
    await this.next();
    await this.fillRegistration(spec);
    await this.next();
    await this.addSpeakers(spec.speakers ?? []);
    await this.addAgenda(spec.agenda ?? []);
    await this.submitButton.click();
    await expect(this.dialog).toBeHidden({ timeout: 60_000 });
  }
}

/** YYYY-MM-DD in local time (the calendar's `data-day`). */
export function isoDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
