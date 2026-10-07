# Courses — Admin role

Explored 2026-10-06 with the account in `.env` (community owner/admin, shown as *Jubayer Ahmed* — also the *Instructor* of the courses).
Related: [course editor](courses-editor.md) · [users / guests](courses-users.md) · [general notes](courses-exploration.md)

## What the admin sees on `/courses`

| Element | Notes |
|---|---|
| `Create Course` button | Top right of the list. Opens the "Let's set up your course channel" modal. |
| `Published` / `Draft` badge | One per card. `New Course` is **Draft**, the rest are Published. |
| `Edit Course` button | One per card. Goes to `/courses/<slug>/edit`. |
| Extra courses | Admin sees drafts; guests do not (5 cards vs 4). |
| `Private` badge | `DEDDD` is Private; admin has an `Edit Course` button instead of `Invite only`. |

Search, sort (`Newest`/`Oldest`) and grid/list toggle behave the same as for guests.

## Create Course modal

Fields: `#name` (Course name, 255), `#shortDescription` (280, optional), thumbnail upload (.jpg/.png, 16:9), Visibility (Public / Private / Secret), Publishing status (Publish / Draft), Live Preview. Buttons: `Cancel`, `Create Course`, `Close`.

Validation (empty submit): **"Please enter a course title"** and **"Please use .jpg or .png image"** (thumbnail is mandatory). The modal stays open.

## Admin viewing course pages

- Published course (`/courses/paid-course`): same sales page as guests, but the purchase box says **"Log in as a member to purchase this course."** — admins cannot buy their own course.
- Draft course (`/courses/new-course`): banner **"Draft preview — only course managers can see this page. Publish the course to make it visible to members."**
- Private course (`/courses/deddd`) opens normally for the admin.
- `/courses/<slug>/watch` ("Preview" in the editor) opens the learner player at `/watch/<lessonId>`.

## Admin test coverage

| ID | Test | File |
|---|---|---|
| A-01 | Create/Edit controls and status badges visible | `courses.admin.spec.ts` |
| A-02 | Draft course is listed with a `Draft` badge, published ones with `Published` | same |
| A-03 | Create Course modal shows all fields and options | same |
| A-04 | Empty submit shows both validation messages and keeps the modal open | same |
| A-05 | Cancel closes the modal without creating a course | same |
| A-06 | `Edit Course` opens the editor for the right slug | same |
| A-07 | Draft course page shows the draft-preview banner | same |
| A-08 | Admin cannot purchase: shows "Log in as a member to purchase" | same |
| A-09 | Search and sort work for the admin list | same |

## Not covered (mutates live data)

Publishing/unpublishing an existing course and deleting a chapter. Creating and deleting a whole course **is** automated, in a separate opt-in spec: see [courses-create-flow.md](courses-create-flow.md) (`npm run test:write`). The card's `Course actions` menu offers Preview, View landing, Copy ID, Pricing, Visibility, Add staff, Manage students and **Delete course** (type `DELETE` to confirm).
