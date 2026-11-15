# Lesstof on tablet: audit and fixes

Audit of 2026-11-15 of the lesstof screens against the v4 spec (§7, §8) and the designer's
handoff (`design-handoff/`, mock-ups 20, 23, 24), on fresh screenshots of every layout.

## Findings

| #   | Screen                                  | Finding                                                                                                                                                                                                                                                                                             | Kind                |
| --- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| F1  | Lesson, lesson pane, lesson sheet       | A table collapses when the lesson is longer than the screen: `.table-box` has `overflow-x: auto`, so as a flex item of the scrolling column its minimum height is 0 and it takes all the shrink. Seen on tablet-landscape and portrait-min (tables gone) and tablet-portrait (tables cut off).     | Bug                 |
| F2  | Screenshots, phone                      | The phone shots hide F1: `growToContent` grows the viewport until nothing overflows, so the tables get their height back. The CSS is the same on the phone, so F1 very likely happens there too. Not measured: a browser run outside `npm run screenshots` was denied.                              | Test gap            |
| F3  | Screenshots, compact                    | The compact project greps `lesson-sheet` only. The v4 spec §10 and CLAUDE.md say "lesson shots": `lesson-topics` and `lesson` are never rendered at 900 × 520.                                                                                                                                       | Test gap            |
| F4  | Lesson (tablet)                         | Only the body text grows (19/29). A worked line stays 18/30 and so is smaller than the body around it; labels stay 13. The mock-up has worked lines 22/34, labels 14, table head 15. The spec gives the body size only.                                                                             | Spec gap, decide    |
| F5  | Lesson (tablet)                         | The table is a bare, content-wide table. The mock-up draws it as a card over the full column: tinted head row, white rows, radius. Not in the spec.                                                                                                                                                  | Design gap, decide  |
| F6  | Lesson (tablet)                         | Mock-up extras that the spec does not have: the set name above the title, a bulb icon with an inline "Tip:", the back button at the screen edge (ours sits next to the column, which matches "in the left margin").                                                                                   | Design gap, decide  |

Checked and fine: the overview's Lesstof tab (tiles 4 × 3 and 3 × 4, greyed-out Tafels), lesson
topics (3 and 2 columns, header), the reading column (680, title aligned, back button), the
pane with the strip and "geopend", the sheet (720, strip, "Terug naar de som").

## Decisions for the user

| #   | Question                                                       | Recommendation                                                                                         |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| D1  | F4: scale the block sizes on tablet?                           | Yes, on the lesson screen only: worked 22/34, labels 14, table head 15. Pane and sheet keep their sizes |
| D2  | F5: the table as a card?                                       | Yes, on every layout (one look, less CSS per layout); the card scrolls sideways when a table is wide   |
| D3  | F6: set name above the title, tip icon, back button at the edge | No: sample content of the mock-up, and the spec chose otherwise                                        |

## Tasks

One commit per task. `npm test`, `npm run check` and the screenshots of the lesson shots after
each.

### 1. Guard against clipped blocks in the screenshot run (F2, F3)

- `screenshots/screens.spec.ts`: after the steps and before `growToContent`, assert that no
  `.table-box` is clipped vertically (`scrollHeight - clientHeight <= 1` for each). Runs for
  every project, so the phone sees the first viewport too.
- `playwright.config.ts`: the compact grep becomes `/question-|results-|lesson-|lesson$/`
  (`overview-lessons` stays out).
- Expected first: the run fails on `lesson` and `lesson-sheet` in every project (red).

### 2. Fix the collapsing table (F1)

- `src/components/LessonBlocks.svelte`: `.table-box { flex: none; }`.
- Expected: task 1's assertion passes in every project; the tables show on all tablet shots.

### 3. Block sizes on tablet (D1, only when accepted)

- Spec first: v4 spec §8, row "Lesson": add the worked, label and table head sizes.
- `LessonView.svelte`: set custom properties on `.content` for tablet
  (`--lesson-worked-size`, `--lesson-worked-line`, `--lesson-label-size`, `--lesson-head-size`);
  `LessonBlocks.svelte` reads them with the phone sizes as fallback. No layout selector in
  `LessonBlocks`, so pane and sheet stay as they are.

### 4. Table as a card (D2, only when accepted)

- Spec first: lesstof spec §3 (the table block) and v4 spec §8.
- `LessonBlocks.svelte`: `.table-box` gets the surface, border, radius and card shadow of
  `.worked`; `table { width: 100%; }`, the head row on `--primary-tint`, cell padding 12 16.
  Tokens only, no raw colours.
- Check on the phone shots of every lesson with a wide table (`getallen`: "Priemgetallen tot
  100") that the card still scrolls sideways instead of widening the column.

### 5. Docs

- CLAUDE.md: "Layout pitfalls" gets one line (a block with `overflow` inside a scrolling flex
  column needs `flex: none`); the compact line in the architecture block names the lesson shots.
- `git rm` this plan.
