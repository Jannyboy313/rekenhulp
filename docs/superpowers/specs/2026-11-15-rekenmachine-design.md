# Rekenhulp v9 — Rekenmachine (calculator exercises)

Date: 2026-11-15. Status: approved 2026-11-16, not built. Implements the v9 entry of main spec §12.11.

"Main spec" is `2026-10-05-rekenhulp-design.md`, "v4 spec" is `2026-11-14-tablet-design.md`,
"test spec" is `2026-11-14-oefentoets-design.md`.

## 1. Goal

Exercises where a calculator is allowed, as in the niet-hoofdrekenen part of the RWT (handreiking
§2.4): the numbers are no longer chosen for mental arithmetic, and the answer is rounded as the
prompt says. Such an exercise shows a calculator button in the header; it opens a calculator
over the lower part of the play screen.

The calculator is an overlay, so the play screen itself does not change: no new row, no new
keypad variant, no change to the kladblok.

This step builds the framework and the first content: two Verdieping topics of Meetkunde (§7).
Other sets get calculator topics later, one spec iteration each.

### Non-goals

- A scientific calculator: no `√`, no `π` key, no memory keys, no percent key. The prompt keeps
  giving `π = 3,14`.
- Calculator topics in Opfrisser, in the Kort practice test, or as a level or a set of their own.
- The calculator on an exercise that is not marked: mental arithmetic stays the rule (main spec
  §1).
- A history of calculations, or anything stored: the calculation belongs to one question.
- Detecting how the user rounded (a rounded intermediate result): no new tips.

## 2. Decisions

Decided with the user on 2026-11-15 (1–8) and 2026-11-16 (9–16, §11).

| #   | Question              | Decision                                                                                                                                                              |
| --- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Calculator            | Built in, simple. Not only a mark that leaves the user to find a calculator.                                                                                          |
| 2   | Form                  | A button that opens an overlay. Not a calculating kladblok and not a panel inside the play screen.                                                                    |
| 3   | Sets and levels       | Calculator topics are Verdieping topics of the existing sets (`deep`), mixed with the others. No third level, no set of its own.                                      |
| 4   | Size of this step     | The framework plus one set.                                                                                                                                           |
| 5   | First set             | Meetkunde: closes RWT gap C.12 (the volume of a sphere, main spec §12.3).                                                                                             |
| 6   | Taking over a result  | A button **Neem over** puts the result in the answer field, unrounded, and closes the overlay. Rounding stays the user's work.                                        |
| 7   | Keys                  | Digits, comma, `+ − × :`, parentheses, `C`, `⌫` and `=`. No `√`, no `π`.                                                                                              |
| 8   | Practice test         | Only in **Lang** (the whole RWT). **Kort** is the hoofdrekenen part and never has them.                                                                               |
| 9   | The mark              | The calculator button is the mark "rekenmachine toegestaan": an icon button in the header, only on a calculator exercise (§4). No text in the prompt.                 |
| 10  | A `^` key             | Added to the keys of decision 7: `r²` and `r³` are in every exercise of §7, and `lib/expr` and the kladblok already have it. `C` moves to the display row (§5.2).     |
| 11  | How it calculates     | A whole expression, evaluated on `=` by `lib/expr`: exact, with the order of operations of the app (main spec §7). Not key by key as a pocket calculator.             |
| 12  | The result            | A decimal number of at most 10 significant digits and 12 characters; `≈` instead of `=` when it was rounded (§5.3).                                                   |
| 13  | Lifetime              | The calculation stays while its question is shown (closing and reopening keeps it) and is empty at the next question, as the kladblok notes.                          |
| 14  | Which topic is marked | A registry by topic (`CALCULATOR_TOPICS`), not a field on a question: every exercise of a calculator topic is marked, and nothing else is (§3).                       |
| 15  | Share in a session    | A calculator topic has half the weight of the other Verdieping topics of its set (§7.3), so roughly a fifth of a Meetkunde Verdieping session.                        |
| 16  | Rounding              | The prompt says how (`Rond af op 1 decimaal.`, `Rond af op een heel getal.`); half rounds up; the rounded value is the only correct answer (§6).                      |

