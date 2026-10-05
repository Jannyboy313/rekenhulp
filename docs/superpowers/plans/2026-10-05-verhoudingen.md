# Verhoudingen (v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the **Verhoudingen** practice set with the v1 topics `percentages` (spec §5.12) and `ratios` (spec §5.13). As in every set except Tafels, 15% of the exercises are tables.

**Architecture:**

- Two generator modules: `src/lib/topics/percentages.ts` and `src/lib/topics/ratios.ts`. Both follow the existing pattern: a pure `(rng) => Question`, exact arithmetic through `rational.ts`, and every answer checked by a step factory in `steps.ts`.
- Percentages are `Rational`s, so `12½` is exactly `25/2`. Every percentage has a fixed *base* percentage (1%, 5%, 10%, 12½%, 25% or 50%) that the explanations go through.
- Two small infrastructure additions:
  - `Step.prefix` for the euro sign (`€ 45`), next to the existing `Step.suffix`.
  - The `fraction` answer kind, brought forward from v2. It is the number keypad plus a `/` key, and it accepts `25/2` as well as `12,5`. The "what percentage" form uses it, so `12½` can be answered as a fraction.
- `QuestionView` picks the parser by `step.kind` through one shared `parseAnswer`. The keypad shows `/` only for `fraction` steps. This is a first step toward the per-kind input model in the CLAUDE.md follow-ups, not the full model.

**Tech Stack:** Svelte 5, TypeScript (strict, `noUncheckedIndexedAccess`), Vitest + @testing-library/svelte. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-05-rekenhulp-design.md`. Read §4.1, §4.2, §5.12, §5.13, §6, §8 and §11.12 before starting.

---

## Scope

**In scope:**

| Spec section | What is built |
|---|---|
| §4.1 | The Verhoudingen set: `percentages` and `ratios` with weight 1, and 15% tables |
| §4.2 | Quota example for Verhoudingen: 2 tables + 7 + 6 at `n = 15` (no algorithm change) |
| §5.12 | `percentages`: part of a whole, what percentage, discount / increase, back to 100% |
| §5.13 | `ratios`: missing term, scaling, dividing in ratio |
| §6 | `€` as input prefix; the `fraction` input (`/` key) |
| §8 | Money formatting (`€ 25,50`), `12½%` |

**Not in scope:**

- the v2 topics `fractionConversion` and `fractionArithmetic`, and the per-exercise judging of simplified versus unsimplified fractions (v2)
- the answer kinds `boolean`, `expression` and `factorization`
- the full per-kind input model, and the "invalid input does not consume the attempt" path (CLAUDE.md follow-up, plan #3)
- mixed-number input such as `12 1/2`

**Decisions settled with the user on 2026-10-05 (spec §11.12):**

- `€` is an input prefix. A money answer that is not whole is shown with 2 decimals (`25,50`).
- `12½` is written with the fraction glyph in prompts. As an answer, `25/2` and `12,5` are both correct. This brings the `fraction` input forward from v2.
- Discount uses `p < 100` and increase uses `p ≤ 50`.
- The unknown term of `a : b = c : d` can be in any of the four positions.

## Prerequisites & command permissions

- Pre-approved in this repo: `npm install`, `npm test`, `npm run check`, `npm run build`, `git add`, `git commit`.
- **Not pre-approved:** `npm run dev` and `npm run preview`. They are only for the user's manual check.
- **Never** use `npx` or `node`.
- Every commit message ends with the trailer `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. The commands below pass it via a second `-m`.
- `npm run check` must stay at 0 errors and 0 warnings after **every** task. This is why `Topic` is widened in the same task that registers a new generator.
- If a commit fails because signing via 1Password is locked, stop and ask the user to unlock it. Never bypass signing.

## Domain notes for the implementer

- **Percentages are exact.** `12½` is `rational(25n, 2n)`, never the float `12.5`. "p% of W" is `p × W / 100` through `percentOf`.
- **The base of a percentage** is the known percentage that the explanation goes through. `100 / base` and `p / base` are always whole numbers:

  | Base | Used for |
  |---|---|
  | 1% | 1, 2 |
  | 5% | 5, 15 (part of a whole goes via 10% and halving instead, see Task 6) |
  | 10% | 10, 20, 30, 40, 60, 80, 90, 120 |
  | 12½% | 12½ |
  | 25% | 25, 75 |
  | 50% | 50, 150 |

- **"Nice" wholes** are the integers in `[10, 1000]` with at most 2 significant digits: `10…99`, `100, 110, …, 990` and `1000`. That gives 181 values. They are used for the 100% amount, for prices and for the amounts in scaling exercises.
- **Integer share.** For part of a whole and for discount / increase, 80% of the answers are integers. For back to 100% the answer is always an integer, and the 80% applies to the given part instead. The generators pick a candidate group first (integer with probability 0.8, otherwise non-integer) and fall back to all candidates if that group is empty. For every percentage both groups are non-empty; the tests verify the share.
- **Money:** `formatEuro` writes `€`, a no-break space (U+00A0) and `formatMoney(value)`. `formatMoney` gives `45`, or `25,50` with exactly 2 decimals. `parseDutchNumber` accepts `25,5` and `25,50`, so the user may type either. In source code, write the no-break space as a Unicode escape (a backslash followed by `u00a0`), not as the invisible literal character that the code blocks below contain (`' '`). This applies to `NO_BREAK_SPACE` and its test.
- **Fraction input:** `parseFraction` accepts `a/b` with an optional leading minus, and rejects `b = 0`. `parseAnswer('fraction', …)` tries a fraction first and a decimal second. Any equal value is correct (`50/4` = `25/2`).
- `formatRational` groups digits with U+202F from 5 digits onwards. Every answer in this set stays below 10 000, so the tests can feed `expected` straight back into `check`. A fraction step's `expected` reads `12,5 of 25/2`, so its tests type only the part before ` of `.
- Never compare floats. Integer-only helpers in `ratios.ts` use plain `number`s, because every value there is a small integer and every division is exact by construction.

## File structure

```
src/lib/
  rational.ts (+ .test.ts)          + add, subtract, parseFraction
  format.ts (+ .test.ts)            + NO_BREAK_SPACE, formatMoney, formatEuro, formatFraction
  types.ts                          AnswerKind + 'fraction'; Step.prefix; Topic + percentages, ratios
  steps.ts (+ .test.ts)             + parseAnswer, fractionStep; prefix and expected options
  keypadInput.ts (+ .test.ts)       + '/' key
  sets.ts (+ .test.ts)              + PROPORTIONS_SET, appended to PRACTICE_SETS
  session.test.ts                   Verhoudingen quotas
  topics/
    percentages.ts (+ .test.ts)     percentages, bases, nice wholes, explanations, generator
    ratios.ts (+ .test.ts)          missing term, scaling, dividing in ratio
    index.ts                        registers both generators and their labels
src/components/
  Keypad.svelte                     kind prop; '/' key for fraction steps
  QuestionView.svelte (+ .test.ts)  prefix; parser picked by step kind
src/App.test.ts                     Verhoudingen reachable from the overview
CLAUDE.md                           status, roadmap row, follow-ups
```

---

### Task 1: Exact addition, subtraction and fraction parsing (`lib/rational.ts`)

Discount and increase need `100 − p` and `100 + p` for `p = 12½`, so `rational.ts` gets `add` and `subtract`. The `fraction` input needs `parseFraction`.

**Files:**
- Modify: `src/lib/rational.ts`
- Test: `src/lib/rational.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/lib/rational.test.ts`, replace the import block from `./rational` with

```ts
import {
  add,
  compare,
  decimalPlaces,
  divide,
  equals,
  fromInteger,
  multiply,
  parseDutchNumber,
  parseFraction,
  powerOfTen,
  rational,
  subtract,
} from './rational';
```

and append:

```ts
describe('add and subtract', () => {
  it('adds exactly and normalises', () => {
    expect(add(rational(1n, 2n), rational(1n, 3n))).toEqual(rational(5n, 6n));
    expect(add(fromInteger(100), rational(25n, 2n))).toEqual(rational(225n, 2n));
  });

  it('subtracts exactly and normalises', () => {
    expect(subtract(fromInteger(100), rational(25n, 2n))).toEqual(rational(175n, 2n));
    expect(subtract(rational(1n, 4n), rational(1n, 4n))).toEqual(rational(0n));
    expect(subtract(rational(1n, 4n), rational(1n, 2n))).toEqual(rational(-1n, 4n));
  });
});

describe('parseFraction', () => {
  it.each([
    ['25/2', rational(25n, 2n)],
    ['50/4', rational(25n, 2n)],
    ['-3/4', rational(-3n, 4n)],
    ['−3/4', rational(-3n, 4n)],
    [' 7/1 ', rational(7n)],
    ['0/5', rational(0n)],
  ])('parses %j', (input, expected) => {
    expect(parseFraction(input)).toEqual(expected);
  });

  it.each(['', '25', '12,5', '25/', '/2', '1/0', '1,5/2', '1/2/3', '2/-3', '1 1/2'])(
    'rejects %j',
    (input) => {
      expect(parseFraction(input)).toBeNull();
    },
  );
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/rational.test.ts`
Expected: FAIL, with `add is not a function` (and the same for `subtract` and `parseFraction`).

- [ ] **Step 3: Write the implementation**

Append to `src/lib/rational.ts`:

```ts
export function add(a: Rational, b: Rational): Rational {
  return rational(a.num * b.den + b.num * a.den, a.den * b.den);
}

export function subtract(a: Rational, b: Rational): Rational {
  return rational(a.num * b.den - b.num * a.den, a.den * b.den);
}

// Optional ASCII or typographic minus, then numerator/denominator.
const FRACTION = /^([-−])?(\d+)\/(\d+)$/;

/** Parses a fraction such as "25/2" or "−3/4". Returns null for anything else, incl. "1/0". */
export function parseFraction(input: string): Rational | null {
  const match = FRACTION.exec(input.trim());
  if (!match) return null;
  const [, sign, numerator = '', denominator = ''] = match;
  const den = BigInt(denominator);
  if (den === 0n) return null;
  const num = BigInt(numerator);
  return rational(sign ? -num : num, den);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/rational.test.ts`
Expected: PASS.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rational.ts src/lib/rational.test.ts
git commit -m "feat: add exact add, subtract and fraction parsing" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Money and fraction formatting (`lib/format.ts`)

Spec §8: money is `€`, a no-break space and the amount; whole euros have no decimals, other amounts have 2. A fraction answer is shown as `25/2`.

