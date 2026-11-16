# Plan: v9 Rekenmachine

Spec: `docs/superpowers/specs/2026-11-15-rekenmachine-design.md` ("the spec"); topic rules in
`docs/superpowers/specs/topics/meetkunde.md` §5.98–§5.99. TDD, one commit per task, `npm test` +
`npm run check` before each commit, `main` deployable after each task. The topics join the set in
task 6.

## Choices of this plan

They refine spec §9; the spec is updated in the same commit as this plan.

1. **Physical keys:** `Calculator.svelte` takes the keys itself with a capture listener on
   `window` and stops their propagation (as `holdKeys` in `TestScreen`), Escape excepted. So
   `KeypadAnswer` and `QuestionView` keep their listeners unchanged.
2. **`C` is not a `KeypadKey`:** it sits in the display row, outside `Keypad`. `CalculatorKey` is
   the keypad keys of the calculator plus `'clear'`; `KEYS` in `lib/keys.ts` does not change.
3. **Neem over:** `InputModel` gets an optional `fromText(text): S`, only on `number`. The
   screen passes `taken: { text: string } | null` (a new object per take) through `QuestionView`
   to `KeypadAnswer`, which sets its value from it.
4. **`Keypad` props:** `okLabel` (text and aria-label of the OK key, for `=`) and `disabledKeys`
   (a set of keys drawn disabled). Neither changes an existing keypad.
5. **State per screen:** `PlayScreen` and `TestScreen` each hold the calculator state, open or
   closed, and `taken`, as they each hold `notes` today. No shared wrapper.

## Task 1 — `roundHalfUp` and `lib/calculator.ts`

Files: `src/lib/rational.ts`, `src/lib/rational.test.ts`, `src/lib/calculator.ts` (new),
`src/lib/calculator.test.ts` (new), `src/lib/keypadInput.ts` (export `DigitKey`).

```ts
// rational.ts
/** Rounded half up to `decimals` decimals, away from zero for a negative value. `decimals` may
 *  be negative: -2 rounds to hundreds. */
export function roundHalfUp(value: Rational, decimals: number): Rational;
// roundHalfUpToCents keeps its guard and becomes roundHalfUp(value, 2).

// calculator.ts
export type CalculatorKey =
  | DigitKey | ',' | '+' | '-' | '×' | ':' | '^' | '(' | ')' | '=' | 'backspace' | 'clear';
export interface CalculatorResult { text: string; exact: boolean }
export interface CalculatorState { input: string; result: CalculatorResult | 'error' | null }
export const EMPTY_CALCULATOR: CalculatorState;
export const MAX_CALCULATOR_INPUT = 40;
export const CALCULATOR_KEYS: readonly KeyDef[]; // 19 keys, 5 columns, `=` is the OK slot
export const CALCULATOR_COLUMNS = 5;
export function applyCalculatorKey(state: CalculatorState, key: CalculatorKey): CalculatorState;
export function canPress(state: CalculatorState, key: CalculatorKey): boolean;
/** Spec §5.3: 10 significant digits, 12 characters; 'error' outside the range. */
export function formatResult(value: Rational): CalculatorResult | 'error';
/** The display line: the formatted input, then ` = ` or ` ≈ ` and the result, or `Fout`. */
export function displayText(state: CalculatorState): string;
/** What the live region says after `=`: `is 132,665`, `is ongeveer …`, `Fout`; '' otherwise. */
export function spokenResult(state: CalculatorState): string;
/** The text Neem over types, or null without a result. */
export function takeOverText(state: CalculatorState): string | null;
```

- `input` and `result.text` are raw: ASCII `-`, a comma, no separators. `displayText` formats
  with `formatExpressionInput` and adds the thousands separators of the result.
- `canPress(state, key)` is `applyCalculatorKey(state, key) !== state`; the reducer returns the
  same object for a key that does nothing.
- Read `applyExpressionKey` first; share a helper only where its rules equal the table of §5.3.
- `formatResult`: `decimals = min(10 − whole digits, 12 − sign − whole digits − 1)` for a value
  of 1 or more, `min(10 + leading zeros, 10 − sign)` below 1; after rounding, a carry
  (`9,9999999999 → 10`) is formatted again.

`roundHalfUp` cases:

| value     | decimals | expected |
| --------- | -------- | -------- |
| 23,55     | 1        | 23,6     |
| 23,54     | 1        | 23,5     |
| 124,95    | 0        | 125      |
| 904,32    | 0        | 904      |
| 2,675     | 2        | 2,68     |
| −2,5      | 0        | −3       |
| −2,4      | 0        | −2       |
| 12,7      | 1        | 12,7     |
| 1250      | −2       | 1300     |
| 0         | 1        | 0        |

