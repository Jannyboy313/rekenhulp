# Rekenhulp v4 — tablet layouts and Design V3

Date: 2026-11-14. Status: approved and built 2026-11-14. Implements main spec §12.10.

Source: the Design V3 handoff of the designer (`design-handoff/HANDOFF.md` with a PNG and a static
HTML mock-up per screen). That folder is local only (gitignored, decided 2026-11-14), so this spec
holds every size and rule the code needs. While the folder exists it is the pixel reference for
radii, shadows and spacing that the tables below do not list. The mock-ups are static; rebuild
them with the app's own components and tokens, never copy their markup.

All sizes are CSS px. No new colour tokens: everything uses the tokens in `app.css`.

## 1. Goal

1. **Tablet layouts** for every screen, portrait and landscape (§3–§8). The phone layout stays.
2. **Four phone changes**, also on tablet (§9): the setup order, Ja/Nee without icons, a readable
   disabled OK, "Per onderwerp" as one card.
3. **Two behaviour additions** on every layout: reserved kladblok space (§5) and physical keyboard
   input (§6).

### Non-goals

Dark theme, new screens or features, iOS-specific work, a phone landscape layout (a phone in
landscape gets the notice of §3.3), a keyboard shortcut for Stop, keyboard navigation between the
kladblok and the answer field (tapping stays the only way, main spec §3.6).

## 2. Decisions

| #   | Question                         | Decision                                                                                                                                                              |
| --- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Orientation                      | Both; landscape is the primary tablet layout. The manifest no longer locks to portrait (§3.4).                                                                          |
| 2   | Play screen, landscape           | Two panes: kladblok, prompt and answer field left; keypad, kladblok tray or wrong panel right (§4.2).                                                                  |
| 2b  | Play without keypad, landscape   | One centred column: prompt, then a 720 × 360 box with the buttons (§4.3).                                                                                             |
| 2c  | Play screen, portrait            | One centred column of 560, the header aligned to it (§4.4).                                                                                                           |
| 3   | List screens                     | Tiles on the overview, centred columns elsewhere (§8).                                                                                                                |
| 4   | Scale                            | The play screen grows (§4.1). Lists keep their type sizes and gain columns.                                                                                           |
| 5   | Breakpoints                      | §3.1.                                                                                                                                                                 |
| 6   | Lesson from a mistake            | Landscape: replaces the left pane, no overlay. Portrait: a bottom sheet of 720 (§7). The update dialog is unchanged (centred, max 384).                               |
| 7   | Phone in landscape (2026-11-14)  | A notice instead of a broken play screen (§3.3).                                                                                                                      |
| 8   | Kladblok space (2026-11-14)      | Reserved on phone and tablet, as the handoff says (§5), also for Ja/Nee and multiple choice.                                                                          |
| 9   | Delivery (2026-11-14)            | One spec and one plan for everything; the build order of §11 keeps `main` deployable after every task.                                                                |

## 3. Layouts

### 3.1 Breakpoints

The layout follows from the viewport (CSS px, after system bars), checked in this order:

| Layout                     | Condition                                           | Notes                                                    |
| -------------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| `too-low`                  | width > height, and height < 520                    | The notice of §3.3.                                      |
| `tablet-landscape-compact` | width > height, width ≥ 900, height < 720           | 8" tablets (about 960 × 550). Landscape with small sizes. |
| `tablet-landscape`         | width > height, width ≥ 900                         | Two panes, centred lists.                                |
| `too-low`                  | width > height, height < 640                        | Landscape that is no tablet and too low for the column.  |
| `tablet-portrait`          | height ≥ width, and width ≥ 600                     | Centred columns, tablet sizes.                           |
| `phone`                    | anything else                                       | The current design: one column, max 480, centred.        |

- The handoff's "fallback" (phone landscape, split screen) is the `phone` layout: its column is
  already capped at 480 and centred. A landscape viewport of 600–899 wide and at least 640 high
  (split screen on a large tablet) gets it.
- 640 is what the phone column needs for the play screen with a kladblok row: header 64,
  kladblok 76, prompt 96 (its minimum), field and error line 88, keypad 316.
