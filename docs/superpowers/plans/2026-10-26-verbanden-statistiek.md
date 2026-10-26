# Plan: Verbanden & statistiek (2026-10-26)

Light plan for the set Verbanden & statistiek. The spec is the source of truth: §5.33–§5.38
(topics), the new rows in §3.4.1 (tips), §4.2 (quota) and the `x =` prefix in §6. This plan gives
per task the files, the signatures and types, the test cases and the tips; it has no complete
code.

## Conventions for every task

- TDD: write the failing tests first, then the code. One commit per task (`feat: …`, ending with
  the `Co-Authored-By` line). `git diff` every file before `git add`; parallel sessions edit
  `main`.
- Each topic gets its own module `src/lib/topics/<topic>.ts` with `<topic>.test.ts`, following
  `angles.ts`: exported constants for the ranges, a `…Question(…)` builder per form that takes
  the numbers (so tests can pick them), and `generate<Topic>(rng: Rng): Question`, which draws
  the numbers and calls the builders.
- Each task widens `Topic` in `src/lib/types.ts` and registers the generator and its Dutch label
  in `src/lib/topics/index.ts` (`GENERATORS`, `TOPIC_LABELS`), so `npm run check` stays green
  after every task. The set is added in the last task.
- Steps: `numberStep` (`src/lib/steps.ts`) with `prefix`, `suffix`, `expected`, `explanation`
  and `diagnose`; `simplestFractionStep` for `probability`. Tips with `firstTip` and `exactTip`
  (`src/lib/tips.ts`); a tip fires only on the exact mistaken value. The factor-of-ten fallback
  stays on everywhere.
- Exact arithmetic with `Rational` (`src/lib/rational.ts`). Numbers in text with
  `formatInteger`/`formatRational` (`−` via `MINUS`), money with `formatMoney`.
- Negative numbers in a sum are written in parentheses except as the first term (§5.8). Task 1
  moves `literal` from `negativeNumbers.ts` to `format.ts` as
  `formatLiteral(value: number, first = false): string`; `negativeNumbers.ts` imports it.
  Lists (`4, −2, 3`) use `formatInteger`.
- Prompts have no slot (question text); a literal `?` only as the last character
  (`slot.sweep.test.ts` covers the new generators by itself).
- Keys: `<topic>:<form>:<context>:<numbers…>`, joined with `:`.
- Generator invariants with a seeded RNG over ≥ 1000 questions: the ranges of the spec,
  `check(expected).correct`, the explanation is set, and the form shares lie within ±5
  percentage points of the spec.
- Prompts are Dutch and exact as in the tables below. Write a non-breaking space in source as
  `\u{a0}`, never as a literal character.
- Do not use `[a, b] = cond ? [x, y] : [p, q]` destructuring (`noUncheckedIndexedAccess`).

## Task 1: `statistics` (spec §5.33)

Files: `src/lib/topics/statistics.ts`, `statistics.test.ts`, `types.ts`, `topics/index.ts`.

```ts
export type StatsContext = 'cijfers' | 'doelpunten' | 'temperatuur';
export type Measure = 'mean' | 'median' | 'mode' | 'range';
export interface ContextRange { label: string; min: number; max: number; lengths: readonly number[] }
export const STATS_CONTEXTS: Readonly<Record<StatsContext, ContextRange>>;
export function median(values: readonly number[]): Rational;
/** The single most frequent value, or null when there is a tie. */
export function uniqueMode(values: readonly number[]): number | null;
export function statisticsQuestion(context: StatsContext, measure: Measure, values: readonly number[]): Question;
export function missingValueQuestion(given: readonly number[], mean: number): Question;
export function generateStatistics(rng: Rng): Question;
```

Label: `Statistiek (gemiddelde, mediaan, modus, spreidingsbreedte)`.

Prompts: `${label} ${list}. Wat is het gemiddelde?` / `Wat is de mediaan?` / `Wat is de modus?` /
`Wat is de spreidingsbreedte?`, with the labels `Cijfers:`, `Doelpunten per wedstrijd:` and
`Temperaturen deze week in °C:` and the list joined with `, `. Missing value:
`Je hebt de cijfers 6, 8 en 7. Welk cijfer moet je nog halen om gemiddeld een 7 te staan?`
(the given values joined with `, ` and ` en ` before the last).

Suffix: `°C` for temperatuur (range: `graden`), none otherwise.