**Files:**
- Modify: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/lib/format.test.ts`, replace the import block from `./format` with

```ts
import {
  formatDuration,
  formatEuro,
  formatFraction,
  formatInput,
  formatInteger,
  formatMoney,
  formatPowerOfTen,
  formatRational,
  formatSeconds,
  GROUP_SEPARATOR as S,
  MINUS,
  NO_BREAK_SPACE,
  toSuperscript,
} from './format';
```

and append:

```ts
describe('formatMoney', () => {
  it.each([
    [rational(45n), '45'],
    [rational(51n, 2n), '25,50'],
    [rational(1157n, 100n), '11,57'],
    [rational(2000n), '2000'],
    [rational(15_000n), `15${S}000`],
  ])('formats %o as %s', (value, expected) => {
    expect(formatMoney(value)).toBe(expected);
  });

  it('rejects fractions of a cent', () => {
    expect(() => formatMoney(rational(1n, 8n))).toThrow(RangeError);
    expect(() => formatMoney(rational(1n, 3n))).toThrow(RangeError);
  });
});

describe('formatEuro', () => {
  it('puts the euro sign and a no-break space before the amount', () => {
    expect(NO_BREAK_SPACE).toBe(' ');
    expect(formatEuro(rational(51n, 2n))).toBe(`€${NO_BREAK_SPACE}25,50`);
    expect(formatEuro(rational(60n))).toBe(`€${NO_BREAK_SPACE}60`);
  });
});

