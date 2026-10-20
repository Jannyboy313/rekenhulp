# Verhoudingen v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to
> implement this plan task by task. This is a light plan: per task the files, signatures, test
> cases and tips. Write the code yourself, TDD, one commit per task.

**Goal:** Add three topics to the existing **Verhoudingen** set: `percentChange` (spec §5.23),
`scale` (§5.24) and `ratioProblems` (§5.25). The set grows from 2 to 5 topics with weight 1 and
gets the description "Procenten, verhoudingen en schaal" (§4.1).

**Spec:** `docs/superpowers/specs/2026-10-05-rekenhulp-design.md`. Read §3.4.1 (the tip rules,
incl. the money exception, and the rows of the three topics: they are the source of truth for tip
wording), §4.1–§4.2, §5.12–§5.13 (the v1 topics this builds on), §5.23–§5.25, §6 and §8.

**Architecture:** three new generator modules in `src/lib/topics/`, following the existing
pattern: a pure `(rng) => Question`, answers checked by the step factories in `steps.ts`
(`numberStep`, `fractionStep`, `simplestFractionStep`), tips as `Diagnose` functions built from
values the generator already has. No component, keypad or `lib/expr` changes: the `€` prefix,
the `1 :` prefix (a plain `prefix` string) and the unit suffix already work.

## Prerequisites & command permissions

- Allowed: `npm test`, `npm run check`, `npm run build`, `git add <path>`, `git commit`,
  `git status`, `git diff`, `git log`, `ls`, `cat`, `echo`, `grep`.
- **Forbidden:** `npx`, `node`, `tail`, `head`, `wc`, `sed`, `rm`, `npm run format`,
  `npm run dev`, `npm run preview`, `git checkout`, `git reset`, `git push`, `git add -u`,
  `git add .`. View files with the Read tool; filter output with `grep`, e.g.
  `npm test 2>&1 | grep -E "FAIL|Tests |Test Files"`.
- Before `git add <file>`, run `git diff <file>` and check that every hunk is yours: another
  session may edit `main` at the same time. Stage explicit paths only.
- Format by hand (Prettier style: 100 columns, single quotes, trailing commas).
- Every commit message ends with the trailer
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (pass it via a second `-m`).
- `npm run check` stays at 0 errors and 0 warnings after every task.
- If a commit fails because 1Password signing is locked, stop and ask the user to unlock it.
  Never bypass signing.

## Notes for the implementer

- **Characters:** write U+202F (thousands separator), U+00A0 (after `€`) and U+2212 (minus) in
  code and tests as `'\u{202f}'`, `'\u{a0}'` and `'\u{2212}'` (or use `GROUP_SEPARATOR`,
  `NO_BREAK_SPACE`, `MINUS` from `format.ts`). Never paste the raw characters. After writing a
  file, `grep -c $'\xc2\xa0' <file>` must print 0.
- **Number formatting:** `formatRational` (decimal comma, grouping from 5 digits),
  `formatInteger`, `formatMoney` (whole euros bare, otherwise 2 decimals; throws on more than 2
  decimals), `formatEuro` (`€` + no-break space + amount), `formatMixedNumber`.
- **Fraction text pitfall (§8):** never put a number, a space and a fraction side by side unless
  it is a mixed number, and never a decimal next to `/`.
- **`noUncheckedIndexedAccess`:** do not destructure a ternary of array literals
  (`const [a, b] = c ? [x, y] : [y, x]`); write two ternaries.
- **Generators are pure:** every random choice goes through `rng`; use `pick`, `randomInt`,
  `drawUntil` from `random.ts`. Build candidate lists and `pick` from them rather than retry
  loops where the constraints are tight.
- **Tips** fire only when the answer equals exactly what the mistake produces; for money with
  more than 2 decimals also when it equals that value rounded half up to cents (§3.4.1). Tips are
  never checked against the correct answer (a correct answer never reaches `diagnose`).
- **Every generator test file** has, besides the case tables below, a seeded invariant test
  (1000 questions, `createRng(<fixed seed>)`): ranges per form, `check(expected input)` is
  correct, non-empty prompt, and each form / context occurs. For money answers the expected input
  is the expected string (`96,80`).
- **Statistical assertions** use fixed seeds and wide margins. If one fails narrowly, report it
  instead of tuning the generator to the seed.
- **Prompts** in this plan are exact; the `€ 80` in a prompt is `formatEuro`, and numbers of 5+
  digits are grouped.

## File structure

```
src/lib/
  rational.ts (+ .test.ts)          roundHalfUpToCents
  tips.ts (+ .test.ts)              moneyTip
  types.ts                          Topic + percentChange, scale, ratioProblems
  topics/percentages.ts             export pickByIntegerShare, hasAtMostTwoDecimals, percentLabel
  topics/fractionConversion.ts      export formatPercentNumber
  topics/index.ts                   three generators and labels
  topics/percentChange.ts (+ .test.ts)   NEW (two tasks)
  topics/scale.ts (+ .test.ts)           NEW
  topics/ratioProblems.ts (+ .test.ts)   NEW (two tasks)
  sets.ts (+ .test.ts)              PROPORTIONS_SET: five topics, new description
  session.test.ts                   Verhoudingen quota
CLAUDE.md                           status, roadmap, follow-ups
```

