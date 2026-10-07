# Courses — building a full course (admin, writes data)

Spec: [tests/courses/course-create.admin.spec.ts](../tests/courses/course-create.admin.spec.ts) · page object: [pages/CourseBuilder.ts](../pages/CourseBuilder.ts)
Related: [admin](courses-admin.md) · [course editor](courses-editor.md)

Run it: `npm run test:write` (tagged `@write`, **excluded from `npm test` and `npm run smoke`** because it changes the live community).
Watch it: `npm run test:write -- --headed` (it already uses one worker and one browser window).

## What it builds

A **Draft** course called `Automation Test Course` (invisible to members and guests) with **1 chapter** (`Chapter 1 - All Lesson Types`, Published) and **7 lessons**, one per lesson type, each using different features:

| Lesson | Type | Media | Body | Settings | Resource |
|---|---|---|---|---|---|
| Video lesson | Video | an existing processed video from the gallery | description | Free preview, Allow download | `sample-resource.pdf` |
| Text lesson | Text | – | content (rich text) | Prerequisite | – |
| Audio lesson | Audio | `sample-audio.wav` | description | Enable discussions **off** | – |
| PDF lesson | PDF | `sample.pdf` | description | Free preview | `sample-resource.pdf` |
| Slides lesson | Slides | `sample-slides.pptx` | description | – | – |
| Download lesson | Download | `sample-download.zip` | description | – | – |
| Embedded lesson | Embedded | link `https://www.youtube.com/watch?v=jNQXAC9IVRw` | description | – | – |

Steps: S-00 delete leftovers → S-01 create course (name, description, thumbnail, Draft) → S-02 create chapter → S-03 add each lesson → S-03b reopen every lesson and check name, body and all five switches were saved → S-04 curriculum shows `1 ch · 7 lessons` and the chapter page lists every lesson → S-05 admin preview (player) lists all 7 → S-06 course card shows `Draft` → S-07 delete the course **only if** `CLEANUP_TEST_COURSE=1`.

By default the course is **kept** so you can look at it. The next run deletes it (S-00) and builds a fresh one, so there is never more than one.

## How the UI works (for maintainers)

- **Create Course** modal → thumbnail: `Select Image` opens the *Upload From Gallery* dialog (not a file chooser). Upload into it, `Select`, then a `Crop thumbnail` dialog needs `Apply`.
- **Chapter**: `/courses/<slug>/edit/chapter/create` → `#name`, `Draft`/`Published` toggle, `Create`. The app then lands on `/edit/chapter/<id>/lesson/create`.
- **Lesson form**: `#name`, type buttons (Video, Text, Audio, PDF, Slides, Download, Embedded), media area (`Browse files` → gallery), rich-text editor (`.tiptap.ProseMirror`, "Content" for Text, "Description" otherwise), five switches in this order: Prerequisite, Free preview, Enable discussions (default **on**), Allow download, Motivational popup; `Downloadable resource` (`Browse files`, last on the page); `Create` saves.
- **Embedded** lessons have `#url` (and an Iframe / HTML radio) instead of a media upload.
- **Delete course**: card menu `Course actions` → `Delete course` → type `DELETE` → `Delete`. The test only deletes courses titled exactly `Automation Test Course`.
- The gallery accepts: images (jpg, png, gif, webp, svg), documents (doc, docx, pdf, xls, xlsx, ppt, pptx, zip, gz, fonts), video (mp4, mov, ...). **`.txt` is not accepted.**

## Things worth knowing

1. **Slugs are not reusable.** A deleted course keeps its slug reserved, so the new course gets `automation-test-course-2`, ... and later `automation-test-course-<hash>`. The spec reads the slug from the URL after creating.
2. **Video uploads never finish processing.** Uploaded videos go to an external video service (Bunny) and my small test clip stayed in "Processing..." for good; a processing video cannot be selected. The video lesson therefore picks an existing processed video in the gallery. If the gallery has no processed video, S-03 (Video) fails.
3. **The shared media gallery collects files.** Each run uploads a thumbnail (twice, original + crop), audio, PDF(s), a deck and a zip. They are named `thumbnail.png`, `sample-*.…`. Clean them from the gallery occasionally.
4. **The saved login expires quickly** (about 15 minutes) and stops working after that, because the site rotates the refresh token. `npm run test:write` and `npm test` log in again every run; only ad-hoc scripts that reuse `.auth/user.json` hit this.
5. **First load can hang** on this app (page never hydrates). The page objects reload once if a page has not rendered after 15 s.

## Fixtures

`fixtures/files/`: `thumbnail.png` (generated), `sample.pdf` and `sample-resource.pdf` (generated, minimal), `sample-audio.wav` (generated 1 s tone), `sample-download.zip` (generated), `sample-slides.pptx` (public "Free Test Data" sample, 1 MB).