- The layout is re-evaluated on resize and on orientation change.
- **Rotation keeps all state:** the answer being typed, the active kladblok cell, the wrong
  panel, an open lesson, scroll positions of lists as far as the browser keeps them. A layout
  change therefore never remounts a screen: layouts differ in CSS and in which presentation a
  mounted component shows, not in which component tree `App.svelte` renders.
- When a layout change hides the active kladblok cell (fewer cells, §5.2), the answer field
  becomes active (the existing rule of main spec §3.6).

### 3.2 Resolver

- `lib/layout.ts`: `resolveLayout(width, height): Layout`, pure, with
  `Layout = 'phone' | 'tablet-portrait' | 'tablet-landscape' | 'tablet-landscape-compact' | 'too-low'`,
  and the helpers `isTablet` and `isLandscape`.
- One listener in `App.svelte` (window `resize`, which also fires on rotation) keeps the current
  layout in a small state module and writes it to `data-layout` on the root element. While the
  layout is `too-low`, `data-layout` keeps the last other layout, so the screen under the notice
  does not reflow.
- CSS keys on `[data-layout='…']`, not on media queries: the conditions of §3.1 combine width,
  height and orientation, and one resolver keeps CSS and script in step. Components that show a
  different presentation per layout (the lesson, §7; the kladblok cell count, §5.2; "Per
  onderwerp" open by default, §8) read the same state.
- The existing height queries of the kladblok (`SHORT_SCREENS`, `max-height` in
  `Scratchpad.svelte`) are replaced by `visibleCells(layout, height)` (§5.2), so there is one
  source for the cell count.

### 3.3 The "too low" notice

- Shown over every screen while the layout is `too-low`: the logo, the heading "Scherm te laag"
  and the text "Draai je apparaat of maak het venster groter.". No button.
- The screen underneath stays mounted with all its state and is `inert` and hidden from
  assistive technology. A running session keeps running: its clock is wall clock (main spec §3.5),
  and the time of the current exercise keeps counting. The wake lock stays.
- It is not a screen of the state machine: no history entry, the system back behaves as on the
  screen underneath. The update dialog is not shown while it is up.
- The notice is its own component (`RotateNotice`), a centred block of max 480 like the error
  screen.

### 3.4 Manifest and insets

- The manifest gets `orientation: 'any'`. Main spec §2 changes with it.
- Safe-area insets on all four edges: landscape adds `env(safe-area-inset-left)` and
  `env(safe-area-inset-right)` to the side padding of every screen (today only top and bottom are
  used).
- Reduced motion: the lesson pane and sheet appear without slide or scale, the correct bar is
  static (as today).

## 4. Play screen

The rules of main spec §3.3–§3.4 and §6 hold on every layout: the screen is exactly one screen
high and never scrolls as a page, only the prompt shrinks (minimum 96) and scrolls, every keypad
variant has the same total height, `⌫` is bottom left and OK fills the rest of the last row.

### 4.1 Sizes

"Tablet" is `tablet-portrait` and `tablet-landscape`; "compact" is `tablet-landscape-compact`. A
pair such as 13/20 is font size / line height; a triple is short / medium / long (the thresholds
of main spec §3.3 do not change).

| Element                               | Phone                                 | Tablet                          | Compact               |
| ------------------------------------- | ------------------------------------- | ------------------------------- | --------------------- |
| Header padding (top right bottom left) | 12 16 8 8                             | 16 40 12 28                     | 10 32 8 20            |
| Stop button                           | 44                                    | 48                              | 44                    |
| Header meta (set name, counter, time) | 13/20                                 | 17/20                           | 15/20                 |
| Progress bar                          | 6                                     | 8                               | 8                     |
| Key height (5 rows)                   | 56, or 52 in a kladblok session (§5.1) | 64                              | 52                    |
| Key gap                               | 8                                     | 10                              | 8                     |
| Keypad height                         | 312, or 292                           | 360                             | 292                   |
| Keypads of 4 rows                     | (height − 3 gaps) / 4                 | same rule                       | same rule             |
| Key label                             | 24                                    | 28                              | 24                    |
| Kladblok tray keys                    | 48, full-bleed tray                   | 60, tray padding 12, radius 20  | 48                    |
| Answer field                          | 56, text 30                           | 64, text 30, width 440          | 56, width 400         |
| Prompt → field gap (landscape)        | —                                     | 28                              | 28                    |
| Kladblok cells                        | 48, gap 8, 2–6 cells (§5.2)           | 56, gap 10, 6 cells             | 48, gap 8, 4 cells    |
| Sum                                   | 38 / 28 / 22                          | 64 / 56 / 44                    | 44 / 32 / 24          |
| Text question                         | 22/30                                 | 30/40                           | 24/32                 |
| Ja/Nee question                       | 34/42                                 | 56/66                           | 40/48                 |
| Multiple-choice question              | 22/30                                 | 44/54                           | 28/36                 |
| Prompt in the wrong state             | 44 / 32 / 24                          | 64 / 48 / 36                    | 48 / 36 / 28          |
| Ja/Nee buttons                        | 120                                   | 160                             | 120                   |
| Ja/Nee label (§9.2)                   | 26                                    | 32                              | 26                    |
| Multiple choice                       | 4 rows, one column (§5.1 for heights) | 2 × 2, 104 high, gap 16         | 2 × 2, 80 high        |
| Primary button                        | 56, text 17                           | 60, text 19                     | 56, text 17           |
| Landscape right pane                  | —                                     | 440                             | 400                   |
| Landscape body padding, pane gap      | —                                     | 8 40 32, gap 48                 | 4 32 20, gap 32       |

- The phone answer text stays 30 (the code wins over the handoff's 26, handoff §8).
- The tablet has no separate key height for sessions without a kladblok: keys are always 64.
- The kladblok tray keeps the total height of the keypad on every layout (on the phone by its
  19 px top margin; on tablet the tray is 5 × 60 + 4 gaps + 2 × 12 padding, and the plan checks
  that this equals the keypad height or adds the margin that makes it equal).

### 4.2 Landscape with a keypad

- Body: a row with two panes, padding and gap from §4.1, plus the safe-area insets.
- **Left pane** (flexible width), a column with gap 20: the kladblok on top (2 columns, as wide
  as the pane), then a block that takes the remaining height and centres the prompt with the
  answer field under it. The field is centred under the prompt at its fixed width; the inline
  error ("Ongeldig getal") sits under the field.
- **Right pane** (fixed width), bottom-aligned: only the keypad.
- **Correct:** the field under the prompt turns green with the ✓, the 4 px bar runs under it
  (600 ms); the keypad on the right is dimmed (40 % opacity, as today).
- **Wrong:** the kladblok and the field disappear; the wrong panel replaces the keypad in the
  right pane, bottom-aligned, at most as high as the pane (its content scrolls, **Verder** stays
  pinned). The prompt stays in the left pane, centred, in the wrong-state size with the red `?`.
- **Kladblok active:** "Tik hier voor je antwoord" sits where the field was; the tray is in the
  right pane.
- Known trade-off, accepted by the designer: the prompt is centred in the left pane here and
  centred on the screen in §4.3, so it moves horizontally between a keypad exercise and a Ja/Nee
  or multiple-choice exercise. Its vertical place does not change. Fallback if it bothers in
  use: put the Ja/Nee and choice buttons in the left pane under the prompt.

### 4.3 Landscape without a keypad (Ja/Nee, multiple choice)

- One centred column: the prompt centred in the free height, and under it a box of 720 × 360
  (compact: 720 × 292, the keypad height) whose content is bottom-aligned.
- Ja/Nee: two buttons side by side, 160 high (compact 120), gap 16, Nee left and Ja right.
- Multiple choice: a 2 × 2 grid, 104 high (compact 80), gap 16, in reading order.
- In a kladblok session the reserved kladblok space (§5.1) stays above the prompt, as wide as
  the left pane of §4.2 would be, so the prompt keeps its vertical place.

### 4.4 Portrait

- One centred column of 560; the header (Stop, meta, progress bar) is aligned to the same column.
- Top to bottom as on the phone: kladblok, prompt, field, keypad, with the tablet sizes of §4.1.
  The field is as wide as the column here (440 is its landscape width).
- Ja/Nee: two buttons of 160 in the column. Multiple choice: the 2 × 2 grid of 104.
- Wrong: the panel replaces the kladblok, field and keypad, bottom-aligned in the column.

## 5. Kladblok

### 5.1 Reserved space (every layout)

The prompt should not jump between exercises of one session.

- A session **uses the kladblok** when at least one step of one of its questions shows it
  (`showsScratchpad`, main spec §3.6). `lib/scratchpad.ts` gets
  `sessionUsesScratchpad(questions)`; `PlayScreen` computes it once per session. A Fouten
  oefenen session and a Gemengd session are sessions like any other.
- In such a session every step keeps the kladblok area at its height. On a step without a
  kladblok (Ja/Nee, multiple choice, a table exercise) the area is empty: `visibility: hidden`,
  `aria-hidden` and `inert`, so it cannot be tapped or focused.
- A session that never shows the kladblok (Tafels) reserves nothing and is as today.
- Phone consequence: in a kladblok session the keypad is always the 292 variant (keys 52), also
  on table exercises; and the multiple-choice options fill 292 instead of 312 (4 rows with a gap
  of 8, so 67 high). Ja/Nee buttons stay 120. `Keypad`'s `tall` follows the session, not the step.
- Accepted cost: a Ja/Nee or multiple-choice word problem has less room on a short phone, so
  its prompt scrolls sooner.
- The wrong state is unchanged: the panel takes the place of the kladblok too.

### 5.2 Cells per layout

| Layout                     | Cells                                                                       |
| -------------------------- | --------------------------------------------------------------------------- |
| `phone`                    | 6 from a height of 816, 4 from 760, else 2 (unchanged, main spec §3.6)      |
| `tablet-portrait`          | 6                                                                           |
| `tablet-landscape`         | 6                                                                           |
| `tablet-landscape-compact` | 4                                                                           |

`visibleCells(layout, height)` in `lib/scratchpad.ts` is the single source; the reserved area of
§5.1 has the height of the visible cells.

## 6. Physical keyboard

For tablets in a keyboard cover. Active on every layout while the play screen is shown; the
system keyboard is never opened.

| Physical key                         | Action                                                              |
| ------------------------------------ | ------------------------------------------------------------------- |
| `0`–`9`                              | the digit; in multiple choice `1`–`4` choose option 1–4             |
| `a`–`f`                              | A–F (baseDigits), case-insensitive                                  |
| `i` `v` `x` `l` `c` `d` `m`          | the Roman digit, case-insensitive                                   |
| `,` and `.`                          | decimal comma                                                       |
| `-`                                  | minus                                                               |
| `+`                                  | plus                                                                |
| `*` and `x`                          | `×`                                                                 |
| `:`                                  | `:` (divide)                                                        |
| `/`                                  | the breuk key when the keypad has one, otherwise `:` (§12, item 1)  |
| `(` `)` `^` `=`                      | the same key                                                        |
| Space                                | the spatie of the kladblok keypad                                   |
| Backspace                            | `⌫`                                                                 |
| Enter                                | OK; on the wrong panel **Verder**                                   |
| Escape                               | closes the open lesson; otherwise nothing (no accidental Stop)      |
| `j` / `n`                            | Ja / Nee                                                            |

Rules:

- A key acts only when the keypad on screen has the matching key and that key is enabled;
  anything else is ignored. So `x` is `×` on the expression keypad and X on the Roman keypad (no
  keypad has both), and `c` does nothing on the number keypad.
- While a kladblok cell is active the kladblok keypad is the keypad on screen: keys type into the
  cell, and Enter does nothing (that keypad has no OK).
- Enter submits exactly as a tap on OK: an empty input does nothing, invalid input shows the
  inline error.
- Ignored: any key with Ctrl, Alt or Meta (browser shortcuts keep working), every key in the
  correct state (the 600 ms before auto-advance) and, except Escape, every key while a lesson is
  open. A held key repeats, except Enter.
- When a button has keyboard focus, Enter and Space keep their native meaning (activate that
  button) and are not also handled as OK or spatie. The exceptions are the typing
  surfaces, which keep the focus after a tap: on a keypad key Enter is OK (not that key again),
  and on a kladblok cell Space is the spatie while a cell is active.
- The Enter that submits a wrong answer does not also press **Verder**: one key press is one
  action.
- The key on screen shows its pressed state for 100 ms, so the input is visible.
- Code: `lib/physicalKeys.ts`, a pure `keyFor(key, available)` that maps a `KeyboardEvent.key` to
  a `KeypadKey`, `'ok'` or nothing, given the keys of the keypad on screen. `KeypadAnswer` owns
  the listener for keypad steps, `QuestionView` for Ja/Nee and multiple choice, `PlayScreen`
  for Enter on the wrong panel and Escape (it knows whether a lesson is open). The pressed state is a prop of `Keypad`.

## 7. Lesson from a mistake

Lesstof spec §3.1 keeps holding (mapping, button, several lesson topics, the session stays
mounted, the clock keeps running). The phone sheet does not change. New on tablet:

**Both tablet presentations**

- A strip **Je som** shows the exercise the user got wrong: the label "Je som" (13, weight 700,
  `--muted`) and the prompt in its wrong state (22, weight 800, the slot as a red `?`), on
  `--surface` with a `--border` line, radius 14, padding 10 16. Question text (a prompt without a
  slot) is 16/22 there. A prompt that does not fit takes at most two lines and is then cut with
  an ellipsis; the full prompt is back after closing.
- The header shows a book icon, a small line "Les · <name of the lesson's set>" and the topic
  title, with the ✕ (aria-label **Sluiten**).
- Which presentation shows follows the layout (§3.2). `PlayScreen` keeps owning the open lesson,
  so a rotation swaps the presentation and the lesson stays open.

**Landscape: in the left pane**

- The lesson replaces the content of the left pane (kladblok area and prompt): the strip on top,
  under it the lesson as a card that fills the pane and scrolls inside (body 17/26, padding
  20 28). No scrim, no overlay, not modal.
- The wrong panel stays in the right pane and stays usable. The button of the open lesson is
  marked: a `--sky` outline and the word "geopend" (13, weight 600) before the chevron, with
  `aria-expanded="true"`.
- Close: ✕, a tap on the same lesson button, Escape or the system back; the prompt is back in
  the left pane and focus returns to the lesson button. A tap on another lesson button swaps the
  lesson. **Verder** closes the lesson and moves on.
- On open, focus moves to the lesson's heading, so a screen reader starts reading there.

**Portrait: bottom sheet**

- The existing sheet (modal `<dialog>`, scrim, max 85 % of the height), 720 wide and centred,
  with all four top-level parts in this order: header, the strip, the blocks (body 18/27,
  padding 20 32, scrolling), and pinned at the bottom the primary button **Terug naar de som**,
  which closes like ✕.
- No drag handle: the sheet cannot be dragged (lesstof spec §3.1), and a handle would promise it.
  The mock-up draws one; it is left out.

Code: the lesson UI stays in lesson components (lesstof spec §4). `LessonSheet` gets the strip
and the button for the tablet; a new `LessonPane` is the landscape presentation; `LessonLinks`
gets the "geopend" mark. `PlayScreen` and `Feedback` still only pass lesson data through.

## 8. List screens

Lists keep the phone's type sizes unless a size is given. "Column n" is a centred column of at
most n wide. Every screen keeps its header on top and its pinned buttons at the bottom. The
lesson scrolls over the whole width of the window, so a swipe in the margin next to its reading
column scrolls too.

| Screen                      | Landscape                                                                                                                                                                                                 | Portrait                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Overview (Oefenen, Lesstof) | Header: logo 56, title 34. Tabs 420 wide, left-aligned. Tiles 4 × 3 that fill the height (rows `1fr`): glyph tile 52 and the name (18/23) on one line, the description (14/20) under it; padding 16 18, radius 20 | Tiles 3 × 4                                           |
| Update dialog               | Unchanged: centred, max 384, scrim                                                                                                                                                                        | Same                                                  |
| Setup, "Wat zit erin"       | Column 800: the "Wat zit erin" card with the topics in 3 columns (name 16/20 bold, detail 14/18 under it), then Aantal opgaven (3fr) and Niveau (2fr) side by side; Start pinned at the bottom of the column | Column 640: topics in 2 columns, Aantal and Niveau stacked |
| Setup, Tafels               | Column 800: pills 7 per row (60 high, label 24), Aantal opgaven, Start                                                                                                                                    | Column 640: 5 per row                                 |
| Setup, Gemengd              | Column 800: set pills wrap, Aantal opgaven and Niveau side by side, Start                                                                                                                                 | Column 640                                            |
| Results                     | Left 400: score card, "Per onderwerp" (open by default), a spacer, the pinned buttons. Right: "Fouten · n" in one column of max 680 that scrolls. Without mistakes the right side shows "Alles goed!"      | Column 640, as on the phone                           |
| Lesson topics               | Rows in 3 columns                                                                                                                                                                                         | 2 columns                                             |
| Lesson                      | Reading column 680: the header title aligned to the column, the back button in the left margin, body 19/29                                                                                                | Same, column ≤ 640                                    |
| Error, "too low" notice     | Centred block, max 480                                                                                                                                                                                    | Same                                                  |

- **Setup order on tablet:** the single column keeps "Wat zit erin" first, then the settings
  (everything fits without scrolling); §9.1 changes the order on the phone only. Portrait
  follows the landscape order. This is a visual order (CSS `order`): the DOM, and so a screen
  reader, keeps the phone's order with the settings first. The list is not interactive, so the
  focus order is the same in both.
- **Overview with fewer rows:** the Lesstof tab has eleven tiles; the grid keeps its 4 × 3 (or
  3 × 4) cells and the last cell stays empty. A greyed-out set is a greyed-out tile.
- **A list longer than the screen** scrolls inside its column as on the phone (a "Wat zit erin"
  card on a compact tablet, a long lesson). A row of tiles is never lower than its content, with
  a minimum of 120; when the grid does not fit, it scrolls.
- **Lesson blocks** on the lesson screen grow with the body: a worked line 22/34, the labels
  ("Tip", a worked title) 14, a table head 15, table cells padded 12 16. The pane and the sheet
  (§7) keep the phone's block sizes.
- **A small tablet in portrait** (narrower than 720): the three tiles per row are too narrow for
  a name next to the glyph, so the name goes under the glyph (17/22) and the side padding of the
  overview is 20. Found on the 600 × 960 screenshots: names broke inside a word.
- **"Per onderwerp"** is open by default when the results screen mounts in `tablet-landscape`
  and closed otherwise (also in compact, where the left column has no height for it); after
  that the user's choice holds, also through a rotation. When the open card does not fit the
  left column, it scrolls inside.
- Compact landscape uses the landscape column of this table. Besides the play screen, only the
  results have compact sizes: padding 16 32, column gap 32 and buttons of 56, so the left column
  fits from a height of 520.
- `SetRow` stays the shared row of both overview lists (lesstof spec §4); the tile is its tablet
  presentation.

## 9. Phone changes (also on tablet)

1. **Setup order** (sets with "Wat zit erin"): Aantal opgaven → Niveau → "Wat zit erin" → Start
   (pinned). The settings are reachable without scrolling; the topic list is informational and
   comes last. Tafels and Gemengd keep their order (selection → Aantal opgaven → Niveau). Phone
   only: the tablet order is in §8.
2. **Ja/Nee without icons:** text only, no ✕ and ✓ (those mean wrong and correct elsewhere).
   Label 26 on the phone, 32 on tablet, weight 800. Button sizes unchanged.
3. **Disabled OK:** keeps the `--primary-disabled` fill; its label becomes `--primary-dark`
   instead of white (contrast about 1.6 : 1 → 5.5 : 1). Enabled OK is unchanged.
4. **"Per onderwerp" on the results:** one card (`--surface`, `--border`, radius 20, card shadow,
   padding 0 16 0 20) with a header button of 56 high, "Per onderwerp" and a chevron that points
   down; expanded, the topic rows are inside the same card and the chevron points up. It stays a
   native `<details>`; the rule for one topic (no card) and "collapsed by default" on the phone
   do not change.

Where the phone mock-ups and the code disagree on anything else, the code wins: the phone
screens of the handoff are a redraw, not a redesign.

## 10. Testing

- `lib/layout.ts`: a table of viewports → layout, with every boundary of §3.1 (599/600 wide,
  899/900 wide, 519/520, 639/640 and 719/720 high, square) and the reference sizes 360 × 780,
  600 × 960, 960 × 600, 800 × 1280, 1280 × 800, 780 × 360.
- `lib/physicalKeys.ts`: a table of key × keypad → action, including the ignored cases of §6.
- `lib/scratchpad.ts`: `sessionUsesScratchpad` (Tafels, a mixed session, Ja/Nee only) and
  `visibleCells` per layout and height.
- Component tests: the setup order, Ja/Nee without icons, the "Per onderwerp" card, the reserved
  area being hidden and inert, a rotation that keeps typed input and an open lesson, Enter and
  digits from the keyboard, Escape closing the lesson pane, the notice keeping the session.
- `npm run screenshots`: a folder per layout. Phone as today (360 × 780, growing to content).
  Every shot also at 1280 × 800, 800 × 1280 and 600 × 960 (the narrowest tablet), and the play,
  lesson and results shots at 900 × 520 (the lowest landscape tablet), all at a fixed viewport:
  growing the height would change the layout. A scene for the notice.
- Final check by eye on the PNGs at 600 × 960, 900 × 520, 800 × 1280 and 1280 × 800, and that
  the phone shots at 360 are unchanged apart from §5 and §9.
- `npm run smoke` before the push that changes the manifest.

## 11. Build order

One plan, one commit per task, `main` deployable after each: a screen that is not converted yet
keeps the phone column on a tablet.

1. The phone changes of §9.
2. Reserved kladblok space (§5.1).
3. Physical keyboard (§6).
4. Framework: `lib/layout.ts`, the state module, `data-layout`, `visibleCells` replacing the
   height queries, tablet viewports in `npm run screenshots`. No visible change.
5. Play screen portrait and the tablet sizes (§4.1, §4.4).
6. Play screen landscape and compact (§4.2, §4.3).
7. The lesson on tablet (§7).
8. List screens (§8): overview, setup, results, lesson topics, lesson, error.
9. The notice (§3.3), the manifest (§3.4), the side insets, and the documentation of §13.

## 12. Confirmed assumptions

Confirmed in review on 2026-11-14: the default of each item is the decision.

1. **Physical `/`:** the handoff maps `/` to divide. Default here: `/` is the breuk key when the
   keypad has one (fraction answers, the kladblok), otherwise `:`; `:` is always divide. Typing
   `3/4` then gives a fraction, and the kladblok keeps a way to type both.
2. **The notice covers every screen**, not only the play screen, and uses the thresholds 520 and
   640 of §3.1. The lists would still work in a low landscape viewport; one rule is simpler.
3. **Ja/Nee in the correct state** shows no ✓ once the icons are gone: the chosen button turns
   green and the other is dimmed, exactly as multiple choice does today. Main spec §2 says colour
   is never the only signal; the alternative is a ✓ on the chosen button in both.
4. **No drag handle** on the portrait sheet (§7).
5. **Screenshots:** every shot at both tablet sizes (about 3 × the PNGs and run time of today).
   The alternative is only the screens the handoff drew.

## 13. Changes to other documents

Made in the task that changes the behaviour, so spec and code never disagree on `main`:

- Main spec §2: the manifest orientation, "Mobile UX requirements" (layouts, a pointer to this
  spec, insets on all edges, the physical keyboard next to "the system keyboard is never used").
- Main spec §3.2 (setup order), §3.5 ("Per onderwerp" card), §3.6 (reserved space, cells per
  layout), §6 (Ja/Nee without icons, the disabled OK, option heights), §10 (screenshots),
  §12.10 (done, pointer).
- Lesstof spec §3.1 and §4: the strip, the pane, "geopend", **Terug naar de som**.
- `CLAUDE.md`: this spec in the reading list, Status, the roadmap row of v4, the architecture
  entries (`layout.ts`, `physicalKeys.ts`, `RotateNotice`, `LessonPane`), "Mobile UX" notes on
  screenshots per layout.