## Tasks

| #   | Task                                                        | Spec          |
| --- | ----------------------------------------------------------- | ------------- |
| 1   | Money tip helpers and shared exports                        | §3.4.1        |
| 2   | `percentChange` part 1: percentage change                   | §5.23         |
| 3   | `percentChange` part 2: VAT and original value              | §5.23         |
| 4   | `scale`                                                     | §5.24         |
| 5   | `ratioProblems` part 1: part of the whole and mixing        | §5.25         |
| 6   | `ratioProblems` part 2: per unit                            | §5.25         |
| 7   | The Verhoudingen set with five topics                       | §4.1, §4.2    |
| 8   | Docs and final verification                                 | —             |

Review bundles: tasks 1–3, tasks 4–6, task 7–8, then the final review (incl. `dist/sw.js`).

---

## Task 1: Money tip helpers and shared exports

**Files:** `src/lib/rational.ts`, `src/lib/rational.test.ts`, `src/lib/tips.ts`,
`src/lib/tips.test.ts`, `src/lib/topics/percentages.ts`, `src/lib/topics/fractionConversion.ts`

**Signatures:**

```ts
// rational.ts
/** A non-negative value rounded half up to 2 decimals (whole cents). */
export function roundHalfUpToCents(value: Rational): Rational;

// tips.ts
/**
 * The tip when the answer equals `mistaken` exactly, or `mistaken` rounded half up to cents
 * (spec §3.4.1, money exception).
 */
export function moneyTip(mistaken: Rational, tip: string): Diagnose;
```

Exports without behaviour change: `pickByIntegerShare`, `hasAtMostTwoDecimals` and `percentLabel`
in `percentages.ts`; `formatPercentNumber` in `fractionConversion.ts`.

No caller passes a negative value, so implement it as `floor(value × 100 + 1/2) / 100` with
bigint arithmetic and test only non-negative values.

**Tests:**

| Function             | Input                              | Expected                         |
| -------------------- | ---------------------------------- | -------------------------------- |
| `roundHalfUpToCents` | `87,975`                           | `87,98`                          |
|                      | `76,472`                           | `76,47`                          |
|                      | `0,005`                            | `0,01`                           |
|                      | `0,004`                            | `0`                              |
|                      | `12,5`                             | `12,5` (unchanged)               |
|                      | `1/3`                              | `0,33`                           |
|                      | `2/3`                              | `0,67`                           |
| `moneyTip(87,975)`   | given `87,98`                      | the tip                          |
|                      | given `87,975`                     | the tip                          |
|                      | given `87,97`                      | `undefined`                      |
| `moneyTip(16,8)`     | given `16,8`                       | the tip                          |
|                      | given `16,80` (same value)         | the tip                          |

**Commit:** `feat: money tips compare with the value rounded to cents`

---

## Task 2: `percentChange` part 1: percentage change

**Files:** `src/lib/types.ts`, `src/lib/topics/index.ts`, `src/lib/topics/percentChange.ts`
(new), `src/lib/topics/percentChange.test.ts` (new)

**Registration:** add `'percentChange'` to `Topic`; register `generatePercentChange` and the label
`'Procentuele verandering (stijging en daling, btw, oude prijs)'`. The generator picks from a
`FORMS` list that holds only `'change'` in this task; task 3 adds `'vat'` and `'original'`.

**Signatures:**

```ts
type ChangeContext = 'price' | 'inhabitants' | 'visitors';

export function generatePercentChange(rng: Rng): Question;

/** One exercise of the form; exported for the case tests. */
export function changeQuestion(
  context: ChangeContext,
  oldValue: number,
  newValue: number,
): Question;

/** The change itself, the new value as a percentage of the old, or the change relative to the new value. */
export function percentageChangeTip(oldValue: number, newValue: number): Diagnose;

/** '92 − 80 = 12 → 10% = 8, 5% = 4 → 15% = 12' (partExplanation of §5.12 on the old value). */
export function percentageChangeExplanation(oldValue: number, newValue: number): string;
```

**Generation:** increase or decrease (50/50), then the context (uniform), then `p` from
`PERCENTAGES` (increase) or `DISCOUNT_PERCENTAGES` (decrease), then the old value from
`NICE_WHOLES` such that `p%` of it is a whole number. `p` is the `Percentage` whose `value`
equals `|new − old| / old × 100`; `changeQuestion` looks it up in `PERCENTAGES` (needed for the
`base` of `partExplanation`). The step is a `fractionStep` with `answer: p.value`, suffix `%`.
Key: `percentChange:change:<context>:<old>:<new>`.

**Prompts:**

| Context     | Prompt                                                                 |
| ----------- | ---------------------------------------------------------------------- |
| price       | `Een prijs gaat van € 80 naar € 92. Hoeveel procent stijging?`         |
| inhabitants | `Een dorp gaat van 800 naar 920 inwoners. Hoeveel procent stijging?`   |
| visitors    | `Een museum gaat van 400 naar 340 bezoekers per dag. Hoeveel procent daling?` |

**Cases:**