describe('formatFraction', () => {
  it('writes numerator and denominator with a slash', () => {
    expect(formatFraction(rational(25n, 2n))).toBe('25/2');
    expect(formatFraction(rational(-3n, 4n))).toBe(`${MINUS}3/4`);
    expect(formatFraction(rational(7n))).toBe('7/1');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/format.test.ts`
Expected: FAIL, with `formatMoney is not a function`.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/format.ts`:

```ts
/** No-break space (U+00A0): keeps '€' and the amount on one line. */
export const NO_BREAK_SPACE = ' ';

/** Euro amounts: whole euros without decimals, otherwise exactly two ('25,50'). Spec §8. */
export function formatMoney(value: Rational): string {
  const decimals = decimalPlaces(value);
  if (decimals === null || decimals > 2) throw new RangeError('Not a whole number of cents');
  const text = formatRational(value);
  return decimals === 1 ? `${text}0` : text;
}

/** '€ 25,50' with a no-break space. */
export function formatEuro(value: Rational): string {
  return `€${NO_BREAK_SPACE}${formatMoney(value)}`;
}

/** '25/2'. The sign goes on the numerator, because the denominator is always positive. */
export function formatFraction(value: Rational): string {
  return `${formatInteger(value.num)}/${formatInteger(value.den)}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/format.test.ts`
Expected: PASS.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: add money and fraction formatting" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: The `fraction` answer kind and `Step.prefix` (`lib/steps.ts`)

- `parseAnswer(kind, input)` becomes the single place that turns keypad input into a value. Both `check` and `QuestionView` (Task 5) use it.
- `numberStep` gets two options: `prefix` (for `€`) and `expected` (to show money as `25,50`).
- `fractionStep` is `numberStep` with kind `fraction`. Its `expected` shows both notations: `12,5 of 25/2`.

**Files:**
- Modify: `src/lib/types.ts`, `src/lib/steps.ts`
- Test: `src/lib/steps.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/lib/steps.test.ts`, replace

```ts
import { numberStep } from './steps';
```

with

```ts
import { fractionStep, numberStep, parseAnswer } from './steps';
```

and append:

```ts
describe('numberStep options', () => {
  it('passes a prefix and shows a custom expected answer', () => {
    const money = numberStep({
      prompt: '€ 30 na 15% korting = ?',
      answer: rational(51n, 2n),
      prefix: '€',
      expected: '25,50',
    });
    expect(money.prefix).toBe('€');
    expect(money.check('25,5')).toEqual({ correct: true, expected: '25,50' });
    expect(money.check('25,50').correct).toBe(true);
    expect(money.check('25').expected).toBe('25,50');
  });

  it('has no prefix by default', () => {
    expect(numberStep({ prompt: '1 + 1', answer: fromInteger(2) }).prefix).toBeUndefined();
  });

  it('does not accept a fraction', () => {
    const half = numberStep({ prompt: '25 : 2 = ?', answer: rational(25n, 2n) });
    expect(half.check('25/2').correct).toBe(false);
  });
});

describe('parseAnswer', () => {
  it('parses only decimals for number steps', () => {
    expect(parseAnswer('number', '12,5')).toEqual(rational(25n, 2n));
    expect(parseAnswer('number', '25/2')).toBeNull();
  });

  it('parses fractions and decimals for fraction steps', () => {
    expect(parseAnswer('fraction', '25/2')).toEqual(rational(25n, 2n));
    expect(parseAnswer('fraction', '12,5')).toEqual(rational(25n, 2n));
    expect(parseAnswer('fraction', '25/')).toBeNull();
    expect(parseAnswer('fraction', '')).toBeNull();
  });
});

describe('fractionStep', () => {
  const percent = fractionStep({
    prompt: '10 is ?% van 80',
    answer: rational(25n, 2n),
    suffix: '%',
    explanation: '12½% = 80 : 8 = 10',
  });

  it('is a fraction step with its suffix', () => {
    expect(percent.kind).toBe('fraction');
    expect(percent.suffix).toBe('%');
  });

  it('accepts every equal fraction and the decimal', () => {
    for (const input of ['25/2', '50/4', '12,5', '12,50']) {
      expect(percent.check(input).correct).toBe(true);
    }
    expect(percent.check('12').correct).toBe(false);
    expect(percent.check('1/0').correct).toBe(false);
  });

  it('shows both notations as the expected answer', () => {
    expect(percent.check('12')).toEqual({
      correct: false,
      expected: '12,5 of 25/2',
      explanation: '12½% = 80 : 8 = 10',
    });
  });

  it('shows a whole answer once and accepts it as a fraction', () => {
    const whole = fractionStep({ prompt: '30 is ?% van 120', answer: fromInteger(25), suffix: '%' });
    expect(whole.check('50/2')).toEqual({ correct: true, expected: '25' });
  });

  it('shows only the fraction when there is no finite decimal', () => {
    const third = fractionStep({ prompt: '1 : 3 = ?', answer: rational(1n, 3n) });
    expect(third.check('1/3')).toEqual({ correct: true, expected: '1/3' });
  });
});
```

`toEqual` ignores properties whose value is `undefined`, so `{ correct, expected }` matches a result whose `explanation` is `undefined`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/steps.test.ts`
Expected: FAIL, with `fractionStep is not a function` / `parseAnswer is not a function`.

- [ ] **Step 3: Widen `AnswerKind` and add `Step.prefix`**

In `src/lib/types.ts`, replace

```ts
/** Beta: numeric answers only. Later plans add 'boolean' | 'expression' | 'factorization'. */
export type AnswerKind = 'number';
```

with

```ts
/** Later plans add 'boolean' | 'expression' | 'factorization' (spec §6). */
export type AnswerKind = 'number' | 'fraction';
```

and in `interface Step`, replace

```ts
  prompt: string;
  /** Fixed unit shown next to the input, e.g. 'cm³'. */
  suffix?: string;
```

with

```ts
  prompt: string;
  /** Fixed unit shown before the input: '€'. */
  prefix?: string;
  /** Fixed unit shown after the input, e.g. 'cm³' or '%'. */
  suffix?: string;
```

- [ ] **Step 4: Write the implementation**

Replace `src/lib/steps.ts` with:

```ts
import { formatFraction, formatRational } from './format';
import { decimalPlaces, equals, parseDutchNumber, parseFraction, type Rational } from './rational';
import type { AnswerKind, Step } from './types';

export interface NumberStepOptions {
  prompt: string;
  answer: Rational;
  prefix?: string;
  suffix?: string;
  /** Overrides the shown correct answer, e.g. '25,50' for money. */
  expected?: string;
  explanation?: string;
}

/** Turns keypad input into a value. A fraction step also accepts 'a/b' (spec §6). */
export function parseAnswer(kind: AnswerKind, input: string): Rational | null {
  return kind === 'fraction'
    ? (parseFraction(input) ?? parseDutchNumber(input))
    : parseDutchNumber(input);
}

export function numberStep(options: NumberStepOptions): Step {
  return exactStep('number', options, options.expected ?? formatRational(options.answer));
}

/** Any value equal to the answer is correct: '25/2', '50/4' and '12,5' alike. */
export function fractionStep(options: NumberStepOptions): Step {
  return exactStep('fraction', options, options.expected ?? formatFractionAnswer(options.answer));
}

/** '25', or both notations: '12,5 of 25/2'. Only the fraction when the decimal never ends. */
function formatFractionAnswer(answer: Rational): string {
  if (answer.den === 1n) return formatRational(answer);
  const fraction = formatFraction(answer);
  return decimalPlaces(answer) === null ? fraction : `${formatRational(answer)} of ${fraction}`;
}

function exactStep(
  kind: AnswerKind,
  { prompt, answer, prefix, suffix, explanation }: NumberStepOptions,
  expected: string,
): Step {
  return {
    kind,
    prompt,
    prefix,
    suffix,
    check(input) {
      const given = parseAnswer(kind, input);
      return { correct: given !== null && equals(given, answer), expected, explanation };
    },
  };
}
```

- [ ] **Step 5: Run the tests and the type check**

Run: `npm test`
Expected: PASS. The existing `numberStep` tests still pass unchanged.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/steps.ts src/lib/steps.test.ts
git commit -m "feat: add fraction answer kind and input prefix" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: The `/` key in the input reducer (`lib/keypadInput.ts`)

The reducer stays kind-agnostic. Only fraction steps show the `/` key (Task 5), so number steps never receive it. The rules (spec §6):

- `/` is allowed once, and only directly after a digit.
- `/` and `,` never appear together.
- `/` counts toward `MAX_INPUT_LENGTH`.

**Files:**
- Modify: `src/lib/keypadInput.ts`
- Test: `src/lib/keypadInput.test.ts`

- [ ] **Step 1: Write the failing tests**

Append inside `describe('applyKey', …)` in `src/lib/keypadInput.test.ts`:

```ts
  it('allows a single fraction slash directly after a digit', () => {
    expect(type(['2', '5', '/', '2'])).toBe('25/2');
    expect(type(['2', '/', '/'])).toBe('2/');
    expect(type(['/'])).toBe('');
    expect(type(['-', '/'])).toBe('-');
    expect(type(['-', '3', '/', '4'])).toBe('-3/4');
  });

  it('does not mix the slash and the decimal comma', () => {
    expect(type(['1', ',', '5', '/'])).toBe('1,5');
    expect(type(['1', '/', '2', ','])).toBe('1/2');
  });

  it('counts the slash toward the length limit', () => {
    const full = '9'.repeat(MAX_INPUT_LENGTH);
    expect(applyKey(full, '/')).toBe(full);
    const almost = '9'.repeat(MAX_INPUT_LENGTH - 1);
    expect(applyKey(almost, '/')).toBe(`${almost}/`);
    expect(applyKey(`${almost}/`, '1')).toBe(`${almost}/`);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/keypadInput.test.ts`
Expected: FAIL. TypeScript-wise `'/'` is not a `KeypadKey` yet, and at runtime `'/'` falls into the digit branch and gets appended.

- [ ] **Step 3: Write the implementation**

Replace `src/lib/keypadInput.ts` with:

```ts
export type DigitKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
export type KeypadKey = DigitKey | ',' | '-' | '/' | 'backspace';

/** Maximum number of digits, comma and slash; the sign is not counted. */
export const MAX_INPUT_LENGTH = 12;

export function applyKey(value: string, key: KeypadKey): string {
  const length = value.replace('-', '').length;
  const full = length >= MAX_INPUT_LENGTH;
  switch (key) {
    case 'backspace':
      return value.slice(0, -1);
    case '-':
      return value.startsWith('-') ? value.slice(1) : `-${value}`;
    case ',':
      return value.includes(',') || value.includes('/') || full ? value : `${value},`;
    case '/':
      // A fraction is digits/digits: one slash, after a digit, never with a comma (spec §6).
      return value.includes('/') || value.includes(',') || !/\d$/.test(value) || full
        ? value
        : `${value}/`;
    default:
      return full ? value : value + key;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/keypadInput.test.ts`
Expected: PASS.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/keypadInput.ts src/lib/keypadInput.test.ts
git commit -m "feat: add fraction slash to keypad input" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Prefix and fraction keypad in the UI

- `QuestionView` shows `step.prefix` before the input, and decides whether `OK` is enabled through `parseAnswer(step.kind, value)`.
- `Keypad` gets a `kind` prop. For `fraction` the bottom row becomes `⌫ / OK`; for `number` it stays `⌫ OK` with the wide `OK`.

**Files:**
- Modify: `src/components/Keypad.svelte`, `src/components/QuestionView.svelte`
- Test: `src/components/QuestionView.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/components/QuestionView.test.ts`, replace

```ts
import { fromInteger } from '../lib/rational';
import { numberStep } from '../lib/steps';
```

with

```ts
import { fromInteger, rational } from '../lib/rational';
import { fractionStep, numberStep } from '../lib/steps';
```

and add inside `describe('QuestionView', …)`:

```ts
  it('shows the euro prefix before the answer', () => {
    const money = numberStep({
      prompt: '€ 60 na 25% korting = ?',
      answer: fromInteger(45),
      prefix: '€',
    });
    render(QuestionView, { props: { step: money, onanswer: vi.fn() } });
    expect(answerText()).toBe('€?');
  });

  it('offers the fraction slash only for fraction steps', () => {
    render(QuestionView, { props: { step, onanswer: vi.fn() } });
    expect(screen.queryByRole('button', { name: 'breukstreep' })).toBeNull();
  });

  it('accepts a typed fraction for a fraction step', async () => {
    const onanswer = vi.fn();
    const percent = fractionStep({
      prompt: '10 is ?% van 80',
      answer: rational(25n, 2n),
      suffix: '%',
    });
    render(QuestionView, { props: { step: percent, onanswer } });
    for (const name of ['2', '5', 'breukstreep']) {
      await fireEvent.click(screen.getByRole('button', { name }));
    }
    expect(answerText()).toBe('25/%');
    expect(okButton().disabled).toBe(true);

    await fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(answerText()).toBe('25/2%');
    expect(okButton().disabled).toBe(false);
    await fireEvent.click(okButton());
    expect(onanswer).toHaveBeenCalledWith(
      '25/2',
      expect.objectContaining({ correct: true, expected: '12,5 of 25/2' }),
    );
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/components/QuestionView.test.ts`
Expected: FAIL. The prefix is not rendered and there is no `breukstreep` button.

- [ ] **Step 3: Add the `kind` prop and the `/` key to the keypad**

Replace `src/components/Keypad.svelte` with:

```svelte
<script lang="ts">
  import type { KeypadKey } from '../lib/keypadInput';
  import type { AnswerKind } from '../lib/types';

  interface Props {
    kind: AnswerKind;
    canSubmit: boolean;
    onkey: (key: KeypadKey) => void;
    onsubmit: () => void;
  }

  let { kind, canSubmit, onkey, onsubmit }: Props = $props();

  const KEYS: { key: KeypadKey; label: string; ariaLabel?: string }[] = [
    { key: '7', label: '7' },
    { key: '8', label: '8' },
    { key: '9', label: '9' },
    { key: '4', label: '4' },
    { key: '5', label: '5' },
    { key: '6', label: '6' },
    { key: '1', label: '1' },
    { key: '2', label: '2' },
    { key: '3', label: '3' },
    { key: '-', label: '−', ariaLabel: 'min' },
    { key: '0', label: '0' },
    { key: ',', label: ',', ariaLabel: 'komma' },
  ];
</script>

<div class="keypad">
  {#each KEYS as { key, label, ariaLabel } (key)}
    <button type="button" class="key" aria-label={ariaLabel ?? label} onclick={() => onkey(key)}>
      {label}
    </button>
  {/each}
  <button type="button" class="key" aria-label="wissen" onclick={() => onkey('backspace')}>⌫</button>
  {#if kind === 'fraction'}
    <button type="button" class="key" aria-label="breukstreep" onclick={() => onkey('/')}>/</button>
  {/if}
  <button
    type="button"
    class="key ok"
    class:wide={kind !== 'fraction'}
    disabled={!canSubmit}
    onclick={onsubmit}>OK</button
  >
</div>

<style>
  .keypad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .key {
    min-height: 3.5rem;
    font-size: 1.5rem;
    background: var(--key);
  }

  .key:active:not(:disabled) {
    background: var(--key-active);
  }

  .ok {
    background: var(--primary);
    color: var(--primary-text);
    font-weight: 600;
  }

  .wide {
    grid-column: span 2;
  }
</style>
```

- [ ] **Step 4: Show the prefix and pick the parser by kind**

In `src/components/QuestionView.svelte`, replace

```ts
  import { parseDutchNumber } from '../lib/rational';
```

with

```ts
  import { parseAnswer } from '../lib/steps';
```

replace

```ts
  const canSubmit = $derived(parseDutchNumber(value) !== null);
```

with

```ts
  const canSubmit = $derived(parseAnswer(step.kind, value) !== null);
```

replace the whole `<output …>…</output>` element and the `<Keypad …/>` line with

```svelte
  <output class="answer" aria-label="Jouw antwoord" aria-live="off"
    >{#if step.prefix}<span class="prefix">{step.prefix}</span>{/if}{value === ''
      ? '?'
      : formatInput(value)}{#if step.suffix}<span class="suffix">{step.suffix}</span>{/if}</output
  >
  <Keypad kind={step.kind} {canSubmit} onkey={handleKey} onsubmit={submit} />
```

There must be no whitespace between the spans and the value: `answerText()` in the tests reads `€?` and `25/2%`.

Then add below the `.suffix` rule in `<style>`:

```css
  .prefix {
    margin-right: 0.5rem;
    color: var(--muted);
  }
```

- [ ] **Step 5: Run the tests and the type check**

Run: `npm test`
Expected: PASS, including the existing `QuestionView`, `PlayScreen` and `App` tests.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add src/components/Keypad.svelte src/components/QuestionView.svelte src/components/QuestionView.test.ts
git commit -m "feat: show input prefix and fraction keypad" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Percentage building blocks (`lib/topics/percentages.ts`)

This task builds the data and the explanation helpers only. It registers no topic yet, so `Topic` stays as it is.

The explanations work like this (spec §5.12):

- **Part of a whole:** `base% = whole : (100 / base) = value`, then, if `p ≠ base`, `p% = (p / base) × value`. 5% and 15% go via 10% and halving instead: `10% = 8, 5% = 4 → 15% = 12`.
- **Back to 100%:** `p% = part`, then, if `p ≠ base`, `base% = …`, then `100% = (100 / base) × base value`.
- `partExplanation` takes a formatter, so the discount explanation can show money (`1,50`).

**Files:**
- Create: `src/lib/topics/percentages.ts`
- Test: `src/lib/topics/percentages.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/topics/percentages.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatMoney } from '../format';
import { divide, fromInteger, rational } from '../rational';
import {
  DISCOUNT_PERCENTAGES,
  formatPercentage,
  INCREASE_PERCENTAGES,
  NICE_WHOLES,
  partExplanation,
  PERCENTAGES,
  percentOf,
  wholeExplanation,
  type Percentage,
} from './percentages';

function percentage(label: string): Percentage {
  const found = PERCENTAGES.find((p) => formatPercentage(p.value) === label);
  if (!found) throw new Error(`Unknown percentage ${label}`);
  return found;
}

function labels(percentages: readonly Percentage[]): string[] {
  return percentages.map((p) => formatPercentage(p.value));
}

describe('PERCENTAGES', () => {
  it('lists the percentages from the spec', () => {
    expect(labels(PERCENTAGES)).toEqual([
      '1', '2', '5', '10', '12½', '15', '20', '25', '30', '40', '50', '60', '75', '80', '90',
      '120', '150',
    ]);
  });

  it('has a base that divides both 100 and the percentage', () => {
    for (const { value, base } of PERCENTAGES) {
      expect(divide(fromInteger(100), base).den).toBe(1n);
      expect(divide(value, base).den).toBe(1n);
    }
  });

  it('limits discounts to below 100% and increases to at most 50%', () => {
    expect(labels(DISCOUNT_PERCENTAGES)).toEqual([
      '1', '2', '5', '10', '12½', '15', '20', '25', '30', '40', '50', '60', '75', '80', '90',
    ]);
    expect(labels(INCREASE_PERCENTAGES)).toEqual([
      '1', '2', '5', '10', '12½', '15', '20', '25', '30', '40', '50',
    ]);
  });
});

describe('formatPercentage', () => {
  it('writes whole percentages as integers and halves with ½', () => {
    expect(formatPercentage(fromInteger(15))).toBe('15');
    expect(formatPercentage(rational(25n, 2n))).toBe('12½');
  });

  it('rejects other fractions', () => {
    expect(() => formatPercentage(rational(1n, 3n))).toThrow(RangeError);
  });
});

describe('NICE_WHOLES', () => {
  it('has the integers in [10, 1000] with at most 2 significant digits', () => {
    expect(NICE_WHOLES).toHaveLength(181);
    expect(NICE_WHOLES[0]).toBe(10);
    expect(NICE_WHOLES.at(-1)).toBe(1000);
    for (const whole of [85, 99, 100, 470, 990]) expect(NICE_WHOLES).toContain(whole);
    for (const whole of [9, 105, 487, 999, 1010]) expect(NICE_WHOLES).not.toContain(whole);
  });
});

describe('percentOf', () => {
  it('computes p% of a whole exactly', () => {
    expect(percentOf(rational(25n, 2n), fromInteger(80))).toEqual(rational(10n));
    expect(percentOf(fromInteger(15), fromInteger(30))).toEqual(rational(9n, 2n));
    expect(percentOf(fromInteger(150), fromInteger(80))).toEqual(rational(120n));
  });
});

describe('partExplanation', () => {
  it.each([
    ['15', 80, '10% = 8, 5% = 4 → 15% = 12'],
    ['5', 80, '10% = 8 → 5% = 4'],
    ['10', 80, '10% = 80 : 10 = 8'],
    ['30', 80, '10% = 80 : 10 = 8 → 30% = 3 × 8 = 24'],
    ['25', 80, '25% = 80 : 4 = 20'],
    ['75', 80, '25% = 80 : 4 = 20 → 75% = 3 × 20 = 60'],
    ['12½', 80, '12½% = 80 : 8 = 10'],
    ['1', 500, '1% = 500 : 100 = 5'],
    ['2', 500, '1% = 500 : 100 = 5 → 2% = 2 × 5 = 10'],
    ['120', 80, '10% = 80 : 10 = 8 → 120% = 12 × 8 = 96'],
    ['150', 80, '50% = 80 : 2 = 40 → 150% = 3 × 40 = 120'],
  ])('explains %s%% of %i', (label, whole, expected) => {
    expect(partExplanation(percentage(label), fromInteger(whole))).toBe(expected);
  });

  it('uses the given formatter, e.g. for money', () => {
    expect(partExplanation(percentage('15'), fromInteger(30), formatMoney)).toBe(
      '10% = 3, 5% = 1,50 → 15% = 4,50',
    );
  });
});

describe('wholeExplanation', () => {
  it.each([
    ['20', 70, '20% = 14 → 10% = 7 → 100% = 10 × 7 = 70'],
    ['25', 56, '25% = 14 → 100% = 4 × 14 = 56'],
    ['15', 30, '15% = 4,5 → 5% = 1,5 → 100% = 20 × 1,5 = 30'],
    ['12½', 48, '12½% = 6 → 100% = 8 × 6 = 48'],
    ['1', 500, '1% = 5 → 100% = 100 × 5 = 500'],
    ['150', 80, '150% = 120 → 50% = 40 → 100% = 2 × 40 = 80'],
  ])('explains back to 100%% from %s%% of %i', (label, whole, expected) => {
    expect(wholeExplanation(percentage(label), fromInteger(whole))).toBe(expected);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/topics/percentages.test.ts`
Expected: FAIL, with `Failed to resolve import "./percentages"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/topics/percentages.ts`:

```ts
import { formatInteger, formatRational } from '../format';
import { compare, divide, equals, fromInteger, multiply, rational, type Rational } from '../rational';

export interface Percentage {
  value: Rational;
  /** Known percentage the explanation goes through: base% = whole : (100 / base). */
  base: Rational;
}

function percentage(value: number, base: number): Percentage {
  return { value: fromInteger(value), base: fromInteger(base) };
}

const TWELVE_AND_A_HALF = rational(25n, 2n);

/** Spec §5.12. 100 / base and value / base are always whole numbers. */
export const PERCENTAGES: readonly Percentage[] = [
  percentage(1, 1),
  percentage(2, 1),
  percentage(5, 5),
  percentage(10, 10),
  { value: TWELVE_AND_A_HALF, base: TWELVE_AND_A_HALF },
  percentage(15, 5),
  percentage(20, 10),
  percentage(25, 25),
  percentage(30, 10),
  percentage(40, 10),
  percentage(50, 50),
  percentage(60, 10),
  percentage(75, 25),
  percentage(80, 10),
  percentage(90, 10),
  percentage(120, 10),
  percentage(150, 50),
];

const HUNDRED = fromInteger(100);
const FIFTY = fromInteger(50);
const FIFTEEN = fromInteger(15);
const TEN = fromInteger(10);
const FIVE = fromInteger(5);

/** "120% korting" makes no sense; increases stay at most 50% (spec §5.12). */
export const DISCOUNT_PERCENTAGES: readonly Percentage[] = PERCENTAGES.filter(
  ({ value }) => compare(value, HUNDRED) < 0,
);
export const INCREASE_PERCENTAGES: readonly Percentage[] = PERCENTAGES.filter(
  ({ value }) => compare(value, FIFTY) <= 0,
);

export const MIN_WHOLE = 10;
export const MAX_WHOLE = 1000;

function hasAtMostTwoSignificantDigits(value: number): boolean {
  let digits = value;
  while (digits % 10 === 0) digits /= 10;
  return digits < 100;
}

/** Integers in [10, 1000] with at most 2 significant digits: 85 and 470, not 487. */
export const NICE_WHOLES: readonly number[] = Array.from(
  { length: MAX_WHOLE - MIN_WHOLE + 1 },
  (_, index) => MIN_WHOLE + index,
).filter(hasAtMostTwoSignificantDigits);

/** '15' or '12½'. Percentages are whole or half (spec §8). */
export function formatPercentage(value: Rational): string {
  if (value.den === 1n) return formatRational(value);
  if (value.den === 2n && value.num > 0n) return `${formatInteger((value.num - 1n) / 2n)}½`;
  throw new RangeError('Only whole and half percentages are supported');
}

function percentLabel(percent: Rational): string {
  return `${formatPercentage(percent)}%`;
}

/** p% of the whole, exactly. */
export function percentOf(percent: Rational, whole: Rational): Rational {
  return divide(multiply(percent, whole), HUNDRED);
}

/**
 * Strategy for p% of a whole: '10% = 80 : 10 = 8 → 30% = 3 × 8 = 24'. 5% and 15% go via 10%:
 * '10% = 8, 5% = 4 → 15% = 12'. `format` formats the amounts, e.g. formatMoney.
 */
export function partExplanation(
  p: Percentage,
  whole: Rational,
  format: (value: Rational) => string = formatRational,
): string {
  const of = (percent: Rational) => format(percentOf(percent, whole));
  if (equals(p.value, FIVE)) return `10% = ${of(TEN)} → 5% = ${of(FIVE)}`;
  if (equals(p.value, FIFTEEN)) return `10% = ${of(TEN)}, 5% = ${of(FIVE)} → 15% = ${of(FIFTEEN)}`;
  const divisor = formatRational(divide(HUNDRED, p.base));
  const first = `${percentLabel(p.base)} = ${format(whole)} : ${divisor} = ${of(p.base)}`;
  if (equals(p.value, p.base)) return first;
  const times = formatRational(divide(p.value, p.base));
  return `${first} → ${percentLabel(p.value)} = ${times} × ${of(p.base)} = ${of(p.value)}`;
}

/** Strategy from p% back to 100%: '20% = 14 → 10% = 7 → 100% = 10 × 7 = 70'. */
export function wholeExplanation(p: Percentage, whole: Rational): string {
  const part = formatRational(percentOf(p.value, whole));
  const factor = formatRational(divide(HUNDRED, p.base));
  const known = `${percentLabel(p.value)} = ${part}`;
  const total = formatRational(whole);
  if (equals(p.value, p.base)) return `${known} → 100% = ${factor} × ${part} = ${total}`;
  const baseValue = formatRational(percentOf(p.base, whole));
  return `${known} → ${percentLabel(p.base)} = ${baseValue} → 100% = ${factor} × ${baseValue} = ${total}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/topics/percentages.test.ts`
Expected: PASS.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/topics/percentages.ts src/lib/topics/percentages.test.ts
git commit -m "feat: add percentage strategies and explanations" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Percentage exercises (`percentages`)

Four forms, each picked with equal probability (spec §5.12):

| Form | Key | Prompt | Step |
|---|---|---|---|
| part of a whole | `percentages:of:<p>:<whole>` | `15% van 80 = ?` | `numberStep` |
| what percentage | `percentages:what:<p>:<whole>` | `30 is ?% van 120` | `fractionStep`, suffix `%` |
| discount / increase | `percentages:discount:<p>:<price>` / `percentages:increase:<p>:<price>` | `€ 60 na 25% korting = ?` | `numberStep`, prefix `€`, money `expected` |
| back to 100% | `percentages:back:<p>:<whole>` | `20% is 14. Hoeveel is 100%?` | `numberStep` |

`<p>` is the formatted percentage, e.g. `15` or `12½`.

**Files:**
- Modify: `src/lib/topics/percentages.ts`, `src/lib/types.ts`, `src/lib/topics/index.ts`
- Test: `src/lib/topics/percentages.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/lib/topics/percentages.test.ts`, replace the import block with:

```ts
import { describe, expect, it } from 'vitest';
import { formatEuro, formatMoney, formatRational } from '../format';
import { createRng } from '../random';
import {
  add,
  decimalPlaces,
  divide,
  equals,
  fromInteger,
  rational,
  subtract,
  type Rational,
} from '../rational';
import { parseAnswer } from '../steps';
import type { Question, Step } from '../types';
import {
  DISCOUNT_PERCENTAGES,
  formatPercentage,
  generatePercentages,
  INCREASE_PERCENTAGES,
  NICE_WHOLES,
  partExplanation,
  PERCENTAGES,
  percentOf,
  priceChangeExplanation,
  wholeExplanation,
  type Percentage,
} from './percentages';
```

Below `function labels(...)`, add these helpers:

```ts
const SAMPLES = 4000;

function sample(seed: number, count = SAMPLES): Question[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => generatePercentages(rng));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

function expectedOf(question: Question): string {
  // `expected` does not depend on the input.
  return stepOf(question).check('').expected;
}

/** What the user types: a fraction step shows '12,5 of 25/2', the user types one of them. */
function typed(question: Question): string {
  return expectedOf(question).split(' of ')[0]!;
}

function answerOf(question: Question): Rational {
  return parseAnswer(stepOf(question).kind, typed(question))!;
}

function formOf(question: Question): string {
  return question.key.split(':')[1]!;
}

function percentageOf(question: Question): Percentage {
  return percentage(question.key.split(':')[2]!);
}

function wholeOf(question: Question): Rational {
  return fromInteger(Number(question.key.split(':')[3]));
}

function integerShare(values: readonly Rational[]): number {
  return values.filter((value) => value.den === 1n).length / values.length;
}
```

Then append:

```ts
describe('generatePercentages', () => {
  const questions = sample(21);

  it('creates single-step questions that accept their own answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('percentages');
      expect(question.key.startsWith('percentages:')).toBe(true);
      expect(question.steps).toHaveLength(1);
      const result = stepOf(question).check(typed(question));
      expect(result.correct).toBe(true);
      expect(result.explanation).toBeTruthy();
    }
  });

  it('uses the four forms about equally often', () => {
    const count = (...forms: string[]) => questions.filter((q) => forms.includes(formOf(q))).length;
    for (const forms of [['of'], ['what'], ['discount', 'increase'], ['back']]) {
      const share = count(...forms) / SAMPLES;
      expect(share).toBeGreaterThan(0.21);
      expect(share).toBeLessThan(0.29);
    }
  });

  it('uses nice wholes and every percentage', () => {
    for (const question of questions) {
      expect(NICE_WHOLES).toContain(Number(wholeOf(question).num));
    }
    const used = new Set(questions.map((q) => formatPercentage(percentageOf(q).value)));
    expect(used.size).toBe(PERCENTAGES.length);
  });

  it('keeps answers to at most 2 decimals', () => {
    for (const question of questions) {
      expect(decimalPlaces(answerOf(question))).toBeLessThanOrEqual(2);
    }
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => sample(seed, 50).map((question) => question.key);
    expect(keys(5)).toEqual(keys(5));
  });
});

describe('part of a whole', () => {
  const questions = sample(22).filter((q) => formOf(q) === 'of');

  it('asks for p% of the whole', () => {
    for (const question of questions) {
      const [p, whole] = [percentageOf(question), wholeOf(question)];
      expect(stepOf(question).kind).toBe('number');
      expect(stepOf(question).prompt).toBe(
        `${formatPercentage(p.value)}% van ${formatRational(whole)} = ?`,
      );
      expect(equals(answerOf(question), percentOf(p.value, whole))).toBe(true);
      expect(stepOf(question).check('').explanation).toBe(partExplanation(p, whole));
    }
  });

  it('has an integer answer in about 80% of the cases', () => {
    const share = integerShare(questions.map(answerOf));
    expect(share).toBeGreaterThan(0.72);
    expect(share).toBeLessThan(0.88);
  });
});

describe('what percentage', () => {
  const questions = sample(23).filter((q) => formOf(q) === 'what');

  it('asks which percentage of the whole the part is', () => {
    for (const question of questions) {
      const [p, whole] = [percentageOf(question), wholeOf(question)];
      const part = percentOf(p.value, whole);
      expect(part.den).toBe(1n);
      expect(stepOf(question).kind).toBe('fraction');
      expect(stepOf(question).suffix).toBe('%');
      expect(stepOf(question).prompt).toBe(
        `${formatRational(part)} is ?% van ${formatRational(whole)}`,
      );
      expect(equals(answerOf(question), p.value)).toBe(true);
      expect(stepOf(question).check('').explanation).toBe(partExplanation(p, whole));
    }
  });

  it('accepts 12½ as a fraction or a decimal', () => {
    const half = questions.find((q) => q.key.startsWith('percentages:what:12½:'))!;
    expect(expectedOf(half)).toBe('12,5 of 25/2');
    for (const input of ['25/2', '50/4', '12,5']) {
      expect(stepOf(half).check(input).correct).toBe(true);
    }
  });
});

describe('discount and increase', () => {
  const questions = sample(24).filter((q) => ['discount', 'increase'].includes(formOf(q)));

  it('changes a whole-euro price by p%', () => {
    for (const question of questions) {
      const increase = formOf(question) === 'increase';
      const [p, price] = [percentageOf(question), wholeOf(question)];
      expect(increase ? INCREASE_PERCENTAGES : DISCOUNT_PERCENTAGES).toContain(p);
      const step = stepOf(question);
      expect(step.kind).toBe('number');
      expect(step.prefix).toBe('€');
      expect(step.suffix).toBeUndefined();
      expect(step.prompt).toBe(
        `${formatEuro(price)} na ${formatPercentage(p.value)}% ${increase ? 'verhoging' : 'korting'} = ?`,
      );
      const change = percentOf(p.value, price);
      expect(equals(answerOf(question), increase ? add(price, change) : subtract(price, change))).toBe(
        true,
      );
      expect(expectedOf(question)).toBe(formatMoney(answerOf(question)));
      expect(step.check('').explanation).toBe(priceChangeExplanation(p, price, increase));
    }
  });

  it('uses discounts and increases about equally often', () => {
    const share = questions.filter((q) => formOf(q) === 'increase').length / questions.length;
    expect(share).toBeGreaterThan(0.43);
    expect(share).toBeLessThan(0.57);
  });

  it('has an integer answer in about 80% of the cases', () => {
    const share = integerShare(questions.map(answerOf));
    expect(share).toBeGreaterThan(0.72);
    expect(share).toBeLessThan(0.88);
  });

  it.each([
    ['25', 60, false, '25% = 60 : 4 = 15 → 60 − 15 = 45'],
    ['15', 40, true, '10% = 4, 5% = 2 → 15% = 6 → 40 + 6 = 46'],
    ['15', 30, false, '10% = 3, 5% = 1,50 → 15% = 4,50 → 30 − 4,50 = 25,50'],
    ['12½', 20, true, '12½% = 20 : 8 = 2,50 → 20 + 2,50 = 22,50'],
  ])('explains %s%% on € %i (increase: %s)', (label, price, increase, expected) => {
    expect(priceChangeExplanation(percentage(label), fromInteger(price), increase)).toBe(expected);
  });
});

describe('back to 100%', () => {
  const questions = sample(25).filter((q) => formOf(q) === 'back');

  it('asks for the whole from a given part', () => {
    for (const question of questions) {
      const [p, whole] = [percentageOf(question), wholeOf(question)];
      const part = percentOf(p.value, whole);
      expect(decimalPlaces(part)).toBeLessThanOrEqual(2);
      expect(stepOf(question).prompt).toBe(
        `${formatPercentage(p.value)}% is ${formatRational(part)}. Hoeveel is 100%?`,
      );
      expect(equals(answerOf(question), whole)).toBe(true);
      expect(stepOf(question).check('').explanation).toBe(wholeExplanation(p, whole));
    }
  });

  it('gives an integer part in about 80% of the cases', () => {
    const parts = questions.map((q) => percentOf(percentageOf(q).value, wholeOf(q)));
    const share = integerShare(parts);
    expect(share).toBeGreaterThan(0.72);
    expect(share).toBeLessThan(0.88);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/topics/percentages.test.ts`
Expected: FAIL, with `generatePercentages is not a function` (and the same for `priceChangeExplanation`).

- [ ] **Step 3: Widen `Topic`**

In `src/lib/types.ts`, replace

```ts
export type Topic = 'tables' | 'volume' | 'area' | 'length' | 'mass' | 'time' | 'numberUnits';
```

with

```ts
export type Topic =
  | 'tables'
  | 'volume'
  | 'area'
  | 'length'
  | 'mass'
  | 'time'
  | 'numberUnits'
  | 'percentages';
```

- [ ] **Step 4: Write the implementation**

In `src/lib/topics/percentages.ts`, replace both import statements at the top (from `../format` and `../rational`) with

```ts
import { formatEuro, formatInteger, formatMoney, formatRational, MINUS } from '../format';
import { pick, type Rng } from '../random';
import {
  add,
  compare,
  decimalPlaces,
  divide,
  equals,
  fromInteger,
  multiply,
  rational,
  subtract,
  type Rational,
} from '../rational';
import { fractionStep, numberStep } from '../steps';
import type { Question, Step } from '../types';
```

and append:

```ts
/** Share of integer answers (spec §5.12); the rest has 1 or 2 decimals. */
export const INTEGER_SHARE = 0.8;
const MAX_DECIMALS = 2;

const WHOLES: readonly Rational[] = NICE_WHOLES.map(fromInteger);

type PercentageForm = 'partOfWhole' | 'whatPercentage' | 'priceChange' | 'backToWhole';
const FORMS: readonly PercentageForm[] = [
  'partOfWhole',
  'whatPercentage',
  'priceChange',
  'backToWhole',
];

export function generatePercentages(rng: Rng): Question {
  switch (pick(rng, FORMS)) {
    case 'partOfWhole':
      return partOfWhole(rng);
    case 'whatPercentage':
      return whatPercentage(rng);
    case 'priceChange':
      return priceChange(rng);
    case 'backToWhole':
      return backToWhole(rng);
  }
}

function isInteger(value: Rational): boolean {
  return value.den === 1n;
}

function hasAtMostTwoDecimals(value: Rational): boolean {
  const decimals = decimalPlaces(value);
  return decimals !== null && decimals <= MAX_DECIMALS;
}

/** An integer-valued candidate with probability INTEGER_SHARE, otherwise a non-integer one. */
function pickByIntegerShare<T>(rng: Rng, candidates: readonly T[], valueOf: (candidate: T) => Rational): T {
  const integers = candidates.filter((candidate) => isInteger(valueOf(candidate)));
  const others = candidates.filter((candidate) => !isInteger(valueOf(candidate)));
  const preferred = rng() < INTEGER_SHARE ? integers : others;
  return pick(rng, preferred.length > 0 ? preferred : candidates);
}

/** Every nice whole whose p% has at most 2 decimals. */
function partsOf(p: Percentage): { whole: Rational; part: Rational }[] {
  return WHOLES.map((whole) => ({ whole, part: percentOf(p.value, whole) })).filter(({ part }) =>
    hasAtMostTwoDecimals(part),
  );
}

function percentagesQuestion(form: string, p: Percentage, whole: Rational, step: Step): Question {
  return {
    key: `percentages:${form}:${formatPercentage(p.value)}:${whole.num}`,
    topic: 'percentages',
    steps: [step],
  };
}

/** `15% van 80 = ?` */
function partOfWhole(rng: Rng): Question {
  const p = pick(rng, PERCENTAGES);
  const { whole, part } = pickByIntegerShare(rng, partsOf(p), (candidate) => candidate.part);
  return percentagesQuestion(
    'of',
    p,
    whole,
    numberStep({
      prompt: `${percentLabel(p.value)} van ${formatRational(whole)} = ?`,
      answer: part,
      explanation: partExplanation(p, whole),
    }),
  );
}

/**
 * `30 is ?% van 120`. Always a fraction step, so `12½` can be typed as `25/2` and the `/` key
 * does not give the answer away.
 */
function whatPercentage(rng: Rng): Question {
  const p = pick(rng, PERCENTAGES);
  const { whole, part } = pick(
    rng,
    partsOf(p).filter((candidate) => isInteger(candidate.part)),
  );
  return percentagesQuestion(
    'what',
    p,
    whole,
    fractionStep({
      prompt: `${formatRational(part)} is ?% van ${formatRational(whole)}`,
      answer: p.value,
      suffix: '%',
      explanation: partExplanation(p, whole),
    }),
  );
}

function changedPrice(p: Percentage, price: Rational, increase: boolean): Rational {
  const change = percentOf(p.value, price);
  return increase ? add(price, change) : subtract(price, change);
}

/** '25% = 60 : 4 = 15 → 60 − 15 = 45', with money formatting. */
export function priceChangeExplanation(p: Percentage, price: Rational, increase: boolean): string {
  const change = formatMoney(percentOf(p.value, price));
  const answer = formatMoney(changedPrice(p, price, increase));
  const operator = increase ? '+' : MINUS;
  return `${partExplanation(p, price, formatMoney)} → ${formatMoney(price)} ${operator} ${change} = ${answer}`;
}

/** `€ 60 na 25% korting = ?` or `€ 40 na 15% verhoging = ?` */
function priceChange(rng: Rng): Question {
  const increase = rng() < 0.5;
  const p = pick(rng, increase ? INCREASE_PERCENTAGES : DISCOUNT_PERCENTAGES);
  const candidates = WHOLES.map((price) => ({ price, answer: changedPrice(p, price, increase) })).filter(
    ({ answer }) => hasAtMostTwoDecimals(answer),
  );
  const { price, answer } = pickByIntegerShare(rng, candidates, (candidate) => candidate.answer);
  return percentagesQuestion(
    increase ? 'increase' : 'discount',
    p,
    price,
    numberStep({
      prompt: `${formatEuro(price)} na ${percentLabel(p.value)} ${increase ? 'verhoging' : 'korting'} = ?`,
      answer,
      prefix: '€',
      expected: formatMoney(answer),
      explanation: priceChangeExplanation(p, price, increase),
    }),
  );
}

/** `20% is 14. Hoeveel is 100%?` The answer is the whole, so it is always an integer. */
function backToWhole(rng: Rng): Question {
  const p = pick(rng, PERCENTAGES);
  const { whole, part } = pickByIntegerShare(rng, partsOf(p), (candidate) => candidate.part);
  return percentagesQuestion(
    'back',
    p,
    whole,
    numberStep({
      prompt: `${percentLabel(p.value)} is ${formatRational(part)}. Hoeveel is 100%?`,
      answer: whole,
      explanation: wholeExplanation(p, whole),
    }),
  );
}
```

Why both integer groups are non-empty: the nice wholes include multiples of 100 (so `1%` and `2%` have integer parts) and multiples of 8 (so `12½%` has integer parts), and they include odd numbers and numbers ending in 5 (so every percentage has non-integer parts with at most 2 decimals). The integer-share tests confirm this over 1000 samples per form.

- [ ] **Step 5: Register the generator and label**

In `src/lib/topics/index.ts`, add the import

```ts
import { generatePercentages } from './percentages';
```

below the `./numberUnits` import. Add `percentages: generatePercentages,` after `numberUnits: generateNumberUnits,` in `GENERATORS`. Then add `percentages: 'Procenten (deel, percentage, korting, terug naar 100%)',` after the `numberUnits` label in `TOPIC_LABELS`.

- [ ] **Step 6: Run the tests and the type check**

Run: `npm test`
Expected: PASS.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/lib/topics/percentages.ts src/lib/topics/percentages.test.ts src/lib/topics/index.ts
git commit -m "feat: add percentage exercises" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Ratio exercises (`ratios`)

Three forms, each picked with equal probability (spec §5.13). Every answer is an integer.

| Form | Key | Example |
|---|---|---|
| missing term | `ratios:missing:<a>:<b>:<c>:<d>:<position>` | `ratios:missing:3:5:12:20:3` → `3 : 5 = 12 : ?` |
| scaling | `ratios:scale:<context>:<a>:<amount>:<b>` | `ratios:scale:pasta:4:300:6` |
| dividing | `ratios:divide:<total>:<a>:<b>:<largest\|smallest>` | `ratios:divide:60:2:3:largest` |

How the values are chosen:

- **Missing term:** a simplified ratio `p : q` (`p ≠ q`, both in `[1, 12]`). The left side is `m × (p : q)` with terms ≤ 12. The right side is `n × (p : q)` with `n ≠ m` and terms ≤ 100. The unknown is at position 0–3.
- **Scaling:** counts `a ≠ b` in `[2, 12]`. With `g = gcd(a, b)`, the amount is a nice whole and a multiple of `a / g`, so the amount for `g` units is whole. The answer is `amount / (a / g) × (b / g)`, at most 2000.
- **Dividing:** a simplified ratio `a : b`, one part `k ≥ 2`, total `(a + b) × k ≤ 500`.

The amounts reuse `NICE_WHOLES` from `percentages.ts`, the same way `numberUnits.ts` reuses `measurement.ts`.

**Files:**
- Create: `src/lib/topics/ratios.ts`
- Modify: `src/lib/types.ts`, `src/lib/topics/index.ts`
- Test: `src/lib/topics/ratios.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/topics/ratios.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { NO_BREAK_SPACE } from '../format';
import { createRng } from '../random';
import type { Question, Step } from '../types';
import { NICE_WHOLES } from './percentages';
import {
  divideExplanation,
  generateRatios,
  MAX_RATIO_TERM,
  MAX_SCALED_ANSWER,
  MAX_SCALED_TERM,
  MAX_TOTAL,
  missingTermExplanation,
  SCALING_CONTEXTS,
  scalingExplanation,
  type ScalingContext,
} from './ratios';

const SAMPLES = 3000;

function sample(seed: number, count = SAMPLES): Question[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => generateRatios(rng));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

function expectedOf(question: Question): string {
  return stepOf(question).check('').expected;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function formOf(question: Question): string {
  return question.key.split(':')[1]!;
}

function context(id: string): ScalingContext {
  return SCALING_CONTEXTS.find((candidate) => candidate.id === id)!;
}

const questions = sample(31);
const missing = questions.filter((q) => formOf(q) === 'missing');
const scaling = questions.filter((q) => formOf(q) === 'scale');
const dividing = questions.filter((q) => formOf(q) === 'divide');

describe('generateRatios', () => {
  it('creates single-step integer questions that accept their own answer', () => {
    for (const question of questions) {
      expect(question.topic).toBe('ratios');
      expect(question.steps).toHaveLength(1);
      expect(stepOf(question).kind).toBe('number');
      expect(expectedOf(question)).toMatch(/^\d+$/);
      const result = stepOf(question).check(expectedOf(question));
      expect(result.correct).toBe(true);
      expect(result.explanation).toBeTruthy();
    }
  });

  it('uses the three forms about equally often', () => {
    expect(missing.length + scaling.length + dividing.length).toBe(SAMPLES);
    for (const form of [missing, scaling, dividing]) {
      expect(form.length / SAMPLES).toBeGreaterThan(0.28);
      expect(form.length / SAMPLES).toBeLessThan(0.39);
    }
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => sample(seed, 50).map((question) => question.key);
    expect(keys(5)).toEqual(keys(5));
  });
});

describe('missing term', () => {
  function parts(question: Question) {
    const [a, b, c, d, position] = question.key.split(':').slice(2).map(Number) as [
      number,
      number,
      number,
      number,
      number,
    ];
    return { terms: [a, b, c, d] as const, position };
  }

  it('keeps the two ratios equal and within range', () => {
    for (const question of missing) {
      const { terms, position } = parts(question);
      const [a, b, c, d] = terms;
      expect(a * d).toBe(b * c);
      expect(a).not.toBe(b);
      expect(a).not.toBe(c);
      expect(Math.min(a, b)).toBeGreaterThanOrEqual(1);
      expect(Math.max(a, b)).toBeLessThanOrEqual(MAX_RATIO_TERM);
      expect(Math.max(c, d)).toBeLessThanOrEqual(MAX_SCALED_TERM);
      expect(expectedOf(question)).toBe(String(terms[position]));
      const shown = terms.map((term, index) => (index === position ? '?' : String(term)));
      expect(stepOf(question).prompt).toBe(`${shown[0]} : ${shown[1]} = ${shown[2]} : ${shown[3]}`);
      expect(stepOf(question).check('').explanation).toBe(missingTermExplanation(terms, position));
    }
  });

  it('puts the unknown in each of the four positions about equally often', () => {
    for (const position of [0, 1, 2, 3]) {
      const share = missing.filter((q) => parts(q).position === position).length / missing.length;
      expect(share).toBeGreaterThan(0.2);
      expect(share).toBeLessThan(0.3);
    }
  });

  it('also uses left sides that are not simplified', () => {
    expect(missing.some((q) => gcd(parts(q).terms[0], parts(q).terms[1]) > 1)).toBe(true);
  });

  it.each([
    [[3, 5, 12, 20], 3, '3 : 5 = 12 : 20 (× 4)'],
    [[3, 5, 12, 20], 0, '12 : 20 = 3 : 5 (: 4)'],
    [[4, 6, 10, 15], 3, '4 : 6 = 2 : 3 = 10 : 15'],
    [[4, 6, 10, 15], 1, '10 : 15 = 2 : 3 = 4 : 6'],
  ] as const)('explains %j with the unknown at %i', (terms, position, expected) => {
    expect(missingTermExplanation(terms, position)).toBe(expected);
  });
});

describe('scaling', () => {
  function parts(question: Question) {
    const [, , id, a, amount, b] = question.key.split(':');
    return { context: context(id!), a: Number(a), amount: Number(amount), b: Number(b) };
  }

  it('scales a nice amount to a whole answer', () => {
    for (const question of scaling) {
      const { context, a, amount, b } = parts(question);
      expect(a).not.toBe(b);
      for (const count of [a, b]) {
        expect(count).toBeGreaterThanOrEqual(2);
        expect(count).toBeLessThanOrEqual(MAX_RATIO_TERM);
      }
      expect(NICE_WHOLES).toContain(amount);
      expect(amount).toBeLessThanOrEqual(context.maxAmount);
      expect((amount * gcd(a, b)) % a).toBe(0);
      const answer = (amount * b) / a;
      expect(answer).toBeLessThanOrEqual(MAX_SCALED_ANSWER);
      expect(expectedOf(question)).toBe(String(answer));
      const step = stepOf(question);
      expect(step.prompt).toBe(context.prompt(a, amount, b));
      expect(step.prefix).toBe(context.prefix);
      expect(step.suffix).toBe(context.suffix);
      expect(step.check('').explanation).toBe(scalingExplanation(a, amount, b));
    }
  });

  it('uses every context', () => {
    expect(new Set(scaling.map((q) => parts(q).context.id)).size).toBe(SCALING_CONTEXTS.length);
  });

  it('writes the contexts in Dutch', () => {
    expect(context('pasta').prompt(4, 300, 6)).toBe(
      'Voor 4 personen: 300 g pasta. Hoeveel g voor 6 personen?',
    );
    expect(context('milk').prompt(4, 500, 6)).toBe(
      'Voor 4 personen: 500 ml melk. Hoeveel ml voor 6 personen?',
    );
    expect(context('notebooks').prompt(3, 12, 5)).toBe(
      `3 schriften kosten €${NO_BREAK_SPACE}12. Hoeveel kosten 5 schriften?`,
    );
    expect(context('notebooks').prefix).toBe('€');
  });

  it.each([
    [4, 300, 6, '4 → 300, 2 → 150, 6 → 450'],
    [4, 300, 8, '4 → 300, 8 → 600'],
    [8, 600, 4, '8 → 600, 4 → 300'],
    [3, 90, 5, '3 → 90, 1 → 30, 5 → 150'],
  ])('explains %i → %i, then %i with a ratio table', (a, amount, b, expected) => {
    expect(scalingExplanation(a, amount, b)).toBe(expected);
  });
});

describe('dividing in ratio', () => {
  function parts(question: Question) {
    const [, , total, a, b, size] = question.key.split(':');
    return { total: Number(total), a: Number(a), b: Number(b), largest: size === 'largest' };
  }

  it('divides the total in a simplified ratio', () => {
    for (const question of dividing) {
      const { total, a, b, largest } = parts(question);
      expect(a).not.toBe(b);
      expect(gcd(a, b)).toBe(1);
      expect(Math.max(a, b)).toBeLessThanOrEqual(MAX_RATIO_TERM);
      expect(total % (a + b)).toBe(0);
      expect(total / (a + b)).toBeGreaterThanOrEqual(2);
      expect(total).toBeLessThanOrEqual(MAX_TOTAL);
      const asked = largest ? Math.max(a, b) : Math.min(a, b);
      expect(expectedOf(question)).toBe(String((total / (a + b)) * asked));
      expect(stepOf(question).prompt).toBe(
        `Verdeel ${total} in de verhouding ${a} : ${b}. Hoe groot is het ${largest ? 'grootste' : 'kleinste'} deel?`,
      );
      expect(stepOf(question).check('').explanation).toBe(divideExplanation(total, a, b, asked));
    }
  });

  it('asks for the largest part about half of the time', () => {
    const share = dividing.filter((q) => parts(q).largest).length / dividing.length;
    expect(share).toBeGreaterThan(0.43);
    expect(share).toBeLessThan(0.57);
  });

  it.each([
    [60, 2, 3, 3, '2 + 3 = 5 delen → 1 deel = 60 : 5 = 12 → 3 delen = 36'],
    [60, 2, 3, 2, '2 + 3 = 5 delen → 1 deel = 60 : 5 = 12 → 2 delen = 24'],
    [40, 1, 4, 1, '1 + 4 = 5 delen → 1 deel = 40 : 5 = 8'],
  ])('explains dividing %i in %i : %i', (total, a, b, asked, expected) => {
    expect(divideExplanation(total, a, b, asked)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/topics/ratios.test.ts`
Expected: FAIL, with `Failed to resolve import "./ratios"`.

- [ ] **Step 3: Widen `Topic`**

In `src/lib/types.ts`, replace

```ts
  | 'numberUnits'
  | 'percentages';
```

with

```ts
  | 'numberUnits'
  | 'percentages'
  | 'ratios';
```

- [ ] **Step 4: Write the implementation**

Create `src/lib/topics/ratios.ts`:

```ts
import { formatEuro, formatInteger } from '../format';
import { pick, randomInt, type Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question, Step } from '../types';
import { NICE_WHOLES } from './percentages';

/** Terms of the given ratio and the counts in scaling (spec §5.13). */
export const MAX_RATIO_TERM = 12;
/** Terms of the other side of a missing-term exercise. */
export const MAX_SCALED_TERM = 100;
export const MIN_COUNT = 2;
export const MAX_SCALED_ANSWER = 2000;
export const MAX_TOTAL = 500;

type Terms = readonly [number, number, number, number];
type Pair = readonly [number, number];

export interface ScalingContext {
  id: string;
  maxAmount: number;
  prefix?: string;
  suffix?: string;
  prompt(a: number, amount: number, b: number): string;
}

export const SCALING_CONTEXTS: readonly ScalingContext[] = [
  {
    id: 'pasta',
    maxAmount: 1000,
    suffix: 'g',
    prompt: (a, amount, b) =>
      `Voor ${a} personen: ${formatInteger(amount)} g pasta. Hoeveel g voor ${b} personen?`,
  },
  {
    id: 'milk',
    maxAmount: 1000,
    suffix: 'ml',
    prompt: (a, amount, b) =>
      `Voor ${a} personen: ${formatInteger(amount)} ml melk. Hoeveel ml voor ${b} personen?`,
  },
  {
    id: 'notebooks',
    maxAmount: 100,
    prefix: '€',
    prompt: (a, amount, b) =>
      `${a} schriften kosten ${formatEuro(fromInteger(amount))}. Hoeveel kosten ${b} schriften?`,
  },
];

type RatioForm = 'missingTerm' | 'scaling' | 'divide';
const FORMS: readonly RatioForm[] = ['missingTerm', 'scaling', 'divide'];

export function generateRatios(rng: Rng): Question {
  switch (pick(rng, FORMS)) {
    case 'missingTerm':
      return missingTerm(rng);
    case 'scaling':
      return scaling(rng);
    case 'divide':
      return divideInRatio(rng);
  }
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** p : q with p ≠ q, both in [1, 12], and gcd(p, q) = 1. */
function randomSimplifiedRatio(rng: Rng): [number, number] {
  for (;;) {
    const p = randomInt(rng, 1, MAX_RATIO_TERM);
    const q = randomInt(rng, 1, MAX_RATIO_TERM);
    if (p !== q && gcd(p, q) === 1) return [p, q];
  }
}

/** A different integer in [min, max]: draws from one value fewer and skips `excluded`. */
function randomIntExcept(rng: Rng, min: number, max: number, excluded: number): number {
  const value = randomInt(rng, min, max - 1);
  return value >= excluded ? value + 1 : value;
}

function ratioQuestion(key: string, step: Step): Question {
  return { key: `ratios:${key}`, topic: 'ratios', steps: [step] };
}

function showPair([x, y]: Pair): string {
  return `${formatInteger(x)} : ${formatInteger(y)}`;
}

/** `3 : 5 = 12 : ?`, with the unknown in any of the four positions. */
function missingTerm(rng: Rng): Question {
  const [p, q] = randomSimplifiedRatio(rng);
  const largest = Math.max(p, q);
  const m = randomInt(rng, 1, Math.floor(MAX_RATIO_TERM / largest));
  const n = randomIntExcept(rng, 1, Math.floor(MAX_SCALED_TERM / largest), m);
  const terms: Terms = [p * m, q * m, p * n, q * n];
  const position = randomInt(rng, 0, 3);
  const shown = terms.map((term, index) => (index === position ? '?' : formatInteger(term)));
  return ratioQuestion(
    `missing:${terms.join(':')}:${position}`,
    numberStep({
      prompt: `${shown.slice(0, 2).join(' : ')} = ${shown.slice(2).join(' : ')}`,
      answer: fromInteger(terms[position]!),
      explanation: missingTermExplanation(terms, position),
    }),
  );
}

/**
 * From the complete side to the side with the answer, via the simplified ratio when neither side
 * is simplified: '3 : 5 = 12 : 20 (× 4)', '12 : 20 = 3 : 5 (: 4)', '4 : 6 = 2 : 3 = 10 : 15'.
 */
export function missingTermExplanation(terms: Terms, position: number): string {
  const [a, b, c, d] = terms;
  const [known, completed]: [Pair, Pair] = position < 2 ? [[c, d], [a, b]] : [[a, b], [c, d]];
  const knownFactor = gcd(known[0], known[1]);
  const simplified: Pair = [known[0] / knownFactor, known[1] / knownFactor];
  const completedFactor = completed[0] / simplified[0];
  if (knownFactor === 1) return `${showPair(known)} = ${showPair(completed)} (× ${completedFactor})`;
  if (completedFactor === 1) return `${showPair(known)} = ${showPair(completed)} (: ${knownFactor})`;
  return `${showPair(known)} = ${showPair(simplified)} = ${showPair(completed)}`;
}

/** `Voor 4 personen: 300 g pasta. Hoeveel g voor 6 personen?` */
function scaling(rng: Rng): Question {
  const context = pick(rng, SCALING_CONTEXTS);
  const a = randomInt(rng, MIN_COUNT, MAX_RATIO_TERM);
  const b = randomIntExcept(rng, MIN_COUNT, MAX_RATIO_TERM, a);
  const g = gcd(a, b);
  // The amount for g units must be whole, so the amount is a multiple of a / g.
  const scaled = (amount: number) => (amount / (a / g)) * (b / g);
  const amounts = NICE_WHOLES.filter(
    (amount) =>
      amount <= context.maxAmount &&
      amount % (a / g) === 0 &&
      scaled(amount) <= MAX_SCALED_ANSWER,
  );
  const amount = pick(rng, amounts);
  return ratioQuestion(
    `scale:${context.id}:${a}:${amount}:${b}`,
    numberStep({
      prompt: context.prompt(a, amount, b),
      answer: fromInteger(scaled(amount)),
      prefix: context.prefix,
      suffix: context.suffix,
      explanation: scalingExplanation(a, amount, b),
    }),
  );
}

/** Ratio table via gcd(a, b): '4 → 300, 2 → 150, 6 → 450', or '4 → 300, 8 → 600'. */
export function scalingExplanation(a: number, amount: number, b: number): string {
  const g = gcd(a, b);
  const perGroup = amount / (a / g);
  const rows: [number, number][] = [[a, amount]];
  if (g !== a && g !== b) rows.push([g, perGroup]);
  rows.push([b, perGroup * (b / g)]);
  return rows.map(([count, value]) => `${count} → ${formatInteger(value)}`).join(', ');
}

/** `Verdeel 60 in de verhouding 2 : 3. Hoe groot is het grootste deel?` */
function divideInRatio(rng: Rng): Question {
  const [a, b] = randomSimplifiedRatio(rng);
  const unit = randomInt(rng, 2, Math.floor(MAX_TOTAL / (a + b)));
  const total = (a + b) * unit;
  const largest = rng() < 0.5;
  const asked = largest ? Math.max(a, b) : Math.min(a, b);
  return ratioQuestion(
    `divide:${total}:${a}:${b}:${largest ? 'largest' : 'smallest'}`,
    numberStep({
      prompt: `Verdeel ${formatInteger(total)} in de verhouding ${a} : ${b}. Hoe groot is het ${largest ? 'grootste' : 'kleinste'} deel?`,
      answer: fromInteger(asked * unit),
      explanation: divideExplanation(total, a, b, asked),
    }),
  );
}

/** '2 + 3 = 5 delen → 1 deel = 60 : 5 = 12 → 3 delen = 36' */
export function divideExplanation(total: number, a: number, b: number, asked: number): string {
  const parts = a + b;
  const unit = total / parts;
  const first = `${a} + ${b} = ${parts} delen → 1 deel = ${formatInteger(total)} : ${parts} = ${formatInteger(unit)}`;
  return asked === 1 ? first : `${first} → ${asked} delen = ${formatInteger(asked * unit)}`;
}
```

Why every range is non-empty:

- missing term: `floor(100 / 12) = 8`, so `n` always has at least 7 options besides `m`
- dividing: `floor(500 / 23) = 21 ≥ 2`
- scaling: `a / g ≤ 12`, and every multiple of `a / g` up to 99 is a nice whole, so `amount = a / g` (or a multiple ≥ 10) always fits, also under `€ 100` and with `answer ≤ 12 × 99 < 2000`

- [ ] **Step 5: Register the generator and label**

In `src/lib/topics/index.ts`, add the import

```ts
import { generateRatios } from './ratios';
```

below the `./percentages` import. Add `ratios: generateRatios,` after `percentages: generatePercentages,` in `GENERATORS`. Then add `ratios: 'Verhoudingen (ontbrekend getal, herschalen, verdelen)',` after the `percentages` label in `TOPIC_LABELS`.

- [ ] **Step 6: Run the tests and the type check**

Run: `npm test`
Expected: PASS.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/lib/topics/ratios.ts src/lib/topics/ratios.test.ts src/lib/topics/index.ts
git commit -m "feat: add ratio exercises" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: The Verhoudingen set (`lib/sets.ts`)

The constant is called `PROPORTIONS_SET`, so it is not confused with the `ratios` topic.

**Files:**
- Modify: `src/lib/sets.ts`
- Test: `src/lib/sets.test.ts`, `src/lib/session.test.ts`, `src/App.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/lib/sets.test.ts`, replace the `./sets` import with

```ts
import {
  DEFAULT_SESSION_SIZE,
  describeSetTopics,
  MEASUREMENT_SET,
  PRACTICE_SETS,
  PROPORTIONS_SET,
  SESSION_SIZES,
  TABLES_SET,
} from './sets';
```

replace

```ts
    expect(PRACTICE_SETS.map((set) => set.id)).toEqual(['tafels', 'meten']);
```

with

```ts
    expect(PRACTICE_SETS.map((set) => set.id)).toEqual(['tafels', 'meten', 'verhoudingen']);
```

add inside `describe('practice sets', …)`:

```ts
  it('makes Verhoudingen two equally weighted topics with 15% tables', () => {
    expect(PROPORTIONS_SET.name).toBe('Verhoudingen');
    expect(PROPORTIONS_SET.tablesPercent).toBe(15);
    expect(PROPORTIONS_SET.topics).toEqual([
      { topic: 'percentages', weight: 1 },
      { topic: 'ratios', weight: 1 },
    ]);
  });
```

and add inside `describe('describeSetTopics', …)`:

```ts
  it('describes the Verhoudingen set', () => {
    expect(describeSetTopics(PROPORTIONS_SET)).toEqual([
      'Procenten (deel, percentage, korting, terug naar 100%)',
      'Verhoudingen (ontbrekend getal, herschalen, verdelen)',
      '15% tafels',
    ]);
  });
```

In `src/lib/session.test.ts`, replace

```ts
import { MEASUREMENT_SET, SESSION_SIZES, TABLES_SET } from './sets';
```

with

```ts
import { MEASUREMENT_SET, PROPORTIONS_SET, SESSION_SIZES, TABLES_SET } from './sets';
```

and append:

```ts
describe('buildSession for Verhoudingen', () => {
  it('mixes 2 tables with 7 + 6 exercises over both topics at n = 15 (spec §4.2)', () => {
    const questions = buildSession(PROPORTIONS_SET, 15, createRng(3));
    const counts = new Map<string, number>();
    for (const { topic } of questions) counts.set(topic, (counts.get(topic) ?? 0) + 1);
    expect(counts.get('tables')).toBe(2);
    const perTopic = PROPORTIONS_SET.topics.map(({ topic }) => counts.get(topic) ?? 0);
    expect(perTopic.sort((a, b) => a - b)).toEqual([6, 7]);
  });

  it.each([...SESSION_SIZES])('builds %i unique questions', (size) => {
    const questions = buildSession(PROPORTIONS_SET, size, createRng(size));
    expect(questions).toHaveLength(size);
    expect(new Set(questions.map((q) => q.key)).size).toBe(size);
  });
});
```

In `src/App.test.ts`, add this test at the end of `describe('App', …)`:

```ts
  it('offers Verhoudingen with its topics and the tables share', async () => {
    render(App);
    await click(/Verhoudingen/);
    expect(screen.getByRole('heading', { name: 'Verhoudingen' })).toBeTruthy();
    expect(screen.getByText('Procenten (deel, percentage, korting, terug naar 100%)')).toBeTruthy();
    expect(screen.getByText('Verhoudingen (ontbrekend getal, herschalen, verdelen)')).toBeTruthy();
    expect(screen.getByText('15% tafels')).toBeTruthy();
    await click('Start');
    expect(screen.getByText('1 / 15')).toBeTruthy();
  });
```

The card's accessible name is "Verhoudingen Procenten en verhoudingen". `/Verhoudingen/` is case-sensitive, so it matches only that card.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/sets.test.ts src/lib/session.test.ts src/App.test.ts`
Expected: FAIL. `PROPORTIONS_SET` is undefined, and the App cannot find a "Verhoudingen" button.

- [ ] **Step 3: Write the implementation**

In `src/lib/sets.ts`, replace

```ts
/** Implemented sets in roadmap order. Later plans append their set here (spec §4.1). */
export const PRACTICE_SETS: readonly PracticeSet[] = [TABLES_SET, MEASUREMENT_SET];
```

with

```ts
/** v1 topics only; v2 adds fractionConversion and fractionArithmetic (spec §4.1, §12). */
export const PROPORTIONS_SET: PracticeSet = {
  id: 'verhoudingen',
  name: 'Verhoudingen',
  description: 'Procenten en verhoudingen',
  topics: [
    { topic: 'percentages', weight: 1 },
    { topic: 'ratios', weight: 1 },
  ],
  tablesPercent: 15,
};

/** Implemented sets in roadmap order. Later plans append their set here (spec §4.1). */
export const PRACTICE_SETS: readonly PracticeSet[] = [
  TABLES_SET,
  MEASUREMENT_SET,
  PROPORTIONS_SET,
];
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npm test`
Expected: PASS. If the uniqueness test for a large size fails, the generator space is too small. Report it instead of loosening the test.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sets.ts src/lib/sets.test.ts src/lib/session.test.ts src/App.test.ts
git commit -m "feat: add Verhoudingen practice set" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Final verification and docs

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Run the full verification**

1. Run `npm test`. Expected: every test file passes, with 0 failures.
2. Run `npm run check`. Expected: 0 errors and 0 warnings.
3. Run `npm run build`. Expected: success.
4. Run `grep -o 'manifest.webmanifest' dist/sw.js`. Expected: **exactly one** output line (CLAUDE.md, "PWA pitfalls").

- [ ] **Step 2: Manual check on a phone** (by the user)

1. Host `dist/`, or use `npm run preview -- --host` on the local network (⚠ approval).
2. Run through the following checks:
   - The overview shows Tafels, Meten and Verhoudingen.
   - Verhoudingen → setup lists both topics plus "15% tafels".
   - Start a session with 50 exercises. Check that:
     - `€ 60 na 25% korting = ?` shows `€` before the input, and `€ 60` never breaks across lines
     - "what percentage" questions show the `/` key in the bottom row (`⌫ / OK`), and other questions keep the wide `OK`
     - `12½%` is readable, and `25/2` as well as `12,5` are judged correct
     - the scaling prompts wrap neatly
   - Give a wrong answer on a discount question. The explanation (e.g. `10% = 3, 5% = 1,50 → 15% = 4,50 → 30 − 4,50 = 25,50`) must stay on screen without scrolling.
   - Repeat the checks in dark mode and in airplane mode.

- [ ] **Step 3: Update `CLAUDE.md`**

Replace:

```markdown
Implemented sets: **Tafels** (plan: `docs/superpowers/plans/2026-10-05-beta-tafels.md`) and **Meten**
(plan: `docs/superpowers/plans/2026-10-05-meten.md`).
```

with:

```markdown
Implemented sets: **Tafels** (plan: `docs/superpowers/plans/2026-10-05-beta-tafels.md`), **Meten**
(plan: `docs/superpowers/plans/2026-10-05-meten.md`) and **Verhoudingen** v1
(plan: `docs/superpowers/plans/2026-10-05-verhoudingen.md`).
```

In the roadmap table:

- In the row for set 2, change the infrastructure cell `Number input only` to `` `Step.prefix` (`€`); `fraction` input (`/` key) brought forward from v2 for `12½%` `` and the status cell from `planned` to `✅ done`.
- In the row for set 5, change the infrastructure cell `` `fraction` answer kind (`/` key on keypad) `` to `` Judging simplified vs unsimplified fractions (the `fraction` input exists since set 2) ``.

Replace the first bullet under "Known follow-ups for the next plans" with:

```markdown
- **Before adding the `boolean`/`expression`/`factorization` answer kinds:** `QuestionView` picks
  the parser via `parseAnswer(step.kind, …)` (`lib/steps.ts`), and `Keypad` adds `/` for
  `fraction` steps, but keys, reducer and display are still shared by all kinds, and `Step` has
  no "invalid input, attempt not consumed" path (spec §6 "Ongeldige som"). Introduce a per-kind
  input model (keys, reducer, validate, display) and let `QuestionView` pick it by `step.kind`
  first.
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: mark Verhoudingen v1 as implemented" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Spec coverage (self-review)

| Spec | Covered by |
|---|---|
| §4.1 Verhoudingen: `percentages`, `ratios`, weight 1, 15% tables | Task 9 |
| §4.2 Verhoudingen example 7 + 6 | Task 9 (`buildSession for Verhoudingen`) |
| §5.12 four forms, equal probability, percentage list, 12½ glyph | Tasks 6, 7 |
| §5.12 discount `p < 100`, increase `p ≤ 50` | Task 6 (`DISCOUNT_PERCENTAGES`, `INCREASE_PERCENTAGES`), Task 7 |
| §5.12 wholes in `[10, 1000]` with ≤ 2 significant digits | Task 6 (`NICE_WHOLES`), Task 7 |
| §5.12 ≤ 2 decimals; 80% integers per form; back to 100% integer answer | Task 7 (share tests) |
| §5.12 what percentage as `fraction` step; `25/2` and `12,5` correct | Tasks 3, 7 |
| §5.12 money prompt, `€` prefix, `25,50` | Tasks 2, 3, 5, 7 |
| §5.12 explanations via base percentage, 5%/15% via 10% | Tasks 6, 7 |
| §5.13 three forms, integer answers, terms in `[1, 12]` | Task 8 |
| §5.13 missing term: unsimplified left side, right terms ≤ 100, four positions | Task 8 |
| §5.13 scaling: contexts, counts in `[2, 12]`, amount rules, answer ≤ 2000 | Task 8 |
| §5.13 dividing: simplified ratio, `k ≥ 2`, total ≤ 500, largest/smallest | Task 8 |
| §5.13 explanations | Task 8 |
| §6 `fraction` keys and input rules; `€` prefix | Tasks 4, 5 |
| §8 money formatting, `12½%` | Tasks 2, 6 |
| §10 seeded ≥ 1000-sample generator tests, `check(expected)` correct, determinism | Tasks 7, 8 |
| CLAUDE.md: `dist/sw.js` has one manifest entry | Task 10 |
