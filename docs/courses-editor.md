# Courses — Course editor role

Explored 2026-10-06 on `/courses/paid-course/edit` as the admin/instructor.
Related: [admin](courses-admin.md) · [users / guests](courses-users.md) · [general notes](courses-exploration.md)

## Layout

Header: course title, nav links **Curriculum · Drip · Staff · Enrollments · Settings · Preview** (plain links, not ARIA tabs). Left rail: `CURRICULUM — N ch · N lessons`, lesson search (`Search lessons`), chapters, `New chapter`.

| Tab | URL | Content |
|---|---|---|
| Curriculum | `/edit` | "Select a lesson to start editing" + stats: Chapters, Lessons, Enrolled |
| Drip | `/edit/drip` | Release type: **Immediately**, **Enrollment based**, **Specific dates**; buttons `Discard`, `Save schedule`; "No drip schedule" hint |
| Staff | `/edit/staff` | Table of staff (name, email, role — *Jubayer Ahmed / Instructor*), `Add staff member` → dialog "Add Staff Member" with `Search Member`, `Cancel`, `Add` |
| Enrollments | `/edit/enrollments` | "N students enrolled", `Enroll student`, search, table (student, enrolled date), `Previous`/`Next` |
| Settings | `/edit/setting` | Left menu of sections (below) + `Save` |
| Preview | `/watch` → `/watch/<lessonId>` | Learner player, `Back to course` |

## Settings sections

| Section | URL suffix | Content |
|---|---|---|
| General | `/edit/setting` | `#name` (max 255), `#slug`, `#shortDescription` (max 280), Course Level (`#level`), Description |
| Visibility | `/visibility` | Public / Private / Secret, Course status Publish / Draft, Enrollment limit |
| Access Control | `/access-control` | Course Roles, `Create Role`, system role *Instructor* |
| Pricing | `/pricing` | Price cards (e.g. `£20 / Monthly for channel`, `$9 / Lifetime`), `Set Default`, `Add New Price` |
| Branding | `/branding` | Cover image (1600×400), thumbnail (1280×720) |
| Lock Screen | `/lock-screen` | Default landing page vs Custom (marked *Soon*), preview |
| Engagement | `/engagement` | Course reviews (*Soon*), Motivational popup |
| Certificate | `/certificate` | Award on completion, blueprint, instructor, early-claim, completion time |
| Awarded | `/awarded-certificates` | "N issued in total", `Issue to everyone`, search |

## Chapter editor

`/edit/chapter/<id>`: chapter name (`#name`, "Untitled chapter"), Draft/Published toggle, description, lessons list with status, `Add lesson`, Motivational Popup, **Danger Zone → `Delete Chapter`**. A saved indicator and `Save` button sit in the header. New chapter: `/edit/chapter/create`.

## Dialogs

- **Enroll student**: "Add a student — Searches member names. Course staff and already-enrolled members are hidden." Lists community members, buttons `Cancel`, `Enroll`.
- **Add Staff Member**: member search, `Cancel`, `Add`.

## Editor test coverage (`course-editor.admin.spec.ts`)

| ID | Test |
|---|---|
| E-01 | All six nav links present and navigate to the right URL |
| E-02 | Curriculum shows chapter/lesson stats and the chapter in the left rail |
| E-03 | Drip shows the three release types and Save/Discard |
| E-04 | Staff lists the instructor and opens/closes the Add dialog |
| E-05 | Enrollments lists students and opens/closes the Enroll dialog |
| E-06 | Settings → General shows name/slug/level fields populated |
| E-07 | Each settings section loads at its URL with its heading |
| E-08 | Pricing shows existing price cards |
| E-09 | Chapter editor loads with Delete Chapter in the danger zone (not clicked) |
| E-10 | Preview opens the learner player with lesson navigation |

## Not covered (mutating)

Saving changes, adding/deleting chapters and lessons, saving drip schedule, enrolling/removing students, adding staff, changing prices or publish state. These change the shared community; add them later against a throw-away course with cleanup.