`formatResult` cases:

| value            | text           | exact |
| ---------------- | -------------- | ----- |
| 132,665          | `132,665`      | true  |
| 1/8              | `0,125`        | true  |
| 4/3              | `1,333333333`  | false |
| 2/3              | `0,6666666667` | false |
| −2/3             | `-0,666666667` | false |
| 1/3000           | `0,0003333333` | false |
| 1/10¹³           | `0`            | false |
| 0                | `0`            | true  |
| 123456789012     | `123456789000` | false |
| 99999999999,5    | `100000000000` | false |
| 10¹²             | error          |       |
| 999999999999,9   | error (carry)  |       |
| −10¹¹            | error          |       |
| −9999999999      | `-9999999999`  | true  |
| −99999999999     | error (carry)  |       |

Reducer cases, typing (key sequence → `input`; the last key is the one under test):

| keys            | input / effect                    | row of §5.3                    |
| --------------- | --------------------------------- | ------------------------------ |
| `2 )`           | `2` (ignored)                     | `)` without an open one        |
| `( 2 ) 3`       | `(2)` (ignored)                   | digit after `)`                |
| 13 digits       | 12 digits                         | number of 12 characters        |
| `, 5`           | `,5`, `=` gives `0,5`             | comma at the start             |
| `1 , 2 ,`       | `1,2`                             | second comma                   |
| `2 ^ 1 ,`       | `2^1`                             | comma in an exponent           |
| `+`             | `` (ignored)                      | operator at the start          |
| `2 + ×`         | `2+`                              | operator after an operator     |
| `- 2`           | `-2`                              | sign at the start              |
| `( - 2`         | `(-2`                             | sign after `(`                 |
| `3 × -`         | `3×`                              | no sign after an operator      |
| `2 ^ 3 ^`       | `2^3`                             | no second `^`                  |
| `2 (`           | `2`                               | `(` after a digit              |
| `( (`, `2 × (`  | `((`, `2×(`                       | `(` accepted                   |
| `( 2 ) )`       | `(2)`                             | `)` with nothing open          |
| `( 2 =`         | no result                         | `=` on an open parenthesis     |
| `2 + =`         | no result                         | `=` on an incomplete input     |
| `1 2 ⌫`         | `1`                               | backspace                      |
| `1 2 C`         | empty state                       | clear                          |
| 41 keys         | 40 characters                     | the input limit                |

Evaluation (`=`): `2+3×4` → 14; `12:4×3` → 9; `2×3^2` → 18; `3,14×6,5^2` → `132,665` exact;
`4:3` → `1,333333333` rounded; `5:0` → error; `10^12` → error; an exponent `lib/expr` refuses →
error.

With a result (start: `4:3 =`, and `2-5 =` for the negative one):

| key          | effect                                        |
| ------------ | --------------------------------------------- |
| `7`          | input `7`, no result                          |
| `,`          | input `,`                                     |
| `(`          | input `(`                                     |
| `×`          | input `1,333333333×`                          |
| `×` (−3)     | input `(-3)×`                                 |
| `-`          | input `1,333333333-`                          |
| `^`          | input `1,333333333^`                          |
| `⌫`          | input `4:3`, no result                        |
| `C`          | empty state                                   |
| `=`          | same state                                    |

After `Fout`: `+ - × : ^` and `=` return the same state; a digit, `,`, `(` start anew; `⌫` goes
back to the input; `C` empties.

Also: `canPress` agrees with the reducer for every key in every state above; `displayText`
(`3,14 × 6,5² = 132,665`, `4 : 3 ≈ 1,333333333`, `5 : 0 = Fout` as the spec draws it, empty →
`0`); `spokenResult`; `takeOverText` (`132,665`, `-3`, null without a result and after `Fout`).

Commit: `Added the calculator reducer and half-up rounding`

## Task 2 — `Calculator.svelte`

Files: `src/components/Calculator.svelte` (new), `src/components/Calculator.test.ts` (new),
`src/components/Keypad.svelte` (+ its test: `okLabel`, `disabledKeys`),
`src/lib/physicalKeys.ts` (+ test), `src/app.css`, `src/screens/scenes.ts`,
`screenshots/screens.spec.ts`.

```ts
// physicalKeys.ts
/** The calculator key of a physical key (spec §5.5), or null. */
export function calculatorKeyFor(key: string): CalculatorKey | null;

// Calculator.svelte
interface Props {
  state: CalculatorState;          // owned by the screen (spec §5.1: survives a layout change)
  onkey: (key: CalculatorKey) => void;
  onclose: () => void;
  /** Absent on a step without a number field: no Neem over button. */
  ontake?: (text: string) => void;
}
```