Test cases:

| Input | Answer | Explanation |
|---|---|---|
| cijfers 6, 8, 7, 5, 9, mean | 7 | `6 + 8 + 7 + 5 + 9 = 35 → 35 : 5 = 7` |
| temperatuur 4, −2, 3, 0, 5, 1, −4, mean | 1 | `4 + (−2) + 3 + 0 + 5 + 1 + (−4) = 7 → 7 : 7 = 1` |
| temperatuur −3, −1, −5, 0, 2, −4, −3, mean (edge: negative sum) | −2 | `… = −14 → −14 : 7 = −2` |
| cijfers 6, 8, 7, 5, 9, median | 7 | `op volgorde: 5, 6, 7, 8, 9 → de middelste is 7` |
| temperatuur 4, −2, 3, 0, 5, 1, −4, median | 1 | `op volgorde: −4, −2, 0, 1, 3, 4, 5 → de middelste is 1` |
| cijfers 6, 9, 5, 7, 8, 4, median (even) | 6,5 | `op volgorde: 4, 5, 6, 7, 8, 9 → (6 + 7) : 2 = 6,5` |
| doelpunten 2, 0, 3, 1, 2, mode | 2 | `2 komt het vaakst voor (2 keer)` |
| doelpunten 1, 1, 0, 1, 3, mode | 1 | `1 komt het vaakst voor (3 keer)` |
| cijfers 6, 8, 7, 5, 9, range | 4 | `hoogste − laagste = 9 − 5 = 4` |
| temperatuur …, highest 15, lowest −3, range | 18 | `hoogste − laagste = 15 − (−3) = 18`, suffix `graden` |
| missing 6, 8, 7, mean 7 | 7 | `gemiddeld 7 bij 4 cijfers = 4 × 7 = 28 → 28 − 6 − 8 − 7 = 7` |
| `median` 5 values / 6 values | middle / mean of the middle two | |
| `uniqueMode` `[2, 2, 3, 3, 1]` | `null` | |

Tips (§3.4.1):

| Question | Answer typed | Tip |
|---|---|---|
| cijfers 6, 8, 7, 5, 9, mean | 35 | `Deel de som nog door het aantal getallen: 35 : 5.` |
| cijfers 6, 8, 7, 5, 9, median | 7 | none: the middle as shown is the median, so correct |
| cijfers 9, 5, 6, 8, 7, median | 6 | `Zet de getallen eerst op volgorde; de mediaan is het middelste getal.` |
| cijfers 6, 9, 5, 7, 8, 4, median (even: middle two as shown 5, 7) | 6 | the median tip |
| mode, range, missing value | | no topic tips, only the fallback |

Generator invariants: forms 1/5 each; contexts 1/3 each for the four measures; values within
the context range; lengths from the context; temperature lists have a value below zero; mean
whole for every mean question; mode questions have a unique mode with 2 or 3 occurrences;
missing value: 3–5 given values in `[3, 10]`, mean in `[5, 8]`, answer in `[4, 10]`. Key:
`statistics:<measure>:<context>:<values>` and `statistics:missing:<mean>:<values>`.

## Task 2: `percentagePoints` (spec §5.34)

Files: `src/lib/topics/percentagePoints.ts`, `percentagePoints.test.ts`, `types.ts`,
`topics/index.ts`.

```ts
export type PointsContext = 'rente' | 'werkloosheid' | 'opkomst';
export const POINTS_RANGES: Readonly<Record<PointsContext, readonly [number, number]>>;
export const RELATIVE_CHANGES: readonly number[]; // 10, 20, 25, 50, 75, 100
export type Unit = 'procentpunt' | 'procent';
/** Van o% naar n%; asks the change in procentpunten or in procent. */
export function differenceQuestion(context: PointsContext, oldPercent: number, newPercent: number, asked: Unit): Question;
/** o% changes by a given amount in procentpunten or in procent; asks n. */
export function newValueQuestion(context: PointsContext, oldPercent: number, newPercent: number, given: Unit): Question;
export function generatePercentagePoints(rng: Rng): Question;
```

Label: `Procentpunten (procentpunt of procent)`.

Subjects: `De rente`, `De werkloosheid`, `De opkomst bij de verkiezingen` (in the question:
`de rente`, `de werkloosheid`, `de opkomst`). Verb `stijgt`/`daalt` by direction.

