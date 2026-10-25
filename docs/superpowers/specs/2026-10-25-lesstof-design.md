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
2. **Content per set**, developed separately from the practice sets and outside the main
   roadmap (main spec §12): no fixed order, one set at a time, only when the user asks. Each set
   adds its section to §7 (topics, examples) before its content is written.

A new practice set appears greyed out on the Lesstof tab by itself (§3) and needs no lesson.

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
  practice topics (Tafels has one practice topic but could have several lesson topics).
- Rendering: all text goes through `MathText`, so stacked fractions, mixed numbers and the slot
  work as in prompts. Text follows the number conventions of main spec §8 (decimal comma, thin
  space thousands separator, `×` and `:`, `−`, the `SLOT` marker for an unknown).

## 6. Checks (tests)

- Every `lesson.setId` is the id of a set in `PRACTICE_SETS`, at most one lesson per set; topic
  ids are unique within a lesson; a lesson has at least one topic and every topic at least one
  block.
- No test requires a set to have a lesson: adding a practice set never touches lesson code.
- **Worked examples are correct:** every line of a `worked` block is an equality chain
  (`13 × 7 = 10 × 7 + 3 × 7 = 70 + 21 = 91`); each side is parsed and evaluated with `lib/expr`
  and all sides must be equal. Fractions (`3/4`) and thin-space grouped numbers (`2 500`) are
  allowed; a line without ` = `, with a mixed number or with an unparsable side fails.
- Text uses no ASCII operators: no `*`, no `x` between numbers, no `/` with spaces around it
  (`km/u` and `3/4` are fine). A `worked` line has no literal `?` and no ASCII `-` as minus.
- The framework itself is tested with a fixture lesson in the tests, since `LESSONS` is empty.

## 7. Content per set

Added per set in its own session (§2). Worked lines below are pure equality chains (§6); words,
`√` and "GGD van" go in text blocks or the worked block's title.

### 7.1 Getallen & delers (`getallen`)

Eight topics, ordered so each builds on the previous one (divisibility before primes, primes
before factorization, factorization before GGD and KGV). The methods match the explanations of
the practice topics (main spec §5.2–§5.7).

1. **`digitRules` — Deelbaarheid aan de cijfers** (summary: `2, 3, 4, 5, 8, 9 en 11`)
   - Table `Deler | Kijk naar | Deelbaar als`: 2 and 5 last digit; 4 last two digits; 8 last
     three digits; 3 and 9 cijfersom; 11 alternerende som (starting with `+` at the leftmost
     digit) is a multiple of 11 (0 counts).
   - Worked `2718 en 9`: `2 + 7 + 1 + 8 = 18`, `2718 = 9 × 302`.
   - Worked `9174 en 11`: `9 − 1 + 7 − 4 = 11`, `9174 = 11 × 834`.
   - Tip: a cijfersom you are unsure of: take the cijfersom again (`18 → 1 + 8 = 9`).
2. **`combinedRules` — Deelbaarheid door 6, 12, 14 en 15** (summary: `Twee regels tegelijk`)
   - Text: split the divisor into two factors without a common divisor and check both.
   - Table `Deler | Factoren`: `6 | 2 × 3`, `12 | 3 × 4`, `14 | 2 × 7`, `15 | 3 × 5`.
   - Text example: `1246` is even, but cijfersom `1 + 2 + 4 + 6 = 13` → not by 3 → not by 6.
   - Tip: `12 = 2 × 6` does not work: 2 and 6 share 2. `18` is divisible by 2 and by 6, not by 12.
3. **`chunking` — Deelbaarheid door 7 en 13** (summary: `Happen in veelvouden`)
   - Text: there is no digit rule; take off big multiples you know (`7 × 300`, `7 × 80`) until a
     small remainder is left.
   - Worked `2716 en 7`: `2716 = 2100 + 560 + 56`, `2716 : 7 = 300 + 80 + 8 = 388`.
   - Text: `2718 = 2100 + 560 + 56 + 2` → remainder 2, not divisible.
   - Worked `1859 en 13`: `1859 = 1300 + 520 + 39`, `1859 : 13 = 100 + 40 + 3 = 143`.
