# Subject page file listing improvements

Date: 2026-08-17

## Goals

1. Remove commit-note text from grid-view file cards.
2. Show New/Updated banners on individual file cards on the subject page, matching homepage subject-card banner style and logic (only the subject's `newestAdded`/`newestUpdated` file gets one).
3. Add a grid/list view toggle. List mode shows columns: Name, Release date, Date modified, Commit note.
4. Add filtering: status (All/New/Updated), name search, date range — combinable, client-side, reset on semester switch.

## Data changes

`FileEntry` gains `firstCommitDate: string`.

`lib/github.ts`: `fetchLastCommitPerFile` already walks the last 100 commits newest-first per file for the *last* commit. Extend it to also track the *earliest* seen date per file within that same walk (no extra API calls). If a file's true first commit is outside the 100-commit window, `firstCommitDate` falls back to `lastCommitDate` (list view then shows "–" for Date modified, matching the "same date → blank" rule).

## Component changes

- `FileCard.tsx`: drop the `.note` (`lastCommitMessage`) paragraph from grid rendering. Accept an optional `banner?: "new" | "updated"` prop to render a small banner strip (reusing `.bannerNew`/`.bannerUpdate` visual language from `SubjectCard.module.css`, scaled for card width).
- `SemesterTabs.tsx`:
  - Own view-mode state (`grid` | `list`), toggle button pair in the header row.
  - Own filter state: status pill group, text search input, date-from/date-to inputs. Filters recompute the visible file list from `current.files`; reset to defaults on semester change (tab click).
  - Pass `banner` prop to the `FileCard` whose `path` matches `subject.newestAdded`/`subject.newestUpdated` (subject passed down as new prop, or newestAdded/newestUpdated paths passed down from `page.tsx`).
  - List mode renders a new `FileListRow` (or inline table row) per file: Name | Release date | Date modified | Commit note, plus Preview/Download/GitHub actions carried over from `FileCard`'s actions row.
- `app/subject/[name]/page.tsx`: pass `subject.newestAdded?.path` / `subject.newestUpdated?.path` down to `SemesterTabs`.

## Out of scope

- Server-side/URL-persisted filter state.
- Sorting controls beyond existing default (newest-first).