| Input | Prompt | Answer | Suffix |
|---|---|---|---|
| rente 4 → 5, procentpunt | `De rente stijgt van 4% naar 5%. Hoeveel procentpunt is dat?` | 1 | `procentpunt` |
| rente 4 → 5, procent | `De rente stijgt van 4% naar 5%. Met hoeveel procent stijgt de rente?` | 25 | `%` |
| werkloosheid 8 → 6, procent | `De werkloosheid daalt van 8% naar 6%. Met hoeveel procent daalt de werkloosheid?` | 25 | `%` |
| opkomst 60 → 75, procentpunt | `De opkomst bij de verkiezingen stijgt van 60% naar 75%. Hoeveel procentpunt is dat?` | 15 | `procentpunt` |
| rente 4 → 5, given procent | `De rente is 4%. Die stijgt met 25%. Hoeveel procent is de rente nu?` | 5 | `%` |
| rente 4 → 5, given procentpunt | `De rente is 4%. Die stijgt met 1 procentpunt. Hoeveel procent is de rente nu?` | 5 | `%` |
| werkloosheid 8 → 6, given procent | `De werkloosheid is 8%. Die daalt met 25%. Hoeveel procent is de werkloosheid nu?` | 6 | `%` |

Explanations: `5 − 4 = 1 procentpunt`; `5 − 4 = 1 → 1 van 4 = 1/4 = 25%`;
`8 − 6 = 2 → 2 van 8 = 1/4 = 25%`; `3 van 4 = 3/4 = 75%`; `r = 100`: `2 van 2 = 100%`;
`r = 10`: `5 van 50 = 1/10 = 10%`; `4 + 1 = 5%`; `25% van 4 = 1 → 4 + 1 = 5%`;
`25% van 8 = 2 → 8 − 2 = 6%`. The fraction is `pp/o` in lowest terms; it is left out when it is
whole (`r = 100`).

Tips (§3.4.1):

| Question | Answer typed | Tip |
|---|---|---|
| rente 4 → 5, procentpunt | 25 | `Procentpunten is het verschil tussen de percentages: 5 − 4 = 1.` |
| rente 4 → 5, procent | 1 | `Dat is het verschil in procentpunten; 1 van 4 is 1/4 = 25%.` |
| rente 4 → 5, given procent | 29 | `25% van 4% is 1 procentpunt: 4% + 1% = 5%.` |
| werkloosheid 8 → 6, given procent | −17 | `25% van 8% is 2 procentpunt: 8% − 2% = 6%.` |
| given procentpunt | | no topic tip |

Generator invariants: forms 1/2 each, asked/given units 1/2 each, increase 1/2; contexts 1/3
each; `o` and `n` within the context range, `n` whole, `r` from `RELATIVE_CHANGES` and a
decrease only `r ≤ 75`; `pp ≠ r` (so the tips never collide). Key:
`percentagePoints:<form>:<context>:<o>:<n>:<unit>`.

## Task 3: `sequences` (spec §5.35)

Files: `src/lib/topics/sequences.ts`, `sequences.test.ts`, `types.ts`, `topics/index.ts`.

```ts
export type Geometric = 'times2' | 'times3' | 'half';
export type Figurate = 'driehoeksgetallen' | 'kwadraatgetallen';
/** Four terms from `start` with a signed `difference`; asks the fifth. */
export function arithmeticNextQuestion(start: number, difference: number): Question;
export function geometricNextQuestion(start: number, kind: Geometric): Question;
export function nthTermQuestion(start: number, difference: number, n: number): Question;
export function figurateQuestion(kind: Figurate, n: number): Question;
export const NTH_TERMS: readonly number[]; // 10, 12, 15, 20, 25, 30, 50, 100
export function generateSequences(rng: Rng): Question;
```

Label: `Rijen (volgende getal, n-de getal, driehoeksgetallen)`.