| Old → new         | Input                     | Correct | Tip                                                                     |
| ----------------- | ------------------------- | ------- | ----------------------------------------------------------------------- |
| 80 → 92 (price)   | `15`                      | ✔       | —                                                                       |
|                   | `12`                      | ✘       | `Dat is de stijging zelf; reken uit hoeveel procent van 80 dat is.`     |
|                   | `115`                     | ✘       | `Dat is 92 als percentage van 80; de stijging is 115% − 100% = 15%.`    |
|                   | `150`                     | ✘       | `Je antwoord is 10 keer te groot. …` (factor-of-ten fallback)           |
| 200 → 250         | `20`                      | ✘       | `Reken met de oude waarde: de stijging is een percentage van 200, niet van 250.` |
| 400 → 340         | `15`                      | ✔       | —                                                                       |
|                   | `60`                      | ✘       | `Dat is de daling zelf; reken uit hoeveel procent van 400 dat is.`      |
|                   | `85`                      | ✘       | `Dat is 340 als percentage van 400; de daling is 100% − 85% = 15%.`     |
| 250 → 200         | `25`                      | ✘       | `Reken met de oude waarde: de daling is een percentage van 250, niet van 200.` |
| 80 → 100          | `20`                      | ✘       | the change tip (the change 20 also equals 20/100 × 100; the change tip comes first) |
| 80 → 90           | `12,5`, `25/2`, `12 1/2`  | ✔       | expected `12 1/2`                                                       |
| 80 → 90           | `112 1/2`                 | ✘       | `Dat is 90 als percentage van 80; de stijging is 112½% − 100% = 12½%.`  |

The `−` in tips and explanations is U+2212; `12½` uses `formatPercentage`.

**Explanations:**

| Old → new | Explanation                                    |
| --------- | ---------------------------------------------- |
| 80 → 92   | `92 − 80 = 12 → 10% = 8, 5% = 4 → 15% = 12`    |
| 400 → 340 | `400 − 340 = 60 → 10% = 40, 5% = 20 → 15% = 60` |
| 80 → 100  | `100 − 80 = 20 → 25% = 80 : 4 = 20`            |
| 80 → 90   | `90 − 80 = 10 → 12½% = 80 : 8 = 10`            |

**Invariants (seeded, 1000):** old in `NICE_WHOLES`, new a positive integer, `p` from the right
list per direction, the answer equals `|new − old| / old × 100`, all three contexts and both
directions occur, the price prompt contains `€\u{a0}`.

**Commit:** `feat: percentChange topic with the percentage of a change`

---

## Task 3: `percentChange` part 2: VAT and original value

**Files:** `src/lib/topics/percentChange.ts`, `src/lib/topics/percentChange.test.ts`

`FORMS` becomes `['change', 'vat', 'original']`, each equally likely.

**Signatures:**

```ts
export type VatRate = 21 | 9;

export function vatQuestion(rate: VatRate, adding: boolean, withoutVat: number): Question;
export function vatAddedTip(rate: VatRate, withoutVat: number): Diagnose;
export function vatRemovedTip(rate: VatRate, withoutVat: number): Diagnose;
export function vatExplanation(rate: VatRate, adding: boolean, withoutVat: number): string;

export function originalQuestion(p: Percentage, increase: boolean, oldPrice: number): Question;
export function originalTip(p: Percentage, increase: boolean, newPrice: Rational): Diagnose;
/** Via the base b = gcd(100, p): '75% = 60 → 25% = 20 → 100% = 80'. */
export function originalExplanation(p: Percentage, increase: boolean, oldPrice: number): string;
```

**VAT generation:** rate (50/50), direction (50/50). Adding: the price without VAT from
`NICE_WHOLES`. Removing: from `[10, 20, …, 90, 100, 200, …, 900]`. Price with VAT =
without × (100 + rate) / 100 (always at most 2 decimals). `numberStep`, prefix `€`, expected
`formatMoney(answer)`. Key: `percentChange:vat:<add|remove>:<rate>:<without>`.

Prompts: `€ 80 zonder btw. Met 21% btw = ?` and `€ 96,80 met 21% btw. Zonder btw = ?`.

**VAT cases:**

| Case                 | Input     | Correct | Tip                                                                              |
| -------------------- | --------- | ------- | -------------------------------------------------------------------------------- |
| add 21% to 80        | `96,80`, `96,8` | ✔ | expected `96,80`                                                              |
|                      | `16,80`   | ✘       | `Dat is de btw zelf; tel die nog op bij de prijs.`                               |
| add 9% to 85         | `92,65`   | ✔       | —                                                                                |
| remove 21%, 96,80    | `80`      | ✔       | expected `80`                                                                    |
|                      | `76,47`   | ✘       | `De btw is 21% van de prijs zonder btw. € 96,80 is 121%: reken terug naar 1%.`   |
|                      | `76,472`  | ✘       | same tip (exact value)                                                           |
|                      | `16,80`   | ✘       | `Dat is de btw; gevraagd is de prijs zonder btw.`                                |
| remove 9%, 327       | `300`     | ✔       | —                                                                                |
|                      | `297,57`  | ✘       | `De btw is 9% van de prijs zonder btw. € 327 is 109%: reken terug naar 1%.`      |

**VAT explanations** (all amounts with `formatMoney`):

