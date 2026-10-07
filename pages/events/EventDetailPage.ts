import { Page, Locator, expect } from '@playwright/test';

export class EventDetailPage {
  readonly backLink: Locator;
  readonly attendeesDialog: Locator;
  readonly deleteDialog: Locator;
  readonly commentEditor: Locator;
  readonly commentButton: Locator;

  constructor(private readonly page: Page) {
    this.backLink = page.getByText('Back to events');
    this.attendeesDialog = page.getByRole('dialog').filter({ hasText: 'Attendees' });
    this.deleteDialog = page.getByRole('dialog').filter({ hasText: 'Delete event?' });
    this.commentEditor = page.locator('.tiptap.ProseMirror').last();
    this.commentButton = page.getByRole('button', { name: 'Comment', exact: true });
  }

  title(name: string): Locator {
    return this.page.getByRole('heading', { name });
  }

  /** The "⋮" button next to the title: Edit Event / Attendees / Copy ID / Delete Event. */
  menuTrigger(name: string): Locator {
    return this.title(name).locator('xpath=..').getByRole('button');
  }

  async openMenu(name: string) {
    await this.menuTrigger(name).click();
  }

  async clickMenuItem(name: string, item: 'Edit Event' | 'Attendees' | 'Copy ID' | 'Delete Event') {
    await this.openMenu(name);
    await this.page.getByRole('menuitem', { name: item }).click();
  }

  /** Value shown under a DATE / TIME / WHERE label in the summary card (labels are upper-cased by CSS only; multi-day events say "Dates"). */
  summary(label: 'DATE' | 'TIME' | 'WHERE'): Locator {
    return this.page.getByText(new RegExp(`^${label}s?$`, 'i')).locator('xpath=following-sibling::*[1]');
  }

  async confirmDelete() {
    await expect(this.deleteDialog).toBeVisible();
    await this.deleteDialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(this.deleteDialog).toBeHidden();
  }

  async deleteEvent(name: string) {
    await this.clickMenuItem(name, 'Delete Event');
    await this.confirmDelete();
  }

  async postComment(text: string) {
    await this.commentEditor.click();
    await this.page.keyboard.type(text);
    await this.commentButton.click();
  }
}