- A modal `<dialog>` as `LessonSheet`: `showModal` in an effect, `oncancel` prevented and
  turned into `onclose`, a click on the dialog itself closes, `<svelte:window onpopstate>`
  closes. `::backdrop` transparent.
- `<svelte:window onkeydowncapture>`: ignores Ctrl/Alt/Meta and Escape; a key with a
  `calculatorKeyFor` goes to `onkey` when `canPress`, and is always stopped
  (`stopImmediatePropagation`, `preventDefault`) so nothing behind the overlay types. Enter on a
  focused button of the dialog (✕, Neem over) stays that button's.
- Place and size: tokens per layout in `app.css` (`--play-calc-width`, `--play-calc-right`,
  `--play-calc-key`); bottom-aligned, full play column on phone and `tablet-portrait`, the
  right pane in landscape. Check per layout that its height is at most the field, the error
  line and the keypad (`--play-field-height`, `--play-keypad-height`, `--play-bottom`).
- The display: `aria-live="polite"` on a visually hidden line with `spokenResult`; the visible
  line is clipped on the left (`direction: rtl` on the box, the text itself `ltr`).

`calculatorKeyFor` cases: `0`–`9` → the digit; `,` and `.` → `,`; `+`; `-`; `*`, `x`, `X` → `×`;
`:` and `/` → `:`; `(`; `)`; `^`; `Backspace` → `backspace`; `Enter` and `=` → `=`; `Delete` →
`clear`; `a`, `Escape`, `F1`, ` ` → null.

Component tests (`Calculator.test.ts`):

| case                                                    | expected                                    |
| ------------------------------------------------------- | ------------------------------------------- |
| mounted                                                 | dialog open, labelled "Rekenmachine"        |
| empty state                                             | display `0`, `=` and operators disabled     |
| state `3,14×6,5^2` with result                          | display `3,14 × 6,5² = 132,665` (exact text) |
| tap `7`                                                 | `onkey('7')`                                |
| tap `C`                                                 | `onkey('clear')`                            |
| ✕, Escape (cancel), click on the dialog, `popstate`     | `onclose` once each                         |
| physical `*`, `Enter`, `Delete`                         | `onkey('×')`, `onkey('=')`, `onkey('clear')` |
| physical `7` with Ctrl                                  | no `onkey`                                  |
| physical key that `canPress` refuses                    | no `onkey`, propagation stopped             |
| no `ontake`                                             | no Neem over button                         |
| `ontake`, no result / `Fout`                            | Neem over disabled                          |
| `ontake`, result `132,665`                              | click → `ontake('132,665')`                 |

Scene `calculator` (mounts `Calculator` over a `PlayScreen` on a fixed question, state
`3,14×6,5^2` with its result) and a shot `calculator-open` on every layout that has play shots.

Commit: `Added the calculator overlay`

## Task 3 — `calcCircle` and `calcVolume`

Files: `src/lib/types.ts` (`Topic`), `src/lib/topics/calcCircle.ts`, `calcVolume.ts` and their
tests (new), `src/lib/topics/index.ts` (+ test), `src/lib/topics/rounding.ts` (new, + test).

```ts
// topics/rounding.ts
export const ROUNDING_SENTENCE: Readonly<Record<0 | 1 | 2, string>>; // spec §6
/** Closer than 0,001 to a rounding boundary without being on it (spec §6). */
export function nearBoundary(value: Rational, decimals: number): boolean;
/** A number step for a rounded answer: the sentence appended, the rounded value expected and
 *  shown with `decimals` decimals (`formatFixed`). */
export function roundedStep(options: {
  prompt: string; value: Rational; decimals: 0 | 1 | 2; suffix: string; explanation: string;
}): Step;

// topics/index.ts
export const CALCULATOR_TOPICS: ReadonlySet<Topic>; // calcCircle, calcVolume
export function allowsCalculator(topic: Topic): boolean;

// calcCircle.ts — pure builders, exported for the tests, plus the generator
export function circumferenceQuestion(tenths: number, given: 'radius' | 'diameter', unit: 'cm' | 'm'): Question;
export function circleAreaQuestion(tenths: number, given: 'radius' | 'diameter', unit: 'cm' | 'm'): Question;
export function circleBackQuestion(circumference: number, asked: 'radius' | 'diameter', unit: 'cm' | 'm'): Question;
export function generateCalcCircle(rng: Rng): Question;

// calcVolume.ts
export function sphereQuestion(r: number, given: 'radius' | 'diameter'): Question;
export function cylinderQuestion(radiusTenths: number, given: 'radius' | 'diameter', h: number): Question;
export function containerQuestion(l: number, b: number, h: number): Question;
export function generateCalcVolume(rng: Rng): Question;
```