| Case              | Explanation                                                                      |
| ----------------- | -------------------------------------------------------------------------------- |
| add 21% to 80     | `10% = 80 : 10 = 8, 20% = 16, 1% = 0,80 → 21% = 16,80 → 80 + 16,80 = 96,80`     |
| add 9% to 80      | `10% = 80 : 10 = 8, 1% = 0,80 → 9% = 8 − 0,80 = 7,20 → 80 + 7,20 = 87,20`       |
| add 21% to 85     | `10% = 85 : 10 = 8,50, 20% = 17, 1% = 0,85 → 21% = 17,85 → 85 + 17,85 = 102,85` |
| remove 21%, 96,80 | `121% = 96,80 → 1% = 96,80 : 121 = 0,80 → 100% = 80`                             |
| remove 9%, 327    | `109% = 327 → 1% = 327 : 109 = 3 → 100% = 300`                                   |

**Original value generation:** discount (`p` from `DISCOUNT_PERCENTAGES`) or increase (`p` from
`INCREASE_PERCENTAGES`), 50/50. The old price from `NICE_WHOLES` such that the new price
`old × (100 ∓ p) / 100` has at most 2 decimals **and** the base amount `old × b / 100` is whole
cents (only `p = 12½` can break this). Use `pickByIntegerShare` on the new price (80% integer).
Items: discount `een jas`, `een fiets`, `een tent`; increase `een abonnement`, `een kaartje`,
`een les` (uniform). `numberStep`, prefix `€`, answer the old price. Key:
`percentChange:original:<discount|increase>:<p>:<old>`.

Prompts: `Na 25% korting kost een jas € 60. Wat was de oude prijs?` and
`Na 15% verhoging kost een abonnement € 46. Wat was de oude prijs?`.

`b = gcd(100, p)` with `12½` for `p = 12½` (compute on doubled integers: `gcd(200, 2p) / 2`). When
`b` equals `100 ∓ p`, the middle step is left out.

**Original value cases** (tips through `moneyTip`):

| Case                     | Input            | Correct | Tip                                                                                     |
| ------------------------ | ---------------- | ------- | --------------------------------------------------------------------------------------- |
| 25% korting, new 60      | `80`             | ✔       | —                                                                                       |
|                          | `75`             | ✘       | `De korting is 25% van de oude prijs, niet van € 60. € 60 is 75% van de oude prijs.`    |
|                          | `45`             | ✘       | `Na korting is de prijs lager, dus de oude prijs is hoger dan € 60.`                    |
| 15% verhoging, new 46    | `40`             | ✔       | —                                                                                       |
|                          | `39,10`          | ✘       | `De verhoging is 15% van de oude prijs, niet van € 46. € 46 is 115% van de oude prijs.` |
|                          | `52,90`          | ✘       | `Na een verhoging is de prijs hoger, dus de oude prijs is lager dan € 46.`              |
| 15% korting, new 76,50   | `90`             | ✔       | —                                                                                       |
|                          | `87,98`, `87,975`| ✘       | `De korting is 15% van de oude prijs, niet van € 76,50. € 76,50 is 85% van de oude prijs.` |

**Original value explanations:**

| Case                      | Explanation                              |
| ------------------------- | ---------------------------------------- |
| 25% korting, new 60       | `75% = 60 → 25% = 20 → 100% = 80`        |
| 15% verhoging, new 46     | `115% = 46 → 5% = 2 → 100% = 40`         |
| 50% korting, new 30       | `50% = 30 → 100% = 60`                   |
| 12½% korting, new 70      | `87½% = 70 → 12½% = 10 → 100% = 80`      |
| 15% korting, new 76,50    | `85% = 76,50 → 5% = 4,50 → 100% = 90`    |

**Invariants (seeded, 1000):** all three forms occur; VAT: both rates and directions, removing
uses a 1-significant-digit price; original: the old price is in `NICE_WHOLES`, the new price has
at most 2 decimals, about 80% of new prices are whole (wide margin); `check(expected)` correct
for every question (money expected strings like `96,80`).

**Commit:** `feat: VAT and original price in percentChange`

---

## Task 4: `scale`

**Files:** `src/lib/types.ts`, `src/lib/topics/index.ts`, `src/lib/topics/scale.ts` (new),
`src/lib/topics/scale.test.ts` (new)

**Registration:** add `'scale'` to `Topic`; register `generateScale` and the label
`'Schaal (kaart en tekening, schaal bepalen)'`.

**Signatures:**

```ts
export const SCALES: readonly number[]; // spec §5.24, 100 … 1 000 000
type ScaleForm = 'mapToReal' | 'realToMap' | 'findScale';

export function generateScale(rng: Rng): Question;
export function scaleQuestion(form: ScaleForm, n: number, mapCm: Rational): Question;

/** 'm' for n ≤ 5000 (op de tekening), 'km' from 10 000 (op de kaart). */
export function realUnit(n: number): 'm' | 'km';
/** The real distance of mapCm on scale 1 : n, in realUnit(n). */
export function realDistance(n: number, mapCm: Rational): Rational;
/** '1 cm = 25 000 cm = 250 m = 0,25 km', or for m: '1 cm = 250 cm = 2,5 m'. */
export function oneCentimetre(n: number): string;
export function scaleExplanation(form: ScaleForm, n: number, mapCm: Rational): string;
export function scaleTip(form: ScaleForm, n: number, mapCm: Rational): Diagnose;
```