| Input | Prompt | Answer | Explanation |
|---|---|---|---|
| arithmetic 3, +4 | `3, 7, 11, 15, … Wat is het volgende getal?` | 19 | `+4 → 15 + 4 = 19` |
| arithmetic 10, −6 (edge: crosses zero) | `10, 4, −2, −8, … Wat is het volgende getal?` | −14 | `−6 → −8 − 6 = −14` |
| arithmetic −20, +15 | `−20, −5, 10, 25, … Wat is het volgende getal?` | 40 | `+15 → 25 + 15 = 40` |
| geometric 3, times2 | `3, 6, 12, 24, … Wat is het volgende getal?` | 48 | `× 2 → 24 × 2 = 48` |
| geometric 2, times3 | `2, 6, 18, 54, … Wat is het volgende getal?` | 162 | `× 3 → 54 × 3 = 162` |
| geometric 160, half | `160, 80, 40, 20, … Wat is het volgende getal?` | 10 | `: 2 → 20 : 2 = 10` |
| geometric 16, half (edge: k = 1) | `16, 8, 4, 2, …` | 1 | |
| nth 3, 4, 20 | `3, 7, 11, 15, … Wat is het 20e getal?` | 79 | `van het 1e naar het 20e getal zijn 19 stappen van 4 → 3 + 19 × 4 = 79` |
| nth 5, 10, 100 (edge: largest) | `5, 15, 25, 35, … Wat is het 100e getal?` | 995 | `… 99 stappen van 10 → 5 + 99 × 10 = 995` |
| driehoeksgetallen 8 | `Driehoeksgetallen: 1, 3, 6, 10, … Wat is het 8e driehoeksgetal?` | 36 | `1 + 2 + … + 8 = 8 × 9 : 2 = 36` |
| kwadraatgetallen 15 | `Kwadraatgetallen: 1, 4, 9, 16, … Wat is het 15e kwadraatgetal?` | 225 | `15 × 15 = 225` |

The step in the explanation is `+4` / `−6` (signed, `MINUS`); the last term as the first term of
the sum (`−8 − 6`).

Tips (§3.4.1):

| Question | Answer typed | Tip |
|---|---|---|
| nth 3, 4, 20 | 83 | `Van het 1e naar het 20e getal zijn 19 stappen, geen 20.` |
| next, figurate | | no topic tips, only the fallback |

Generator invariants: forms 1/3 each; next term arithmetic/geometric 1/2 each, arithmetic
decreasing 30% (±5); arithmetic start `[−20, 50]`, difference `[2, 15]`, all five terms in
`[−50, 100]`; geometric kinds 1/3 each, starts `[1, 12]`, `[1, 5]`, `16 × [1, 10]`, terms ≤ 1000;
nth start `[1, 20]`, difference `[2, 10]`, `n` from `NTH_TERMS`, answer ≤ 1000; figurate kinds
1/2 each, `n ∈ [5, 20]`. Key: `sequences:<form>:<kind>:<numbers>`.

## Task 4: `formulas` (spec §5.36)

Files: `src/lib/topics/formulas.ts`, `formulas.test.ts`, `types.ts`, `topics/index.ts`.

```ts
export type WordContext = 'taxi' | 'fietsverhuur' | 'kaars';
export interface WordFormula {
  starts: readonly Rational[];
  rates: readonly Rational[];
  inputRange: readonly [number, number];
}
export const WORD_FORMULAS: Readonly<Record<WordContext, WordFormula>>;
export function wordFormulaQuestion(context: WordContext, start: Rational, rate: Rational, input: number): Question;
/** y = ax ± b with a signed `b`. */
export function letterFormulaQuestion(a: number, b: number, x: number): Question;
export type Asked = 'startgetal' | 'hellingsgetal';
/** y = ax + b at x = firstX, firstX + step, … (four values). */
export function tableQuestion(a: number, b: number, firstX: number, step: 1 | 2, asked: Asked): Question;
export function generateFormulas(rng: Rng): Question;
```

Label: `Formules (invullen, startgetal en hellingsgetal)`.