- `drawUntil` redraws on `nearBoundary` and on the Bak rule (at most one multiple of 10).
- No `diagnose` (no topic tips, v3 rule); `noPowerOfTenTip` stays off, as the other v3 topics.
- Labels as in the topic file; keys `calcCircle:<form>:<variant>:<unit>:<numbers>`.

Fixed cases (the examples of the topic file):

| builder                                   | expected | suffix | explanation ends on |
| ----------------------------------------- | -------- | ------ | ------------------- |
| `circumferenceQuestion(75, 'diameter', 'cm')` | `23,6` | `cm`   | `23,55 → 23,6`      |
| `circleAreaQuestion(65, 'radius', 'm')`   | `132,7`  | `m²`   | `132,665 → 132,7`   |
| `circleAreaQuestion(75, 'diameter', 'cm')` | `44,2`  | `cm²`  | `44,15625 → 44,2`   |
| `circleBackQuestion(40, 'diameter', 'cm')` | `12,7`  | `cm`   | `12,738… → 12,7`    |
| `circleBackQuestion(40, 'radius', 'cm')`  | `6,4`    | `cm`   | `6,369… → 6,4`      |
| `sphereQuestion(6, 'radius')`             | `904`    | `cm³`  | `904,32 → 904`      |
| `cylinderQuestion(35, 'diameter', 12)`    | `462`    | `cm³`  | `461,58 → 462`      |
| `containerQuestion(85, 35, 42)`           | `125`    | `L`    | `124,95 L → 125`    |

`nearBoundary`: `(23,55; 1)` false (on it); `(23,5504; 1)` true; `(23,5496; 1)` true;
`(23,56; 1)` false; `(124,4995; 0)` true; `(124,95; 0)` false.

Sweeps (≥1000 seeded exercises per generator): the ranges of the topic file per form; one
decimal that is not whole where the file says so; all three forms and both variants occur; the
prompt ends on the rounding sentence, has no slot and at most 170 characters; `check(expected)`
is correct; the unrounded value is wrong when it differs; `132,70`-style trailing zeros are
correct; never `nearBoundary`; the expected text has exactly the decimals asked; the Bak rule;
keys unique per numbers. `allowsCalculator` is true for exactly the two topics.

Commit: `Added the circle and volume topics for the calculator`

## Task 4 — the button and the screens

Files: `src/components/CalculatorButton.svelte` (new), `Icon.svelte` (`calculator`),
`PlayShell.svelte`, `PlayScreen.svelte`, `TestScreen.svelte`, `QuestionView.svelte`,
`KeypadAnswer.svelte`, `src/lib/inputModels.ts`, `src/lib/session.ts`
(`sessionUsesCalculator`), their tests (append to the existing files), `scenes.ts`,
`screens.spec.ts`.

```ts
// session.ts
export function sessionUsesCalculator(questions: readonly Question[]): boolean;

// inputModels.ts — on InputModel<S>
/** Typing state for a text put in from outside (Neem over); only `number` has it. */
fromText?(text: string): S;

// PlayShell.svelte — new prop
/** The right end of the header: the calculator button or its reserved space (spec §4). */
action?: Snippet;

// CalculatorButton.svelte
interface Props {
  /** 'reserved': the space only, invisible and inert. */
  mode: 'active' | 'disabled' | 'reserved';
  onopen: () => void;
  ref?: HTMLButtonElement; // bindable, for the focus after closing
}

// QuestionView.svelte and KeypadAnswer.svelte — new prop
taken?: { text: string } | null;
```

- Both screens: `calculator = $state.raw(EMPTY_CALCULATOR)`, `calculatorOpen = $state(false)`,
  `taken = $state.raw(null)`. In `apply`: a new question empties the calculator and closes it;
  a new step or question sets `taken` to null.
- The button's mode: `reserved` when the question's topic is not a calculator topic; `disabled`
  while `feedback` is set (`PlayScreen`); otherwise `active`. No `action` snippet at all when
  `sessionUsesCalculator` is false.
- The overlay is rendered as `{#if calculatorOpen && !tooLow}`, as the lesson sheet. Closing
  moves the focus to the button after `tick()`.
- `ontake` is passed only when `step.kind === 'number'`; it sets `taken` and closes.
- `KeypadAnswer`: an effect on `taken` sets `value = model.fromText(taken.text)` and clears the
  error; nothing happens when the model has no `fromText`. Inside a kladblok cell the take
  still goes to the answer field.
