# Breuken & kommagetallen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the **Breuken & kommagetallen** practice set with the topics `fractionConversion` (spec §5.20), `fractionArithmetic` (§5.21) and `decimalArithmetic` (§5.22), plus 15% tables, and the judging of fraction answers in simplest form (§6) that it needs.

**Architecture:**

- **Simplest-form judging.** `steps.ts` gets `parseFractionAnswer` (value, written form, whether it is in simplest form) and `simplestFractionStep`: correct when the value is equal **and** the input is a whole number, a fraction in lowest terms or a proper mixed number; a decimal is correct only when the step allows it. An equal value in another form gets a generic tip. The existing `fractionStep` (any equal value) stays as it is for §5.12 and §5.20 fraction → percentage.
- **Display.** `formatMixedNumber` in `format.ts` shows the expected answer (`1 5/12`). `splitFractions` in `fractionText.ts` accepts `?` as a numerator or denominator, so `3/4 = ?/12` is drawn stacked. No component changes.
- **Three generator modules**, following the existing pattern (a pure `(rng) => Question`, every answer checked by a step factory in `steps.ts`, tips as `Diagnose` functions built from values the generator already has):
  - `topics/decimalArithmetic.ts`: add/subtract with aligned commas, multiply, divide
  - `topics/fractionConversion.ts`: six directions between fraction, decimal and percentage
  - `topics/fractionArithmetic.ts`: simplify, equivalent, add/subtract (also mixed), multiply/divide, part of a number and back to the whole
- **The set** `FRACTIONS_SET` (`id: 'breuken'`) is appended to `PRACTICE_SETS`.

**Tech Stack:** Svelte 5, TypeScript strict (`noUncheckedIndexedAccess`), Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-05-rekenhulp-design.md`. Read §3.4.1 (tip table: the source of truth for tip wording), §4.2, §5.20–§5.22, §6 ("Judging a fraction answer"), §8 and §11 item 20 before starting.

---

## Scope

**In scope:**

| Spec section | What is built |
|---|---|
| §4.1 | The Breuken & kommagetallen set: three topics with weight 1, and 15% tables |
| §4.2 | Quota example: 2 tables + 5 + 4 + 4 at `n = 15` (no algorithm change) |
| §5.20 | `fractionConversion`: six directions, thirds and sixths for percentages, explanations, tips |
| §5.21 | `fractionArithmetic`: four groups (six forms), explanations, tips |
| §5.22 | `decimalArithmetic`: three forms, explanations, tips |
| §3.4.1 | All rows of this set in the tip table, incl. the generic simplest-form tips |
| §6 | Simplest-form judging of fraction answers; the expected answer as a mixed number |
| §8 | `?` as a stacked fraction slot; mixed numbers as expected answers |

**Not in scope:**

- Changes to the keypads, `lib/expr` or any component (the fraction keypad exists since Verhoudingen v1)
- Negative exponents with other bases than 10 (`2⁻³`, spec §5.18)
- Changing `fractionStep` (§5.12 keeps "any equal value")
- The manual phone check (listed as a follow-up in CLAUDE.md in Task 9)

**Decisions settled with the user on 2026-10-07 (spec §11 item 20):** only the simplest form is correct, with a tip for an equal value; `17/12` and `1 5/12` are both correct and the expected answer is the mixed number; an equal decimal is correct in fraction sums; fraction arithmetic covers simplify/equivalent, add/subtract, multiply/divide and part of a number.

## Prerequisites & command permissions

- Allowed: `npm test`, `npm run check`, `npm run build`, `git add`, `git commit`, `git status`, `git diff`, `git log`, `ls`, `cat`, `echo`, `grep`, `sed -n` (read-only).
- **Forbidden:** `npx`, `node`, `tail`, `head`, `rm`, `sed -i`, `npm run format`, `npm run dev`, `npm run preview`, `git checkout`, `git reset`, `git push`, `git add -u`, `git add .`. Use the Read tool to view files and `grep` to filter output.
- Before `git add <file>`, run `git diff <file>` and check that every hunk is yours: another session may edit `main` at the same time. Stage explicit paths only.
- Format new code by hand (Prettier style: 100 columns, single quotes, trailing commas).
- Every commit message ends with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (pass it via a second `-m`).
- `npm run check` must stay at 0 errors and 0 warnings after every task.
- If a commit fails because 1Password signing is locked, stop and ask the user to unlock it. Never bypass signing.

## Notes for the implementer

- **Digit grouping:** `formatInteger` and `formatRational` group numbers of 5+ digits with U+202F (`10 000`); 4 digits stay ungrouped (`1000`). In test literals write the separator as `\u{202f}`. Never paste the raw character.
- **Glyphs:** `×` U+00D7, `−` U+2212 (typographic minus, used in all UI text). Keypad input uses the ASCII hyphen `-`. Fraction input strings are `3/4`, `1 5/12` (one ASCII space) and `0,375`.
- **Fraction text pitfall (spec §8):** the UI draws `a/b` stacked, and a number followed by one space and a fraction as a mixed number. So prompts, explanations and tips must never put a number, a space and a fraction side by side unless they mean a mixed number, and never put a decimal next to `/` (`37,5/100`). The code in this plan respects that; keep it that way when wrapping lines.
- **Generators are pure** `(rng) => Question`. Every random choice goes through the `rng` argument; never use `Math.random`.
- **Existing seeded tests must keep passing.** No existing generator changes in this plan.
- **Tips** may only claim what is certain: a tip fires only when the answer equals exactly what that mistake produces (spec §3.4.1).
- **Line length:** a few code and test lines in this plan may run past 100 columns (long Dutch strings). Wrap them Prettier-style (string concatenation, arguments on their own lines) without changing the resulting strings.
- **Statistical assertions** (shares, "about equally often") use fixed seeds and wide margins. If one fails by a small margin with the given seed, report it instead of tuning the generator to the seed.

## File structure

```
src/lib/
  types.ts                       Topic + three topics
  fractionText.ts (+ .test.ts)   '?' as a fraction slot
  format.ts (+ .test.ts)         formatMixedNumber
  steps.ts (+ .test.ts)          FractionAnswer, parseFractionAnswer, simplestFractionStep
                                 (with the generic form and approximation tips)
  sets.ts (+ .test.ts)           FRACTIONS_SET
  session.test.ts                Breuken quota and uniqueness
  topics/index.ts                three generators and labels
  topics/decimalArithmetic.ts (+ .test.ts)    NEW
  topics/fractionConversion.ts (+ .test.ts)   NEW
  topics/fractionArithmetic.ts (+ .test.ts)   NEW (two tasks)
CLAUDE.md                        status, roadmap row, follow-ups
```

---

## Task 1: `?` as a fraction slot (`splitFractions`)

**Files:**
- Modify: `src/lib/fractionText.ts`
- Test: `src/lib/fractionText.test.ts`

- [ ] **Step 1: Write the failing test**

In `src/lib/fractionText.test.ts`, add these rows to the `it.each` table, after the `'3  1/2'` row:

```ts
    ['3/4 = ?/12', [fraction('3', '4'), text(' = '), fraction('?', '12')]],
    ['9/12 = 3/?', [fraction('9', '12'), text(' = '), fraction('3', '?')]],
    ['Hoeveel is het geheel?', [text('Hoeveel is het geheel?')]],
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/fractionText.test.ts`
Expected: FAIL on the two `?` rows (the `?/12` stays plain text).

- [ ] **Step 3: Implement**

In `src/lib/fractionText.ts`, replace the `FRACTION` constant and its comment with:

```ts
// 'a/b', where the digits may be grouped with thin spaces, or the ½ glyph of 12½% (spec §8).
// A '?' can take the place of either term: '3/4 = ?/12'.
const FRACTION = /(\d[\d\u{202f}]*|\?)\/(\d[\d\u{202f}]*|\?)|½/gu;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/fractionText.test.ts src/lib/promptSize.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git diff src/lib/fractionText.ts src/lib/fractionText.test.ts
git add src/lib/fractionText.ts src/lib/fractionText.test.ts
git commit -m "feat: question mark as a stacked fraction slot" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 2: Mixed numbers (`formatMixedNumber`)

