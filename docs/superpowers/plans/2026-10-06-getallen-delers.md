# Getallen & delers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the **Getallen & delers** practice set with the topics `lcm` (spec §5.2), `gcd` (§5.3), `prime` (§5.4), `factorization` (§5.5), `divisibility` (§5.6) and `squares` (§5.7). As in every set except Tafels, 15% of the exercises are tables.

**Architecture:**

- **Per-kind input model** (`src/lib/inputModels.ts`). Every keypad answer kind gets its own keys, key reducer, validation and display. `QuestionView` picks the model by `step.kind`. `OK` is disabled only while the input is empty. Input that does not validate shows an inline error ("Ongeldig getal", "Ongeldige ontbinding") and does not use up the attempt (spec §6). This also covers the follow-up where `25/0` silently kept `OK` disabled.
- **Two new answer kinds:**
  - `boolean`: two large buttons, `Ja` and `Nee`. A tap submits at once; there is no keypad.
  - `factorization`: digits, `×` and `^`. The input is parsed by the first piece of `lib/expr`: a tokenizer for the full §7 token set, and a recursive-descent parser for products of powers (`×`, `^`). Set 4 (Bewerkingen) extends the parser with the rest of the §7 grammar.
- **Shared integer helpers** (`src/lib/primes.ts`): `gcd`, `lcm`, `isPrime`, `smallestPrimeFactor` and `primeFactors`. `ratios.ts` drops its private `gcd` and uses the shared one.
- **Three generator modules**, following the existing pattern (a pure `(rng) => Question`, every answer checked by a step factory in `steps.ts`):
  - `topics/numberTheory.ts`: `lcm`, `gcd`, `prime` and `factorization`
  - `topics/divisibility.ts`
  - `topics/squares.ts`

**Tech Stack:** Svelte 5, TypeScript (strict, `noUncheckedIndexedAccess`), Vitest + @testing-library/svelte. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-05-rekenhulp-design.md`. Read §4.1, §4.2, §5.2–§5.7, §6, §7 (tokenizer and parser only), §8, §9 and §11.7, §11.9 and §11.13 before starting.

---

## Scope

**In scope:**

| Spec section | What is built |
|---|---|
| §4.1 | The Getallen & delers set: six topics with weight 1, and 15% tables |
| §4.2 | Quota example: 2 tables + 3 + 2 + 2 + 2 + 2 + 2 at `n = 15` (no algorithm change) |
| §5.2 | `lcm`: pairs in `[2, 60]`, `lcm ≤ 300`, 75% sharing a factor |
| §5.3 | `gcd`: `g·p` and `g·q`, plus 10% coprime composites |
| §5.4 | `prime`: Ja/Nee for `n ∈ [11, 199]`, 50% prime, hard composites |
| §5.5 | `factorization`: free order and notation, canonical `2² × 3 × 7`, division ladder |
| §5.6 | `divisibility`: divisors 2–15 without 10, close calls, rule explanations incl. chunking |
| §5.7 | `squares`: `17² = ?` and `√289 = ?`, 70% from `[11, 25]`, tens-split explanation |
| §6 | Per-kind input model; inline invalid-input errors; `boolean` and `factorization` input |
| §7 | `lib/expr/tokenizer.ts` (all tokens), `lib/expr/parser.ts` (products of powers only) |

**Not in scope:**

- the `expression` answer kind, and the rest of the §7 parser (`+`, `−`, `:`, groups, unary minus), evaluation, formatting and the rewrite checker (set 4, Bewerkingen)
- the "Ongeldige som" message, which belongs to the `expression` model
- keyboard and screen-reader focus handling after a screen change (separate follow-up in CLAUDE.md)

**Decisions settled with the user on 2026-10-06 (spec §11.7, §11.9, §11.13):**

- Invalid input gives an inline error and does not consume the attempt, **for every keypad kind**, number and fraction included.
- A tap on `Ja` or `Nee` submits at once.
- A prime is explained as `Geen deler tot en met √151`, with the actual number.
- Divisors are 2 to 15 without 10, like the tables. 7 and 13 are explained by chunking (*happen*). 7, 13 and 14 use numbers of at most 4 digits.

**Assumptions written into the spec in the same commit (the user can still veto them in this review):**

- `lcm`: 75% of the pairs share a factor.
- `gcd`: coprime pairs are two composites in `[10, 200]`.
- `prime`: half of the composites come from the 10 hard ones, the other half are odd multiples of 3 that are not divisible by 5.
- `factorization`: the explanation is the division ladder `84 : 2 = 42, 42 : 2 = 21, 21 : 3 = 7`.
- `divisibility`: the number of digits is drawn uniformly. The close-call remainders for every divisor are listed in the table in §5.6. 6, 12, 14 and 15 combine the rules of two coprime factors and always show both.
- `squares`: the explanation splits off the tens, `17² = 17 × 10 + 17 × 7 = 170 + 119 = 289`.
- Messages: "Ongeldig getal" (number, fraction) and "Ongeldige ontbinding" (factorization).

## Prerequisites & command permissions

- Pre-approved in this repo: `npm install`, `npm test`, `npm run check`, `npm run build`, `git add`, `git commit`.
- **Not pre-approved:** `npm run dev` and `npm run preview`. They are only for the user's manual check.
- **Never** use `npx` or `node`.
- Every commit message ends with the trailer `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. The commands below pass it via a second `-m`.
- `npm run check` must stay at 0 errors and 0 warnings after **every** task. This is why `Topic` is widened in the same task that registers a new generator.
- If a commit fails because signing via 1Password is locked, stop and ask the user to unlock it. Never bypass signing.

## Domain notes for the implementer