**Generation:** form (uniform), then `n` from `SCALES` (uniform), then the map distance from the
candidates for that `n`: `0,5 … 0,9`, `1 … 9,9` in steps of 0,1, and the integers `10 … 30`,
kept when the real distance lies in `[0,1; 1000]` with at most 2 decimals. Every `n` has
candidates (check in a test). Map → real: `numberStep`, suffix the real unit. Real → map:
suffix `cm`. Find the scale: answer `n`, prefix `'1\u{a0}:'`, no suffix. Key:
`scale:<form>:<n>:<map distance>`.

**Prompts:**

| Form              | Prompt                                                       | Answer | Affix      |
| ----------------- | ------------------------------------------------------------ | ------ | ---------- |
| map → real        | `Schaal 1 : 25 000. 4 cm op de kaart is in het echt ? km`    | 1      | suffix km  |
| map → real (m)    | `Schaal 1 : 250. 3 cm op de tekening is in het echt ? m`     | 7,5    | suffix m   |
| real → map        | `Schaal 1 : 50 000. 3 km in het echt is op de kaart ? cm`    | 6      | suffix cm  |
| find the scale    | `4 cm op de kaart is 2 km in het echt. Schaal 1 : ?`         | 50 000 | prefix 1 : |
| find the scale (m)| `3 cm op de tekening is 7,5 m in het echt. Schaal 1 : ?`     | 250    | prefix 1 : |

**Cases** (the tip replaces the factor-of-ten fallback: `diagnose` runs first):

| Case                     | Input            | Correct | Tip                                                                                   |
| ------------------------ | ---------------- | ------- | ------------------------------------------------------------------------------------- |
| map → real, 25 000, 4 cm | `1`              | ✔       | —                                                                                     |
|                          | `1000`, `100000` | ✘       | `Reken in dezelfde eenheid: 1 cm op de kaart is 25 000 cm = 250 m = 0,25 km in het echt.` |
|                          | `0,25`           | ✘       | none                                                                                  |
| map → real, 250, 3 cm    | `7,5`            | ✔       | —                                                                                     |
|                          | `750`            | ✘       | `Reken in dezelfde eenheid: 1 cm op de tekening is 250 cm = 2,5 m in het echt.`       |
| real → map, 50 000, 3 km | `6`              | ✔       | —                                                                                     |
|                          | `0,6`, `60`      | ✘       | `Reken in dezelfde eenheid: 1 cm op de kaart is 50 000 cm = 500 m = 0,5 km in het echt.` |
| find, 4 cm, 2 km         | `50000`          | ✔       | expected `50 000` (grouped)                                                           |
|                          | `500`, `0,5`     | ✘       | `Reken eerst beide afstanden om naar cm: 2 km = 200 000 cm.`                          |
| find, 3 cm, 7,5 m        | `250`            | ✔       | —                                                                                     |
|                          | `2,5`            | ✘       | `Reken eerst beide afstanden om naar cm: 7,5 m = 750 cm.`                             |

**Explanations:**

| Case                     | Explanation                                                   |
| ------------------------ | ------------------------------------------------------------- |
| map → real, 25 000, 4 cm | `1 cm = 25 000 cm = 250 m = 0,25 km → 4 × 0,25 = 1 km`        |
| map → real, 250, 3 cm    | `1 cm = 250 cm = 2,5 m → 3 × 2,5 = 7,5 m`                     |
| map → real, 100, 7 cm    | `1 cm = 100 cm = 1 m → 7 × 1 = 7 m`                           |
| real → map, 50 000, 3 km | `1 cm = 50 000 cm = 500 m = 0,5 km → 3 : 0,5 = 6 cm`          |
| find, 4 cm, 2 km         | `2 km = 200 000 cm → 200 000 : 4 = 50 000`                    |
| find, 3 cm, 7,5 m        | `7,5 m = 750 cm → 750 : 3 = 250`                              |

**Invariants (seeded, 1000):** all forms and both units occur; the map distance is in
`[0,5; 30]` with at most 1 decimal and at most 2 significant digits; the real distance is in
`[0,1; 1000]` with at most 2 decimals; the unit is `m` exactly when `n ≤ 5000`, and the prompt
says `tekening` exactly then; `check(expected)` is correct.

**Commit:** `feat: scale topic`

---

## Task 5: `ratioProblems` part 1: part of the whole and mixing

**Files:** `src/lib/types.ts`, `src/lib/topics/index.ts`, `src/lib/topics/ratioProblems.ts`
(new), `src/lib/topics/ratioProblems.test.ts` (new)

**Registration:** add `'ratioProblems'` to `Topic`; register `generateRatioProblems` and the label
`'Verhoudingsverhaaltjes (deel van het geheel, mengen, per eenheid)'`. `FORMS` holds `'part'` and
`'mix'` in this task; task 6 adds `'unit'`.

**Signatures:**