**Files:**
- Modify: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`

- [ ] **Step 1: Write the failing test**

In `src/lib/format.test.ts`, add `formatMixedNumber` to the import list from `'./format'`, and add after `describe('formatFraction', …)`:

```ts
describe('formatMixedNumber', () => {
  it.each([
    [4, 1, '4'],
    [3, 4, '3/4'],
    [17, 12, '1 5/12'],
    [100, 3, '33 1/3'],
    [-3, 2, '−1 1/2'],
    [-1, 2, '−1/2'],
    [-6, 1, '−6'],
  ])('formats %i/%i as %s', (num, den, expected) => {
    expect(formatMixedNumber(rational(BigInt(num), BigInt(den)))).toBe(expected);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/format.test.ts`
Expected: FAIL, `formatMixedNumber` is not exported.

- [ ] **Step 3: Implement**

In `src/lib/format.ts`, change the rational import to:

```ts
import { decimalPlaces, rational, type Rational } from './rational';
```

and add after `formatFraction`:

```ts
/**
 * A whole number, a proper fraction, or a mixed number for an improper value: '4', '3/4',
 * '1 5/12' (spec §8). The sign goes in front of the whole: '−1 1/2'.
 */
export function formatMixedNumber(value: Rational): string {
  if (value.den === 1n) return formatInteger(value.num);
  const negative = value.num < 0n;
  const absolute = negative ? -value.num : value.num;
  const whole = absolute / value.den;
  const sign = negative ? MINUS : '';
  const rest = formatFraction(rational(absolute % value.den, value.den));
  return whole === 0n ? sign + rest : `${sign}${formatInteger(whole)} ${rest}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/format.test.ts` then `npm run check`
Expected: PASS; check 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

```bash
git diff src/lib/format.ts src/lib/format.test.ts
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: format mixed numbers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 3: Simplest-form judging (`parseFractionAnswer`, `simplestFractionStep`)

**Files:**
- Modify: `src/lib/steps.ts`
- Test: `src/lib/steps.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/lib/steps.test.ts`, add `parseFractionAnswer` and `simplestFractionStep` to the import list from `'./steps'` (keep it alphabetical), and add after `describe('fractionStep', …)`:

```ts
describe('parseFractionAnswer', () => {
  it.each([
    ['4', 'whole', true],
    ['3/4', 'fraction', true],
    ['17/12', 'fraction', true],
    ['-3/4', 'fraction', true],
    ['9/12', 'fraction', false],
    ['12/3', 'fraction', false],
    ['4/1', 'fraction', false],
    ['0/5', 'fraction', false],
    ['1 5/12', 'mixed', true],
    ['0 3/4', 'mixed', false],
    ['1 2/4', 'mixed', false],
    ['1 14/12', 'mixed', false],
    ['1 0/4', 'mixed', false],
    ['0,3', 'decimal', false],
    [',5', 'decimal', false],
  ])('reads %s as %s (simplest: %s)', (input, form, simplest) => {
    expect(parseFractionAnswer(input)).toMatchObject({ form, simplest });
  });

  it('returns the value', () => {
    expect(parseFractionAnswer('1 5/12')?.value).toEqual(rational(17n, 12n));
    expect(parseFractionAnswer('0,30')?.value).toEqual(rational(3n, 10n));
  });

  it('returns null for unparsable input', () => {
    expect(parseFractionAnswer('')).toBeNull();
    expect(parseFractionAnswer('3/0')).toBeNull();
    expect(parseFractionAnswer('1 1/')).toBeNull();
  });
});

describe('simplestFractionStep', () => {
  const sum = simplestFractionStep({
    prompt: '2/3 + 3/4 = ?',
    answer: rational(17n, 12n),
    decimalAllowed: true,
    explanation: '2/3 + 3/4 = 8/12 + 9/12 = 17/12 = 1 5/12',
  });

  it('is a fraction step that shows a mixed number as the expected answer', () => {
    expect(sum.kind).toBe('fraction');
    expect(sum.prompt).toBe('2/3 + 3/4 = ?');
    expect(sum.check('1 5/12')).toEqual({
      correct: true,
      expected: '1 5/12',
      explanation: '2/3 + 3/4 = 8/12 + 9/12 = 17/12 = 1 5/12',
    });
  });

  it('accepts the improper fraction in lowest terms too', () => {
    expect(sum.check('17/12').correct).toBe(true);
  });

  it('rejects an equal value that is not in simplest form, with a tip', () => {
    expect(sum.check('34/24')).toMatchObject({
      correct: false,
      tip: 'De waarde klopt, maar vereenvoudig nog: 34/24 = 1 5/12.',
    });
    expect(sum.check('1 10/24').tip).toBe(
      'De waarde klopt, maar vereenvoudig nog: 1 10/24 = 1 5/12.',
    );
    expect(sum.check('0 17/12').correct).toBe(false);
  });

  it('shows a whole answer as a whole number and rejects it as a fraction', () => {
    const step = simplestFractionStep({ prompt: '6 × 2/3 = ?', answer: rational(4n), decimalAllowed: true });
    expect(step.check('4')).toMatchObject({ correct: true, expected: '4' });
    expect(step.check('12/3').tip).toBe('De waarde klopt, maar vereenvoudig nog: 12/3 = 4.');
  });

  it('accepts an equal decimal only when the step allows it', () => {
    const allowed = simplestFractionStep({
      prompt: '3/4 × 2/5 = ?',
      answer: rational(3n, 10n),
      decimalAllowed: true,
    });
    expect(allowed.check('0,3').correct).toBe(true);
    expect(allowed.check('0,30').correct).toBe(true);
    const fractionOnly = simplestFractionStep({
      prompt: 'Schrijf als breuk: 0,3',
      answer: rational(3n, 10n),
      decimalAllowed: false,
    });
    expect(fractionOnly.check('0,3')).toMatchObject({
      correct: false,
      tip: 'Schrijf het antwoord als breuk, niet als kommagetal.',
    });
    expect(fractionOnly.check('3/10').correct).toBe(true);
  });

  it('names a rounded or cut-off decimal of a non-terminating answer', () => {
    const step = simplestFractionStep({
      prompt: '1/3 + 1/3 = ?',
      answer: rational(2n, 3n),
      decimalAllowed: true,
    });
    const tip = '2/3 is geen eindig kommagetal: schrijf het antwoord als breuk.';
    for (const input of ['0,67', '0,66', '0,666', '0,667', '0,6', '0,7']) {
      expect(step.check(input).tip, input).toBe(tip);
    }
    expect(step.check('0,65').tip).toBeUndefined();
    const mixed = simplestFractionStep({
      prompt: 'Vereenvoudig 20/12',
      answer: rational(5n, 3n),
      decimalAllowed: false,
    });
    expect(mixed.check('1,67').tip).toBe(
      '1 2/3 is geen eindig kommagetal: schrijf het antwoord als breuk.',
    );
  });

  it('tries the diagnosis before the fallbacks', () => {
    const step = simplestFractionStep({
      prompt: '3/4 − 1/2 = ?',
      answer: rational(1n, 4n),
      decimalAllowed: true,
      diagnose: (given) => (given.num === 5n ? 'diagnosed' : undefined),
    });
    expect(step.check('5/2').tip).toBe('diagnosed');
    expect(step.check('10/4').tip).toBe('diagnosed');
    expect(step.check('5/2').correct).toBe(false);
    expect(step.check('25/10').tip).toBe('diagnosed');
    expect(step.check('2,5').tip).toBe('diagnosed');
    expect(step.check('25/1').tip).toBe(
      'Je antwoord is 100 keer te groot. Let op de komma en het aantal nullen.',
    );
  });

  it('gives no tip for an unrelated or unparsable answer', () => {
    expect(sum.check('1/2').tip).toBeUndefined();
    expect(sum.check('1/0')).toEqual({
      correct: false,
      expected: '1 5/12',
      explanation: '2/3 + 3/4 = 8/12 + 9/12 = 17/12 = 1 5/12',
    });
  });

  it('passes the suffix', () => {
    const step = simplestFractionStep({
      prompt: 'p',
      answer: rational(1n, 2n),
      decimalAllowed: false,
      suffix: '%',
    });
    expect(step.suffix).toBe('%');
  });
});
```

Note on `'tries the diagnosis before the fallbacks'`: `5/2`, `10/4`, `25/10` and `2,5` all have the value 5/2 (`given.num === 5n` after normalising), and 5/2 is 10 × the answer 1/4, so the diagnosis must win over the factor-of-ten fallback; `25/1` (= 25 = 100 × 1/4) is not diagnosed and gets the fallback.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/steps.test.ts`
Expected: FAIL, `parseFractionAnswer` and `simplestFractionStep` are not exported.

- [ ] **Step 3: Implement**

In `src/lib/steps.ts`, add `formatInput` and `formatMixedNumber` to the import list from `'./format'`:

```ts
import {
  formatFraction,
  formatInput,
  formatInteger,
  formatMixedNumber,
  formatPrimeFactors,
  formatRational,
  formatScientific,
} from './format';
```

Then add after `formatFractionAnswer` (before `exactStep`):

```ts
/** How a fraction answer is written (spec §6). */
export type FractionForm = 'whole' | 'fraction' | 'mixed' | 'decimal';

export interface FractionAnswer {
  value: Rational;
  form: FractionForm;
  /** A whole number, a/b in lowest terms with b ≥ 2, or w a/b with w ≥ 1 and 0 < a < b. */
  simplest: boolean;
}

// The typed terms of a fraction or a mixed number, after an optional sign.
const FRACTION_TERMS = /^[-−]?(?:(\d+) )?(\d+)\/(\d+)$/;

/** a/b with b ≥ 2 and gcd(a, b) = 1: normalising leaves the typed denominator as it is. */
function inLowestTerms(num: bigint, den: bigint): boolean {
  return den >= 2n && num > 0n && rational(num, den).den === den;
}

/** The value of fraction input and the form it was written in (spec §6). */
export function parseFractionAnswer(input: string): FractionAnswer | null {
  const value = parseAnswer('fraction', input);
  if (value === null) return null;
  const terms = FRACTION_TERMS.exec(input.trim());
  if (terms === null) {
    const decimal = input.includes(',');
    return { value, form: decimal ? 'decimal' : 'whole', simplest: !decimal };
  }
  const [, whole, numerator = '', denominator = ''] = terms;
  const num = BigInt(numerator);
  const den = BigInt(denominator);
  if (whole === undefined) return { value, form: 'fraction', simplest: inLowestTerms(num, den) };
  const simplest = BigInt(whole) >= 1n && num < den && inLowestTerms(num, den);
  return { value, form: 'mixed', simplest };
}

export interface SimplestFractionStepOptions {
  prompt: string;
  answer: Rational;
  /** Whether an equal decimal is correct too (spec §5.21 sums: '0,3' for 3/10). */
  decimalAllowed: boolean;
  suffix?: string;
  explanation?: string;
  /** Topic-specific mistakes (spec §3.4.1); tried after the generic form tip. */
  diagnose?: Diagnose;
}

/**
 * Correct when the value is equal and the input is in simplest form (spec §6). An equal value
 * in another form gets a generic tip; then the topic's diagnosis; then the approximation tip for
 * a decimal of a non-terminating answer; then the factor-of-ten fallback.
 */
export function simplestFractionStep({
  prompt,
  answer,
  decimalAllowed,
  suffix,
  explanation,
  diagnose,
}: SimplestFractionStepOptions): Step {
  const expected = formatMixedNumber(answer);
  return {
    kind: 'fraction',
    prompt,
    suffix,
    check(input) {
      const given = parseFractionAnswer(input);
      // Validation keeps unparsable input away; should it get here, it is simply wrong.
      if (given === null) return { correct: false, expected, explanation };
      const equal = equals(given.value, answer);
      const decimal = given.form === 'decimal';
      if (equal && (decimal ? decimalAllowed : given.simplest)) {
        return { correct: true, expected, explanation };
      }
      const tip = equal
        ? formTip(input, decimal, expected)
        : (diagnose?.(given.value) ??
          (decimal ? approximationTip(input, given.value, answer, expected) : undefined) ??
          powerOfTenTip(given.value, answer));
      return { correct: false, expected, tip, explanation };
    },
  };
}

/** The right value in another form (spec §3.4.1). */
function formTip(input: string, decimal: boolean, expected: string): string {
  return decimal
    ? 'Schrijf het antwoord als breuk, niet als kommagetal.'
    : `De waarde klopt, maar vereenvoudig nog: ${formatInput(input.trim())} = ${expected}.`;
}

/** A decimal that is a non-terminating answer cut off or rounded half up (spec §3.4.1). */
function approximationTip(
  input: string,
  given: Rational,
  answer: Rational,
  expected: string,
): string | undefined {
  if (decimalPlaces(answer) !== null || answer.num <= 0n) return undefined;
  const decimals = input.trim().split(',')[1]?.length ?? 0;
  if (decimals === 0) return undefined;
  const scale = 10n ** BigInt(decimals);
  const scaled = answer.num * scale;
  const down = scaled / answer.den;
  const up = 2n * (scaled % answer.den) >= answer.den ? down + 1n : down;
  const approximated = [down, up].some((digits) => equals(rational(digits, scale), given));
  return approximated
    ? `${expected} is geen eindig kommagetal: schrijf het antwoord als breuk.`
    : undefined;
}
```

Notes:
- `decimalPlaces` and `rational` are already imported from `'./rational'`; `Diagnose` and `powerOfTenTip` from `'./tips'`.
- `0,6` and `0,7` for 2/3: one decimal, cut off gives 6, rounded gives 7; both match. `0,65` matches neither.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/steps.test.ts` then `npm test` then `npm run check`
Expected: all PASS; check 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

```bash
git diff src/lib/steps.ts src/lib/steps.test.ts
git add src/lib/steps.ts src/lib/steps.test.ts
git commit -m "feat: judge fraction answers in simplest form" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 4: `decimalArithmetic` (spec §5.22)

**Files:**
- Create: `src/lib/topics/decimalArithmetic.ts`
- Test: `src/lib/topics/decimalArithmetic.test.ts`
- Modify: `src/lib/types.ts`, `src/lib/topics/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/topics/decimalArithmetic.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import {
  add,
  compare,
  decimalPlaces,
  divide,
  fromInteger,
  multiply,
  parseDutchNumber,
  subtract,
  type Rational,
} from '../rational';
import type { Question, Step } from '../types';
import {
  addSubtractQuestion,
  buildDecimalArithmetic,
  DECIMAL_FORMS,
  type DecimalForm,
  divideQuestion,
  generateDecimalArithmetic,
  multiplyQuestion,
} from './decimalArithmetic';

const PER_FORM = 1000;
const HUNDRED = fromInteger(100);
const THOUSAND = fromInteger(1000);
const ADD_SUBTRACT = /^([\d,]+) ([+−]) ([\d,]+) = \?$/u;
const MULTIPLY = /^([\d,]+) × ([\d,]+) = \?$/u;
const DIVIDE = /^([\d,]+) : ([\d,]+) = \?$/u;

function questionsOf(form: DecimalForm): Question[] {
  const rng = createRng(700 + DECIMAL_FORMS.indexOf(form));
  return Array.from({ length: PER_FORM }, () => buildDecimalArithmetic(rng, form));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

function value(text: string): Rational {
  const parsed = parseDutchNumber(text);
  if (parsed === null) throw new Error(`Not a number: ${text}`);
  return parsed;
}

function decimals(text: string): number {
  return text.split(',')[1]?.length ?? 0;
}

function answerOf(step: Step): Rational {
  return value(step.check('').expected);
}

describe('generateDecimalArithmetic', () => {
  it('produces all three forms, each accepting its expected answer', () => {
    const rng = createRng(1);
    const kinds = new Set<string>();
    for (let i = 0; i < 1500; i++) {
      const question = generateDecimalArithmetic(rng);
      expect(question.topic).toBe('decimalArithmetic');
      const step = stepOf(question);
      expect(step.kind).toBe('number');
      expect(step.check(step.check('').expected).correct, step.prompt).toBe(true);
      kinds.add(question.key.split(':')[1]!);
    }
    expect([...kinds].sort()).toEqual(['add', 'divide', 'multiply', 'subtract']);
  });
});

describe('add / subtract', () => {
  const questions = questionsOf('addSubtract');

  it('adds or subtracts two numbers below 100 with a different number of decimals', () => {
    let subtractions = 0;
    for (const question of questions) {
      const step = stepOf(question);
      const match = ADD_SUBTRACT.exec(step.prompt);
      expect(match, step.prompt).not.toBeNull();
      const [, left = '', operator, right = ''] = match!;
      for (const text of [left, right]) {
        expect(decimals(text), text).toBeLessThanOrEqual(2);
        expect(text, 'no trailing zero after the comma').not.toMatch(/,\d*0$/);
        expect(text.replace(',', '').replace(/^0+/, '').length, text).toBeLessThanOrEqual(3);
        expect(compare(value(text), fromInteger(0))).toBe(1);
        expect(compare(value(text), HUNDRED)).toBe(-1);
      }
      expect(decimals(left)).not.toBe(decimals(right));
      const a = value(left);
      const b = value(right);
      if (operator === '−') {
        subtractions++;
        expect(answerOf(step)).toEqual(subtract(a, b));
        expect(compare(answerOf(step), fromInteger(0))).toBe(1);
      } else {
        expect(answerOf(step)).toEqual(add(a, b));
        expect(compare(answerOf(step), HUNDRED)).toBe(-1);
      }
    }
    // Sums of 100 or more are redrawn, so subtractions are a little more common (about 55%).
    expect(subtractions).toBeGreaterThan(400);
    expect(subtractions).toBeLessThan(700);
  });

  it('explains with aligned commas and names right-aligned digits', () => {
    const step = stepOf(addSubtractQuestion(value('4,7'), value('0,35'), false));
    expect(step.prompt).toBe('4,7 + 0,35 = ?');
    expect(step.check('5,05')).toMatchObject({
      correct: true,
      explanation: '4,70 + 0,35 = 5,05',
    });
    expect(step.check('0,82').tip).toBe("Zet de komma's onder elkaar: 4,70 + 0,35.");
    expect(step.check('5,15').tip).toBeUndefined();
  });

  it('pads a whole number and gives no alignment tip when it cannot apply', () => {
    const step = stepOf(addSubtractQuestion(fromInteger(5), value('0,25'), true));
    expect(step.prompt).toBe('5 − 0,25 = ?');
    expect(step.check('4,75')).toMatchObject({
      correct: true,
      explanation: '5,00 − 0,25 = 4,75',
    });
    // 5 − 25 is negative, so no right-aligned answer exists.
    expect(step.check('4,25').tip).toBeUndefined();
    const aligned = stepOf(addSubtractQuestion(value('12,5'), value('0,25'), true));
    expect(aligned.check('1').tip).toBe("Zet de komma's onder elkaar: 12,50 − 0,25.");
  });
});

describe('multiply', () => {
  const questions = questionsOf('multiply');

  it('multiplies two numbers with 1 to 3 decimals together', () => {
    for (const question of questions) {
      const step = stepOf(question);
      const match = MULTIPLY.exec(step.prompt);
      expect(match, step.prompt).not.toBeNull();
      const [, left = '', right = ''] = match!;
      const together = decimals(left) + decimals(right);
      expect(together).toBeGreaterThanOrEqual(1);
      expect(together).toBeLessThanOrEqual(3);
      expect(answerOf(step)).toEqual(multiply(value(left), value(right)));
    }
  });

  it('keys the factors in ascending order', () => {
    const one = multiplyQuestion({ digits: 3, decimals: 1 }, { digits: 4, decimals: 0 });
    const other = multiplyQuestion({ digits: 4, decimals: 0 }, { digits: 3, decimals: 1 });
    expect(one.key).toBe(other.key);
  });

  it('explains the digits, then the decimals, and names too few decimals', () => {
    const step = stepOf(multiplyQuestion({ digits: 3, decimals: 1 }, { digits: 4, decimals: 1 }));
    expect(step.prompt).toBe('0,3 × 0,4 = ?');
    expect(step.check('0,12')).toMatchObject({
      correct: true,
      explanation: '3 × 4 = 12; 1 + 1 = 2 decimalen → 0,12',
    });
    const tip = 'De uitkomst heeft evenveel decimalen als beide getallen samen: 1 + 1 = 2.';
    expect(step.check('1,2').tip).toBe(tip);
    expect(step.check('12').tip).toBe(tip);
    expect(step.check('0,012').tip).toBe(
      'Je antwoord is 10 keer te klein. Let op de komma en het aantal nullen.',
    );
  });

  it('writes 1 decimaal and simplifies trailing zeros', () => {
    const one = stepOf(multiplyQuestion({ digits: 7, decimals: 0 }, { digits: 6, decimals: 1 }));
    expect(one.prompt).toBe('7 × 0,6 = ?');
    expect(one.check('4,2').explanation).toBe('7 × 6 = 42; 0 + 1 = 1 decimaal → 4,2');
    const whole = stepOf(multiplyQuestion({ digits: 25, decimals: 2 }, { digits: 4, decimals: 0 }));
    expect(whole.prompt).toBe('0,25 × 4 = ?');
    expect(whole.check('1').explanation).toBe('25 × 4 = 100; 2 + 0 = 2 decimalen → 1');
  });
});

describe('divide', () => {
  const questions = questionsOf('divide');

  it('divides exactly, with a decimal dividend or divisor and at most 3 decimals', () => {
    let decimalDivisors = 0;
    for (const question of questions) {
      const step = stepOf(question);
      const match = DIVIDE.exec(step.prompt);
      expect(match, step.prompt).not.toBeNull();
      const [, left = '', right = ''] = match!;
      const dividend = value(left);
      const divisor = value(right);
      expect(dividend.den !== 1n || divisor.den !== 1n, step.prompt).toBe(true);
      if (divisor.den !== 1n) decimalDivisors++;
      expect(compare(dividend, THOUSAND)).toBe(-1);
      const answer = answerOf(step);
      expect(answer).toEqual(divide(dividend, divisor));
      for (const part of [dividend, divisor, answer]) {
        expect(decimalPlaces(part)).not.toBeNull();
        expect(decimalPlaces(part)!).toBeLessThanOrEqual(3);
      }
    }
    expect(decimalDivisors).toBeGreaterThan(300);
  });

  it('makes a decimal divisor whole first, and names a shifted answer', () => {
    const step = stepOf(divideQuestion(5, 1, 5, -2));
    expect(step.prompt).toBe('2,5 : 0,05 = ?');
    expect(step.check('50')).toMatchObject({
      correct: true,
      explanation: '2,5 : 0,05 = 250 : 5 = 50 (beide × 100)',
    });
    const tip = 'Maak eerst van de deler een heel getal: 2,5 : 0,05 = 250 : 5.';
    expect(step.check('5').tip).toBe(tip);
    expect(step.check('500').tip).toBe(tip);
    expect(step.check('49').tip).toBeUndefined();
  });

  it('uses the table fact for a whole divisor', () => {
    const step = stepOf(divideQuestion(9, -2, 4, 0));
    expect(step.prompt).toBe('0,36 : 4 = ?');
    expect(step.check('0,09')).toMatchObject({
      correct: true,
      explanation: '36 : 4 = 9 → 0,36 : 4 = 0,09',
    });
    expect(step.check('0,9').tip).toBe(
      'Je antwoord is 10 keer te groot. Let op de komma en het aantal nullen.',
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/topics/decimalArithmetic.test.ts`
Expected: FAIL, the module does not exist.

- [ ] **Step 3: Implement**

In `src/lib/types.ts`, extend `Topic`: replace `  | 'scientificNotation';` with:

```ts
  | 'scientificNotation'
  | 'decimalArithmetic';
```

Create `src/lib/topics/decimalArithmetic.ts`:

```ts
import { formatInteger, formatRational, MINUS } from '../format';
import { drawUntil, pick, randomInt, randomIntWhere, shuffle, type Rng } from '../random';
import {
  add,
  compare,
  decimalPlaces,
  equals,
  fromInteger,
  multiply,
  powerOfTen,
  subtract,
  type Rational,
} from '../rational';
import { numberStep } from '../steps';
import { powerOfTenShift, type Diagnose } from '../tips';
import type { Question } from '../types';
import { formatFixed } from './rounding';

// Decimal arithmetic (spec §5.22).
export const DECIMAL_FORMS = ['addSubtract', 'multiply', 'divide'] as const;
export type DecimalForm = (typeof DECIMAL_FORMS)[number];

/** p of the factor p × 10⁻ⁱ; q of the other factor is in [2, 9]. */
export const MULTIPLY_DIGITS: readonly number[] = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 15, 25];
/** p of the quotient and q of the divisor: [2, 12] without 10. */
export const DIVIDE_DIGITS: readonly number[] = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12];

const HUNDRED = fromInteger(100);
const THOUSAND = fromInteger(1000);

/** digits × 10^exponent, exactly. */
function scaled(digits: number, exponent: number): Rational {
  return multiply(fromInteger(digits), powerOfTen(exponent));
}

/** Decimals of a value that terminates; every value in this topic does. */
function decimalsOf(value: Rational): number {
  const decimals = decimalPlaces(value);
  if (decimals === null) throw new RangeError('Value has no finite decimal representation');
  return decimals;
}

/**
 * A positive number below 100 with exactly `decimals` decimals (0 to 2), at most 3 significant
 * digits and no trailing zero after the comma.
 */
function randomDecimal(rng: Rng, decimals: number): Rational {
  const max = decimals === 0 ? 99 : 999;
  const digits = randomIntWhere(rng, 1, max, (n) => decimals === 0 || n % 10 !== 0);
  return scaled(digits, -decimals);
}

/** The digits of both numbers aligned on the right, as whole numbers are (spec §3.4.1). */
function rightAligned(a: Rational, b: Rational, subtracting: boolean): Rational {
  const decimalsA = decimalsOf(a);
  const decimalsB = decimalsOf(b);
  const digitsA = multiply(a, powerOfTen(decimalsA));
  const digitsB = multiply(b, powerOfTen(decimalsB));
  const combined = subtracting ? subtract(digitsA, digitsB) : add(digitsA, digitsB);
  return multiply(combined, powerOfTen(-Math.max(decimalsA, decimalsB)));
}

/** `4,7 + 0,35 = ?` or `5 − 0,25 = ?`; a subtraction has a > b. */
export function addSubtractQuestion(a: Rational, b: Rational, subtracting: boolean): Question {
  const answer = subtracting ? subtract(a, b) : add(a, b);
  const decimals = Math.max(decimalsOf(a), decimalsOf(b));
  const operator = subtracting ? MINUS : '+';
  const aligned = `${formatFixed(a, decimals)} ${operator} ${formatFixed(b, decimals)}`;
  const wrong = rightAligned(a, b, subtracting);
  const diagnose: Diagnose = (given) =>
    wrong.num > 0n && !equals(wrong, answer) && equals(given, wrong)
      ? `Zet de komma's onder elkaar: ${aligned}.`
      : undefined;
  return {
    key: `decimalArithmetic:${subtracting ? 'subtract' : 'add'}:${formatRational(a)}:${formatRational(b)}`,
    topic: 'decimalArithmetic',
    steps: [
      numberStep({
        prompt: `${formatRational(a)} ${operator} ${formatRational(b)} = ?`,
        answer,
        explanation: `${aligned} = ${formatRational(answer)}`,
        diagnose,
      }),
    ],
  };
}

/** A factor digits × 10^−decimals. */
export interface DecimalFactor {
  digits: number;
  decimals: number;
}

function factorValue({ digits, decimals }: DecimalFactor): Rational {
  return scaled(digits, -decimals);
}

/** `0,3 × 0,4 = ?`, in the order given. */
export function multiplyQuestion(first: DecimalFactor, second: DecimalFactor): Question {
  const a = factorValue(first);
  const b = factorValue(second);
  const answer = multiply(a, b);
  const together = first.decimals + second.decimals;
  const unit = together === 1 ? 'decimaal' : 'decimalen';
  const sum = `${first.decimals} + ${second.decimals} = ${together}`;
  const ascending = compare(a, b) <= 0;
  const low = ascending ? a : b;
  const high = ascending ? b : a;
  const diagnose: Diagnose = (given) => {
    const shift = powerOfTenShift(given, answer);
    return shift !== null && shift > 0
      ? `De uitkomst heeft evenveel decimalen als beide getallen samen: ${sum}.`
      : undefined;
  };
  return {
    key: `decimalArithmetic:multiply:${formatRational(low)}:${formatRational(high)}`,
    topic: 'decimalArithmetic',
    steps: [
      numberStep({
        prompt: `${formatRational(a)} × ${formatRational(b)} = ?`,
        answer,
        explanation:
          `${first.digits} × ${second.digits} = ${formatInteger(first.digits * second.digits)}; ` +
          `${sum} ${unit} → ${formatRational(answer)}`,
        diagnose,
      }),
    ],
  };
}

/** `2,5 : 0,05 = ?`: the quotient p × 10ˢ and the divisor q × 10ᵗ. */
export function divideQuestion(p: number, s: number, q: number, t: number): Question {
  const quotient = scaled(p, s);
  const divisor = scaled(q, t);
  const dividend = multiply(quotient, divisor);
  const sum = `${formatRational(dividend)} : ${formatRational(divisor)}`;
  const factor = powerOfTen(decimalsOf(divisor));
  const madeWhole =
    `${formatRational(multiply(dividend, factor))} : ` + formatRational(multiply(divisor, factor));
  const wholeDivisor = divisor.den === 1n;
  const diagnose: Diagnose = (given) =>
    !wholeDivisor && powerOfTenShift(given, quotient) !== null
      ? `Maak eerst van de deler een heel getal: ${sum} = ${madeWhole}.`
      : undefined;
  return {
    key: `decimalArithmetic:divide:${formatRational(dividend)}:${formatRational(divisor)}`,
    topic: 'decimalArithmetic',
    steps: [
      numberStep({
        prompt: `${sum} = ?`,
        answer: quotient,
        explanation: wholeDivisor
          ? `${formatInteger(p * q)} : ${q} = ${p} → ${sum} = ${formatRational(quotient)}`
          : `${sum} = ${madeWhole} = ${formatRational(quotient)} (beide × ${formatRational(factor)})`,
        diagnose,
      }),
    ],
  };
}

function addSubtractForm(rng: Rng): Question {
  return drawUntil(() => {
    const [decimalsA = 0, decimalsB = 1] = shuffle(rng, [0, 1, 2]);
    const a = randomDecimal(rng, decimalsA);
    const b = randomDecimal(rng, decimalsB);
    if (rng() < 0.5) {
      return compare(add(a, b), HUNDRED) < 0 ? addSubtractQuestion(a, b, false) : null;
    }
    // Different numbers of decimals and no trailing zeros, so a and b are never equal.
    return compare(a, b) > 0 ? addSubtractQuestion(a, b, true) : addSubtractQuestion(b, a, true);
  });
}

function multiplyForm(rng: Rng): Question {
  const { i, j } = drawUntil(() => {
    const i = randomInt(rng, 0, 2);
    const j = randomInt(rng, 0, 2);
    return i + j >= 1 && i + j <= 3 ? { i, j } : null;
  });
  const p = { digits: pick(rng, MULTIPLY_DIGITS), decimals: i };
  const q = { digits: randomInt(rng, 2, 9), decimals: j };
  return rng() < 0.5 ? multiplyQuestion(p, q) : multiplyQuestion(q, p);
}

function divideForm(rng: Rng): Question {
  return drawUntil(() => {
    const p = pick(rng, DIVIDE_DIGITS);
    const q = pick(rng, DIVIDE_DIGITS);
    const s = randomInt(rng, -2, 1);
    const t = randomInt(rng, -2, 0);
    const quotient = scaled(p, s);
    const divisor = scaled(q, t);
    const dividend = multiply(quotient, divisor);
    if (dividend.den === 1n && divisor.den === 1n) return null;
    if ([dividend, divisor, quotient].some((part) => decimalsOf(part) > 3)) return null;
    return compare(dividend, THOUSAND) < 0 ? divideQuestion(p, s, q, t) : null;
  });
}

const BUILDERS: Record<DecimalForm, (rng: Rng) => Question> = {
  addSubtract: addSubtractForm,
  multiply: multiplyForm,
  divide: divideForm,
};

/** One question of the given form. */
export function buildDecimalArithmetic(rng: Rng, form: DecimalForm): Question {
  return BUILDERS[form](rng);
}

/** One of three forms, each equally likely (spec §5.22). */
export function generateDecimalArithmetic(rng: Rng): Question {
  return buildDecimalArithmetic(rng, pick(rng, DECIMAL_FORMS));
}
```

In `src/lib/topics/index.ts`, add the import directly before the `./divisibility` import (the imports are sorted by module path):

```ts
import { generateDecimalArithmetic } from './decimalArithmetic';
```

Add `decimalArithmetic: generateDecimalArithmetic,` as the last entry of `GENERATORS`, and as the last entry of `TOPIC_LABELS`:

```ts
  decimalArithmetic: 'Rekenen met kommagetallen (0,3 × 0,4, 2,5 : 0,05)',
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/topics/decimalArithmetic.test.ts` then `npm test` then `npm run check`
Expected: all PASS; check 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

```bash
git diff src/lib/types.ts src/lib/topics/index.ts
git add src/lib/types.ts src/lib/topics/index.ts src/lib/topics/decimalArithmetic.ts src/lib/topics/decimalArithmetic.test.ts
git commit -m "feat: decimal arithmetic with aligned commas, decimals and divisors" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 5: `fractionConversion` (spec §5.20)

**Files:**
- Create: `src/lib/topics/fractionConversion.ts`
- Test: `src/lib/topics/fractionConversion.test.ts`
- Modify: `src/lib/types.ts`, `src/lib/topics/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/topics/fractionConversion.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { gcd } from '../primes';
import { createRng } from '../random';
import { rational } from '../rational';
import type { Question, Step } from '../types';
import {
  buildFractionConversion,
  CONVERSION_DIRECTIONS,
  type ConversionDirection,
  conversionQuestion,
  generateFractionConversion,
  PERCENTAGE_DENOMINATORS,
  TERMINATING_DENOMINATORS,
} from './fractionConversion';

const PER_DIRECTION = 600;

const PROMPTS: Record<ConversionDirection, RegExp> = {
  fractionToDecimal: /^Schrijf als kommagetal: \d+\/\d+$/u,
  decimalToFraction: /^Schrijf als breuk: 0,\d+$/u,
  fractionToPercentage: /^\d+\/\d+ = \?%$/u,
  percentageToFraction: /^Schrijf als breuk: \d+(?:,\d+| \d\/\d)?%$/u,
  decimalToPercentage: /^0,\d+ = \?%$/u,
  percentageToDecimal: /^Schrijf als kommagetal: \d+(?:,\d+)?%$/u,
};

function questionsOf(direction: ConversionDirection): Question[] {
  const rng = createRng(800 + CONVERSION_DIRECTIONS.indexOf(direction));
  return Array.from({ length: PER_DIRECTION }, () => buildFractionConversion(rng, direction));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

/** p and q from the key 'fractionConversion:direction:p/q'. */
function fractionOf(question: Question): [number, number] {
  const [p = '', q = ''] = question.key.split(':')[2]!.split('/');
  return [Number(p), Number(q)];
}

describe('generateFractionConversion', () => {
  it('produces all six directions about equally often, each accepting its answer', () => {
    const rng = createRng(1);
    const counts = new Map<string, number>();
    for (let i = 0; i < 1800; i++) {
      const question = generateFractionConversion(rng);
      expect(question.topic).toBe('fractionConversion');
      const step = stepOf(question);
      expect(step.check(step.check('').expected).correct, step.prompt).toBe(true);
      const direction = question.key.split(':')[1]!;
      counts.set(direction, (counts.get(direction) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual([...CONVERSION_DIRECTIONS].sort());
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(200);
      expect(count).toBeLessThan(400);
    }
  });
});

describe.each([...CONVERSION_DIRECTIONS])('%s', (direction) => {
  const questions = questionsOf(direction);
  const percentage = direction === 'fractionToPercentage' || direction === 'percentageToFraction';
  const denominators = percentage ? PERCENTAGE_DENOMINATORS : TERMINATING_DENOMINATORS;

  it('uses a proper fraction in lowest terms from the allowed denominators', () => {
    const seen = new Set<number>();
    for (const question of questions) {
      const [p, q] = fractionOf(question);
      expect(denominators).toContain(q);
      expect(p).toBeGreaterThan(0);
      expect(p).toBeLessThan(q);
      expect(gcd(p, q)).toBe(1);
      seen.add(q);
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([...denominators].sort((a, b) => a - b));
  });

  it('writes the prompt in the expected shape', () => {
    for (const question of questions) {
      expect(stepOf(question).prompt).toMatch(PROMPTS[direction]);
    }
  });
});

describe('fraction → decimal', () => {
  it('explains via a power of ten and names the digits side by side', () => {
    const step = stepOf(conversionQuestion('fractionToDecimal', rational(3n, 8n)));
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe('Schrijf als kommagetal: 3/8');
    expect(step.check('0,375')).toMatchObject({
      correct: true,
      expected: '0,375',
      explanation: '3/8 = 375/1000 = 0,375',
    });
    expect(step.check('3,8').tip).toBe('3/8 betekent 3 : 8, niet 3,8.');
    expect(stepOf(conversionQuestion('fractionToDecimal', rational(7n, 10n))).check('0,7')
      .explanation).toBe('7/10 = 0,7');
  });
});

describe('decimal → fraction', () => {
  const step = stepOf(conversionQuestion('decimalToFraction', rational(3n, 8n)));

  it('expects the fraction in simplest form', () => {
    expect(step.kind).toBe('fraction');
    expect(step.prompt).toBe('Schrijf als breuk: 0,375');
    expect(step.check('3/8')).toMatchObject({
      correct: true,
      expected: '3/8',
      explanation: '0,375 = 375/1000 = 3/8',
    });
    expect(step.check('375/1000').tip).toBe(
      'De waarde klopt, maar vereenvoudig nog: 375/1000 = 3/8.',
    );
    expect(step.check('0,375')).toMatchObject({
      correct: false,
      tip: 'Schrijf het antwoord als breuk, niet als kommagetal.',
    });
  });
});

describe('fraction → percentage', () => {
  it('accepts any equal value on the fraction keypad', () => {
    const step = stepOf(conversionQuestion('fractionToPercentage', rational(3n, 8n)));
    expect(step.kind).toBe('fraction');
    expect(step.prompt).toBe('3/8 = ?%');
    expect(step.suffix).toBe('%');
    expect(step.check('37,5')).toMatchObject({
      correct: true,
      expected: '37,5',
      explanation: '3/8 = 0,375 = 37,5%',
    });
    expect(step.check('75/2').correct).toBe(true);
    expect(step.check('0,375').tip).toBe('Procent betekent honderdste: vermenigvuldig met 100.');
  });

  it('writes thirds and sixths as mixed numbers', () => {
    const third = stepOf(conversionQuestion('fractionToPercentage', rational(1n, 3n)));
    expect(third.check('33 1/3')).toMatchObject({
      correct: true,
      expected: '33 1/3',
      explanation: '1/3 = 100% : 3 = 33 1/3%',
    });
    expect(third.check('100/3').correct).toBe(true);
    const sixths = stepOf(conversionQuestion('fractionToPercentage', rational(5n, 6n)));
    expect(sixths.check('83 1/3').explanation).toBe('5/6 = 5 × 16 2/3% = 83 1/3%');
  });
});

describe('percentage → fraction', () => {
  it('goes via the decimal for a terminating fraction', () => {
    const step = stepOf(conversionQuestion('percentageToFraction', rational(3n, 8n)));
    expect(step.kind).toBe('fraction');
    expect(step.prompt).toBe('Schrijf als breuk: 37,5%');
    expect(step.check('3/8')).toMatchObject({
      correct: true,
      explanation: '37,5% = 0,375 = 375/1000 = 3/8',
    });
    expect(step.check('0,375').tip).toBe('Schrijf het antwoord als breuk, niet als kommagetal.');
    const tenths = stepOf(conversionQuestion('percentageToFraction', rational(7n, 10n)));
    expect(tenths.prompt).toBe('Schrijf als breuk: 70%');
    expect(tenths.check('7/10').explanation).toBe('70% = 0,7 = 7/10');
    expect(tenths.check('70/100').tip).toBe('De waarde klopt, maar vereenvoudig nog: 70/100 = 7/10.');
  });

  it('goes via 100% for thirds and sixths', () => {
    const third = stepOf(conversionQuestion('percentageToFraction', rational(1n, 3n)));
    expect(third.prompt).toBe('Schrijf als breuk: 33 1/3%');
    expect(third.check('1/3').explanation).toBe('33 1/3% = 100% : 3 = 1/3');
    const twoThirds = stepOf(conversionQuestion('percentageToFraction', rational(2n, 3n)));
    expect(twoThirds.prompt).toBe('Schrijf als breuk: 66 2/3%');
    expect(twoThirds.check('2/3')).toMatchObject({
      correct: true,
      explanation: '66 2/3% = 2 × 33 1/3% = 2/3',
    });
  });
});

describe('decimal → percentage', () => {
  it('multiplies by 100% and names a forgotten × 100', () => {
    const step = stepOf(conversionQuestion('decimalToPercentage', rational(3n, 8n)));
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe('0,375 = ?%');
    expect(step.suffix).toBe('%');
    expect(step.check('37,5')).toMatchObject({
      correct: true,
      explanation: '0,375 = 0,375 × 100% = 37,5%',
    });
    expect(step.check('0,375').tip).toBe('Procent betekent honderdste: vermenigvuldig met 100.');
  });
});

describe('percentage → decimal', () => {
  it('divides by 100 and names a forgotten : 100', () => {
    const step = stepOf(conversionQuestion('percentageToDecimal', rational(3n, 8n)));
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe('Schrijf als kommagetal: 37,5%');
    expect(step.check('0,375')).toMatchObject({
      correct: true,
      explanation: '37,5% = 37,5 : 100 = 0,375',
    });
    expect(step.check('37,5').tip).toBe('Procent betekent honderdste: deel door 100.');
    expect(step.check('3,75').tip).toBe(
      'Je antwoord is 10 keer te groot. Let op de komma en het aantal nullen.',
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/topics/fractionConversion.test.ts`
Expected: FAIL, the module does not exist.

- [ ] **Step 3: Implement**

In `src/lib/types.ts`, extend `Topic`: replace `  | 'decimalArithmetic';` with:

```ts
  | 'decimalArithmetic'
  | 'fractionConversion';
```

Create `src/lib/topics/fractionConversion.ts`:

```ts
import { formatFraction, formatInteger, formatMixedNumber, formatRational } from '../format';
import { gcd } from '../primes';
import { pick, randomIntWhere, type Rng } from '../random';
import {
  decimalPlaces,
  equals,
  fromInteger,
  multiply,
  parseDutchNumber,
  rational,
  type Rational,
} from '../rational';
import { fractionStep, numberStep, simplestFractionStep } from '../steps';
import type { Diagnose } from '../tips';
import type { Question, Step } from '../types';

// Fraction ↔ decimal ↔ percentage (spec §5.20).
export const CONVERSION_DIRECTIONS = [
  'fractionToDecimal',
  'decimalToFraction',
  'fractionToPercentage',
  'percentageToFraction',
  'decimalToPercentage',
  'percentageToDecimal',
] as const;
export type ConversionDirection = (typeof CONVERSION_DIRECTIONS)[number];

/** Denominators whose fractions have a finite decimal. */
export const TERMINATING_DENOMINATORS: readonly number[] = [2, 4, 5, 8, 10, 20, 25, 50];
/** Fraction ↔ percentage also uses thirds and sixths: 33 1/3%. */
export const PERCENTAGE_DENOMINATORS: readonly number[] = [2, 3, 4, 5, 6, 8, 10, 20, 25, 50];

const HUNDRED = fromInteger(100);
const TO_PERCENT_TIP = 'Procent betekent honderdste: vermenigvuldig met 100.';
const FROM_PERCENT_TIP = 'Procent betekent honderdste: deel door 100.';

function usesPercentageDenominators(direction: ConversionDirection): boolean {
  return direction === 'fractionToPercentage' || direction === 'percentageToFraction';
}

/** The tip when the answer equals `wrong` exactly. */
function tipFor(wrong: Rational, tip: string): Diagnose {
  return (given) => (equals(given, wrong) ? tip : undefined);
}

/** 37,5, or a mixed number for thirds and sixths: 33 1/3. Without the % sign. */
export function formatPercentNumber(fraction: Rational): string {
  const percent = multiply(fraction, HUNDRED);
  return decimalPlaces(percent) === null ? formatMixedNumber(percent) : formatRational(percent);
}

/** 3/8 → '375/1000'; null when the denominator is a power of ten already (7/10). */
function overPowerOfTen(fraction: Rational): string | null {
  const decimals = decimalPlaces(fraction);
  if (decimals === null) throw new RangeError('Value has no finite decimal representation');
  const power = 10n ** BigInt(decimals);
  if (power === fraction.den) return null;
  return `${formatInteger((fraction.num * power) / fraction.den)}/${formatInteger(power)}`;
}

/** ['3/8', '375/1000', '0,375'], or ['7/10', '0,7']. */
function decimalChain(fraction: Rational): string[] {
  const middle = overPowerOfTen(fraction);
  return [formatFraction(fraction), ...(middle === null ? [] : [middle]), formatRational(fraction)];
}

/** Thirds and sixths via 100%: '100% : 3 = 33 1/3%' for p = 1, '2 × 33 1/3%' otherwise. */
function viaHundredPercent(fraction: Rational): string {
  const unit = formatPercentNumber(rational(1n, fraction.den));
  return fraction.num === 1n ? `100% : ${fraction.den}` : `${fraction.num} × ${unit}%`;
}

/** 3/8 = 0,375 = 37,5%; 1/3 = 100% : 3 = 33 1/3%; 5/6 = 5 × 16 2/3% = 83 1/3%. */
function toPercentExplanation(fraction: Rational): string {
  const percent = `${formatPercentNumber(fraction)}%`;
  const via =
    decimalPlaces(fraction) === null ? viaHundredPercent(fraction) : formatRational(fraction);
  return `${formatFraction(fraction)} = ${via} = ${percent}`;
}

/** 37,5% = 0,375 = 375/1000 = 3/8; 33 1/3% = 100% : 3 = 1/3; 66 2/3% = 2 × 33 1/3% = 2/3. */
function fromPercentExplanation(fraction: Rational): string {
  const percent = `${formatPercentNumber(fraction)}%`;
  if (decimalPlaces(fraction) === null) {
    return `${percent} = ${viaHundredPercent(fraction)} = ${formatFraction(fraction)}`;
  }
  return [percent, ...decimalChain(fraction).reverse()].join(' = ');
}

function conversionStep(direction: ConversionDirection, fraction: Rational): Step {
  const shownFraction = formatFraction(fraction);
  const shownDecimal = formatRational(fraction);
  const percentNumber = formatPercentNumber(fraction);
  const percent = multiply(fraction, HUNDRED);
  switch (direction) {
    case 'fractionToDecimal': {
      const p = formatInteger(fraction.num);
      const q = formatInteger(fraction.den);
      const sideBySide = parseDutchNumber(`${fraction.num},${fraction.den}`);
      return numberStep({
        prompt: `Schrijf als kommagetal: ${shownFraction}`,
        answer: fraction,
        explanation: decimalChain(fraction).join(' = '),
        diagnose:
          sideBySide === null
            ? undefined
            : tipFor(sideBySide, `${shownFraction} betekent ${p} : ${q}, niet ${p},${q}.`),
      });
    }
    case 'decimalToFraction':
      return simplestFractionStep({
        prompt: `Schrijf als breuk: ${shownDecimal}`,
        answer: fraction,
        decimalAllowed: false,
        explanation: decimalChain(fraction).reverse().join(' = '),
      });
    case 'fractionToPercentage':
      // The fraction keypad for every fraction, so the breuk key does not give away thirds.
      return fractionStep({
        prompt: `${shownFraction} = ?%`,
        answer: percent,
        suffix: '%',
        expected: percentNumber,
        explanation: toPercentExplanation(fraction),
        diagnose: tipFor(fraction, TO_PERCENT_TIP),
      });
    case 'percentageToFraction':
      return simplestFractionStep({
        prompt: `Schrijf als breuk: ${percentNumber}%`,
        answer: fraction,
        decimalAllowed: false,
        explanation: fromPercentExplanation(fraction),
      });
    case 'decimalToPercentage':
      return numberStep({
        prompt: `${shownDecimal} = ?%`,
        answer: percent,
        suffix: '%',
        explanation: `${shownDecimal} = ${shownDecimal} × 100% = ${percentNumber}%`,
        diagnose: tipFor(fraction, TO_PERCENT_TIP),
      });
    case 'percentageToDecimal':
      return numberStep({
        prompt: `Schrijf als kommagetal: ${percentNumber}%`,
        answer: fraction,
        explanation: `${percentNumber}% = ${percentNumber} : 100 = ${shownDecimal}`,
        diagnose: tipFor(percent, FROM_PERCENT_TIP),
      });
  }
}

/** One conversion of `fraction` in the given direction. */
export function conversionQuestion(direction: ConversionDirection, fraction: Rational): Question {
  return {
    key: `fractionConversion:${direction}:${fraction.num}/${fraction.den}`,
    topic: 'fractionConversion',
    steps: [conversionStep(direction, fraction)],
  };
}

/** p/q in lowest terms with 0 < p < q: first q uniformly, then p (spec §5.20). */
function randomFraction(rng: Rng, denominators: readonly number[]): Rational {
  const q = pick(rng, denominators);
  const p = randomIntWhere(rng, 1, q - 1, (candidate) => gcd(candidate, q) === 1);
  return rational(BigInt(p), BigInt(q));
}

/** One question in the given direction. */
export function buildFractionConversion(rng: Rng, direction: ConversionDirection): Question {
  const denominators = usesPercentageDenominators(direction)
    ? PERCENTAGE_DENOMINATORS
    : TERMINATING_DENOMINATORS;
  return conversionQuestion(direction, randomFraction(rng, denominators));
}

/** One of six directions, each equally likely (spec §5.20). */
export function generateFractionConversion(rng: Rng): Question {
  return buildFractionConversion(rng, pick(rng, CONVERSION_DIRECTIONS));
}
```

Note: the `switch` covers every direction, so TypeScript accepts the missing `default` (the function's return type is `Step`).

In `src/lib/topics/index.ts`, add the import after the `./divisibility` import (sorted by module path):

```ts
import { generateFractionConversion } from './fractionConversion';
```

Add `fractionConversion: generateFractionConversion,` as the last entry of `GENERATORS`, and as the last entry of `TOPIC_LABELS`:

```ts
  fractionConversion: 'Omzetten tussen breuk, kommagetal en procent',
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/topics/fractionConversion.test.ts` then `npm test` then `npm run check`
Expected: all PASS; check 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

```bash
git diff src/lib/types.ts src/lib/topics/index.ts
git add src/lib/types.ts src/lib/topics/index.ts src/lib/topics/fractionConversion.ts src/lib/topics/fractionConversion.test.ts
git commit -m "feat: convert between fractions, decimals and percentages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 6: `fractionArithmetic`, part 1: simplify, equivalent, part of a number (spec §5.21)

This task creates the module with two of the four groups. Task 7 adds the other two groups and widens `ARITHMETIC_FORMS` and `ARITHMETIC_GROUPS`.

**Files:**
- Create: `src/lib/topics/fractionArithmetic.ts`
- Test: `src/lib/topics/fractionArithmetic.test.ts`
- Modify: `src/lib/types.ts`, `src/lib/topics/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/topics/fractionArithmetic.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { gcd } from '../primes';
import { createRng } from '../random';
import { divide, fromInteger, multiply, rational, type Rational } from '../rational';
import { parseFractionAnswer } from '../steps';
import type { Question, Step } from '../types';
import {
  ARITHMETIC_FORMS,
  type ArithmeticForm,
  buildFractionArithmetic,
  EQUIVALENT_VARIANTS,
  equivalentQuestion,
  generateFractionArithmetic,
  IMPROPER_FRACTIONS,
  PROPER_FRACTIONS,
  partQuestion,
  simplifyQuestion,
  wholeQuestion,
} from './fractionArithmetic';

const PER_FORM = 1000;
const SIMPLIFY = /^Vereenvoudig (\d+)\/(\d+)$/u;
const EQUIVALENT = /^(\d+)\/(\d+) = (\?|\d+)\/(\?|\d+)$/u;
const PART = /^(\d+)\/(\d+) van (\d+) = \?$/u;
const WHOLE = /^(\d+)\/(\d+) is (\d+)\. Hoeveel is het geheel\?$/u;

function questionsOf(form: ArithmeticForm): Question[] {
  const rng = createRng(900 + ARITHMETIC_FORMS.indexOf(form));
  return Array.from({ length: PER_FORM }, () => buildFractionArithmetic(rng, form));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

function fraction(num: string, den: string): Rational {
  return rational(BigInt(num), BigInt(den));
}

/** The expected answer as a value, read the way the keypad input is. */
function answerOf(step: Step): Rational {
  const parsed = parseFractionAnswer(step.check('').expected);
  if (parsed === null) throw new Error(`Unparsable expected answer in ${step.prompt}`);
  return parsed.value;
}

describe('fraction pools', () => {
  it('has the 45 proper and the 45 improper fractions with denominators 2 to 12', () => {
    expect(PROPER_FRACTIONS).toHaveLength(45);
    expect(IMPROPER_FRACTIONS).toHaveLength(45);
    for (const value of PROPER_FRACTIONS) {
      expect(value.num < value.den && value.den >= 2n && value.den <= 12n).toBe(true);
    }
    for (const value of IMPROPER_FRACTIONS) {
      expect(value.num > value.den && value.num < 2n * value.den && value.den <= 12n).toBe(true);
    }
  });
});

describe('generateFractionArithmetic', () => {
  it('produces every form, each accepting its expected answer', () => {
    const rng = createRng(1);
    const forms = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const question = generateFractionArithmetic(rng);
      expect(question.topic).toBe('fractionArithmetic');
      const step = stepOf(question);
      expect(step.check(step.check('').expected).correct, step.prompt).toBe(true);
      forms.add(question.key.split(':')[1]!);
    }
    expect([...forms].sort()).toEqual([...ARITHMETIC_FORMS].sort());
  });
});

describe('simplify', () => {
  const questions = questionsOf('simplify');

  it('shows an unsimplified fraction with terms up to 100 and expects its simplest form', () => {
    let improper = 0;
    for (const question of questions) {
      const step = stepOf(question);
      expect(step.kind).toBe('fraction');
      const match = SIMPLIFY.exec(step.prompt);
      expect(match, step.prompt).not.toBeNull();
      const [, num = '', den = ''] = match!;
      expect(Number(num)).toBeLessThanOrEqual(100);
      expect(Number(den)).toBeLessThanOrEqual(100);
      expect(gcd(Number(num), Number(den))).toBeGreaterThan(1);
      expect(answerOf(step)).toEqual(fraction(num, den));
      expect(parseFractionAnswer(step.check('').expected)!.simplest).toBe(true);
      if (Number(num) > Number(den)) improper++;
    }
    expect(improper).toBeGreaterThan(120);
    expect(improper).toBeLessThan(280);
  });

  it('explains the common factor and names an unfinished simplification', () => {
    const step = stepOf(simplifyQuestion(rational(3n, 4n), 6));
    expect(step.prompt).toBe('Vereenvoudig 18/24');
    expect(step.check('3/4')).toMatchObject({
      correct: true,
      expected: '3/4',
      explanation: '18/24 = 3/4 (teller en noemer : 6)',
    });
    expect(step.check('9/12').tip).toBe('De waarde klopt, maar vereenvoudig nog: 9/12 = 3/4.');
    expect(step.check('0,75').tip).toBe('Schrijf het antwoord als breuk, niet als kommagetal.');
  });

  it('accepts an improper answer and its mixed number', () => {
    const step = stepOf(simplifyQuestion(rational(5n, 4n), 3));
    expect(step.prompt).toBe('Vereenvoudig 15/12');
    expect(step.check('5/4').correct).toBe(true);
    expect(step.check('1 1/4')).toMatchObject({
      correct: true,
      expected: '1 1/4',
      explanation: '15/12 = 5/4 = 1 1/4 (teller en noemer : 3)',
    });
  });
});

describe('equivalent', () => {
  const questions = questionsOf('equivalent');

  it('has exactly one unknown term that makes both fractions equal', () => {
    const variants = new Set<string>();
    for (const question of questions) {
      const step = stepOf(question);
      expect(step.kind).toBe('number');
      const match = EQUIVALENT.exec(step.prompt);
      expect(match, step.prompt).not.toBeNull();
      const [, a = '', b = '', c = '', d = ''] = match!;
      expect([c, d].filter((term) => term === '?')).toHaveLength(1);
      const answer = step.check('').expected;
      const filled = fraction(c === '?' ? answer : c, d === '?' ? answer : d);
      expect(filled).toEqual(fraction(a, b));
      for (const term of [a, b, c, d, answer]) {
        if (term !== '?') expect(Number(term)).toBeLessThanOrEqual(100);
      }
      variants.add(question.key.split(':')[2]!);
    }
    expect([...variants].sort()).toEqual([...EQUIVALENT_VARIANTS].sort());
  });

  it('explains the factor and names the additive mistake', () => {
    const up = stepOf(equivalentQuestion(rational(3n, 4n), 3, 'upNumerator'));
    expect(up.prompt).toBe('3/4 = ?/12');
    expect(up.check('9')).toMatchObject({
      correct: true,
      explanation: '3/4 = 9/12 (teller en noemer × 3)',
    });
    const tip =
      'Vermenigvuldig of deel teller en noemer met hetzelfde getal; het verschil blijft niet gelijk.';
    expect(up.check('11').tip).toBe(tip);
    const down = stepOf(equivalentQuestion(rational(3n, 4n), 3, 'downDenominator'));
    expect(down.prompt).toBe('9/12 = 3/?');
    expect(down.check('4')).toMatchObject({
      correct: true,
      explanation: '9/12 = 3/4 (teller en noemer : 3)',
    });
    expect(down.check('6').tip).toBe(tip);
    expect(stepOf(equivalentQuestion(rational(3n, 4n), 3, 'upDenominator')).prompt).toBe(
      '3/4 = 9/?',
    );
    expect(stepOf(equivalentQuestion(rational(3n, 4n), 3, 'downNumerator')).prompt).toBe(
      '9/12 = ?/4',
    );
  });
});

describe('part of a number', () => {
  const questions = questionsOf('part');

  it('takes a proper fraction of a multiple of its denominator', () => {
    for (const question of questions) {
      const step = stepOf(question);
      expect(step.kind).toBe('number');
      const match = PART.exec(step.prompt);
      expect(match, step.prompt).not.toBeNull();
      const [, num = '', den = '', whole = ''] = match!;
      expect(Number(whole) % Number(den)).toBe(0);
      expect(Number(whole)).toBeLessThanOrEqual(144);
      expect(answerOf(step)).toEqual(multiply(fraction(num, den), fromInteger(Number(whole))));
    }
  });

  it('explains via one part and names one part and dividing', () => {
    const step = stepOf(partQuestion(rational(3n, 4n), 6));
    expect(step.prompt).toBe('3/4 van 24 = ?');
    expect(step.check('18')).toMatchObject({
      correct: true,
      explanation: '1/4 van 24 = 24 : 4 = 6 → 3/4 = 3 × 6 = 18',
    });
    expect(step.check('6').tip).toBe('Dat is 1/4 van 24; 3/4 is 3 keer zoveel.');
    expect(step.check('32').tip).toBe('Je hebt gedeeld; 3/4 van 24 is 24 : 4 × 3.');
    const unit = stepOf(partQuestion(rational(1n, 5n), 7));
    expect(unit.check('7').explanation).toBe('1/5 van 35 = 35 : 5 = 7');
    expect(unit.check('175').tip).toBe('Je hebt gedeeld; 1/5 van 35 is 35 : 5.');
  });
});

describe('back to the whole', () => {
  const questions = questionsOf('whole');

  it('gives a part and expects the whole', () => {
    for (const question of questions) {
      const step = stepOf(question);
      const match = WHOLE.exec(step.prompt);
      expect(match, step.prompt).not.toBeNull();
      const [, num = '', den = '', part = ''] = match!;
      expect(answerOf(step)).toEqual(divide(fromInteger(Number(part)), fraction(num, den)));
      expect(Number(step.check('').expected) % Number(den)).toBe(0);
    }
  });

  it('explains via one part and names the fraction of the part and one part', () => {
    const step = stepOf(wholeQuestion(rational(3n, 4n), 6));
    expect(step.prompt).toBe('3/4 is 18. Hoeveel is het geheel?');
    expect(step.check('24')).toMatchObject({
      correct: true,
      explanation: '3/4 = 18 → 1/4 = 18 : 3 = 6 → 4/4 = 4 × 6 = 24',
    });
    expect(step.check('13,5').tip).toBe(
      'Je hebt 3/4 van 18 berekend, maar 18 is zelf al 3/4. Reken terug naar het geheel.',
    );
    expect(step.check('6').tip).toBe('Dat is 1/4; het geheel is 4/4.');
    const unit = stepOf(wholeQuestion(rational(1n, 4n), 6));
    expect(unit.prompt).toBe('1/4 is 6. Hoeveel is het geheel?');
    expect(unit.check('24').explanation).toBe('1/4 = 6 → 4/4 = 4 × 6 = 24');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/topics/fractionArithmetic.test.ts`
Expected: FAIL, the module does not exist.

- [ ] **Step 3: Implement**

In `src/lib/types.ts`, extend `Topic`: replace `  | 'fractionConversion';` with:

```ts
  | 'fractionConversion'
  | 'fractionArithmetic';
```

Create `src/lib/topics/fractionArithmetic.ts`:

```ts
import { formatFraction, formatInteger, formatMixedNumber } from '../format';
import { gcd } from '../primes';
import { pick, randomInt, randomIntWhere, type Rng } from '../random';
import { equals, fromInteger, multiply, rational, type Rational } from '../rational';
import { numberStep, simplestFractionStep } from '../steps';
import type { Diagnose } from '../tips';
import type { Question } from '../types';

// Fraction arithmetic (spec §5.21).
export const ARITHMETIC_FORMS = ['simplify', 'equivalent', 'part', 'whole'] as const;
export type ArithmeticForm = (typeof ARITHMETIC_FORMS)[number];

/** Equally likely groups; a group with two forms picks one of them (spec §5.21). */
export const ARITHMETIC_GROUPS: readonly (readonly ArithmeticForm[])[] = [
  ['simplify', 'equivalent'],
  ['part', 'whole'],
];

export const EQUIVALENT_VARIANTS = [
  'upNumerator',
  'upDenominator',
  'downNumerator',
  'downDenominator',
] as const;
export type EquivalentVariant = (typeof EQUIVALENT_VARIANTS)[number];

/** p/q in lowest terms with q ∈ [2, 12] and p < 2q that pass `accept`. */
function fractionsWhere(accept: (p: number, q: number) => boolean): Rational[] {
  const result: Rational[] = [];
  for (let q = 2; q <= 12; q++) {
    for (let p = 1; p < 2 * q; p++) {
      if (gcd(p, q) === 1 && accept(p, q)) result.push(rational(BigInt(p), BigInt(q)));
    }
  }
  return result;
}

/** Proper fractions: p/q in lowest terms with 0 < p < q and q ∈ [2, 12]. */
export const PROPER_FRACTIONS: readonly Rational[] = fractionsWhere((p, q) => p < q);
/** Improper answers of simplify: q < p < 2q. */
export const IMPROPER_FRACTIONS: readonly Rational[] = fractionsWhere((p, q) => p > q);

const EQUIVALENT_TIP =
  'Vermenigvuldig of deel teller en noemer met hetzelfde getal; het verschil blijft niet gelijk.';

/** 'a/b' from two terms. */
function terms(num: bigint, den: bigint): string {
  return `${formatInteger(num)}/${formatInteger(den)}`;
}

/** `Vereenvoudig 18/24`: the answer with both terms multiplied by k. */
export function simplifyQuestion(answer: Rational, k: number): Question {
  const factor = BigInt(k);
  const shown = terms(answer.num * factor, answer.den * factor);
  const result =
    answer.num > answer.den
      ? `${formatFraction(answer)} = ${formatMixedNumber(answer)}`
      : formatFraction(answer);
  return {
    key: `fractionArithmetic:simplify:${shown}`,
    topic: 'fractionArithmetic',
    steps: [
      simplestFractionStep({
        prompt: `Vereenvoudig ${shown}`,
        answer,
        decimalAllowed: false,
        explanation: `${shown} = ${result} (teller en noemer : ${k})`,
      }),
    ],
  };
}

/**
 * `3/4 = ?/12` (up) or `9/12 = ?/4` (down): the small fraction is `base`, the large one has both
 * terms × k. The unknown is the numerator or the denominator of the right-hand fraction.
 */
export function equivalentQuestion(
  base: Rational,
  k: number,
  variant: EquivalentVariant,
): Question {
  const factor = BigInt(k);
  const small = [base.num, base.den] as const;
  const large = [base.num * factor, base.den * factor] as const;
  const up = variant === 'upNumerator' || variant === 'upDenominator';
  const known = up ? small : large;
  const other = up ? large : small;
  const unknownNumerator = variant === 'upNumerator' || variant === 'downNumerator';
  const answer = unknownNumerator ? other[0] : other[1];
  const left = terms(known[0], known[1]);
  const right = unknownNumerator
    ? `?/${formatInteger(other[1])}`
    : `${formatInteger(other[0])}/?`;
  // The additive mistake keeps the difference: 3/4 = ?/12 → 3 + (12 − 4) = 11.
  const additive = unknownNumerator
    ? known[0] + (other[1] - known[1])
    : known[1] + (other[0] - known[0]);
  const diagnose: Diagnose = (given) =>
    additive > 0n && equals(given, rational(additive)) ? EQUIVALENT_TIP : undefined;
  return {
    key: `fractionArithmetic:equivalent:${variant}:${formatFraction(base)}:${k}`,
    topic: 'fractionArithmetic',
    steps: [
      numberStep({
        prompt: `${left} = ${right}`,
        answer: rational(answer),
        explanation: `${left} = ${terms(other[0], other[1])} (teller en noemer ${up ? '×' : ':'} ${k})`,
        diagnose,
      }),
    ],
  };
}

/** `3/4 van 24 = ?`: the whole is q × m. */
export function partQuestion(fraction: Rational, m: number): Question {
  const p = Number(fraction.num);
  const q = Number(fraction.den);
  const whole = q * m;
  const answer = p * m;
  const shown = formatFraction(fraction);
  const unit = `1/${q}`;
  const onePart = `${unit} van ${whole} = ${whole} : ${q} = ${m}`;
  const correctWay = p === 1 ? `${whole} : ${q}` : `${whole} : ${q} × ${p}`;
  const diagnose: Diagnose = (given) => {
    if (p > 1 && equals(given, fromInteger(m))) {
      return `Dat is ${unit} van ${whole}; ${shown} is ${p} keer zoveel.`;
    }
    if (equals(given, rational(BigInt(whole * q), BigInt(p)))) {
      return `Je hebt gedeeld; ${shown} van ${whole} is ${correctWay}.`;
    }
    return undefined;
  };
  return {
    key: `fractionArithmetic:part:${shown}:${whole}`,
    topic: 'fractionArithmetic',
    steps: [
      numberStep({
        prompt: `${shown} van ${whole} = ?`,
        answer: fromInteger(answer),
        explanation: p === 1 ? onePart : `${onePart} → ${shown} = ${p} × ${m} = ${answer}`,
        diagnose,
      }),
    ],
  };
}

/** `3/4 is 18. Hoeveel is het geheel?`: the part is p × m, the whole q × m. */
export function wholeQuestion(fraction: Rational, m: number): Question {
  const p = Number(fraction.num);
  const q = Number(fraction.den);
  const part = p * m;
  const whole = q * m;
  const shown = formatFraction(fraction);
  const unit = `1/${q}`;
  const toWhole = `${q}/${q} = ${q} × ${m} = ${whole}`;
  const diagnose: Diagnose = (given) => {
    if (equals(given, multiply(fraction, fromInteger(part)))) {
      return (
        `Je hebt ${shown} van ${part} berekend, maar ${part} is zelf al ${shown}. ` +
        'Reken terug naar het geheel.'
      );
    }
    if (p > 1 && equals(given, fromInteger(m))) return `Dat is ${unit}; het geheel is ${q}/${q}.`;
    return undefined;
  };
  return {
    key: `fractionArithmetic:whole:${shown}:${part}`,
    topic: 'fractionArithmetic',
    steps: [
      numberStep({
        prompt: `${shown} is ${part}. Hoeveel is het geheel?`,
        answer: fromInteger(whole),
        explanation:
          p === 1
            ? `${unit} = ${m} → ${toWhole}`
            : `${shown} = ${part} → ${unit} = ${part} : ${p} = ${m} → ${toWhole}`,
        diagnose,
      }),
    ],
  };
}

function simplify(rng: Rng): Question {
  const answer = rng() < 0.8 ? pick(rng, PROPER_FRACTIONS) : pick(rng, IMPROPER_FRACTIONS);
  const k = randomIntWhere(
    rng,
    2,
    10,
    (candidate) => candidate * Number(answer.num) <= 100 && candidate * Number(answer.den) <= 100,
  );
  return simplifyQuestion(answer, k);
}

function equivalent(rng: Rng): Question {
  const base = pick(rng, PROPER_FRACTIONS);
  const k = randomIntWhere(rng, 2, 10, (candidate) => candidate * Number(base.den) <= 100);
  return equivalentQuestion(base, k, pick(rng, EQUIVALENT_VARIANTS));
}

function part(rng: Rng): Question {
  return partQuestion(pick(rng, PROPER_FRACTIONS), randomInt(rng, 2, 12));
}

function whole(rng: Rng): Question {
  return wholeQuestion(pick(rng, PROPER_FRACTIONS), randomInt(rng, 2, 12));
}

const BUILDERS: Record<ArithmeticForm, (rng: Rng) => Question> = {
  simplify,
  equivalent,
  part,
  whole,
};

/** One question of the given form. */
export function buildFractionArithmetic(rng: Rng, form: ArithmeticForm): Question {
  return BUILDERS[form](rng);
}

/** A group, each equally likely, then one of its forms (spec §5.21). */
export function generateFractionArithmetic(rng: Rng): Question {
  return buildFractionArithmetic(rng, pick(rng, pick(rng, ARITHMETIC_GROUPS)));
}
```

In `src/lib/topics/index.ts`, add the import after the `./divisibility` import, before `./fractionConversion` (sorted by module path):

```ts
import { generateFractionArithmetic } from './fractionArithmetic';
```

Add `fractionArithmetic: generateFractionArithmetic,` as the last entry of `GENERATORS`, and as the last entry of `TOPIC_LABELS`:

```ts
  fractionArithmetic: 'Rekenen met breuken (ook gemengde getallen en deel van een getal)',
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/topics/fractionArithmetic.test.ts` then `npm test` then `npm run check`
Expected: all PASS; check 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

```bash
git diff src/lib/types.ts src/lib/topics/index.ts
git add src/lib/types.ts src/lib/topics/index.ts src/lib/topics/fractionArithmetic.ts src/lib/topics/fractionArithmetic.test.ts
git commit -m "feat: simplify, equivalent fractions and a fraction of a number" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 7: `fractionArithmetic`, part 2: add/subtract and multiply/divide (spec §5.21)

**Files:**
- Modify: `src/lib/topics/fractionArithmetic.ts`
- Test: `src/lib/topics/fractionArithmetic.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/lib/topics/fractionArithmetic.test.ts`, change the imports to:

```ts
import { describe, expect, it } from 'vitest';
import { gcd, lcm } from '../primes';
import { createRng } from '../random';
import {
  add,
  divide,
  fromInteger,
  multiply,
  rational,
  subtract,
  type Rational,
} from '../rational';
import { parseFractionAnswer } from '../steps';
import type { Question, Step } from '../types';
import {
  addSubtractQuestion,
  ARITHMETIC_FORMS,
  type ArithmeticForm,
  buildFractionArithmetic,
  EQUIVALENT_VARIANTS,
  equivalentQuestion,
  generateFractionArithmetic,
  IMPROPER_FRACTIONS,
  multiplyDivideQuestion,
  PROPER_FRACTIONS,
  partQuestion,
  simplifyQuestion,
  type Term,
  wholeQuestion,
} from './fractionArithmetic';
```

Add after the existing regex constants:

```ts
const ADD_SUBTRACT = /^(?:(\d) )?(\d+)\/(\d+) ([+−]) (?:(\d) )?(\d+)\/(\d+) = \?$/u;
const MULTIPLY_DIVIDE = /^(\d+)(?:\/(\d+))? ([×:]) (\d+)(?:\/(\d+))? = \?$/u;

const term = (whole: number, num: bigint, den: bigint): Term => ({
  whole,
  fraction: rational(num, den),
});

function isProper(value: Rational): boolean {
  return value.num > 0n && value.num < value.den && value.den <= 12n;
}
```

Add at the end of the file:

```ts
describe('group shares', () => {
  it('picks the four groups about equally often', () => {
    const rng = createRng(2);
    const counts = new Map<string, number>();
    for (let i = 0; i < 4000; i++) {
      const form = generateFractionArithmetic(rng).key.split(':')[1]!;
      counts.set(form, (counts.get(form) ?? 0) + 1);
    }
    for (const group of ['addSubtract', 'multiplyDivide']) {
      expect(counts.get(group)).toBeGreaterThan(800);
      expect(counts.get(group)).toBeLessThan(1200);
    }
    for (const form of ['simplify', 'equivalent', 'part', 'whole']) {
      expect(counts.get(form)).toBeGreaterThan(350);
      expect(counts.get(form)).toBeLessThan(650);
    }
  });
});

describe('add / subtract', () => {
  const questions = questionsOf('addSubtract');

  it('adds or subtracts two proper fractions with different denominators, LCM up to 36', () => {
    let mixed = 0;
    for (const question of questions) {
      const step = stepOf(question);
      expect(step.kind).toBe('fraction');
      const match = ADD_SUBTRACT.exec(step.prompt);
      expect(match, step.prompt).not.toBeNull();
      const [, wholeA, numA = '', denA = '', operator, wholeB, numB = '', denB = ''] = match!;
      const a = fraction(numA, denA);
      const b = fraction(numB, denB);
      expect(isProper(a) && isProper(b)).toBe(true);
      expect(a.den).toBe(BigInt(denA));
      expect(b.den).toBe(BigInt(denB));
      expect(denA).not.toBe(denB);
      expect(lcm(Number(denA), Number(denB))).toBeLessThanOrEqual(36);
      expect(wholeA === undefined).toBe(wholeB === undefined);
      const left = add(fromInteger(Number(wholeA ?? 0)), a);
      const right = add(fromInteger(Number(wholeB ?? 0)), b);
      if (wholeA !== undefined) {
        mixed++;
        for (const whole of [wholeA, wholeB!]) {
          expect(Number(whole)).toBeGreaterThanOrEqual(1);
          expect(Number(whole)).toBeLessThanOrEqual(5);
        }
        if (operator === '−') expect(Number(wholeA)).toBeGreaterThan(Number(wholeB));
      }
      const answer = operator === '−' ? subtract(left, right) : add(left, right);
      expect(answer.num > 0n, step.prompt).toBe(true);
      expect(answerOf(step)).toEqual(answer);
      expect(parseFractionAnswer(step.check('').expected)!.simplest).toBe(true);
    }
    expect(mixed).toBeGreaterThan(200);
    expect(mixed).toBeLessThan(400);
  });

  it('makes the denominators equal, then simplifies and takes out the wholes', () => {
    const step = stepOf(addSubtractQuestion(term(0, 2n, 3n), term(0, 1n, 4n), false));
    expect(step.prompt).toBe('2/3 + 1/4 = ?');
    expect(step.check('11/12')).toMatchObject({
      correct: true,
      expected: '11/12',
      explanation: '2/3 + 1/4 = 8/12 + 3/12 = 11/12',
    });
    expect(step.check('3/7').tip).toBe(
      'Maak eerst de noemers gelijk; tel daarna alleen de tellers op.',
    );
    expect(step.check('22/24').tip).toBe(
      'De waarde klopt, maar vereenvoudig nog: 22/24 = 11/12.',
    );
    const improper = stepOf(addSubtractQuestion(term(0, 2n, 3n), term(0, 3n, 4n), false));
    expect(improper.check('17/12')).toMatchObject({
      correct: true,
      expected: '1 5/12',
      explanation: '2/3 + 3/4 = 8/12 + 9/12 = 17/12 = 1 5/12',
    });
    expect(improper.check('1 5/12').correct).toBe(true);
    const half = stepOf(addSubtractQuestion(term(0, 1n, 6n), term(0, 1n, 3n), false));
    expect(half.check('1/2').explanation).toBe('1/6 + 1/3 = 1/6 + 2/6 = 3/6 = 1/2');
    expect(half.check('0,5').correct).toBe(true);
  });

  it('subtracts and names subtracting numerators and denominators', () => {
    const step = stepOf(addSubtractQuestion(term(0, 3n, 4n), term(0, 1n, 6n), true));
    expect(step.prompt).toBe('3/4 − 1/6 = ?');
    expect(step.check('7/12').explanation).toBe('3/4 − 1/6 = 9/12 − 2/12 = 7/12');
    const other = stepOf(addSubtractQuestion(term(0, 5n, 6n), term(0, 1n, 4n), true));
    expect(other.check('2').tip).toBe(
      'Maak eerst de noemers gelijk; trek daarna alleen de tellers af.',
    );
  });

  it('keeps the wholes of mixed numbers', () => {
    const sum = stepOf(addSubtractQuestion(term(2, 2n, 3n), term(1, 3n, 4n), false));
    expect(sum.prompt).toBe('2 2/3 + 1 3/4 = ?');
    expect(sum.check('4 5/12')).toMatchObject({
      correct: true,
      explanation: '2 2/3 + 1 3/4 = 2 8/12 + 1 9/12 = 3 17/12 = 4 5/12',
    });
    expect(sum.check('53/12').correct).toBe(true);
    const plain = stepOf(addSubtractQuestion(term(3, 3n, 4n), term(1, 1n, 2n), true));
    expect(plain.check('2 1/4').explanation).toBe('3 3/4 − 1 1/2 = 3 3/4 − 1 2/4 = 2 1/4');
  });

  it('exchanges a whole when needed and names subtracting the wrong way round', () => {
    const step = stepOf(addSubtractQuestion(term(3, 1n, 2n), term(1, 3n, 4n), true));
    expect(step.prompt).toBe('3 1/2 − 1 3/4 = ?');
    expect(step.check('1 3/4')).toMatchObject({
      correct: true,
      explanation: '3 1/2 − 1 3/4 = 3 2/4 − 1 3/4 = 2 6/4 − 1 3/4 = 1 3/4',
    });
    expect(step.check('2 1/4').tip).toBe(
      'Je kunt 3/4 niet van 1/2 aftrekken: wissel eerst 1 geheel om, 3 1/2 = 2 6/4.',
    );
    const belowOne = stepOf(addSubtractQuestion(term(2, 1n, 2n), term(1, 3n, 4n), true));
    expect(belowOne.check('3/4').explanation).toBe(
      '2 1/2 − 1 3/4 = 2 2/4 − 1 3/4 = 1 6/4 − 1 3/4 = 3/4',
    );
  });
});

describe('multiply / divide', () => {
  const questions = questionsOf('multiplyDivide');

  it('combines proper fractions and at most one whole number from 2 to 12', () => {
    const seen = new Set<string>();
    for (const question of questions) {
      const step = stepOf(question);
      expect(step.kind).toBe('fraction');
      const match = MULTIPLY_DIVIDE.exec(step.prompt);
      expect(match, step.prompt).not.toBeNull();
      const [, numX = '', denX, operator, numY = '', denY] = match!;
      expect(denX === undefined && denY === undefined).toBe(false);
      const x = fraction(numX, denX ?? '1');
      const y = fraction(numY, denY ?? '1');
      for (const [value, den] of [[x, denX], [y, denY]] as const) {
        if (den === undefined) {
          expect(Number(value.num)).toBeGreaterThanOrEqual(2);
          expect(Number(value.num)).toBeLessThanOrEqual(12);
        } else {
          expect(isProper(value)).toBe(true);
          expect(value.den).toBe(BigInt(den));
        }
      }
      if (operator === ':') expect(x).not.toEqual(y);
      const answer = operator === ':' ? divide(x, y) : multiply(x, y);
      expect(answerOf(step)).toEqual(answer);
      expect(parseFractionAnswer(step.check('').expected)!.simplest).toBe(true);
      const shape = `${denX === undefined ? 'n' : 'f'}${operator}${denY === undefined ? 'n' : 'f'}`;
      seen.add(shape);
    }
    expect([...seen].sort()).toEqual(['f:f', 'f:n', 'f×f', 'f×n', 'n:f', 'n×f'].sort());
  });

  it('multiplies numerators and denominators, then simplifies', () => {
    const step = stepOf(multiplyDivideQuestion(rational(3n, 4n), rational(2n, 5n), false));
    expect(step.prompt).toBe('3/4 × 2/5 = ?');
    expect(step.check('3/10')).toMatchObject({
      correct: true,
      explanation: '3/4 × 2/5 = 6/20 = 3/10',
    });
    expect(step.check('0,3').correct).toBe(true);
    expect(step.check('6/20').tip).toBe('De waarde klopt, maar vereenvoudig nog: 6/20 = 3/10.');
  });

  it('multiplies only the numerator by a whole number', () => {
    const step = stepOf(multiplyDivideQuestion(fromInteger(6), rational(2n, 3n), false));
    expect(step.prompt).toBe('6 × 2/3 = ?');
    expect(step.check('4')).toMatchObject({
      correct: true,
      expected: '4',
      explanation: '6 × 2/3 = 12/3 = 4',
    });
    expect(step.check('2/3').tip).toBe('Alleen de teller gaat keer 6: 6 × 2/3 = 12/3.');
    const swapped = stepOf(multiplyDivideQuestion(rational(2n, 3n), fromInteger(6), false));
    expect(swapped.check('2/3').tip).toBe('Alleen de teller gaat keer 6: 2/3 × 6 = 12/3.');
  });

  it('divides by multiplying with the inverse, and names both mistakes', () => {
    const step = stepOf(multiplyDivideQuestion(rational(2n, 3n), rational(4n, 9n), true));
    expect(step.prompt).toBe('2/3 : 4/9 = ?');
    expect(step.check('1 1/2')).toMatchObject({
      correct: true,
      explanation: '2/3 : 4/9 = 2/3 × 9/4 = 18/12 = 3/2 = 1 1/2',
    });
    expect(step.check('8/27').tip).toBe('Delen door 4/9 is keer het omgekeerde: × 9/4.');
    expect(step.check('2/3').tip).toBe('Draai de breuk om waardoor je deelt, niet de eerste.');
  });

  it('divides by and into whole numbers', () => {
    const byWhole = stepOf(multiplyDivideQuestion(rational(3n, 4n), fromInteger(3), true));
    expect(byWhole.check('1/4').explanation).toBe('3/4 : 3 = 3/4 × 1/3 = 3/12 = 1/4');
    expect(byWhole.check('9/4').tip).toBe('Delen door 3 is keer 1/3.');
    const intoWhole = stepOf(multiplyDivideQuestion(fromInteger(6), rational(2n, 3n), true));
    expect(intoWhole.check('9').explanation).toBe('6 : 2/3 = 6 × 3/2 = 18/2 = 9');
    expect(intoWhole.check('4').tip).toBe('Delen door 2/3 is keer het omgekeerde: × 3/2.');
    const byHalf = stepOf(multiplyDivideQuestion(fromInteger(6), rational(1n, 2n), true));
    expect(byHalf.check('12').explanation).toBe('6 : 1/2 = 6 × 2 = 12');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/topics/fractionArithmetic.test.ts`
Expected: FAIL, `addSubtractQuestion`, `multiplyDivideQuestion` and `Term` are not exported.

- [ ] **Step 3: Implement**

In `src/lib/topics/fractionArithmetic.ts`, replace the imports with:

```ts
import { formatFraction, formatInteger, formatMixedNumber, MINUS } from '../format';
import { gcd, lcm } from '../primes';
import { drawUntil, pick, randomInt, randomIntWhere, type Rng } from '../random';
import {
  add,
  compare,
  equals,
  fromInteger,
  multiply,
  rational,
  subtract,
  type Rational,
} from '../rational';
import { numberStep, simplestFractionStep } from '../steps';
import type { Diagnose } from '../tips';
import type { Question } from '../types';
```

Replace `ARITHMETIC_FORMS` and `ARITHMETIC_GROUPS` with:

```ts
export const ARITHMETIC_FORMS = [
  'simplify',
  'equivalent',
  'addSubtract',
  'multiplyDivide',
  'part',
  'whole',
] as const;
export type ArithmeticForm = (typeof ARITHMETIC_FORMS)[number];

/** Four equally likely groups; a group with two forms picks one of them (spec §5.21). */
export const ARITHMETIC_GROUPS: readonly (readonly ArithmeticForm[])[] = [
  ['simplify', 'equivalent'],
  ['addSubtract'],
  ['multiplyDivide'],
  ['part', 'whole'],
];
```

Add after `wholeQuestion` (before `function simplify`):

```ts
/** 18/12 → ['18/12', '3/2', '1 1/2']; 12/3 → ['12/3', '4']; 12/1 → ['12']; 3/4 → ['3/4']. */
function simplifySteps(num: bigint, den: bigint): string[] {
  if (den === 1n) return [formatInteger(num)];
  const value = rational(num, den);
  const steps = [terms(num, den)];
  if (value.den === 1n) return [...steps, formatInteger(value.num)];
  if (value.den !== den) steps.push(formatFraction(value));
  if (value.num > value.den) steps.push(formatMixedNumber(value));
  return steps;
}

/** A term of a sum: a proper fraction, written as a mixed number when `whole` > 0. */
export interface Term {
  whole: number;
  fraction: Rational;
}

function termValue({ whole, fraction }: Term): Rational {
  return add(fromInteger(whole), fraction);
}

/** '8/12', or '2 8/12' when there is a whole part. */
function mixedTerms(whole: number, num: bigint, den: bigint): string {
  return whole === 0 ? terms(num, den) : `${formatInteger(whole)} ${terms(num, den)}`;
}

function formatTerm({ whole, fraction }: Term): string {
  return mixedTerms(whole, fraction.num, fraction.den);
}

/**
 * `2/3 + 1/4 = ?` or `3 1/2 − 1 3/4 = ?`. Both terms are mixed numbers or neither is; a
 * subtraction has a positive result.
 */
export function addSubtractQuestion(left: Term, right: Term, subtracting: boolean): Question {
  const a = left.fraction;
  const b = right.fraction;
  const common = BigInt(lcm(Number(a.den), Number(b.den)));
  const numA = (a.num * common) / a.den;
  const numB = (b.num * common) / b.den;
  const answer = subtracting
    ? subtract(termValue(left), termValue(right))
    : add(termValue(left), termValue(right));
  const operator = subtracting ? ` ${MINUS} ` : ' + ';
  const shown = formatTerm(left) + operator + formatTerm(right);
  const rightTerm = mixedTerms(right.whole, numB, common);
  const chain = [shown, mixedTerms(left.whole, numA, common) + operator + rightTerm];
  let wholeA = left.whole;
  let numLeft = numA;
  // Only mixed numbers can need this: without wholes, a subtraction has a > b.
  if (subtracting && numA < numB) {
    wholeA -= 1;
    numLeft += common;
    chain.push(mixedTerms(wholeA, numLeft, common) + operator + rightTerm);
  }
  const resultWhole = subtracting ? wholeA - right.whole : wholeA + right.whole;
  const resultNum = subtracting ? numLeft - numB : numLeft + numB;
  if (resultWhole === 0) {
    chain.push(...simplifySteps(resultNum, common));
  } else {
    const written = mixedTerms(resultWhole, resultNum, common);
    const simplest = formatMixedNumber(answer);
    chain.push(...(written === simplest ? [written] : [written, simplest]));
  }
  const diagnose: Diagnose = (given) => {
    if (left.whole === 0) {
      // Numerators and denominators added (or subtracted) separately: 2/3 + 1/4 → 3/7.
      const num = subtracting ? a.num - b.num : a.num + b.num;
      const den = subtracting ? a.den - b.den : a.den + b.den;
      if (num <= 0n || den <= 0n) return undefined;
      const wrong = rational(num, den);
      const then = subtracting ? 'trek daarna alleen de tellers af' : 'tel daarna alleen de tellers op';
      return !equals(wrong, answer) && equals(given, wrong)
        ? `Maak eerst de noemers gelijk; ${then}.`
        : undefined;
    }
    if (subtracting && compare(a, b) < 0) {
      // The fraction parts subtracted the wrong way round: 3 1/2 − 1 3/4 → 2 1/4.
      const swapped = add(fromInteger(left.whole - right.whole), subtract(b, a));
      if (equals(given, swapped)) {
        return (
          `Je kunt ${formatFraction(b)} niet van ${formatFraction(a)} aftrekken: wissel eerst ` +
          `1 geheel om, ${formatTerm(left)} = ${mixedTerms(left.whole - 1, numA + common, common)}.`
        );
      }
    }
    return undefined;
  };
  return {
    key: `fractionArithmetic:addSubtract:${shown}`,
    topic: 'fractionArithmetic',
    steps: [
      simplestFractionStep({
        prompt: `${shown} = ?`,
        answer,
        decimalAllowed: true,
        explanation: chain.join(' = '),
        diagnose,
      }),
    ],
  };
}

/** `3/4 × 2/5 = ?`, `6 × 2/3 = ?`, `2/3 : 4/9 = ?`, `3/4 : 3 = ?` or `6 : 2/3 = ?`. */
export function multiplyDivideQuestion(x: Rational, y: Rational, dividing: boolean): Question {
  const shown = `${formatMixedNumber(x)} ${dividing ? ':' : '×'} ${formatMixedNumber(y)}`;
  const inverse = rational(y.den, y.num);
  const by = dividing ? inverse : y;
  const answer = multiply(x, by);
  const chain = [
    shown,
    ...(dividing ? [`${formatMixedNumber(x)} × ${formatMixedNumber(inverse)}`] : []),
    ...simplifySteps(x.num * by.num, x.den * by.den),
  ];
  const diagnose: Diagnose = (given) => {
    if (!dividing) {
      // Both terms of the fraction times the whole number: 6 × 2/3 → 12/18 = 2/3.
      const wholeNumber = x.den === 1n ? x : y.den === 1n ? y : null;
      if (wholeNumber === null) return undefined;
      const fraction = wholeNumber === x ? y : x;
      if (!equals(given, fraction)) return undefined;
      const product = terms(wholeNumber.num * fraction.num, fraction.den);
      return `Alleen de teller gaat keer ${formatInteger(wholeNumber.num)}: ${shown} = ${product}.`;
    }
    if (equals(given, multiply(x, y))) {
      return y.den === 1n
        ? `Delen door ${formatInteger(y.num)} is keer 1/${formatInteger(y.num)}.`
        : `Delen door ${formatFraction(y)} is keer het omgekeerde: × ${formatFraction(inverse)}.`;
    }
    if (x.den !== 1n && y.den !== 1n && equals(given, rational(answer.den, answer.num))) {
      return 'Draai de breuk om waardoor je deelt, niet de eerste.';
    }
    return undefined;
  };
  return {
    key: `fractionArithmetic:multiplyDivide:${shown}`,
    topic: 'fractionArithmetic',
    steps: [
      simplestFractionStep({
        prompt: `${shown} = ?`,
        answer,
        decimalAllowed: true,
        explanation: chain.join(' = '),
        diagnose,
      }),
    ],
  };
}
```

Add after `function equivalent` (before `function part`):

```ts
function addSubtract(rng: Rng): Question {
  return drawUntil(() => {
    const a = pick(rng, PROPER_FRACTIONS);
    const b = pick(rng, PROPER_FRACTIONS);
    if (a.den === b.den || lcm(Number(a.den), Number(b.den)) > 36) return null;
    const subtracting = rng() < 0.5;
    if (rng() < 0.3) {
      const first = randomInt(rng, subtracting ? 2 : 1, 5);
      const second = subtracting ? randomInt(rng, 1, first - 1) : randomInt(rng, 1, 5);
      return addSubtractQuestion(
        { whole: first, fraction: a },
        { whole: second, fraction: b },
        subtracting,
      );
    }
    // Separate variables: destructuring an array literal would give `Rational | undefined`.
    const swap = subtracting && compare(a, b) < 0;
    const x = swap ? b : a;
    const y = swap ? a : b;
    return addSubtractQuestion({ whole: 0, fraction: x }, { whole: 0, fraction: y }, subtracting);
  });
}

/** Multiply (50%): two fractions (60%) or a whole number and a fraction (40%, either order).
 * Divide (50%): two different fractions (60%), fraction : whole (20%), whole : fraction (20%). */
function multiplyDivide(rng: Rng): Question {
  const x = pick(rng, PROPER_FRACTIONS);
  const n = fromInteger(randomInt(rng, 2, 12));
  if (rng() < 0.5) {
    if (rng() < 0.6) return multiplyDivideQuestion(x, pick(rng, PROPER_FRACTIONS), false);
    return rng() < 0.5 ? multiplyDivideQuestion(n, x, false) : multiplyDivideQuestion(x, n, false);
  }
  const roll = rng();
  if (roll < 0.6) {
    const y = drawUntil(() => {
      const candidate = pick(rng, PROPER_FRACTIONS);
      return equals(candidate, x) ? null : candidate;
    });
    return multiplyDivideQuestion(x, y, true);
  }
  return roll < 0.8 ? multiplyDivideQuestion(x, n, true) : multiplyDivideQuestion(n, x, true);
}
```

Replace `BUILDERS` with:

```ts
const BUILDERS: Record<ArithmeticForm, (rng: Rng) => Question> = {
  simplify,
  equivalent,
  addSubtract,
  multiplyDivide,
  part,
  whole,
};
```

Notes:
- `formatMixedNumber` of a whole number is just the number, so `6 × 2/3` and `3/4 : 3` need no special case. The inverse of a whole number `3` is `1/3`, of `1/2` it is `2` (`6 : 1/2 = 6 × 2 = 12`).
- Text pitfall (spec §8): `6 × 3/2` and `3/4 × 1/3` are safe because an operator, not a digit, stands before the space in front of the fraction. Keep it that way.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/topics/fractionArithmetic.test.ts` then `npm test` then `npm run check`
Expected: all PASS; check 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

```bash
git diff src/lib/topics/fractionArithmetic.ts src/lib/topics/fractionArithmetic.test.ts
git add src/lib/topics/fractionArithmetic.ts src/lib/topics/fractionArithmetic.test.ts
git commit -m "feat: add, subtract, multiply and divide fractions" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 8: The Breuken & kommagetallen set

**Files:**
- Modify: `src/lib/sets.ts`
- Test: `src/lib/sets.test.ts`, `src/lib/session.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/lib/sets.test.ts`, add `FRACTIONS_SET` to the import list from `'./sets'`. In the roadmap-order test, add `'breuken'` after `'getalbegrip'`:

```ts
  it('offers the implemented sets in roadmap order', () => {
    expect(PRACTICE_SETS.map((set) => set.id)).toEqual([
      'tafels',
      'meten',
      'verhoudingen',
      'getallen',
      'bewerkingen',
      'getalbegrip',
      'breuken',
    ]);
  });
```

Add inside `describe('practice sets', …)`:

```ts
  it('makes Breuken & kommagetallen three equally weighted topics with 15% tables', () => {
    expect(FRACTIONS_SET.name).toBe('Breuken & kommagetallen');
    expect(FRACTIONS_SET.tablesPercent).toBe(15);
    expect(FRACTIONS_SET.topics).toEqual([
      { topic: 'fractionConversion', weight: 1 },
      { topic: 'fractionArithmetic', weight: 1 },
      { topic: 'decimalArithmetic', weight: 1 },
    ]);
  });
```

Add inside `describe('describeSetTopics', …)`:

```ts
  it('describes the Breuken & kommagetallen set', () => {
    expect(describeSetTopics(FRACTIONS_SET)).toEqual([
      'Omzetten tussen breuk, kommagetal en procent',
      'Rekenen met breuken (ook gemengde getallen en deel van een getal)',
      'Rekenen met kommagetallen (0,3 × 0,4, 2,5 : 0,05)',
      '15% tafels',
    ]);
  });
```

In `src/lib/session.test.ts`, add `FRACTIONS_SET` to the import list from `'./sets'`, and add after `describe('buildSession for Getalbegrip', …)`:

```ts
describe('buildSession for Breuken & kommagetallen', () => {
  it('mixes 2 tables with 5 + 4 + 4 exercises at n = 15 (spec §4.2)', () => {
    const questions = buildSession(FRACTIONS_SET, 15, createRng(3));
    const counts = new Map<string, number>();
    for (const { topic } of questions) counts.set(topic, (counts.get(topic) ?? 0) + 1);
    expect(counts.get('tables')).toBe(2);
    const perTopic = FRACTIONS_SET.topics.map(({ topic }) => counts.get(topic) ?? 0);
    expect(perTopic.sort((a, b) => a - b)).toEqual([4, 4, 5]);
  });

  it.each([...SESSION_SIZES])('builds %i unique questions', (size) => {
    const questions = buildSession(FRACTIONS_SET, size, createRng(size));
    expect(questions).toHaveLength(size);
    expect(new Set(questions.map((q) => q.key)).size).toBe(size);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/sets.test.ts src/lib/session.test.ts`
Expected: FAIL, `FRACTIONS_SET` is undefined.

- [ ] **Step 3: Implement**

In `src/lib/sets.ts`, add after `NUMBER_SENSE_SET`:

```ts
export const FRACTIONS_SET: PracticeSet = {
  id: 'breuken',
  name: 'Breuken & kommagetallen',
  description: 'Omzetten, rekenen met breuken en met kommagetallen',
  topics: [
    { topic: 'fractionConversion', weight: 1 },
    { topic: 'fractionArithmetic', weight: 1 },
    { topic: 'decimalArithmetic', weight: 1 },
  ],
  tablesPercent: 15,
};
```

and append `FRACTIONS_SET,` as the last entry of `PRACTICE_SETS`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test` then `npm run check`
Expected: all PASS; check 0 errors, 0 warnings. (No component test counts the set cards; if one does, add the new card to its expectation.)

- [ ] **Step 5: Commit**

```bash
git diff src/lib/sets.ts src/lib/sets.test.ts src/lib/session.test.ts
git add src/lib/sets.ts src/lib/sets.test.ts src/lib/session.test.ts
git commit -m "feat: Breuken & kommagetallen practice set" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 9: Docs and final verification

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Full verification**

Run, in this order:

```bash
npm test
npm run check
npm run build
grep -c "manifest.webmanifest" dist/sw.js
```

Expected: all tests PASS; check 0 errors and 0 warnings; the build succeeds; the grep prints `1` (exactly one manifest entry in the precache, see CLAUDE.md "PWA pitfalls").

- [ ] **Step 2: Update CLAUDE.md**

In the **Status** paragraph, change the end of the first sentence from:

```
**Bewerkingen** (plan: `docs/superpowers/plans/2026-10-06-bewerkingen.md`) and **Getalbegrip**
(plan: `docs/superpowers/plans/2026-10-07-getalbegrip.md`).
```

to:

```
**Bewerkingen** (plan: `docs/superpowers/plans/2026-10-06-bewerkingen.md`), **Getalbegrip**
(plan: `docs/superpowers/plans/2026-10-07-getalbegrip.md`) and **Breuken & kommagetallen**
(plan: `docs/superpowers/plans/2026-10-07-breuken-kommagetallen.md`).
```

In the roadmap table, set the Status column of row 6 (**Breuken & kommagetallen**) from `next` to `✅ done`, and the Status column of row 7 (**Verhoudingen** (v2 part)) from `later` to `next`. In row 6, change the infrastructure column to:

```
Simplest-form judging of fraction answers (`simplestFractionStep`); mixed numbers as expected answers; `?` as a stacked fraction slot (spec §5.20–§5.22, §6)
```

In **Architecture**, change the `steps.ts` and `fractionText.ts` lines to:

```
    steps.ts            step factories (number, fraction, simplest fraction, boolean,
                        factorization, rewrite, scientific), parseAnswer, parseFractionAnswer,
                        parseFactorization and parseScientific — all answer parsing and checking
                        goes through here
```

```
    fractionText.ts     splits text into plain runs and (mixed) fractions for stacked display;
                        `?` can stand for a numerator or denominator
```

Under **Known follow-ups for the next plans**, add:

```
- Manual phone check for Breuken & kommagetallen: explanations with several stacked fractions
  (`3 1/2 − 1 3/4 = 3 2/4 − 1 3/4 = …`) plus a tip must keep **Verder** on screen, and the
  `?` slot in `3/4 = ?/12` must read well.
```

- [ ] **Step 3: Commit**

```bash
git diff CLAUDE.md
git add CLAUDE.md
git commit -m "docs: mark Breuken & kommagetallen as done" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