| Input | Prompt | Answer | Prefix/suffix | Explanation |
|---|---|---|---|---|
| taxi 4, 2,50, 12 | `Taxi: kosten in euro = 4 + 2,50 × aantal km. Wat kost een rit van 12 km?` | 34 | `€` | `4 + 2,50 × 12 = 4 + 30 = 34` |
| taxi 3, 2,50, 7 (edge: cents) | `… Wat kost een rit van 7 km?` | 20,50 (`expected` `20,50`) | `€` | `3 + 2,50 × 7 = 3 + 17,50 = 20,50` |
| fietsverhuur 5, 8, 4 | `Fietsverhuur: prijs in euro = 5 + 8 × aantal dagen. Wat kost 4 dagen huren?` | 37 | `€` | `5 + 8 × 4 = 5 + 32 = 37` |
| kaars 24, 2, 5 | `Kaars: lengte in cm = 24 − 2 × aantal uren. Hoe lang is de kaars na 5 uur?` | 14 | `cm` | `24 − 2 × 5 = 24 − 10 = 14` |
| kaars 24, 1,5, 5 | `Kaars: lengte in cm = 24 − 1,5 × aantal uren. …` | 16,5 | `cm` | `24 − 1,5 × 5 = 24 − 7,5 = 16,5` |
| letter 3, −4, 5 | `y = 3x − 4. Wat is y als x = 5?` | 11 | — | `3 × 5 − 4 = 15 − 4 = 11` |
| letter 3, −4, −2 | `y = 3x − 4. Wat is y als x = −2?` | −10 | — | `3 × (−2) − 4 = −6 − 4 = −10` |
| letter 2, 7, 3 | `y = 2x + 7. Wat is y als x = 3?` | 13 | — | `2 × 3 + 7 = 6 + 7 = 13` |
| table 3, 5, 2, step 2, hellingsgetal | `Tabel: bij x = 2, 4, 6, 8 hoort y = 11, 17, 23, 29. Wat is het hellingsgetal?` | 3 | — | `x wordt 2 groter, y wordt 6 groter → 6 : 2 = 3` |
| table 3, 4, 1, step 1, hellingsgetal | `Tabel: bij x = 1, 2, 3, 4 hoort y = 7, 10, 13, 16. …` | 3 | — | `x wordt 1 groter, y wordt 3 groter → 3` |
| table −2, 20, 1, step 2, hellingsgetal | `… x = 1, 3, 5, 7 hoort y = 18, 14, 10, 6. …` | −2 | — | `x wordt 2 groter, y wordt 4 kleiner → −4 : 2 = −2` |
| table 3, 5, 2, step 2, startgetal | `… Wat is het startgetal?` | 5 | — | `hellingsgetal 3 → bij x = 0: 11 − 2 × 3 = 5` |
| table −2, 20, 1, step 2, startgetal | | 20 | — | `hellingsgetal −2 → bij x = 0: 18 − 1 × (−2) = 20` |

Tips (§3.4.1):

| Question | Answer typed | Tip |
|---|---|---|
| table 3, 5, 2, step 2, hellingsgetal | 6 | `y wordt 6 groter als x 2 groter wordt; per 1 is dat 6 : 2 = 3.` |
| table −2, 20, 1, step 2, hellingsgetal | −4 | `y wordt 4 kleiner als x 2 groter wordt; per 1 is dat −4 : 2 = −2.` |
| table, step 1, hellingsgetal | | no topic tip |
| table 3, 5, 2, startgetal | 11 | `Het startgetal is y bij x = 0, niet bij x = 2.` |
| substitution | | no topic tips, only the fallback |

Generator invariants: forms 1/2 each; word/letter 1/2 each, word contexts 1/3 each, with the
starts, rates and input ranges of the spec; kaars length ≥ 1; money answers with at most 2
decimals; letter `a ∈ [2, 9]`, `|b| ∈ [1, 20]`, `x ∈ [−5, 10] \ {0}`, negative 25% (±5); table
`firstX ∈ [1, 3]`, step 1/2 each, `a ∈ [−5, 10] \ {0}`, negative 25% (±5),
`b ∈ [−10, 30]`, every y in `[−50, 100]`, asked 1/2 each. Key:
`formulas:<form>:<context>:<numbers>`.

## Task 5: `equations` (spec §5.37)

Files: `src/lib/topics/equations.ts`, `equations.test.ts`, `types.ts` (also the doc comment of
`Step.prefix`: `'€'`, `'1 :'` or `'x ='`), `topics/index.ts`.

```ts
/** ax ± b = c, with a signed `b`; c follows from the solution x. */
export function linearQuestion(a: number, b: number, x: number): Question;
/** a(x ± b) = c. */
export function bracketQuestion(a: number, b: number, x: number): Question;
/** ax ± b = cx ± d, with `c` the coefficient on the right (1 is written `x`); d follows from x. */
export function bothSidesQuestion(a: number, b: number, c: number, x: number): Question;
export function generateEquations(rng: Rng): Question;
```

Label: `Vergelijkingen (x oplossen)`. Every step: prefix `x =`, prompt `Los op: <equation>`.
Terms are written with `MINUS` and spaces around `+`/`−`/`=` (`3x − 5 = −20`, `4(x − 2) = 12`).

