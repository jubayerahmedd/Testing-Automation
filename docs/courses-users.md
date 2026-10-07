# Courses — Users (guest and member)

Related: [admin](courses-admin.md) · [course editor](courses-editor.md) · [general notes](courses-exploration.md)

## Guest (not logged in) — explored and automated

Covered by `tests/courses/courses.guest.spec.ts` (C-01 to C-13, see [general notes](courses-exploration.md) section 8).

| Area | Behaviour |
|---|---|
| List | Published courses only (draft hidden), no Create/Edit controls, `Log in` button in header |
| Private course | `DEDDD` shows `Private` badge and a disabled `Invite only` button |
| Search / sort / view | Search filters (empty state "No courses found"), sort Newest/Oldest, grid/list toggle |
| Detail | About, curriculum with counts, `Expand all chapters`, price (`USD 10 / Lifetime`, struck-through `USD 100`), `Get Access` |
| Not found | `/courses/<unknown>` → "Course Not Found" + `Back to Courses` |

## Member (logged in, not admin) — explored and automated

Account: `MEMBER_EMAIL` / `MEMBER_PASSWORD` in `.env` (*Yashim Uddin*), enrolled in **DISCUSSION COURSE** only. Covered by `tests/courses/courses.member.spec.ts` (M-01 to M-12), project `chromium-member`.

| Area | Behaviour |
|---|---|
| List | Tabs **All Courses / Enrolled**; no Create/Edit/Log in controls; draft course hidden (4 cards) |
| Enrolled course | `Watch Course` link (→ `/courses/<slug>/watch/<lessonId>`) |
| Other public courses | `Enroll Now` (card) / `Get Access` (detail page) |
| Private course (`DEDDD`) | Card: disabled `Invite only`; detail: `Invitation required` |
| Player (enrolled) | Lesson content, `Comment` box with `Latest`/`Oldest` sort, `Previous` / `Complete`, "Lesson 1 of 1", "Course content — 0 of 1 lessons complete" |
| Player (not enrolled) | "You don't have access to this lesson — Enroll in this course to unlock this lesson." + `View Course` |
| `/courses/<slug>/edit` | Redirects back to `/courses/<slug>` (no editor for members) |
| Draft URL (`/courses/new-course`) | "Course Not Found" |

### Gotchas

- **First-login onboarding:** a new member is redirected from every page to `/welcome` ("Tell us a bit about you") and **`Skip for now` does nothing**. About (required) and a profile photo have to be filled once and `Continue` clicked. This was done once for the test account; `auth.member.setup.ts` fails with a clear message if it ever reappears.
- The member setup also writes `.auth/member.json` and waits for the `__Host-ecom_*` cookies.

### Not covered (mutating / payment)

`Enroll Now` / `Get Access` (paid courses go to Stripe checkout), `Complete` (changes lesson progress), posting comments, reactions. To automate: a free throw-away course, plus admin-side cleanup (remove the student from the Enrollments tab).