## 3. Model

```ts
/** Topics whose exercises allow the calculator (§3). */
const CALCULATOR_TOPICS: ReadonlySet<Topic>;

function allowsCalculator(topic: Topic): boolean;

/** At least one question of the session allows the calculator (§4). */
function sessionUsesCalculator(questions: readonly Question[]): boolean;
```

- `CALCULATOR_TOPICS` sits in `lib/topics/index.ts` next to the labels. A calculator topic is an
  ordinary `Topic` with a generator, a label and a place in a set's `deep`; the registry is the
  only thing that makes it a calculator topic.
- Everything that works by topic keeps working unchanged: Gemengd, Fouten oefenen, Fouten van
  eerder, practice from a lesson, the score per topic, the practice records.
- A calculator topic follows the v3 rules of main spec §5 (no topic tips, the de-duplication
  key, prompts without a slot of at most 170 characters), except the rule on decimals: its
  values are rounded as §6 says.
- The kladblok stays on a calculator exercise, as scrap paper is allowed during the whole RWT.

## 4. The button

- An icon button (a calculator, new in `Icon`) at the right end of the play header, as large as
  the Stop button of the layout (v4 spec §4.1). Aria-label "Rekenmachine".
- Shown on a calculator exercise while it waits for an answer. In the correct state and on the
  wrong-answer panel it is disabled: the exercise is over.
- In a session with at least one calculator exercise (`sessionUsesCalculator`) the header keeps
  the button's space on every exercise, so the set name and the counter do not move; on other
  exercises the space is empty, invisible and `inert`. A session without calculator exercises
  has no such space and is as today.
- `PlayShell` gets an optional snippet for the right end of the header; `PlayScreen` and
  `TestScreen` pass the button.

## 5. The overlay

### 5.1 Place and behaviour

- A modal `<dialog>` without a dark backdrop, at the bottom of the screen. It covers the answer
  field and the keypad, never the prompt or the kladblok: its height is at most the answer field
  plus the keypad of the layout (the plan checks this against the `--play-*` tokens of every
  layout).
  - Phone and `tablet-portrait`: full width of the play column, bottom-aligned.
  - `tablet-landscape` and compact: over the right pane (the keypad), at the pane's width,
    bottom-aligned. The prompt and the kladblok in the left pane stay free.
- On a Ja/Nee or multiple-choice step it covers the buttons in the same place.
- The session behind it is inert while it is open. It closes with its ✕ (aria-label "Sluiten"),
  Escape, the system back (as `LessonSheet`), a tap outside it, and **Neem over**.
- The overlay never closes itself otherwise. A layout change does not remount it: the state is
  kept by `PlayScreen` or `TestScreen` (v4 spec §3.1). When the test time runs out, the overlay
  goes with the screen.
- The wake lock, the timers and the test deadline run on while it is open.

### 5.2 Content

```
┌ Rekenmachine                      ✕ ┐
│ C            3,14 × 6,5² = 132,665  │
│   7    8    9    :    (             │
│   4    5    6    ×    )             │
│   1    2    3    −    ^             │
│   ⌫    0    ,    +    =             │
│            Neem over                │
└─────────────────────────────────────┘
```

- **Header:** the title "Rekenmachine" and the ✕.
- **Display row:** `C` (aria-label "Wissen") on the left; the calculation right-aligned on one
  line, shown as the expression answer field shows input (`×`, `−`, superscript exponents,
  thousands separators, main spec §8). It is clipped on the left, so the end is always in view.
  An empty calculation shows `0` in the muted colour.
- **Keys:** the shared `Keypad` in 5 columns and 4 rows, with the key sizes of the layout. `⌫`
  is bottom left as on every keypad; `=` has the place and the colour of OK. A key that would do
  nothing (§5.3) is disabled, as on the other keypads.
- **Neem over:** a primary button under the keys; shown only when the step has a number field,
  enabled only while a result is shown (§5.4).

### 5.3 Calculating

`lib/calculator.ts`, pure and without Svelte imports:

```ts
type CalculatorKey = DigitKey | ',' | '+' | '-' | '×' | ':' | '^' | '(' | ')' | '=' | 'backspace' | 'clear';

interface CalculatorState {
  /** The expression as typed, in the notation of `lib/expr`. */
  input: string;
  /** Set by `=`; any other key than `=` removes it. */
  result: { text: string; exact: boolean } | 'error' | null;
}

const EMPTY_CALCULATOR: CalculatorState;
function applyCalculatorKey(state: CalculatorState, key: CalculatorKey): CalculatorState;
function canPress(state: CalculatorState, key: CalculatorKey): boolean;
```

While typing (no result):

| Key            | Accepted                                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| a digit        | always, except directly after `)`; a number has at most 12 characters                                      |
| `,`            | in a number without a comma that is not an exponent; also at the start of a number (`,5` reads as `0,5`)   |
| `+` `×` `:`    | after a digit or `)`                                                                                       |
| `−`            | after a digit or `)` it is the operator; at the start and directly after `(` it is the sign                |
| `^`            | after a digit or `)`; the exponent is a whole number, and never a second `^` after it                      |
| `(`            | at the start, after an operator, after a sign or after `(`                                                 |
| `)`            | after a digit or `)`, while a parenthesis is open                                                          |
| `=`            | when the input is a complete expression: it parses and every parenthesis is closed                         |
| `⌫`            | removes the last character                                                                                 |
| `C`            | empties the calculation                                                                                    |

- The input holds at most 40 characters; more keys are ignored.
- The sign follows `lib/expr`: a minus sign only at the start and after `(` (main spec §7), so
  `3 × −2` is typed as `3 × (−2)`.
- `=` evaluates with `parse` and `evaluate` of `lib/expr`: exact, powers before `×` and `:`,
  those two with equal priority from left to right, then `+` and `−`. Never `eval`.
- **The result** is rounded half up to 10 significant digits, and to fewer decimals when its
  text (minus sign, digits and comma, no thousands separators) would be longer than 12
  characters, the limit of a number field: `(−2) : 3 ≈ −0,666666667` and `1 : 3000 ≈
  0,0003333333`. A value too small for 12 characters shows `≈ 0`. `exact` is true when the
  rounding changed nothing: the display then reads `3,14 × 6,5² = 132,665`, otherwise `4 : 3 ≈
  1,333333333`. Trailing zeros are not shown.
- **Error:** a division by zero, an exponent `lib/expr` refuses, or a result whose whole part
  does not fit the 12 characters (`10¹²` or more, `−10¹¹` or less) gives `Fout` in the place of
  the result.

With a result shown:

| Key                 | Effect                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------- |
| a digit, `,`, `(`   | starts a new calculation with that key                                                       |
| `+` `−` `×` `:` `^` | continues with the result as the first number (`132,665 ×`); a negative result in parentheses |
| `⌫`                 | removes the result and goes back to the input                                                |
| `C`                 | empties the calculation                                                                      |
| `=`                 | nothing                                                                                      |

After `Fout`, an operator does nothing; a digit, `,`, `(`, `⌫` and `C` work as above.

Continuing uses the result as shown, so a rounded result continues with the digits on the
display. That is accurate enough for every rounding the exercises ask (§6).

### 5.4 Neem over

- Puts the result in the answer field of the current step, replacing what was typed there, and
  closes the overlay. The text is the result as the number keypad would type it: digits, a
  comma, a leading minus sign; no thousands separators.
- Nothing is rounded: `132,665` goes into the field as it is, and the user removes or changes
  digits to round. The text is the number on the display, at most 12 characters (§5.3).
- Only for a step of the answer kind `number`. Other kinds have no button: the user types the
  answer.
- Not available after `Fout`.

### 5.5 Physical keyboard

While the overlay is open, the keys go to the calculator and not to the answer field or the
kladblok (v4 spec §6):

- the digits, `,` and `.`, `+`, `-`, `*` and `x`, `:` and `/`, `(`, `)`, `^` and Backspace as
  their key;
- Enter and `=` are `=`; Delete is `C`; Escape closes the overlay;
- a key with Ctrl, Alt or Meta is ignored, and a disabled key does nothing.

### 5.6 Accessibility