| Input | Equation | Answer | Explanation |
|---|---|---|---|
| linear 3, 5, 5 | `3x + 5 = 20` | 5 | `3x + 5 = 20 → 3x = 20 − 5 = 15 → x = 15 : 3 = 5` |
| linear 3, 20, −5 | `3x + 20 = 5` | −5 | `3x + 20 = 5 → 3x = 5 − 20 = −15 → x = −15 : 3 = −5` |
| linear 3, −5, 7 | `3x − 5 = 16` | 7 | `3x − 5 = 16 → 3x = 16 + 5 = 21 → x = 21 : 3 = 7` |
| linear 4, −6, −2 | `4x − 6 = −14` | −2 | `4x − 6 = −14 → 4x = −14 + 6 = −8 → x = −8 : 4 = −2` |
| bracket 4, −2, 5 | `4(x − 2) = 12` | 5 | `4(x − 2) = 12 → x − 2 = 12 : 4 = 3 → x = 3 + 2 = 5` |
| bracket 3, 4, −6 | `3(x + 4) = −6` | −6 | `3(x + 4) = −6 → x + 4 = −6 : 3 = −2 → x = −2 − 4 = −6` |
| both 5, 3, 2, 5 | `5x + 3 = 2x + 18` | 5 | `5x + 3 = 2x + 18 → 3x + 3 = 18 → 3x = 18 − 3 = 15 → x = 15 : 3 = 5` |
| both 3, 3, 2, 15 (edge: one x left) | `3x + 3 = 2x + 18` | 15 | `3x + 3 = 2x + 18 → x + 3 = 18 → x = 18 − 3 = 15` |
| both 4, −7, 1, 3 (edge: `x` on the right) | `4x − 7 = x + 2` | 3 | `4x − 7 = x + 2 → 3x − 7 = 2 → 3x = 2 + 7 = 9 → x = 9 : 3 = 3` |
| both 5, 2, 3, −4 (edge: negative d) | `5x + 2 = 3x − 6` | −4 | `5x + 2 = 3x − 6 → 2x + 2 = −6 → 2x = −6 − 2 = −8 → x = −8 : 2 = −4` |

Tips (§3.4.1): the solution with the sign of the moved constant flipped, only when whole.

| Question | Answer typed | Tip |
|---|---|---|
| linear 2, 4, 3 (`2x + 4 = 10`) | 7 | `Haal 4 aan beide kanten weg: 2x = 10 − 4.` |
| linear 2, −4, 7 (`2x − 4 = 10`) | 3 | `Tel 4 aan beide kanten op: 2x = 10 + 4.` |
| linear 3, 5, 5 (`3x + 5 = 20`) | | none: `25 : 3` is not whole |
| bracket 4, −2, 5 | 1 | `Tel 2 aan beide kanten op: x = 3 + 2.` |
| both 5, 3, 2, 5 | 7 | `Haal 3 aan beide kanten weg: 3x = 18 − 3.` |
| both 3, 3, 2, 15 | 21 | `Haal 3 aan beide kanten weg: x = 18 − 3.` |

Generator invariants: forms 1/3 each; `x ∈ [−10, 20] \ {0}`, negative 25% (±5); `a ∈ [2, 9]`
(both sides: `[3, 9]`, `c ∈ [1, a − 1]`); `|b| ∈ [1, 20]`, sign 1/2; right side not 0,
`|c| ≤ 100` (linear, bracket), `|d| ∈ [1, 50]` (both sides). Key: `equations:<equation>`.

## Task 6: `probability` (spec §5.38)

Files: `src/lib/topics/probability.ts`, `probability.test.ts`, `types.ts`, `topics/index.ts`.

```ts
export interface DieEvent { text: string; outcomes: readonly number[] }
export const DIE_EVENTS: readonly DieEvent[]; // the nine events of the spec, in its order
export type Colour = 'rood' | 'blauw' | 'groen' | 'geel';
export interface Marbles { colour: Colour; count: number }
export function dieQuestion(event: DieEvent): Question;
/** Asks `asked`, or with `not` a marble that is not `asked`. */
export function marblesQuestion(bag: readonly Marbles[], asked: Colour, not: boolean): Question;
export function generateProbability(rng: Rng): Question;
```

Label: `Kans (dobbelsteen, knikkers)`. Every step: `simplestFractionStep` with
`decimalAllowed: true`. Adjectives: rode, blauwe, groene, gele.