```ts
export interface GroupContext {
  id: 'class' | 'marbles' | 'audience';
  /** Plural names for tips and explanations: ['jongens', 'meisjes']. */
  groups: readonly [string, string];
  /** 'In een klas is jongens : meisjes = 2 : 3.' */
  intro(a: number, b: number): string;
  /** The question for group i: 'Welk deel van de klas is jongen?' / 'Hoeveel procent …' */
  question(index: 0 | 1, asPercentage: boolean): string;
}

export interface Ingredient {
  name: string; // 'siroop', 'witte verf'
  withArticle: string; // 'de siroop', 'het water'
}
export interface MixContext {
  id: 'syrup' | 'mortar' | 'paint';
  unit: 'ml' | 'kg' | 'L';
  ingredients: readonly [Ingredient, Ingredient];
  mixture: string; // 'limonade', 'mortel', 'lichtblauwe verf'
  /** Siroop and cement are the smaller part (a < b). */
  smallerFirst: boolean;
  maxPart: number; // 200, or 20 for paint
}

export function generateRatioProblems(rng: Rng): Question;
export function partQuestion(
  context: GroupContext, a: number, b: number, index: 0 | 1, asPercentage: boolean,
): Question;
export function mixFromTotalQuestion(
  context: MixContext, a: number, b: number, part: number, asked: 0 | 1,
): Question;
export function mixFromPartQuestion(
  context: MixContext, a: number, b: number, part: number, given: 0 | 1,
): Question;
```

(Prettier will wrap these signatures; the shape is what matters.)

**Part of the whole:** context, then fraction or percentage (50/50), then a simplified `a : b`
with `a ≠ b`: for a fraction `a + b ≤ 12`, for a percentage `a + b ∈ {3, 4, 5, 6, 8, 10}`; the
asked group 50/50. Fraction: `simplestFractionStep` with `decimalAllowed: true`. Percentage:
`fractionStep` with suffix `%` and `expected: formatPercentNumber(fraction)` (`37,5`, `66 2/3`).
Key: `ratioProblems:part:<context>:<a>:<b>:<index>:<fraction|percent>`.

| Context  | Prompt (fraction / percentage)                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------- |
| class    | `In een klas is jongens : meisjes = 2 : 3. Welk deel van de klas is jongen?` / `Hoeveel procent van de klas is meisje?` |
| marbles  | `In een zak is rood : blauw = 2 : 3. Welk deel van de knikkers is rood?` / `Hoeveel procent van de knikkers is blauw?` |
| audience | `Bij een voorstelling is volwassenen : kinderen = 2 : 3. Welk deel van het publiek is volwassen?` / `… is kind?` |

Groups for tips and explanations: `jongens`/`meisjes`, `rode knikkers`/`blauwe knikkers`,
`volwassenen`/`kinderen`.

| Case                          | Input              | Correct | Tip                                                                                       |
| ----------------------------- | ------------------ | ------- | ----------------------------------------------------------------------------------------- |
| class 2 : 3, jongens, fraction | `2/5`, `0,4`      | ✔       | expected `2/5`                                                                            |
|                               | `4/10`             | ✘       | `De waarde klopt, maar vereenvoudig nog: 4/10 = 2/5.` (generic form tip)                  |
|                               | `2/3`              | ✘       | `2 : 3 is jongens tegenover meisjes. Het geheel is 2 + 3 = 5 delen, dus 2/5.`             |
|                               | `3/5`, `0,6`       | ✘       | `Dat is het deel meisjes; gevraagd is het deel jongens.`                                  |
| audience 1 : 2, kinderen, %   | `66 2/3`, `200/3`  | ✔       | expected `66 2/3`                                                                         |
|                               | `200`              | ✘       | `1 : 2 is volwassenen tegenover kinderen. Het geheel is 1 + 2 = 3 delen, dus 2/3.`        |
|                               | `33 1/3`           | ✘       | `Dat is het deel volwassenen; gevraagd is het deel kinderen.`                             |
| class 3 : 5, jongens, %       | `37,5`             | ✔       | expected `37,5`                                                                           |

The ratio tip uses `asked / other` (× 100 for a percentage); the other-group tip uses
`other / (a + b)` (× 100). Ratio tip first.

Explanations: `2 + 3 = 5 delen → jongens = 2/5`, `1 + 2 = 3 delen → 2/3 = 66 2/3%`,
`3 + 5 = 8 delen → 3/8 = 37,5%`.

**Mixing:** context, then from the total or from one part (50/50), then a simplified `a : b` with
`a ≠ b`, terms in `[1, 9]` (`a < b` when `smallerFirst`), then one part `u` in
`[2, maxPart]` with `(a + b) × u ≤ 2000`; from the total, the total also has at most 2
significant digits. Asked (or given) ingredient 50/50. `numberStep`, suffix the unit. Key:
`ratioProblems:mix:<context>:<total|part>:<a>:<b>:<u>:<index>`.

| Context | Ratio line                            | From the total                                   | From one part                                            |
| ------- | ------------------------------------- | ------------------------------------------------ | -------------------------------------------------------- |
| syrup   | `Siroop : water = 1 : 6.`             | `Hoeveel ml siroop zit er in 350 ml limonade?`   | `Je hebt 50 ml siroop. Hoeveel ml water moet erbij?`     |
| mortar  | `Cement : zand = 1 : 4.`              | `Hoeveel kg zand zit er in 250 kg mortel?`       | `Je hebt 100 kg cement. Hoeveel kg zand moet erbij?`     |
| paint   | `Witte verf : blauwe verf = 3 : 2.`   | `Hoeveel L witte verf zit er in 15 L lichtblauwe verf?` | `Je hebt 6 L blauwe verf. Hoeveel L witte verf moet erbij?` |