- **Raw input vs display.** Keypad input is stored raw: the ASCII hyphen `-` for minus, and the characters `×` (U+00D7) and `^` for a factorization, e.g. `2^2×3×7`. Only the input model's `display` turns it into `2² × 3 × 7`. `StepAttempt.input` stays raw. `Feedback` and `ResultScreen` show it through `displayAnswer(kind, input)`.
- **Boolean answers** are the button labels: the exported constants `YES = 'Ja'` and `NO = 'Nee'` in `steps.ts`. `check('Ja')` compares strings.
- **A factorization is correct** when every base is prime, every exponent is ≥ 1, and the product equals `n`. Order and notation are free, so `2×2×3×7`, `2^2×3×7`, `7×3×2^2` and even `2^1×2×3×7` are all correct. `isPrimeFactorizationOf` multiplies one factor at a time and stops as soon as the product exceeds `n`, so a typed `2^99999999999999999999` costs nothing.
- **Parser scope.** The tokenizer knows every §7 token (`+ − × : ( ) ^`, integers, decimal commas, and the keypad's ASCII `-` as `−`). The parser only accepts `product := power ('×' power)*`, `power := atom ('^' atom)?` and `atom := number`. Anything else returns `null`. Bewerkingen extends `Expr` and the parser.
- **Close calls (spec §5.6).** A non-divisible number is `divisor × q + r`, with `r` from the remainder table. Where the table has two groups (6, 12, 14, 15), a group is picked first, so each group gets 50%. For those divisors, a non-divisible number is always divisible by exactly one of the two factors.
- **Chunking (*happen*, spec §5.6).** Take the quotient `q = ⌊n / d⌋`. Every non-zero digit of `q` gives one multiple of `d`, e.g. `2718 : 7` gives `q = 388`, so `2100 + 560 + 56`, followed by `rest 2` when there is a remainder.
- **Numbers in prompts** go through `formatInteger`, which inserts a narrow no-break space (U+202F) from 5 digits on (`27 180`). Tests must build expected prompts with `formatInteger(n)`, never with a literal. Explanations of digit rules use the plain digits (`String(n)`), because they talk about individual digits.
- **Glyphs used in this plan:** `×` U+00D7, `−` U+2212 (typographic minus, also `MINUS` in `format.ts`), `√` U+221A, `→` U+2192, superscripts `⁰¹²³⁴⁵⁶⁷⁸⁹`. All of them are visible characters; type them as shown.
- Never compare floats. All values in this set are small integers, so the integer helpers in `primes.ts` use plain `number`s. Only the factorization check uses `bigint`, because the user can type huge exponents.

## File structure

```
src/lib/
  primes.ts (+ .test.ts)            NEW gcd, lcm, isPrime, smallestPrimeFactor, primeFactors
  format.ts (+ .test.ts)            + formatPrimeFactors, formatFactorizationInput
  expr/
    tokenizer.ts (+ .test.ts)       NEW §7 tokens
    parser.ts (+ .test.ts)          NEW Expr AST; products of powers
  types.ts                          AnswerKind + boolean, factorization; Topic + six topics
  steps.ts (+ .test.ts)             + YES/NO, booleanStep, parseFactorization, factorizationStep
  keypadInput.ts (+ .test.ts)       + '×' and '^' keys, applyFactorizationKey
  inputModels.ts (+ .test.ts)       NEW per-kind keys, apply, validate, display; displayAnswer
  sets.ts (+ .test.ts)              + NUMBERS_SET, appended to PRACTICE_SETS
  session.test.ts                   Getallen & delers quotas
  topics/
    ratios.ts                       uses the shared gcd
    numberTheory.ts (+ .test.ts)    NEW lcm, gcd, prime, factorization
    divisibility.ts (+ .test.ts)    NEW divisibility rules and close calls
    squares.ts (+ .test.ts)         NEW squares and square roots
    index.ts                        registers the six generators and their labels
src/components/
  Keypad.svelte                     keys from the input model; OK fills the last row
  QuestionView.svelte (+ .test.ts)  model by kind; inline error; Ja/Nee buttons
  Feedback.svelte (+ .test.ts)      kind prop; answer via displayAnswer
  PlayScreen.svelte (+ .test.ts)    passes the step kind to Feedback
  ResultScreen.svelte (+ .test.ts)  answer via displayAnswer (test file is new)
src/App.test.ts                     Getallen & delers reachable from the overview
CLAUDE.md                           status, roadmap row, follow-ups, architecture
```

---

### Task 1: Shared integer helpers (`lib/primes.ts`)

**Files:**
- Create: `src/lib/primes.ts`
- Create: `src/lib/primes.test.ts`
- Modify: `src/lib/topics/ratios.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/primes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { gcd, isPrime, lcm, primeFactors, smallestPrimeFactor } from './primes';

function bruteGcd(a: number, b: number): number {
  for (let d = Math.min(a, b); d > 1; d--) {
    if (a % d === 0 && b % d === 0) return d;
  }
  return 1;
}

function bruteIsPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d < n; d++) if (n % d === 0) return false;
  return true;
}

describe('gcd and lcm', () => {
  it('match brute force for every pair up to 60', () => {
    for (let a = 1; a <= 60; a++) {
      for (let b = 1; b <= 60; b++) {
        expect(gcd(a, b)).toBe(bruteGcd(a, b));
        expect(lcm(a, b)).toBe((a * b) / bruteGcd(a, b));
      }
    }
  });

  it('handles zero', () => {
    expect(gcd(0, 5)).toBe(5);
    expect(gcd(0, 0)).toBe(0);
    expect(lcm(0, 5)).toBe(0);
  });
});

describe('isPrime', () => {
  it('matches brute force up to 1000', () => {
    for (let n = 0; n <= 1000; n++) expect(isPrime(n), String(n)).toBe(bruteIsPrime(n));
  });

  it('rejects negative numbers and non-integers', () => {
    for (const n of [-7, 2.5, Number.NaN]) expect(isPrime(n)).toBe(false);
  });
});

describe('smallestPrimeFactor', () => {
  it.each([
    [2, 2],
    [91, 7],
    [121, 11],
    [199, 199],
    [200, 2],
  ])('of %i is %i', (n, expected) => {
    expect(smallestPrimeFactor(n)).toBe(expected);
  });

  it('rejects numbers below 2', () => {
    expect(() => smallestPrimeFactor(1)).toThrow(RangeError);
  });
});

describe('primeFactors', () => {
  it('factorizes 84 as 2² × 3 × 7', () => {
    expect(primeFactors(84)).toEqual([
      { prime: 2, exponent: 2 },
      { prime: 3, exponent: 1 },
      { prime: 7, exponent: 1 },
    ]);
  });

  it('returns no factors for 1', () => {
    expect(primeFactors(1)).toEqual([]);
  });

  it('rebuilds every number up to 1000 from distinct ascending primes', () => {
    for (let n = 1; n <= 1000; n++) {
      const factors = primeFactors(n);
      const primes = factors.map(({ prime }) => prime);
      expect(factors.reduce((product, f) => product * f.prime ** f.exponent, 1)).toBe(n);
      expect(factors.every((f) => bruteIsPrime(f.prime) && f.exponent >= 1)).toBe(true);
      expect(primes).toEqual([...primes].sort((x, y) => x - y));
      expect(new Set(primes).size).toBe(primes.length);
    }
  });

  it('rejects numbers below 1', () => {
    expect(() => primeFactors(0)).toThrow(RangeError);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/primes.test.ts`
Expected: FAIL, because `./primes` cannot be resolved.

- [ ] **Step 3: Write the implementation**

Create `src/lib/primes.ts`:

```ts
/** Greatest common divisor; gcd(0, 0) = 0. */
export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

/** Least common multiple; 0 when either number is 0. */
export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return (Math.abs(a) / gcd(a, b)) * Math.abs(b);
}

/** Trial division: fast enough for the numbers in this app (at most 5 digits). */
export function isPrime(n: number): boolean {
  if (!Number.isSafeInteger(n) || n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

export function smallestPrimeFactor(n: number): number {
  if (!Number.isSafeInteger(n) || n < 2) throw new RangeError(`No prime factor: ${n}`);
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return d;
  return n;
}

export interface PrimePower {
  prime: number;
  exponent: number;
}

/** Ascending by prime: 84 → 2², 3, 7. Returns no factors for 1. */
export function primeFactors(n: number): PrimePower[] {
  if (!Number.isSafeInteger(n) || n < 1) throw new RangeError(`Cannot factorize ${n}`);
  const factors: PrimePower[] = [];
  let rest = n;
  while (rest > 1) {
    const prime = smallestPrimeFactor(rest);
    let exponent = 0;
    while (rest % prime === 0) {
      rest /= prime;
      exponent++;
    }
    factors.push({ prime, exponent });
  }
  return factors;
}
```

- [ ] **Step 4: Reuse the shared `gcd` in `ratios.ts`**

In `src/lib/topics/ratios.ts`, add after the `../format` import:

```ts
import { gcd } from '../primes';
```

and delete the private helper:

```ts
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

```

(`ratios.test.ts` keeps its own `gcd` helper; tests stay independent of the code under test.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/lib/primes.test.ts src/lib/topics/ratios.test.ts`
Expected: PASS.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add src/lib/primes.ts src/lib/primes.test.ts src/lib/topics/ratios.ts
git commit -m "feat: add shared prime and divisor helpers" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Factorization formatting (`lib/format.ts`)

The expected answer is shown as `2² × 3 × 7` (spec §5.5). While typing, the raw input `2^2×3×7` is shown the same way (spec §6).

**Files:**
- Modify: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/lib/format.test.ts`, replace the import block from `./format` with

```ts
import {
  formatDuration,
  formatEuro,
  formatFactorizationInput,
  formatFraction,
  formatInput,
  formatInteger,
  formatMoney,
  formatPowerOfTen,
  formatPrimeFactors,
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
describe('formatPrimeFactors', () => {
  it.each([
    [
      [
        { prime: 2, exponent: 2 },
        { prime: 3, exponent: 1 },
        { prime: 7, exponent: 1 },
      ],
      '2² × 3 × 7',
    ],
    [[{ prime: 2, exponent: 7 }], '2⁷'],
    [[{ prime: 13, exponent: 1 }], '13'],
    [
      [
        { prime: 2, exponent: 10 },
        { prime: 5, exponent: 1 },
      ],
      '2¹⁰ × 5',
    ],
  ])('formats %j as %s', (factors, expected) => {
    expect(formatPrimeFactors(factors)).toBe(expected);
  });
});

describe('formatFactorizationInput', () => {
  it.each([
    ['', ''],
    ['2', '2'],
    ['2^', '2^'],
    ['2^2', '2²'],
    ['2^2×3×7', '2² × 3 × 7'],
    ['2^10', '2¹⁰'],
    ['2^02', '2⁰²'],
    ['13×', '13 × '],
  ])('shows %j as %j', (raw, expected) => {
    expect(formatFactorizationInput(raw)).toBe(expected);
  });

  it('writes exponents of any length digit by digit', () => {
    expect(formatFactorizationInput(`2^${'9'.repeat(18)}`)).toBe(`2${'⁹'.repeat(18)}`);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/format.test.ts`
Expected: FAIL, with `formatPrimeFactors is not a function`.

- [ ] **Step 3: Write the implementation**

In `src/lib/format.ts`, add at the top:

```ts
import type { PrimePower } from './primes';
```

and append:

```ts
/** Canonical prime factorization: '2² × 3 × 7' (spec §5.5). */
export function formatPrimeFactors(factors: readonly PrimePower[]): string {
  return factors
    .map(({ prime, exponent }) => formatInteger(prime) + (exponent === 1 ? '' : toSuperscript(exponent)))
    .join(' × ');
}

/** Digit by digit, so a typed exponent of any length (or with a leading zero) is shown as is. */
function superscriptDigits(digits: string): string {
  return digits.replace(/\d/g, (digit) => SUPERSCRIPT_DIGITS.charAt(Number(digit)));
}

/** Factorization keypad input '2^2×3×7' as '2² × 3 × 7'. A '^' without exponent stays visible. */
export function formatFactorizationInput(raw: string): string {
  return raw
    .replace(/\^(\d+)/g, (_match, digits: string) => superscriptDigits(digits))
    .replaceAll('×', ' × ');
}
```

`SUPERSCRIPT_DIGITS` is the existing module constant above `toSuperscript`. A `const` is only read when the function runs, so appending below it is fine.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/format.test.ts`
Expected: PASS.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: format prime factorizations and factorization input" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Expression tokenizer and product parser (`lib/expr`)

The first piece of the §7 engine. The tokenizer is complete; the parser handles only what a factorization needs.

**Files:**
- Create: `src/lib/expr/tokenizer.ts`, `src/lib/expr/tokenizer.test.ts`
- Create: `src/lib/expr/parser.ts`, `src/lib/expr/parser.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/expr/tokenizer.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { rational } from '../rational';
import { tokenize } from './tokenizer';

describe('tokenize', () => {
  it('reads integers, decimal commas, operators and parentheses', () => {
    expect(tokenize('12 + 3,5 × (4 − 2) : 6 ^ 2')).toEqual([
      { type: 'number', value: rational(12n) },
      { type: 'operator', operator: '+' },
      { type: 'number', value: rational(7n, 2n) },
      { type: 'operator', operator: '×' },
      { type: 'open' },
      { type: 'number', value: rational(4n) },
      { type: 'operator', operator: '−' },
      { type: 'number', value: rational(2n) },
      { type: 'close' },
      { type: 'operator', operator: ':' },
      { type: 'number', value: rational(6n) },
      { type: 'operator', operator: '^' },
      { type: 'number', value: rational(2n) },
    ]);
  });

  it('reads the keypad hyphen as a minus', () => {
    expect(tokenize('5-3')).toEqual([
      { type: 'number', value: rational(5n) },
      { type: 'operator', operator: '−' },
      { type: 'number', value: rational(3n) },
    ]);
  });

  it('returns no tokens for empty or blank input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('  ')).toEqual([]);
  });

  it.each(['2 x 3', '2*3', 'a', '2.5', '1/2', ',', '2,'])('rejects %j', (input) => {
    expect(tokenize(input)).toBeNull();
  });
});
```

Create `src/lib/expr/parser.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { rational } from '../rational';
import { parse, type Expr } from './parser';

function num(value: bigint): Expr {
  return { type: 'number', value: rational(value) };
}

describe('parse', () => {
  it('parses a single number', () => {
    expect(parse('84')).toEqual(num(84n));
  });

  it('parses a product from left to right', () => {
    expect(parse('2×3×7')).toEqual({
      type: 'binary',
      operator: '×',
      left: { type: 'binary', operator: '×', left: num(2n), right: num(3n) },
      right: num(7n),
    });
  });

  it('binds ^ tighter than ×', () => {
    expect(parse('2^2×3')).toEqual({
      type: 'binary',
      operator: '×',
      left: { type: 'power', base: num(2n), exponent: num(2n) },
      right: num(3n),
    });
  });

  it('ignores whitespace', () => {
    expect(parse(' 2 ^ 2 × 3 ')).toEqual(parse('2^2×3'));
  });

  it('keeps decimals as exact numbers', () => {
    expect(parse('2,5')).toEqual({ type: 'number', value: rational(5n, 2n) });
  });

  it.each(['', '×', '2×', '×2', '2^', '^2', '2^3^4', '2××3', '2 3', '(2)', '2+3', '2:3', '-2', 'x'])(
    'rejects %j',
    (input) => {
      expect(parse(input)).toBeNull();
    },
  );
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/expr`
Expected: FAIL, because `./tokenizer` and `./parser` cannot be resolved.

- [ ] **Step 3: Write the tokenizer**

Create `src/lib/expr/tokenizer.ts`:

```ts
import { parseDutchNumber, type Rational } from '../rational';

export type Operator = '+' | '−' | '×' | ':' | '^';

export type Token =
  | { type: 'number'; value: Rational }
  | { type: 'operator'; operator: Operator }
  | { type: 'open' }
  | { type: 'close' };

// Integers and Dutch decimals: '12', '3,5'.
const NUMBER = /^\d+(?:,\d+)?/;

const OPERATORS = new Map<string, Operator>([
  ['+', '+'],
  ['−', '−'],
  // The keypad types an ASCII hyphen for minus.
  ['-', '−'],
  ['×', '×'],
  [':', ':'],
  ['^', '^'],
]);

/** Splits input into the tokens of spec §7, skipping whitespace. Null for any other character. */
export function tokenize(input: string): Token[] | null {
  const tokens: Token[] = [];
  let rest = input;
  while (rest !== '') {
    const number = NUMBER.exec(rest);
    if (number) {
      tokens.push({ type: 'number', value: parseDutchNumber(number[0])! });
      rest = rest.slice(number[0].length);
      continue;
    }
    const char = rest[0]!;
    const operator = OPERATORS.get(char);
    if (operator) tokens.push({ type: 'operator', operator });
    else if (char === '(') tokens.push({ type: 'open' });
    else if (char === ')') tokens.push({ type: 'close' });
    else if (!/\s/.test(char)) return null;
    rest = rest.slice(1);
  }
  return tokens;
}
```

- [ ] **Step 4: Write the parser**

Create `src/lib/expr/parser.ts`:

```ts
import type { Rational } from '../rational';
import { tokenize, type Operator, type Token } from './tokenizer';

/**
 * Expression AST (spec §7). Getallen & delers only needs products of powers of numbers;
 * Bewerkingen adds +, −, :, groups and unary minus.
 */
export type Expr =
  | { type: 'number'; value: Rational }
  | { type: 'binary'; operator: '×'; left: Expr; right: Expr }
  | { type: 'power'; base: Expr; exponent: Expr };

/**
 * Recursive descent over `product := power ('×' power)*`, `power := atom ('^' atom)?` and
 * `atom := number`. Returns null for any syntax error.
 */
export function parse(input: string): Expr | null {
  const tokenized = tokenize(input);
  if (tokenized === null) return null;
  const tokens: readonly Token[] = tokenized;
  let position = 0;

  function isOperator(operator: Operator): boolean {
    const token = tokens[position];
    return token?.type === 'operator' && token.operator === operator;
  }

  function atom(): Expr | null {
    const token = tokens[position];
    if (token?.type !== 'number') return null;
    position++;
    return { type: 'number', value: token.value };
  }

  function power(): Expr | null {
    const base = atom();
    if (base === null || !isOperator('^')) return base;
    position++;
    const exponent = atom();
    return exponent === null ? null : { type: 'power', base, exponent };
  }

  function product(): Expr | null {
    let left = power();
    while (left !== null && isOperator('×')) {
      position++;
      const right = power();
      left = right === null ? null : { type: 'binary', operator: '×', left, right };
    }
    return left;
  }

  const expr = product();
  return expr !== null && position === tokens.length ? expr : null;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/lib/expr`
Expected: PASS.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add src/lib/expr
git commit -m "feat: add expression tokenizer and product parser" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: The `boolean` and `factorization` answer kinds (`lib/steps.ts`)

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/steps.ts`
- Test: `src/lib/steps.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/lib/steps.test.ts`, replace the import from `./steps` with

```ts
import {
  booleanStep,
  factorizationStep,
  fractionStep,
  NO,
  numberStep,
  parseAnswer,
  parseFactorization,
  YES,
} from './steps';
```

and append:

```ts
describe('booleanStep', () => {
  const step = booleanStep({
    prompt: 'Is 91 een priemgetal?',
    answer: false,
    explanation: '91 = 7 × 13',
  });

  it('is a boolean step answered with Ja or Nee', () => {
    expect(step.kind).toBe('boolean');
    expect(step.prompt).toBe('Is 91 een priemgetal?');
    expect([YES, NO]).toEqual(['Ja', 'Nee']);
  });

  it('accepts the right label and reports the expected one', () => {
    expect(step.check(NO)).toEqual({ correct: true, expected: 'Nee', explanation: '91 = 7 × 13' });
    expect(step.check(YES)).toEqual({ correct: false, expected: 'Nee', explanation: '91 = 7 × 13' });
  });

  it('shows Ja as the expected answer for a true statement', () => {
    expect(booleanStep({ prompt: 'Is 13 een priemgetal?', answer: true }).check(NO).expected).toBe(
      'Ja',
    );
  });
});

describe('parseFactorization', () => {
  it('collects every base with its exponent', () => {
    expect(parseFactorization('2^2×3×7')).toEqual([
      { base: 2n, exponent: 2n },
      { base: 3n, exponent: 1n },
      { base: 7n, exponent: 1n },
    ]);
    expect(parseFactorization('84')).toEqual([{ base: 84n, exponent: 1n }]);
  });

  it.each(['', '2×', '2^', '2,5×2', '2^1,5', '2+3', '(2)'])('rejects %j', (input) => {
    expect(parseFactorization(input)).toBeNull();
  });
});

describe('factorizationStep', () => {
  const step = factorizationStep({
    prompt: 'Ontbind 84 in priemfactoren',
    value: 84,
    explanation: '84 : 2 = 42, 42 : 2 = 21, 21 : 3 = 7',
  });

  it('is a factorization step that shows the canonical form', () => {
    expect(step.kind).toBe('factorization');
    expect(step.check('')).toEqual({
      correct: false,
      expected: '2² × 3 × 7',
      explanation: '84 : 2 = 42, 42 : 2 = 21, 21 : 3 = 7',
    });
  });

  it.each(['2×2×3×7', '2^2×3×7', '7×3×2^2', '3×2^1×7×2'])('accepts %j', (input) => {
    expect(step.check(input).correct).toBe(true);
  });

  it.each([
    '4×3×7',
    '2^2×21',
    '84',
    '2^2×3×7×1',
    '2^0×2^2×3×7',
    '2^3×3×7',
    '2×3×7',
    '2×',
    '',
    '2^99999999999999999999',
  ])('rejects %j', (input) => {
    expect(step.check(input).correct).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/steps.test.ts`
Expected: FAIL, with `booleanStep is not a function`.

- [ ] **Step 3: Widen `AnswerKind`**

In `src/lib/types.ts`, replace

```ts
/** Later plans add 'boolean' | 'expression' | 'factorization' (spec §6). */
export type AnswerKind = 'number' | 'fraction';
```

with

```ts
/** Bewerkingen adds 'expression' (spec §6). */
export type AnswerKind = 'number' | 'fraction' | 'boolean' | 'factorization';
```

- [ ] **Step 4: Write the implementation**

In `src/lib/steps.ts`, replace the import block with

```ts
import { parse, type Expr } from './expr/parser';
import { formatFraction, formatPrimeFactors, formatRational } from './format';
import { isPrime, primeFactors } from './primes';
import { decimalPlaces, equals, parseDutchNumber, parseFraction, type Rational } from './rational';
import type { AnswerKind, Step } from './types';
```

and append:

```ts
/** Labels of the two buttons of a boolean step; the tapped label is the input (spec §6). */
export const YES = 'Ja';
export const NO = 'Nee';

export interface BooleanStepOptions {
  prompt: string;
  answer: boolean;
  explanation?: string;
}

export function booleanStep({ prompt, answer, explanation }: BooleanStepOptions): Step {
  const expected = answer ? YES : NO;
  return {
    kind: 'boolean',
    prompt,
    check: (input) => ({ correct: input === expected, expected, explanation }),
  };
}

export interface Factor {
  base: bigint;
  exponent: bigint;
}

/** '2^2×3×7' → 2², 3, 7: integers joined by ×, each with an optional integer exponent. */
export function parseFactorization(input: string): Factor[] | null {
  const expr = parse(input);
  if (expr === null) return null;
  const factors: Factor[] = [];
  const integer = (node: Expr): bigint | null =>
    node.type === 'number' && node.value.den === 1n ? node.value.num : null;
  const collect = (node: Expr): boolean => {
    if (node.type === 'binary') return collect(node.left) && collect(node.right);
    const base = integer(node.type === 'power' ? node.base : node);
    const exponent = node.type === 'power' ? integer(node.exponent) : 1n;
    if (base === null || exponent === null) return false;
    factors.push({ base, exponent });
    return true;
  };
  return collect(expr) ? factors : null;
}

export interface FactorizationStepOptions {
  prompt: string;
  value: number;
  explanation?: string;
}

/** Every base prime, every exponent ≥ 1, product = value; order and notation are free (§5.5). */
export function factorizationStep({ prompt, value, explanation }: FactorizationStepOptions): Step {
  const expected = formatPrimeFactors(primeFactors(value));
  return {
    kind: 'factorization',
    prompt,
    check(input) {
      const factors = parseFactorization(input);
      const correct = factors !== null && isPrimeFactorizationOf(factors, value);
      return { correct, expected, explanation };
    },
  };
}

function isPrimeFactorizationOf(factors: readonly Factor[], value: number): boolean {
  const target = BigInt(value);
  let product = 1n;
  for (const { base, exponent } of factors) {
    if (exponent < 1n || base > target || !isPrime(Number(base))) return false;
    // One factor at a time with an early exit, so a typed 2^99999999 costs nothing.
    for (let i = 0n; i < exponent; i++) {
      product *= base;
      if (product > target) return false;
    }
  }
  return product === target;
}
```

`parseAnswer` stays as it is. It only makes sense for `number` and `fraction` steps, and only those call it.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/lib/steps.test.ts`
Expected: PASS.

Run: `npm test`
Expected: PASS. No generator produces the new kinds yet.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/steps.ts src/lib/steps.test.ts
git commit -m "feat: add boolean and factorization answer kinds" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Factorization keys in the input reducer (`lib/keypadInput.ts`)

**Files:**
- Modify: `src/lib/keypadInput.ts`
- Test: `src/lib/keypadInput.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/lib/keypadInput.test.ts`, replace the import with

```ts
import {
  applyFactorizationKey,
  applyKey,
  MAX_FACTORIZATION_LENGTH,
  MAX_INPUT_LENGTH,
  type KeypadKey,
} from './keypadInput';
```

add inside `describe('applyKey', …)`:

```ts
  it('ignores the factorization keys', () => {
    expect(type(['2', '×', '^'])).toBe('2');
  });
```

and append:

```ts
describe('applyFactorizationKey', () => {
  function typeFactors(keys: KeypadKey[], start = ''): string {
    return keys.reduce(applyFactorizationKey, start);
  }

  it('builds a factorization from digits, × and ^', () => {
    expect(typeFactors(['2', '^', '2', '×', '3', '×', '7'])).toBe('2^2×3×7');
    expect(typeFactors(['1', '3', '×', '1', '3'])).toBe('13×13');
  });

  it('allows × only directly after a digit', () => {
    expect(typeFactors(['×'])).toBe('');
    expect(typeFactors(['2', '×', '×'])).toBe('2×');
    expect(typeFactors(['2', '^', '×'])).toBe('2^');
  });

  it('allows ^ only directly after a base', () => {
    expect(typeFactors(['^'])).toBe('');
    expect(typeFactors(['2', '×', '^'])).toBe('2×');
    expect(typeFactors(['2', '^', '^'])).toBe('2^');
    expect(typeFactors(['2', '^', '3', '^'])).toBe('2^3');
    expect(typeFactors(['2', '^', '3', '×', '5', '^', '2'])).toBe('2^3×5^2');
  });

  it('ignores the comma, the minus and the slash', () => {
    expect(typeFactors(['2', ',', '-', '/'])).toBe('2');
  });

  it('removes the last character on backspace', () => {
    expect(typeFactors(['2', '^', 'backspace', '×'])).toBe('2×');
    expect(typeFactors(['backspace'])).toBe('');
  });

  it('limits the length but still allows backspace', () => {
    const full = `${'2×'.repeat(9)}22`;
    expect(full).toHaveLength(MAX_FACTORIZATION_LENGTH);
    expect(applyFactorizationKey(full, '3')).toBe(full);
    expect(applyFactorizationKey(full, '×')).toBe(full);
    expect(applyFactorizationKey(full, 'backspace')).toBe(full.slice(0, -1));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/keypadInput.test.ts`
Expected: FAIL, with `applyFactorizationKey is not a function` (and `'2×^'` instead of `'2'` for `applyKey`).

- [ ] **Step 3: Write the implementation**

In `src/lib/keypadInput.ts`, replace

```ts
export type KeypadKey = DigitKey | ',' | '-' | '/' | 'backspace';
```

with

```ts
export type KeypadKey = DigitKey | ',' | '-' | '/' | '×' | '^' | 'backspace';
```

In `applyKey`, insert before `default:`:

```ts
    case '×':
    case '^':
      return value;
```

Append:

```ts
/** The longest useful input is 2×2×2×2×2×2×2 (128, 13 characters); 20 leaves room. */
export const MAX_FACTORIZATION_LENGTH = 20;

/**
 * Factorization input (spec §6): integers joined by ×, each with an optional exponent.
 * × only directly after a digit; ^ only directly after a base, so never after an exponent.
 */
export function applyFactorizationKey(value: string, key: KeypadKey): string {
  if (key === 'backspace') return value.slice(0, -1);
  if (value.length >= MAX_FACTORIZATION_LENGTH) return value;
  const endsWithDigit = /\d$/.test(value);
  const currentFactor = value.slice(value.lastIndexOf('×') + 1);
  switch (key) {
    case '×':
      return endsWithDigit ? `${value}×` : value;
    case '^':
      return endsWithDigit && !currentFactor.includes('^') ? `${value}^` : value;
    case ',':
    case '-':
    case '/':
      return value;
    default:
      return value + key;
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
git commit -m "feat: add factorization keys to keypad input" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Per-kind input models (`lib/inputModels.ts`)

One place that knows, per answer kind, which keys exist, how a key changes the input, when the input can be submitted and how it is shown. `Keypad`, `QuestionView`, `Feedback` and `ResultScreen` read from it in Task 7.

**Files:**
- Create: `src/lib/inputModels.ts`
- Create: `src/lib/inputModels.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/inputModels.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  displayAnswer,
  INPUT_MODELS,
  INVALID_FACTORIZATION,
  INVALID_NUMBER,
  okSpan,
  type KeypadKind,
} from './inputModels';

function labels(kind: KeypadKind): string[] {
  return INPUT_MODELS[kind].keys.map(({ label }) => label);
}

function ariaLabels(kind: KeypadKind): string[] {
  return INPUT_MODELS[kind].keys.map(({ label, ariaLabel }) => ariaLabel ?? label);
}

const DIGIT_ROWS = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];

describe('INPUT_MODELS keys', () => {
  it('lays out the number keypad', () => {
    expect(labels('number')).toEqual([...DIGIT_ROWS, '−', '0', ',', '⌫']);
    expect(ariaLabels('number').slice(-4)).toEqual(['min', '0', 'komma', 'wissen']);
  });

  it('adds the slash for fractions', () => {
    expect(labels('fraction')).toEqual([...DIGIT_ROWS, '−', '0', ',', '⌫', '/']);
    expect(ariaLabels('fraction').at(-1)).toBe('breukstreep');
  });

  it('offers × and ^ instead of minus and comma for factorizations', () => {
    expect(labels('factorization')).toEqual([...DIGIT_ROWS, '×', '0', '^', '⌫']);
    expect(ariaLabels('factorization').slice(-4)).toEqual(['keer', '0', 'tot de macht', 'wissen']);
  });

  it('lets OK fill the last row of the 3-column grid', () => {
    expect(okSpan(INPUT_MODELS.number)).toBe(2);
    expect(okSpan(INPUT_MODELS.fraction)).toBe(1);
    expect(okSpan(INPUT_MODELS.factorization)).toBe(2);
  });
});

describe('INPUT_MODELS behaviour', () => {
  it('uses the reducer of its kind', () => {
    expect(INPUT_MODELS.number.apply('2', '×')).toBe('2');
    expect(INPUT_MODELS.fraction.apply('2', '/')).toBe('2/');
    expect(INPUT_MODELS.factorization.apply('2', '^')).toBe('2^');
    expect(INPUT_MODELS.factorization.apply('2', ',')).toBe('2');
  });

  it.each([
    ['number', '12', null],
    ['number', '-12,5', null],
    ['number', '-', INVALID_NUMBER],
    ['number', ',', INVALID_NUMBER],
    ['fraction', '25/2', null],
    ['fraction', '12,5', null],
    ['fraction', '25/', INVALID_NUMBER],
    ['fraction', '25/0', INVALID_NUMBER],
    ['factorization', '2^2×3', null],
    ['factorization', '84', null],
    ['factorization', '2×', INVALID_FACTORIZATION],
    ['factorization', '2^', INVALID_FACTORIZATION],
  ] as const)('validates %s input %j as %j', (kind, value, expected) => {
    expect(INPUT_MODELS[kind].validate(value)).toBe(expected);
  });

  it('uses the Dutch messages from the spec', () => {
    expect(INVALID_NUMBER).toBe('Ongeldig getal');
    expect(INVALID_FACTORIZATION).toBe('Ongeldige ontbinding');
  });

  it('pretty-prints the input', () => {
    expect(INPUT_MODELS.number.display('-12,5')).toBe('−12,5');
    expect(INPUT_MODELS.fraction.display('-3/4')).toBe('−3/4');
    expect(INPUT_MODELS.factorization.display('2^2×3')).toBe('2² × 3');
  });
});

describe('displayAnswer', () => {
  it('shows a given answer like the input field did', () => {
    expect(displayAnswer('number', '-5')).toBe('−5');
    expect(displayAnswer('factorization', '2^2×21')).toBe('2² × 21');
    expect(displayAnswer('boolean', 'Ja')).toBe('Ja');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/inputModels.test.ts`
Expected: FAIL, because `./inputModels` cannot be resolved.

- [ ] **Step 3: Write the implementation**

Create `src/lib/inputModels.ts`:

```ts
import { formatFactorizationInput, formatInput } from './format';
import { applyFactorizationKey, applyKey, type DigitKey, type KeypadKey } from './keypadInput';
import { parseAnswer, parseFactorization } from './steps';
import type { AnswerKind } from './types';

export interface KeyDef {
  key: KeypadKey;
  label: string;
  ariaLabel?: string;
}

/** Everything that differs per answer kind on the keypad (spec §6). */
export interface InputModel {
  /** Keys in reading order on a 3-column grid; OK fills the rest of the last row. */
  keys: readonly KeyDef[];
  apply(value: string, key: KeypadKey): string;
  /** Null when the input can be submitted, otherwise the inline error. */
  validate(value: string): string | null;
  /** The raw input as shown while typing, in the feedback and in the results. */
  display(value: string): string;
}

/** Ja/Nee has no keypad: QuestionView shows two buttons instead. */
export type KeypadKind = Exclude<AnswerKind, 'boolean'>;

export const INVALID_NUMBER = 'Ongeldig getal';
export const INVALID_FACTORIZATION = 'Ongeldige ontbinding';

const digit = (key: DigitKey): KeyDef => ({ key, label: key });
const DIGIT_ROWS: readonly KeyDef[] = (['7', '8', '9', '4', '5', '6', '1', '2', '3'] as const).map(
  digit,
);
const BACKSPACE: KeyDef = { key: 'backspace', label: '⌫', ariaLabel: 'wissen' };

const NUMBER_KEYS: readonly KeyDef[] = [
  ...DIGIT_ROWS,
  { key: '-', label: '−', ariaLabel: 'min' },
  digit('0'),
  { key: ',', label: ',', ariaLabel: 'komma' },
  BACKSPACE,
];

function numericModel(kind: 'number' | 'fraction', keys: readonly KeyDef[]): InputModel {
  return {
    keys,
    apply: applyKey,
    validate: (value) => (parseAnswer(kind, value) === null ? INVALID_NUMBER : null),
    display: formatInput,
  };
}

export const INPUT_MODELS: Record<KeypadKind, InputModel> = {
  number: numericModel('number', NUMBER_KEYS),
  fraction: numericModel('fraction', [
    ...NUMBER_KEYS,
    { key: '/', label: '/', ariaLabel: 'breukstreep' },
  ]),
  factorization: {
    keys: [
      ...DIGIT_ROWS,
      { key: '×', label: '×', ariaLabel: 'keer' },
      digit('0'),
      { key: '^', label: '^', ariaLabel: 'tot de macht' },
      BACKSPACE,
    ],
    apply: applyFactorizationKey,
    validate: (value) => (parseFactorization(value) === null ? INVALID_FACTORIZATION : null),
    display: formatFactorizationInput,
  },
};

/** A given answer as it was shown while typing; Ja and Nee are shown as they are. */
export function displayAnswer(kind: AnswerKind, input: string): string {
  return kind === 'boolean' ? input : INPUT_MODELS[kind].display(input);
}

/** Columns that OK spans, so that it fills the last row of the 3-column keypad. */
export function okSpan(model: InputModel): number {
  return 3 - (model.keys.length % 3);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/inputModels.test.ts`
Expected: PASS.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/inputModels.ts src/lib/inputModels.test.ts
git commit -m "feat: add per-kind input models" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Input models, inline errors and Ja/Nee buttons in the UI

**Files:**
- Modify: `src/components/Keypad.svelte`
- Modify: `src/components/QuestionView.svelte`, `src/components/QuestionView.test.ts`
- Modify: `src/components/Feedback.svelte`, `src/components/Feedback.test.ts`
- Modify: `src/components/PlayScreen.svelte`, `src/components/PlayScreen.test.ts`
- Modify: `src/components/ResultScreen.svelte`
- Create: `src/components/ResultScreen.test.ts`

- [ ] **Step 1: Write the failing tests**

Replace the whole content of `src/components/QuestionView.test.ts` with:

```ts
// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { fromInteger, rational } from '../lib/rational';
import { booleanStep, factorizationStep, fractionStep, numberStep } from '../lib/steps';
import QuestionView from './QuestionView.svelte';

const step = numberStep({ prompt: '3 × 4 = ?', answer: fromInteger(12) });

function answerText(): string {
  return screen.getByLabelText('Jouw antwoord').textContent?.trim() ?? '';
}

function okButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'OK' }) as HTMLButtonElement;
}

function errorText(): string {
  return screen.getByRole('alert').textContent?.trim() ?? '';
}

async function press(...names: string[]) {
  for (const name of names) await fireEvent.click(screen.getByRole('button', { name }));
}

describe('QuestionView', () => {
  it('shows the unit suffix next to the answer', () => {
    const withUnit = numberStep({
      prompt: '3,5 L = ? cm³',
      answer: fromInteger(3500),
      suffix: 'cm³',
    });
    render(QuestionView, { props: { step: withUnit, onanswer: vi.fn() } });
    expect(answerText()).toBe('?cm³');
  });

  it('shows the prompt, an empty answer, no error and a disabled OK', () => {
    render(QuestionView, { props: { step, onanswer: vi.fn() } });
    expect(screen.getByText('3 × 4 = ?')).toBeTruthy();
    expect(answerText()).toBe('?');
    expect(errorText()).toBe('');
    expect(okButton().disabled).toBe(true);
  });

  it('builds the answer from key presses and submits the checked result', async () => {
    const onanswer = vi.fn();
    render(QuestionView, { props: { step, onanswer } });
    await press('1', '2');
    expect(answerText()).toBe('12');
    await press('OK');
    expect(onanswer).toHaveBeenCalledWith('12', { correct: true, expected: '12' });
  });

  it('shows a typographic minus, supports backspace and disables OK only when empty', async () => {
    render(QuestionView, { props: { step, onanswer: vi.fn() } });
    await press('min', '5');
    expect(answerText()).toBe('−5');
    await press('wissen');
    expect(answerText()).toBe('−');
    expect(okButton().disabled).toBe(false);
    await press('wissen');
    expect(answerText()).toBe('?');
    expect(okButton().disabled).toBe(true);
  });

  it('rejects invalid input inline without using up the attempt', async () => {
    const onanswer = vi.fn();
    render(QuestionView, { props: { step, onanswer } });
    await press('min', 'OK');
    expect(errorText()).toBe('Ongeldig getal');
    expect(onanswer).not.toHaveBeenCalled();

    await press('5');
    expect(errorText()).toBe('');
    await press('OK');
    expect(onanswer).toHaveBeenCalledWith(
      '-5',
      expect.objectContaining({ correct: false, expected: '12' }),
    );
  });

  it('shows the euro prefix before the answer', () => {
    const money = numberStep({
      prompt: '€ 60 na 25% korting = ?',
      answer: fromInteger(45),
      prefix: '€',
    });
    render(QuestionView, { props: { step: money, onanswer: vi.fn() } });
    expect(answerText()).toBe('€?');
  });

  it('offers the fraction slash and the factorization keys only for their kinds', () => {
    render(QuestionView, { props: { step, onanswer: vi.fn() } });
    expect(screen.queryByRole('button', { name: 'breukstreep' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'keer' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'tot de macht' })).toBeNull();
  });

  it('accepts a typed fraction and rejects an incomplete one inline', async () => {
    const onanswer = vi.fn();
    const percent = fractionStep({
      prompt: '10 is ?% van 80',
      answer: rational(25n, 2n),
      suffix: '%',
    });
    render(QuestionView, { props: { step: percent, onanswer } });
    await press('2', '5', 'breukstreep');
    expect(answerText()).toBe('25/%');
    await press('OK');
    expect(errorText()).toBe('Ongeldig getal');
    expect(onanswer).not.toHaveBeenCalled();

    await press('2');
    expect(answerText()).toBe('25/2%');
    await press('OK');
    expect(onanswer).toHaveBeenCalledWith(
      '25/2',
      expect.objectContaining({ correct: true, expected: '12,5 of 25/2' }),
    );
  });

  it('rejects a zero denominator inline', async () => {
    const onanswer = vi.fn();
    const fraction = fractionStep({ prompt: '1 : 2 = ?', answer: rational(1n, 2n) });
    render(QuestionView, { props: { step: fraction, onanswer } });
    await press('1', 'breukstreep', '0', 'OK');
    expect(errorText()).toBe('Ongeldig getal');
    expect(onanswer).not.toHaveBeenCalled();
  });

  it('types a factorization with × and ^ and shows it pretty-printed', async () => {
    const onanswer = vi.fn();
    const factorization = factorizationStep({ prompt: 'Ontbind 84 in priemfactoren', value: 84 });
    render(QuestionView, { props: { step: factorization, onanswer } });
    expect(screen.queryByRole('button', { name: 'komma' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'min' })).toBeNull();

    await press('2', 'tot de macht', '2', 'keer', '3', 'keer');
    expect(answerText()).toBe('2² × 3 ×');
    await press('OK');
    expect(errorText()).toBe('Ongeldige ontbinding');
    expect(onanswer).not.toHaveBeenCalled();

    await press('7', 'OK');
    expect(onanswer).toHaveBeenCalledWith(
      '2^2×3×7',
      expect.objectContaining({ correct: true, expected: '2² × 3 × 7' }),
    );
  });

  it('answers a Ja/Nee step with a single tap and shows no keypad', async () => {
    const onanswer = vi.fn();
    const prime = booleanStep({ prompt: 'Is 91 een priemgetal?', answer: false });
    render(QuestionView, { props: { step: prime, onanswer } });
    expect(screen.queryByRole('button', { name: 'OK' })).toBeNull();
    expect(screen.queryByLabelText('Jouw antwoord')).toBeNull();

    await press('Nee');
    expect(onanswer).toHaveBeenCalledWith(
      'Nee',
      expect.objectContaining({ correct: true, expected: 'Nee' }),
    );
    await press('Ja');
    expect(onanswer).toHaveBeenCalledOnce();
  });
});
```

In `src/components/Feedback.test.ts`, add `kind: 'number'` to the props of both existing tests: change

```ts
      props: { prompt: '3 × 4 = ?', input: '12', result: { correct: true, expected: '12' }, onnext },
```

to

```ts
      props: {
        prompt: '3 × 4 = ?',
        kind: 'number',
        input: '12',
        result: { correct: true, expected: '12' },
        onnext,
      },
```

and change

```ts
        prompt: '91 : 7 = ?',
        input: '-12',
```

to

```ts
        prompt: '91 : 7 = ?',
        kind: 'number',
        input: '-12',
```

Then append inside `describe('Feedback', …)`:

```ts
  it('shows a factorization answer pretty-printed', () => {
    render(Feedback, {
      props: {
        prompt: 'Ontbind 84 in priemfactoren',
        kind: 'factorization',
        input: '2^2×21',
        result: { correct: false, expected: '2² × 3 × 7' },
        onnext: vi.fn(),
      },
    });
    expect(screen.getByText('2² × 21')).toBeTruthy();
    expect(screen.getByText('2² × 3 × 7')).toBeTruthy();
  });
```

In `src/components/PlayScreen.test.ts`, replace

```ts
import { numberStep } from '../lib/steps';
```

with

```ts
import { booleanStep, numberStep } from '../lib/steps';
```

and append inside `describe('PlayScreen', …)`:

```ts
  it('takes a Ja/Nee answer with one tap and shows it in the feedback', async () => {
    const onfinish = vi.fn<(records: QuestionRecord[], totalMs: number) => void>();
    const prime: Question = {
      key: 'prime:91',
      topic: 'tables',
      steps: [
        booleanStep({ prompt: 'Is 91 een priemgetal?', answer: false, explanation: '91 = 7 × 13' }),
      ],
    };
    render(PlayScreen, { props: { set: TABLES_SET, questions: [prime], onfinish } });
    await press('Ja');
    expect(screen.getByText('Fout')).toBeTruthy();
    expect(screen.getByText('Ja')).toBeTruthy();
    expect(screen.getByText('Nee')).toBeTruthy();
    expect(screen.getByText('91 = 7 × 13')).toBeTruthy();
    await press('Verder');
    expect(onfinish).toHaveBeenCalledOnce();
  });
```

(The topic is `tables` because `prime` is only added to `Topic` in Task 9; PlayScreen does not look at the topic.)

Create `src/components/ResultScreen.test.ts`:

```ts
// @vitest-environment jsdom
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { summarize, type QuestionRecord } from '../lib/results';
import { TABLES_SET } from '../lib/sets';
import { factorizationStep } from '../lib/steps';
import type { Question } from '../lib/types';
import ResultScreen from './ResultScreen.svelte';

describe('ResultScreen', () => {
  it('lists a wrong factorization pretty-printed', () => {
    const step = factorizationStep({
      prompt: 'Ontbind 84 in priemfactoren',
      value: 84,
      explanation: '84 : 2 = 42, 42 : 2 = 21, 21 : 3 = 7',
    });
    const question: Question = { key: 'factorization:84', topic: 'tables', steps: [step] };
    const record: QuestionRecord = {
      question,
      attempts: [{ input: '2^2×21', result: step.check('2^2×21') }],
      durationMs: 5000,
    };
    render(ResultScreen, {
      props: {
        set: TABLES_SET,
        summary: summarize([record], 5000),
        onrestart: vi.fn(),
        onmenu: vi.fn(),
      },
    });
    expect(screen.getByText('Ontbind 84 in priemfactoren')).toBeTruthy();
    expect(screen.getByText('2² × 21')).toBeTruthy();
    expect(screen.getByText('2² × 3 × 7')).toBeTruthy();
    expect(screen.getByText('84 : 2 = 42, 42 : 2 = 21, 21 : 3 = 7')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/components`
Expected: FAIL. Among others: no element with role `alert`, no `keer` button, the Ja/Nee step renders a keypad, and the factorization answer is shown raw (`2^2×21`).

- [ ] **Step 3: Rewrite `Keypad.svelte`**

Replace the whole `<script>` block and markup of `src/components/Keypad.svelte` (everything above `<style>`) with:

```svelte
<script lang="ts">
  import { okSpan, type InputModel } from '../lib/inputModels';
  import type { KeypadKey } from '../lib/keypadInput';

  interface Props {
    model: InputModel;
    canSubmit: boolean;
    onkey: (key: KeypadKey) => void;
    onsubmit: () => void;
  }

  let { model, canSubmit, onkey, onsubmit }: Props = $props();
</script>

<div class="keypad">
  {#each model.keys as { key, label, ariaLabel } (key)}
    <button type="button" class="key" aria-label={ariaLabel ?? label} onclick={() => onkey(key)}>
      {label}
    </button>
  {/each}
  <button
    type="button"
    class="key ok"
    style:grid-column="span {okSpan(model)}"
    disabled={!canSubmit}
    onclick={onsubmit}>OK</button
  >
</div>
```

In its `<style>`, delete the now unused rule:

```css
  .wide {
    grid-column: span 2;
  }
```

- [ ] **Step 4: Rewrite `QuestionView.svelte`**

Replace the `<script>` block and markup of `src/components/QuestionView.svelte` (everything above `<style>`) with:

```svelte
<script lang="ts">
  import { INPUT_MODELS } from '../lib/inputModels';
  import type { KeypadKey } from '../lib/keypadInput';
  import { NO, YES } from '../lib/steps';
  import type { CheckResult, Step } from '../lib/types';
  import Keypad from './Keypad.svelte';

  interface Props {
    step: Step;
    onanswer: (input: string, result: CheckResult) => void;
  }

  let { step, onanswer }: Props = $props();

  // Ja/Nee has no keypad: a tap on a choice is the answer (spec §6).
  const model = $derived(step.kind === 'boolean' ? null : INPUT_MODELS[step.kind]);

  let value = $state('');
  let error = $state<string | null>(null);
  // Guards against a double tap submitting twice before the feedback replaces this view.
  let answered = false;

  function handleKey(key: KeypadKey) {
    if (model === null) return;
    value = model.apply(value, key);
    error = null;
  }

  function submit() {
    if (model === null || value === '') return;
    error = model.validate(value);
    if (error === null) answer(value);
  }

  function answer(input: string) {
    if (answered) return;
    answered = true;
    onanswer(input, step.check(input));
  }
</script>

<div class="question">
  <p class="prompt">{step.prompt}</p>
  {#if model}
    <output class="answer" aria-label="Jouw antwoord" aria-live="off"
      >{#if step.prefix}<span class="prefix">{step.prefix}</span>{/if}{value === ''
        ? '?'
        : model.display(value)}{#if step.suffix}<span class="suffix">{step.suffix}</span>{/if}</output
    >
    <p class="error" role="alert">{error ?? ''}</p>
    <Keypad {model} canSubmit={value !== ''} onkey={handleKey} onsubmit={submit} />
  {:else}
    <div class="choices">
      {#each [YES, NO] as choice (choice)}
        <button type="button" class="choice" onclick={() => answer(choice)}>{choice}</button>
      {/each}
    </div>
  {/if}
</div>
```

Append to its `<style>` block:

```css
  .error {
    min-height: 1.5rem;
    text-align: center;
    font-weight: 600;
    color: var(--wrong);
  }

  .choices {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .choice {
    min-height: 6rem;
    font-size: 2rem;
    font-weight: 600;
    background: var(--key);
  }

  .choice:active {
    background: var(--key-active);
  }
```

The error paragraph is always rendered, with a fixed minimum height, so the keypad does not jump when the error appears.

- [ ] **Step 5: Show answers through `displayAnswer` in `Feedback` and `ResultScreen`**

In `src/components/Feedback.svelte`, replace

```ts
  import { formatInput } from '../lib/format';
  import type { CheckResult } from '../lib/types';

  interface Props {
    prompt: string;
    input: string;
    result: CheckResult;
    onnext: () => void;
  }

  let { prompt, input, result, onnext }: Props = $props();
```

with

```ts
  import { displayAnswer } from '../lib/inputModels';
  import type { AnswerKind, CheckResult } from '../lib/types';

  interface Props {
    prompt: string;
    kind: AnswerKind;
    input: string;
    result: CheckResult;
    onnext: () => void;
  }

  let { prompt, kind, input, result, onnext }: Props = $props();
```

and replace

```svelte
        <dd>{formatInput(input)}</dd>
```

with

```svelte
        <dd>{displayAnswer(kind, input)}</dd>
```

In `src/components/PlayScreen.svelte`, replace

```svelte
    <Feedback
      prompt={step.prompt}
      input={feedback.input}
```

with

```svelte
    <Feedback
      prompt={step.prompt}
      kind={step.kind}
      input={feedback.input}
```

In `src/components/ResultScreen.svelte`, replace

```ts
  import { formatDuration, formatInput, formatSeconds } from '../lib/format';
```

with

```ts
  import { formatDuration, formatSeconds } from '../lib/format';
  import { displayAnswer } from '../lib/inputModels';
```

replace

```ts
      record.attempts
        .map((attempt, index) => ({ prompt: record.question.steps[index]?.prompt ?? '', attempt }))
        .filter(({ attempt }) => !attempt.result.correct),
```

with

```ts
      record.attempts
        .map((attempt, index) => {
          const step = record.question.steps[index];
          return { prompt: step?.prompt ?? '', kind: step?.kind ?? 'number', attempt };
        })
        .filter(({ attempt }) => !attempt.result.correct),
```

replace

```svelte
        {#each wrongSteps as { prompt, attempt }, index (index)}
```

with

```svelte
        {#each wrongSteps as { prompt, kind, attempt }, index (index)}
```

and replace

```svelte
            <p>Jouw antwoord: <strong>{formatInput(attempt.input)}</strong></p>
```

with

```svelte
            <p>Jouw antwoord: <strong>{displayAnswer(kind, attempt.input)}</strong></p>
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, every test file.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 7: Commit**

```bash
git add src/components
git commit -m "feat: per-kind keypad, inline input errors and Ja/Nee buttons" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: LCM and GCD exercises (`lcm`, `gcd`)

**Files:**
- Create: `src/lib/topics/numberTheory.ts`
- Create: `src/lib/topics/numberTheory.test.ts`
- Modify: `src/lib/types.ts`, `src/lib/topics/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/topics/numberTheory.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { gcd, isPrime, lcm } from '../primes';
import { createRng, type Rng } from '../random';
import type { Generator, Question, Step } from '../types';
import {
  gcdExplanation,
  GCD_COPRIME_SHARE,
  generateGcd,
  generateLcm,
  LCM_SHARED_FACTOR_SHARE,
  lcmExplanation,
  MAX_COMMON_FACTOR,
  MAX_GCD_TERM,
  MAX_LCM,
  MAX_LCM_TERM,
  MIN_COMMON_FACTOR,
  MIN_COPRIME_TERM,
  MIN_LCM_TERM,
} from './numberTheory';

const SAMPLES = 3000;

function sample(generator: Generator, seed: number, count = SAMPLES): Question[] {
  const rng: Rng = createRng(seed);
  return Array.from({ length: count }, () => generator(rng));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

function expectedOf(question: Question): string {
  return stepOf(question).check('').expected;
}

/** The two numbers in prompt order, e.g. 'KGV van 12 en 18 = ?' → [12, 18]. */
function termsOf(question: Question, name: 'KGV' | 'GGD'): [number, number] {
  const match = new RegExp(`^${name} van (\\d+) en (\\d+) = \\?$`).exec(stepOf(question).prompt);
  expect(match, stepOf(question).prompt).not.toBeNull();
  return [Number(match![1]), Number(match![2])];
}

function share(questions: Question[], predicate: (question: Question) => boolean): number {
  return questions.filter(predicate).length / questions.length;
}

describe('generateLcm', () => {
  const questions = sample(generateLcm, 7);

  it('asks for the LCM of two different numbers in range', () => {
    for (const question of questions) {
      const [a, b] = termsOf(question, 'KGV');
      expect(question.topic).toBe('lcm');
      expect(question.key).toBe(`lcm:${Math.min(a, b)}:${Math.max(a, b)}`);
      expect(a).not.toBe(b);
      for (const term of [a, b]) {
        expect(term).toBeGreaterThanOrEqual(MIN_LCM_TERM);
        expect(term).toBeLessThanOrEqual(MAX_LCM_TERM);
      }
      expect(lcm(a, b)).toBeLessThanOrEqual(MAX_LCM);
      expect(expectedOf(question)).toBe(String(lcm(a, b)));
      expect(stepOf(question).check(expectedOf(question))).toEqual({
        correct: true,
        expected: String(lcm(a, b)),
        explanation: lcmExplanation(a, b),
      });
    }
  });

  it('makes most pairs share a factor', () => {
    const shared = share(questions, (q) => gcd(...termsOf(q, 'KGV')) > 1);
    expect(shared).toBeGreaterThan(LCM_SHARED_FACTOR_SHARE - 0.04);
    expect(shared).toBeLessThan(LCM_SHARED_FACTOR_SHARE + 0.04);
  });

  it('puts the larger number first about half of the time', () => {
    const largerFirst = share(questions, (q) => {
      const [a, b] = termsOf(q, 'KGV');
      return a > b;
    });
    expect(largerFirst).toBeGreaterThan(0.45);
    expect(largerFirst).toBeLessThan(0.55);
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => sample(generateLcm, seed, 50).map((q) => q.key);
    expect(keys(5)).toEqual(keys(5));
  });
});

describe('lcmExplanation', () => {
  it.each([
    [12, 18, '12 = 2² × 3 en 18 = 2 × 3² → KGV = 2² × 3² = 36'],
    [4, 13, '4 = 2² en 13 is priem → KGV = 2² × 13 = 52'],
    [8, 4, '8 = 2³ en 4 = 2² → KGV = 2³ = 8'],
  ])('explains the LCM of %i and %i', (a, b, expected) => {
    expect(lcmExplanation(a, b)).toBe(expected);
  });
});

describe('generateGcd', () => {
  const questions = sample(generateGcd, 11);
  const coprime = questions.filter((q) => expectedOf(q) === '1');
  const shared = questions.filter((q) => expectedOf(q) !== '1');

  it('asks for the GCD and accepts its own answer', () => {
    for (const question of questions) {
      const [a, b] = termsOf(question, 'GGD');
      expect(question.topic).toBe('gcd');
      expect(question.key).toBe(`gcd:${Math.min(a, b)}:${Math.max(a, b)}`);
      expect(a).not.toBe(b);
      expect(Math.max(a, b)).toBeLessThanOrEqual(MAX_GCD_TERM);
      expect(expectedOf(question)).toBe(String(gcd(a, b)));
      expect(stepOf(question).check(expectedOf(question))).toEqual({
        correct: true,
        expected: String(gcd(a, b)),
        explanation: gcdExplanation(a, b),
      });
    }
  });

  it('makes about 10% of the pairs coprime composites', () => {
    expect(coprime.length / SAMPLES).toBeGreaterThan(GCD_COPRIME_SHARE - 0.025);
    expect(coprime.length / SAMPLES).toBeLessThan(GCD_COPRIME_SHARE + 0.025);
    for (const question of coprime) {
      for (const term of termsOf(question, 'GGD')) {
        expect(term).toBeGreaterThanOrEqual(MIN_COPRIME_TERM);
        expect(isPrime(term)).toBe(false);
      }
    }
  });

  it('uses every common factor from 2 to 30 for the other pairs', () => {
    const factors = new Set(shared.map((q) => Number(expectedOf(q))));
    const expected = Array.from(
      { length: MAX_COMMON_FACTOR - MIN_COMMON_FACTOR + 1 },
      (_, index) => MIN_COMMON_FACTOR + index,
    );
    expect([...factors].sort((x, y) => x - y)).toEqual(expected);
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => sample(generateGcd, seed, 50).map((q) => q.key);
    expect(keys(5)).toEqual(keys(5));
  });
});

describe('gcdExplanation', () => {
  it.each([
    [84, 126, '84 = 2² × 3 × 7 en 126 = 2 × 3² × 7 → GGD = 2 × 3 × 7 = 42'],
    [35, 48, '35 = 5 × 7 en 48 = 2⁴ × 3 → geen gemeenschappelijke priemfactor, GGD = 1'],
    [13, 26, '13 is priem en 26 = 2 × 13 → GGD = 13'],
    [24, 40, '24 = 2³ × 3 en 40 = 2³ × 5 → GGD = 2³ = 8'],
  ])('explains the GCD of %i and %i', (a, b, expected) => {
    expect(gcdExplanation(a, b)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/topics/numberTheory.test.ts`
Expected: FAIL, because `./numberTheory` cannot be resolved.

- [ ] **Step 3: Write the generators**

Create `src/lib/topics/numberTheory.ts`:

```ts
import { formatInteger, formatPrimeFactors } from '../format';
import { gcd, isPrime, lcm, primeFactors } from '../primes';
import { pick, randomInt, type Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question, Step, Topic } from '../types';

/** LCM (spec §5.2). */
export const MIN_LCM_TERM = 2;
export const MAX_LCM_TERM = 60;
export const MAX_LCM = 300;
export const LCM_SHARED_FACTOR_SHARE = 0.75;

/** GCD: a = g·p and b = g·q, plus coprime composites (spec §5.3). */
export const MIN_COMMON_FACTOR = 2;
export const MAX_COMMON_FACTOR = 30;
export const MAX_GCD_TERM = 200;
export const GCD_COPRIME_SHARE = 0.1;
export const MIN_COPRIME_TERM = 10;

type Pair = readonly [number, number];

function range(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

function question(topic: Topic, key: string, step: Step): Question {
  return { key: `${topic}:${key}`, topic, steps: [step] };
}

/** One key for both orders, so '12 en 18' and '18 en 12' count as the same question. */
function pairKey([a, b]: Pair): string {
  return `${Math.min(a, b)}:${Math.max(a, b)}`;
}

/** '12 = 2² × 3', or '13 is priem'. */
export function describeFactors(n: number): string {
  return isPrime(n)
    ? `${formatInteger(n)} is priem`
    : `${formatInteger(n)} = ${formatPrimeFactors(primeFactors(n))}`;
}

/** '2² × 3² = 36', or just '7' when the factorization is the number itself. */
function showFactorized(value: number): string {
  const factors = formatPrimeFactors(primeFactors(value));
  const number = formatInteger(value);
  return factors === number ? number : `${factors} = ${number}`;
}

/** All pairs a < b in [2, 60] with lcm ≤ 300 that do, or do not, share a factor. */
function lcmPairs(shareFactor: boolean): Pair[] {
  const pairs: Pair[] = [];
  for (let a = MIN_LCM_TERM; a <= MAX_LCM_TERM; a++) {
    for (let b = a + 1; b <= MAX_LCM_TERM; b++) {
      const shares = gcd(a, b) > 1;
      if (lcm(a, b) <= MAX_LCM && shares === shareFactor) pairs.push([a, b]);
    }
  }
  return pairs;
}

const SHARED_FACTOR_PAIRS = lcmPairs(true);
const COPRIME_PAIRS = lcmPairs(false);

/** `KGV van 12 en 18 = ?` */
export function generateLcm(rng: Rng): Question {
  const pair = pick(rng, rng() < LCM_SHARED_FACTOR_SHARE ? SHARED_FACTOR_PAIRS : COPRIME_PAIRS);
  const [a, b] = rng() < 0.5 ? pair : ([pair[1], pair[0]] as const);
  return question(
    'lcm',
    pairKey(pair),
    numberStep({
      prompt: `KGV van ${formatInteger(a)} en ${formatInteger(b)} = ?`,
      answer: fromInteger(lcm(a, b)),
      explanation: lcmExplanation(a, b),
    }),
  );
}

/** '12 = 2² × 3 en 18 = 2 × 3² → KGV = 2² × 3² = 36' */
export function lcmExplanation(a: number, b: number): string {
  return `${describeFactors(a)} en ${describeFactors(b)} → KGV = ${showFactorized(lcm(a, b))}`;
}

const COPRIME_CANDIDATES = range(MIN_COPRIME_TERM, MAX_GCD_TERM).filter((n) => !isPrime(n));

/** `GGD van 84 en 126 = ?` */
export function generateGcd(rng: Rng): Question {
  const pair = rng() < GCD_COPRIME_SHARE ? coprimeComposites(rng) : sharedFactorPair(rng);
  const [a, b] = pair;
  return question(
    'gcd',
    pairKey(pair),
    numberStep({
      prompt: `GGD van ${formatInteger(a)} en ${formatInteger(b)} = ?`,
      answer: fromInteger(gcd(a, b)),
      explanation: gcdExplanation(a, b),
    }),
  );
}

/** g·p and g·q with gcd(p, q) = 1, so the answer is g. Ordered, so both orders occur. */
function sharedFactorPair(rng: Rng): Pair {
  const g = randomInt(rng, MIN_COMMON_FACTOR, MAX_COMMON_FACTOR);
  const limit = Math.floor(MAX_GCD_TERM / g);
  const pairs: Pair[] = [];
  for (let p = 1; p <= limit; p++) {
    for (let q = 1; q <= limit; q++) {
      if (p !== q && gcd(p, q) === 1) pairs.push([g * p, g * q]);
    }
  }
  return pick(rng, pairs);
}

/** Two different composites without a common factor, e.g. 35 and 48. */
function coprimeComposites(rng: Rng): Pair {
  for (;;) {
    const a = pick(rng, COPRIME_CANDIDATES);
    const b = pick(rng, COPRIME_CANDIDATES);
    if (a !== b && gcd(a, b) === 1) return [a, b];
  }
}

/** '84 = 2² × 3 × 7 en 126 = 2 × 3² × 7 → GGD = 2 × 3 × 7 = 42' */
export function gcdExplanation(a: number, b: number): string {
  const divisor = gcd(a, b);
  const conclusion =
    divisor === 1
      ? 'geen gemeenschappelijke priemfactor, GGD = 1'
      : `GGD = ${showFactorized(divisor)}`;
  return `${describeFactors(a)} en ${describeFactors(b)} → ${conclusion}`;
}
```

- [ ] **Step 4: Register the topics**

In `src/lib/types.ts`, replace

```ts
  | 'ratios';
```

with

```ts
  | 'ratios'
  | 'lcm'
  | 'gcd';
```

In `src/lib/topics/index.ts`, add after the `./measurement` import:

```ts
import { generateGcd, generateLcm } from './numberTheory';
```

replace

```ts
  ratios: generateRatios,
};
```

with

```ts
  ratios: generateRatios,
  lcm: generateLcm,
  gcd: generateGcd,
};
```

and replace

```ts
  ratios: 'Verhoudingen (ontbrekend getal, herschalen, verdelen)',
};
```

with

```ts
  ratios: 'Verhoudingen (ontbrekend getal, herschalen, verdelen)',
  lcm: 'KGV (kleinste gemene veelvoud)',
  gcd: 'GGD (grootste gemene deler)',
};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/lib/topics/numberTheory.test.ts`
Expected: PASS.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add src/lib/topics/numberTheory.ts src/lib/topics/numberTheory.test.ts src/lib/types.ts src/lib/topics/index.ts
git commit -m "feat: add LCM and GCD exercises" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Prime and factorization exercises (`prime`, `factorization`)

**Files:**
- Modify: `src/lib/topics/numberTheory.ts`
- Test: `src/lib/topics/numberTheory.test.ts`
- Modify: `src/lib/types.ts`, `src/lib/topics/index.ts`

- [ ] **Step 1: Write the failing tests**

In `src/lib/topics/numberTheory.test.ts`, replace the `../primes` import with

```ts
import { gcd, isPrime, lcm, primeFactors, smallestPrimeFactor } from '../primes';
```

add after the `../random` import:

```ts
import { NO, YES } from '../steps';
```

and replace the `./numberTheory` import with

```ts
import {
  divisionLadder,
  FACTORIZATION_NUMBERS,
  gcdExplanation,
  GCD_COPRIME_SHARE,
  generateFactorization,
  generateGcd,
  generateLcm,
  generatePrime,
  HARD_COMPOSITES,
  LCM_SHARED_FACTOR_SHARE,
  lcmExplanation,
  MAX_COMMON_FACTOR,
  MAX_FACTORIZATION,
  MAX_GCD_TERM,
  MAX_LCM,
  MAX_LCM_TERM,
  MAX_PRIME_CANDIDATE,
  MIN_COMMON_FACTOR,
  MIN_COPRIME_TERM,
  MIN_FACTORIZATION,
  MIN_LCM_TERM,
  MIN_PRIME_CANDIDATE,
  MULTIPLES_OF_THREE,
  primeExplanation,
  primeFactorCount,
  PRIMES,
} from './numberTheory';
```

Then append:

```ts
describe('generatePrime', () => {
  const questions = sample(generatePrime, 13);
  const numberOf = (question: Question) => Number(question.key.split(':')[1]);

  it('asks whether a number in [11, 199] is prime', () => {
    for (const question of questions) {
      const n = numberOf(question);
      const step = stepOf(question);
      expect(question.topic).toBe('prime');
      expect(step.kind).toBe('boolean');
      expect(step.prompt).toBe(`Is ${n} een priemgetal?`);
      expect(n).toBeGreaterThanOrEqual(MIN_PRIME_CANDIDATE);
      expect(n).toBeLessThanOrEqual(MAX_PRIME_CANDIDATE);
      const expected = isPrime(n) ? YES : NO;
      expect(step.check(expected)).toEqual({
        correct: true,
        expected,
        explanation: primeExplanation(n),
      });
    }
  });

  it('makes half of the numbers prime and the composites odd and not divisible by 5', () => {
    const primes = share(questions, (q) => isPrime(numberOf(q)));
    expect(primes).toBeGreaterThan(0.46);
    expect(primes).toBeLessThan(0.54);
    for (const question of questions) {
      const n = numberOf(question);
      if (isPrime(n)) continue;
      expect(n % 2).toBe(1);
      expect(n % 5).not.toBe(0);
    }
  });

  it('takes half of the composites from the hard ones', () => {
    const hard = share(questions, (q) => HARD_COMPOSITES.includes(numberOf(q)));
    expect(hard).toBeGreaterThan(0.21);
    expect(hard).toBeLessThan(0.29);
  });

  it('lists exactly the odd composites not divisible by 3 or 5 as hard', () => {
    const hard: number[] = [];
    for (let n = MIN_PRIME_CANDIDATE; n <= MAX_PRIME_CANDIDATE; n++) {
      if (!isPrime(n) && n % 2 === 1 && n % 3 !== 0 && n % 5 !== 0) hard.push(n);
    }
    expect(HARD_COMPOSITES).toEqual(hard);
    expect(PRIMES).toHaveLength(42);
    expect(MULTIPLES_OF_THREE[0]).toBe(21);
    expect(MULTIPLES_OF_THREE.at(-1)).toBe(189);
    expect(MULTIPLES_OF_THREE.every((n) => n % 6 === 3 && n % 5 !== 0)).toBe(true);
  });
});

describe('primeExplanation', () => {
  it.each([
    [91, '91 = 7 × 13'],
    [27, '27 = 3 × 9'],
    [169, '169 = 13 × 13'],
    [151, 'Geen deler tot en met √151'],
  ])('explains %i', (n, expected) => {
    expect(primeExplanation(n)).toBe(expected);
  });
});

describe('generateFactorization', () => {
  const questions = sample(generateFactorization, 17);
  const numberOf = (question: Question) => Number(question.key.split(':')[1]);

  /** The canonical answer as keypad input: 84 → '2^2×3×7'. */
  function typed(n: number): string {
    return primeFactors(n)
      .map(({ prime, exponent }) => (exponent === 1 ? `${prime}` : `${prime}^${exponent}`))
      .join('×');
  }

  /** Every prime written out: 84 → '2×2×3×7'. */
  function expanded(n: number): string {
    return primeFactors(n)
      .flatMap(({ prime, exponent }) => Array.from({ length: exponent }, () => prime))
      .join('×');
  }

  it('asks to factorize a number with at least 3 prime factors', () => {
    for (const question of questions) {
      const n = numberOf(question);
      const step = stepOf(question);
      expect(question.topic).toBe('factorization');
      expect(step.kind).toBe('factorization');
      expect(step.prompt).toBe(`Ontbind ${n} in priemfactoren`);
      expect(FACTORIZATION_NUMBERS).toContain(n);
      for (const input of [typed(n), expanded(n)]) {
        expect(step.check(input)).toEqual({
          correct: true,
          expected: step.check('').expected,
          explanation: divisionLadder(n),
        });
      }
    }
  });

  it('offers exactly the composites in [12, 200] with at least 3 prime factors', () => {
    expect(FACTORIZATION_NUMBERS[0]).toBe(MIN_FACTORIZATION);
    expect(FACTORIZATION_NUMBERS.at(-1)).toBe(MAX_FACTORIZATION);
    expect(FACTORIZATION_NUMBERS).toContain(84);
    expect(FACTORIZATION_NUMBERS).not.toContain(15);
    expect(FACTORIZATION_NUMBERS).not.toContain(49);
    expect(FACTORIZATION_NUMBERS.every((n) => primeFactorCount(n) >= 3)).toBe(true);
  });

  it('shows the canonical form as the expected answer', () => {
    const first = generateFactorization(() => 0);
    expect(numberOf(first)).toBe(12);
    expect(stepOf(first).check('').expected).toBe('2² × 3');
  });
});

describe('divisionLadder', () => {
  it('divides 84 by its smallest primes', () => {
    expect(divisionLadder(84)).toBe('84 : 2 = 42, 42 : 2 = 21, 21 : 3 = 7');
  });

  it('is a consistent ladder for every number on offer', () => {
    for (const n of FACTORIZATION_NUMBERS) {
      const steps = divisionLadder(n)
        .split(', ')
        .map((step) => {
          const match = /^(\d+) : (\d+) = (\d+)$/.exec(step);
          expect(match, `${n}: ${step}`).not.toBeNull();
          return match!.slice(1).map(Number) as [number, number, number];
        });
      expect(steps[0]![0]).toBe(n);
      for (const [index, [dividend, divisor, quotient]] of steps.entries()) {
        expect(divisor).toBe(smallestPrimeFactor(dividend));
        expect(dividend / divisor).toBe(quotient);
        if (index > 0) expect(dividend).toBe(steps[index - 1]![2]);
      }
      expect(isPrime(steps.at(-1)![2])).toBe(true);
    }
  });
});
```

`generateFactorization(() => 0)` uses an RNG that always returns 0, so `pick` takes the first number on offer, which is 12 (`2² × 3`).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/topics/numberTheory.test.ts`
Expected: FAIL, with `generatePrime is not a function`.

- [ ] **Step 3: Write the generators**

In `src/lib/topics/numberTheory.ts`, replace the imports from `../primes` and `../steps` with

```ts
import { gcd, isPrime, lcm, primeFactors, smallestPrimeFactor } from '../primes';
```

and

```ts
import { booleanStep, factorizationStep, numberStep } from '../steps';
```

Append:

```ts
/** Prime yes/no (spec §5.4). */
export const MIN_PRIME_CANDIDATE = 11;
export const MAX_PRIME_CANDIDATE = 199;
export const PRIME_SHARE = 0.5;
/** Share of the composites that is not divisible by 3: the ones that look prime. */
export const HARD_COMPOSITE_SHARE = 0.5;

const PRIME_CANDIDATES = range(MIN_PRIME_CANDIDATE, MAX_PRIME_CANDIDATE);
export const PRIMES: readonly number[] = PRIME_CANDIDATES.filter(isPrime);
/** Odd composites that are not divisible by 3 or 5. */
export const HARD_COMPOSITES: readonly number[] = [49, 77, 91, 119, 121, 133, 143, 161, 169, 187];
/** Odd multiples of 3 that are not divisible by 5: 21, 27, 33, …, 189. */
export const MULTIPLES_OF_THREE: readonly number[] = PRIME_CANDIDATES.filter(
  (n) => n % 2 === 1 && n % 3 === 0 && n % 5 !== 0,
);

/** `Is 91 een priemgetal?` */
export function generatePrime(rng: Rng): Question {
  const n =
    rng() < PRIME_SHARE
      ? pick(rng, PRIMES)
      : pick(rng, rng() < HARD_COMPOSITE_SHARE ? HARD_COMPOSITES : MULTIPLES_OF_THREE);
  return question(
    'prime',
    String(n),
    booleanStep({
      prompt: `Is ${formatInteger(n)} een priemgetal?`,
      answer: isPrime(n),
      explanation: primeExplanation(n),
    }),
  );
}

/** '91 = 7 × 13' with the smallest prime factor, or 'Geen deler tot en met √151' for a prime. */
export function primeExplanation(n: number): string {
  if (isPrime(n)) return `Geen deler tot en met √${formatInteger(n)}`;
  const factor = smallestPrimeFactor(n);
  return `${formatInteger(n)} = ${formatInteger(factor)} × ${formatInteger(n / factor)}`;
}

/** Prime factorization (spec §5.5). */
export const MIN_FACTORIZATION = 12;
export const MAX_FACTORIZATION = 200;
export const MIN_PRIME_FACTOR_COUNT = 3;

/** Prime factors counted with multiplicity: 84 = 2 × 2 × 3 × 7 → 4. */
export function primeFactorCount(n: number): number {
  return primeFactors(n).reduce((count, { exponent }) => count + exponent, 0);
}

export const FACTORIZATION_NUMBERS: readonly number[] = range(
  MIN_FACTORIZATION,
  MAX_FACTORIZATION,
).filter((n) => primeFactorCount(n) >= MIN_PRIME_FACTOR_COUNT);

/** `Ontbind 84 in priemfactoren` */
export function generateFactorization(rng: Rng): Question {
  const n = pick(rng, FACTORIZATION_NUMBERS);
  return question(
    'factorization',
    String(n),
    factorizationStep({
      prompt: `Ontbind ${formatInteger(n)} in priemfactoren`,
      value: n,
      explanation: divisionLadder(n),
    }),
  );
}

/** '84 : 2 = 42, 42 : 2 = 21, 21 : 3 = 7': divide by the smallest prime until a prime is left. */
export function divisionLadder(n: number): string {
  const steps: string[] = [];
  let rest = n;
  while (!isPrime(rest)) {
    const factor = smallestPrimeFactor(rest);
    steps.push(`${formatInteger(rest)} : ${formatInteger(factor)} = ${formatInteger(rest / factor)}`);
    rest /= factor;
  }
  return steps.join(', ');
}
```

- [ ] **Step 4: Register the topics**

In `src/lib/types.ts`, replace

```ts
  | 'gcd';
```

with

```ts
  | 'gcd'
  | 'prime'
  | 'factorization';
```

In `src/lib/topics/index.ts`, replace

```ts
import { generateGcd, generateLcm } from './numberTheory';
```

with

```ts
import { generateFactorization, generateGcd, generateLcm, generatePrime } from './numberTheory';
```

replace

```ts
  gcd: generateGcd,
};
```

with

```ts
  gcd: generateGcd,
  prime: generatePrime,
  factorization: generateFactorization,
};
```

and replace

```ts
  gcd: 'GGD (grootste gemene deler)',
};
```

with

```ts
  gcd: 'GGD (grootste gemene deler)',
  prime: 'Priemgetal of niet (11 t/m 199)',
  factorization: 'Ontbinden in priemfactoren (12 t/m 200)',
};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/lib/topics/numberTheory.test.ts`
Expected: PASS.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add src/lib/topics/numberTheory.ts src/lib/topics/numberTheory.test.ts src/lib/types.ts src/lib/topics/index.ts
git commit -m "feat: add prime and factorization exercises" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Divisibility exercises (`divisibility`)

**Files:**
- Create: `src/lib/topics/divisibility.ts`
- Create: `src/lib/topics/divisibility.test.ts`
- Modify: `src/lib/types.ts`, `src/lib/topics/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/topics/divisibility.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatInteger } from '../format';
import { createRng } from '../random';
import { NO, YES } from '../steps';
import type { Question, Step } from '../types';
import {
  checkRule,
  COMBINED_FACTORS,
  divisibilityExplanation,
  DIVISORS,
  generateDivisibility,
  isCombined,
  MAX_DIGITS,
  MAX_SHORT_DIGITS,
  MIN_DIGITS,
  NEAR_MISS_REMAINDERS,
  SHORT_NUMBER_DIVISORS,
  type Divisor,
  type RuleDivisor,
} from './divisibility';

const SAMPLES = 3000;
const RULE_DIVISORS: readonly RuleDivisor[] = [2, 3, 4, 5, 7, 8, 9, 11, 13];

function sample(seed: number, count = SAMPLES): Question[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => generateDivisibility(rng));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

function parts(question: Question): { n: number; divisor: Divisor } {
  const [, n, divisor] = question.key.split(':');
  return { n: Number(n), divisor: Number(divisor) as Divisor };
}

const questions = sample(41);

describe('generateDivisibility', () => {
  it('asks a Ja/Nee question about a number of the right length', () => {
    for (const question of questions) {
      const { n, divisor } = parts(question);
      const step = stepOf(question);
      expect(question.topic).toBe('divisibility');
      expect(step.kind).toBe('boolean');
      expect(DIVISORS).toContain(divisor);
      expect(step.prompt).toBe(`Is ${formatInteger(n)} deelbaar door ${divisor}?`);
      const maxDigits = SHORT_NUMBER_DIVISORS.includes(divisor) ? MAX_SHORT_DIGITS : MAX_DIGITS;
      expect(String(n).length).toBeGreaterThanOrEqual(MIN_DIGITS);
      expect(String(n).length).toBeLessThanOrEqual(maxDigits);
      const expected = n % divisor === 0 ? YES : NO;
      expect(step.check(expected)).toEqual({
        correct: true,
        expected,
        explanation: divisibilityExplanation(n, divisor),
      });
    }
  });

  it('makes half of the numbers divisible', () => {
    const divisible = questions.filter((q) => parts(q).n % parts(q).divisor === 0).length;
    expect(divisible / SAMPLES).toBeGreaterThan(0.46);
    expect(divisible / SAMPLES).toBeLessThan(0.54);
  });

  it('makes every non-divisible number a close call', () => {
    for (const question of questions) {
      const { n, divisor } = parts(question);
      const remainder = n % divisor;
      if (remainder === 0) continue;
      expect(NEAR_MISS_REMAINDERS[divisor].flat()).toContain(remainder);
      if (isCombined(divisor)) {
        const [first, second] = COMBINED_FACTORS[divisor];
        expect(n % first === 0, `${n} / ${divisor}`).not.toBe(n % second === 0);
      }
    }
  });

  it('uses every divisor and every allowed number length', () => {
    expect(new Set(questions.map((q) => parts(q).divisor))).toEqual(new Set(DIVISORS));
    const lengths = (short: boolean) =>
      new Set(
        questions
          .filter((q) => SHORT_NUMBER_DIVISORS.includes(parts(q).divisor) === short)
          .map((q) => String(parts(q).n).length),
      );
    expect(lengths(false)).toEqual(new Set([3, 4, 5]));
    expect(lengths(true)).toEqual(new Set([3, 4]));
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => sample(seed, 50).map((q) => q.key);
    expect(keys(5)).toEqual(keys(5));
  });
});

describe('divisibilityExplanation', () => {
  it.each([
    [2718, 2, 'Laatste cijfer 8 → deelbaar door 2'],
    [305, 5, 'Laatste cijfer 5 → deelbaar door 5'],
    [2718, 9, 'Cijfersom 2 + 7 + 1 + 8 = 18 → deelbaar door 9'],
    [2718, 4, 'Laatste twee cijfers 18 → niet deelbaar door 4'],
    [2718, 8, 'Laatste drie cijfers 718 → niet deelbaar door 8'],
    [2718, 11, 'Alternerende som 2 − 7 + 1 − 8 = −12 → niet deelbaar door 11'],
    [2718, 7, '2718 = 2100 + 560 + 56 + rest 2 → niet deelbaar door 7'],
    [2716, 7, '2716 = 2100 + 560 + 56 → deelbaar door 7'],
    [1001, 13, '1001 = 910 + 91 → deelbaar door 13'],
    [
      1246,
      6,
      'Deelbaar door 2 (laatste cijfer 6) en niet deelbaar door 3 (cijfersom 1 + 2 + 4 + 6 = 13) → niet deelbaar door 6',
    ],
    [
      1236,
      12,
      'Deelbaar door 3 (cijfersom 1 + 2 + 3 + 6 = 12) en deelbaar door 4 (laatste twee cijfers 36) → deelbaar door 12',
    ],
    [
      2716,
      14,
      'Deelbaar door 2 (laatste cijfer 6) en deelbaar door 7 (2716 = 2100 + 560 + 56) → deelbaar door 14',
    ],
    [
      2715,
      15,
      'Deelbaar door 3 (cijfersom 2 + 7 + 1 + 5 = 15) en deelbaar door 5 (laatste cijfer 5) → deelbaar door 15',
    ],
  ] as const)('explains %i and %i', (n, divisor, expected) => {
    expect(divisibilityExplanation(n, divisor)).toBe(expected);
  });
});

/** Re-derives the verdict from the numbers in the reason alone, so a wrong reason fails. */
function evidenceSaysDivisible(n: number, divisor: RuleDivisor, reason: string): boolean {
  const lastDigits = /^laatste (?:cijfer|twee cijfers|drie cijfers) (\d+)$/.exec(reason);
  if (lastDigits) {
    const digits = lastDigits[1]!;
    const width = divisor === 4 ? 2 : divisor === 8 ? 3 : 1;
    expect(digits).toBe(String(n).slice(-width));
    return Number(digits) % divisor === 0;
  }
  const digitSum = /^cijfersom (.+) = (\d+)$/.exec(reason);
  if (digitSum) {
    const terms = digitSum[1]!.split(' + ');
    expect(terms.join('')).toBe(String(n));
    const sum = Number(digitSum[2]);
    expect(sum).toBe(terms.reduce((total, digit) => total + Number(digit), 0));
    return sum % divisor === 0;
  }
  const alternating = /^alternerende som (.+) = (−?\d+)$/.exec(reason);
  if (alternating) {
    const tokens = alternating[1]!.split(' ');
    let sum = Number(tokens[0]);
    for (let i = 1; i < tokens.length; i += 2) {
      sum += (tokens[i] === '−' ? -1 : 1) * Number(tokens[i + 1]);
    }
    expect(tokens.filter((_, i) => i % 2 === 0).join('')).toBe(String(n));
    expect(Number(alternating[2]!.replace('−', '-'))).toBe(sum);
    return sum % divisor === 0;
  }
  const chunked = /^(\d+) = (.+)$/.exec(reason);
  if (chunked) {
    expect(Number(chunked[1])).toBe(n);
    const terms = chunked[2]!.split(' + ');
    const last = terms.at(-1)!;
    const rest = last.startsWith('rest ') ? Number(last.slice('rest '.length)) : 0;
    const multiples = (rest > 0 ? terms.slice(0, -1) : terms).map(Number);
    for (const multiple of multiples) {
      expect(multiple).toBeGreaterThan(0);
      expect(multiple % divisor).toBe(0);
    }
    expect(multiples.reduce((total, multiple) => total + multiple, rest)).toBe(n);
    expect(rest).toBeLessThan(divisor);
    return rest === 0;
  }
  throw new Error(`Unknown reason: ${reason}`);
}

describe('every reachable case', () => {
  it('states evidence that agrees with actual divisibility for every 3- and 4-digit number', () => {
    for (let n = 100; n <= 9999; n++) {
      for (const divisor of RULE_DIVISORS) {
        const { divisible, reason } = checkRule(n, divisor);
        const message = `${n} / ${divisor}: ${reason}`;
        expect(divisible, message).toBe(n % divisor === 0);
        expect(evidenceSaysDivisible(n, divisor, reason), message).toBe(divisible);
      }
    }
  });

  it('applies the digit rules to 5-digit numbers too', () => {
    for (let n = 10_000; n <= 99_999; n += 7) {
      for (const divisor of [2, 3, 4, 5, 8, 9, 11] as const) {
        const { divisible, reason } = checkRule(n, divisor);
        expect(evidenceSaysDivisible(n, divisor, reason), `${n} / ${divisor}`).toBe(divisible);
      }
    }
  });

  it('concludes correctly for every divisor and combines the right rules', () => {
    for (let n = 100; n <= 9999; n++) {
      for (const divisor of DIVISORS) {
        const text = divisibilityExplanation(n, divisor);
        const verdict = n % divisor === 0 ? 'deelbaar' : 'niet deelbaar';
        expect(text.endsWith(` → ${verdict} door ${divisor}`), text).toBe(true);
        if (!isCombined(divisor)) continue;
        const stated = [...text.matchAll(/(niet deelbaar|deelbaar) door (\d+) \(([^)]+)\)/gi)];
        expect(stated.map((match) => Number(match[2])), text).toEqual([...COMBINED_FACTORS[divisor]]);
        for (const [, partVerdict, factor, reason] of stated) {
          const rule = checkRule(n, Number(factor) as RuleDivisor);
          expect(partVerdict!.toLowerCase() === 'deelbaar', text).toBe(rule.divisible);
          expect(reason, text).toBe(rule.reason);
        }
      }
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/topics/divisibility.test.ts`
Expected: FAIL, because `./divisibility` cannot be resolved.

- [ ] **Step 3: Write the generator**

Create `src/lib/topics/divisibility.ts`:

```ts
import { formatInteger, MINUS } from '../format';
import { pick, randomInt, type Rng } from '../random';
import { booleanStep } from '../steps';
import type { Question } from '../types';

/** Divisors with a rule of their own (spec §5.6). 7 and 13 use chunking. */
export type RuleDivisor = 2 | 3 | 4 | 5 | 7 | 8 | 9 | 11 | 13;
/** Divisors that combine the rules of two coprime factors. */
export type CombinedDivisor = 6 | 12 | 14 | 15;
export type Divisor = RuleDivisor | CombinedDivisor;

/** 2 to 15 without 10, like the tables. */
export const DIVISORS: readonly Divisor[] = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15];

export const COMBINED_FACTORS: Record<CombinedDivisor, readonly [RuleDivisor, RuleDivisor]> = {
  6: [2, 3],
  12: [3, 4],
  14: [2, 7],
  15: [3, 5],
};

/** No digit rule, so these get at most 4 digits. */
export const SHORT_NUMBER_DIVISORS: readonly Divisor[] = [7, 13, 14];
export const MIN_DIGITS = 3;
export const MAX_DIGITS = 5;
export const MAX_SHORT_DIGITS = 4;
export const DIVISIBLE_SHARE = 0.5;

/** Remainders of the non-divisible numbers: close calls, in one or two groups (spec §5.6). */
export const NEAR_MISS_REMAINDERS: Record<Divisor, readonly (readonly number[])[]> = {
  2: [[1]],
  3: [[1, 2]],
  4: [[2]],
  5: [[1, 2, 3, 4]],
  6: [[2, 4], [3]],
  7: [[1, 2, 5, 6]],
  8: [[2, 4, 6]],
  9: [[1, 2, 7, 8]],
  11: [[1, 2, 9, 10]],
  12: [
    [4, 8],
    [3, 6, 9],
  ],
  13: [[1, 2, 11, 12]],
  14: [[2, 4, 6, 8, 10, 12], [7]],
  15: [
    [5, 10],
    [3, 6, 9, 12],
  ],
};

export function isCombined(divisor: Divisor): divisor is CombinedDivisor {
  return divisor in COMBINED_FACTORS;
}

/** `Is 2718 deelbaar door 9?` */
export function generateDivisibility(rng: Rng): Question {
  const divisor = pick(rng, DIVISORS);
  const maxDigits = SHORT_NUMBER_DIVISORS.includes(divisor) ? MAX_SHORT_DIGITS : MAX_DIGITS;
  const digits = randomInt(rng, MIN_DIGITS, maxDigits);
  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;
  const remainder =
    rng() < DIVISIBLE_SHARE ? 0 : pick(rng, pick(rng, NEAR_MISS_REMAINDERS[divisor]));
  const quotient = randomInt(
    rng,
    Math.ceil((min - remainder) / divisor),
    Math.floor((max - remainder) / divisor),
  );
  const n = divisor * quotient + remainder;
  return {
    key: `divisibility:${n}:${divisor}`,
    topic: 'divisibility',
    steps: [
      booleanStep({
        prompt: `Is ${formatInteger(n)} deelbaar door ${divisor}?`,
        answer: remainder === 0,
        explanation: divisibilityExplanation(n, divisor),
      }),
    ],
  };
}

export interface RuleCheck {
  divisible: boolean;
  /** Lowercase evidence, e.g. 'cijfersom 2 + 7 + 1 + 8 = 18'. */
  reason: string;
}

/** The rule of one divisor as it applies to n. */
export function checkRule(n: number, divisor: RuleDivisor): RuleCheck {
  const digits = String(n);
  const divisible = n % divisor === 0;
  switch (divisor) {
    case 2:
    case 5:
      return { divisible, reason: `laatste cijfer ${digits.slice(-1)}` };
    case 4:
      return { divisible, reason: `laatste twee cijfers ${digits.slice(-2)}` };
    case 8:
      return { divisible, reason: `laatste drie cijfers ${digits.slice(-3)}` };
    case 3:
    case 9:
      return { divisible, reason: `cijfersom ${digitSum(digits)}` };
    case 11:
      return { divisible, reason: `alternerende som ${alternatingSum(digits)}` };
    case 7:
    case 13:
      return { divisible, reason: chunks(n, divisor) };
  }
}

/** '2 + 7 + 1 + 8 = 18' */
function digitSum(digits: string): string {
  const values = [...digits].map(Number);
  return `${values.join(' + ')} = ${values.reduce((sum, value) => sum + value, 0)}`;
}

/** '2 − 7 + 1 − 8 = −12': plus at the leftmost digit, then alternating. */
function alternatingSum(digits: string): string {
  const values = [...digits].map(Number);
  const terms = values.map((value, index) =>
    index === 0 ? String(value) : `${index % 2 === 1 ? MINUS : '+'} ${value}`,
  );
  const sum = values.reduce((total, value, index) => (index % 2 === 0 ? total + value : total - value), 0);
  return `${terms.join(' ')} = ${formatInteger(sum)}`;
}

/** Chunking ('happen'): one multiple per non-zero digit of the quotient, then the remainder. */
function chunks(n: number, divisor: number): string {
  const quotient = String(Math.floor(n / divisor));
  const remainder = n % divisor;
  const parts = [...quotient]
    .map((digit, index) => divisor * Number(digit) * 10 ** (quotient.length - 1 - index))
    .filter((part) => part > 0)
    .map(formatInteger);
  if (remainder > 0) parts.push(`rest ${remainder}`);
  return `${formatInteger(n)} = ${parts.join(' + ')}`;
}

function verdict(divisible: boolean): string {
  return divisible ? 'deelbaar' : 'niet deelbaar';
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * 'Cijfersom 2 + 7 + 1 + 8 = 18 → deelbaar door 9', or for a combined divisor both rules:
 * 'Deelbaar door 2 (laatste cijfer 6) en niet deelbaar door 3 (…) → niet deelbaar door 6'.
 */
export function divisibilityExplanation(n: number, divisor: Divisor): string {
  const conclusion = `${verdict(n % divisor === 0)} door ${divisor}`;
  if (!isCombined(divisor)) return `${capitalize(checkRule(n, divisor).reason)} → ${conclusion}`;
  const parts = COMBINED_FACTORS[divisor].map((factor) => {
    const { divisible, reason } = checkRule(n, factor);
    return `${verdict(divisible)} door ${factor} (${reason})`;
  });
  return `${capitalize(parts.join(' en '))} → ${conclusion}`;
}
```

`chunks` only receives 7 and 13 with numbers of at most 4 digits, so `formatInteger` never inserts a group separator there.

- [ ] **Step 4: Register the topic**

In `src/lib/types.ts`, replace

```ts
  | 'factorization';
```

with

```ts
  | 'factorization'
  | 'divisibility';
```

In `src/lib/topics/index.ts`, add after the `../types` import (before `./measurement`):

```ts
import { generateDivisibility } from './divisibility';
```

replace

```ts
  factorization: generateFactorization,
};
```

with

```ts
  factorization: generateFactorization,
  divisibility: generateDivisibility,
};
```

and replace

```ts
  factorization: 'Ontbinden in priemfactoren (12 t/m 200)',
};
```

with

```ts
  factorization: 'Ontbinden in priemfactoren (12 t/m 200)',
  divisibility: 'Deelbaarheid door 2 t/m 15 (zonder 10)',
};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/lib/topics/divisibility.test.ts`
Expected: PASS. The exhaustive tests run about 200 000 checks and may take a few seconds.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add src/lib/topics/divisibility.ts src/lib/topics/divisibility.test.ts src/lib/types.ts src/lib/topics/index.ts
git commit -m "feat: add divisibility exercises" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Squares and square roots (`squares`)

**Files:**
- Create: `src/lib/topics/squares.ts`
- Create: `src/lib/topics/squares.test.ts`
- Modify: `src/lib/types.ts`, `src/lib/topics/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/topics/squares.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import type { Question, Step } from '../types';
import {
  generateSquares,
  MAX_BASE,
  MEMORISE_SHARE,
  MIN_BASE,
  MIN_MEMORISE_BASE,
  squareExplanation,
} from './squares';

const SAMPLES = 3000;

function sample(seed: number, count = SAMPLES): Question[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => generateSquares(rng));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

function parts(question: Question): { form: string; n: number } {
  const [, form, n] = question.key.split(':');
  return { form: form!, n: Number(n) };
}

const questions = sample(23);

describe('generateSquares', () => {
  it('asks for a square or a square root and accepts its own answer', () => {
    for (const question of questions) {
      const { form, n } = parts(question);
      const step = stepOf(question);
      expect(question.topic).toBe('squares');
      expect(step.kind).toBe('number');
      expect(n).toBeGreaterThanOrEqual(MIN_BASE);
      expect(n).toBeLessThanOrEqual(MAX_BASE);
      expect(['square', 'root']).toContain(form);
      const square = form === 'square';
      expect(step.prompt).toBe(square ? `${n}² = ?` : `√${n * n} = ?`);
      const expected = String(square ? n * n : n);
      expect(step.check(expected)).toEqual({
        correct: true,
        expected,
        explanation: squareExplanation(n),
      });
    }
  });

  it('takes 70% of the numbers from 11 to 25', () => {
    const memorise = questions.filter((q) => parts(q).n >= MIN_MEMORISE_BASE).length / SAMPLES;
    expect(memorise).toBeGreaterThan(MEMORISE_SHARE - 0.04);
    expect(memorise).toBeLessThan(MEMORISE_SHARE + 0.04);
  });

  it('uses both forms about equally often and every number', () => {
    const roots = questions.filter((q) => parts(q).form === 'root').length / SAMPLES;
    expect(roots).toBeGreaterThan(0.46);
    expect(roots).toBeLessThan(0.54);
    expect(new Set(questions.map((q) => parts(q).n)).size).toBe(MAX_BASE - MIN_BASE + 1);
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => sample(seed, 50).map((q) => q.key);
    expect(keys(5)).toEqual(keys(5));
  });
});

describe('squareExplanation', () => {
  it.each([
    [7, '7² = 7 × 7 = 49'],
    [10, '10² = 10 × 10 = 100'],
    [17, '17² = 17 × 10 + 17 × 7 = 170 + 119 = 289'],
    [20, '20² = 20 × 20 = 400'],
    [23, '23² = 23 × 20 + 23 × 3 = 460 + 69 = 529'],
    [25, '25² = 25 × 20 + 25 × 5 = 500 + 125 = 625'],
  ])('explains %i²', (n, expected) => {
    expect(squareExplanation(n)).toBe(expected);
  });

  it('adds up for every number', () => {
    for (let n = MIN_BASE; n <= MAX_BASE; n++) {
      const text = squareExplanation(n);
      expect(text.startsWith(`${n}² = `), text).toBe(true);
      expect(text.endsWith(` = ${n * n}`), text).toBe(true);
      const split = /× (\d+) \+ \d+ × (\d+) = (\d+) \+ (\d+) =/.exec(text);
      if (split) {
        const [tens, units, first, second] = split.slice(1).map(Number) as [
          number,
          number,
          number,
          number,
        ];
        expect(tens + units, text).toBe(n);
        expect(first, text).toBe(n * tens);
        expect(second, text).toBe(n * units);
      }
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/topics/squares.test.ts`
Expected: FAIL, because `./squares` cannot be resolved.

- [ ] **Step 3: Write the generator**

Create `src/lib/topics/squares.ts`:

```ts
import { formatInteger } from '../format';
import { randomInt, type Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

/** Squares and square roots (spec §5.7). */
export const MIN_BASE = 2;
export const MAX_BASE = 25;
/** 11² to 25² are the squares worth memorising. */
export const MIN_MEMORISE_BASE = 11;
export const MEMORISE_SHARE = 0.7;

/** `17² = ?` or `√289 = ?` */
export function generateSquares(rng: Rng): Question {
  const n =
    rng() < MEMORISE_SHARE
      ? randomInt(rng, MIN_MEMORISE_BASE, MAX_BASE)
      : randomInt(rng, MIN_BASE, MIN_MEMORISE_BASE - 1);
  const square = n * n;
  const form = rng() < 0.5 ? 'square' : 'root';
  return {
    key: `squares:${form}:${n}`,
    topic: 'squares',
    steps: [
      numberStep({
        prompt: form === 'square' ? `${formatInteger(n)}² = ?` : `√${formatInteger(square)} = ?`,
        answer: fromInteger(form === 'square' ? square : n),
        explanation: squareExplanation(n),
      }),
    ],
  };
}

/** '7² = 7 × 7 = 49', '20² = 20 × 20 = 400', or by splitting off the tens: '17² = 17 × 10 + …'. */
export function squareExplanation(n: number): string {
  const square = formatInteger(n * n);
  const units = n % 10;
  const tens = n - units;
  if (n <= 10 || units === 0) return `${n}² = ${n} × ${n} = ${square}`;
  return `${n}² = ${n} × ${tens} + ${n} × ${units} = ${n * tens} + ${n * units} = ${square}`;
}
```

- [ ] **Step 4: Register the topic**

In `src/lib/types.ts`, replace

```ts
  | 'divisibility';
```

with

```ts
  | 'divisibility'
  | 'squares';
```

In `src/lib/topics/index.ts`, add after the `./ratios` import:

```ts
import { generateSquares } from './squares';
```

replace

```ts
  divisibility: generateDivisibility,
};
```

with

```ts
  divisibility: generateDivisibility,
  squares: generateSquares,
};
```

and replace

```ts
  divisibility: 'Deelbaarheid door 2 t/m 15 (zonder 10)',
};
```

with

```ts
  divisibility: 'Deelbaarheid door 2 t/m 15 (zonder 10)',
  squares: 'Kwadraten en wortels (2² t/m 25²)',
};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/lib/topics/squares.test.ts`
Expected: PASS.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add src/lib/topics/squares.ts src/lib/topics/squares.test.ts src/lib/types.ts src/lib/topics/index.ts
git commit -m "feat: add square and square root exercises" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: The Getallen & delers set (`lib/sets.ts`)

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
  NUMBERS_SET,
  PRACTICE_SETS,
  PROPORTIONS_SET,
  SESSION_SIZES,
  TABLES_SET,
} from './sets';
```

replace

```ts
    expect(PRACTICE_SETS.map((set) => set.id)).toEqual(['tafels', 'meten', 'verhoudingen']);
```

with

```ts
    expect(PRACTICE_SETS.map((set) => set.id)).toEqual([
      'tafels',
      'meten',
      'verhoudingen',
      'getallen',
    ]);
```

add inside `describe('practice sets', …)`:

```ts
  it('makes Getallen & delers six equally weighted topics with 15% tables', () => {
    expect(NUMBERS_SET.name).toBe('Getallen & delers');
    expect(NUMBERS_SET.tablesPercent).toBe(15);
    expect(NUMBERS_SET.topics).toEqual([
      { topic: 'lcm', weight: 1 },
      { topic: 'gcd', weight: 1 },
      { topic: 'prime', weight: 1 },
      { topic: 'factorization', weight: 1 },
      { topic: 'divisibility', weight: 1 },
      { topic: 'squares', weight: 1 },
    ]);
  });
```

and add inside `describe('describeSetTopics', …)`:

```ts
  it('describes the Getallen & delers set', () => {
    expect(describeSetTopics(NUMBERS_SET)).toEqual([
      'KGV (kleinste gemene veelvoud)',
      'GGD (grootste gemene deler)',
      'Priemgetal of niet (11 t/m 199)',
      'Ontbinden in priemfactoren (12 t/m 200)',
      'Deelbaarheid door 2 t/m 15 (zonder 10)',
      'Kwadraten en wortels (2² t/m 25²)',
      '15% tafels',
    ]);
  });
```

In `src/lib/session.test.ts`, replace

```ts
import { MEASUREMENT_SET, PROPORTIONS_SET, SESSION_SIZES, TABLES_SET } from './sets';
```

with

```ts
import {
  MEASUREMENT_SET,
  NUMBERS_SET,
  PROPORTIONS_SET,
  SESSION_SIZES,
  TABLES_SET,
} from './sets';
```

and append:

```ts
describe('buildSession for Getallen & delers', () => {
  it('mixes 2 tables with 13 exercises over all six topics at n = 15 (spec §4.2)', () => {
    const questions = buildSession(NUMBERS_SET, 15, createRng(3));
    const counts = new Map<string, number>();
    for (const { topic } of questions) counts.set(topic, (counts.get(topic) ?? 0) + 1);
    expect(counts.get('tables')).toBe(2);
    const perTopic = NUMBERS_SET.topics.map(({ topic }) => counts.get(topic) ?? 0);
    expect(perTopic.sort((a, b) => a - b)).toEqual([2, 2, 2, 2, 2, 3]);
  });

  it.each([...SESSION_SIZES])('builds %i unique questions', (size) => {
    const questions = buildSession(NUMBERS_SET, size, createRng(size));
    expect(questions).toHaveLength(size);
    expect(new Set(questions.map((q) => q.key)).size).toBe(size);
  });
});
```

In `src/App.test.ts`, add this test at the end of `describe('App', …)`:

```ts
  it('offers Getallen & delers with its topics and the tables share', async () => {
    render(App);
    await click(/Getallen/);
    expect(screen.getByRole('heading', { name: 'Getallen & delers' })).toBeTruthy();
    expect(screen.getByText('KGV (kleinste gemene veelvoud)')).toBeTruthy();
    expect(screen.getByText('Kwadraten en wortels (2² t/m 25²)')).toBeTruthy();
    expect(screen.getByText('15% tafels')).toBeTruthy();
    await click('Start');
    expect(screen.getByText('1 / 15')).toBeTruthy();
  });
```

`/Getallen/` is case-sensitive. The Meten card's description says "grote getallen" in lowercase, so the regex matches only the new card.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/sets.test.ts src/lib/session.test.ts src/App.test.ts`
Expected: FAIL. `NUMBERS_SET` is undefined, and the App cannot find a "Getallen" button.

- [ ] **Step 3: Write the implementation**

In `src/lib/sets.ts`, replace

```ts
/** Implemented sets in roadmap order. Later plans append their set here (spec §4.1). */
export const PRACTICE_SETS: readonly PracticeSet[] = [
  TABLES_SET,
  MEASUREMENT_SET,
  PROPORTIONS_SET,
];
```

with

```ts
export const NUMBERS_SET: PracticeSet = {
  id: 'getallen',
  name: 'Getallen & delers',
  description: 'KGV, GGD, priemgetallen, deelbaarheid en kwadraten',
  topics: [
    { topic: 'lcm', weight: 1 },
    { topic: 'gcd', weight: 1 },
    { topic: 'prime', weight: 1 },
    { topic: 'factorization', weight: 1 },
    { topic: 'divisibility', weight: 1 },
    { topic: 'squares', weight: 1 },
  ],
  tablesPercent: 15,
};

/** Implemented sets in roadmap order. Later plans append their set here (spec §4.1). */
export const PRACTICE_SETS: readonly PracticeSet[] = [
  TABLES_SET,
  MEASUREMENT_SET,
  PROPORTIONS_SET,
  NUMBERS_SET,
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
git commit -m "feat: add Getallen & delers practice set" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Final verification and docs

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
   - The overview shows Tafels, Meten, Verhoudingen and Getallen & delers.
   - Getallen & delers → setup lists the six topics plus "15% tafels".
   - Start a session with 50 exercises. Check that:
     - Ja/Nee questions show two large buttons and no keypad, and one tap answers
     - the factorization keypad has `×` and `^` in the bottom row of digits and a wide `OK`; `2^2×3×7` is shown as `2² × 3 × 7` while typing
     - `OK` on `2 ×` shows "Ongeldige ontbinding" without moving on, and the message disappears at the next key
     - on a number question, `OK` on just `−` shows "Ongeldig getal"
     - the keypad still fits on screen together with the (empty) error line
     - `Is 27 180 deelbaar door 9?` shows the number with a thin space and does not wrap inside it
   - Give wrong answers on a divisibility question for 7 and for 6, and on a factorization. The explanation (e.g. `Deelbaar door 2 (…) en niet deelbaar door 3 (…) → niet deelbaar door 6`) must stay on screen without scrolling, and the results list must show the factorization as `2² × 21`, not `2^2×21`.
   - Repeat the checks in dark mode and in airplane mode.

- [ ] **Step 3: Update `CLAUDE.md`**

Replace:

```markdown
Implemented sets: **Tafels** (plan: `docs/superpowers/plans/2026-10-05-beta-tafels.md`), **Meten**
(plan: `docs/superpowers/plans/2026-10-05-meten.md`) and **Verhoudingen** v1
(plan: `docs/superpowers/plans/2026-10-05-verhoudingen.md`).
```

with:

```markdown
Implemented sets: **Tafels** (plan: `docs/superpowers/plans/2026-10-05-beta-tafels.md`), **Meten**
(plan: `docs/superpowers/plans/2026-10-05-meten.md`), **Verhoudingen** v1
(plan: `docs/superpowers/plans/2026-10-05-verhoudingen.md`) and **Getallen & delers**
(plan: `docs/superpowers/plans/2026-10-06-getallen-delers.md`).
```

In the roadmap table, in the row for set 3, change the infrastructure cell to `` Per-kind input model (`lib/inputModels.ts`) with inline invalid-input errors; `boolean` (Ja/Nee) and `factorization` answer kinds; first `lib/expr` tokenizer and parser (`×`, `^`) `` and the status cell from `planned` to `✅ done`.

Replace the first bullet under "Known follow-ups for the next plans" (the one starting with `**Before adding the `boolean`/`expression`/`factorization` answer kinds:**`) with:

```markdown
- **Bewerkingen (`expression` answer kind):** add an `expression` entry to `INPUT_MODELS`
  (`lib/inputModels.ts`, with the "Ongeldige som" message) and extend `lib/expr/parser.ts`,
  which so far only parses products of powers (`×`, `^`) over numbers, to the full §7 grammar.
  `QuestionView`, `Feedback` and `ResultScreen` need no change for a new keypad kind.
```

In the architecture block, replace

```
    keypadInput.ts      pure key → input reducer
```

with

```
    keypadInput.ts      pure key → input reducers (numbers/fractions, factorizations)
    inputModels.ts      per answer kind: keys, reducer, validate, display
    primes.ts           gcd, lcm, isPrime, prime factorization
```

and replace

```
    expr/               tokenizer, parser (AST), evaluate, rewriteCheck
```

with

```
    expr/               tokenizer, parser (AST; products of powers so far); evaluate and
                        rewriteCheck follow with Bewerkingen
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: mark Getallen & delers as implemented" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Spec coverage (self-review)

| Spec | Covered by |
|---|---|
| §4.1 Getallen & delers: six topics, weight 1, 15% tables | Task 12 |
| §4.2 example 2 tables + 3 + 2 + 2 + 2 + 2 + 2 | Task 12 (`buildSession for Getallen & delers`) |
| §5.2 pairs in `[2, 60]`, `lcm ≤ 300`, 75% shared factor, random order, explanation | Task 8 |
| §5.3 `g·p`/`g·q`, `g ∈ [2, 30]`, `a, b ≤ 200`, 10% coprime composites in `[10, 200]`, explanation | Task 8 |
| §5.4 `[11, 199]`, 50% prime, composites odd and not by 5, half hard, explanations | Task 9 |
| §5.5 Ω ≥ 3 in `[12, 200]`, free order and notation, canonical answer, ladder | Tasks 2, 4, 9 |
| §5.6 divisors 2–15 without 10, digit counts, 50% divisible, close-call table | Task 10 |
| §5.6 rule explanations, chunking for 7 and 13, combined rules for 6, 12, 14, 15 | Task 10 |
| §5.7 two forms, 70% from `[11, 25]`, tens-split explanation | Task 11 |
| §6 per-kind input model; OK disabled only when empty; inline errors, attempt kept | Tasks 6, 7 |
| §6 Ja/Nee buttons submit at once; factorization keys and input rules; pretty display | Tasks 5, 6, 7 |
| §7 tokenizer (all tokens); parser for `×` and `^` | Task 3 |
| §8 `×`, `−`, superscripts, thin-space grouping in prompts | Tasks 2, 10 (via `formatInteger`) |
| §9 `primes.ts`, `inputModels.ts`, `topics/numberTheory.ts`, `divisibility.ts`, `squares.ts` | Tasks 1, 6, 8–11 |
| §10 seeded ≥ 1000-sample tests, `check(expected)` correct, determinism, brute-force helpers | Tasks 1, 8–11 |
| §10 every divisibility explanation agrees with actual divisibility | Task 10 (`every reachable case`) |
| CLAUDE.md: `dist/sw.js` has one manifest entry | Task 13 |