- `PlayScreen.handleKeydown` needs no change: the overlay stops the keys in the capture phase.

Tests:

| file                    | case                                                              | expected                                         |
| ----------------------- | ----------------------------------------------------------------- | ------------------------------------------------ |
| `session.test.ts`       | `sessionUsesCalculator` with / without a calculator topic         | true / false                                     |
| `inputModels.test.ts`   | `number.fromText('132,665')`, `'-3'`                              | views as typed; other kinds have no `fromText`   |
| `QuestionView.test.ts`  | `taken` set on a number step with `12` typed                      | field shows `132,665`                            |
| `QuestionView.test.ts`  | the same text taken twice (new object) after editing              | field shows it again                             |
| `PlayScreen.test.ts`    | session without calculator topics                                 | no button, header as today                       |
| `PlayScreen.test.ts`    | mixed session, on the non-calculator question                     | button present but hidden and inert              |
| `PlayScreen.test.ts`    | calculator question                                               | button "Rekenmachine" enabled                    |
| `PlayScreen.test.ts`    | open, type `2 + 3 =`, close with ✕, reopen                        | display still `2 + 3 = 5`; focus on the button   |
| `PlayScreen.test.ts`    | open, type, Neem over                                             | closed, answer field shows the result            |
| `PlayScreen.test.ts`    | physical `7` while open                                           | calculator has `7`, answer field unchanged       |
| `PlayScreen.test.ts`    | wrong answer                                                      | button disabled on the panel                     |
| `PlayScreen.test.ts`    | next question                                                     | calculator empty and closed                      |
| `PlayScreen.test.ts`    | calculator question with a multiple-choice step (fixture)         | no Neem over; `1` does not choose an option      |
| `PlayScreen.test.ts`    | `viewport` too low while open, then back                          | overlay gone, then back with its calculation     |
| `TestScreen.test.ts`    | button, Neem over, next question                                  | as `PlayScreen`                                  |
| `TestScreen.test.ts`    | time runs out while open                                          | `onfinish` with `timedOut`                       |

Scene `question-calculator` (a `calcCircle` question; the task 2 scene now opens the overlay
through the button in its shot steps) and its shot; rerun `npm run screenshots` for the play
shots and check the header on every layout.

Commit: `Added the calculator button to the play and test screens`

## Task 5 — Kort without calculator topics

Files: `src/lib/sets.ts`, `src/lib/sets.test.ts`, `src/lib/session.ts`,
`src/lib/session.test.ts`.

```ts
// sets.ts
/** The set with its `deep` filtered on topics that need no calculator (spec §8). */
export function withoutCalculator(set: PracticeSet): PracticeSet;
```

`buildTestSession` maps the pool through `withoutCalculator` when `config.length` is Kort.

| case                                                              | expected                              |
| ----------------------------------------------------------------- | ------------------------------------- |
| `withoutCalculator` on a set with a calculator topic in `deep`    | `deep` without it, the rest the same  |
| on a set without `deep`, or without calculator topics             | the same set object                   |
| Kort (RWT and LKT), 200 seeds, pool with a calculator topic       | never a calculator topic              |
| Lang, 200 seeds, the same pool                                    | at least one seed has one             |

The session tests use a fixture pool until task 6 puts the topics in Meetkunde.

Commit: `Removed calculator topics from the short practice test`

## Task 6 — Meetkunde and the documents

Files: `src/lib/sets.ts` (the `deep` of spec §7.3), `src/lib/sets.test.ts`,
`src/lib/session.test.ts`, the documents of spec §13, `CLAUDE.md`.

| case                                                        | expected                                   |
| ----------------------------------------------------------- | ------------------------------------------ |
| Meetkunde Verdieping, 15 exercises, many seeds              | 3 Opfrisser; 12 Verdieping: 1 `calcCircle`, 1 `calcVolume`, the four others 2 or 3 |
| Meetkunde Verdieping, 5 exercises                           | builds; a calculator topic may be absent   |
| Gemengd with Meetkunde at Verdieping                        | builds; calculator topics can occur        |
| the setup screen of Meetkunde Verdieping                    | lists both labels                          |

Then: `npm run build` and read `dist/sw.js` against the PWA rules; `npm run screenshots`; the
final review of the whole diff against the spec; Status, roadmap row, architecture and the
calculator sentence in `CLAUDE.md`; `git rm` this plan.

Commit: `Added the calculator topics to Meetkunde` and `Updated the specs and the status with
the calculator as done`