Articles: `de siroop`, `het water`, `het cement`, `het zand`, `de witte verf`, `de blauwe verf`.

| Case                                 | Input   | Correct | Tip                                                                     |
| ------------------------------------ | ------- | ------- | ----------------------------------------------------------------------- |
| syrup 1 : 6, total 350, siroop       | `50`    | ✔       | —                                                                       |
|                                      | `300`   | ✘       | `Dat is de hoeveelheid water; gevraagd is de siroop.`                   |
|                                      | `350`   | ✘       | `Deel eerst door het totaal aantal delen: 1 + 6 = 7.` (350 : 1)         |
|                                      | `5`     | ✘       | factor-of-ten fallback                                                  |
| mortar 1 : 4, total 250, zand        | `200`   | ✔       | —                                                                       |
|                                      | `50`    | ✘       | `Dat is de hoeveelheid cement; gevraagd is het zand.`                   |
|                                      | `62,5`  | ✘       | `Deel eerst door het totaal aantal delen: 1 + 4 = 5.` (250 : 4)         |
| paint 3 : 2, total 15, witte verf    | `9`     | ✔       | —                                                                       |
|                                      | `6`     | ✘       | `Dat is de hoeveelheid blauwe verf; gevraagd is de witte verf.`         |
|                                      | `5`     | ✘       | `Deel eerst door het totaal aantal delen: 3 + 2 = 5.` (15 : 3)          |
| syrup 1 : 6, given siroop 50, water  | `300`   | ✔       | —                                                                       |
|                                      | `350`   | ✘       | `Dat is de hele hoeveelheid limonade; gevraagd is alleen het water.`    |

Other-ingredient tip before the divide tip.

Explanations (the middle step `1 deel = …` only when neither the given nor the asked amount is
1 part):

| Case                                  | Explanation                                                    |
| ------------------------------------- | -------------------------------------------------------------- |
| syrup 1 : 6, total 350, siroop        | `1 + 6 = 7 delen → 1 deel = 350 : 7 = 50 → siroop = 1 deel = 50` |
| mortar 1 : 4, total 250, zand         | `1 + 4 = 5 delen → 1 deel = 250 : 5 = 50 → zand = 4 delen = 200` |
| syrup 1 : 6, given siroop 50          | `siroop = 1 deel = 50 → water = 6 delen = 300`                 |
| syrup 1 : 6, given water 300          | `water = 6 delen = 300 → siroop = 1 deel = 50`                 |
| mortar 2 : 5, given cement 100        | `cement = 2 delen = 100 → 1 deel = 50 → zand = 5 delen = 250`  |

**Invariants (seeded, 1000):** both forms, all six contexts and both variants occur; part: the
answer equals `asked / (a + b)` (× 100), `gcd(a, b) = 1`, the sum rule per variant; mixing:
`u ≤ maxPart`, total ≤ 2000, total with at most 2 significant digits in the total variant,
`a < b` for syrup and mortar; `check(expected)` is correct.

**Commit:** `feat: ratioProblems topic with part of the whole and mixing`

---

## Task 6: `ratioProblems` part 2: per unit

**Files:** `src/lib/topics/ratioProblems.ts`, `src/lib/topics/ratioProblems.test.ts`

`FORMS` becomes `['part', 'mix', 'unit']`, each equally likely.

**Signatures:**

```ts
type UnitContextId = 'cheese' | 'petrol' | 'wage';

/** Amounts are in the context's counting unit: 100 g for cheese, 1 L, 1 uur. */
export function unitQuestion(
  context: UnitContextId, first: Rational, firstPrice: Rational, second: Rational,
): Question;
/** '1,5 kg', '400 g', '25 L', '2,5 uur'. Cheese: g below 1 kg, kg (≤ 1 decimal) from 1 kg. */
export function formatAmount(context: UnitContextId, amount: Rational): string;
/** The step of the ratio table: 100 g; 5 L when both are multiples of 5, else 1 L; 1 uur. */
export function stepAmount(context: UnitContextId, first: Rational, second: Rational): Rational;
export function unitExplanation(…): string; // '1,5 kg → € 12, 100 g → € 0,80, 400 g → € 3,20'
export function inverseTip(…): Diagnose;    // through moneyTip
```

**Generation** (spec §5.25), by context:

| Context | Amounts (counting unit)                          | Price                                        | Step                     |
| ------- | ------------------------------------------------ | -------------------------------------------- | ------------------------ |
| cheese  | multiples of 100 g in `[200 g, 3 kg]`            | per 100 g: multiples of € 0,10 in `[0,60; 2,50]` | 100 g                |
| petrol  | whole litres in `[5, 60]`                        | per litre: multiples of € 0,10 in `[1,60; 2,20]` | 5 L if both multiples of 5, else 1 L |
| wage    | whole or half hours in `[1, 10]`                 | per hour: whole euros in `[10, 25]`          | 1 uur                    |

Two different amounts such that neither is a whole multiple of the other and neither equals the
step; both prices at most € 200. Draw the price per counting unit and both amounts with
`drawUntil`. `numberStep`, prefix `€`, expected `formatMoney`. Key:
`ratioProblems:unit:<context>:<first>:<second>:<price per counting unit>`.

