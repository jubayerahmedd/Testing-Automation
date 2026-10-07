# Courses module — exploration notes

Explored 2026-10-06 against `https://jubayer.comm.pro.bd/courses` (Next.js SPA, content loads via XHR).
Screenshots are in [screenshots/](screenshots/).

## 1. Routes

| Route | Purpose | Notes |
|---|---|---|
| `/courses` | Course catalogue | Shows "Loading courses..." until `GET /api/course?page=1&per_page=12&sort=newest&scope=all` returns |
| `/courses/<slug>` | Course detail / sales page | Slug is derived from the title, e.g. `physics-for-all`, `paid-course`, `deddd`, `discussion-course` |
| `/courses/<slug>/edit` | Admin course editor | Tabs: Curriculum, Drip, Staff, Enrollments, Settings, Preview |
| `/courses/does-not-exist` | Not-found state | "Course Not Found — The course you're looking for doesn't exist or has been moved." + `Back to Courses` |

Page title on the list: `Courses | jubayer`. Detail page title = course title.

## 2. Test data (current state of the community)

| Course | Slug | Price | Level | Chapters / Lessons / Learners | Visibility | Guest CTA | Status |
|---|---|---|---|---|---|---|---|
| DISCUSSION COURSE | `discussion-course` | GBP 15 / Monthly for channel | – | 1 / 1 / 3 | Public | Enroll Now | Published |
| New Course | – | USD 10 / Lifetime | – | 1 / 6 / 5 | – | **hidden from guests** | **Draft** |
| DEDDD | `deddd` | USD 10 / Lifetime | – | 2 / 2 / 2 | **Private** | `Invite only` (disabled) | Published |
| Paid Course | `paid-course` | USD 9 / Lifetime | BEGINNER | 1 / 2 / 2 | Public | Enroll Now | Published |
| Physics for All | `physics-for-all` | USD 10 / Lifetime | BEGINNER | 2 / 4 / 5 | Public | Enroll Now | Published |

Every card has a `Paid` badge. Guests see 4 cards, the admin sees 5 (draft included). All fit on one page (12 per page), so pagination shows only page `1`.
Physics for All curriculum: *Foundations of Physics (Beginner)* — 1.1 What is Physics?, 1.2 Measurement and Errors, 1.3 Motion in One Dimension; *Forces and Motion (Elementary)* — 2.1 Newton's Laws of Motion.

> The data is mutable (the owner can add/edit courses). Tests should avoid hard-coding the full list; assert on a known stable course (`Physics for All`) and on relationships (sort order reversed, search subset) instead.

## 3. `/courses` page — elements & behaviour

| Element | Locator | Behaviour |
|---|---|---|
| Heading | `getByRole('heading', { name: 'Courses' })` (h3) | Subtitle: "Learn, grow, and master new skills with our community-driven courses." |
| Search | `getByPlaceholder('Search courses')` | Debounced server-side filter (~1–2 s). `physics` → only *Physics for All*. `zzzqqq` → empty state **"No courses found / Try a different search term."** Clearing restores all cards. |
| View toggle | `getByRole('tab').nth(0 / 1)` (grid / list, no accessible names) | Grid is default (`aria-selected=true` on tab 0). Switching to list keeps the same cards. |
| Sort | `getByRole('combobox')` → options `Newest` (default), `Oldest` | `Oldest` is the exact reverse of `Newest`. |
| Card | `h4` title inside card; whole card is a link to `/courses/<slug>` | Shows thumbnail, badges (`Paid`, `Private`), description, level, chapter/lesson/learner counts, price, CTA |
| CTA (guest) | `Enroll Now` (link + button) / `Invite only` (disabled) | Clicking `Enroll Now` as guest navigates to the course detail page (no dialog). |
| Pagination | prev `<`, `1`, next `>` | Single page currently. |
| Admin only | `Create Course` button, `Published`/`Draft` badges, `Edit Course` button on each card | Not shown to guests. |

## 4. Course detail page (`/courses/<slug>`)