- The dialog is labelled by its title. The display is a live region (`aria-live="polite"`) that
  reads the result after `=`: `is 132,665`, `is ongeveer 1,333333333`, or `Fout`.
- Focus goes to the dialog when it opens and back to the calculator button when it closes.

## 6. Rounding

- A calculator exercise states its rounding in the prompt, as its last sentence: `Rond af op 1
  decimaal.`, `Rond af op 2 decimalen.` or `Rond af op een heel getal.`.
- `lib/rational.ts` gets `roundHalfUp(value, decimals)`: half rounds up, away from zero for a
  negative value; `roundHalfUpToCents` becomes a call to it.
- The expected answer is the exact value, rounded once at the end. Only that value is correct;
  `132,70` for `132,7` is the same number and is correct too.
- The expected answer is shown with the number of decimals asked (`132,7`, `44,0`, `905`).
- A generator never asks a rounding its exact value sits closer to than `0,001` of a rounding
  boundary, unless the value is exactly on it. So a result the calculator rounded to 10 digits,
  or an intermediate result typed over with fewer digits, cannot flip the answer by accident.

## 7. Meetkunde: the first calculator topics

The full rules are in `topics/meetkunde.md`, §5.98 and §5.99. In short:

### 7.1 Circle with the calculator (`calcCircle`, §5.98)

The circumference and the area of a circle with a length of one decimal, and the diameter or the
radius from a given circumference. `π = 3,14`, rounded to 1 decimal.

### 7.2 Volume with the calculator (`calcVolume`, §5.99)

The volume of a sphere (formula given, RWT C.12b), a cylinder with a radius of one decimal
(C.12c) and a box-shaped container in litres (C.12a with C.2). Rounded to a whole number.

### 7.3 In the set

```ts
deep: [
  { topic: 'scalingSolids', weight: 2 },
  { topic: 'surfaceArea', weight: 2 },
  { topic: 'compositeShapes', weight: 2 },
  { topic: 'angleReasoning', weight: 2 },
  { topic: 'calcCircle', weight: 1 },
  { topic: 'calcVolume', weight: 1 },
],
```

- The four existing topics keep equal shares; each calculator topic has half of one (decision
  15).
- Quota example (main spec §4.2), Verdieping with 15 exercises: 3 Opfrisser, 12 Verdieping over
  the weights 2/2/2/2/1/1 (total 10): shares 2,4 / 2,4 / 2,4 / 2,4 / 1,2 / 1,2, so 2 each for
  the four and 1 each for the calculator topics, and the two left over go to two of the four
  (largest remainder).
- With 5 exercises the Verdieping part can leave a calculator topic out; that is how small
  sessions already work.
- The setup screen lists the two topics with their labels; the labels name the calculator, so
  the list needs no icon.

## 8. Practice test

- **Kort** never has a calculator topic: it is the hoofdrekenen part (test spec §3.2).
  `buildTestSession` builds it from the sets without their calculator topics.
- **Lang** has them as any Verdieping topic of its set, by the weights of §7.3. The time limit
  and the pass mark do not change.
- `TestScreen` shows the button and the overlay as `PlayScreen` does.
- `lib/sets.ts` gets `withoutCalculator(set)`: the set with its `deep` filtered on
  `allowsCalculator`.

## 9. Code structure

- `lib/calculator.ts`: the state, `applyCalculatorKey`, `canPress`, the formatting of a result,
  the text for **Neem over**.
- `lib/rational.ts`: `roundHalfUp`.
- `lib/topics/index.ts`: `CALCULATOR_TOPICS`, `allowsCalculator`; the two generators in
  `lib/topics/calcCircle.ts` and `lib/topics/calcVolume.ts`.
- `lib/sets.ts`: the Meetkunde `deep`, `withoutCalculator`. `lib/session.ts`: the Kort filter in
  `buildTestSession`, `sessionUsesCalculator`.
- `lib/keys.ts`: the key `clear`. `lib/physicalKeys.ts`: Delete, and Enter as `=` for the
  calculator keypad.
- `components/Calculator.svelte` (the overlay: dialog, display, `Keypad`, Neem over) and
  `components/CalculatorButton.svelte`; `Icon` gets `calculator`.