**Prompts:**

| Context | Prompt                                                   | Answer |
| ------- | -------------------------------------------------------- | ------ |
| cheese  | `1,5 kg kaas kost € 12. Wat kost 400 g?`                 | 3,20   |
| petrol  | `40 L benzine kost € 76. Wat kost 25 L?`                 | 47,50  |
| wage    | `Voor 4 uur werk krijg je € 60. Hoeveel voor 2,5 uur?`   | 37,50  |

**Cases:**

| Case                                 | Input            | Correct | Tip                                                                                     |
| ------------------------------------ | ---------------- | ------- | --------------------------------------------------------------------------------------- |
| cheese 1,5 kg € 12 → 400 g           | `3,20`, `3,2`    | ✔       | expected `3,20`                                                                         |
|                                      | `45`             | ✘       | `Je hebt omgekeerd gerekend: 400 g is minder dan 1,5 kg, dus het kost minder dan € 12.` |
|                                      | `3200`           | ✘       | `Je antwoord is 1000 keer te groot. …` (fallback)                                       |
| petrol 40 L € 76 → 25 L              | `47,50`          | ✔       | —                                                                                       |
|                                      | `121,60`         | ✘       | `Je hebt omgekeerd gerekend: 25 L is minder dan 40 L, dus het kost minder dan € 76.`    |
| petrol 23 L € 43,70 → 37 L           | `70,30`          | ✔       | —                                                                                       |
|                                      | `27,16`          | ✘       | `Je hebt omgekeerd gerekend: 37 L is meer dan 23 L, dus het kost meer dan € 43,70.` (43,70 × 23 : 37 = 27,1648…, rounded) |
| wage 4 uur € 60 → 2,5 uur            | `37,50`          | ✔       | —                                                                                       |
|                                      | `96`             | ✘       | `Je hebt omgekeerd gerekend: 2,5 uur is minder dan 4 uur, dus je krijgt minder dan € 60.` |

**Explanations** (amounts with `formatEuro`):

| Case                         | Explanation                                              |
| ---------------------------- | -------------------------------------------------------- |
| cheese 1,5 kg € 12 → 400 g   | `1,5 kg → € 12, 100 g → € 0,80, 400 g → € 3,20`          |
| petrol 40 L € 76 → 25 L      | `40 L → € 76, 5 L → € 9,50, 25 L → € 47,50`              |
| petrol 23 L € 43,70 → 37 L   | `23 L → € 43,70, 1 L → € 1,90, 37 L → € 70,30`           |
| wage 4 uur € 60 → 2,5 uur    | `4 uur → € 60, 1 uur → € 15, 2,5 uur → € 37,50`          |

**Invariants (seeded, 1000):** all three forms and all three unit contexts occur; amounts and
prices within the table; neither amount a whole multiple of the other, neither equal to the step;
the petrol step is 5 L exactly when both amounts are multiples of 5; both prices whole cents and
at most € 200; `check(expected)` is correct.

**Commit:** `feat: per-unit word problems in ratioProblems`

---

## Task 7: The Verhoudingen set with five topics

**Files:** `src/lib/sets.ts`, `src/lib/sets.test.ts`, `src/lib/session.test.ts`

**Change:** `PROPORTIONS_SET.description` becomes `'Procenten, verhoudingen en schaal'`; topics
become `percentages`, `ratios`, `percentChange`, `scale`, `ratioProblems`, each weight 1. Update
the comment above the set (no longer "v1 topics only").

**Tests:**

| Test                                   | Expected                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------ |
| set shape (`sets.test.ts`, rename the "two equally weighted topics" test) | name `Verhoudingen`, tables 15, the five topics with weight 1, the new description |
| `describeSetTopics(PROPORTIONS_SET)`   | the five labels in set order, then `'15% tafels'`                        |
| quota at `n = 15`, seed 3 (`session.test.ts`) | 2 tables; per topic sorted `[2, 2, 3, 3, 3]` (spec §4.2)          |
| every session size                     | unique keys (existing `it.each`, unchanged)                              |

**Commit:** `feat: Verhoudingen set with percentChange, scale and ratioProblems`

---

## Task 8: Docs and final verification

**Files:** `CLAUDE.md`

1. Run `npm test`, `npm run check`, `npm run build`, then `grep -c "manifest.webmanifest"
   dist/sw.js`: all tests pass, 0 errors and 0 warnings, the build succeeds, the grep prints `1`.
2. `CLAUDE.md`:
   - **Status:** add "Verhoudingen v2 (`percentChange`, `scale`, `ratioProblems`)" to the done
     list, and remove row 7 from the next-sets table (Meten v2 becomes the first row).
   - **Open follow-ups:** add the phone check of the longest `ratioProblems` and
     `percentChange` prompts with the kladblok (e.g. `Bij een voorstelling is volwassenen :
     kinderen = 2 : 3. Hoeveel procent van het publiek is volwassen?`), and of the `1 :` prefix
     in the answer field.
3. Commit: `docs: mark Verhoudingen v2 as done`.

The controller deletes this plan file after the final review (CLAUDE.md workflow step 5), with
the user's go-ahead.