| Input | Prompt | Answer | Explanation |
|---|---|---|---|
| die `een even getal` | `Je gooit met een dobbelsteen. Hoe groot is de kans op een even getal?` | 1/2 | `3 van de 6 uitkomsten: 2, 4, 6 → 3/6 = 1/2` |
| die `een 6` | `… de kans op een 6?` | 1/6 | `1 van de 6 uitkomsten: 6 → 1/6` |
| die `geen 6` | `… de kans op geen 6?` | 5/6 | `5 van de 6 uitkomsten: 1, 2, 3, 4, 5 → 5/6` |
| die `meer dan 2` | | 2/3 | `4 van de 6 uitkomsten: 3, 4, 5, 6 → 4/6 = 2/3` |
| rood 3, blauw 5, groen 2; blauw | `In een zak zitten 3 rode, 5 blauwe en 2 groene knikkers. Je pakt er zonder te kijken één. Hoe groot is de kans op een blauwe?` | 1/2 | `5 van de 3 + 5 + 2 = 10 knikkers zijn blauw → 5/10 = 1/2` |
| rood 1, blauw 4; rood (edge: two colours, one marble) | `In een zak zitten 1 rode en 4 blauwe knikkers. …op een rode?` | 1/5 | `1 van de 1 + 4 = 5 knikkers is rood → 1/5` |
| rood 3, blauw 5, groen 2; not rood | `… Hoe groot is de kans op een knikker die niet rood is?` | 7/10 | `7 van de 3 + 5 + 2 = 10 knikkers zijn niet rood → 7/10` |

Answers for die `een even getal`: `1/2` ✔, `0,5` ✔, `3/6` ✘ with the simplify tip (§3.4.1),
`0,33` for `meer dan 4` ✘ with the approximation tip.

Tips (§3.4.1):

| Question | Answer typed | Tip |
|---|---|---|
| rood 3, blauw 5, groen 2; rood | 3/7 | `Deel door het totaal aantal knikkers: 3 + 5 + 2 = 10.` |
| rood 3, blauw 5, groen 2; blauw | 1 | the same tip (5/5) |
| rood 3, blauw 5, groen 2; not rood | 7/3 | the same tip |
| die | | no topic tip |

Generator invariants: forms 1/2 each; die events equally likely; marbles 2 or 3 different
colours, counts `[1, 12]`, total `[5, 20]`, `not` 25% (±5); answer in `(0, 1)`. Key:
`probability:die:<event>` and `probability:marbles:<bag>:<asked>:<not>`.

## Task 7: the set Verbanden & statistiek (spec §4.1, §4.2)

Files: `src/lib/sets.ts`, `sets.test.ts`, `session.test.ts`, `src/components/SetGlyph.svelte`.

- `RELATIONS_SET`: id `verbanden`, name `Verbanden & statistiek`, description `Statistiek, rijen,
  formules, vergelijkingen en kans`, topics `statistics`, `percentagePoints`, `sequences`,
  `formulas`, `equations`, `probability` (weight 1 each, in this order), `tablesPercent: 15`.
  Append it to `PRACTICE_SETS` after `GEOMETRY_SET`.
- Glyph `verbanden`: three rising bars (violet, amber, blue, the `fv`/`fa`/`fb` classes), added
  to `KNOWN`.

| Test | Expected |
|---|---|
| `PRACTICE_SETS` ids | `…, 'meetkunde', 'verbanden'` |
| `describeSetTopics(RELATIONS_SET)` | the six labels, then `15% tafels` |
| `buildSession(RELATIONS_SET, 15, rng)` | 2 tables, per topic sorted `[2, 2, 2, 2, 2, 3]` |
| `buildSession(RELATIONS_SET, n, rng)` for every `SESSION_SIZES` | `n` questions with unique keys |

## After the tasks

- Final review over all tasks against the spec and this plan, including `npm test`,
  `npm run check`, `npm run build`, and `dist/sw.js` with exactly one `manifest.webmanifest`
  entry and the `woff2` font.
- Check the longest prompts on a phone (the marbles of `probability`, the temperature list of
  `statistics`, the `formulas` table): ask the user, `npm run dev` is not pre-approved.
- Update the Status in `CLAUDE.md` (Verbanden & statistiek done; the roadmap table starts with
  Talstelsels), mark §12.1 item 6 as done, and delete this plan file, in one `docs:` commit.