- `PlayShell.svelte`: the header snippet. `PlayScreen.svelte` and `TestScreen.svelte`: the
  calculator state per question, open or closed, and passing a taken-over result to the answer
  field. `KeypadAnswer.svelte`: its key listener is off while the overlay is open, and it
  accepts a value set from outside.
- `app.css`: the overlay sizes per layout as `--play-*` tokens.

## 10. Testing

- `lib/calculator.test.ts`, table-driven: every row of the two key tables of §5.3; the order of
  operations (`2 + 3 × 4 = 14`, `12 : 4 × 3 = 9`, `2 × 3² = 18`); exact against rounded
  (`1 : 8 = 0,125`, `4 : 3 ≈ 1,333333333`, `2 : 3 ≈ 0,6666666667`); the 12 characters
  (`(−2) : 3 ≈ −0,666666667`, `1 : 3000 ≈ 0,0003333333`, a tiny value `≈ 0`); `Fout` (`5 : 0`,
  a result of `10¹²`, a result of `−10¹¹`); continuing after a result, after a rounded result and after a negative result; the
  40 characters; `canPress` agrees with `applyCalculatorKey` for every key in every state of the
  tables.
- `lib/rational.test.ts`: `roundHalfUp` for 0, 1 and 2 decimals, a half, a negative value, a
  value that needs no rounding.
- The two generators, each with ≥1000 seeded exercises: the ranges of the topic file, the
  rounding sentence in the prompt, `check(expected)` correct, the unrounded value wrong when it
  differs, the boundary rule of §6, no prompt over 170 characters; `slot.sweep.test.ts` covers
  them by itself.
- `lib/session.test.ts`: Kort never has a calculator topic over many seeds, Lang can have them;
  the Meetkunde quota example of §7.3. `lib/sets.test.ts`: `withoutCalculator`.
- Component tests: the button only on a calculator exercise and its reserved space in a session
  that has one; opening and closing (✕, Escape, outside tap, system back); the calculation
  survives closing and is empty at the next question; **Neem over** fills the answer field and
  closes; no **Neem over** on a multiple-choice step; physical keys go to the calculator while it
  is open; the button is disabled on the wrong-answer panel; the same in `TestScreen`.
- Shots: a scene with the overlay open on a calculator exercise (a result shown) and one of the
  play screen with the button, on every layout the play shots have.
- `npm run smoke`: not needed, `main.ts` and the PWA config do not change.

## 11. Open assumptions

None. The six defaults of the draft were confirmed on 2026-11-16: decisions 9, 10, 11 and 15,
the topics of §7 and continuing with the shown result (§5.3). The same day the result got its
limit of 12 characters (§5.3): the draft's 10 significant digits did not always fit a number
field.

## 12. Build order

One plan, one commit per task, `main` deployable after each: the topics join the set in task 6.

1. `roundHalfUp` and `lib/calculator.ts`.
2. `Calculator.svelte` and the `clear` key, with its scene and shot.
3. `calcCircle` and `calcVolume`, registered with their labels and in `CALCULATOR_TOPICS`, not
   yet in a set.
4. The button, `PlayShell`, `PlayScreen` and `TestScreen`: state, **Neem over**, physical keys,
   the reserved header space.
5. `withoutCalculator` and the Kort filter.
6. The Meetkunde `deep`, and the documents of §13.

## 13. Changes to other documents

With task 6, unless noted:

- Main spec: §1 (the non-goal on calculator problems becomes: only on marked exercises), §3.3
  (the header button), §4.1 (the Meetkunde rows and weights) and §4.2 (the quota example), §5
  (the index rows of §5.98–§5.99: with this draft), §12 and §12.11 (done; the pointer to this
  spec: with this draft), §12.3 (C.12 closed), §12.8 (calculator problems no longer out of
  scope).
- v4 spec: §4.1 (the overlay sizes), §6 (the keys while the overlay is open).
- Test spec: the non-goal on calculator exercises, a decision for Kort and Lang, §3.3.
- `topics/meetkunde.md`: §5.98–§5.99 (with this draft).
- `CLAUDE.md`: Status, the roadmap row, the architecture, the calculator sentence under the
  roadmap.
