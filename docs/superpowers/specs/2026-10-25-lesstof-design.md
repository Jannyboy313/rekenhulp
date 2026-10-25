# Lesstof — Design Spec

- Started: 2026-10-25
- Status: living spec for the study material (lesstof). The main spec
  (`2026-10-05-rekenhulp-design.md`) stays the source of truth for everything else, incl. the
  number conventions (§8) and the entry points to the lesstof (§3, §3.1). Decision history
  is in git.

## 1. Goal

A cheat sheet per practice set, to refresh a method before practising, aimed at the LKT and the
RWT. It is read on demand, never part of a session.

- One lesson per practice set, named like the set (Getalbegrip → lesson Getalbegrip).
- A lesson consists of **lesson topics**. The user opens one topic to read; nothing walks
  through the topics in sequence (no "next", no progress).

### Non-goals

- No persistence of any kind: no "read" marks, no last-opened topic (main spec §1).
- No exercises, interaction, images or network inside a lesson.
- No didactics (main spec §12.3): the lesstof explains arithmetic methods only.
- No link from a session or the feedback panel to a lesson (for now).

## 2. Build order

1. **Framework** (this spec, §3–§6): data model, checks, screens, tabs, navigation. Ships with
   no lessons.
2. **Content per set**, one set per session, Tafels first, then the sets in the order of
   `PRACTICE_SETS`. Each set adds its section to §7 (topics, examples) before its content is
   written.

## 3. Navigation

States in `App.svelte` (main spec §3), next to `sets → setup → playing → results`:

- `lessonTopics` (set, lesson, return target): the topic list of one lesson.
- `lesson` (set, lesson, topic, return target of its topic list): one topic.

Entry point: the **Lesstof tab** on the overview (main spec §3.1). It lists **all** practice
sets, in `PRACTICE_SETS` order, with the same glyph, name and description as **Oefenen**. A set
with a lesson is a normal row and opens `lessonTopics`; a set without a lesson is shown greyed
out and disabled (the global disabled style, `disabled` attribute, not focusable).

**Linking is supported, not used yet.** `lessonTopics` carries the screen to return to, so a
later entry point (e.g. a button on the setup screen) only has to open it with its own screen as
return target; the lesson screens do not change. No such entry point is built now: the practice
screens (setup, playing, results) stay untouched.

Back:

- **Terug** on `lesson` → `lessonTopics` of the same set.
- **Terug** on `lessonTopics` → its return target; for now always `sets`, with the Lesstof tab
  still active.
- The **system back** does what Terug does and never closes the app (main spec §3). Because both
  lesson states are off `sets`, the back-guard entry consumed by a `popstate` must be pushed
  again whenever the new screen is still off `sets`.

## 4. Screens

- **Overview tabs:** a segmented control **Oefenen | Lesstof** under the title, `role="tablist"`,
  two `role="tab"` with `aria-selected`, arrow keys move between them. Default **Oefenen**; the
  active tab lives in `App.svelte` memory only.
- **Code separation:** the lesstof is its own part of the app, not mixed into the practice
  code. Lesson screens and lists are their own components (`LessonSetList`, `LessonTopicList`,
  `LessonView`); practice components get no lesson props or branches; `lib/lessons/` does not
  extend `PracticeSet` or `lib/sets.ts` (it only reads the sets to link a lesson by `setId`).
  Shared pieces are purely presentational: the overview shell (header + tabs) that renders
  either list, and the set row (glyph tile, name, description, chevron, `disabled`) used by both
  lists. `App.svelte` stays the single state machine, with the lesson states as their own
  branches.
- **`lessonTopics`:** header like the setup screen (back button with aria-label **Terug**, glyph
  tile, set name), then one row per topic with its title and a one-line summary, in the row style
  of the overview. Scrolls when long.
- **`lesson`:** header with the back button and the topic title, then the blocks (§5), scrolling
  as one page, respecting the safe-area insets.

## 5. Data model

Typed data in `src/lib/lessons/`, one module per set, registered in `lib/lessons/index.ts`.
Kept free of Svelte imports (CLAUDE.md).

```ts
type LessonBlock =
  | { type: 'text'; text: string }                        // a paragraph
  | { type: 'worked'; title?: string; lines: string[] }   // each line an equality chain
  | { type: 'table'; head: string[]; rows: string[][] }   // a small table
  | { type: 'tip'; text: string };                        // a highlighted rule of thumb

interface LessonTopic { id: string; title: string; summary: string; blocks: LessonBlock[] }
interface Lesson { setId: string; topics: LessonTopic[] }

const LESSONS: readonly Lesson[];                          // empty until §7 adds content
function lessonFor(set: PracticeSet): Lesson | undefined;
```

- A lesson belongs to a set by `setId`. Its topics are its own and need not match the set's
  practice topics (Tafels has one practice topic and will have several lesson topics).
- Rendering: all text goes through `MathText`, so stacked fractions, mixed numbers and the slot
  work as in prompts. Text follows the number conventions of main spec §8 (decimal comma, thin
  space thousands separator, `×` and `:`, `−`, the `SLOT` marker for an unknown).

## 6. Checks (tests)

- Every `lesson.setId` is the id of a set in `PRACTICE_SETS`; topic ids are unique within a
  lesson; a lesson has at least one topic and every topic at least one block.
- **Parity:** the sets without a lesson equal an explicit list in the test. Adding a lesson
  shortens the list; at the end it is empty and every set has a lesson.
- **Worked examples are correct:** every line of a `worked` block is an equality chain
  (`13 × 7 = 10 × 7 + 3 × 7 = 70 + 21 = 91`); each side is parsed and evaluated with `lib/expr`
  and all sides must be equal. A line without ` = ` or with an unparsable side fails.
- Text uses no ASCII operators (`*`, ` x `, `/` as division) and no literal `?` in a `worked`
  line.
- The framework itself is tested with a fixture lesson in the tests, since `LESSONS` is empty.

## 7. Content per set

Added per set in its own session (§2). None yet.

## 8. Open assumptions

- **Block types:** `text`, `worked`, `table` and `tip` are assumed to be enough. A bullet list
  is left out until a lesson needs it.
