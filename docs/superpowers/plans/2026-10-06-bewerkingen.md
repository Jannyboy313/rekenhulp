# Bewerkingen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Status (2026-10-06): executed.** During execution the reviews led to several refinements that
> were agreed with the user and written into the spec (§5.8, §5.9, §5.11, §7.1). Where this plan
> and the spec or the code differ (value ranges, feedback messages, de-duplication keys, the
> checker's `noProperty` reason), the spec and the code are authoritative; this plan is history.

**Goal:** Add the **Bewerkingen** practice set with the topics `orderOfOperations` (spec §5.8), `smartCalculation` (§5.9) and `properties` (§5.11, weight 0.5, two steps). As in every set except Tafels, 15% of the exercises are tables.

**Architecture:**

- **The full `lib/expr` engine (spec §7).** The parser grows from products of powers to the whole grammar (`+ − × :`, groups, unary minus in front of a number). New modules: `evaluate.ts` (exact value or `null`), `format.ts` (prompt text, parentheses around negative literals), `reduce.ts` (evaluation one operation at a time, for explanations), `chains.ts` (n-ary `+`/`×` chains) and `rewriteCheck.ts` (is a rewrite a single valid application of a property?).
- **A new `expression` answer kind** with its own input model: digits, `+ − × :`, `( )` and `⌫` on a **4-column** keypad. Only the rewrite step uses it; every other keypad keeps 3 columns. `Keypad` gets a `columns` prop, `InputModel` an optional `columns`.
- **A `rewriteStep` factory** in `steps.ts`. It runs the rewrite checker and turns its reason into the Dutch explanation of spec §5.11.
- **Three generator modules**, following the existing pattern (a pure `(rng) => Question`):
  - `topics/orderOfOperations.ts`: 10 templates, rejection sampling, negative literals, step-by-step explanation
  - `topics/smartCalculation.ts`: six strategies with fixed explanations
  - `topics/properties.ts`: seven templates, Basis/Gevorderd, two steps (rewrite, then value)

**Tech Stack:** Svelte 5, TypeScript (strict, `noUncheckedIndexedAccess`), Vitest + @testing-library/svelte. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-05-rekenhulp-design.md`. Read §4.1, §4.2, §5.8, §5.9, §5.11, §6, §7, §7.1, §8, §9 and §11.3, §11.4, §11.8, §11.16 before starting.

---

## Scope

**In scope:**

| Spec section | What is built |
|---|---|
| §4.1 | The Bewerkingen set: `orderOfOperations` 1, `properties` 0.5, `smartCalculation` 1, and 15% tables |
| §4.2 | Quota example 5 / 3 / 5 at `n = 15` (already tested in `allocateQuotas`; now also via `buildSession`) |
| §5.8 | 10 templates, literals `[1, 20]`, power bases, exact divisions, `\|answer\| ≤ 500`, 30% negative literals, step-by-step explanation |
| §5.9 | Six strategies, value ranges, explanations, answers in `[1, 10 000]` |
| §5.11 | Seven templates, Basis/Gevorderd, example rewrites, feedback messages, step 2 with explanation |
| §6 | `expression` input model: keys, reducer rules, 4 columns, "Ongeldige som", pretty display |
| §7 | Tokenizer (superscripts), parser (full grammar), evaluate, formatter, evaluation steps, chains |
| §7.1 | Rewrite checker incl. the required test table and the decision order |

**Not in scope:**

- the v2 fraction topics and v3 Toepassingen
- smaller prompt fonts for long property prompts (checked manually in Task 15; a follow-up if needed)
- keyboard and screen-reader focus handling after a screen change (existing follow-up in CLAUDE.md)

**Decisions settled with the user on 2026-10-06 (spec §11.3, §11.8, §11.16):**

- Basis accepts only the useful (intended) property; another valid property is rejected with a hint.
- `−3²` is not generated; a negative power base is always written in parentheses.
- The expression keypad has only `0–9`, `+ − × :`, `( )` and `⌫`, in 4 columns, and is shown only for the rewrite step. Every other keypad keeps its 3 columns.
- Removing parentheses without changing the order of evaluation (`(17 + 25) + 75` → `17 + 25 + 75`) is not a step: "Er is niets veranderd".

**Assumptions written into the spec in commit `769a4f9` (the user can still veto them in this review):**

- §5.8: the 10 templates (2 to 5 operations), exponent 3 in 25% of power slots, 1 or 2 negative literals in 30% of the exercises, the first-term rule extended to the first term inside parentheses (`(−3 + 5) × 2`), and the step-by-step explanation.
- §5.9: the value ranges and explanations per strategy (e.g. `a × 4 : 100` for `: 25`).
- §5.11: the value ranges per template, the example rewrite per applicable property, the Dutch feedback messages, and step 2 (`7 × 98 = ?`, explained with the intended rewrite).
- §7: unary minus only in front of a number; `(−3)` parses as the negative literal; superscripts tokenize as powers; `evaluate` returns `null` for division by zero and exponents outside `[0, 10]`.
- §7.1: the checker's decision order (value only → unchanged → value changed → properties at the difference root → other property → reordered `−`/`:` → multiple steps).
- §11.4 (a wrong step 1 still continues to step 2) stays as in the spec; `PlayScreen` already works that way.

## Prerequisites & command permissions

- Pre-approved in this repo: `npm install`, `npm test`, `npm run check`, `npm run build`, `git add`, `git commit`.
- **Not pre-approved:** `npm run dev`, `npm run preview` and `npm run format`. Write code in the Prettier style of the snippets (single quotes, print width 100).
- **Never** use `npx` or `node`.
- Every commit message ends with the trailer `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. The commands below pass it via a second `-m`.
- `npm run check` must stay at 0 errors and 0 warnings after **every** task. This is why `AnswerKind` is widened in the same task that adds the `expression` input model, and `Topic` in the same task that registers each generator.
- If a commit fails because signing via 1Password is locked, stop and ask the user to unlock it. Never bypass signing.

## Domain notes for the implementer

- **Order of operations (Dutch convention, spec §8):** parentheses → powers → `×` and `:` with **equal** priority, left to right → `+` and `−` with equal priority, left to right. Binary operators are left-associative: `20 − 5 − 3` is `(20 − 5) − 3`, and `20 : 4 × 5` is `(20 : 4) × 5`.
- **Never** use `eval` or `Function`. Every expression goes through `lib/expr`. Never compare floats: values are `Rational`s (`lib/rational.ts`).
- **AST (`Expr`, `parser.ts`)** is a binary tree in the shape the parser produces: `number`, `binary` (`+ − × :`), `power` and `group`. A `group` is an explicit pair of parentheses. A **negative literal** is a `number` node with a negative value, not a group: `(−3)` in text is just how the formatter writes it, and the parser turns `(−3)` back into the number. Template builders must produce exactly the parser's shape; every generator test checks `parse(formatExpr(e))` deep-equals `e`.
- **Chains (`chains.ts`)** are a second view used only by the rewrite checker: consecutive `+` operands form one n-ary chain, consecutive `×` operands another. `−` and `:` stay binary. A chain only absorbs its **left** operand (`(a + b) + c` → `a, b, c`), matching left-associative parsing; a right-nested `a + (b + c)` keeps its group.
- **Raw input vs display.** Expression keypad input is stored raw, e.g. `7×100-7×2`: the ASCII hyphen `-` for minus and `×` (U+00D7). The tokenizer reads `-` as `−`. Only `INPUT_MODELS.expression.display` turns it into `7 × 100 − 7 × 2`.
- **Prompt text is parseable.** `formatExpr` writes `−` (U+2212), `×`, `:` and superscript exponents; the tokenizer reads all of them. Exception: numbers of 5+ digits get a narrow no-break space (U+202F) as thousands separator and then no longer parse as one number. Templates therefore keep every number in an expression at 4 digits or less (the largest is 1003).
- **Glyphs used in this plan:** `×` U+00D7, `−` U+2212, `²` U+00B2, `³` U+00B3, `⁰⁴⁵⁶⁷⁸⁹` U+2070–U+2079, `¹` U+00B9, `é` in `één`. All are visible characters; type them as shown. The plan never contains a literal no-break space: where one is meant, the code says `GROUP_SEPARATOR` or `\u{202f}`.

## File structure

```
src/lib/
  rational.ts (+ .test.ts)          + negate, power
  random.ts (+ .test.ts)            + randomIntWhere
  format.ts (+ .test.ts)            SUPERSCRIPT_DIGITS exported; + formatExpressionInput
  expr/
    tokenizer.ts (+ .test.ts)       + superscript exponents
    parser.ts (+ .test.ts)          full §7 grammar; Expr with + − × :, power, group
    evaluate.ts (+ .test.ts)        NEW exact value or null
    format.ts (+ .test.ts)          NEW formatExpr: prompt text
    reduce.ts (+ .test.ts)          NEW evaluationSteps, explainEvaluation
    chains.ts (+ .test.ts)          NEW toChains, sameChains
    rewriteCheck.ts (+ .test.ts)    NEW checkRewrite, Property, PROPERTIES
  types.ts                          AnswerKind + expression; Topic + three topics
  keypadInput.ts (+ .test.ts)       KeypadKey + '+', ':', '(', ')'; applyExpressionKey
  inputModels.ts (+ .test.ts)       + columns, expression model, INVALID_EXPRESSION; okSpan(keys, columns)
  steps.ts (+ .test.ts)             parseFactorization rejects negatives; + rewriteStep, REWRITE_MESSAGES
  sets.ts (+ .test.ts)              + OPERATIONS_SET, appended to PRACTICE_SETS
  session.test.ts                   Bewerkingen quotas
  topics/
    orderOfOperations.ts (+ .test.ts)  NEW
    smartCalculation.ts (+ .test.ts)   NEW
    properties.ts (+ .test.ts)         NEW
    index.ts                           registers the three generators and their labels
src/components/
  Keypad.svelte (+ .test.ts)        columns prop (CSS variable --columns)
  KeypadAnswer.svelte               passes the model's columns (3 while the kladblok types)
  QuestionView.test.ts              expression input and kladblok switch
  PlayScreen.test.ts                a property question through both steps
src/App.test.ts                     Bewerkingen reachable from the overview
CLAUDE.md                           status, roadmap row, follow-ups, architecture
```

---

### Task 1: Exact powers, negation and superscript tokens

**Files:**
- Modify: `src/lib/rational.ts`, `src/lib/format.ts`, `src/lib/expr/tokenizer.ts`
- Test: `src/lib/rational.test.ts`, `src/lib/expr/tokenizer.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/lib/rational.test.ts`, add `negate` and `power` to the import from `'./rational'` (keep it alphabetical: `multiply, negate, parseDutchNumber, …, parseMixedNumber, power, powerOfTen, …`), and append:

```ts
describe('negate', () => {
  it('flips the sign', () => {
    expect(negate(rational(3n, 4n))).toEqual(rational(-3n, 4n));
    expect(negate(rational(-7n))).toEqual(rational(7n));
    expect(negate(rational(0n))).toEqual(rational(0n));
  });
});

describe('power', () => {
  it('raises exactly', () => {
    expect(power(rational(-4n), 2)).toEqual(rational(16n));
    expect(power(rational(-2n), 3)).toEqual(rational(-8n));
    expect(power(rational(2n, 3n), 3)).toEqual(rational(8n, 27n));
    expect(power(rational(5n), 0)).toEqual(rational(1n));
  });

  it('rejects negative and fractional exponents', () => {
    expect(() => power(rational(2n), -1)).toThrow(RangeError);
    expect(() => power(rational(2n), 1.5)).toThrow(RangeError);
  });
});
```

In `src/lib/expr/tokenizer.test.ts`, add inside `describe('tokenize', …)`:

```ts
  it('reads superscript digits as a power, as written in prompts', () => {
    expect(tokenize('5²')).toEqual([
      { type: 'number', value: rational(5n) },
      { type: 'operator', operator: '^' },
      { type: 'number', value: rational(2n) },
    ]);
    expect(tokenize('2¹⁰ − 1')).toEqual([
      { type: 'number', value: rational(2n) },
      { type: 'operator', operator: '^' },
      { type: 'number', value: rational(10n) },
      { type: 'operator', operator: '−' },
      { type: 'number', value: rational(1n) },
    ]);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/rational.test.ts src/lib/expr/tokenizer.test.ts`
Expected: FAIL. `negate` and `power` are not exported, and `tokenize('5²')` returns `null`.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/rational.ts`:

```ts
/** −value. */
export function negate(value: Rational): Rational {
  return rational(-value.num, value.den);
}

/** value^exponent for an integer exponent ≥ 0. */
export function power(value: Rational, exponent: number): Rational {
  if (!Number.isSafeInteger(exponent) || exponent < 0) {
    throw new RangeError(`Invalid exponent: ${exponent}`);
  }
  const big = BigInt(exponent);
  return rational(value.num ** big, value.den ** big);
}
```

In `src/lib/format.ts`, replace

```ts
// Indexed by digit; every character is a single UTF-16 code unit.
const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
```

with

```ts
/** Indexed by digit; every character is a single UTF-16 code unit. */
export const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
```

Replace the whole of `src/lib/expr/tokenizer.ts` with:

```ts
import { SUPERSCRIPT_DIGITS } from '../format';
import { parseDutchNumber, rational, type Rational } from '../rational';

export type Operator = '+' | '−' | '×' | ':' | '^';

export type Token =
  | { type: 'number'; value: Rational }
  | { type: 'operator'; operator: Operator }
  | { type: 'open' }
  | { type: 'close' };

// Integers and Dutch decimals: '12', '3,5'.
const NUMBER = /^\d+(?:,\d+)?/;
// Superscript exponents as written in prompts: '5²' reads as '5^2' (spec §7).
const SUPERSCRIPT = /^[⁰¹²³⁴⁵⁶⁷⁸⁹]+/;

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
    const superscript = SUPERSCRIPT.exec(rest);
    if (superscript) {
      const digits = [...superscript[0]].map((char) => SUPERSCRIPT_DIGITS.indexOf(char)).join('');
      tokens.push(
        { type: 'operator', operator: '^' },
        { type: 'number', value: rational(BigInt(digits)) },
      );
      rest = rest.slice(superscript[0].length);
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

- [ ] **Step 4: Run the tests and the type check**

Run: `npm test -- src/lib/rational.test.ts src/lib/expr/tokenizer.test.ts src/lib/format.test.ts`
Expected: PASS.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rational.ts src/lib/rational.test.ts src/lib/format.ts src/lib/expr/tokenizer.ts src/lib/expr/tokenizer.test.ts
git commit -m "feat: add exact powers and superscript exponent tokens" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: The full §7 grammar (`lib/expr/parser.ts`)

**Files:**
- Modify: `src/lib/expr/parser.ts`, `src/lib/steps.ts`
- Test: `src/lib/expr/parser.test.ts`, `src/lib/steps.test.ts`

- [ ] **Step 1: Write the failing tests**

Replace the whole of `src/lib/expr/parser.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { rational } from '../rational';
import { parse, type BinaryOperator, type Expr } from './parser';

function num(value: bigint): Expr {
  return { type: 'number', value: rational(value) };
}

function bin(operator: BinaryOperator, left: Expr, right: Expr): Expr {
  return { type: 'binary', operator, left, right };
}

function group(inner: Expr): Expr {
  return { type: 'group', inner };
}

function pow(base: Expr, exponent: Expr): Expr {
  return { type: 'power', base, exponent };
}

describe('parse', () => {
  it('parses a single number', () => {
    expect(parse('84')).toEqual(num(84n));
  });

  it('parses a product from left to right', () => {
    expect(parse('2×3×7')).toEqual(bin('×', bin('×', num(2n), num(3n)), num(7n)));
  });

  it('binds ^ tighter than ×', () => {
    expect(parse('2^2×3')).toEqual(bin('×', pow(num(2n), num(2n)), num(3n)));
  });

  it('ignores whitespace', () => {
    expect(parse(' 2 ^ 2 × 3 ')).toEqual(parse('2^2×3'));
  });

  it('keeps decimals as exact numbers', () => {
    expect(parse('2,5')).toEqual({ type: 'number', value: rational(5n, 2n) });
  });

  it('binds × and : tighter than + and −', () => {
    expect(parse('2+3×4')).toEqual(bin('+', num(2n), bin('×', num(3n), num(4n))));
    expect(parse('2−6:3')).toEqual(bin('−', num(2n), bin(':', num(6n), num(3n))));
  });

  it('groups equal priorities from left to right', () => {
    expect(parse('20−5−3')).toEqual(bin('−', bin('−', num(20n), num(5n)), num(3n)));
    expect(parse('20:4×5')).toEqual(bin('×', bin(':', num(20n), num(4n)), num(5n)));
    expect(parse('1+2−3+4')).toEqual(
      bin('+', bin('−', bin('+', num(1n), num(2n)), num(3n)), num(4n)),
    );
  });

  it('keeps explicit parentheses as groups', () => {
    expect(parse('(2+3)×4')).toEqual(bin('×', group(bin('+', num(2n), num(3n))), num(4n)));
    expect(parse('(2)')).toEqual(group(num(2n)));
    expect(parse('17+(25+75)')).toEqual(
      bin('+', num(17n), group(bin('+', num(25n), num(75n)))),
    );
  });

  it('reads a minus at the start or after ( as a negative literal', () => {
    expect(parse('-7-(-12)')).toEqual(bin('−', num(-7n), num(-12n)));
    expect(parse('5×(−3)+8')).toEqual(bin('+', bin('×', num(5n), num(-3n)), num(8n)));
    expect(parse('(−3+5)×2')).toEqual(bin('×', group(bin('+', num(-3n), num(5n))), num(2n)));
  });

  it('raises a negative literal as a whole', () => {
    expect(parse('(−4)^2−10')).toEqual(bin('−', pow(num(-4n), num(2n)), num(10n)));
    // Spec §7: −3² parses as (−3)², which is why §5.8 never generates it.
    expect(parse('−3^2')).toEqual(pow(num(-3n), num(2n)));
  });

  it('reads superscript exponents and parenthesized exponents', () => {
    expect(parse('(2 + 3)² − 4')).toEqual(
      bin('−', pow(group(bin('+', num(2n), num(3n))), num(2n)), num(4n)),
    );
    expect(parse('2^(1+1)')).toEqual(pow(num(2n), group(bin('+', num(1n), num(1n)))));
  });

  it.each([
    '',
    '×',
    '2×',
    '×2',
    '2^',
    '^2',
    '2^3^4',
    '2××3',
    '2 3',
    'x',
    '(',
    '()',
    '(2',
    '2)',
    '2(3)',
    '(2)(3)',
    '(2+)',
    '2×−3',
    '2+−3',
    '−−2',
    '−(2)',
    '2^−1',
  ])('rejects %j', (input) => {
    expect(parse(input)).toBeNull();
  });
});
```

In `src/lib/steps.test.ts`, replace

```ts
  it.each(['', '2×', '2^', '2,5×2', '2^1,5', '2+3', '(2)'])('rejects %j', (input) => {
```

and the two lines after it (the `expect` and the closing `});`) with

```ts
  it.each(['', '2×', '2^', '2,5×2', '2^1,5', '2+3', '(2)', '-2', '2×(-3)'])(
    'rejects %j',
    (input) => {
      expect(parseFactorization(input)).toBeNull();
    },
  );
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/expr/parser.test.ts src/lib/steps.test.ts`
Expected: FAIL. `BinaryOperator` is not exported, and `+`, `:`, groups and unary minus are rejected.

- [ ] **Step 3: Write the implementation**

Replace the whole of `src/lib/expr/parser.ts` with:

```ts
import { negate, type Rational } from '../rational';
import { tokenize, type Operator, type Token } from './tokenizer';

export type BinaryOperator = Exclude<Operator, '^'>;

/**
 * Expression AST (spec §7). Explicit parentheses are kept as group nodes, because the
 * associative check depends on them. A negative literal is a number node with a negative value:
 * `(−3)` is its notation, not a group.
 */
export type Expr =
  | { type: 'number'; value: Rational }
  | { type: 'binary'; operator: BinaryOperator; left: Expr; right: Expr }
  | { type: 'power'; base: Expr; exponent: Expr }
  | { type: 'group'; inner: Expr };

/**
 * Recursive descent over the grammar of spec §7, by increasing precedence:
 * `sum := product (('+'|'−') product)*`, `product := power (('×'|':') power)*`,
 * `power := unary ('^' atom)?`, `unary := '−' number | atom`, `atom := number | '(' sum ')'`.
 * Unary minus is only allowed at the start and directly after '('. Binary operators are
 * left-associative. Returns null for any syntax error.
 */
export function parse(input: string): Expr | null {
  const tokenized = tokenize(input);
  if (tokenized === null) return null;
  const tokens: readonly Token[] = tokenized;
  let position = 0;

  function operatorAt<O extends Operator>(...operators: O[]): O | null {
    const token = tokens[position];
    if (token?.type !== 'operator') return null;
    return operators.find((operator) => operator === token.operator) ?? null;
  }

  function atom(): Expr | null {
    const token = tokens[position];
    if (token?.type === 'number') {
      position++;
      return { type: 'number', value: token.value };
    }
    if (token?.type !== 'open') return null;
    position++;
    const inner = sum();
    if (inner === null || tokens[position]?.type !== 'close') return null;
    position++;
    // '(−3)' is how a negative literal is written (spec §5.8), not a group.
    return inner.type === 'number' && inner.value.num < 0n ? inner : { type: 'group', inner };
  }

  function unary(): Expr | null {
    const unaryAllowed = position === 0 || tokens[position - 1]?.type === 'open';
    if (!unaryAllowed || operatorAt('−') === null) return atom();
    position++;
    const token = tokens[position];
    if (token?.type !== 'number') return null;
    position++;
    return { type: 'number', value: negate(token.value) };
  }

  function power(): Expr | null {
    const base = unary();
    if (base === null || operatorAt('^') === null) return base;
    position++;
    const exponent = atom();
    return exponent === null ? null : { type: 'power', base, exponent };
  }

  function chain(operand: () => Expr | null, operators: readonly BinaryOperator[]): Expr | null {
    let left = operand();
    while (left !== null) {
      const operator = operatorAt(...operators);
      if (operator === null) break;
      position++;
      const right = operand();
      left = right === null ? null : { type: 'binary', operator, left, right };
    }
    return left;
  }

  function product(): Expr | null {
    return chain(power, ['×', ':']);
  }

  function sum(): Expr | null {
    return chain(product, ['+', '−']);
  }

  const expr = sum();
  return expr !== null && position === tokens.length ? expr : null;
}
```

In `src/lib/steps.ts`, inside `parseFactorization`, replace

```ts
  const integer = (node: Expr): bigint | null =>
    node.type === 'number' && node.value.den === 1n ? node.value.num : null;
```

with

```ts
  // Non-negative integers only: the parser now also reads negative literals.
  const integer = (node: Expr): bigint | null =>
    node.type === 'number' && node.value.den === 1n && node.value.num >= 0n
      ? node.value.num
      : null;
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npm test`
Expected: PASS (the factorization tests in `steps.test.ts`, `inputModels.test.ts`, `QuestionView.test.ts` and `numberTheory.test.ts` still pass).

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/expr/parser.ts src/lib/expr/parser.test.ts src/lib/steps.ts src/lib/steps.test.ts
git commit -m "feat: parse the full expression grammar of spec §7" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Exact evaluation (`lib/expr/evaluate.ts`)

**Files:**
- Create: `src/lib/expr/evaluate.ts`, `src/lib/expr/evaluate.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/expr/evaluate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { rational } from '../rational';
import { evaluate } from './evaluate';
import { parse } from './parser';

function value(input: string) {
  return evaluate(parse(input)!);
}

describe('evaluate', () => {
  it.each([
    ['2+3×4', 14n],
    ['20−5−3', 12n],
    ['20:4×5', 25n],
    ['(2+3)^2', 25n],
    ['(2 + 3)² − 4 × 5', 5n],
    ['-7-(-12)', 5n],
    ['(-4)^2-10', 6n],
    ['-3^2', 9n],
    ['2^3', 8n],
    ['5^0', 1n],
  ])('%s = %s', (input, expected) => {
    expect(value(input)).toEqual(rational(expected));
  });

  it('keeps fractions exact', () => {
    expect(value('7:2')).toEqual(rational(7n, 2n));
    expect(value('1:3+1:6')).toEqual(rational(1n, 2n));
    expect(value('2,5×4')).toEqual(rational(10n));
  });

  it.each(['5:0', '5:(2−2)', '1:0+3', '2^11', '2^(1:2)', '2^(-1)'])(
    'has no value for %j',
    (input) => {
      expect(value(input)).toBeNull();
    },
  );
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/expr/evaluate.test.ts`
Expected: FAIL with "Failed to resolve import './evaluate'".

- [ ] **Step 3: Write the implementation**

Create `src/lib/expr/evaluate.ts`:

```ts
import { add, divide, multiply, power, subtract, type Rational } from '../rational';
import type { Expr } from './parser';

/** Larger exponents never occur in an exercise; the cap keeps a typed 2^999999 cheap. */
export const MAX_EXPONENT = 10;

/**
 * The exact value of an expression (spec §7). Null for a division by zero, and for an exponent
 * that is not an integer in [0, MAX_EXPONENT].
 */
export function evaluate(expr: Expr): Rational | null {
  switch (expr.type) {
    case 'number':
      return expr.value;
    case 'group':
      return evaluate(expr.inner);
    case 'power': {
      const base = evaluate(expr.base);
      const exponent = evaluate(expr.exponent);
      if (base === null || exponent === null || exponent.den !== 1n) return null;
      if (exponent.num < 0n || exponent.num > BigInt(MAX_EXPONENT)) return null;
      return power(base, Number(exponent.num));
    }
    case 'binary': {
      const left = evaluate(expr.left);
      const right = evaluate(expr.right);
      if (left === null || right === null) return null;
      switch (expr.operator) {
        case '+':
          return add(left, right);
        case '−':
          return subtract(left, right);
        case '×':
          return multiply(left, right);
        case ':':
          return right.num === 0n ? null : divide(left, right);
      }
    }
  }
}
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npm test -- src/lib/expr/evaluate.test.ts`
Expected: PASS.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/expr/evaluate.ts src/lib/expr/evaluate.test.ts
git commit -m "feat: evaluate expressions exactly" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Prompt text for expressions (`lib/expr/format.ts`)

**Files:**
- Create: `src/lib/expr/format.ts`, `src/lib/expr/format.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/expr/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { rational } from '../rational';
import { formatExpr } from './format';
import { parse, type Expr } from './parser';

function num(value: bigint): Expr {
  return { type: 'number', value: rational(value) };
}

const INPUTS: [string, string][] = [
  ['2+3×4', '2 + 3 × 4'],
  ['20-5-3', '20 − 5 − 3'],
  ['20:4×5', '20 : 4 × 5'],
  ['(2+3)^2-4×5', '(2 + 3)² − 4 × 5'],
  ['2^3', '2³'],
  ['-7-(-12)', '−7 − (−12)'],
  ['5×(-3)+8', '5 × (−3) + 8'],
  ['(-4)^2-10', '(−4)² − 10'],
  ['(-3+5)×2', '(−3 + 5) × 2'],
  ['17+(25+75)', '17 + (25 + 75)'],
  ['2,5×4', '2,5 × 4'],
  ['2^(1+1)', '2^(1 + 1)'],
];

describe('formatExpr', () => {
  it.each(INPUTS)('writes %j as %j', (input, expected) => {
    expect(formatExpr(parse(input)!)).toBe(expected);
  });

  it.each(INPUTS)('writes %j so that it parses back unchanged', (input) => {
    const expr = parse(input)!;
    expect(parse(formatExpr(expr))).toEqual(expr);
  });

  it('puts a negative literal in parentheses unless it is a first term', () => {
    const minus3 = num(-3n);
    expect(formatExpr(minus3)).toBe('−3');
    expect(formatExpr({ type: 'binary', operator: '×', left: num(5n), right: minus3 })).toBe(
      '5 × (−3)',
    );
    expect(formatExpr({ type: 'binary', operator: '×', left: minus3, right: num(5n) })).toBe(
      '−3 × 5',
    );
  });

  it('always puts a negative power base in parentheses, never −3²', () => {
    expect(formatExpr({ type: 'power', base: num(-3n), exponent: num(2n) })).toBe('(−3)²');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/expr/format.test.ts`
Expected: FAIL with "Failed to resolve import './format'".

- [ ] **Step 3: Write the implementation**

Create `src/lib/expr/format.ts`:

```ts
import { formatRational, toSuperscript } from '../format';
import type { Expr } from './parser';

/**
 * Prompt text for an expression (spec §8): spaces around binary operators, groups in
 * parentheses, whole exponents in superscript. A negative literal gets parentheses
 * (`5 × (−3)`), except as the first term of the expression or of a group, where unary minus is
 * allowed (`−7 − (−12)`, `(−3 + 5)`). As a power base it always gets them: `(−4)²` (§5.8).
 */
export function formatExpr(expr: Expr): string {
  return write(expr, true);
}

function write(expr: Expr, first: boolean): string {
  switch (expr.type) {
    case 'number': {
      const text = formatRational(expr.value);
      return isNegative(expr) && !first ? `(${text})` : text;
    }
    case 'group':
      return `(${write(expr.inner, true)})`;
    case 'power':
      return write(expr.base, first && !isNegative(expr.base)) + exponentText(expr.exponent);
    case 'binary':
      return `${write(expr.left, first)} ${expr.operator} ${write(expr.right, false)}`;
  }
}

function isNegative(expr: Expr): boolean {
  return expr.type === 'number' && expr.value.num < 0n;
}

/** '²' for a whole exponent; anything else keeps the caret: '^(1 + 1)'. */
function exponentText(exponent: Expr): string {
  return exponent.type === 'number' && exponent.value.den === 1n && exponent.value.num >= 0n
    ? toSuperscript(Number(exponent.value.num))
    : `^${write(exponent, false)}`;
}
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npm test -- src/lib/expr/format.test.ts`
Expected: PASS.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/expr/format.ts src/lib/expr/format.test.ts
git commit -m "feat: format expressions as prompt text" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Evaluation steps for explanations (`lib/expr/reduce.ts`)

**Files:**
- Create: `src/lib/expr/reduce.ts`, `src/lib/expr/reduce.test.ts`

One operation per step, in the order of spec §8: the deepest parentheses first, then the highest rank (powers 3, `×`/`:` 2, `+`/`−` 1), and among equals the leftmost. A group disappears as soon as its content is a number; a negative intermediate then gets its parentheses from `formatExpr` (`2 × (−2)`).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/expr/reduce.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { evaluate } from './evaluate';
import { parse } from './parser';
import { evaluationSteps, explainEvaluation } from './reduce';

const CASES: [string, string][] = [
  ['12', '12'],
  ['3+4×5', '3 + 4 × 5 = 3 + 20 = 23'],
  ['3×(8-2)+4', '3 × (8 − 2) + 4 = 3 × 6 + 4 = 18 + 4 = 22'],
  ['20:4×5', '20 : 4 × 5 = 5 × 5 = 25'],
  ['2+3×4-6:2', '2 + 3 × 4 − 6 : 2 = 2 + 12 − 6 : 2 = 2 + 12 − 3 = 14 − 3 = 11'],
  ['(2+3)^2-4×5', '(2 + 3)² − 4 × 5 = 5² − 4 × 5 = 25 − 4 × 5 = 25 − 20 = 5'],
  ['(1+2)×(3+4×5)', '(1 + 2) × (3 + 4 × 5) = (1 + 2) × (3 + 20) = 3 × (3 + 20) = 3 × 23 = 69'],
  ['-7-(-12)', '−7 − (−12) = 5'],
  ['2×(3-5)', '2 × (3 − 5) = 2 × (−2) = −4'],
  ['(3-5)^2', '(3 − 5)² = (−2)² = 4'],
  ['7×100-7×2', '7 × 100 − 7 × 2 = 700 − 7 × 2 = 700 − 14 = 686'],
];

describe('explainEvaluation', () => {
  it.each(CASES)('explains %j as %j', (input, expected) => {
    expect(explainEvaluation(parse(input)!)).toBe(expected);
  });
});

describe('evaluationSteps', () => {
  it.each(CASES)('ends %j with its value', (input) => {
    const expr = parse(input)!;
    const last = evaluationSteps(expr).at(-1) ?? expr;
    expect(last).toEqual({ type: 'number', value: evaluate(expr) });
  });

  it('throws for an expression without a value', () => {
    expect(() => evaluationSteps(parse('1:0+3')!)).toThrow(RangeError);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/expr/reduce.test.ts`
Expected: FAIL with "Failed to resolve import './reduce'".

- [ ] **Step 3: Write the implementation**

Create `src/lib/expr/reduce.ts`:

```ts
import { evaluate } from './evaluate';
import { formatExpr } from './format';
import type { BinaryOperator, Expr } from './parser';

/** After parentheses, the higher rank goes first (spec §8). */
const RANK: Record<BinaryOperator, number> = { '+': 1, '−': 1, '×': 2, ':': 2 };
const POWER_RANK = 3;

/** An operation whose operands are numbers, ready to be computed. */
interface Candidate {
  node: Expr;
  /** Number of enclosing groups: the innermost parentheses go first. */
  depth: number;
  rank: number;
  /** The whole expression with this operation replaced by `value`. */
  replace: (value: Expr) => Expr;
}

/** Collects the ready operations in reading order. */
function collect(
  expr: Expr,
  depth: number,
  rebuild: (node: Expr) => Expr,
  found: Candidate[],
): void {
  switch (expr.type) {
    case 'number':
      return;
    case 'group':
      // Once its content is a number, the group disappears: '(3 − 5)' becomes '−2'.
      collect(
        expr.inner,
        depth + 1,
        (inner) => rebuild(inner.type === 'number' ? inner : { type: 'group', inner }),
        found,
      );
      return;
    case 'power': {
      const { base, exponent } = expr;
      if (base.type === 'number' && exponent.type === 'number') {
        found.push({ node: expr, depth, rank: POWER_RANK, replace: rebuild });
        return;
      }
      collect(base, depth, (node) => rebuild({ type: 'power', base: node, exponent }), found);
      collect(exponent, depth, (node) => rebuild({ type: 'power', base, exponent: node }), found);
      return;
    }
    case 'binary': {
      const { operator, left, right } = expr;
      if (left.type === 'number' && right.type === 'number') {
        found.push({ node: expr, depth, rank: RANK[operator], replace: rebuild });
        return;
      }
      collect(left, depth, (node) => rebuild({ type: 'binary', operator, left: node, right }), found);
      collect(right, depth, (node) => rebuild({ type: 'binary', operator, left, right: node }), found);
      return;
    }
  }
}

/**
 * The expression after each single operation, ending with its value (spec §5.8): innermost
 * parentheses first, then powers, then × and : from left to right, then + and − from left to
 * right. Throws for an expression without a value.
 */
export function evaluationSteps(expr: Expr): Expr[] {
  const steps: Expr[] = [];
  let current = expr;
  while (current.type !== 'number') {
    const found: Candidate[] = [];
    collect(current, 0, (node) => node, found);
    // Strictly greater, so the leftmost of equals wins.
    const next = found.reduce<Candidate | null>(
      (best, candidate) =>
        best === null ||
        candidate.depth > best.depth ||
        (candidate.depth === best.depth && candidate.rank > best.rank)
          ? candidate
          : best,
      null,
    );
    const value = next === null ? null : evaluate(next.node);
    if (next === null || value === null) {
      throw new RangeError(`Cannot evaluate ${formatExpr(current)}`);
    }
    current = next.replace({ type: 'number', value });
    steps.push(current);
  }
  return steps;
}

/** '3 × (8 − 2) + 4 = 3 × 6 + 4 = 18 + 4 = 22' */
export function explainEvaluation(expr: Expr): string {
  return [expr, ...evaluationSteps(expr)].map(formatExpr).join(' = ');
}
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npm test -- src/lib/expr/reduce.test.ts`
Expected: PASS.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/expr/reduce.ts src/lib/expr/reduce.test.ts
git commit -m "feat: explain an evaluation one operation at a time" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Chains (`lib/expr/chains.ts`)

**Files:**
- Create: `src/lib/expr/chains.ts`, `src/lib/expr/chains.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/expr/chains.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { rational } from '../rational';
import { sameChains, toChains, type ChainExpr, type ChainOperator } from './chains';
import { parse, type Expr } from './parser';

const chains = (input: string): ChainExpr => toChains(parse(input)!);

function n(value: bigint): ChainExpr {
  return { type: 'number', value: rational(value) };
}

function chain(operator: ChainOperator, ...operands: ChainExpr[]): ChainExpr {
  return { type: 'chain', operator, operands };
}

function group(inner: ChainExpr): ChainExpr {
  return { type: 'group', inner };
}

function binary(operator: '−' | ':', left: ChainExpr, right: ChainExpr): ChainExpr {
  return { type: 'binary', operator, left, right };
}

describe('toChains', () => {
  it('joins consecutive + and × operands into one chain', () => {
    expect(chains('2+3+4')).toEqual(chain('+', n(2n), n(3n), n(4n)));
    expect(chains('2×3×4')).toEqual(chain('×', n(2n), n(3n), n(4n)));
    expect(chains('2×3+4×5')).toEqual(
      chain('+', chain('×', n(2n), n(3n)), chain('×', n(4n), n(5n))),
    );
  });

  it('starts a new chain inside parentheses', () => {
    expect(chains('(2+3)+4')).toEqual(chain('+', group(chain('+', n(2n), n(3n))), n(4n)));
    expect(chains('2+(3+4)')).toEqual(chain('+', n(2n), group(chain('+', n(3n), n(4n)))));
  });

  it('keeps − and : binary, so they break a chain', () => {
    expect(chains('20−5−3')).toEqual(binary('−', binary('−', n(20n), n(5n)), n(3n)));
    expect(chains('1+2−3+4')).toEqual(
      chain('+', binary('−', chain('+', n(1n), n(2n)), n(3n)), n(4n)),
    );
    expect(chains('2×3:4×5')).toEqual(
      chain('×', binary(':', chain('×', n(2n), n(3n)), n(4n)), n(5n)),
    );
  });

  it('keeps powers', () => {
    expect(chains('(2+3)^2')).toEqual({
      type: 'power',
      base: group(chain('+', n(2n), n(3n))),
      exponent: n(2n),
    });
  });

  it('absorbs only a left operand, like left-associative parsing', () => {
    const num = (value: bigint): Expr => ({ type: 'number', value: rational(value) });
    const rightNested: Expr = {
      type: 'binary',
      operator: '+',
      left: num(17n),
      right: { type: 'binary', operator: '+', left: num(25n), right: num(75n) },
    };
    expect(toChains(rightNested)).toEqual(chain('+', n(17n), chain('+', n(25n), n(75n))));
  });
});

describe('sameChains', () => {
  it('compares structure, operators and values', () => {
    expect(sameChains(chains('2+3×4'), chains('2 + 3 × 4'))).toBe(true);
    expect(sameChains(chains('0,5'), chains('0,50'))).toBe(true);
    expect(sameChains(chains('2+3'), chains('3+2'))).toBe(false);
    expect(sameChains(chains('2+3'), chains('2−3'))).toBe(false);
    expect(sameChains(chains('(2+3)'), chains('2+3'))).toBe(false);
    expect(sameChains(chains('2+3+4'), chains('2+3'))).toBe(false);
    expect(sameChains(chains('2^2'), chains('2^3'))).toBe(false);
    expect(sameChains(chains('0,5'), chains('1:2'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/expr/chains.test.ts`
Expected: FAIL with "Failed to resolve import './chains'".

- [ ] **Step 3: Write the implementation**

Create `src/lib/expr/chains.ts`:

```ts
import { equals, type Rational } from '../rational';
import type { Expr } from './parser';

export type ChainOperator = '+' | '×';

/**
 * The AST with chains (spec §7): within one parenthesis level, consecutive + operands form one
 * n-ary sum chain and consecutive × operands one product chain. − and : stay binary: they are
 * not chainable for the commutative and associative properties.
 */
export type ChainExpr =
  | { type: 'number'; value: Rational }
  | { type: 'chain'; operator: ChainOperator; operands: readonly ChainExpr[] }
  | { type: 'binary'; operator: '−' | ':'; left: ChainExpr; right: ChainExpr }
  | { type: 'power'; base: ChainExpr; exponent: ChainExpr }
  | { type: 'group'; inner: ChainExpr };

export function toChains(expr: Expr): ChainExpr {
  switch (expr.type) {
    case 'number':
      return expr;
    case 'group':
      return { type: 'group', inner: toChains(expr.inner) };
    case 'power':
      return { type: 'power', base: toChains(expr.base), exponent: toChains(expr.exponent) };
    case 'binary': {
      const { operator } = expr;
      if (operator === '−' || operator === ':') {
        return { type: 'binary', operator, left: toChains(expr.left), right: toChains(expr.right) };
      }
      return { type: 'chain', operator, operands: chainOperands(expr, operator) };
    }
  }
}

/**
 * Left-associative parsing nests a chain in its left operand: (a + b) + c gives a, b, c. A
 * right operand never continues the chain, so a + (b + c) without its group stays nested.
 */
function chainOperands(expr: Expr, operator: ChainOperator): ChainExpr[] {
  return expr.type === 'binary' && expr.operator === operator
    ? [...chainOperands(expr.left, operator), toChains(expr.right)]
    : [toChains(expr)];
}

/** Structural equality: same shape, same operators, equal numbers. */
export function sameChains(a: ChainExpr, b: ChainExpr): boolean {
  switch (a.type) {
    case 'number':
      return b.type === 'number' && equals(a.value, b.value);
    case 'group':
      return b.type === 'group' && sameChains(a.inner, b.inner);
    case 'power':
      return b.type === 'power' && sameChains(a.base, b.base) && sameChains(a.exponent, b.exponent);
    case 'binary':
      return (
        b.type === 'binary' &&
        a.operator === b.operator &&
        sameChains(a.left, b.left) &&
        sameChains(a.right, b.right)
      );
    case 'chain':
      return (
        b.type === 'chain' &&
        a.operator === b.operator &&
        a.operands.length === b.operands.length &&
        a.operands.every((operand, index) => sameChains(operand, b.operands[index]!))
      );
  }
}
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npm test -- src/lib/expr/chains.test.ts`
Expected: PASS.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/expr/chains.ts src/lib/expr/chains.test.ts
git commit -m "feat: view sums and products as n-ary chains" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: The rewrite checker (`lib/expr/rewriteCheck.ts`)

**Files:**
- Create: `src/lib/expr/rewriteCheck.ts`, `src/lib/expr/rewriteCheck.test.ts`

How it decides (spec §7.1), in this order:

1. The rewrite is a single number → `valueOnly`.
2. With all groups removed, both ASTs are identical (the order of evaluation did not change) → `unchanged`.
3. The values differ, or the rewrite has no value → `valueChanged`.
4. Both ASTs become chains. The **difference root** is the smallest pair of subtrees that contains every difference: descend while both nodes have the same type, operator and number of children and exactly one child differs. Outside it everything is identical, so each property test only looks at the root pair.
5. The required property detected (or `'any'` and any detected) → valid. Another property detected → `otherProperty`.
6. Otherwise: the original's root is a `−` or `:` with the same numbers on both sides → `notForMinusOrDivide`; else `multipleSteps`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/expr/rewriteCheck.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parse } from './parser';
import { checkRewrite, PROPERTIES, type Property, type RewriteReason } from './rewriteCheck';

function check(original: string, rewritten: string, property: Property | 'any') {
  return checkRewrite(parse(original)!, parse(rewritten)!, property);
}

type Case = [string, Property | 'any', string, RewriteReason | null];

function expectCase([original, property, rewritten, reason]: Case) {
  const result = check(original, rewritten, property);
  expect(result.reason).toBe(reason);
  expect(result.valid).toBe(reason === null);
}

describe('checkRewrite', () => {
  it.each<Case>([
    ['7 × 98', 'distributive', '7 × 100 − 7 × 2', null],
    ['7 × 98', 'distributive', '7 × 90 + 7 × 8', null],
    ['7 × 98', 'distributive', '686', 'valueOnly'],
    ['7 × 98', 'distributive', '98 × 7', 'otherProperty'],
    ['(17 + 25) + 75', 'associative', '17 + (25 + 75)', null],
    ['(17 + 25) + 75', 'associative', '(25 + 75) + 17', 'multipleSteps'],
    ['(17 + 25) + 75', 'commutative', '75 + (17 + 25)', null],
    ['25 × 37 × 4', 'commutative', '25 × 4 × 37', null],
    ['25 × 37 × 4', 'commutative', '(25 × 4) × 37', 'multipleSteps'],
    ['7 × 13 + 7 × 87', 'distributive', '7 × (13 + 87)', null],
    ['20 − 5 − 3', 'commutative', '20 − 3 − 5', 'notForMinusOrDivide'],
    ['(17 + 25) + 75', 'associative', '17 + 25 + 75', 'unchanged'],
  ])('handles the spec §7.1 case %s, %s: %s', (...row) => {
    expectCase(row);
  });

  it.each<Case>([
    ['7 × 98', 'distributive', '100 × 7 − 2 × 7', null],
    ['7 × 98', 'distributive', '5 × 98 + 2 × 98', null],
    ['7 × 98', 'distributive', '7 × 98', 'unchanged'],
    ['7 × 98', 'distributive', '(7 × 98)', 'unchanged'],
    ['7 × 98', 'distributive', '7 × 100 − 7 × 3', 'valueChanged'],
    ['7 × 98', 'distributive', '7 × 100 − 14', 'multipleSteps'],
    ['6 × (40 + 3)', 'distributive', '6 × 40 + 6 × 3', null],
    ['6 × (40 + 3)', 'distributive', '40 × 6 + 3 × 6', null],
    ['6 × (40 + 3)', 'commutative', '6 × (3 + 40)', null],
    ['6 × (40 + 3)', 'distributive', '(40 + 3) × 6', 'otherProperty'],
    ['7 × 103 − 7 × 3', 'distributive', '7 × (103 − 3)', null],
    ['(13 × 25) × 4', 'associative', '13 × (25 × 4)', null],
    ['25 × 37 × 4', 'associative', '25 × (37 × 4)', null],
    ['(17 + 25) + 75', 'commutative', '(25 + 17) + 75', null],
    ['38 + 57 + 62', 'commutative', '38 + 62 + 57', null],
    ['38 + 57 + 62', 'associative', '38 + (57 + 62)', null],
    ['12 : 3 : 2', 'commutative', '12 : 2 : 3', 'notForMinusOrDivide'],
    ['2 × ((17 + 25) + 75)', 'associative', '2 × (17 + (25 + 75))', null],
    ['7 × 98 + 1', 'distributive', '7 × 100 − 7 × 2 + 1', null],
    ['5 : 1', 'any', '5 : (1 − 1)', 'valueChanged'],
  ])('handles %s, %s: %s', (...row) => {
    expectCase(row);
  });

  it('reports the property of a valid step with another property', () => {
    expect(check('7 × 98', '98 × 7', 'distributive')).toEqual({
      valid: false,
      detected: ['commutative'],
      reason: 'otherProperty',
    });
    expect(check('38 + 57 + 62', '38 + (57 + 62)', 'commutative')).toEqual({
      valid: false,
      detected: ['associative'],
      reason: 'otherProperty',
    });
  });

  it('accepts any single property with any', () => {
    expect(check('38 + 57 + 62', '62 + 57 + 38', 'any')).toEqual({
      valid: true,
      detected: ['commutative'],
      reason: null,
    });
    expect(check('(17 + 25) + 75', '17 + (25 + 75)', 'any').detected).toEqual(['associative']);
    expect(check('7 × 98', '7 × 90 + 7 × 8', 'any').detected).toEqual(['distributive']);
  });

  it('lists the properties in a fixed order', () => {
    expect(PROPERTIES).toEqual(['commutative', 'associative', 'distributive']);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/expr/rewriteCheck.test.ts`
Expected: FAIL with "Failed to resolve import './rewriteCheck'".

- [ ] **Step 3: Write the implementation**

Create `src/lib/expr/rewriteCheck.ts`:

```ts
import { add, equals, subtract, type Rational } from '../rational';
import { sameChains, toChains, type ChainExpr, type ChainOperator } from './chains';
import { evaluate } from './evaluate';
import type { Expr } from './parser';

export type Property = 'commutative' | 'associative' | 'distributive';

export const PROPERTIES: readonly Property[] = ['commutative', 'associative', 'distributive'];

/** Why a rewrite is rejected; spec §5.11 has the Dutch messages, §7.1 the order. */
export type RewriteReason =
  | 'valueOnly'
  | 'unchanged'
  | 'valueChanged'
  | 'otherProperty'
  | 'notForMinusOrDivide'
  | 'multipleSteps';

/** `detected`: every property of which the step is a single valid application. */
export type RewriteResult =
  | { valid: true; detected: Property[]; reason: null }
  | { valid: false; detected: Property[]; reason: RewriteReason };

/** Whether `rewritten` is a single valid application of `property` to `original` (§7.1). */
export function checkRewrite(
  original: Expr,
  rewritten: Expr,
  property: Property | 'any',
): RewriteResult {
  const reject = (reason: RewriteReason, detected: Property[] = []): RewriteResult => ({
    valid: false,
    detected,
    reason,
  });
  if (rewritten.type === 'number') return reject('valueOnly');
  if (sameChains(toChains(stripGroups(original)), toChains(stripGroups(rewritten)))) {
    return reject('unchanged');
  }
  const before = evaluate(original);
  const after = evaluate(rewritten);
  if (before === null || after === null || !equals(before, after)) return reject('valueChanged');

  const [from, to] = differenceRoot(toChains(original), toChains(rewritten));
  const detected = PROPERTIES.filter((candidate) => DETECTORS[candidate](from, to));
  if (property === 'any' ? detected.length > 0 : detected.includes(property)) {
    return { valid: true, detected, reason: null };
  }
  if (detected.length > 0) return reject('otherProperty', detected);
  const reordered = from.type === 'binary' && isPermutation(numbers(from), numbers(to));
  return reject(reordered ? 'notForMinusOrDivide' : 'multipleSteps');
}

/** The AST without parentheses: what remains is the order of evaluation. */
function stripGroups(expr: Expr): Expr {
  switch (expr.type) {
    case 'number':
      return expr;
    case 'group':
      return stripGroups(expr.inner);
    case 'power':
      return { type: 'power', base: stripGroups(expr.base), exponent: stripGroups(expr.exponent) };
    case 'binary':
      return { ...expr, left: stripGroups(expr.left), right: stripGroups(expr.right) };
  }
}

function children(expr: ChainExpr): readonly ChainExpr[] {
  switch (expr.type) {
    case 'number':
      return [];
    case 'group':
      return [expr.inner];
    case 'power':
      return [expr.base, expr.exponent];
    case 'binary':
      return [expr.left, expr.right];
    case 'chain':
      return expr.operands;
  }
}

/** Same type, operator and number of children; numbers must also be equal. */
function sameNode(a: ChainExpr, b: ChainExpr): boolean {
  if (a.type === 'number' || b.type === 'number') return sameChains(a, b);
  const operator = (expr: ChainExpr) => ('operator' in expr ? expr.operator : null);
  return (
    a.type === b.type && operator(a) === operator(b) && children(a).length === children(b).length
  );
}

/** The smallest pair of subtrees that contains every difference; outside it all is identical. */
function differenceRoot(a: ChainExpr, b: ChainExpr): [ChainExpr, ChainExpr] {
  if (!sameNode(a, b)) return [a, b];
  const left = children(a);
  const right = children(b);
  const differing = left.flatMap((child, index) => (sameChains(child, right[index]!) ? [] : [index]));
  if (differing.length !== 1) return [a, b];
  const index = differing[0]!;
  return differenceRoot(left[index]!, right[index]!);
}

const DETECTORS: Record<Property, (from: ChainExpr, to: ChainExpr) => boolean> = {
  commutative: isCommutative,
  associative: isAssociative,
  distributive: (from, to) => isExpansion(from, to, true) || isExpansion(to, from, false),
};

/** One chain whose operands are permuted; the operands themselves are unchanged. */
function isCommutative(from: ChainExpr, to: ChainExpr): boolean {
  return (
    from.type === 'chain' &&
    to.type === 'chain' &&
    from.operator === to.operator &&
    isPermutation(from.operands, to.operands) &&
    !from.operands.every((operand, index) => sameChains(operand, to.operands[index]!))
  );
}

/**
 * One chain whose operands, flattened through groups of the same operator, keep their order.
 * The grouping differs: step 2 of checkRewrite already rejected an unchanged order.
 */
function isAssociative(from: ChainExpr, to: ChainExpr): boolean {
  if (from.type !== 'chain' || to.type !== 'chain' || from.operator !== to.operator) return false;
  const before = flatten(from, from.operator);
  const after = flatten(to, to.operator);
  return (
    before.length === after.length &&
    before.every((operand, index) => sameChains(operand, after[index]!))
  );
}

function flatten(expr: ChainExpr, operator: ChainOperator): ChainExpr[] {
  if (expr.type === 'group') {
    return expr.inner.type === 'chain' && expr.inner.operator === operator
      ? flatten(expr.inner, operator)
      : [expr];
  }
  return expr.type === 'chain' && expr.operator === operator
    ? expr.operands.flatMap((operand) => flatten(operand, operator))
    : [expr];
}

/** `t₁ ± t₂`: a sum of two terms, or a difference. */
interface TwoTerms {
  operator: '+' | '−';
  first: ChainExpr;
  second: ChainExpr;
}

function twoTerms(expr: ChainExpr): TwoTerms | null {
  if (expr.type === 'chain' && expr.operator === '+' && expr.operands.length === 2) {
    return { operator: '+', first: expr.operands[0]!, second: expr.operands[1]! };
  }
  if (expr.type === 'binary' && expr.operator === '−') {
    return { operator: '−', first: expr.left, second: expr.right };
  }
  return null;
}

/** The two factors of `a × b`; null for anything else. */
function twoFactors(expr: ChainExpr): [ChainExpr, ChainExpr] | null {
  return expr.type === 'chain' && expr.operator === '×' && expr.operands.length === 2
    ? [expr.operands[0]!, expr.operands[1]!]
    : null;
}

/** t in `F × t` or `t × F`; null when F is not one of the two factors. */
function otherFactor(product: ChainExpr, factor: ChainExpr): ChainExpr | null {
  const factors = twoFactors(product);
  if (factors === null) return null;
  if (sameChains(factors[0], factor)) return factors[1];
  return sameChains(factors[1], factor) ? factors[0] : null;
}

/**
 * Whether `expanded` is `F×t₁ ± F×t₂` for `product` = `F × S` or `S × F` (spec §7.1), with the
 * factor on either side in each term. S is `(t₁ ± t₂)`; with `allowSplit` also a number literal
 * n = t₁ ± t₂ of two number literals. Reversed (factor out), S must be a group.
 */
function isExpansion(product: ChainExpr, expanded: ChainExpr, allowSplit: boolean): boolean {
  const factors = twoFactors(product);
  const terms = twoTerms(expanded);
  if (factors === null || terms === null) return false;
  const choices: [ChainExpr, ChainExpr][] = [factors, [factors[1], factors[0]]];
  return choices.some(([factor, sum]) => {
    const t1 = otherFactor(terms.first, factor);
    const t2 = otherFactor(terms.second, factor);
    if (t1 === null || t2 === null) return false;
    if (sum.type === 'group') {
      const inner = twoTerms(sum.inner);
      return (
        inner !== null &&
        inner.operator === terms.operator &&
        sameChains(inner.first, t1) &&
        sameChains(inner.second, t2)
      );
    }
    return (
      allowSplit &&
      sum.type === 'number' &&
      t1.type === 'number' &&
      t2.type === 'number' &&
      equals(combine(terms.operator, t1.value, t2.value), sum.value)
    );
  });
}

function combine(operator: '+' | '−', a: Rational, b: Rational): Rational {
  return operator === '+' ? add(a, b) : subtract(a, b);
}

function numbers(expr: ChainExpr): ChainExpr[] {
  return expr.type === 'number' ? [expr] : children(expr).flatMap(numbers);
}

/** The same items in any order, compared structurally. */
function isPermutation(a: readonly ChainExpr[], b: readonly ChainExpr[]): boolean {
  if (a.length !== b.length) return false;
  const unused = [...b];
  for (const item of a) {
    const index = unused.findIndex((candidate) => sameChains(candidate, item));
    if (index < 0) return false;
    unused.splice(index, 1);
  }
  return true;
}
```

`DETECTORS` is a `const` that refers to function declarations further down. Function declarations are hoisted, and `checkRewrite` only reads `DETECTORS` when it is called, so the order is safe.

- [ ] **Step 4: Run the tests and the type check**

Run: `npm test -- src/lib/expr/rewriteCheck.test.ts`
Expected: PASS. If a row fails, do not change the expectation: compare the row with spec §7.1 and the decision order above, and report a real disagreement.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/expr/rewriteCheck.ts src/lib/expr/rewriteCheck.test.ts
git commit -m "feat: check that a rewrite applies one property" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Expression keys: reducer and display

**Files:**
- Modify: `src/lib/keypadInput.ts`, `src/lib/format.ts`
- Test: `src/lib/keypadInput.test.ts`, `src/lib/format.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/lib/keypadInput.test.ts`, add `applyExpressionKey` and `MAX_EXPRESSION_LENGTH` to the import from `'./keypadInput'` (after `applyKey` and after `EMPTY_FRACTION_INPUT` respectively), and append:

```ts
describe('applyExpressionKey', () => {
  const typeExpression = (keys: KeypadKey[], start = '') => keys.reduce(applyExpressionKey, start);

  it('builds an expression with operators and parentheses', () => {
    expect(typeExpression(['7', '×', '(', '1', '3', '+', '8', '7', ')'])).toBe('7×(13+87)');
    expect(typeExpression(['7', '×', '1', '0', '0', '-', '7', '×', '2'])).toBe('7×100-7×2');
    expect(typeExpression(['(', '(', '1', '+', '2', ')', ':', '3', ')'])).toBe('((1+2):3)');
  });

  it('allows an operator only after a number or )', () => {
    expect(typeExpression(['+'])).toBe('');
    expect(typeExpression(['-'])).toBe('');
    expect(typeExpression(['2', '×', ':'])).toBe('2×');
    expect(typeExpression(['(', '×'])).toBe('(');
    expect(typeExpression(['(', '2', ')', ':'])).toBe('(2):');
  });

  it('opens a parenthesis only at the start, after an operator or after (', () => {
    expect(typeExpression(['2', '('])).toBe('2');
    expect(typeExpression(['(', '1', ')', '('])).toBe('(1)');
    expect(typeExpression(['2', '+', '(', '('])).toBe('2+((');
  });

  it('closes a parenthesis only after an operand while one is open', () => {
    expect(typeExpression(['2', ')'])).toBe('2');
    expect(typeExpression(['(', ')'])).toBe('(');
    expect(typeExpression(['(', '2', '+', ')'])).toBe('(2+');
    expect(typeExpression(['(', '2', ')', ')'])).toBe('(2)');
  });

  it('allows no digit directly after )', () => {
    expect(typeExpression(['(', '2', ')', '3'])).toBe('(2)');
  });

  it('ignores keys that are not expression keys', () => {
    expect(typeExpression(['2', ',', '^', '/', ' '])).toBe('2');
  });

  it('deletes the last character', () => {
    expect(applyExpressionKey('7×(13', 'backspace')).toBe('7×(1');
    expect(applyExpressionKey('', 'backspace')).toBe('');
  });

  it(`stops at ${MAX_EXPRESSION_LENGTH} characters`, () => {
    const full = '1+'.repeat(MAX_EXPRESSION_LENGTH / 2 - 1) + '12';
    expect(full).toHaveLength(MAX_EXPRESSION_LENGTH);
    expect(applyExpressionKey(full, '3')).toBe(full);
    expect(applyExpressionKey(full, 'backspace')).toBe(full.slice(0, -1));
  });
});
```

In `src/lib/format.test.ts`, add `formatExpressionInput` to the import from `'./format'` (after `formatEuro`), and append:

```ts
describe('formatExpressionInput', () => {
  it('spaces the operators and shows a typographic minus', () => {
    expect(formatExpressionInput('7×(13+87)')).toBe('7 × (13 + 87)');
    expect(formatExpressionInput('7×100-7×2')).toBe(`7 × 100 ${MINUS} 7 × 2`);
    expect(formatExpressionInput('12:3')).toBe('12 : 3');
    expect(formatExpressionInput('2×')).toBe('2 × ');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/keypadInput.test.ts src/lib/format.test.ts`
Expected: FAIL. `applyExpressionKey` and `formatExpressionInput` are not exported, and `'+'`, `':'`, `'('`, `')'` are not `KeypadKey`s.

- [ ] **Step 3: Write the implementation**

In `src/lib/keypadInput.ts`, replace

```ts
/** ' ' is the kladblok's spatie; the answer reducers ignore it. */
export type KeypadKey = DigitKey | ',' | '-' | '/' | '×' | '^' | ' ' | 'backspace';
```

with

```ts
/** ' ' is the kladblok's spatie; the answer reducers ignore it. */
export type KeypadKey =
  | DigitKey
  | ','
  | '-'
  | '+'
  | '×'
  | ':'
  | '^'
  | '('
  | ')'
  | '/'
  | ' '
  | 'backspace';
```

and append:

```ts
/** The longest useful rewrite is 19×1000-19×3 (12 characters); 30 leaves room. */
export const MAX_EXPRESSION_LENGTH = 30;

const EXPRESSION_OPERATORS: ReadonlySet<KeypadKey> = new Set<KeypadKey>(['+', '-', '×', ':']);

/**
 * Expression input (spec §6): integers, + − × : and parentheses, with '-' always the operator.
 * An operator only after a number or ')'; '(' only at the start, after an operator or after '(';
 * ')' only after a number or ')' while a '(' is open; a digit not directly after ')'.
 */
export function applyExpressionKey(value: string, key: KeypadKey): string {
  if (key === 'backspace') return value.slice(0, -1);
  if (value.length >= MAX_EXPRESSION_LENGTH) return value;
  const afterOperand = /[\d)]$/.test(value);
  if (/^\d$/.test(key)) return value.endsWith(')') ? value : value + key;
  if (EXPRESSION_OPERATORS.has(key)) return afterOperand ? value + key : value;
  if (key === '(') return afterOperand ? value : value + key;
  if (key === ')') return afterOperand && openParentheses(value) > 0 ? value + key : value;
  // The comma, ^, the breuk key and the spatie are not expression keys.
  return value;
}

function openParentheses(value: string): number {
  let open = 0;
  for (const char of value) {
    if (char === '(') open++;
    else if (char === ')') open--;
  }
  return open;
}
```

In `src/lib/format.ts`, append:

```ts
/** Expression keypad input '7×(13+87)' as '7 × (13 + 87)'; every '-' is the minus operator. */
export function formatExpressionInput(raw: string): string {
  return raw.replace(/[-+×:]/g, (operator) => ` ${operator === '-' ? MINUS : operator} `);
}
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npm test`
Expected: PASS.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/keypadInput.ts src/lib/keypadInput.test.ts src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: add the expression key reducer and its display" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: The `expression` answer kind and the 4-column keypad

**Files:**
- Modify: `src/lib/types.ts`, `src/lib/inputModels.ts`, `src/components/Keypad.svelte`, `src/components/KeypadAnswer.svelte`
- Test: `src/lib/inputModels.test.ts`, `src/components/Keypad.test.ts`, `src/components/QuestionView.test.ts`

The keypad's column count becomes a CSS variable (`--columns`), so the grid and the tests read the same value. While a kladblok cell is active, `KeypadAnswer` shows the number keys in 3 columns, whatever the answer kind (spec §3.6).

- [ ] **Step 1: Write the failing tests**

In `src/lib/inputModels.test.ts`, replace the import from `'./inputModels'` with

```ts
import {
  displayAnswer,
  INPUT_MODELS,
  INVALID_EXPRESSION,
  INVALID_FACTORIZATION,
  INVALID_NUMBER,
  okSpan,
  type KeypadKind,
} from './inputModels';
```

add inside `describe('INPUT_MODELS keys', …)`:

```ts
  it('lays out the expression keypad in 4 columns, operators on the right', () => {
    expect(labels('expression')).toEqual([
      '7', '8', '9', '+',
      '4', '5', '6', '−',
      '1', '2', '3', '×',
      '(', '0', ')', ':',
      '⌫',
    ]);
    expect(ariaLabels('expression').filter((label) => !/^\d$/.test(label))).toEqual([
      'plus',
      'min',
      'keer',
      'haakje openen',
      'haakje sluiten',
      'gedeeld door',
      'wissen',
    ]);
    expect(INPUT_MODELS.expression.columns).toBe(4);
    expect(INPUT_MODELS.number.columns).toBeUndefined();
  });

  it('lets OK fill the last row of the 4-column expression grid', () => {
    expect(okSpan(INPUT_MODELS.expression.keys, 4)).toBe(3);
  });
```

(The `labels` array is deliberately laid out in rows; if the line layout is changed, keep the order.)

Add inside `describe('text input models', …)`, in the first test:

```ts
    expect(INPUT_MODELS.expression.apply('7', '×')).toBe('7×');
    expect(INPUT_MODELS.expression.apply('7', ',')).toBe('7');
```

Add these rows to the `it.each` table in `describe('INPUT_MODELS validation and display', …)`:

```ts
    ['expression', '7×(13+87)', null],
    ['expression', '7×100-7×2', null],
    ['expression', '2×', INVALID_EXPRESSION],
    ['expression', '(2+3', INVALID_EXPRESSION],
```

and extend the two tests below it:

```ts
  it('uses the Dutch messages from the spec', () => {
    expect(INVALID_NUMBER).toBe('Ongeldig getal');
    expect(INVALID_FACTORIZATION).toBe('Ongeldige ontbinding');
    expect(INVALID_EXPRESSION).toBe('Ongeldige som');
  });

  it('pretty-prints a submitted input', () => {
    expect(INPUT_MODELS.number.display('-12,5')).toBe('−12,5');
    expect(INPUT_MODELS.fraction.display('-12 1/2')).toBe('−12 1/2');
    expect(INPUT_MODELS.factorization.display('2^2×3')).toBe('2² × 3');
    expect(INPUT_MODELS.expression.display('7×100-7×2')).toBe('7 × 100 − 7 × 2');
  });
```

In `describe('displayAnswer', …)` add:

```ts
    expect(displayAnswer('expression', '7×(13+87)')).toBe('7 × (13 + 87)');
```

In `src/components/Keypad.test.ts`, add inside `describe('Keypad', …)`:

```ts
  it('uses 3 columns unless told otherwise', () => {
    const { container } = render(Keypad, {
      props: { keys, canSubmit: true, onkey: vi.fn(), onsubmit: vi.fn() },
    });
    const grid = container.querySelector<HTMLElement>('.keypad')!;
    expect(grid.style.getPropertyValue('--columns')).toBe('3');
    expect(screen.getByRole('button', { name: 'OK' }).style.gridColumn).toBe('span 2');
  });

  it('lays out the expression keys in 4 columns with OK over the last 3', () => {
    const { container } = render(Keypad, {
      props: {
        keys: INPUT_MODELS.expression.keys,
        columns: 4,
        canSubmit: true,
        onkey: vi.fn(),
        onsubmit: vi.fn(),
      },
    });
    const grid = container.querySelector<HTMLElement>('.keypad')!;
    expect(grid.style.getPropertyValue('--columns')).toBe('4');
    expect(screen.getByRole('button', { name: 'OK' }).style.gridColumn).toBe('span 3');
  });
```

In `src/components/QuestionView.test.ts`, add `import type { Step } from '../lib/types';` after the `../lib/steps` import, and add after `const step = …`:

```ts
// A stand-in rewrite step; the real factory (rewriteStep) follows in the next task.
const rewrite: Step = {
  kind: 'expression',
  prompt: 'Vereenvoudig in één stap: 7 × 98',
  check: (input) => ({ correct: input === '7×100-7×2', expected: '7 × 100 − 7 × 2' }),
};
```

In the test `'offers the breuk key and the factorization keys only for their kinds'`, add:

```ts
    expect(screen.queryByRole('button', { name: 'plus' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'haakje openen' })).toBeNull();
```

Add after the factorization test (`'types a factorization with × and ^ and shows it pretty-printed'`):

```ts
  it('types an expression and rejects an incomplete one inline', async () => {
    const onanswer = vi.fn();
    render(QuestionView, { props: { step: rewrite, onanswer } });
    expect(screen.queryByRole('button', { name: 'komma' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'tot de macht' })).toBeNull();

    await press('7', 'keer', 'haakje openen', '1', '0', '0', 'min', '2');
    expect(answerText()).toBe('7 × (100 − 2');
    await press('OK');
    expect(errorText()).toBe('Ongeldige som');
    expect(onanswer).not.toHaveBeenCalled();

    await press('haakje sluiten');
    expect(errorText()).toBe('');
    expect(answerText()).toBe('7 × (100 − 2)');
    await press('OK');
    expect(onanswer).toHaveBeenCalledWith(
      '7×(100-2)',
      expect.objectContaining({ correct: false, expected: '7 × 100 − 7 × 2' }),
    );
  });
```

Add inside `describe('kladblok', …)`:

```ts
    it('swaps the 4-column expression keys for the 3-column number keys', async () => {
      render(QuestionView, { props: { step: rewrite, scratchpad: true, onanswer: vi.fn() } });
      expect(screen.getByRole('button', { name: 'OK' }).style.gridColumn).toBe('span 3');
      await press(/^Kladblok vak 1:/);
      expect(screen.queryByRole('button', { name: 'plus' })).toBeNull();
      expect(screen.getByRole('button', { name: 'spatie' }).style.gridColumn).toBe('span 2');
      await press('Naar antwoordveld');
      expect(screen.getByRole('button', { name: 'plus' })).toBeTruthy();
    });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/inputModels.test.ts src/components/Keypad.test.ts src/components/QuestionView.test.ts`
Expected: FAIL. `INPUT_MODELS.expression` and `INVALID_EXPRESSION` do not exist, `'expression'` is not an `AnswerKind`, and the keypad has no `--columns`.

- [ ] **Step 3: Write the implementation**

In `src/lib/types.ts`, replace

```ts
/** Bewerkingen adds 'expression' (spec §6). */
export type AnswerKind = 'number' | 'fraction' | 'boolean' | 'factorization';
```

with

```ts
/** How a step is answered (spec §6). */
export type AnswerKind = 'number' | 'fraction' | 'boolean' | 'expression' | 'factorization';
```

In `src/lib/inputModels.ts`:

1. Replace the imports at the top with

```ts
import { parse } from './expr/parser';
import { formatExpressionInput, formatFactorizationInput, formatInput } from './format';
import {
  applyExpressionKey,
  applyFactorizationKey,
  applyFractionKey,
  applyKey,
  EMPTY_FRACTION_INPUT,
  fractionInputToString,
  selectFractionSlot,
  type DigitKey,
  type FractionInput,
  type FractionSlot,
  type KeypadKey,
} from './keypadInput';
import { parseAnswer, parseFactorization } from './steps';
import type { AnswerKind } from './types';
```

2. In `interface InputModel<S>`, replace

```ts
  /** Keys in reading order on a 3-column grid; OK fills the rest of the last row. */
  keys: readonly KeyDef[];
```

with

```ts
  /** Keys in reading order; OK fills the rest of the last row. */
  keys: readonly KeyDef[];
  /** Keypad columns; 3 when absent. Only the expression keypad has 4 (spec §6). */
  columns?: number;
```

3. Replace

```ts
interface KeypadStates {
  number: string;
  fraction: FractionInput;
  factorization: string;
}

export const INVALID_NUMBER = 'Ongeldig getal';
export const INVALID_FACTORIZATION = 'Ongeldige ontbinding';
```

with

```ts
interface KeypadStates {
  number: string;
  fraction: FractionInput;
  expression: string;
  factorization: string;
}

export const INVALID_NUMBER = 'Ongeldig getal';
export const INVALID_EXPRESSION = 'Ongeldige som';
export const INVALID_FACTORIZATION = 'Ongeldige ontbinding';
```

4. Add after the `NUMBER_KEYS` constant:

```ts
/**
 * Digits in the usual three columns, operators in a fourth (spec §6). Rewrites need no comma,
 * power or negative number, so '-' is only the operator.
 */
const EXPRESSION_KEYS: readonly KeyDef[] = [
  digit('7'),
  digit('8'),
  digit('9'),
  { key: '+', label: '+', ariaLabel: 'plus' },
  digit('4'),
  digit('5'),
  digit('6'),
  { key: '-', label: '−', ariaLabel: 'min' },
  digit('1'),
  digit('2'),
  digit('3'),
  { key: '×', label: '×', ariaLabel: 'keer' },
  { key: '(', label: '(', ariaLabel: 'haakje openen' },
  digit('0'),
  { key: ')', label: ')', ariaLabel: 'haakje sluiten' },
  { key: ':', label: ':', ariaLabel: 'gedeeld door' },
  BACKSPACE,
];
```

5. In `INPUT_MODELS`, add after the `fraction` entry:

```ts
  expression: {
    ...textModel(
      EXPRESSION_KEYS,
      applyExpressionKey,
      (input) => (parse(input) === null ? INVALID_EXPRESSION : null),
      formatExpressionInput,
    ),
    columns: 4,
  },
```

6. Replace

```ts
/** Columns that OK spans, so that it fills the last row of the 3-column keypad. */
export function okSpan(keys: readonly KeyDef[]): number {
  return 3 - (keys.length % 3);
}
```

with

```ts
/** Columns that OK spans, so that it fills the last row of the keypad. */
export function okSpan(keys: readonly KeyDef[], columns = 3): number {
  return columns - (keys.length % columns);
}
```

Replace the whole of `src/components/Keypad.svelte` with:

```svelte
<script lang="ts">
  import { okSpan, type KeyDef } from '../lib/inputModels';
  import type { KeypadKey } from '../lib/keypadInput';
  import Fraction from './Fraction.svelte';
  import { press } from './press';

  interface Props {
    keys: readonly KeyDef[];
    /** Grid columns; only the expression keypad has 4 (spec §6). */
    columns?: number;
    canSubmit: boolean;
    onkey: (key: KeypadKey) => void;
    /** Without it there is no OK: the kladblok puts its spatie there (spec §3.6). */
    onsubmit?: () => void;
  }

  let { keys, columns = 3, canSubmit, onkey, onsubmit }: Props = $props();
</script>

<div class="keypad" style:--columns={columns}>
  {#each keys as { key, label, ariaLabel, icon, span } (key)}
    <button
      type="button"
      class="key"
      style:grid-column={span === undefined ? undefined : `span ${span}`}
      aria-label={ariaLabel ?? label}
      use:press={() => onkey(key)}
    >
      {#if icon === 'fraction'}<Fraction
          >{#snippet numerator()}□{/snippet}{#snippet denominator()}□{/snippet}</Fraction
        >{:else}{label}{/if}
    </button>
  {/each}
  {#if onsubmit}
    <!-- OK acts on click (release): it replaces the view, and a submit on press would let the
         release land on the next screen. -->
    <button
      type="button"
      class="key ok"
      style:grid-column="span {okSpan(keys, columns)}"
      disabled={!canSubmit}
      onclick={onsubmit}>OK</button
    >
  {/if}
</div>

<style>
  .keypad {
    display: grid;
    grid-template-columns: repeat(var(--columns), 1fr);
    gap: 0.5rem;
  }

  /* 48 px: the minimum tap target, which leaves room for the kladblok (spec §3.6). */
  .key {
    min-height: 3rem;
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
</style>
```

In `src/components/KeypadAnswer.svelte`, replace

```svelte
<Keypad
  keys={inNote ? NOTE_KEYS : model.keys}
```

with

```svelte
<Keypad
  keys={inNote ? NOTE_KEYS : model.keys}
  columns={inNote ? undefined : model.columns}
```

`QuestionView` needs no change: an expression step falls into the `{:else}` branch with `INPUT_MODELS[step.kind]`, whose typing state is a string like `number` and `factorization`.

- [ ] **Step 4: Run the tests and the type check**

Run: `npm test`
Expected: PASS. If `getPropertyValue('--columns')` returns `''` in jsdom although the keypad renders correctly, report it rather than deleting the assertion.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/inputModels.ts src/lib/inputModels.test.ts src/components/Keypad.svelte src/components/Keypad.test.ts src/components/KeypadAnswer.svelte src/components/QuestionView.test.ts
git commit -m "feat: add the expression answer kind with a 4-column keypad" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: The rewrite step (`lib/steps.ts`)

**Files:**
- Modify: `src/lib/steps.ts`
- Test: `src/lib/steps.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/lib/steps.test.ts`, add `import { parse } from './expr/parser';` as the second import, add `rewriteStep` to the import from `'./steps'` (after `parseFactorization`), and append:

```ts
describe('rewriteStep', () => {
  const example = '7 × 100 − 7 × 2';
  const step = rewriteStep({
    prompt: 'Vereenvoudig in één stap: 7 × 98',
    original: parse('7 × 98')!,
    property: 'distributive',
    example,
    otherProperty: (detected) => `Andere eigenschap: ${detected}`,
  });

  it('is an expression step', () => {
    expect(step.kind).toBe('expression');
    expect(step.prompt).toBe('Vereenvoudig in één stap: 7 × 98');
  });

  it('accepts a single valid application of the property', () => {
    expect(step.check('7×100-7×2')).toEqual({ correct: true, expected: example });
    expect(step.check('7×90+7×8').correct).toBe(true);
  });

  it('explains a valid step with another property with the given hint', () => {
    expect(step.check('98×7')).toEqual({
      correct: false,
      expected: example,
      explanation: 'Andere eigenschap: commutative',
    });
  });

  it.each([
    ['686', 'Schrijf een som op, niet alleen de uitkomst.'],
    ['(7×98)', 'Er is niets veranderd.'],
    ['7×100-7×3', 'Deze stap verandert de uitkomst.'],
    ['7×(100-2)', 'Hier is nog geen eigenschap toegepast.'],
    ['7×100-14', 'Dit zijn meerdere stappen.'],
  ])('explains why %j is rejected', (input, explanation) => {
    expect(step.check(input)).toEqual({ correct: false, expected: example, explanation });
  });

  it('explains a reordered subtraction', () => {
    const minus = rewriteStep({
      prompt: 'Pas de commutatieve eigenschap toe: 20 − 5 − 3',
      original: parse('20 − 5 − 3')!,
      property: 'commutative',
      example: '—',
      otherProperty: () => '',
    });
    expect(minus.check('20-3-5').explanation).toBe('Deze eigenschap geldt niet voor − en :.');
  });

  it('rejects input that does not parse, without an explanation', () => {
    expect(step.check('7×')).toEqual({ correct: false, expected: example });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/steps.test.ts`
Expected: FAIL, `rewriteStep` is not exported.

- [ ] **Step 3: Write the implementation**

In `src/lib/steps.ts`, add after the first import line (`import { parse, type Expr } from './expr/parser';`):

```ts
import { checkRewrite, type Property, type RewriteReason } from './expr/rewriteCheck';
```

and append:

```ts
/** Dutch reasons of spec §5.11; a valid step with another property gets the topic's own hint. */
export const REWRITE_MESSAGES: Record<Exclude<RewriteReason, 'otherProperty'>, string> = {
  valueOnly: 'Schrijf een som op, niet alleen de uitkomst.',
  unchanged: 'Er is niets veranderd.',
  valueChanged: 'Deze stap verandert de uitkomst.',
  noProperty: 'Hier is nog geen eigenschap toegepast.',
  multipleSteps: 'Dit zijn meerdere stappen.',
  notForMinusOrDivide: 'Deze eigenschap geldt niet voor − en :.',
};

export interface RewriteStepOptions {
  prompt: string;
  /** The expression to rewrite. */
  original: Expr;
  property: Property;
  /** A valid rewrite with `property`, shown as the correct answer. */
  example: string;
  /** The explanation for a valid step with another property, e.g. a hint at the useful one. */
  otherProperty: (detected: Property) => string;
}

/** Step 1 of a property exercise: one valid application of `property` (spec §5.11, §7.1). */
export function rewriteStep({
  prompt,
  original,
  property,
  example,
  otherProperty,
}: RewriteStepOptions): Step {
  return {
    kind: 'expression',
    prompt,
    check(input) {
      const rewritten = parse(input);
      // Validation keeps unparsable input away; should it get here, it is simply wrong.
      if (rewritten === null) return { correct: false, expected: example };
      const result = checkRewrite(original, rewritten, property);
      if (result.valid) return { correct: true, expected: example };
      const explanation =
        result.reason === 'otherProperty'
          ? otherProperty(result.detected[0]!)
          : REWRITE_MESSAGES[result.reason];
      return { correct: false, expected: example, explanation };
    },
  };
}
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npm test -- src/lib/steps.test.ts`
Expected: PASS.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/steps.ts src/lib/steps.test.ts
git commit -m "feat: add the rewrite step for property exercises" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Order of operations (`orderOfOperations`)

**Files:**
- Create: `src/lib/topics/orderOfOperations.ts`, `src/lib/topics/orderOfOperations.test.ts`
- Modify: `src/lib/types.ts`, `src/lib/topics/index.ts`

The generator picks a template, then decides the number of negative literals (0, or 1 or 2) and the exponent (2, or 3 in 25%) **once**, and redraws only the values until spec §5.8 holds. Deciding these before the retry loop keeps the 30% and 25% shares exact, whatever the rejection rates.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/topics/orderOfOperations.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { evaluate } from '../expr/evaluate';
import { formatExpr } from '../expr/format';
import { parse, type Expr } from '../expr/parser';
import { formatRational } from '../format';
import { createRng } from '../random';
import {
  CUBE_SHARE,
  generateExpression,
  generateFromTemplate,
  generateOrderOfOperations,
  MAX_ANSWER,
  MAX_LITERAL,
  MAX_POWER_BASE,
  MIN_LITERAL,
  MIN_POWER_BASE,
  NEGATIVE_SHARE,
  TEMPLATES,
} from './orderOfOperations';

const SAMPLES = 3000;

/** Literals in reading order; exponents are not literals. */
function literals(expr: Expr): bigint[] {
  switch (expr.type) {
    case 'number':
      return [expr.value.num];
    case 'group':
      return literals(expr.inner);
    case 'power':
      return literals(expr.base);
    case 'binary':
      return [...literals(expr.left), ...literals(expr.right)];
  }
}

function nodes(expr: Expr): Expr[] {
  switch (expr.type) {
    case 'number':
      return [expr];
    case 'group':
      return [expr, ...nodes(expr.inner)];
    case 'power':
      return [expr, ...nodes(expr.base), ...nodes(expr.exponent)];
    case 'binary':
      return [expr, ...nodes(expr.left), ...nodes(expr.right)];
  }
}

/** The checks of spec §5.8 that every generated expression must pass. */
function expectValid(expr: Expr) {
  const operations = nodes(expr).filter((node) => node.type === 'binary' || node.type === 'power');
  expect(operations.length).toBeGreaterThanOrEqual(2);
  expect(operations.length).toBeLessThanOrEqual(5);
  for (const literal of literals(expr)) {
    const size = literal < 0n ? -literal : literal;
    expect(size).toBeGreaterThanOrEqual(BigInt(MIN_LITERAL));
    expect(size).toBeLessThanOrEqual(BigInt(MAX_LITERAL));
  }
  for (const node of operations) {
    if (node.type === 'binary' && node.operator === ':') {
      expect(evaluate(node)?.den).toBe(1n);
    }
    if (node.type === 'power') {
      const base = evaluate(node.base)!;
      const exponent = node.exponent.type === 'number' ? Number(node.exponent.value.num) : NaN;
      const size = base.num < 0n ? -base.num : base.num;
      expect(base.den).toBe(1n);
      expect(size).toBeGreaterThanOrEqual(BigInt(MIN_POWER_BASE));
      expect(size).toBeLessThanOrEqual(BigInt(MAX_POWER_BASE[exponent]!));
    }
  }
  const answer = evaluate(expr)!;
  expect(answer.den).toBe(1n);
  expect(answer.num <= BigInt(MAX_ANSWER) && answer.num >= BigInt(-MAX_ANSWER)).toBe(true);
}

const rng = createRng(17);
const expressions = Array.from({ length: SAMPLES }, () => generateExpression(rng));

describe('generateExpression', () => {
  it('meets spec §5.8 for every exercise', () => {
    for (const expr of expressions) expectValid(expr);
  });

  it('formats every expression so that it parses back unchanged', () => {
    for (const expr of expressions) expect(parse(formatExpr(expr))).toEqual(expr);
  });

  it('puts 1 or 2 negative literals in 30% of the exercises', () => {
    const negatives = expressions.map((expr) => literals(expr).filter((n) => n < 0n).length);
    const share = negatives.filter((count) => count > 0).length / SAMPLES;
    expect(share).toBeGreaterThan(NEGATIVE_SHARE - 0.04);
    expect(share).toBeLessThan(NEGATIVE_SHARE + 0.04);
    expect(Math.max(...negatives)).toBe(2);
  });

  it('cubes 25% of the powers', () => {
    const powers = expressions.flatMap((expr) =>
      nodes(expr).filter((node) => node.type === 'power'),
    );
    const cubes = powers.filter(
      (node) => node.type === 'power' && evaluate(node.exponent)?.num === 3n,
    ).length;
    expect(cubes / powers.length).toBeGreaterThan(CUBE_SHARE - 0.05);
    expect(cubes / powers.length).toBeLessThan(CUBE_SHARE + 0.05);
  });

  it('never writes a negative power base without parentheses (no −3²)', () => {
    for (const expr of expressions) expect(formatExpr(expr)).not.toMatch(/−\d+[²³]/);
  });
});

describe('generateFromTemplate', () => {
  it.each(TEMPLATES.map((template, index) => [index, template] as const))(
    'generates valid exercises from template %i',
    (index, template) => {
      const templateRng = createRng(100 + index);
      for (let i = 0; i < 200; i++) {
        const expr = generateFromTemplate(templateRng, template);
        expectValid(expr);
        expect(parse(formatExpr(expr))).toEqual(expr);
      }
    },
  );

  it('has the 10 templates of spec §5.8', () => {
    expect(TEMPLATES).toHaveLength(10);
  });
});

describe('generateOrderOfOperations', () => {
  it('asks for the value and explains it step by step', () => {
    const questionRng = createRng(23);
    for (let i = 0; i < 1000; i++) {
      const question = generateOrderOfOperations(questionRng);
      const step = question.steps[0]!;
      expect(question.topic).toBe('orderOfOperations');
      expect(question.steps).toHaveLength(1);
      expect(step.kind).toBe('number');
      expect(step.prompt.endsWith(' = ?')).toBe(true);
      const text = step.prompt.slice(0, -' = ?'.length);
      expect(question.key).toBe(`orderOfOperations:${text}`);
      const answer = evaluate(parse(text)!)!;
      const expected = formatRational(answer);
      const result = step.check(String(answer.num));
      expect(result.correct).toBe(true);
      expect(result.expected).toBe(expected);
      expect(result.explanation?.startsWith(`${text} = `)).toBe(true);
      expect(result.explanation?.endsWith(` = ${expected}`)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/topics/orderOfOperations.test.ts`
Expected: FAIL with "Failed to resolve import './orderOfOperations'".

- [ ] **Step 3: Write the implementation**

Create `src/lib/topics/orderOfOperations.ts`:

```ts
import { evaluate } from '../expr/evaluate';
import { formatExpr } from '../expr/format';
import type { BinaryOperator, Expr } from '../expr/parser';
import { explainEvaluation } from '../expr/reduce';
import { pick, randomInt, shuffle, type Rng } from '../random';
import { fromInteger, negate } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

// Order of operations (spec §5.8).
export const MIN_LITERAL = 1;
export const MAX_LITERAL = 20;
export const MAX_ANSWER = 500;
/** Share of exercises with 1 or 2 negative literals. */
export const NEGATIVE_SHARE = 0.3;
/** Share of exercises whose power slot has exponent 3 instead of 2. */
export const CUBE_SHARE = 0.25;
export const MIN_POWER_BASE = 2;
/** Largest absolute power base per exponent: [2, 12] squared, [2, 5] cubed. */
export const MAX_POWER_BASE: Readonly<Record<number, number>> = { 2: 12, 3: 5 };
/** Every template reaches a valid draw within a few hundred attempts. */
const MAX_ATTEMPTS = 10_000;

/**
 * Builds an expression from a literal source and a power slot. The shapes must be the parser's
 * (left-associative chains, explicit groups); the tests check parse(formatExpr(e)) equals e.
 */
export type Template = (literal: () => Expr, power: (base: Expr) => Expr) => Expr;

function binary(operator: BinaryOperator, left: Expr, right: Expr): Expr {
  return { type: 'binary', operator, left, right };
}

function group(inner: Expr): Expr {
  return { type: 'group', inner };
}

export const TEMPLATES: readonly Template[] = [
  // a + b × c
  (n) => binary('+', n(), binary('×', n(), n())),
  // a × (b − c) + d
  (n) => binary('+', binary('×', n(), group(binary('−', n(), n()))), n()),
  // a − b : c × d
  (n) => binary('−', n(), binary('×', binary(':', n(), n()), n())),
  // (a + b)² − c × d
  (n, p) => binary('−', p(group(binary('+', n(), n()))), binary('×', n(), n())),
  // a² + b × c − d
  (n, p) => binary('−', binary('+', p(n()), binary('×', n(), n())), n()),
  // a : b + c × (d − e)
  (n) => binary('+', binary(':', n(), n()), binary('×', n(), group(binary('−', n(), n())))),
  // a × b − c : d
  (n) => binary('−', binary('×', n(), n()), binary(':', n(), n())),
  // (a − b) × c + d²
  (n, p) => binary('+', binary('×', group(binary('−', n(), n())), n()), p(n())),
  // a − (b + c) : d
  (n) => binary('−', n(), binary(':', group(binary('+', n(), n())), n())),
  // a × (b + c²) − d
  (n, p) => binary('−', binary('×', n(), group(binary('+', n(), p(n())))), n()),
];

function literal(value: number): Expr {
  return { type: 'number', value: fromInteger(value) };
}

/** A random exercise expression from a random template. */
export function generateExpression(rng: Rng): Expr {
  return generateFromTemplate(rng, pick(rng, TEMPLATES));
}

/** Draws values until spec §5.8 holds; the negatives and the exponent are decided once. */
export function generateFromTemplate(rng: Rng, template: Template): Expr {
  const negatives = rng() < NEGATIVE_SHARE ? (rng() < 0.5 ? 1 : 2) : 0;
  const exponent = rng() < CUBE_SHARE ? 3 : 2;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const expr = template(
      () => literal(randomInt(rng, MIN_LITERAL, MAX_LITERAL)),
      (base) => ({ type: 'power', base, exponent: literal(exponent) }),
    );
    const candidate = negateLiterals(rng, expr, negatives);
    if (isValid(candidate)) return candidate;
  }
  throw new Error('No valid order-of-operations exercise found');
}

/** Literals in the expression; exponents do not count. */
function literalCount(expr: Expr): number {
  switch (expr.type) {
    case 'number':
      return 1;
    case 'group':
      return literalCount(expr.inner);
    case 'power':
      return literalCount(expr.base);
    case 'binary':
      return literalCount(expr.left) + literalCount(expr.right);
  }
}

/** Negates `count` literals at random positions; exponents stay positive. */
function negateLiterals(rng: Rng, expr: Expr, count: number): Expr {
  if (count === 0) return expr;
  const positions = new Set(shuffle(rng, [...Array(literalCount(expr)).keys()]).slice(0, count));
  let index = 0;
  const visit = (node: Expr): Expr => {
    switch (node.type) {
      case 'number': {
        const negative = positions.has(index);
        index++;
        return negative ? { type: 'number', value: negate(node.value) } : node;
      }
      case 'group':
        return { type: 'group', inner: visit(node.inner) };
      case 'power':
        return { type: 'power', base: visit(node.base), exponent: node.exponent };
      case 'binary': {
        const left = visit(node.left);
        return { type: 'binary', operator: node.operator, left, right: visit(node.right) };
      }
    }
  };
  return visit(expr);
}

/** Spec §5.8: an integer answer within ±500, exact divisions, power bases in range. */
function isValid(expr: Expr): boolean {
  const value = evaluate(expr);
  if (value === null || value.den !== 1n) return false;
  const size = value.num < 0n ? -value.num : value.num;
  return size <= BigInt(MAX_ANSWER) && partsValid(expr);
}

function partsValid(expr: Expr): boolean {
  switch (expr.type) {
    case 'number':
      return true;
    case 'group':
      return partsValid(expr.inner);
    case 'power': {
      const base = evaluate(expr.base);
      const exponent = expr.exponent.type === 'number' ? Number(expr.exponent.value.num) : NaN;
      const max = MAX_POWER_BASE[exponent];
      if (base === null || base.den !== 1n || max === undefined) return false;
      const size = base.num < 0n ? -base.num : base.num;
      return size >= BigInt(MIN_POWER_BASE) && size <= BigInt(max) && partsValid(expr.base);
    }
    case 'binary': {
      if (expr.operator === ':' && evaluate(expr)?.den !== 1n) return false;
      return partsValid(expr.left) && partsValid(expr.right);
    }
  }
}

/** `3 × (8 − 2) + 4 = ?`, explained one operation at a time. */
export function generateOrderOfOperations(rng: Rng): Question {
  const expr = generateExpression(rng);
  const text = formatExpr(expr);
  return {
    key: `orderOfOperations:${text}`,
    topic: 'orderOfOperations',
    steps: [
      numberStep({
        prompt: `${text} = ?`,
        answer: evaluate(expr)!,
        explanation: explainEvaluation(expr),
      }),
    ],
  };
}
```

`evaluate(expr)?.den !== 1n` also rejects a division by zero, because `evaluate` returns `null` for it.

In `src/lib/types.ts`, add `| 'orderOfOperations'` at the end of the `Topic` union (after `| 'squares'`).

In `src/lib/topics/index.ts`, add `import { generateOrderOfOperations } from './orderOfOperations';` after the `./numberTheory` import, add `orderOfOperations: generateOrderOfOperations,` at the end of `GENERATORS`, and add at the end of `TOPIC_LABELS`:

```ts
  orderOfOperations: 'Volgorde van bewerkingen (ook met negatieve getallen)',
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npm test -- src/lib/topics/orderOfOperations.test.ts`
Expected: PASS within a few seconds. If a template throws "No valid order-of-operations exercise found", report which one instead of raising `MAX_ATTEMPTS`.

Run: `npm test`
Expected: PASS.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/topics/orderOfOperations.ts src/lib/topics/orderOfOperations.test.ts src/lib/types.ts src/lib/topics/index.ts
git commit -m "feat: add order-of-operations exercises" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Smart calculation (`smartCalculation`)

**Files:**
- Create: `src/lib/topics/smartCalculation.ts`, `src/lib/topics/smartCalculation.test.ts`
- Modify: `src/lib/random.ts`, `src/lib/types.ts`, `src/lib/topics/index.ts`
- Test: `src/lib/random.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/lib/random.test.ts`, add `randomIntWhere` to the import from `'./random'` (after `randomInt`), and append:

```ts
describe('randomIntWhere', () => {
  it('only returns accepted values from the range', () => {
    const rng = createRng(5);
    for (let i = 0; i < 1000; i++) {
      const value = randomIntWhere(rng, 11, 99, (candidate) => candidate % 10 !== 0);
      expect(value).toBeGreaterThanOrEqual(11);
      expect(value).toBeLessThanOrEqual(99);
      expect(value % 10).not.toBe(0);
    }
  });

  it('throws when no value is accepted', () => {
    expect(() => randomIntWhere(createRng(1), 1, 5, () => false)).toThrow(RangeError);
  });
});
```

Create `src/lib/topics/smartCalculation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { evaluate } from '../expr/evaluate';
import { parse } from '../expr/parser';
import { formatInteger } from '../format';
import { createRng } from '../random';
import type { Question } from '../types';
import {
  generateSmartCalculation,
  MAX_ANSWER,
  MIN_ANSWER,
  STRATEGIES,
  type Strategy,
} from './smartCalculation';

const SAMPLES = 3000;
const rng = createRng(29);
const questions = Array.from({ length: SAMPLES }, () => generateSmartCalculation(rng));

function strategyOf(question: Question): Strategy {
  return question.key.split(':')[1] as Strategy;
}

function promptText(question: Question): string {
  return question.steps[0]!.prompt.slice(0, -' = ?'.length);
}

/** The two numbers of the prompt; prompts never group digits (all numbers are ≤ 9999). */
function operands(question: Question): [number, number] {
  const [a = NaN, b = NaN] = [...promptText(question).matchAll(/\d+/g)].map((m) => Number(m[0]));
  return [a, b];
}

function valueOf(text: string): number {
  return Number(evaluate(parse(text)!)!.num);
}

/** Within ±1 to ±3 of a positive multiple of 10, 100 or 1000 (spec §5.9). */
function isNearRound(value: number): boolean {
  return [10, 100, 1000].some((magnitude) => {
    const round = Math.round(value / magnitude) * magnitude;
    const distance = Math.abs(value - round);
    return round > 0 && distance >= 1 && distance <= 3;
  });
}

function ofStrategy(strategy: Strategy): Question[] {
  return questions.filter((question) => strategyOf(question) === strategy);
}

describe('generateSmartCalculation', () => {
  it('asks for one number and accepts its own answer', () => {
    for (const question of questions) {
      const step = question.steps[0]!;
      const answer = valueOf(promptText(question));
      expect(question.topic).toBe('smartCalculation');
      expect(step.kind).toBe('number');
      expect(step.prompt.endsWith(' = ?')).toBe(true);
      expect(question.key).toBe(`smartCalculation:${strategyOf(question)}:${promptText(question)}`);
      expect(Number.isInteger(answer)).toBe(true);
      expect(answer).toBeGreaterThanOrEqual(MIN_ANSWER);
      expect(answer).toBeLessThanOrEqual(MAX_ANSWER);
      const result = step.check(String(answer));
      expect(result.correct).toBe(true);
      expect(result.expected).toBe(formatInteger(answer));
    }
  });

  it('explains with a calculation that gives the answer', () => {
    for (const question of questions) {
      const answer = valueOf(promptText(question));
      const explanation = question.steps[0]!.check('').explanation!;
      const [left = '', right = ''] = explanation.split(' = ');
      if (strategyOf(question) === 'complement') {
        // '463 + 537 = 1000': the answer completes the round number.
        const [total] = operands(question);
        expect(right).toBe(formatInteger(total));
        expect(valueOf(left)).toBe(total);
        expect(left.endsWith(` + ${formatInteger(answer)}`)).toBe(true);
      } else {
        expect(right).toBe(formatInteger(answer));
        expect(valueOf(left)).toBe(answer);
      }
    }
  });

  it('uses every strategy about equally often', () => {
    for (const strategy of STRATEGIES) {
      const share = ofStrategy(strategy).length / SAMPLES;
      expect(share).toBeGreaterThan(1 / 6 - 0.03);
      expect(share).toBeLessThan(1 / 6 + 0.03);
    }
  });

  it('compensates near-round numbers', () => {
    for (const question of ofStrategy('compensateAdd')) {
      const [a, b] = operands(question);
      expect(isNearRound(a), String(a)).toBe(true);
      expect(b % 10).not.toBe(0);
      expect(question.steps[0]!.prompt).toContain(' + ');
    }
    for (const question of ofStrategy('compensateSubtract')) {
      const [a, b] = operands(question);
      expect(isNearRound(b), String(b)).toBe(true);
      expect(a).toBeGreaterThan(b);
      expect(question.steps[0]!.prompt).toContain(' − ');
    }
  });

  it('completes 100 or 1000', () => {
    for (const question of ofStrategy('complement')) {
      const [total, b] = operands(question);
      expect([100, 1000]).toContain(total);
      expect(b).toBeGreaterThan(total / 10);
      expect(b).toBeLessThan(total);
      expect(b % 10).not.toBe(0);
    }
  });

  it('multiplies by 25, 50 or 125 via a round number', () => {
    for (const question of ofStrategy('splitMultiply')) {
      const [a, b] = operands(question);
      expect([25, 50, 125]).toContain(b);
      expect((a * b) % (b === 125 ? 1000 : 100)).toBe(0);
    }
  });

  it('doubles a factor ending in 5 and halves an even one', () => {
    for (const question of ofStrategy('doubleHalve')) {
      const [a, b] = operands(question);
      expect(a % 10).toBe(5);
      expect(b % 2).toBe(0);
      expect(b % 10).not.toBe(0);
      expect(b).toBeGreaterThanOrEqual(12);
      expect(b).toBeLessThanOrEqual(98);
    }
  });

  it('divides exactly by 4, 5, 8 or 25', () => {
    for (const question of ofStrategy('splitDivide')) {
      const [a, b] = operands(question);
      expect([4, 5, 8, 25]).toContain(b);
      expect(a % b).toBe(0);
      expect(a / b).toBeGreaterThanOrEqual(5);
      expect(a / b).toBeLessThanOrEqual(199);
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/random.test.ts src/lib/topics/smartCalculation.test.ts`
Expected: FAIL. `randomIntWhere` is not exported and `./smartCalculation` does not resolve.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/random.ts`:

```ts
/** Uniform integer in [min, max] that passes `accept`, by rejection. Throws if none turns up. */
export function randomIntWhere(
  rng: Rng,
  min: number,
  max: number,
  accept: (value: number) => boolean,
): number {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const value = randomInt(rng, min, max);
    if (accept(value)) return value;
  }
  throw new RangeError(`No accepted integer found in [${min}, ${max}]`);
}
```

Create `src/lib/topics/smartCalculation.ts`:

```ts
import { formatInteger as f } from '../format';
import { pick, randomInt, randomIntWhere, type Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

// Smart calculation (spec §5.9).
export const MIN_ANSWER = 1;
export const MAX_ANSWER = 10_000;

export const STRATEGIES = [
  'compensateAdd',
  'compensateSubtract',
  'complement',
  'splitMultiply',
  'doubleHalve',
  'splitDivide',
] as const;
export type Strategy = (typeof STRATEGIES)[number];

interface Exercise {
  /** Without ' = ?'. */
  prompt: string;
  answer: number;
  explanation: string;
}

/** R ± d with R a multiple of 10, 100 or 1000 and d ∈ [1, 3]. */
interface NearRound {
  value: number;
  round: number;
  offset: number;
  magnitude: number;
}

function nearRound(rng: Rng): NearRound {
  const magnitude = pick(rng, [10, 100, 1000]);
  const round = magnitude * randomInt(rng, magnitude === 10 ? 2 : 1, 9);
  const offset = randomInt(rng, 1, 3) * (rng() < 0.5 ? -1 : 1);
  return { value: round + offset, round, offset, magnitude };
}

/** '− 2' or '+ 2': adds `offset` in an explanation. */
function signed(offset: number): string {
  return `${offset < 0 ? '−' : '+'} ${Math.abs(offset)}`;
}

const notRound = (value: number) => value % 10 !== 0;

/** Split (×): a × factor = a : divisor × power, with a a multiple of the divisor. */
const SPLIT_FACTORS = [
  { factor: 25, divisor: 4, power: 100, minK: 3, maxK: 25 },
  { factor: 50, divisor: 2, power: 100, minK: 6, maxK: 50 },
  { factor: 125, divisor: 8, power: 1000, minK: 2, maxK: 10 },
] as const;

/** Split (:): a : divisor via steps that are easy to do mentally. */
const SPLIT_DIVISORS = [
  { divisor: 4, minQ: 13, maxQ: 99, steps: (a: string) => `${a} : 2 : 2` },
  { divisor: 5, minQ: 13, maxQ: 199, steps: (a: string) => `${a} × 2 : 10` },
  { divisor: 8, minQ: 13, maxQ: 99, steps: (a: string) => `${a} : 2 : 2 : 2` },
  { divisor: 25, minQ: 5, maxQ: 99, steps: (a: string) => `${a} × 4 : 100` },
] as const;

const BUILDERS: Record<Strategy, (rng: Rng) => Exercise> = {
  // 398 + 247 → 400 + 247 − 2
  compensateAdd(rng) {
    const a = nearRound(rng);
    const b = randomIntWhere(rng, a.magnitude + 1, 10 * a.magnitude - 1, notRound);
    const answer = a.value + b;
    return {
      prompt: `${f(a.value)} + ${f(b)}`,
      answer,
      explanation: `${f(a.round)} + ${f(b)} ${signed(a.offset)} = ${f(answer)}`,
    };
  },
  // 5003 − 2998 → 5003 − 3000 + 2
  compensateSubtract(rng) {
    const b = nearRound(rng);
    const a = randomInt(rng, b.value + 1, 10 * b.magnitude - 1);
    const answer = a - b.value;
    return {
      prompt: `${f(a)} − ${f(b.value)}`,
      answer,
      explanation: `${f(a)} − ${f(b.round)} ${signed(-b.offset)} = ${f(answer)}`,
    };
  },
  // 1000 − 463 → 463 + 537 = 1000
  complement(rng) {
    const total = pick(rng, [100, 1000]);
    const b = randomIntWhere(rng, total / 10 + 1, total - 1, notRound);
    const answer = total - b;
    return {
      prompt: `${f(total)} − ${f(b)}`,
      answer,
      explanation: `${f(b)} + ${f(answer)} = ${f(total)}`,
    };
  },
  // 48 × 25 → 48 : 4 × 100
  splitMultiply(rng) {
    const { factor, divisor, power, minK, maxK } = pick(rng, SPLIT_FACTORS);
    const a = divisor * randomInt(rng, minK, maxK);
    const answer = a * factor;
    return {
      prompt: `${f(a)} × ${factor}`,
      answer,
      explanation: `${f(a)} : ${divisor} × ${f(power)} = ${f(answer)}`,
    };
  },
  // 35 × 18 → 70 × 9
  doubleHalve(rng) {
    const a = 10 * randomInt(rng, 1, 9) + 5;
    // b = 2 × half is not a multiple of 10 exactly when half is not a multiple of 5.
    const half = randomIntWhere(rng, 6, 49, (value) => value % 5 !== 0);
    const answer = a * 2 * half;
    return {
      prompt: `${a} × ${2 * half}`,
      answer,
      explanation: `${2 * a} × ${half} = ${f(answer)}`,
    };
  },
  // 72 : 4 → 72 : 2 : 2
  splitDivide(rng) {
    const { divisor, minQ, maxQ, steps } = pick(rng, SPLIT_DIVISORS);
    const answer = randomInt(rng, minQ, maxQ);
    const a = f(divisor * answer);
    return { prompt: `${a} : ${divisor}`, answer, explanation: `${steps(a)} = ${f(answer)}` };
  },
};

/** One of six mental strategies, each equally likely (spec §5.9). */
export function generateSmartCalculation(rng: Rng): Question {
  const strategy = pick(rng, STRATEGIES);
  let exercise = BUILDERS[strategy](rng);
  // Only a large compensating sum can leave the range; redraw it.
  while (exercise.answer < MIN_ANSWER || exercise.answer > MAX_ANSWER) {
    exercise = BUILDERS[strategy](rng);
  }
  const { prompt, answer, explanation } = exercise;
  return {
    key: `smartCalculation:${strategy}:${prompt}`,
    topic: 'smartCalculation',
    steps: [numberStep({ prompt: `${prompt} = ?`, answer: fromInteger(answer), explanation })],
  };
}
```

In `src/lib/types.ts`, add `| 'smartCalculation'` at the end of the `Topic` union.

In `src/lib/topics/index.ts`, add `import { generateSmartCalculation } from './smartCalculation';` after the `./ratios` import, add `smartCalculation: generateSmartCalculation,` at the end of `GENERATORS`, and add at the end of `TOPIC_LABELS`:

```ts
  smartCalculation: 'Handig rekenen (compenseren, aanvullen, splitsen, verdubbelen en halveren)',
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npm test`
Expected: PASS.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/random.ts src/lib/random.test.ts src/lib/topics/smartCalculation.ts src/lib/topics/smartCalculation.test.ts src/lib/types.ts src/lib/topics/index.ts
git commit -m "feat: add smart calculation exercises" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Properties (`properties`)

**Files:**
- Create: `src/lib/topics/properties.ts`, `src/lib/topics/properties.test.ts`
- Modify: `src/lib/types.ts`, `src/lib/topics/index.ts`
- Test: `src/components/PlayScreen.test.ts`

Each template draws its numbers and returns the expression plus an example rewrite for every **applicable** property. Basis asks the intended property; Gevorderd picks an applicable one. Step 2 always explains the value with the intended (useful) rewrite. Swapped operands must differ (`b ≠ c` and similar), otherwise a commutative example would equal the original.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/topics/properties.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { evaluate } from '../expr/evaluate';
import { parse } from '../expr/parser';
import { checkRewrite } from '../expr/rewriteCheck';
import { formatInteger } from '../format';
import { createRng } from '../random';
import {
  applicableProperties,
  drawPropertyExercise,
  generateProperties,
  propertyQuestion,
  ROUND_NUMBERS,
  ROUND_PAIRS,
  type PropertyExercise,
} from './properties';

const SAMPLES = 3000;
const rng = createRng(41);
const exercises = Array.from({ length: SAMPLES }, () => drawPropertyExercise(rng));

function expectFactor(a: number) {
  expect(a).toBeGreaterThanOrEqual(3);
  expect(a).toBeLessThanOrEqual(19);
  expect(a).not.toBe(10);
}

function expectFree(value: number, min: number, max: number) {
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
  expect(value % 10).not.toBe(0);
}

function expectHundredPair(x: number, y: number) {
  expect(x + y).toBe(100);
  expectFree(x, 11, 89);
}

function expectRoundPair(x: number, y: number) {
  expect(ROUND_PAIRS.some(([p, q]) => p === x && q === y)).toBe(true);
}

/** The seven templates of spec §5.11, recognised by the shape of the text. */
const SHAPES: { pattern: RegExp; check: (numbers: number[]) => void }[] = [
  {
    pattern: /^(\d+) × (\d+)$/,
    check: ([a = NaN, n = NaN]) => {
      expectFactor(a);
      expect(ROUND_NUMBERS.some((round) => [1, 2, 3].includes(Math.abs(n - round)))).toBe(true);
      expect(a).not.toBe(n);
    },
  },
  {
    pattern: /^(\d+) × \((\d+) \+ (\d+)\)$/,
    check: ([a = NaN, b = NaN, c = NaN]) => {
      expectFactor(a);
      expect([20, 30, 40, 50, 60, 70, 80, 90]).toContain(b);
      expect(c).toBeGreaterThanOrEqual(1);
      expect(c).toBeLessThanOrEqual(9);
    },
  },
  {
    pattern: /^(\d+) × (\d+) \+ (\d+) × (\d+)$/,
    check: ([a = NaN, b = NaN, a2 = NaN, c = NaN]) => {
      expectFactor(a);
      expect(a2).toBe(a);
      expectHundredPair(b, c);
    },
  },
  {
    pattern: /^\((\d+) \+ (\d+)\) \+ (\d+)$/,
    check: ([a = NaN, b = NaN, c = NaN]) => {
      expectFree(a, 11, 99);
      expectHundredPair(b, c);
    },
  },
  {
    pattern: /^\((\d+) × (\d+)\) × (\d+)$/,
    check: ([a = NaN, b = NaN, c = NaN]) => {
      expectFree(a, 3, 49);
      expectRoundPair(b, c);
    },
  },
  {
    pattern: /^(\d+) \+ (\d+) \+ (\d+)$/,
    check: ([a = NaN, b = NaN, c = NaN]) => {
      expectHundredPair(a, c);
      expectFree(b, 11, 99);
      expect(b).not.toBe(c);
    },
  },
  {
    pattern: /^(\d+) × (\d+) × (\d+)$/,
    check: ([a = NaN, b = NaN, c = NaN]) => {
      expectRoundPair(a, c);
      expectFree(b, 3, 49);
      expect(b).not.toBe(c);
    },
  },
];

describe('drawPropertyExercise', () => {
  it('uses the seven templates of spec §5.11 with their numbers, about equally often', () => {
    const counts = SHAPES.map(() => 0);
    for (const { text } of exercises) {
      const matches = SHAPES.map(({ pattern }) => pattern.exec(text));
      expect(matches.filter((match) => match !== null), text).toHaveLength(1);
      const index = matches.findIndex((match) => match !== null);
      counts[index]!++;
      SHAPES[index]!.check(matches[index]!.slice(1).map(Number));
    }
    for (const count of counts) {
      expect(count / SAMPLES).toBeGreaterThan(1 / 7 - 0.03);
      expect(count / SAMPLES).toBeLessThan(1 / 7 + 0.03);
    }
  });

  it('gives a valid example rewrite for every applicable property', () => {
    for (const exercise of exercises) {
      const original = parse(exercise.text)!;
      const applicable = applicableProperties(exercise);
      expect(applicable).toHaveLength(2);
      expect(applicable).toContain('commutative');
      expect(applicable).toContain(exercise.intended);
      for (const property of applicable) {
        const rewrite = exercise.rewrites[property]!;
        expect(checkRewrite(original, parse(rewrite)!, property).valid, rewrite).toBe(true);
      }
    }
  });

  it('recognises the other example rewrite as another property in Basis', () => {
    for (const exercise of exercises) {
      const original = parse(exercise.text)!;
      for (const property of applicableProperties(exercise)) {
        if (property === exercise.intended) continue;
        const rewrite = parse(exercise.rewrites[property]!)!;
        expect(checkRewrite(original, rewrite, exercise.intended)).toEqual({
          valid: false,
          detected: [property],
          reason: 'otherProperty',
        });
      }
    }
  });
});

describe('propertyQuestion', () => {
  const timesNinetyEight: PropertyExercise = {
    text: '7 × 98',
    intended: 'distributive',
    rewrites: { commutative: '98 × 7', distributive: '7 × 100 − 7 × 2' },
  };
  const explanation = '7 × 100 − 7 × 2 = 700 − 7 × 2 = 700 − 14 = 686';

  it('asks Basis to simplify and hints at the useful property', () => {
    const question = propertyQuestion(timesNinetyEight, 'basis', 'distributive');
    expect(question.key).toBe('properties:basis:distributive:7 × 98');
    expect(question.topic).toBe('properties');
    const [rewrite, value] = question.steps;
    expect(rewrite!.prompt).toBe('Vereenvoudig in één stap: 7 × 98');
    expect(rewrite!.check('7×100-7×2')).toEqual({ correct: true, expected: '7 × 100 − 7 × 2' });
    expect(rewrite!.check('98×7')).toEqual({
      correct: false,
      expected: '7 × 100 − 7 × 2',
      explanation: 'Geldige stap (commutatief), maar niet handig. Probeer distributief.',
    });
    expect(value!.prompt).toBe('7 × 98 = ?');
    expect(value!.check('686')).toEqual({ correct: true, expected: '686', explanation });
  });

  it('names the asked property in Gevorderd and still explains with the useful rewrite', () => {
    const question = propertyQuestion(timesNinetyEight, 'gevorderd', 'commutative');
    expect(question.key).toBe('properties:gevorderd:commutative:7 × 98');
    const [rewrite, value] = question.steps;
    expect(rewrite!.prompt).toBe('Pas de commutatieve eigenschap toe: 7 × 98');
    expect(rewrite!.check('98×7')).toEqual({ correct: true, expected: '98 × 7' });
    expect(rewrite!.check('7×100-7×2').explanation).toBe(
      'Geldige stap (distributief), maar gevraagd is commutatief.',
    );
    expect(value!.check('686').explanation).toBe(explanation);
  });
});

describe('generateProperties', () => {
  const questions = Array.from({ length: SAMPLES }, () => generateProperties(rng));

  it('asks a rewrite step and then the value', () => {
    const prompt =
      /^(?:Vereenvoudig in één stap|Pas de (?:commutatieve|associatieve|distributieve) eigenschap toe): (.+)$/;
    for (const question of questions) {
      const [rewrite, value] = question.steps;
      expect(question.topic).toBe('properties');
      expect(question.steps.map((step) => step.kind)).toEqual(['expression', 'number']);
      const text = prompt.exec(rewrite!.prompt)?.[1] ?? '';
      expect(value!.prompt).toBe(`${text} = ?`);
      expect(question.key.endsWith(`:${text}`)).toBe(true);

      const example = rewrite!.check('').expected;
      expect(rewrite!.check(example).correct, example).toBe(true);
      const answer = evaluate(parse(text)!)!;
      const result = value!.check(String(answer.num));
      expect(result.correct).toBe(true);
      expect(result.explanation?.endsWith(` = ${formatInteger(answer.num)}`)).toBe(true);
    }
  });

  it('splits Basis and Gevorderd evenly and asks every property in Gevorderd', () => {
    const variants = questions.map((question) => question.key.split(':')[1]);
    const basis = variants.filter((variant) => variant === 'basis').length / SAMPLES;
    expect(basis).toBeGreaterThan(0.47);
    expect(basis).toBeLessThan(0.53);
    const asked = new Set(
      questions
        .filter((question) => question.key.startsWith('properties:gevorderd:'))
        .map((question) => question.key.split(':')[2]),
    );
    expect([...asked].sort()).toEqual(['associative', 'commutative', 'distributive']);
  });
});
```

In `src/components/PlayScreen.test.ts`, add `import { propertyQuestion } from '../lib/topics/properties';` after the `../lib/steps` import, and add at the end of `describe('PlayScreen', …)`:

```ts
  it('runs a property question through both steps, also after a wrong rewrite', async () => {
    const onfinish = vi.fn<(records: QuestionRecord[], totalMs: number) => void>();
    const property = propertyQuestion(
      {
        text: '7 × 98',
        intended: 'distributive',
        rewrites: { commutative: '98 × 7', distributive: '7 × 100 − 7 × 2' },
      },
      'basis',
      'distributive',
    );
    render(PlayScreen, { props: { set: TABLES_SET, questions: [property], onfinish } });

    await press('9', '8', 'keer', '7', 'OK');
    expect(screen.getByText('Fout')).toBeTruthy();
    expect(screen.getByText('98 × 7')).toBeTruthy();
    expect(screen.getByText('7 × 100 − 7 × 2')).toBeTruthy();
    expect(
      screen.getByText('Geldige stap (commutatief), maar niet handig. Probeer distributief.'),
    ).toBeTruthy();

    await press('Verder');
    expect(screen.getByText('7 × 98 = ?')).toBeTruthy();
    await press('6', '8', '6', 'OK');
    await vi.advanceTimersByTimeAsync(600);

    expect(onfinish).toHaveBeenCalledOnce();
    const [records] = onfinish.mock.calls[0]!;
    expect(records[0]!.attempts.map((attempt) => attempt.result.correct)).toEqual([false, true]);
    expect(isCorrect(records[0]!)).toBe(false);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/topics/properties.test.ts src/components/PlayScreen.test.ts`
Expected: FAIL with "Failed to resolve import './properties'" (and `'../lib/topics/properties'`).

- [ ] **Step 3: Write the implementation**

Create `src/lib/topics/properties.ts`:

```ts
import { evaluate } from '../expr/evaluate';
import { parse } from '../expr/parser';
import { explainEvaluation } from '../expr/reduce';
import { PROPERTIES, type Property } from '../expr/rewriteCheck';
import { pick, randomInt, randomIntWhere, type Rng } from '../random';
import { numberStep, rewriteStep } from '../steps';
import type { Question } from '../types';

// Properties: commutative, associative and distributive (spec §5.11).

export type Variant = 'basis' | 'gevorderd';

/** A drawn template: the expression and an example rewrite per applicable property. */
export interface PropertyExercise {
  text: string;
  /** The useful property: Basis asks for this one. */
  intended: Property;
  rewrites: Partial<Record<Property, string>>;
}

/** The round numbers R of `a × n` with n = R ± d. */
export const ROUND_NUMBERS: readonly number[] = [
  20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
];

/** Factor pairs with a product of 100 or 1000, in either order. */
export const ROUND_PAIRS: readonly (readonly [number, number])[] = [
  [25, 4],
  [4, 25],
  [50, 2],
  [2, 50],
  [20, 5],
  [5, 20],
  [125, 8],
  [8, 125],
];

/** 'commutatief', as in "Geldige stap (commutatief)". */
const ADJECTIVES: Record<Property, string> = {
  commutative: 'commutatief',
  associative: 'associatief',
  distributive: 'distributief',
};

/** 'commutatieve', as in "Pas de commutatieve eigenschap toe". */
const ATTRIBUTIVES: Record<Property, string> = {
  commutative: 'commutatieve',
  associative: 'associatieve',
  distributive: 'distributieve',
};

const notRound = (value: number) => value % 10 !== 0;

/** a ∈ [3, 19] without 10 of the distributive templates, unequal to `other`. */
function factor(rng: Rng, other?: number): number {
  return randomIntWhere(rng, 3, 19, (value) => value !== 10 && value !== other);
}

/** Two numbers in [11, 89], not multiples of 10, that add up to 100. */
function hundredPair(rng: Rng): [number, number] {
  const first = randomIntWhere(rng, 11, 89, notRound);
  return [first, 100 - first];
}

/** The free term of a round-sum template, unequal to the operand it may be swapped with. */
function freeTerm(rng: Rng, other: number): number {
  return randomIntWhere(rng, 11, 99, (value) => notRound(value) && value !== other);
}

/** The free factor of a round-product template, unequal to the operand it may be swapped with. */
function freeFactor(rng: Rng, other: number): number {
  return randomIntWhere(rng, 3, 49, (value) => notRound(value) && value !== other);
}

/** The seven templates of spec §5.11, each equally likely. */
export const PROPERTY_TEMPLATES: readonly ((rng: Rng) => PropertyExercise)[] = [
  // a × n with n close to round: 7 × 98
  (rng) => {
    const round = pick(rng, ROUND_NUMBERS);
    const offset = randomInt(rng, 1, 3) * (rng() < 0.5 ? -1 : 1);
    const n = round + offset;
    const a = factor(rng, n);
    const sign = offset < 0 ? '−' : '+';
    return {
      text: `${a} × ${n}`,
      intended: 'distributive',
      rewrites: {
        commutative: `${n} × ${a}`,
        distributive: `${a} × ${round} ${sign} ${a} × ${Math.abs(offset)}`,
      },
    };
  },
  // a × (b + c) with b round: 6 × (40 + 3)
  (rng) => {
    const a = factor(rng);
    const b = 10 * randomInt(rng, 2, 9);
    const c = randomInt(rng, 1, 9);
    return {
      text: `${a} × (${b} + ${c})`,
      intended: 'distributive',
      rewrites: {
        commutative: `(${b} + ${c}) × ${a}`,
        distributive: `${a} × ${b} + ${a} × ${c}`,
      },
    };
  },
  // a × b + a × c with b + c = 100: 7 × 13 + 7 × 87
  (rng) => {
    const a = factor(rng);
    const [b, c] = hundredPair(rng);
    return {
      text: `${a} × ${b} + ${a} × ${c}`,
      intended: 'distributive',
      rewrites: {
        commutative: `${a} × ${c} + ${a} × ${b}`,
        distributive: `${a} × (${b} + ${c})`,
      },
    };
  },
  // (a + b) + c with b + c = 100: (17 + 25) + 75
  (rng) => {
    const [b, c] = hundredPair(rng);
    const a = freeTerm(rng, b);
    return {
      text: `(${a} + ${b}) + ${c}`,
      intended: 'associative',
      rewrites: { commutative: `${c} + (${a} + ${b})`, associative: `${a} + (${b} + ${c})` },
    };
  },
  // (a × b) × c with b × c round: (13 × 25) × 4
  (rng) => {
    const [b, c] = pick(rng, ROUND_PAIRS);
    const a = freeFactor(rng, b);
    return {
      text: `(${a} × ${b}) × ${c}`,
      intended: 'associative',
      rewrites: { commutative: `${c} × (${a} × ${b})`, associative: `${a} × (${b} × ${c})` },
    };
  },
  // a + b + c with a + c = 100: 38 + 57 + 62
  (rng) => {
    const [a, c] = hundredPair(rng);
    const b = freeTerm(rng, c);
    return {
      text: `${a} + ${b} + ${c}`,
      intended: 'commutative',
      rewrites: { commutative: `${a} + ${c} + ${b}`, associative: `${a} + (${b} + ${c})` },
    };
  },
  // a × b × c with a × c round: 25 × 37 × 4
  (rng) => {
    const [a, c] = pick(rng, ROUND_PAIRS);
    const b = freeFactor(rng, c);
    return {
      text: `${a} × ${b} × ${c}`,
      intended: 'commutative',
      rewrites: { commutative: `${a} × ${c} × ${b}`, associative: `${a} × (${b} × ${c})` },
    };
  },
];

export function drawPropertyExercise(rng: Rng): PropertyExercise {
  return pick(rng, PROPERTY_TEMPLATES)(rng);
}

/** The properties that apply to an exercise, in the order of PROPERTIES. */
export function applicableProperties(exercise: PropertyExercise): Property[] {
  return PROPERTIES.filter((property) => exercise.rewrites[property] !== undefined);
}

/** Step 1 applies `property`, step 2 asks for the value (spec §5.11). */
export function propertyQuestion(
  exercise: PropertyExercise,
  variant: Variant,
  property: Property,
): Question {
  const { text, intended, rewrites } = exercise;
  const original = parse(text);
  const value = original === null ? null : evaluate(original);
  const example = rewrites[property];
  const useful = parse(rewrites[intended] ?? '');
  if (original === null || value === null || example === undefined || useful === null) {
    throw new RangeError(`Invalid property exercise: ${text}`);
  }
  return {
    key: `properties:${variant}:${property}:${text}`,
    topic: 'properties',
    steps: [
      rewriteStep({
        prompt:
          variant === 'basis'
            ? `Vereenvoudig in één stap: ${text}`
            : `Pas de ${ATTRIBUTIVES[property]} eigenschap toe: ${text}`,
        original,
        property,
        example,
        otherProperty: (detected) =>
          variant === 'basis'
            ? `Geldige stap (${ADJECTIVES[detected]}), maar niet handig. Probeer ${ADJECTIVES[property]}.`
            : `Geldige stap (${ADJECTIVES[detected]}), maar gevraagd is ${ADJECTIVES[property]}.`,
      }),
      numberStep({ prompt: `${text} = ?`, answer: value, explanation: explainEvaluation(useful) }),
    ],
  };
}

/** Basis asks the useful property, Gevorderd any applicable one; each half of the time. */
export function generateProperties(rng: Rng): Question {
  const exercise = drawPropertyExercise(rng);
  const variant: Variant = rng() < 0.5 ? 'basis' : 'gevorderd';
  const property =
    variant === 'basis' ? exercise.intended : pick(rng, applicableProperties(exercise));
  return propertyQuestion(exercise, variant, property);
}
```

In `src/lib/types.ts`, add `| 'properties'` at the end of the `Topic` union.

In `src/lib/topics/index.ts`, add `import { generateProperties } from './properties';` after the `./percentages` import, add `properties: generateProperties,` at the end of `GENERATORS`, and add at the end of `TOPIC_LABELS`:

```ts
  properties: 'Eigenschappen (commutatief, associatief, distributief)',
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npm test`
Expected: PASS. A failing "valid example rewrite" assertion names the rewrite in its message: fix the template, not the checker, unless the checker contradicts spec §7.1.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/topics/properties.ts src/lib/topics/properties.test.ts src/lib/types.ts src/lib/topics/index.ts src/components/PlayScreen.test.ts
git commit -m "feat: add two-step property exercises" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: The Bewerkingen set (`lib/sets.ts`)

**Files:**
- Modify: `src/lib/sets.ts`
- Test: `src/lib/sets.test.ts`, `src/lib/session.test.ts`, `src/App.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/lib/sets.test.ts`, add `OPERATIONS_SET` to the import from `'./sets'` (after `NUMBERS_SET`), replace

```ts
    expect(PRACTICE_SETS.map((set) => set.id)).toEqual([
      'tafels',
      'meten',
      'verhoudingen',
      'getallen',
    ]);
```

with

```ts
    expect(PRACTICE_SETS.map((set) => set.id)).toEqual([
      'tafels',
      'meten',
      'verhoudingen',
      'getallen',
      'bewerkingen',
    ]);
```

add inside `describe('practice sets', …)`:

```ts
  it('makes Bewerkingen three topics, properties at half weight, with 15% tables', () => {
    expect(OPERATIONS_SET.name).toBe('Bewerkingen');
    expect(OPERATIONS_SET.tablesPercent).toBe(15);
    expect(OPERATIONS_SET.topics).toEqual([
      { topic: 'orderOfOperations', weight: 1 },
      { topic: 'properties', weight: 0.5 },
      { topic: 'smartCalculation', weight: 1 },
    ]);
  });
```

and add inside `describe('describeSetTopics', …)`:

```ts
  it('describes the Bewerkingen set', () => {
    expect(describeSetTopics(OPERATIONS_SET)).toEqual([
      'Volgorde van bewerkingen (ook met negatieve getallen)',
      'Eigenschappen (commutatief, associatief, distributief)',
      'Handig rekenen (compenseren, aanvullen, splitsen, verdubbelen en halveren)',
      '15% tafels',
    ]);
  });
```

In `src/lib/session.test.ts`, add `OPERATIONS_SET` to the import from `'./sets'` (after `NUMBERS_SET`), and append:

```ts
describe('buildSession for Bewerkingen', () => {
  it('mixes 2 tables with 5 + 3 + 5 exercises at n = 15 (spec §4.2)', () => {
    const questions = buildSession(OPERATIONS_SET, 15, createRng(3));
    const counts = new Map<string, number>();
    for (const { topic } of questions) counts.set(topic, (counts.get(topic) ?? 0) + 1);
    expect(Object.fromEntries(counts)).toEqual({
      tables: 2,
      orderOfOperations: 5,
      properties: 3,
      smartCalculation: 5,
    });
  });

  it.each([...SESSION_SIZES])('builds %i unique questions', (size) => {
    const questions = buildSession(OPERATIONS_SET, size, createRng(size));
    expect(questions).toHaveLength(size);
    expect(new Set(questions.map((q) => q.key)).size).toBe(size);
  });
});
```

In `src/App.test.ts`, add at the end of `describe('App', …)`:

```ts
  it('offers Bewerkingen with its topics and the tables share', async () => {
    render(App);
    await click(/Bewerkingen/);
    expect(screen.getByRole('heading', { name: 'Bewerkingen' })).toBeTruthy();
    expect(screen.getByText('Eigenschappen (commutatief, associatief, distributief)')).toBeTruthy();
    expect(screen.getByText('15% tafels')).toBeTruthy();
    await click('Start');
    expect(screen.getByText('1 / 15')).toBeTruthy();
  });
```

`/Bewerkingen/` is case-sensitive: the new card's description says "bewerkingen" in lowercase, and no other card mentions it.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/sets.test.ts src/lib/session.test.ts src/App.test.ts`
Expected: FAIL. `OPERATIONS_SET` is undefined, and the App has no "Bewerkingen" card.

- [ ] **Step 3: Write the implementation**

In `src/lib/sets.ts`, replace

```ts
/** Implemented sets in roadmap order. Later plans append their set here (spec §4.1). */
export const PRACTICE_SETS: readonly PracticeSet[] = [
  TABLES_SET,
  MEASUREMENT_SET,
  PROPORTIONS_SET,
  NUMBERS_SET,
];
```

with

```ts
/** properties has half weight: two steps take 2–3× as long (spec §4.1). */
export const OPERATIONS_SET: PracticeSet = {
  id: 'bewerkingen',
  name: 'Bewerkingen',
  description: 'Volgorde van bewerkingen, eigenschappen en handig rekenen',
  topics: [
    { topic: 'orderOfOperations', weight: 1 },
    { topic: 'properties', weight: 0.5 },
    { topic: 'smartCalculation', weight: 1 },
  ],
  tablesPercent: 15,
};

/** Implemented sets in roadmap order. Later plans append their set here (spec §4.1). */
export const PRACTICE_SETS: readonly PracticeSet[] = [
  TABLES_SET,
  MEASUREMENT_SET,
  PROPORTIONS_SET,
  NUMBERS_SET,
  OPERATIONS_SET,
];
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npm test`
Expected: PASS. If the 5 / 3 / 5 test fails, the quota algorithm disagrees with spec §4.2: report it.

Run: `npm run check`
Expected: 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sets.ts src/lib/sets.test.ts src/lib/session.test.ts src/App.test.ts
git commit -m "feat: add Bewerkingen practice set" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: Final verification and docs

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Run the full verification**

1. Run `npm test`. Expected: every test file passes, with 0 failures.
2. Run `npm run check`. Expected: 0 errors and 0 warnings.
3. Run `npm run build`. Expected: success.
4. Run `grep -o 'manifest.webmanifest' dist/sw.js`. Expected: **exactly one** output line (CLAUDE.md, "PWA pitfalls").
5. Run `grep -rn "eval(\|new Function" src/lib`. Expected: no output.

- [ ] **Step 2: Manual check on a phone** (by the user)

1. Host `dist/`, or use `npm run preview -- --host` on the local network (⚠ approval).
2. Run through the following checks:
   - The overview shows Tafels, Meten, Verhoudingen, Getallen & delers and Bewerkingen.
   - Bewerkingen → setup lists the three topics plus "15% tafels".
   - Start a session with 50 exercises. Check that:
     - order-of-operations prompts show negative literals in parentheses (`5 × (−3)`), `(−4)²` and never `−4²`; a wrong answer explains step by step and the explanation fits on screen
     - smart-calculation explanations match spec §5.9 (`400 + 247 − 2 = 645`)
     - a property question shows the 4-column keypad with `+ − × :` and `( )`, and only that step; step 2 and every other question show the normal 3-column keypad
     - `7×(100−2` + OK shows "Ongeldige som" without moving on; the message disappears at the next key
     - `98 × 7` on "Vereenvoudig in één stap: 7 × 98" shows the hint "Geldige stap (commutatief), maar niet handig. Probeer distributief." and the example `7 × 100 − 7 × 2`, then Verder leads to `7 × 98 = ?`
     - tapping a kladblok cell on the rewrite step switches to the 3-column number keys with spatie, and tapping the answer field brings the 4 columns back
     - **long prompts** ("Pas de distributieve eigenschap toe: 7 × 13 + 7 × 87") with the kladblok: the keypad must stay fully on screen. If it does not, note it as a follow-up (smaller prompt font for long prompts); do not change the layout in this plan.
   - Repeat the checks in dark mode and in airplane mode.

- [ ] **Step 3: Update `CLAUDE.md`**

Replace:

```markdown
Implemented sets: **Tafels** (plan: `docs/superpowers/plans/2026-10-05-beta-tafels.md`), **Meten**
(plan: `docs/superpowers/plans/2026-10-05-meten.md`), **Verhoudingen** v1
(plan: `docs/superpowers/plans/2026-10-05-verhoudingen.md`) and **Getallen & delers**
(plan: `docs/superpowers/plans/2026-10-06-getallen-delers.md`).
```

with:

```markdown
Implemented sets: **Tafels** (plan: `docs/superpowers/plans/2026-10-05-beta-tafels.md`), **Meten**
(plan: `docs/superpowers/plans/2026-10-05-meten.md`), **Verhoudingen** v1
(plan: `docs/superpowers/plans/2026-10-05-verhoudingen.md`), **Getallen & delers**
(plan: `docs/superpowers/plans/2026-10-06-getallen-delers.md`) and **Bewerkingen**
(plan: `docs/superpowers/plans/2026-10-06-bewerkingen.md`).
```

In the roadmap table, in the row for set 4, change the infrastructure cell to `` Full `lib/expr` engine (§7): parser, evaluate, formatter, evaluation steps, chains, rewrite checker; `expression` answer kind with a 4-column keypad; negative literals; two-step questions `` and the status cell from `planned` to `✅ done`.

Remove the first bullet under "Known follow-ups for the next plans" (the one starting with `**Bewerkingen (`expression` answer kind):**`, including its continuation lines). If the manual check in Step 2 found the keypad cut off by long prompts, add instead:

```markdown
- Long property prompts ("Pas de distributieve eigenschap toe: …") push the keypad below the
  screen edge together with the kladblok; consider a smaller prompt font for long prompts.
```

In the architecture block, replace

```
    steps.ts            step factories (number, fraction, boolean, factorization), parseAnswer
                        and parseFactorization — all answer parsing and checking goes through here
    keypadInput.ts      pure key → input reducers (numbers, fraction templates, factorizations)
    inputModels.ts      per answer kind: keys, typing state, reducer, validate, display, view
```

with

```
    steps.ts            step factories (number, fraction, boolean, factorization, rewrite),
                        parseAnswer and parseFactorization — all answer parsing and checking
                        goes through here
    keypadInput.ts      pure key → input reducers (numbers, fraction templates, factorizations,
                        expressions)
    inputModels.ts      per answer kind: keys, columns, typing state, reducer, validate,
                        display, view
```

and replace

```
    expr/               tokenizer, parser (AST; products of powers so far); evaluate and
                        rewriteCheck follow with Bewerkingen
```

with

```
    expr/               tokenizer, parser (AST with groups), evaluate, format (prompt text),
                        reduce (evaluation steps), chains, rewriteCheck (one property per step)
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: mark Bewerkingen as implemented" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Spec coverage (self-review)

| Spec | Covered by |
|---|---|
| §4.1 Bewerkingen: three topics, properties weight 0.5, 15% tables | Task 14 |
| §4.2 example 2 tables + 5 / 3 / 5 | Task 14 (`buildSession for Bewerkingen`) |
| §5.8 10 templates, 2–5 operations, literals `[1, 20]`, power bases, exact divisions, `\|answer\| ≤ 500` | Task 11 |
| §5.8 30% negative literals (1 or 2), parentheses rules, no `−3²` | Tasks 4, 11 |
| §5.8 step-by-step explanation | Tasks 5, 11 |
| §5.9 six strategies, value ranges, explanations, answers `[1, 10 000]` | Task 12 |
| §5.11 seven templates, numbers, Basis/Gevorderd, applicable properties, example rewrites | Task 13 |
| §5.11 feedback messages incl. hints; wrong step 1 continues to step 2 (§11.4) | Tasks 10, 13 (PlayScreen test) |
| §5.11 step 2 `7 × 98 = ?` explained with the intended rewrite | Tasks 5, 13 |
| §6 expression keys, 4 columns only for this kind, reducer rules, max length, "Ongeldige som", display | Tasks 8, 9 |
| §7 tokenizer superscripts; grammar; unary minus only at start/after `(`; `(−3)` as literal | Tasks 1, 2 |
| §7 evaluate (exact, `null` for division by zero), formatter, evaluation steps, chains | Tasks 3, 4, 5, 6 |
| §7.1 rewrite checker: properties, reasons, decision order, required test table | Task 7 |
| §9 `expr/evaluate.ts`, `format.ts`, `reduce.ts`, `chains.ts`, `rewriteCheck.ts`, three topic modules | Tasks 3–7, 11–13 |
| §10 seeded ≥ 1000-sample generator tests, `check(expected)` correct, rewrite table + generated example rewrites | Tasks 7, 11, 12, 13 |
| §11.3 Basis only the useful property, §11.8 no `−3²`, §11.16 keypad and "Er is niets veranderd" | Tasks 2, 4, 7, 9, 13 |
| CLAUDE.md: `dist/sw.js` has one manifest entry; no `eval` | Task 15 |