4. **`primes` — Priemgetallen** (summary: `Precies twee delers`)
   - Text: a prime has exactly two divisors, 1 and itself. 1 is not a prime; 2 is the only even
     prime.
   - Text: to test `n`, divide by the primes whose square is at most `n`. For `151`: 2, 3, 5, 7
     and 11, because `13² = 169` is more than 151. None divides, so 151 is prime.
   - Table `Priemgetallen tot 100`, one row per ten (`0–9 | 2, 3, 5, 7`, …, `90–99 | 97`).
   - Table `Lijkt priem, is het niet` with the hard composites under 200 (not divisible by 2, 3
     or 5): `49 = 7²`, `77 = 7 × 11`, `91 = 7 × 13`, `119 = 7 × 17`, `121 = 11²`,
     `133 = 7 × 19`, `143 = 11 × 13`, `161 = 7 × 23`, `169 = 13²`, `187 = 11 × 17`.
   - Tip: below 200, a number not divisible by 2, 3 or 5 is prime unless it is in this table.
5. **`factorization` — Ontbinden in priemfactoren** (summary: `De deelladder`)
   - Text: divide by the smallest prime that fits, again and again, until a prime is left;
     write repeated factors as a power.
   - Worked `84`: `84 = 2 × 42 = 2 × 2 × 21 = 2 × 2 × 3 × 7 = 2² × 3 × 7`.
   - Worked `180, met een makkelijke splitsing`: `180 = 18 × 10 = 2 × 9 × 2 × 5 = 2² × 3² × 5`.
   - Tip: 1 is not a factor; check by multiplying back.
6. **`gcd` — GGD** (summary: `Grootste gemeenschappelijke deler`)
   - Text: the largest number that divides both; at most the smaller number.
   - Worked `84 en 126`: `84 = 2² × 3 × 7`, `126 = 2 × 3² × 7`, `2 × 3 × 7 = 42`, with text:
     take the primes in both, each with its lowest power.
   - Text, difference method: the GGD also divides the difference. `126 − 84 = 42` and 42
     divides 84, so GGD = 42. Otherwise repeat with the smaller number and the difference:
     120 and 72 → 48; 72 and 48 → 24; 24 divides 48, so GGD = 24.
   - Tip: if the smaller number divides the larger, it is the GGD. No common prime → GGD = 1.
7. **`lcm` — KGV** (summary: `Kleinste gemeenschappelijke veelvoud`)
   - Text: the smallest number both divide; at least the larger number.
   - Text, counting up: walk the multiples of the larger number until the smaller divides it:
     12 and 18 → 18 no, 36 yes.
   - Worked `12 en 18, met priemfactoren`: `12 = 2² × 3`, `18 = 2 × 3²`, `2² × 3² = 36`, with
     text: every prime that occurs, with its highest power.
   - Worked `12 en 18, via de GGD`: `12 × 18 : 6 = 216 : 6 = 36`.
   - Table `GGD | KGV`: `deler van allebei | veelvoud van allebei`, `hoogstens het kleinste getal
     | minstens het grootste getal`, `laagste macht van gedeelde priemen | hoogste macht van alle
     priemen`.
   - Tip: no common divisor (GGD 1) → KGV = the product: `8 × 15 = 120`.
8. **`squares` — Kwadraten en wortels** (summary: `11² tot en met 25²`)
   - Table `n | n²` for 11 to 25.
   - Worked `Tientallen afsplitsen`: `17² = 17 × 10 + 17 × 7 = 170 + 119 = 289`,
     `23² = 23 × 20 + 23 × 3 = 460 + 69 = 529`.
   - Worked `Eindigt op 5`: `15² = 1 × 2 × 100 + 25 = 225`, `25² = 2 × 3 × 100 + 25 = 625`, with
     text: tens digit times one more, then 25.
   - Text, roots: √529 lies between 20 and 30 (`20² = 400`, `30² = 900`); a square ending in 9
     has a root ending in 3 or 7; `25² = 625` is too big, so √529 = 23.
   - Table `Kwadraat eindigt op | Wortel eindigt op`: `1 | 1 of 9`, `4 | 2 of 8`, `5 | 5`,
     `6 | 4 of 6`, `9 | 3 of 7`, `0 | 0`.

## 8. Open assumptions

- **Block types:** `text`, `worked`, `table` and `tip` are assumed to be enough. A bullet list
  is left out until a lesson needs it.
