# Events — Admin role

Explored 2026-10-07 on `https://jubayer.comm.pro.bd/events` with the account in `.env` (community owner/admin, *Jubayer Ahmed*).
Screenshots: [docs/events/screenshots/](screenshots/). Code: `pages/events/`, `fixtures/events.ts`, `tests/events/`.

## Events page (`/events`, `/events?view=list`)

| Element | Notes |
|---|---|
| `New Event` button | Opens the 4-step wizard. Admin only. |
| `Calendar` / `List` tabs | `role=tab`. List view is `?view=list`. |
| `All events` / `Hosting` | Hosting = only events the admin hosts. |
| `Manage tags` | Dialog: rename / remove tags used across events. |
| Calendar | Month grid, `Previous month` / `Today` / `Next month`, a `Create event on this day` button in every cell, legend (Multi-day, Single session, You're registered, Recurring). |
| List | Rows grouped by date. Tag chips (`All`, tags) and a time filter `Upcoming` / `Past` / `All` (note: two `All` chips — the time one is last). Each row is a link `/events/<slug>-<id>?d=<base64 date>` with title, Online/address, host, RSVP count and an `RSVP` button. |

The app sometimes does not hydrate on first load; the page object reloads and retries (same as the courses page).

## Create / Edit wizard (4 steps)

Stepper: **Basics → When & Where → Registration → Speakers & Agenda**. `Cancel`, `Back`, `Next` (step 3's is `Next: Speakers & Agenda`), `Create Event` on the last step (`Update Event` in edit mode, available on every step), `Close`. Section titles are upper-cased by CSS only — match them case-insensitively.
**Escape closes the whole wizard** (it is fine only to close a date popover).

1. **Basics** — `Event Name *` (counter `n/120`), `Description` (rich text, 2,000), `Host` (defaults to the admin), `Tags` (optional, up to 5), `Cover Image *` (1280×720). Validation: *Event name is required.* / *A cover image is required.*
   Cover: `Upload cover image` → media gallery dialog (pick a card or upload) → `Select` → **Crop event image** dialog → `Apply`. The button then reads `Change image`.
2. **When & Where** — `Date *` (virtual) or `Start date *` + optional `End date` (in person only; **multi-day events are in-person only and cannot recur**). Date picker is react-day-picker: `td[data-day="YYYY-MM-DD"]`, nav `Go to the Next Month`. Start/End time = Hour/Minute comboboxes + AM/PM (default 4:00 → 5:00 PM). Timezone (defaults to Dhaka). `Type *`: **Virtual Event** (needs `Event Link`; sources Native Meeting / Custom URL / Google Meet) or **In Person** (`Address` autocomplete: suggestions are plain buttons under the input — type, then click the first). `Hide Venue` switch. `Recurrence` → `Set Recurrence` dialog (Repeat every N Day/Week…, Repeat on, End Never/On/After, summary *"This event repeats every week on …"*, `Done`).
   Validation: *Please pick an event date.*, *An address is required for in-person events.*, *An event link is required for a custom virtual event.*
3. **Registration** — `Registration type`: **Internal** (default; on-platform) / **External** (needs `Registration link *`) / **Offline**. `Pricing`: Free / Paid (Paid needs one-time/per-date/subscription pricing configured — not automated). Internal also has `Max Attendees`, `Register Button Text`, and `Reminders` (`Add`, amount + minutes/hours/days before; paid events need ≥ 25 min).
4. **Speakers & Agenda** (both optional) — `Add speakers or guests` (Name *, Title, role Speaker/Guest, photo, `Add speaker`), `Add an agenda` (time, `Session title *`, description, `Add session`, `Remove session`).

## Event detail page

`Back to events`, cover with `You're going` badge (the host is registered automatically), title with a **⋮ menu**, host, summary (**DATE / TIME / WHERE**; multi-day events show **Dates / Starts / Where**, `Multi-day · N days`), Agenda, Speakers & guests, Discussion (comment box), side card (date, Virtual/in-person, duration, price, `Event link`, `Add to Calendar`, `Share event`).

⋮ menu: **Edit Event** (the wizard, pre-filled), **Attendees** (dialog, `0 attendees`), **Copy ID**, **Delete Event** (confirm dialog *Delete event? Are you sure you want to delete "<name>"? This action cannot be undone.* → `Cancel` / `Delete`; afterwards the app returns to `/events`).

## Test map

| File | Cases | Writes? |
|---|---|---|
| `tests/events/events.admin.spec.ts` | EV-01…EV-09 read (controls, calendar, list, filters, detail, tags); EV-10…EV-18 wizard validation and cancel | No — the wizard is always cancelled |
| `tests/events/event-lifecycle.admin.spec.ts` | E-00…E-16: create → list/calendar/detail → attendees → comment → edit every step → cancel delete → delete | **@write** |
| `tests/events/event-types.admin.spec.ts` | T-00…T-09: minimal, in person, multi-day, weekly recurring (detail + calendar), external, offline, limit/button/reminder, several speakers & sessions — each created then deleted | **@write** |

Run: `npm run test:events` (everything), `npm test` (read-only; `@write` excluded), `npm run test:write` (all `@write`).

## Safety / gotchas

- Every created event is named `PW Auto Event …`; each @write file removes leftovers with that prefix first and never touches anyone else's events.
- The shared single-window `sharedTest` is used because the refresh token rotates: a fresh context per test logs the session out. Re-run the `setup` project if `.auth/user.json` goes stale.
- Cover images reuse the first gallery image instead of uploading a new one each run.
- Not automated: Paid events / pricing, Google Meet / Native Meeting sources, tags creation, photo upload for speakers, the member side (RSVP / registration).