- `Back to courses` link, course title (twice: header + hero), description, **About This Course**, **Course Curriculum** (`2 chapters · 4 lessons`).
- `Expand all chapters` reveals every lesson; chapter header shows `N lessons` (collapsed chapters only show some lessons).
- Purchase panel: `USD 10 / Lifetime` + struck-through `USD 100`.
  - Guest: **Get Access** button.
  - Logged-in admin account: text **"Log in as a member to purchase this course."** (admins can't buy) — the in-page lesson click did nothing visible.
- Guests see a `Log in` button in the header.

## 5. Admin flows (account in `.env` is the community owner/admin)

- **Create Course** → modal "Let's set up your course channel": `#name` (Course name, max 255), `#shortDescription` (max 280, optional), thumbnail upload (jpg/png, 16:9), Visibility radio (Public / Private / Secret), Publishing status (Publish / Draft), live preview.
- **Edit Course** → `/courses/<slug>/edit` with tabs Curriculum / Drip / Staff / Enrollments / Settings / Preview, stats (chapters, lessons, enrolled).

## 6. API observed

| Call | Notes |
|---|---|
| `GET /api/course?page=1&per_page=12&sort=newest&scope=all` | 200 for guests; list source. `sort=oldest` for Oldest. Search presumably adds a query param. |
| `GET /api/auth/me`, `POST /api/auth/refresh` | **401 when the session is not valid** |

## 7. Findings / risks to be aware of

1. **Saved session did not authenticate in my exploration.** Loading `/courses` with `.auth/user.json` produced 401 on `/api/auth/me` and `/api/auth/refresh`, and the page rendered as a guest (`Log in` button, no draft course). A fresh login in a new context worked. Suspected cause: refresh token is rotated/single-use, so reusing the stored state is flaky. The existing `chromium` project's "authenticated" navigation tests pass either way, because they only check URLs, so they would not notice. Worth deciding before we write authenticated course tests.
2. Page is slow to hydrate; always wait for "Loading courses..." to disappear (or for a card heading) rather than `networkidle`.
3. View-toggle tabs and the sort combobox have no accessible names, so locators are positional.
4. Cards are `h4` headings inside links — no `data-testid` anywhere.

## 8. Proposed test plan

**Guest (no storage state)** — new project `chromium-guest`, spec `tests/courses/courses.guest.spec.ts`

| ID | Test | Tag |
|---|---|---|
| C-01 | Page loads, heading + subtitle visible, title is `Courses | jubayer` | @smoke |
| C-02 | Cards render (≥1) with title, price and CTA | @smoke |
| C-03 | Draft course is not listed for guests; Create/Edit controls absent | |
| C-04 | Search by `physics` shows only *Physics for All* | |
| C-05 | Search with no match shows "No courses found" empty state | |
| C-06 | Clearing the search restores the full list | |
| C-07 | Sort `Oldest` reverses the `Newest` order | |
| C-08 | Grid ↔ list toggle keeps the same courses | |
| C-09 | Private course shows disabled `Invite only` | |
| C-10 | Clicking a card opens `/courses/<slug>` with matching title | @smoke |
| C-11 | Detail page shows About, curriculum counts, `Expand all chapters` reveals lessons | |
| C-12 | Detail page shows price and `Get Access` for guests | |
| C-13 | Unknown slug shows "Course Not Found" and `Back to Courses` works | |

**Admin (logged-in)** — `tests/courses/courses.admin.spec.ts`

| ID | Test |
|---|---|
| A-01 | `Create Course`, `Edit Course`, `Published`/`Draft` badges visible |
| A-02 | Draft course appears in the list |
| A-03 | `Create Course` modal opens with name/description/visibility/status fields |
| A-04 | `Edit Course` opens `/courses/<slug>/edit` with all six tabs |

Out of scope for now (mutating / needs payment): actually creating or deleting courses, enrolling, Stripe/paywall checkout. Can be added with cleanup if wanted.

## 9. Implementation plan

- `pages/CoursesPage.ts` (list) and `pages/CourseDetailPage.ts` — page objects following `LoginPage`/`NavBar` style, registered in `fixtures/index.ts`.
- Specs under `tests/courses/`; update `playwright.config.ts` so guest specs run without storage state.
