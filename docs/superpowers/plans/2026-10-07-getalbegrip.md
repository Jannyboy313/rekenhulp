# Getalbegrip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the **Getalbegrip** practice set with the topics `mentalOperations` (spec §5.15), `negativeNumbers` (§5.16), `rounding` (§5.17), `powersRoots` (§5.18) and `scientificNotation` (§5.19), plus 15% tables, and the `scientific` answer kind (§6) that the notation questions need.

**Architecture:**

- **`scientific` answer kind.** The user types the notation itself (`4,5×10^-3`) with keys that already exist (`×`, `^`, `,`, `−`). It gets its own input model in `inputModels.ts` (4 columns, 4 rows), a key reducer `applyScientificKey` in `keypadInput.ts`, a display formatter `formatScientificInput` in `format.ts`, and a small dedicated parser `parseScientific` in `steps.ts` (not `lib/expr`). `scientificStep` judges value **and** form: only `c × 10ⁿ` with `1 ≤ c < 10` is correct; an equal value in another form gets a tip.
- **`drawUntil`** in `random.ts`: a generic rejection helper ("redraw until all rules hold"), used by every new generator.
- **Five generator modules**, following the existing pattern (a pure `(rng) => Question`, every answer checked by a step factory in `steps.ts`, tips as `Diagnose` functions built from values the generator already has):
  - `topics/mentalOperations.ts`: add/subtract in steps, multiply and divide with zeros, remainder in a context
  - `topics/negativeNumbers.ts`: ± and ×/: with negative literals, temperature change and difference
  - `topics/rounding.ts`: seven places, half up
  - `topics/powersRoots.ts`: whole-number and decimal powers, base-10 negative exponents, roots
  - `topics/scientificNotation.ts`: to notation, to number, normalise
- **The set** `NUMBER_SENSE_SET` (`id: 'getalbegrip'`) is appended to `PRACTICE_SETS`.

**Tech Stack:** Svelte 5, TypeScript strict (`noUncheckedIndexedAccess`), Vitest + @testing-library/svelte. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-05-rekenhulp-design.md`. Read §3.4.1 (tip table: the source of truth for tip wording), §4.2, §5.15–§5.19, §6 (scientific input), §8 and §11 item 19 before starting.

---

## Scope

**In scope:**

| Spec section | What is built |
|---|---|
| §4.1 | The Getalbegrip set: five topics with weight 1, and 15% tables |
| §4.2 | Quota example: 2 tables + 3 + 3 + 3 + 2 + 2 at `n = 15` (no algorithm change) |
| §5.15 | `mentalOperations`: four forms, remainder contexts, explanations and tips |
| §5.16 | `negativeNumbers`: three forms, explanations and tips |
| §5.17 | `rounding`: seven places, 20% decisive 5, 15% carry over a 9, explanations and tips |
| §5.18 | `powersRoots`: four forms, explanations and tips |
| §5.19 | `scientificNotation`: three forms, judging of the form, explanations and tips |
| §3.4.1 | All Getalbegrip rows of the tip table; the factor-of-ten fallback for scientific steps |
| §6 | `scientific` input: keys, reducer rules, "Ongeldige notatie", display |

**Not in scope:**

- Changes to `lib/expr` (the scientific parser is separate; prompts with `10⁻³` are plain text)
- Negative exponents with other bases than 10, fractions as answers (set 6)
- The manual phone check (listed as a follow-up in CLAUDE.md in Task 11)

**Decisions settled with the user on 2026-10-07 (spec §11 item 19):** notation typed with existing keys; only the normalised form is correct, with a tip for an equal value; remainder in a context; negative exponents only with base 10; rounded large numbers typed in full.

## Prerequisites & command permissions

- Allowed: `npm test`, `npm run check`, `npm run build`, `git add`, `git commit`, `git status`, `git diff`, `git log`, `ls`, `cat`, `echo`, `grep`, `sed -n` (read-only).
- **Forbidden:** `npx`, `node`, `tail`, `head`, `rm`, `sed -i`, `npm run format`, `npm run dev`, `npm run preview`, `git checkout`, `git reset`, `git push`, `git add -u`, `git add .`. Use the Read tool to view files and `grep` to filter output.
- Before `git add <file>`, run `git diff <file>` and check that every hunk is yours: another session may edit `main` at the same time. Stage explicit paths only.
- Format new code by hand (Prettier style: 100 columns, single quotes, trailing commas). Keypad grids keep `// prettier-ignore` and one grid row per line.
- Every commit message ends with the trailer `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>` (pass it via a second `-m`).
- `npm run check` must stay at 0 errors and 0 warnings after every task.
- If a commit fails because 1Password signing is locked, stop and ask the user to unlock it. Never bypass signing.

## Notes for the implementer

- **Digit grouping:** `formatInteger` and `formatRational` group numbers of 5+ digits with U+202F (`10 000`); 4 digits stay ungrouped (`3600`). In test literals write the separator as `\u{202f}`, the euro no-break space as `\u{a0}`. Never paste the raw characters.
- **Glyphs:** `×` U+00D7, `−` U+2212 (typographic minus, used in all UI text), `⁻` U+207B (superscript minus), `ⁿ` U+207F, `√`, `∛`, `°`, `²`, `³`. Keypad input uses the ASCII hyphen `-`.
- **Generators are pure** `(rng) => Question`. Every random choice goes through the `rng` argument; never use `Math.random`.
- **Existing seeded tests must keep passing.** No existing generator changes in this plan.
- **Tips** may only claim what is certain: a tip fires only when the answer equals exactly what that mistake produces (spec §3.4.1).
- **Line length:** a few code and test lines in this plan run past 100 columns (long Dutch strings, regexes). Wrap them Prettier-style (string concatenation, arguments on their own lines) without changing the resulting strings. `npm run format` stays forbidden.
- **Statistical assertions** (shares, "about equally often") use fixed seeds and wide margins. If one fails by a small margin with the given seed, report it instead of tuning the generator to the seed.

## File structure

```
src/lib/
  types.ts                       AnswerKind + 'scientific'; Topic + five topics
  format.ts (+ .test.ts)         formatScientific, formatScientificInput
  keypadInput.ts (+ .test.ts)    applyScientificKey, MAX_SCIENTIFIC_LENGTH
  steps.ts (+ .test.ts)          ScientificInput, parseScientific, scientificValue, isNormalised,
                                 scientificStep (with the generic notation tips)
  inputModels.ts (+ .test.ts)    scientific input model, INVALID_SCIENTIFIC
  random.ts (+ .test.ts)         drawUntil
  sets.ts (+ .test.ts)           NUMBER_SENSE_SET
  session.test.ts                Getalbegrip quota and uniqueness
  topics/index.ts                five generators and labels
  topics/mentalOperations.ts (+ .test.ts)    NEW
  topics/negativeNumbers.ts (+ .test.ts)     NEW
  topics/rounding.ts (+ .test.ts)            NEW
  topics/powersRoots.ts (+ .test.ts)         NEW
  topics/scientificNotation.ts (+ .test.ts)  NEW
src/components/
  Keypad.svelte                  comment: two keypads have 4 columns
  QuestionView.test.ts           scientific input end to end
CLAUDE.md                        status, roadmap row, follow-ups
```

---

## Task 1: Scientific display (`formatScientific`, `formatScientificInput`)

**Files:**
- Modify: `src/lib/format.ts` (append after `formatExpressionInput`)
- Test: `src/lib/format.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/lib/format.test.ts`, add `formatScientific` and `formatScientificInput` to the import list from `'./format'` (alphabetical order, after `formatSeconds`). Append at the end of the file:

```ts
describe('formatScientific', () => {
  it('writes c × 10ⁿ with a Dutch coefficient and a superscript exponent', () => {
    expect(formatScientific(rational(9n, 2n), 6)).toBe('4,5 × 10⁶');
    expect(formatScientific(rational(1n), 6)).toBe('1 × 10⁶');
    expect(formatScientific(rational(3n), -3)).toBe('3 × 10⁻³');
    expect(formatScientific(rational(321n, 100n), 9)).toBe('3,21 × 10⁹');
  });
});

describe('formatScientificInput', () => {
  it('pretty-prints keypad input with superscript exponents', () => {
    expect(formatScientificInput('4,5×10^6')).toBe('4,5 × 10⁶');
    expect(formatScientificInput('4,5×10^-3')).toBe('4,5 × 10⁻³');
    expect(formatScientificInput('10^12')).toBe('10¹²');
    expect(formatScientificInput('4500000')).toBe('4500000');
  });

  it('keeps an unfinished power visible', () => {
    expect(formatScientificInput('4,5×')).toBe('4,5 × ');
    expect(formatScientificInput('4,5×10^')).toBe('4,5 × 10^');
    expect(formatScientificInput('4,5×10^-')).toBe('4,5 × 10^−');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/format.test.ts`
Expected: FAIL, `formatScientific is not a function` (or an import error).

- [ ] **Step 3: Implement**

In `src/lib/format.ts`, append after `formatExpressionInput`:

```ts
/** Scientific notation: '4,5 × 10⁶', also '1 × 10⁶' (spec §5.19). */
export function formatScientific(coefficient: Rational, exponent: number): string {
  return `${formatRational(coefficient)} × ${formatPowerOfTen(exponent)}`;
}

/**
 * Scientific keypad input '4,5×10^-3' as '4,5 × 10⁻³' (spec §6). A '^' without an exponent
 * stays visible, and so does a minus sign without digits: '10^-' as '10^−'.
 */
export function formatScientificInput(raw: string): string {
  const powers = raw.replace(
    /\^(-?)(\d+)/g,
    (_match, sign: string, digits: string) =>
      (sign === '' ? '' : SUPERSCRIPT_MINUS) + superscriptDigits(digits),
  );
  return formatInput(powers).replaceAll('×', ' × ');
}
```

`SUPERSCRIPT_MINUS` and `superscriptDigits` are already defined (module-private) earlier in `format.ts`; `Rational` is already imported as a type.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/format.test.ts` then `npm run check`
Expected: PASS; check 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

```bash
git diff src/lib/format.ts src/lib/format.test.ts
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: format scientific notation and its keypad input" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Scientific key reducer (`applyScientificKey`)

**Files:**
- Modify: `src/lib/keypadInput.ts` (append at the end)
- Test: `src/lib/keypadInput.test.ts`

Rules (spec §6): a digit always, except when the exponent already has 2 digits; `,` only in the first number, once, never after `×` or `^`; `×` only after a digit of the first number, once; `^` only after a digit, once; `−` only directly after `^`; at most 16 characters. Every other key is ignored.

- [ ] **Step 1: Write the failing tests**

In `src/lib/keypadInput.test.ts`, add `applyScientificKey` and `MAX_SCIENTIFIC_LENGTH` to the import list from `'./keypadInput'`. Append at the end of the file:

```ts
describe('applyScientificKey', () => {
  const typeScientific = (keys: KeypadKey[], start = '') => keys.reduce(applyScientificKey, start);

  it('types the notation with ×, ^ and a negative exponent', () => {
    expect(typeScientific(['4', ',', '5', '×', '1', '0', '^', '-', '3'])).toBe('4,5×10^-3');
    expect(typeScientific(['1', '0', '^', '6'])).toBe('10^6');
    expect(typeScientific(['4', '5', '0', '0'])).toBe('4500');
  });

  it('allows the comma once, only in the first number', () => {
    expect(typeScientific([','])).toBe(',');
    expect(typeScientific(['4', ',', '5', ','])).toBe('4,5');
    expect(typeScientific(['4', '×', '1', ','])).toBe('4×1');
    expect(typeScientific(['1', '0', '^', ','])).toBe('10^');
  });

  it('allows × once, only after a digit of the first number', () => {
    expect(typeScientific(['×'])).toBe('');
    expect(typeScientific(['4', ',', '×'])).toBe('4,');
    expect(typeScientific(['4', '×', '1', '0', '×'])).toBe('4×10');
    expect(typeScientific(['1', '0', '^', '2', '×'])).toBe('10^2');
  });

  it('allows ^ once, only after a digit', () => {
    expect(typeScientific(['^'])).toBe('');
    expect(typeScientific(['4', '×', '^'])).toBe('4×');
    expect(typeScientific(['4', '×', '1', '0', '^', '2', '^'])).toBe('4×10^2');
  });

  it('allows a minus sign only directly after ^', () => {
    expect(typeScientific(['-', '4'])).toBe('4');
    expect(typeScientific(['4', '-'])).toBe('4');
    expect(typeScientific(['1', '0', '^', '-', '-'])).toBe('10^-');
    expect(typeScientific(['1', '0', '^', '2', '-'])).toBe('10^2');
  });

  it('keeps the exponent to two digits', () => {
    expect(typeScientific(['1', '0', '^', '1', '2', '3'])).toBe('10^12');
    expect(typeScientific(['1', '0', '^', '-', '1', '2', '3'])).toBe('10^-12');
  });

  it('ignores the keys of other keypads', () => {
    expect(typeScientific(['4', '+', ':', '(', ')', '/', '=', ' '])).toBe('4');
  });

  it('removes the last character on backspace and stops at the maximum length', () => {
    expect(typeScientific(['4', '×', 'backspace'])).toBe('4');
    expect(typeScientific(['backspace'])).toBe('');
    const full = '1'.repeat(MAX_SCIENTIFIC_LENGTH);
    expect(applyScientificKey(full, '1')).toBe(full);
    expect(applyScientificKey(full, 'backspace')).toBe(full.slice(0, -1));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/keypadInput.test.ts`
Expected: FAIL, `applyScientificKey is not a function`.

- [ ] **Step 3: Implement**

Append to `src/lib/keypadInput.ts`:

```ts
/** The longest useful input is 1,25×10^-6 (10 characters); 16 leaves room. */
export const MAX_SCIENTIFIC_LENGTH = 16;

/** §5.19 exponents stay within two digits (10⁻⁹ … 10¹¹ in the normalise prompts). */
const MAX_EXPONENT_DIGITS = 2;

/**
 * Scientific input (spec §6): '4,5×10^-3', '10^6' or a plain number. The comma only in the first
 * number; × once, after a digit of the first number; ^ once, after a digit; '-' only directly
 * after ^ (a negative exponent); an exponent of at most two digits.
 */
export function applyScientificKey(value: string, key: KeypadKey): string {
  if (key === 'backspace') return value.slice(0, -1);
  if (value.length >= MAX_SCIENTIFIC_LENGTH) return value;
  const caret = value.indexOf('^');
  const endsWithDigit = /\d$/.test(value);
  switch (key) {
    case ',':
      return /^\d*$/.test(value) ? `${value},` : value;
    case '×':
      return endsWithDigit && !value.includes('×') && caret === -1 ? `${value}×` : value;
    case '^':
      return endsWithDigit && caret === -1 ? `${value}^` : value;
    case '-':
      return value.endsWith('^') ? `${value}-` : value;
    default: {
      // Only digits are appended; any other key is ignored.
      if (!/^\d$/.test(key)) return value;
      const exponentDigits = caret === -1 ? 0 : value.slice(caret + 1).replace('-', '').length;
      return exponentDigits < MAX_EXPONENT_DIGITS ? value + key : value;
    }
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/keypadInput.test.ts` then `npm run check`
Expected: PASS; check 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

```bash
git diff src/lib/keypadInput.ts src/lib/keypadInput.test.ts
git add src/lib/keypadInput.ts src/lib/keypadInput.test.ts
git commit -m "feat: key reducer for scientific notation input" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Scientific parser (`parseScientific`, `scientificValue`, `isNormalised`)

**Files:**
- Modify: `src/lib/steps.ts`
- Test: `src/lib/steps.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/lib/steps.test.ts`, add `isNormalised`, `parseScientific` and `scientificValue` to the import list from `'./steps'`. Append at the end of the file:

```ts
describe('parseScientific', () => {
  it.each([
    ['4,5×10^6', rational(9n, 2n), 6],
    ['10^6', rational(1n), 6],
    ['4,5×10^-3', rational(9n, 2n), -3],
    ['45×10^5', rational(45n), 5],
    [',5×10^2', rational(1n, 2n), 2],
    ['4500000', rational(4_500_000n), null],
  ] as const)('reads %j', (input, coefficient, exponent) => {
    expect(parseScientific(input)).toEqual({ coefficient, exponent });
  });

  it.each(['', '4,5×', '4,5×10', '4,5×10^', '4,5×10^-', '4,5×2^6', '4,5^6', '×10^6', '4,5,5×10^6'])(
    'rejects %j',
    (input) => {
      expect(parseScientific(input)).toBeNull();
    },
  );
});

describe('scientificValue', () => {
  it('multiplies the coefficient by the power of ten', () => {
    expect(scientificValue({ coefficient: rational(9n, 2n), exponent: -3 })).toEqual(
      rational(9n, 2000n),
    );
    expect(scientificValue({ coefficient: rational(1n), exponent: 6 })).toEqual(
      rational(1_000_000n),
    );
  });

  it('is the number itself for a plain number', () => {
    expect(scientificValue({ coefficient: rational(7n), exponent: null })).toEqual(rational(7n));
  });
});

describe('isNormalised', () => {
  it.each([
    [rational(9n, 2n), 6, true],
    [rational(1n), 6, true],
    [rational(999n, 100n), -3, true],
    [rational(10n), 5, false],
    [rational(45n), 5, false],
    [rational(9n, 20n), 7, false],
    [rational(9n, 2n), null, false],
  ] as const)('judges %o × 10^%s as %s', (coefficient, exponent, expected) => {
    expect(isNormalised({ coefficient, exponent })).toBe(expected);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/steps.test.ts`
Expected: FAIL, `parseScientific is not a function`.

- [ ] **Step 3: Implement**

In `src/lib/steps.ts`, extend the import from `'./rational'` to:

```ts
import {
  compare,
  decimalPlaces,
  equals,
  multiply,
  parseDutchNumber,
  parseFraction,
  parseMixedNumber,
  powerOfTen,
  rational,
  type Rational,
} from './rational';
```

Then append to `src/lib/steps.ts`:

```ts
/** A scientific answer (spec §5.19): c × 10ⁿ, or a plain number when `exponent` is null. */
export interface ScientificInput {
  coefficient: Rational;
  exponent: number | null;
}

// An optional coefficient and ×, then 10, ^ and an integer exponent: '4,5×10^-3', '10^6'.
const SCIENTIFIC = /^(?:([\d,]+)×)?10\^([-−]?\d+)$/;

/**
 * '4,5×10^6', '10^6' (c = 1) or a plain number such as '4500000'. Null for anything else, e.g.
 * an unfinished power or another base than 10 (spec §6).
 */
export function parseScientific(input: string): ScientificInput | null {
  const match = SCIENTIFIC.exec(input.trim());
  if (match === null) {
    const plain = parseDutchNumber(input);
    return plain === null ? null : { coefficient: plain, exponent: null };
  }
  const [, coefficientText, exponentText = ''] = match;
  const coefficient =
    coefficientText === undefined ? rational(1n) : parseDutchNumber(coefficientText);
  if (coefficient === null) return null;
  return { coefficient, exponent: Number(exponentText.replace('−', '-')) };
}

export function scientificValue({ coefficient, exponent }: ScientificInput): Rational {
  return exponent === null ? coefficient : multiply(coefficient, powerOfTen(exponent));
}

const ONE = rational(1n);
const TEN = rational(10n);

/** c × 10ⁿ with 1 ≤ c < 10; a plain number is never normalised. */
export function isNormalised({ coefficient, exponent }: ScientificInput): boolean {
  return exponent !== null && compare(coefficient, ONE) >= 0 && compare(coefficient, TEN) < 0;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/steps.test.ts` then `npm run check`
Expected: PASS; check 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

```bash
git diff src/lib/steps.ts src/lib/steps.test.ts
git add src/lib/steps.ts src/lib/steps.test.ts
git commit -m "feat: parse scientific notation answers" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: The `scientific` answer kind (step, input model, QuestionView)

**Files:**
- Modify: `src/lib/types.ts:4` (`AnswerKind`)
- Modify: `src/lib/steps.ts` (append `scientificStep`; import `formatScientific`)
- Modify: `src/lib/inputModels.ts`
- Modify: `src/components/Keypad.svelte:9` (comment only)
- Test: `src/lib/steps.test.ts`, `src/lib/inputModels.test.ts`, `src/components/QuestionView.test.ts`

- [ ] **Step 1: Write the failing step tests**

In `src/lib/steps.test.ts`, add `scientificStep` to the import list from `'./steps'`. Append:

```ts
describe('scientificStep', () => {
  const step = scientificStep({
    prompt: 'Schrijf in wetenschappelijke notatie: 4\u{202f}500\u{202f}000',
    coefficient: rational(9n, 2n),
    exponent: 6,
    explanation: 'uitleg',
  });

  it('is a scientific step that shows c × 10ⁿ as the expected answer', () => {
    expect(step.kind).toBe('scientific');
    expect(step.check('4,5×10^6')).toEqual({
      correct: true,
      expected: '4,5 × 10⁶',
      explanation: 'uitleg',
    });
  });

  it('accepts trailing zeros, and 10ⁿ alone for c = 1', () => {
    expect(step.check('4,50×10^6').correct).toBe(true);
    const one = scientificStep({ prompt: 'p', coefficient: rational(1n), exponent: 6 });
    expect(one.check('10^6').correct).toBe(true);
    expect(one.check('1×10^6')).toMatchObject({ correct: true, expected: '1 × 10⁶' });
  });

  it('rejects an equal value in another form with a tip', () => {
    expect(step.check('45×10^5')).toMatchObject({
      correct: false,
      tip: 'De waarde klopt, maar het getal vóór × 10 moet minstens 1 en kleiner dan 10 zijn.',
    });
    expect(step.check('0,45×10^7').correct).toBe(false);
    expect(step.check('4500000')).toMatchObject({
      correct: false,
      tip: 'Schrijf het als een getal van 1 tot 10 keer een macht van 10.',
    });
  });

  it('names an exponent with the wrong sign', () => {
    expect(step.check('4,5×10^-6').tip).toBe(
      'Een getal groter dan 10 heeft een positieve exponent.',
    );
    const small = scientificStep({ prompt: 'p', coefficient: rational(3n), exponent: -3 });
    expect(small.check('3×10^3').tip).toBe(
      'Een getal kleiner dan 1 heeft een negatieve exponent.',
    );
  });

  it('tries the topic diagnosis before the factor-of-ten fallback', () => {
    const diagnosed = scientificStep({
      prompt: 'p',
      coefficient: rational(9n, 2n),
      exponent: 6,
      diagnose: (given) => (given.exponent === 5 ? 'telfout' : undefined),
    });
    expect(diagnosed.check('4,5×10^5').tip).toBe('telfout');
    expect(step.check('4,5×10^5').tip).toBe(
      'Je antwoord is 10 keer te klein. Let op de komma en het aantal nullen.',
    );
  });

  it('gives no tip for an unrelated or unparsable answer', () => {
    expect(step.check('3×10^6').tip).toBeUndefined();
    expect(step.check('4,5×2^6')).toEqual({
      correct: false,
      expected: '4,5 × 10⁶',
      explanation: 'uitleg',
    });
  });
});
```

- [ ] **Step 2: Write the failing input-model tests**

In `src/lib/inputModels.test.ts`, add `INVALID_SCIENTIFIC` to the import list from `'./inputModels'`.

In `describe('INPUT_MODELS keys', …)`, add:

```ts
  it('lays out the scientific keypad in 4 columns with ×, ^ and − on the right', () => {
    // prettier-ignore
    expect(labels('scientific')).toEqual([
      '7', '8', '9', '×',
      '4', '5', '6', '^',
      '1', '2', '3', '−',
      '⌫', '0', ',',
    ]);
    expect(INPUT_MODELS.scientific.columns).toBe(4);
  });
```

In the `it.each` table of `describe('INPUT_MODELS validation and display', …)`, add these rows after the expression rows:

```ts
    ['scientific', '4,5×10^6', null],
    ['scientific', '10^-3', null],
    ['scientific', '4500000', null],
    ['scientific', '4,5×10^', INVALID_SCIENTIFIC],
    ['scientific', '4,5×', INVALID_SCIENTIFIC],
    ['scientific', '4,5×2^6', INVALID_SCIENTIFIC],
```

In `it('uses the Dutch messages from the spec', …)`, add:

```ts
    expect(INVALID_SCIENTIFIC).toBe('Ongeldige notatie');
```

In `it('pretty-prints a submitted input', …)`, add:

```ts
    expect(INPUT_MODELS.scientific.display('4,5×10^-3')).toBe('4,5 × 10⁻³');
```

In `describe('displayAnswer', …)`, add to the existing `it`:

```ts
    expect(displayAnswer('scientific', '10^6')).toBe('10⁶');
```

- [ ] **Step 3: Write the failing component test**

In `src/components/QuestionView.test.ts`, change the steps import to:

```ts
import {
  booleanStep,
  factorizationStep,
  fractionStep,
  numberStep,
  scientificStep,
} from '../lib/steps';
```

Add this test inside `describe('QuestionView', …)`, after the `'types an expression and rejects an incomplete one inline'` test:

```ts
  it('types scientific notation with the existing keys and rejects an unfinished power', async () => {
    const onanswer = vi.fn();
    const scientific = scientificStep({
      prompt: 'Schrijf in wetenschappelijke notatie: 0,0045',
      coefficient: rational(9n, 2n),
      exponent: -3,
    });
    render(QuestionView, { props: { step: scientific, onanswer } });

    await press('4', 'komma', '5', 'keer', '1', '0', 'tot de macht', 'min');
    expect(answerText()).toBe('4,5 × 10^−');
    await press('OK');
    expect(errorText()).toBe('Ongeldige notatie');
    expect(onanswer).not.toHaveBeenCalled();

    await press('3');
    expect(errorText()).toBe('');
    expect(answerText()).toBe('4,5 × 10⁻³');
    await press('OK');
    expect(onanswer).toHaveBeenCalledWith(
      '4,5×10^-3',
      expect.objectContaining({ correct: true, expected: '4,5 × 10⁻³' }),
    );
  });
```

(`rational` is already imported in this file.)

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npm test -- src/lib/steps.test.ts src/lib/inputModels.test.ts src/components/QuestionView.test.ts`
Expected: FAIL (`scientificStep is not a function`, `INPUT_MODELS.scientific` undefined).

- [ ] **Step 5: Implement the answer kind and the step**

In `src/lib/types.ts`, replace the `AnswerKind` line with:

```ts
export type AnswerKind =
  | 'number'
  | 'fraction'
  | 'boolean'
  | 'expression'
  | 'factorization'
  | 'scientific';
```

In `src/lib/steps.ts`, add `formatScientific` to the import from `'./format'`:

```ts
import {
  formatFraction,
  formatInteger,
  formatPrimeFactors,
  formatRational,
  formatScientific,
} from './format';
```

Append to `src/lib/steps.ts`:

```ts
export interface ScientificStepOptions {
  prompt: string;
  /** c of the answer c × 10ⁿ, with 1 ≤ c < 10. */
  coefficient: Rational;
  exponent: number;
  explanation?: string;
  /** Topic-specific mistakes (spec §3.4.1); tried after the generic notation tips. */
  diagnose?: (given: ScientificInput) => string | undefined;
}

/**
 * Only c × 10ⁿ with 1 ≤ c < 10 and the right value is correct (spec §5.19). An equal value in
 * another form, or the right c with the exponent's sign flipped, gets a generic tip; then the
 * topic's diagnosis; then the factor-of-ten fallback.
 */
export function scientificStep({
  prompt,
  coefficient,
  exponent,
  explanation,
  diagnose,
}: ScientificStepOptions): Step {
  const answer = multiply(coefficient, powerOfTen(exponent));
  const expected = formatScientific(coefficient, exponent);
  return {
    kind: 'scientific',
    prompt,
    check(input) {
      const given = parseScientific(input);
      // Validation keeps unparsable input away; should it get here, it is simply wrong.
      if (given === null) return { correct: false, expected, explanation };
      const value = scientificValue(given);
      if (equals(value, answer) && isNormalised(given)) {
        return { correct: true, expected, explanation };
      }
      const tip =
        notationTip(given, value, answer, coefficient, exponent) ??
        diagnose?.(given) ??
        powerOfTenTip(value, answer);
      return { correct: false, expected, tip, explanation };
    },
  };
}

/** The generic mistakes of spec §3.4.1: the right value in another form, or the sign of n. */
function notationTip(
  given: ScientificInput,
  value: Rational,
  answer: Rational,
  coefficient: Rational,
  exponent: number,
): string | undefined {
  if (equals(value, answer)) {
    return given.exponent === null
      ? 'Schrijf het als een getal van 1 tot 10 keer een macht van 10.'
      : 'De waarde klopt, maar het getal vóór × 10 moet minstens 1 en kleiner dan 10 zijn.';
  }
  if (given.exponent === -exponent && equals(given.coefficient, coefficient)) {
    return exponent < 0
      ? 'Een getal kleiner dan 1 heeft een negatieve exponent.'
      : 'Een getal groter dan 10 heeft een positieve exponent.';
  }
  return undefined;
}
```

- [ ] **Step 6: Implement the input model**

In `src/lib/inputModels.ts`:

1. Extend the imports:

```ts
import {
  formatExpressionInput,
  formatFactorizationInput,
  formatInput,
  formatScientificInput,
} from './format';
import {
  applyExpressionKey,
  applyFactorizationKey,
  applyFractionKey,
  applyKey,
  applyScientificKey,
  EMPTY_FRACTION_INPUT,
  fractionInputToString,
  selectFractionSlot,
  type FractionInput,
  type FractionSlot,
  type KeypadKey,
} from './keypadInput';
import { keyDefs, type KeyDef } from './keys';
import { parseAnswer, parseFactorization, parseScientific } from './steps';
```

2. Change the `columns` doc comment in `InputModel` to:

```ts
  /** Keypad columns; 3 when absent. The expression and scientific keypads have 4 (spec §6). */
```

3. Add `scientific: string;` to `KeypadStates` (after `factorization: string;`).

4. Add after `INVALID_FACTORIZATION`:

```ts
export const INVALID_SCIENTIFIC = 'Ongeldige notatie';
```

5. Add after `FACTORIZATION_KEYS`:

```ts
/**
 * The notation is typed with existing keys (spec §6): four columns like the expression keypad,
 * but four rows, because OK fills the last cell.
 */
// prettier-ignore
const SCIENTIFIC_KEYS = keyDefs(
  '7', '8', '9', '×',
  '4', '5', '6', '^',
  '1', '2', '3', '-',
  'backspace', '0', ',',
);
```

6. Add to `INPUT_MODELS`, after `factorization`:

```ts
  scientific: {
    ...textModel(
      SCIENTIFIC_KEYS,
      applyScientificKey,
      (input) => (parseScientific(input) === null ? INVALID_SCIENTIFIC : null),
      formatScientificInput,
    ),
    columns: 4,
  },
```

In `src/components/Keypad.svelte`, change the comment on `columns` to:

```ts
    /** Grid columns; the expression and scientific keypads have 4 (spec §6). */
```

`QuestionView.svelte` needs no change: its last branch picks `INPUT_MODELS[step.kind]`.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test` then `npm run check`
Expected: all tests PASS; check 0 errors, 0 warnings.

- [ ] **Step 8: Commit**

```bash
git diff src/lib/types.ts src/lib/steps.ts src/lib/steps.test.ts src/lib/inputModels.ts src/lib/inputModels.test.ts src/components/Keypad.svelte src/components/QuestionView.test.ts
git add src/lib/types.ts src/lib/steps.ts src/lib/steps.test.ts src/lib/inputModels.ts src/lib/inputModels.test.ts src/components/Keypad.svelte src/components/QuestionView.test.ts
git commit -m "feat: scientific answer kind typed with the existing keys" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---
## Task 5: Rejection helper (`drawUntil`)

**Files:**
- Modify: `src/lib/random.ts` (append after `randomIntWhere`)
- Test: `src/lib/random.test.ts`

The new generators all say "redrawn until all rules hold". `drawUntil` is that loop, with the same safety limit as `randomIntWhere`.

- [ ] **Step 1: Write the failing tests**

In `src/lib/random.test.ts`, change the import to:

```ts
import {
  createRng,
  drawUntil,
  pick,
  randomInt,
  randomIntWhere,
  randomSeed,
  shuffle,
} from './random';
```

Append:

```ts
describe('drawUntil', () => {
  it('returns the first accepted draw', () => {
    const rng = createRng(1);
    for (let i = 0; i < 100; i++) {
      const even = drawUntil(() => {
        const value = randomInt(rng, 1, 10);
        return value % 2 === 0 ? value : null;
      });
      expect(even % 2).toBe(0);
    }
  });

  it('throws when no draw is accepted', () => {
    expect(() => drawUntil(() => null)).toThrow(RangeError);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/random.test.ts`
Expected: FAIL, `drawUntil is not a function`.

- [ ] **Step 3: Implement**

In `src/lib/random.ts`, add after `randomIntWhere`:

```ts
/**
 * The first non-null result of `draw`, by rejection: "redrawn until all rules hold". Throws if
 * none turns up.
 */
export function drawUntil<T>(draw: () => T | null): T {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const value = draw();
    if (value !== null) return value;
  }
  throw new RangeError('No accepted draw found');
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/random.test.ts` then `npm run check`
Expected: PASS; check 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

```bash
git diff src/lib/random.ts src/lib/random.test.ts
git add src/lib/random.ts src/lib/random.test.ts
git commit -m "feat: drawUntil, a generic rejection helper for generators" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `mentalOperations` (spec §5.15)

**Files:**
- Create: `src/lib/topics/mentalOperations.ts`
- Create: `src/lib/topics/mentalOperations.test.ts`
- Modify: `src/lib/types.ts` (`Topic`), `src/lib/topics/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/topics/mentalOperations.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { evaluate } from '../expr/evaluate';
import { parse } from '../expr/parser';
import { GROUP_SEPARATOR } from '../format';
import { createRng, randomInt } from '../random';
import { parseDutchNumber } from '../rational';
import type { Question, Step } from '../types';
import {
  buildMentalOperation,
  DIVIDE_FACTORS,
  explainAddSubtract,
  explainDivide,
  explainMultiply,
  generateMentalOperations,
  hasCarry,
  isSmartProduct,
  MAX_PRODUCT,
  MAX_QUOTIENT,
  MAX_TERM,
  MAX_TOTAL,
  MENTAL_FORMS,
  type MentalForm,
  MIN_QUOTIENT,
  MIN_TERM,
  REMAINDER_CONTEXTS,
  remainderQuestion,
} from './mentalOperations';

const PER_FORM = 1000;

function questionsOf(form: MentalForm): Question[] {
  const rng = createRng(200 + MENTAL_FORMS.indexOf(form));
  return Array.from({ length: PER_FORM }, () => buildMentalOperation(rng, form));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

/** Text as typed on the keypad: no digit grouping. */
function plain(text: string): string {
  return text.replaceAll(GROUP_SEPARATOR, '');
}

/** The sum of a prompt `a + b = ?`, without ' = ?' and without grouping. */
function sumOf(question: Question): string {
  return plain(stepOf(question).prompt.slice(0, -' = ?'.length));
}

function expectedOf(question: Question): string {
  return stepOf(question).check('').expected;
}

/** Trailing zeros of a positive integer. */
function zeros(value: number): number {
  return /0*$/.exec(String(value))![0].length;
}

/** A positive integer without its trailing zeros. */
function significant(value: number): number {
  return value / 10 ** zeros(value);
}

/** Independent column check: some column of a + b adds up to 10 or more. */
function needsCarry(a: number, b: number): boolean {
  for (let x = a, y = b; x > 0 || y > 0; x = Math.floor(x / 10), y = Math.floor(y / 10)) {
    if ((x % 10) + (y % 10) >= 10) return true;
  }
  return false;
}

/** Independent column check: some column of a − b has a smaller top digit. */
function needsBorrow(a: number, b: number): boolean {
  for (let x = a, y = b; y > 0; x = Math.floor(x / 10), y = Math.floor(y / 10)) {
    if (x % 10 < y % 10) return true;
  }
  return false;
}

function contextOf(id: string, ask: string) {
  return REMAINDER_CONTEXTS.find((context) => context.id === id && context.ask === ask)!;
}

describe('generateMentalOperations', () => {
  it('produces all four forms, each accepting its expected answer', () => {
    const rng = createRng(1);
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const question = generateMentalOperations(rng);
      expect(question.topic).toBe('mentalOperations');
      const step = stepOf(question);
      expect(step.check(plain(expectedOf(question))).correct, step.prompt).toBe(true);
      const remainder = question.key.startsWith('mentalOperations:remainder:');
      seen.add(remainder ? 'remainder' : sumOf(question).replace(/[\d ]/g, ''));
    }
    expect([...seen].sort()).toEqual(['+', ':', 'remainder', '×', '−'].sort());
  });
});

describe('add / subtract', () => {
  const questions = questionsOf('addSubtract');

  it('uses a number with two significant digits and one or two zeros', () => {
    for (const question of questions) {
      const match = /^(\d+) ([+−]) (\d+)$/.exec(sumOf(question));
      expect(match, sumOf(question)).not.toBeNull();
      const [, a = '', sign, b = ''] = match!;
      expect(Number(a)).toBeGreaterThanOrEqual(MIN_TERM);
      expect(Number(a)).toBeLessThanOrEqual(MAX_TERM);
      expect(b).toMatch(/^[1-9][1-9]0{1,2}$/);
      if (sign === '+') {
        expect(needsCarry(Number(a), Number(b)), sumOf(question)).toBe(true);
      } else {
        expect(Number(a)).toBeGreaterThan(Number(b));
        expect(needsBorrow(Number(a), Number(b)), sumOf(question)).toBe(true);
      }
    }
  });

  it('mixes sums and differences', () => {
    const sums = questions.filter((question) => sumOf(question).includes('+')).length;
    expect(sums).toBeGreaterThan(400);
    expect(sums).toBeLessThan(600);
  });

  it('expects the value of the sum', () => {
    for (const question of questions) {
      expect(parseDutchNumber(plain(expectedOf(question)))).toEqual(
        evaluate(parse(sumOf(question))!),
      );
    }
  });

  it('explains in two steps, the largest part first', () => {
    expect(explainAddSubtract(6347, 2800, true)).toBe('6347 + 2000 = 8347 → 8347 + 800 = 9147');
    expect(explainAddSubtract(15_213, 470, false)).toBe(
      '15\u{202f}213 − 400 = 14\u{202f}813 → 14\u{202f}813 − 70 = 14\u{202f}743',
    );
  });

  it('detects a carry like the column method', () => {
    expect(hasCarry(6347, 2800)).toBe(true);
    expect(hasCarry(6347, 1200)).toBe(false);
    expect(hasCarry(95, 5)).toBe(true);
    const rng = createRng(5);
    for (let i = 0; i < 1000; i++) {
      const a = randomInt(rng, 0, 99_999);
      const b = randomInt(rng, 0, 99_999);
      expect(hasCarry(a, b), `${a} + ${b}`).toBe(needsCarry(a, b));
    }
  });
});

describe('multiply by zeros', () => {
  const questions = questionsOf('multiply');

  it('multiplies a table fact with 1 to 4 zeros, up to a million', () => {
    for (const question of questions) {
      const [x = 0, y = 0] = sumOf(question).split(' × ').map(Number);
      const [small = 0, large = 0] = [significant(x), significant(y)].sort((u, v) => u - v);
      expect(small, sumOf(question)).toBeGreaterThanOrEqual(2);
      expect(small, sumOf(question)).toBeLessThanOrEqual(9);
      expect(large, sumOf(question)).toBeLessThanOrEqual(99);
      expect(zeros(x) + zeros(y)).toBeGreaterThanOrEqual(1);
      expect(zeros(x) + zeros(y)).toBeLessThanOrEqual(4);
      expect(x * y).toBeLessThanOrEqual(MAX_PRODUCT);
      expect(isSmartProduct(x, y), sumOf(question)).toBe(false);
    }
  });

  it('keys a product by its factors in ascending order', () => {
    for (const question of questions) {
      const factors = sumOf(question).split(' × ').map(Number).sort((u, v) => u - v);
      expect(plain(question.key)).toBe(`mentalOperations:${factors.join(' × ')}`);
    }
  });

  it('shows the factors in both orders', () => {
    const largeFirst = questions.filter((question) => {
      const [x = 0, y = 0] = sumOf(question).split(' × ').map(Number);
      return x > y;
    }).length;
    expect(largeFirst).toBeGreaterThan(350);
    expect(largeFirst).toBeLessThan(650);
  });

  it('leaves out the products of smart calculation', () => {
    expect(isSmartProduct(48, 50)).toBe(true);
    expect(isSmartProduct(50, 48)).toBe(true);
    expect(isSmartProduct(125, 8)).toBe(true);
    expect(isSmartProduct(25, 300)).toBe(false);
    expect(isSmartProduct(28, 500)).toBe(false);
  });

  it('explains the table fact, then the zeros', () => {
    expect(explainMultiply(28, 500)).toBe('28 × 5 = 140 → 28 × 500 = 140 × 100 = 14\u{202f}000');
    expect(explainMultiply(60, 700)).toBe('6 × 7 = 42 → 60 × 700 = 42 × 1000 = 42\u{202f}000');
  });
});

describe('divide by zeros', () => {
  const questions = questionsOf('divide');

  it('divides exactly with table factors and 1 to 4 zeros, up to a million', () => {
    for (const question of questions) {
      const [dividend = 0, divisor = 0] = sumOf(question).split(' : ').map(Number);
      const quotient = dividend / divisor;
      expect(Number.isInteger(quotient), sumOf(question)).toBe(true);
      expect(dividend).toBeLessThanOrEqual(MAX_PRODUCT);
      expect(DIVIDE_FACTORS).toContain(significant(divisor));
      expect(DIVIDE_FACTORS).toContain(significant(quotient));
      expect(zeros(divisor) + zeros(quotient)).toBeGreaterThanOrEqual(1);
      expect(zeros(divisor) + zeros(quotient)).toBeLessThanOrEqual(4);
      expect(parseDutchNumber(plain(expectedOf(question)))).toEqual(
        evaluate(parse(sumOf(question))!),
      );
    }
  });

  it('strikes equal zeros when the divisor has them', () => {
    expect(explainDivide(7200, 80)).toBe('7200 : 80 = 720 : 8 = 90');
    expect(explainDivide(36_000, 900)).toBe('36\u{202f}000 : 900 = 360 : 9 = 40');
  });

  it('uses the table fact when the divisor has no zeros', () => {
    expect(explainDivide(4800, 6)).toBe('48 : 6 = 8 → 4800 : 6 = 800');
  });
});

describe('remainder in a context', () => {
  const questions = questionsOf('remainder');

  it('divides with a remainder within the ranges of its context', () => {
    for (const question of questions) {
      const [, , id = '', ask = '', totalText, divisorText] = question.key.split(':');
      const total = Number(totalText);
      const divisor = Number(divisorText);
      const context = contextOf(id, ask);
      const quotient = Math.floor(total / divisor);
      const rest = total % divisor;
      expect(divisor).toBeGreaterThanOrEqual(context.minDivisor);
      expect(divisor).toBeLessThanOrEqual(context.maxDivisor);
      expect(quotient).toBeGreaterThanOrEqual(MIN_QUOTIENT);
      expect(quotient).toBeLessThanOrEqual(MAX_QUOTIENT);
      expect(rest).toBeGreaterThanOrEqual(1);
      expect(total).toBeLessThanOrEqual(MAX_TOTAL);
      expect(stepOf(question).prompt).toBe(context.prompt(total, divisor));
      const answer = ask === 'up' ? quotient + 1 : ask === 'down' ? quotient : rest;
      expect(expectedOf(question)).toBe(String(answer));
    }
  });

  it('asks up, down and the rest about equally often', () => {
    for (const ask of ['up', 'down', 'rest']) {
      const count = questions.filter((question) => question.key.split(':')[3] === ask).length;
      expect(count, ask).toBeGreaterThan(250);
      expect(count, ask).toBeLessThan(420);
    }
  });

  it('rounds up for busjes, with tips for the remainder and the exact quotient', () => {
    const step = stepOf(remainderQuestion(contextOf('busjes', 'up'), 230, 8));
    expect(step.prompt).toBe(
      '230 leerlingen gaan met busjes van 8 plaatsen. Hoeveel busjes zijn er nodig?',
    );
    expect(step.suffix).toBe('busjes');
    expect(step.check('29')).toEqual({
      correct: true,
      expected: '29',
      explanation: '230 : 8 = 28 rest 6 → 29 busjes',
    });
    expect(step.check('28').tip).toBe(
      'Er blijven 6 leerlingen over; daarvoor is nog een busje nodig.',
    );
    expect(step.check('28,75').tip).toBe(
      'Je kunt geen 28,75 busjes nemen: het antwoord is een heel aantal.',
    );
    expect(step.check('3').tip).toBeUndefined();
  });

  it('rounds up for tafels', () => {
    const step = stepOf(remainderQuestion(contextOf('tafels', 'up'), 75, 6));
    expect(step.prompt).toBe('Aan een tafel passen 6 gasten. Hoeveel tafels zijn er nodig voor 75 gasten?');
    expect(step.check('13')).toMatchObject({ correct: true, explanation: '75 : 6 = 12 rest 3 → 13 tafels' });
    expect(step.check('12').tip).toBe('Er blijven 3 gasten over; daarvoor is nog een tafel nodig.');
    expect(step.check('12,5').tip).toBe(
      'Je kunt geen 12,5 tafels nemen: het antwoord is een heel aantal.',
    );
  });

  it('rounds down for full boxes and names the box that is not full', () => {
    const step = stepOf(remainderQuestion(contextOf('dozen', 'down'), 200, 12));
    expect(step.prompt).toBe(
      'In een doos passen 12 eieren. Hoeveel volle dozen maak je van 200 eieren?',
    );
    expect(step.suffix).toBe('dozen');
    expect(step.check('16')).toMatchObject({
      correct: true,
      explanation: '200 : 12 = 16 rest 8 → 16 dozen',
    });
    expect(step.check('17').tip).toBe('De laatste doos is niet vol: rond naar beneden af.');
    // 200 : 12 has no finite decimal, so there is no exact-quotient tip.
    expect(step.check('16,67').tip).toBeUndefined();
  });

  it('asks for the eggs left over', () => {
    const step = stepOf(remainderQuestion(contextOf('dozen', 'rest'), 200, 12));
    expect(step.prompt).toBe(
      'In een doos passen 12 eieren. Je vult zoveel mogelijk dozen met 200 eieren. Hoeveel eieren houd je over?',
    );
    expect(step.suffix).toBe('eieren');
    expect(step.check('8')).toMatchObject({
      correct: true,
      explanation: '200 = 16 × 12 + 8 → 8 eieren over',
    });
    expect(step.check('16').tip).toBe('Dat is het aantal dozen; gevraagd is wat je overhoudt.');
  });

  it('rounds down for tickets', () => {
    const step = stepOf(remainderQuestion(contextOf('kaartjes', 'down'), 100, 7));
    expect(step.prompt).toBe('Een kaartje kost €\u{a0}7. Hoeveel kaartjes koop je voor €\u{a0}100?');
    expect(step.check('14')).toMatchObject({ correct: true, explanation: '100 : 7 = 14 rest 2 → 14 kaartjes' });
    expect(step.check('15').tip).toBe(
      'Voor nog een kaartje is het geld niet genoeg: rond naar beneden af.',
    );
  });

  it('asks for the money left over in euros', () => {
    const step = stepOf(remainderQuestion(contextOf('kaartjes', 'rest'), 100, 7));
    expect(step.prompt).toBe(
      'Een kaartje kost €\u{a0}7. Je koopt zoveel mogelijk kaartjes voor €\u{a0}100. Hoeveel geld houd je over?',
    );
    expect(step.prefix).toBe('€');
    expect(step.suffix).toBeUndefined();
    expect(step.check('2')).toMatchObject({
      correct: true,
      explanation: '100 = 14 × 7 + 2 → €\u{a0}2 over',
    });
    expect(step.check('14').tip).toBe('Dat is het aantal kaartjes; gevraagd is wat je overhoudt.');
  });
});
```

Format the few test lines above that exceed 100 columns by hand (break the argument onto its own line) before committing.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/topics/mentalOperations.test.ts`
Expected: FAIL, cannot resolve `./mentalOperations`.

- [ ] **Step 3: Implement the generator**

Create `src/lib/topics/mentalOperations.ts`:

```ts
import { formatEuro, formatInteger as f, formatRational } from '../format';
import { drawUntil, pick, randomInt, randomIntWhere, type Rng } from '../random';
import { decimalPlaces, divide, equals, fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Diagnose } from '../tips';
import type { Question } from '../types';

// Mental operations with larger numbers (spec §5.15).
export const MENTAL_FORMS = ['addSubtract', 'multiply', 'divide', 'remainder'] as const;
export type MentalForm = (typeof MENTAL_FORMS)[number];

/** The larger term of add / subtract. */
export const MIN_TERM = 1000;
export const MAX_TERM = 99_999;
/** Largest product and largest dividend of the forms with zeros. */
export const MAX_PRODUCT = 1_000_000;
/** Significant parts of quotient and divisor: 2 to 12 without 10. */
export const DIVIDE_FACTORS: readonly number[] = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12];
/** smartCalculation (§5.9) splits a × 25, a × 50 and a × 125 with a not a multiple of 10. */
const SMART_FACTORS: readonly number[] = [25, 50, 125];

/** Remainder: the quotient q of total = q × divisor + rest, and the largest total. */
export const MIN_QUOTIENT = 3;
export const MAX_QUOTIENT = 40;
export const MAX_TOTAL = 1000;

function digitSum(value: number): number {
  let sum = 0;
  for (let rest = value; rest > 0; rest = Math.floor(rest / 10)) sum += rest % 10;
  return sum;
}

/** Whether a + b needs a carry: each carry lowers the digit sum of the result by 9. */
export function hasCarry(a: number, b: number): boolean {
  return digitSum(a) + digitSum(b) !== digitSum(a + b);
}

/** Whether smartCalculation (§5.9) also generates this product. */
export function isSmartProduct(x: number, y: number): boolean {
  const smart = (factor: number, other: number) =>
    SMART_FACTORS.includes(factor) && other % 10 !== 0;
  return smart(x, y) || smart(y, x);
}

/** A positive integer as significant × scale, with scale a power of ten: 7200 → 72 × 100. */
function stripZeros(value: number): { significant: number; scale: number } {
  let scale = 1;
  while ((value / scale) % 10 === 0) scale *= 10;
  return { significant: value / scale, scale };
}

/** `6347 + 2000 = 8347 → 8347 + 800 = 9147`: b in two steps, its largest part first. */
export function explainAddSubtract(a: number, b: number, add: boolean): string {
  const unit = 10 ** (String(b).length - 1);
  const high = Math.floor(b / unit) * unit;
  const low = b - high;
  const sign = add ? '+' : '−';
  const middle = add ? a + high : a - high;
  const answer = add ? middle + low : middle - low;
  return (
    `${f(a)} ${sign} ${f(high)} = ${f(middle)} → ` +
    `${f(middle)} ${sign} ${f(low)} = ${f(answer)}`
  );
}

/** `28 × 5 = 140 → 28 × 500 = 140 × 100 = 14 000`: the table fact, then the zeros. */
export function explainMultiply(first: number, second: number): string {
  const x = stripZeros(first);
  const y = stripZeros(second);
  const fact = x.significant * y.significant;
  return (
    `${f(x.significant)} × ${f(y.significant)} = ${f(fact)} → ` +
    `${f(first)} × ${f(second)} = ${f(fact)} × ${f(x.scale * y.scale)} = ${f(first * second)}`
  );
}

/** `7200 : 80 = 720 : 8 = 90`, or `48 : 6 = 8 → 4800 : 6 = 800` when the divisor has no zeros. */
export function explainDivide(dividend: number, divisor: number): string {
  const quotient = dividend / divisor;
  const sum = `${f(dividend)} : ${f(divisor)}`;
  const { significant, scale } = stripZeros(divisor);
  if (scale > 1) return `${sum} = ${f(dividend / scale)} : ${f(significant)} = ${f(quotient)}`;
  const shown = stripZeros(quotient);
  return (
    `${f(dividend / shown.scale)} : ${f(divisor)} = ${f(shown.significant)} → ` +
    `${sum} = ${f(quotient)}`
  );
}

function arithmetic(key: string, prompt: string, answer: number, explanation: string): Question {
  return {
    key: `mentalOperations:${key}`,
    topic: 'mentalOperations',
    steps: [numberStep({ prompt: `${prompt} = ?`, answer: fromInteger(answer), explanation })],
  };
}

/** `6347 + 2800`, `15 213 − 470`: with at least one carry or borrow. */
function addSubtract(rng: Rng): Question {
  const add = rng() < 0.5;
  const { a, b } = drawUntil(() => {
    const a = randomInt(rng, MIN_TERM, MAX_TERM);
    // Two significant digits, then one or two zeros: 2800, 470.
    const digits = randomIntWhere(rng, 11, 99, (value) => value % 10 !== 0);
    const b = digits * 10 ** randomInt(rng, 1, 2);
    // A borrow in a − b is a carry in (a − b) + b.
    const ok = add ? hasCarry(a, b) : a > b && hasCarry(a - b, b);
    return ok ? { a, b } : null;
  });
  const prompt = `${f(a)} ${add ? '+' : '−'} ${f(b)}`;
  return arithmetic(prompt, prompt, add ? a + b : a - b, explainAddSubtract(a, b, add));
}

/** `28 × 500`: p × 10ⁱ and q × 10ʲ with i + j ∈ [1, 4], in random order. */
function multiplyByZeros(rng: Rng): Question {
  const { first, second } = drawUntil(() => {
    const p = randomIntWhere(rng, 2, 99, (value) => value % 10 !== 0);
    const q = randomInt(rng, 2, 9);
    const zeros = randomInt(rng, 1, 4);
    const i = randomInt(rng, 0, zeros);
    const a = p * 10 ** i;
    const b = q * 10 ** (zeros - i);
    if (a * b > MAX_PRODUCT || isSmartProduct(a, b)) return null;
    return rng() < 0.5 ? { first: a, second: b } : { first: b, second: a };
  });
  const prompt = `${f(first)} × ${f(second)}`;
  // As in §5.9, `28 × 500` and `500 × 28` count as one calculation.
  const key = `${f(Math.min(first, second))} × ${f(Math.max(first, second))}`;
  return arithmetic(key, prompt, first * second, explainMultiply(first, second));
}

/** `7200 : 80`: quotient p × 10ⁱ and divisor q × 10ʲ, with i + j ∈ [1, 4]. */
function divideByZeros(rng: Rng): Question {
  const { dividend, divisor } = drawUntil(() => {
    const zeros = randomInt(rng, 1, 4);
    const i = randomInt(rng, 0, zeros);
    const quotient = pick(rng, DIVIDE_FACTORS) * 10 ** i;
    const divisor = pick(rng, DIVIDE_FACTORS) * 10 ** (zeros - i);
    const dividend = quotient * divisor;
    return dividend <= MAX_PRODUCT ? { dividend, divisor } : null;
  });
  const prompt = `${f(dividend)} : ${f(divisor)}`;
  return arithmetic(prompt, prompt, dividend / divisor, explainDivide(dividend, divisor));
}

/** What a remainder question asks: round up, round down, or the remainder itself. */
export type Ask = 'up' | 'down' | 'rest';
const ASKS: readonly Ask[] = ['up', 'down', 'rest'];

export interface RemainderContext {
  id: string;
  ask: Ask;
  minDivisor: number;
  maxDivisor: number;
  prompt: (total: number, divisor: number) => string;
  prefix?: string;
  suffix?: string;
  /** What the answer means, after the arrow of the explanation: '29 busjes'. */
  conclusion: (answer: number) => string;
  /** The tip for the typical mistake: q for up and rest, q + 1 for down (spec §3.4.1). */
  tip: (remainder: number) => string;
  /** Up and down only: the tip for the exact quotient, e.g. 28,75 busjes. */
  decimalTip?: (quotient: string) => string;
}

const euro = (value: number) => formatEuro(fromInteger(value));
const WHOLE = 'het antwoord is een heel aantal.';

/** The contexts of spec §5.15. A question picks its ask first, then one of these. */
export const REMAINDER_CONTEXTS: readonly RemainderContext[] = [
  {
    id: 'busjes',
    ask: 'up',
    minDivisor: 6,
    maxDivisor: 50,
    prompt: (n, d) =>
      `${f(n)} leerlingen gaan met busjes van ${d} plaatsen. Hoeveel busjes zijn er nodig?`,
    suffix: 'busjes',
    conclusion: (answer) => `${answer} busjes`,
    tip: (rest) => `Er blijven ${rest} leerlingen over; daarvoor is nog een busje nodig.`,
    decimalTip: (quotient) => `Je kunt geen ${quotient} busjes nemen: ${WHOLE}`,
  },
  {
    id: 'tafels',
    ask: 'up',
    minDivisor: 4,
    maxDivisor: 12,
    prompt: (n, d) =>
      `Aan een tafel passen ${d} gasten. Hoeveel tafels zijn er nodig voor ${f(n)} gasten?`,
    suffix: 'tafels',
    conclusion: (answer) => `${answer} tafels`,
    tip: (rest) => `Er blijven ${rest} gasten over; daarvoor is nog een tafel nodig.`,
    decimalTip: (quotient) => `Je kunt geen ${quotient} tafels nemen: ${WHOLE}`,
  },
  {
    id: 'dozen',
    ask: 'down',
    minDivisor: 6,
    maxDivisor: 30,
    prompt: (n, d) =>
      `In een doos passen ${d} eieren. Hoeveel volle dozen maak je van ${f(n)} eieren?`,
    suffix: 'dozen',
    conclusion: (answer) => `${answer} dozen`,
    tip: () => 'De laatste doos is niet vol: rond naar beneden af.',
    decimalTip: (quotient) => `Je kunt geen ${quotient} dozen vullen: ${WHOLE}`,
  },
  {
    id: 'dozen',
    ask: 'rest',
    minDivisor: 6,
    maxDivisor: 30,
    prompt: (n, d) =>
      `In een doos passen ${d} eieren. Je vult zoveel mogelijk dozen met ${f(n)} eieren. ` +
      'Hoeveel eieren houd je over?',
    suffix: 'eieren',
    conclusion: (answer) => `${answer} eieren over`,
    tip: () => 'Dat is het aantal dozen; gevraagd is wat je overhoudt.',
  },
  {
    id: 'kaartjes',
    ask: 'down',
    minDivisor: 3,
    maxDivisor: 25,
    prompt: (n, d) => `Een kaartje kost ${euro(d)}. Hoeveel kaartjes koop je voor ${euro(n)}?`,
    suffix: 'kaartjes',
    conclusion: (answer) => `${answer} kaartjes`,
    tip: () => 'Voor nog een kaartje is het geld niet genoeg: rond naar beneden af.',
    decimalTip: (quotient) => `Je kunt geen ${quotient} kaartjes kopen: ${WHOLE}`,
  },
  {
    id: 'kaartjes',
    ask: 'rest',
    minDivisor: 3,
    maxDivisor: 25,
    prompt: (n, d) =>
      `Een kaartje kost ${euro(d)}. Je koopt zoveel mogelijk kaartjes voor ${euro(n)}. ` +
      'Hoeveel geld houd je over?',
    prefix: '€',
    conclusion: (answer) => `${euro(answer)} over`,
    tip: () => 'Dat is het aantal kaartjes; gevraagd is wat je overhoudt.',
  },
];

function remainderTip(context: RemainderContext, total: number, divisor: number): Diagnose {
  const quotient = Math.floor(total / divisor);
  const mistaken = fromInteger(context.ask === 'down' ? quotient + 1 : quotient);
  const exact = divide(fromInteger(total), fromInteger(divisor));
  const { decimalTip } = context;
  return (given) => {
    if (equals(given, mistaken)) return context.tip(total % divisor);
    if (decimalTip && decimalPlaces(exact) !== null && equals(given, exact)) {
      return decimalTip(formatRational(exact));
    }
    return undefined;
  };
}

/** total = q × divisor + rest, asked in a context (spec §5.15). */
export function remainderQuestion(
  context: RemainderContext,
  total: number,
  divisor: number,
): Question {
  const quotient = Math.floor(total / divisor);
  const rest = total % divisor;
  const answer = context.ask === 'up' ? quotient + 1 : context.ask === 'down' ? quotient : rest;
  const conclusion = context.conclusion(answer);
  const explanation =
    context.ask === 'rest'
      ? `${f(total)} = ${quotient} × ${divisor} + ${rest} → ${conclusion}`
      : `${f(total)} : ${divisor} = ${quotient} rest ${rest} → ${conclusion}`;
  return {
    key: `mentalOperations:remainder:${context.id}:${context.ask}:${total}:${divisor}`,
    topic: 'mentalOperations',
    steps: [
      numberStep({
        prompt: context.prompt(total, divisor),
        answer: fromInteger(answer),
        prefix: context.prefix,
        suffix: context.suffix,
        explanation,
        diagnose: remainderTip(context, total, divisor),
      }),
    ],
  };
}

function remainder(rng: Rng): Question {
  const ask = pick(rng, ASKS);
  const context = pick(
    rng,
    REMAINDER_CONTEXTS.filter((candidate) => candidate.ask === ask),
  );
  const { total, divisor } = drawUntil(() => {
    const divisor = randomInt(rng, context.minDivisor, context.maxDivisor);
    const quotient = randomInt(rng, MIN_QUOTIENT, MAX_QUOTIENT);
    const total = quotient * divisor + randomInt(rng, 1, divisor - 1);
    return total <= MAX_TOTAL ? { total, divisor } : null;
  });
  return remainderQuestion(context, total, divisor);
}

const BUILDERS: Record<MentalForm, (rng: Rng) => Question> = {
  addSubtract,
  multiply: multiplyByZeros,
  divide: divideByZeros,
  remainder,
};

/** One question of the given form. */
export function buildMentalOperation(rng: Rng, form: MentalForm): Question {
  return BUILDERS[form](rng);
}

/** One of four forms, each equally likely (spec §5.15). */
export function generateMentalOperations(rng: Rng): Question {
  return buildMentalOperation(rng, pick(rng, MENTAL_FORMS));
}
```

- [ ] **Step 4: Register the topic**

In `src/lib/types.ts`, add `| 'mentalOperations'` as the last member of `Topic` (after `'properties'`).

In `src/lib/topics/index.ts`:
- add `import { generateMentalOperations } from './mentalOperations';` (alphabetical, after the `measurement` import)
- add `mentalOperations: generateMentalOperations,` as the last entry of `GENERATORS`
- add `mentalOperations: 'Hoofdrekenen met grote getallen (ook delen met rest)',` as the last entry of `TOPIC_LABELS`

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/lib/topics/mentalOperations.test.ts` then `npm test` and `npm run check`
Expected: all PASS; check 0 errors, 0 warnings.

- [ ] **Step 6: Commit**

```bash
git diff src/lib/types.ts src/lib/topics/index.ts
git add src/lib/topics/mentalOperations.ts src/lib/topics/mentalOperations.test.ts src/lib/types.ts src/lib/topics/index.ts
git commit -m "feat: mental operations with larger numbers and remainders in context" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: `negativeNumbers` (spec §5.16)

**Files:**
- Create: `src/lib/topics/negativeNumbers.ts`
- Create: `src/lib/topics/negativeNumbers.test.ts`
- Modify: `src/lib/types.ts` (`Topic`), `src/lib/topics/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/topics/negativeNumbers.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { evaluate } from '../expr/evaluate';
import { parse } from '../expr/parser';
import { createRng } from '../random';
import { parseDutchNumber } from '../rational';
import type { Question, Step } from '../types';
import {
  addSubtractQuestion,
  buildNegativeNumbers,
  changeQuestion,
  differenceQuestion,
  explainAddSubtract,
  explainSigns,
  generateNegativeNumbers,
  MAX_CHANGE,
  MAX_DAY,
  MAX_FACTOR,
  MAX_NIGHT,
  MAX_RESULT,
  MAX_START,
  MAX_TERM,
  MIN_CHANGE,
  MIN_DAY,
  MIN_FACTOR,
  MIN_NIGHT,
  MIN_RESULT,
  MIN_START,
  multiplyDivideQuestion,
  NEGATIVE_FORMS,
  type NegativeForm,
  PRODUCT_SIGN_TIP,
  SIGN_TIP,
} from './negativeNumbers';

const PER_FORM = 1000;

function questionsOf(form: NegativeForm): Question[] {
  const rng = createRng(300 + NEGATIVE_FORMS.indexOf(form));
  return Array.from({ length: PER_FORM }, () => buildNegativeNumbers(rng, form));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

function sumOf(question: Question): string {
  return stepOf(question).prompt.slice(0, -' = ?'.length);
}

function expectedValue(question: Question): number {
  return Number(parseDutchNumber(stepOf(question).check('').expected)!.num);
}

/** '−6' or '(−6)' as a number. */
function literalValue(text: string): number {
  return Number(text.replace(/[()]/g, '').replace('−', '-'));
}

const CHANGE = /^Het is (−?\d+)\u{a0}°C\. Het wordt (\d+) graden (warmer|kouder)\. Hoeveel graden is het dan\?$/u;
const DIFFERENCE =
  /^'s Nachts is het (−?\d+)\u{a0}°C, overdag (−?\d+)\u{a0}°C\. Hoeveel graden is het verschil\?$/u;

describe('generateNegativeNumbers', () => {
  it('produces all three forms, each accepting its expected answer', () => {
    const rng = createRng(1);
    let temperatures = 0;
    for (let i = 0; i < 2000; i++) {
      const question = generateNegativeNumbers(rng);
      expect(question.topic).toBe('negativeNumbers');
      const step = stepOf(question);
      expect(step.check(step.check('').expected).correct, step.prompt).toBe(true);
      if (step.suffix !== undefined) temperatures++;
    }
    expect(temperatures).toBeGreaterThan(550);
    expect(temperatures).toBeLessThan(800);
  });
});

describe('add / subtract', () => {
  const questions = questionsOf('addSubtract');

  it('writes negative literals as in §5.8 and stays within ±20', () => {
    for (const question of questions) {
      const match = /^(−?\d+) ([+−]) (\(−\d+\)|\d+)$/.exec(sumOf(question));
      expect(match, sumOf(question)).not.toBeNull();
      const a = literalValue(match![1]!);
      const b = literalValue(match![3]!);
      for (const term of [a, b]) {
        expect(term).not.toBe(0);
        expect(Math.abs(term)).toBeLessThanOrEqual(MAX_TERM);
      }
      const answer = expectedValue(question);
      expect(answer).not.toBe(0);
      expect(a < 0 || b < 0 || answer < 0, sumOf(question)).toBe(true);
    }
  });

  it('expects the value of the sum', () => {
    for (const question of questions) {
      expect(parseDutchNumber(stepOf(question).check('').expected)).toEqual(
        evaluate(parse(sumOf(question))!),
      );
    }
  });

  it('turns a negative term around, splits at zero, or just adds', () => {
    expect(explainAddSubtract(-4, false, -6)).toBe('−4 − (−6) = −4 + 6 = 2');
    expect(explainAddSubtract(5, true, -8)).toBe('5 + (−8) = 5 − 8 = −3');
    expect(explainAddSubtract(3, false, 8)).toBe('3 − 8 = 3 − 3 − 5 = −5');
    expect(explainAddSubtract(-7, true, 12)).toBe('−7 + 12 = −7 + 7 + 5 = 5');
    expect(explainAddSubtract(-4, false, 6)).toBe('−4 − 6 = −10');
  });

  it('names minus a negative number, then a wrong sign', () => {
    const step = stepOf(addSubtractQuestion(-4, false, -6));
    expect(step.prompt).toBe('−4 − (−6) = ?');
    expect(step.check('-10').tip).toBe('Min een negatief getal is plus: −4 − (−6) = −4 + 6.');
    expect(step.check('-2').tip).toBe(SIGN_TIP);
    expect(step.check('7').tip).toBeUndefined();
  });
});

describe('multiply / divide', () => {
  const questions = questionsOf('multiplyDivide');

  it('multiplies or divides exactly with at least one negative number', () => {
    for (const question of questions) {
      const match = /^(−?\d+) ([×:]) (\(−\d+\)|\d+)$/.exec(sumOf(question));
      expect(match, sumOf(question)).not.toBeNull();
      const left = literalValue(match![1]!);
      const right = literalValue(match![3]!);
      expect(left < 0 || right < 0, sumOf(question)).toBe(true);
      const factors = match![2] === '×' ? [left, right] : [left / right, right];
      for (const factor of factors) {
        expect(Number.isInteger(factor), sumOf(question)).toBe(true);
        expect(Math.abs(factor)).toBeGreaterThanOrEqual(MIN_FACTOR);
        expect(Math.abs(factor)).toBeLessThanOrEqual(MAX_FACTOR);
      }
      expect(parseDutchNumber(stepOf(question).check('').expected)).toEqual(
        evaluate(parse(sumOf(question))!),
      );
    }
  });

  it('explains the sum without signs, then the sign rule', () => {
    expect(explainSigns(-6, '×', 4)).toBe('6 × 4 = 24; één negatief getal → −24');
    expect(explainSigns(-24, ':', -3)).toBe('24 : 3 = 8; twee negatieve getallen → 8');
  });

  it('names a wrong sign', () => {
    const product = stepOf(multiplyDivideQuestion(-6, '×', 4));
    expect(product.prompt).toBe('−6 × 4 = ?');
    expect(product.check('24').tip).toBe(PRODUCT_SIGN_TIP);
    const quotient = stepOf(multiplyDivideQuestion(-24, ':', -3));
    expect(quotient.prompt).toBe('−24 : (−3) = ?');
    expect(quotient.check('-8').tip).toBe(PRODUCT_SIGN_TIP);
  });
});

describe('temperature', () => {
  const questions = questionsOf('temperature');
  const changes = questions.filter((question) => CHANGE.test(stepOf(question).prompt));
  const differences = questions.filter((question) => DIFFERENCE.test(stepOf(question).prompt));

  it('asks a change or a difference, about equally often', () => {
    expect(changes.length + differences.length).toBe(PER_FORM);
    expect(changes.length).toBeGreaterThan(400);
    expect(changes.length).toBeLessThan(600);
  });

  it('keeps a change within the ranges, with the start or the result below zero', () => {
    for (const question of changes) {
      const [, startText = '', amountText, direction] = CHANGE.exec(stepOf(question).prompt)!;
      const start = literalValue(startText);
      const amount = Number(amountText);
      const result = start + (direction === 'warmer' ? amount : -amount);
      expect(start).toBeGreaterThanOrEqual(MIN_START);
      expect(start).toBeLessThanOrEqual(MAX_START);
      expect(amount).toBeGreaterThanOrEqual(MIN_CHANGE);
      expect(amount).toBeLessThanOrEqual(MAX_CHANGE);
      expect(result).toBeGreaterThanOrEqual(MIN_RESULT);
      expect(result).toBeLessThanOrEqual(MAX_RESULT);
      expect(start < 0 || result < 0).toBe(true);
      expect(expectedValue(question)).toBe(result);
      expect(stepOf(question).suffix).toBe('°C');
    }
  });

  it('keeps a difference within the ranges, with the night below zero', () => {
    for (const question of differences) {
      const [, nightText = '', dayText = ''] = DIFFERENCE.exec(stepOf(question).prompt)!;
      const night = literalValue(nightText);
      const day = literalValue(dayText);
      expect(night).toBeGreaterThanOrEqual(MIN_NIGHT);
      expect(night).toBeLessThanOrEqual(MAX_NIGHT);
      expect(day).toBeGreaterThanOrEqual(MIN_DAY);
      expect(day).toBeLessThanOrEqual(MAX_DAY);
      expect(night).toBeLessThan(day);
      expect(night).toBeLessThan(0);
      expect(expectedValue(question)).toBe(day - night);
      expect(stepOf(question).suffix).toBe('graden');
    }
  });

  it('explains a change like a sum and names a wrong sign', () => {
    const step = stepOf(changeQuestion(-5, 8));
    expect(step.prompt).toBe(
      'Het is −5\u{a0}°C. Het wordt 8 graden warmer. Hoeveel graden is het dan?',
    );
    expect(step.check('3')).toMatchObject({
      correct: true,
      explanation: '−5 + 8 = −5 + 5 + 3 = 3',
    });
    expect(step.check('-3').tip).toBe(SIGN_TIP);
    expect(stepOf(changeQuestion(4, -9)).prompt).toBe(
      'Het is 4\u{a0}°C. Het wordt 9 graden kouder. Hoeveel graden is het dan?',
    );
  });

  it('explains a difference and names the steps to and from zero', () => {
    const step = stepOf(differenceQuestion(-7, 4));
    expect(step.prompt).toBe(
      "'s Nachts is het −7\u{a0}°C, overdag 4\u{a0}°C. Hoeveel graden is het verschil?",
    );
    expect(step.check('11')).toMatchObject({ correct: true, explanation: '4 − (−7) = 4 + 7 = 11' });
    expect(step.check('3').tip).toBe('Van −7 naar 0 is 7 graden, van 0 naar 4 nog 4: samen 11.');
    expect(step.check('5').tip).toBeUndefined();
  });

  it('names adding both when both are below zero', () => {
    const step = stepOf(differenceQuestion(-12, -3));
    expect(step.check('9').correct).toBe(true);
    expect(step.check('15').tip).toBe('Allebei onder nul: het verschil is 12 − 3 = 9.');
  });
});
```

Break the `CHANGE` regex line (over 100 columns) like the `DIFFERENCE` one.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/topics/negativeNumbers.test.ts`
Expected: FAIL, cannot resolve `./negativeNumbers`.

- [ ] **Step 3: Implement the generator**

Create `src/lib/topics/negativeNumbers.ts`:

```ts
import { formatInteger as f, NO_BREAK_SPACE } from '../format';
import { drawUntil, pick, randomInt, randomIntWhere, type Rng } from '../random';
import { equals, fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Diagnose } from '../tips';
import type { Question } from '../types';

// Negative numbers (spec §5.16).
export const NEGATIVE_FORMS = ['addSubtract', 'multiplyDivide', 'temperature'] as const;
export type NegativeForm = (typeof NEGATIVE_FORMS)[number];

/** |a| and |b| of add / subtract. */
export const MAX_TERM = 20;
/** |x| and |y| of multiply / divide. */
export const MIN_FACTOR = 2;
export const MAX_FACTOR = 12;
/** Temperature change. */
export const MIN_START = -15;
export const MAX_START = 15;
export const MIN_CHANGE = 2;
export const MAX_CHANGE = 20;
export const MIN_RESULT = -20;
export const MAX_RESULT = 25;
/** Temperature difference. */
export const MIN_NIGHT = -20;
export const MAX_NIGHT = 5;
export const MIN_DAY = -10;
export const MAX_DAY = 30;

export const SIGN_TIP = 'Let op het teken van de uitkomst.';
export const PRODUCT_SIGN_TIP =
  'Twee negatieve getallen geven een positieve uitkomst, één negatief getal een negatieve.';

/** A literal in a sum (§5.8): a negative one in parentheses, except as the first term. */
export function literal(value: number, first = false): string {
  return value < 0 && !first ? `(${f(value)})` : f(value);
}

function sumText(a: number, add: boolean, b: number): string {
  return `${literal(a, true)} ${add ? '+' : '−'} ${literal(b)}`;
}

/**
 * The explanation of a ± b (spec §5.16): a negative b turned around (`−4 − (−6) = −4 + 6 = 2`),
 * a split at zero when the sum crosses it (`3 − 8 = 3 − 3 − 5 = −5`), otherwise the sum itself.
 */
export function explainAddSubtract(a: number, add: boolean, b: number): string {
  const sum = sumText(a, add, b);
  const answer = add ? a + b : a - b;
  if (b < 0) return `${sum} = ${f(a)} ${add ? '−' : '+'} ${f(-b)} = ${f(answer)}`;
  const sign = add ? '+' : '−';
  const towardZero = add ? a < 0 : a > 0;
  if (towardZero && b > Math.abs(a)) {
    const toZero = Math.abs(a);
    return `${sum} = ${f(a)} ${sign} ${f(toZero)} ${sign} ${f(b - toZero)} = ${f(answer)}`;
  }
  return `${sum} = ${f(answer)}`;
}

/** Minus a negative number read as minus (spec §3.4.1), then a wrong sign. */
function addSubtractTip(a: number, add: boolean, b: number): Diagnose {
  const answer = add ? a + b : a - b;
  return (given) => {
    if (!add && b < 0 && equals(given, fromInteger(a + b))) {
      return `Min een negatief getal is plus: ${sumText(a, false, b)} = ${f(a)} + ${f(-b)}.`;
    }
    return equals(given, fromInteger(-answer)) ? SIGN_TIP : undefined;
  };
}

/** `−4 − (−6) = ?` */
export function addSubtractQuestion(a: number, add: boolean, b: number): Question {
  const prompt = sumText(a, add, b);
  return {
    key: `negativeNumbers:${prompt}`,
    topic: 'negativeNumbers',
    steps: [
      numberStep({
        prompt: `${prompt} = ?`,
        answer: fromInteger(add ? a + b : a - b),
        explanation: explainAddSubtract(a, add, b),
        diagnose: addSubtractTip(a, add, b),
      }),
    ],
  };
}

/** `6 × 4 = 24; één negatief getal → −24` (spec §5.16). */
export function explainSigns(left: number, operator: '×' | ':', right: number): string {
  const answer = operator === '×' ? left * right : left / right;
  const negatives = [left, right].filter((value) => value < 0).length;
  const rule = negatives === 1 ? 'één negatief getal' : 'twee negatieve getallen';
  const unsigned = `${f(Math.abs(left))} ${operator} ${f(Math.abs(right))} = ${f(Math.abs(answer))}`;
  return `${unsigned}; ${rule} → ${f(answer)}`;
}

/** `−6 × 4 = ?` or `−24 : (−3) = ?`; a division is always exact. */
export function multiplyDivideQuestion(left: number, operator: '×' | ':', right: number): Question {
  const answer = operator === '×' ? left * right : left / right;
  const prompt = `${literal(left, true)} ${operator} ${literal(right)}`;
  return {
    key: `negativeNumbers:${prompt}`,
    topic: 'negativeNumbers',
    steps: [
      numberStep({
        prompt: `${prompt} = ?`,
        answer: fromInteger(answer),
        explanation: explainSigns(left, operator, right),
        diagnose: (given) => (equals(given, fromInteger(-answer)) ? PRODUCT_SIGN_TIP : undefined),
      }),
    ],
  };
}

const degrees = (value: number) => `${f(value)}${NO_BREAK_SPACE}°C`;

/** `Het is −5 °C. Het wordt 8 graden warmer. Hoeveel graden is het dan?` (change > 0: warmer) */
export function changeQuestion(start: number, change: number): Question {
  const warmer = change > 0;
  const result = start + change;
  const direction = warmer ? 'warmer' : 'kouder';
  return {
    key: `negativeNumbers:change:${start}:${change}`,
    topic: 'negativeNumbers',
    steps: [
      numberStep({
        prompt:
          `Het is ${degrees(start)}. Het wordt ${Math.abs(change)} graden ${direction}. ` +
          'Hoeveel graden is het dan?',
        answer: fromInteger(result),
        suffix: '°C',
        explanation: explainAddSubtract(start, warmer, Math.abs(change)),
        diagnose: (given) =>
          result !== 0 && equals(given, fromInteger(-result)) ? SIGN_TIP : undefined,
      }),
    ],
  };
}

/** The difference of the absolute values when one is below zero, their sum when both are. */
function differenceTip(night: number, day: number): Diagnose {
  return (given) => {
    if (day > 0 && equals(given, fromInteger(Math.abs(day + night)))) {
      return (
        `Van ${f(night)} naar 0 is ${f(-night)} graden, van 0 naar ${f(day)} nog ${f(day)}: ` +
        `samen ${f(day - night)}.`
      );
    }
    if (day < 0 && equals(given, fromInteger(-day - night))) {
      return `Allebei onder nul: het verschil is ${f(-night)} − ${f(-day)} = ${f(day - night)}.`;
    }
    return undefined;
  };
}

/** `'s Nachts is het −7 °C, overdag 4 °C. Hoeveel graden is het verschil?` */
export function differenceQuestion(night: number, day: number): Question {
  return {
    key: `negativeNumbers:difference:${night}:${day}`,
    topic: 'negativeNumbers',
    steps: [
      numberStep({
        prompt:
          `'s Nachts is het ${degrees(night)}, overdag ${degrees(day)}. ` +
          'Hoeveel graden is het verschil?',
        answer: fromInteger(day - night),
        suffix: 'graden',
        explanation: explainAddSubtract(day, false, night),
        diagnose: differenceTip(night, day),
      }),
    ],
  };
}

const nonZeroTerm = (rng: Rng) =>
  randomIntWhere(rng, -MAX_TERM, MAX_TERM, (value) => value !== 0);
const withSign = (rng: Rng, value: number) => (rng() < 0.5 ? -value : value);

function addSubtract(rng: Rng): Question {
  const { a, add, b } = drawUntil(() => {
    const a = nonZeroTerm(rng);
    const b = nonZeroTerm(rng);
    const add = rng() < 0.5;
    const answer = add ? a + b : a - b;
    // Not 0, and not a sum of positive numbers only (5 + 7).
    return answer !== 0 && (a < 0 || b < 0 || answer < 0) ? { a, add, b } : null;
  });
  return addSubtractQuestion(a, add, b);
}

function multiplyDivide(rng: Rng): Question {
  const { x, y } = drawUntil(() => {
    const x = withSign(rng, randomInt(rng, MIN_FACTOR, MAX_FACTOR));
    const y = withSign(rng, randomInt(rng, MIN_FACTOR, MAX_FACTOR));
    return x < 0 || y < 0 ? { x, y } : null;
  });
  return rng() < 0.5 ? multiplyDivideQuestion(x, '×', y) : multiplyDivideQuestion(x * y, ':', y);
}

function temperature(rng: Rng): Question {
  if (rng() < 0.5) {
    const { start, change } = drawUntil(() => {
      const start = randomInt(rng, MIN_START, MAX_START);
      const change = withSign(rng, randomInt(rng, MIN_CHANGE, MAX_CHANGE));
      const result = start + change;
      const inRange = result >= MIN_RESULT && result <= MAX_RESULT;
      return inRange && (start < 0 || result < 0) ? { start, change } : null;
    });
    return changeQuestion(start, change);
  }
  const { night, day } = drawUntil(() => {
    const night = randomInt(rng, MIN_NIGHT, MAX_NIGHT);
    const day = randomInt(rng, MIN_DAY, MAX_DAY);
    // With night < day, a night below zero puts at least one of them below zero.
    return night < day && night < 0 ? { night, day } : null;
  });
  return differenceQuestion(night, day);
}

const BUILDERS: Record<NegativeForm, (rng: Rng) => Question> = {
  addSubtract,
  multiplyDivide,
  temperature,
};

/** One question of the given form. */
export function buildNegativeNumbers(rng: Rng, form: NegativeForm): Question {
  return BUILDERS[form](rng);
}

/** One of three forms, each equally likely (spec §5.16). */
export function generateNegativeNumbers(rng: Rng): Question {
  return buildNegativeNumbers(rng, pick(rng, NEGATIVE_FORMS));
}
```

- [ ] **Step 4: Register the topic**

In `src/lib/types.ts`, add `| 'negativeNumbers'` as the last member of `Topic`.

In `src/lib/topics/index.ts`:
- add `import { generateNegativeNumbers } from './negativeNumbers';` (after the `mentalOperations` import)
- add `negativeNumbers: generateNegativeNumbers,` as the last entry of `GENERATORS`
- add `negativeNumbers: 'Negatieve getallen (ook temperatuur)',` as the last entry of `TOPIC_LABELS`

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/lib/topics/negativeNumbers.test.ts` then `npm test` and `npm run check`
Expected: all PASS; check 0 errors, 0 warnings.

- [ ] **Step 6: Commit**

```bash
git diff src/lib/types.ts src/lib/topics/index.ts
git add src/lib/topics/negativeNumbers.ts src/lib/topics/negativeNumbers.test.ts src/lib/types.ts src/lib/topics/index.ts
git commit -m "feat: negative numbers with sums, products and temperatures" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: `rounding` (spec §5.17)

**Files:**
- Create: `src/lib/topics/rounding.ts`
- Create: `src/lib/topics/rounding.test.ts`
- Modify: `src/lib/types.ts` (`Topic`), `src/lib/topics/index.ts`

A source number is kept as an integer `scaled` with `decimals` decimals (3,746 is `3746` with 3), so all rounding is integer arithmetic. Rounding to place exponent `e` means rounding `scaled` to a multiple of `10^k` with `k = e + decimals` (always ≥ 1).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/topics/rounding.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { GROUP_SEPARATOR } from '../format';
import { createRng } from '../random';
import {
  compare,
  divide,
  multiply,
  parseDutchNumber,
  powerOfTen,
  rational,
  type Rational,
} from '../rational';
import type { Question, Step } from '../types';
import {
  buildRounding,
  CARRY_SHARE,
  digitAt,
  FIVE_SHARE,
  formatFixed,
  generateRounding,
  PLACES,
  roundHalfUp,
  roundingQuestion,
} from './rounding';

const PER_PLACE = 1000;
const PROMPT = /^Rond (.+) af op (.+)$/;

function questionsOf(index: number): Question[] {
  const rng = createRng(400 + index);
  return Array.from({ length: PER_PLACE }, () => buildRounding(rng, PLACES[index]!));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

/** Text as typed on the keypad: no digit grouping. */
function plain(text: string): string {
  return text.replaceAll(GROUP_SEPARATOR, '');
}

function sourceText(question: Question): string {
  return PROMPT.exec(stepOf(question).prompt)![1]!;
}

function expectedText(question: Question): string {
  return stepOf(question).check('').expected;
}

/** Independent half-up rounding with rationals: floor(value / 10^e + 1/2) × 10^e. */
function halfUp(value: Rational, exponent: number): Rational {
  const unit = powerOfTen(exponent);
  const quotient = divide(value, unit);
  // BigInt division truncates, which floors for positive values.
  const floored = (2n * quotient.num + quotient.den) / (2n * quotient.den);
  return multiply(rational(floored), unit);
}

/** The digit of a positive value at 10^position, also for negative positions. */
function digitOf(value: Rational, position: number): bigint {
  const shifted = divide(value, powerOfTen(position));
  return (shifted.num / shifted.den) % 10n;
}

const decimalsOf = (text: string) => (text.split(',')[1] ?? '').length;

describe('PLACES', () => {
  it('lists the seven places of the spec', () => {
    expect(PLACES.map((place) => [place.label, place.exponent])).toEqual([
      ['tientallen', 1],
      ['honderdtallen', 2],
      ['duizendtallen', 3],
      ['miljoenen', 6],
      ['een heel getal', 0],
      ['1 decimaal', -1],
      ['2 decimalen', -2],
    ]);
  });
});

describe('generateRounding', () => {
  it('uses every place and accepts its expected answer', () => {
    const rng = createRng(1);
    const labels = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const question = generateRounding(rng);
      expect(question.topic).toBe('rounding');
      labels.add(PROMPT.exec(stepOf(question).prompt)![2]!);
      expect(stepOf(question).check(plain(expectedText(question))).correct).toBe(true);
    }
    expect(labels.size).toBe(PLACES.length);
  });
});

describe.each(PLACES.map((place, index) => [place.label, index] as const))(
  'rounding on %s',
  (label, index) => {
    const place = PLACES[index]!;
    const questions = questionsOf(index);

    it('draws a source in range that is not rounded yet', () => {
      for (const question of questions) {
        expect(PROMPT.exec(stepOf(question).prompt)![2]).toBe(label);
        const text = plain(sourceText(question));
        const source = parseDutchNumber(text)!;
        if (place.exponent > 0) {
          expect(decimalsOf(text)).toBe(0);
          expect(compare(source, rational(BigInt(place.min)))).toBeGreaterThanOrEqual(0);
          expect(compare(source, rational(BigInt(place.max)))).toBeLessThanOrEqual(0);
        } else {
          expect(place.decimals).toContain(decimalsOf(text));
          expect(compare(source, rational(0n))).toBe(1);
          expect(compare(source, rational(BigInt(place.max)))).toBe(-1);
        }
        expect(divide(source, powerOfTen(place.exponent)).den, text).not.toBe(1n);
      }
    });

    it('expects half-up rounding with the asked number of decimals', () => {
      for (const question of questions) {
        const source = parseDutchNumber(plain(sourceText(question)))!;
        const expected = expectedText(question);
        const rounded = halfUp(source, place.exponent);
        expect(parseDutchNumber(plain(expected)), sourceText(question)).toEqual(rounded);
        expect(compare(rounded, rational(0n))).toBe(1);
        expect(decimalsOf(expected)).toBe(Math.max(0, -place.exponent));
      }
    });
  },
);

describe('edge cases', () => {
  const all = PLACES.flatMap((_, index) => questionsOf(index));
  const sources = all.map((question) => ({
    question,
    source: parseDutchNumber(plain(sourceText(question)))!,
    place: PLACES.find((place) => stepOf(question).prompt.endsWith(` op ${place.label}`))!,
  }));

  it('has a 5 as the first dropped digit in at least the 5-share', () => {
    const fives = sources.filter(
      ({ source, place }) => digitOf(source, place.exponent - 1) === 5n,
    ).length;
    expect(fives / all.length).toBeGreaterThan(FIVE_SHARE);
    // The other draws also hit a 5 about one time in ten.
    expect(fives / all.length).toBeLessThan(0.4);
  });

  it('carries over a 9 in at least the carry share', () => {
    const carries = sources.filter(
      ({ source, place }) =>
        digitOf(source, place.exponent) === 9n && digitOf(source, place.exponent - 1) >= 5n,
    ).length;
    expect(carries / all.length).toBeGreaterThan(CARRY_SHARE);
  });
});

describe('roundingQuestion', () => {
  const hundreds = PLACES[1]!;
  const millions = PLACES[3]!;
  const whole = PLACES[4]!;
  const oneDecimal = PLACES[5]!;

  it('explains with the neighbours and the decisive digit', () => {
    const step = stepOf(roundingQuestion(hundreds, 0, 4386));
    expect(step.prompt).toBe('Rond 4386 af op honderdtallen');
    expect(step.check('4400')).toEqual({
      correct: true,
      expected: '4400',
      explanation: '4386 ligt tussen 4300 en 4400; het eerste cijfer dat wegvalt is 8 → 4400',
    });
  });

  it('names rounding the wrong way and rounding on a neighbouring place', () => {
    const step = stepOf(roundingQuestion(hundreds, 0, 4386));
    expect(step.check('4300').tip).toBe(
      'Het eerste cijfer dat wegvalt is 8 (5 of meer): rond naar boven af.',
    );
    expect(step.check('4390').tip).toBe('Dat is afgerond op tientallen; gevraagd is honderdtallen.');
    expect(step.check('4000').tip).toBe(
      'Dat is afgerond op duizendtallen; gevraagd is honderdtallen.',
    );
    expect(step.check('44').tip).toBe(
      'Je antwoord is 100 keer te klein. Let op de komma en het aantal nullen.',
    );
  });

  it('rounds to decimals, with tips for the neighbouring places', () => {
    const step = stepOf(roundingQuestion(oneDecimal, 3, 3746));
    expect(step.prompt).toBe('Rond 3,746 af op 1 decimaal');
    expect(step.check('3,7')).toMatchObject({
      correct: true,
      explanation: '3,746 ligt tussen 3,7 en 3,8; het eerste cijfer dat wegvalt is 4 → 3,7',
    });
    expect(step.check('3,8').tip).toBe(
      'Het eerste cijfer dat wegvalt is 4 (minder dan 5): rond naar beneden af.',
    );
    expect(step.check('3,75').tip).toBe('Dat is afgerond op 2 decimalen; gevraagd is 1 decimaal.');
    expect(step.check('4').tip).toBe('Dat is afgerond op een heel getal; gevraagd is 1 decimaal.');
  });

  it('shows the asked decimals but accepts any equal value', () => {
    const step = stepOf(roundingQuestion(oneDecimal, 2, 296));
    expect(step.check('3')).toMatchObject({ correct: true, expected: '3,0' });
    expect(step.check('3,0').correct).toBe(true);
    expect(stepOf(roundingQuestion(whole, 1, 125)).check('13').correct).toBe(true);
  });

  it('never calls the unrounded source a neighbouring place', () => {
    // 12,5 has one decimal: "afgerond op 1 decimaal" would not be true.
    expect(stepOf(roundingQuestion(whole, 1, 125)).check('12,5').tip).toBeUndefined();
  });

  it('writes large numbers in full', () => {
    const step = stepOf(roundingQuestion(millions, 0, 2_456_789));
    expect(step.prompt).toBe('Rond 2\u{202f}456\u{202f}789 af op miljoenen');
    expect(step.check('2000000')).toMatchObject({
      correct: true,
      expected: '2\u{202f}000\u{202f}000',
    });
    // Millions have no neighbouring place in the spec.
    expect(step.check('2500000').tip).toBeUndefined();
  });
});

describe('helpers', () => {
  it('reads digits and rounds half up', () => {
    expect(digitAt(4386, 1)).toBe(8);
    expect(digitAt(4386, 3)).toBe(4);
    expect(roundHalfUp(4386, 2)).toBe(4400);
    expect(roundHalfUp(4349, 2)).toBe(4300);
    expect(roundHalfUp(4350, 2)).toBe(4400);
    expect(roundHalfUp(3970, 2)).toBe(4000);
  });

  it('formats with a fixed number of decimals', () => {
    expect(formatFixed(rational(3n), 1)).toBe('3,0');
    expect(formatFixed(rational(39n, 100n), 2)).toBe('0,39');
    expect(formatFixed(rational(37n, 10n), 1)).toBe('3,7');
    expect(formatFixed(rational(2_000_000n), 0)).toBe('2\u{202f}000\u{202f}000');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/topics/rounding.test.ts`
Expected: FAIL, cannot resolve `./rounding`.

- [ ] **Step 3: Implement the generator**

Create `src/lib/topics/rounding.ts`:

```ts
import { formatRational } from '../format';
import { drawUntil, pick, randomInt, type Rng } from '../random';
import { equals, rational, type Rational } from '../rational';
import { numberStep } from '../steps';
import type { Diagnose } from '../tips';
import type { Question } from '../types';

// Rounding, half up (spec §5.17).
export interface Place {
  /** Dutch, after 'op': 'honderdtallen', '1 decimaal'. */
  label: string;
  /** The place as a power of ten: 2 for hundreds, −1 for one decimal. */
  exponent: number;
  /** The source has one of these numbers of decimals. */
  decimals: readonly number[];
  /** Whole places: the inclusive source range. Decimal places: the source lies in (0, max). */
  min: number;
  max: number;
  /** Neighbouring places of one group get the wrong-place tip (spec §3.4.1). */
  group?: 'integer' | 'decimal';
}

export const PLACES: readonly Place[] = [
  { label: 'tientallen', exponent: 1, decimals: [0], min: 101, max: 9999, group: 'integer' },
  {
    label: 'honderdtallen',
    exponent: 2,
    decimals: [0],
    min: 1001,
    max: 99_999,
    group: 'integer',
  },
  {
    label: 'duizendtallen',
    exponent: 3,
    decimals: [0],
    min: 10_001,
    max: 999_999,
    group: 'integer',
  },
  { label: 'miljoenen', exponent: 6, decimals: [0], min: 1_000_001, max: 99_999_999 },
  { label: 'een heel getal', exponent: 0, decimals: [1, 2], min: 0, max: 1000, group: 'decimal' },
  { label: '1 decimaal', exponent: -1, decimals: [2, 3], min: 0, max: 100, group: 'decimal' },
  { label: '2 decimalen', exponent: -2, decimals: [3], min: 0, max: 100, group: 'decimal' },
];

/** Share of exercises whose first dropped digit is 5, the edge case of the rule. */
export const FIVE_SHARE = 0.2;
/** Share of exercises where rounding up carries over a 9: 3970 → 4000 on hundreds. */
export const CARRY_SHARE = 0.15;

/** The digit of a non-negative integer at 10^position. */
export function digitAt(value: number, position: number): number {
  return Math.floor(value / 10 ** position) % 10;
}

/** `scaled` rounded half up to a multiple of 10^k. */
export function roundHalfUp(scaled: number, k: number): number {
  const unit = 10 ** k;
  const lower = Math.floor(scaled / unit) * unit;
  return digitAt(scaled, k - 1) >= 5 ? lower + unit : lower;
}

function toValue(scaled: number, decimals: number): Rational {
  return rational(BigInt(scaled), 10n ** BigInt(decimals));
}

/** Dutch notation with exactly `decimals` decimals: 3 → '3,0' for one decimal. */
export function formatFixed(value: Rational, decimals: number): string {
  const text = formatRational(value);
  if (decimals === 0) return text;
  const [whole = '', fraction = ''] = text.split(',');
  return `${whole},${fraction.padEnd(decimals, '0')}`;
}

/** The facts of rounding `scaled` (with `decimals` decimals) on `place`. */
function roundingFacts(place: Place, decimals: number, scaled: number) {
  const k = place.exponent + decimals;
  const unit = 10 ** k;
  const lower = Math.floor(scaled / unit) * unit;
  const decisive = digitAt(scaled, k - 1);
  const up = decisive >= 5;
  return { lower, upper: lower + unit, decisive, up, rounded: up ? lower + unit : lower };
}

/**
 * Rounded the wrong way, or on a neighbouring place of the same group (spec §3.4.1). A finer
 * place that would leave the source unrounded (`k ≤ 0`) is not a neighbour.
 */
function roundingTip(place: Place, decimals: number, scaled: number): Diagnose {
  const { lower, upper, decisive, up, rounded } = roundingFacts(place, decimals, scaled);
  const neighbours = PLACES.filter(
    (other) =>
      place.group !== undefined &&
      other.group === place.group &&
      Math.abs(other.exponent - place.exponent) === 1 &&
      other.exponent + decimals >= 1,
  );
  return (given) => {
    if (up && equals(given, toValue(lower, decimals))) {
      return `Het eerste cijfer dat wegvalt is ${decisive} (5 of meer): rond naar boven af.`;
    }
    if (!up && equals(given, toValue(upper, decimals))) {
      return `Het eerste cijfer dat wegvalt is ${decisive} (minder dan 5): rond naar beneden af.`;
    }
    for (const other of neighbours) {
      const value = roundHalfUp(scaled, other.exponent + decimals);
      if (value !== rounded && equals(given, toValue(value, decimals))) {
        return `Dat is afgerond op ${other.label}; gevraagd is ${place.label}.`;
      }
    }
    return undefined;
  };
}

/** `Rond 4386 af op honderdtallen`; the source has exactly `decimals` decimals. */
export function roundingQuestion(place: Place, decimals: number, scaled: number): Question {
  const { lower, upper, decisive, rounded } = roundingFacts(place, decimals, scaled);
  const shown = (value: number) =>
    formatFixed(toValue(value, decimals), Math.max(0, -place.exponent));
  const source = formatRational(toValue(scaled, decimals));
  return {
    key: `rounding:${place.label}:${source}`,
    topic: 'rounding',
    steps: [
      numberStep({
        prompt: `Rond ${source} af op ${place.label}`,
        answer: toValue(rounded, decimals),
        expected: shown(rounded),
        explanation:
          `${source} ligt tussen ${shown(lower)} en ${shown(upper)}; ` +
          `het eerste cijfer dat wegvalt is ${decisive} → ${shown(rounded)}`,
        diagnose: roundingTip(place, decimals, scaled),
      }),
    ],
  };
}

type Special = 'five' | 'carry' | 'any';

function pickSpecial(rng: Rng): Special {
  const draw = rng();
  if (draw < FIVE_SHARE) return 'five';
  return draw < FIVE_SHARE + CARRY_SHARE ? 'carry' : 'any';
}

/** One exercise on `place`, by rejection (spec §5.17). */
export function buildRounding(rng: Rng, place: Place): Question {
  const decimals = pick(rng, place.decimals);
  const k = place.exponent + decimals;
  const special = pickSpecial(rng);
  const min = decimals === 0 ? place.min : 1;
  const max = decimals === 0 ? place.max : place.max * 10 ** decimals - 1;
  const scaled = drawUntil(() => {
    const n = randomInt(rng, min, max);
    // Never rounded yet; a decimal source has exactly `decimals` decimals.
    if (n % 10 ** k === 0 || (decimals > 0 && n % 10 === 0)) return null;
    const decisive = digitAt(n, k - 1);
    if (special === 'five' && decisive !== 5) return null;
    if (special === 'carry' && (decisive < 5 || digitAt(n, k) !== 9)) return null;
    return roundHalfUp(n, k) === 0 ? null : n;
  });
  return roundingQuestion(place, decimals, scaled);
}

/** One of seven places, each equally likely (spec §5.17). */
export function generateRounding(rng: Rng): Question {
  return buildRounding(rng, pick(rng, PLACES));
}
```

- [ ] **Step 4: Register the topic**

In `src/lib/types.ts`, add `| 'rounding'` as the last member of `Topic`.

In `src/lib/topics/index.ts`:
- add `import { generateRounding } from './rounding';` (after the `ratios` import)
- add `rounding: generateRounding,` as the last entry of `GENERATORS`
- add `rounding: 'Afronden (tientallen t/m miljoenen, decimalen)',` as the last entry of `TOPIC_LABELS`

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/lib/topics/rounding.test.ts` then `npm test` and `npm run check`
Expected: all PASS; check 0 errors, 0 warnings.

- [ ] **Step 6: Commit**

```bash
git diff src/lib/types.ts src/lib/topics/index.ts
git add src/lib/topics/rounding.ts src/lib/topics/rounding.test.ts src/lib/types.ts src/lib/topics/index.ts
git commit -m "feat: rounding to tens up to millions and to decimals, half up" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: `powersRoots` (spec §5.18)

**Files:**
- Create: `src/lib/topics/powersRoots.ts`
- Create: `src/lib/topics/powersRoots.test.ts`
- Modify: `src/lib/types.ts` (`Topic`), `src/lib/topics/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/topics/powersRoots.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { evaluate } from '../expr/evaluate';
import { parse } from '../expr/parser';
import { GROUP_SEPARATOR, SUPERSCRIPT_DIGITS } from '../format';
import { createRng } from '../random';
import {
  compare,
  divide,
  fromInteger,
  multiply,
  parseDutchNumber,
  powerOfTen,
  rational,
} from '../rational';
import type { Question, Step } from '../types';
import {
  buildPowersRoots,
  cubeRootQuestion,
  DECIMAL_POWERS,
  decimalPowerQuestion,
  explainPower,
  generatePowersRoots,
  MAX_SMALL_EXPONENT_BASE,
  NEGATIVE_POWERS,
  NEGATIVE_SHARE,
  negativeExponentQuestion,
  POSITIVE_POWERS,
  POSITIVE_SHARE,
  POWER_FORMS,
  type PowerForm,
  squareRootQuestion,
  wholePowerQuestion,
} from './powersRoots';

const PER_FORM = 1000;

function questionsOf(form: PowerForm): Question[] {
  const rng = createRng(500 + POWER_FORMS.indexOf(form));
  return Array.from({ length: PER_FORM }, () => buildPowersRoots(rng, form));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

/** Text as typed on the keypad: no digit grouping. */
function plain(text: string): string {
  return text.replaceAll(GROUP_SEPARATOR, '');
}

function promptOf(question: Question): string {
  return stepOf(question).prompt;
}

function expectedValue(question: Question) {
  return parseDutchNumber(plain(stepOf(question).check('').expected))!;
}

function fromSuperscript(text: string): number {
  return Number([...text].map((char) => SUPERSCRIPT_DIGITS.indexOf(char)).join(''));
}

const hasPair = (list: readonly (readonly [number, number])[], base: number, exponent: number) =>
  list.some(([b, e]) => b === base && e === exponent);

describe('power lists', () => {
  it('has 23 positive pairs with exponent at least 3', () => {
    expect(POSITIVE_POWERS).toHaveLength(23);
    expect(POSITIVE_POWERS.every(([, exponent]) => exponent >= 3)).toBe(true);
  });

  it('has 10 negative pairs up to 125', () => {
    expect(NEGATIVE_POWERS).toHaveLength(10);
    expect(NEGATIVE_POWERS.every(([base, exponent]) => base ** exponent <= 125)).toBe(true);
  });
});

describe('generatePowersRoots', () => {
  it('produces all four forms, each accepting its expected answer', () => {
    const rng = createRng(1);
    const shapes = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const question = generatePowersRoots(rng);
      expect(question.topic).toBe('powersRoots');
      const step = stepOf(question);
      expect(step.check(plain(step.check('').expected)).correct, step.prompt).toBe(true);
      shapes.add(/^[√∛]/.test(step.prompt) ? 'root' : step.prompt.includes('10⁻') ? 'tenth' : '');
    }
    expect(shapes).toContain('root');
    expect(shapes).toContain('tenth');
  });
});

describe('whole-number powers', () => {
  const questions = questionsOf('wholePower');
  const POWER = /^(\(−\d+\)|\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+) = \?$/u;
  const parsed = questions.map((question) => {
    const match = POWER.exec(promptOf(question));
    expect(match, promptOf(question)).not.toBeNull();
    const base = Number(match![1]!.replace(/[()]/g, '').replace('−', '-'));
    return { question, base, exponent: fromSuperscript(match![2]!) };
  });

  it('draws from the pair lists or exponent 0 and 1', () => {
    for (const { base, exponent } of parsed) {
      if (exponent <= 1) {
        expect(base).toBeGreaterThanOrEqual(2);
        expect(base).toBeLessThanOrEqual(MAX_SMALL_EXPONENT_BASE);
      } else if (base < 0) {
        expect(hasPair(NEGATIVE_POWERS, -base, exponent), `${base}^${exponent}`).toBe(true);
      } else {
        expect(hasPair(POSITIVE_POWERS, base, exponent), `${base}^${exponent}`).toBe(true);
      }
    }
  });

  it('mixes positive bases, negative bases and exponents 0 and 1 by their shares', () => {
    const negative = parsed.filter(({ base }) => base < 0).length / PER_FORM;
    const small = parsed.filter(({ exponent }) => exponent <= 1).length / PER_FORM;
    expect(negative).toBeGreaterThan(NEGATIVE_SHARE - 0.05);
    expect(negative).toBeLessThan(NEGATIVE_SHARE + 0.05);
    expect(small).toBeGreaterThan(1 - POSITIVE_SHARE - NEGATIVE_SHARE - 0.04);
    expect(small).toBeLessThan(1 - POSITIVE_SHARE - NEGATIVE_SHARE + 0.04);
  });

  it('expects the value of the power', () => {
    for (const { question } of parsed) {
      expect(expectedValue(question)).toEqual(
        evaluate(parse(promptOf(question).slice(0, -' = ?'.length))!),
      );
    }
  });

  it('explains a power as repeated multiplication', () => {
    expect(explainPower(fromInteger(2), 5)).toBe('2⁵ = 2 × 2 × 2 × 2 × 2 = 32');
    expect(explainPower(fromInteger(-3), 3)).toBe('(−3)³ = (−3) × (−3) × (−3) = −27');
    expect(explainPower(fromInteger(7), 0)).toBe(
      '7⁰ = 1: elk getal (behalve 0) tot de macht 0 is 1',
    );
    expect(explainPower(fromInteger(7), 1)).toBe('7¹ = 7');
  });

  it('names base × exponent, exponent 0 and a wrong sign', () => {
    expect(stepOf(wholePowerQuestion(2, 5)).check('10').tip).toBe(
      'Een macht is herhaald vermenigvuldigen: 2⁵ = 2 × 2 × 2 × 2 × 2, niet 2 × 5.',
    );
    expect(stepOf(wholePowerQuestion(7, 0)).check('0').tip).toBe(
      'Elk getal (behalve 0) tot de macht 0 is 1.',
    );
    expect(stepOf(wholePowerQuestion(-3, 3)).check('27').tip).toBe(
      '(−3)³ = (−3) × (−3) × (−3): een oneven aantal mintekens geeft min.',
    );
    expect(stepOf(wholePowerQuestion(-2, 4)).check('-16').tip).toBe(
      '(−2)⁴ = (−2) × (−2) × (−2) × (−2): een even aantal mintekens geeft plus.',
    );
    // (−2)² = 4: −4 is both a wrong sign and base × exponent; the sign tip comes first.
    expect(stepOf(wholePowerQuestion(-2, 2)).check('-4').tip).toBe(
      '(−2)² = (−2) × (−2): een even aantal mintekens geeft plus.',
    );
  });
});

describe('decimal powers', () => {
  const questions = questionsOf('decimalPower');
  const allowed = DECIMAL_POWERS.flat();

  it('draws a base and exponent from the three groups, about equally often', () => {
    const perGroup = [0, 0, 0];
    for (const question of questions) {
      const match = /^(\d+,\d+)([²³]) = \?$/u.exec(promptOf(question));
      expect(match, promptOf(question)).not.toBeNull();
      const base = parseDutchNumber(match![1]!)!;
      const exponent = fromSuperscript(match![2]!);
      const group = DECIMAL_POWERS.findIndex((list) =>
        list.some(([b, e]) => e === exponent && b.num === base.num && b.den === base.den),
      );
      expect(group, promptOf(question)).toBeGreaterThanOrEqual(0);
      perGroup[group] = (perGroup[group] ?? 0) + 1;
      expect(expectedValue(question)).toEqual(
        evaluate(parse(promptOf(question).slice(0, -' = ?'.length))!),
      );
    }
    for (const count of perGroup) {
      expect(count).toBeGreaterThan(250);
      expect(count).toBeLessThan(420);
    }
    expect(allowed).toHaveLength(18 + 9 + 5);
  });

  it('explains and names too few decimals', () => {
    const step = stepOf(decimalPowerQuestion(rational(3n, 10n), 2));
    expect(step.check('0,09')).toMatchObject({
      correct: true,
      explanation: '0,3² = 0,3 × 0,3 = 0,09',
    });
    expect(step.check('0,9').tip).toBe(
      '0,3 × 0,3 = 0,09: de uitkomst heeft evenveel decimalen als beide getallen samen.',
    );
    expect(step.check('0,0009').tip).toBe(
      'Je antwoord is 100 keer te klein. Let op de komma en het aantal nullen.',
    );
    expect(stepOf(decimalPowerQuestion(rational(2n, 10n), 3)).check('0,08').tip).toBe(
      '0,2 × 0,2 × 0,2 = 0,008: de uitkomst heeft evenveel decimalen als alle getallen samen.',
    );
  });
});

describe('negative exponents', () => {
  const questions = questionsOf('negativeExponent');

  it('asks 10⁻ⁿ or the exponent of a decimal, for n from 1 to 6', () => {
    let exponentQuestions = 0;
    for (const question of questions) {
      const value = /^10⁻([¹²³⁴⁵⁶]) = \?$/u.exec(promptOf(question));
      const exponent = /^(0,0*1) = 10ⁿ\. n = \?$/u.exec(promptOf(question));
      expect(value ?? exponent, promptOf(question)).not.toBeNull();
      if (value) {
        expect(expectedValue(question)).toEqual(powerOfTen(-fromSuperscript(value[1]!)));
      } else {
        exponentQuestions++;
        const n = exponent![1]!.length - 2;
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(6);
        expect(expectedValue(question)).toEqual(fromInteger(-n));
      }
    }
    expect(exponentQuestions).toBeGreaterThan(400);
    expect(exponentQuestions).toBeLessThan(600);
  });

  it('explains 10⁻ⁿ as 1 : 10ⁿ and names a negative answer', () => {
    const step = stepOf(negativeExponentQuestion(3, false));
    expect(step.prompt).toBe('10⁻³ = ?');
    expect(step.check('0,001')).toMatchObject({
      correct: true,
      explanation: '10⁻³ = 1 : 10³ = 1 : 1000 = 0,001',
    });
    expect(step.check('-1000').tip).toBe(
      'Een negatieve exponent maakt geen negatief getal: 10⁻³ = 1 : 1000.',
    );
  });

  it('asks the exponent, with tips for the sign and for counting zeros', () => {
    const step = stepOf(negativeExponentQuestion(3, true));
    expect(step.prompt).toBe('0,001 = 10ⁿ. n = ?');
    expect(step.check('-3')).toMatchObject({
      correct: true,
      explanation: '0,001 = 1 : 1000 = 1 : 10³ = 10⁻³',
    });
    expect(step.check('3').tip).toBe('Een getal kleiner dan 1 heeft een negatieve exponent.');
    expect(step.check('-2').tip).toBe(
      'Tel de plaatsen waarover de komma schuift: 0,001 = 1 : 1000 = 10⁻³.',
    );
    // The answer is an exponent: no factor-of-ten tip.
    expect(step.check('-30').tip).toBeUndefined();
  });
});

describe('roots', () => {
  const questions = questionsOf('root');

  it('takes cube roots up to 10 and square roots of scaled squares', () => {
    let cubes = 0;
    for (const question of questions) {
      const cube = /^∛(\d+) = \?$/u.exec(promptOf(question));
      const square = /^√([\d,\u{202f}]+) = \?$/u.exec(promptOf(question));
      expect(cube ?? square, promptOf(question)).not.toBeNull();
      const root = expectedValue(question);
      if (cube) {
        cubes++;
        expect(root.den).toBe(1n);
        expect(root.num).toBeGreaterThanOrEqual(2n);
        expect(root.num).toBeLessThanOrEqual(10n);
        expect(root.num ** 3n).toBe(BigInt(cube[1]!));
      } else {
        expect(multiply(root, root)).toEqual(parseDutchNumber(plain(square![1]!)));
        // root = k : 10 (at most 1,5) or k × 10 (at least 20), with k ∈ [2, 15] \ {10}.
        const small = compare(root, fromInteger(2)) < 0;
        const k = small ? multiply(root, fromInteger(10)) : divide(root, fromInteger(10));
        expect(k.den, promptOf(question)).toBe(1n);
        expect(k.num).toBeGreaterThanOrEqual(2n);
        expect(k.num).toBeLessThanOrEqual(15n);
        expect(k.num).not.toBe(10n);
      }
    }
    expect(cubes).toBeGreaterThan(400);
    expect(cubes).toBeLessThan(600);
  });

  it('explains a cube root and names dividing by 3', () => {
    const step = stepOf(cubeRootQuestion(3));
    expect(step.prompt).toBe('∛27 = ?');
    expect(step.check('3')).toMatchObject({
      correct: true,
      explanation: '∛27 = 3, want 3 × 3 × 3 = 27',
    });
    expect(step.check('9').tip).toBe(
      '∛27 is het getal dat 3 keer met zichzelf vermenigvuldigd 27 geeft, niet 27 : 3.',
    );
  });

  it('explains a square root of a scaled square', () => {
    const step = stepOf(squareRootQuestion(rational(7n, 10n)));
    expect(step.prompt).toBe('√0,49 = ?');
    expect(step.check('0,7')).toMatchObject({
      correct: true,
      explanation: '√0,49 = 0,7, want 0,7 × 0,7 = 0,49',
    });
    expect(stepOf(squareRootQuestion(fromInteger(80))).prompt).toBe('√6400 = ?');
    expect(stepOf(squareRootQuestion(fromInteger(120))).prompt).toBe('√14\u{202f}400 = ?');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/topics/powersRoots.test.ts`
Expected: FAIL, cannot resolve `./powersRoots`.

- [ ] **Step 3: Implement the generator**

Create `src/lib/topics/powersRoots.ts`:

```ts
import { formatInteger as f, formatPowerOfTen, formatRational, toSuperscript } from '../format';
import { pick, randomInt, randomIntWhere, type Rng } from '../random';
import {
  divide,
  equals,
  fromInteger,
  multiply,
  negate,
  power,
  powerOfTen,
  rational,
  type Rational,
} from '../rational';
import { numberStep } from '../steps';
import { powerOfTenShift, type Diagnose } from '../tips';
import type { Question } from '../types';

// Powers and roots (spec §5.18). Squares of whole numbers 2 to 25 stay in `squares` (§5.7).
export const POWER_FORMS = ['wholePower', 'decimalPower', 'negativeExponent', 'root'] as const;
export type PowerForm = (typeof POWER_FORMS)[number];

type Pair = readonly [base: number, exponent: number];

function pairs(base: number, from: number, to: number): Pair[] {
  return Array.from({ length: to - from + 1 }, (_, index) => [base, from + index] as const);
}

/** Positive bases with exponent ≥ 3: 23 pairs, drawn uniformly. */
export const POSITIVE_POWERS: readonly Pair[] = [
  ...pairs(2, 3, 10),
  ...pairs(3, 3, 5),
  ...pairs(4, 3, 4),
  ...pairs(5, 3, 4),
  ...pairs(6, 3, 3),
  ...pairs(7, 3, 3),
  ...pairs(8, 3, 3),
  ...pairs(9, 3, 3),
  ...pairs(10, 3, 6),
];

/** Bases b of (−b)ⁿ with bⁿ ≤ 125: 10 pairs, from (−2)² to (−5)³. */
export const NEGATIVE_POWERS: readonly Pair[] = [
  ...pairs(2, 2, 4),
  ...pairs(3, 2, 4),
  ...pairs(4, 2, 3),
  ...pairs(5, 2, 3),
];

export const POSITIVE_SHARE = 0.7;
export const NEGATIVE_SHARE = 0.2;
/** The remaining 10% has exponent 0 or 1, with a base from 2 to this. */
export const MAX_SMALL_EXPONENT_BASE = 20;

type DecimalPair = readonly [base: Rational, exponent: number];

const digits = Array.from({ length: 9 }, (_, index) => index + 1);

/** The three equally likely groups of decimal powers (spec §5.18). */
export const DECIMAL_POWERS: readonly (readonly DecimalPair[])[] = [
  digits.flatMap((k): DecimalPair[] => [
    [rational(BigInt(k), 10n), 2],
    [rational(BigInt(k), 10n), 3],
  ]),
  digits.map((k): DecimalPair => [rational(BigInt(k), 100n), 2]),
  [11n, 12n, 15n, 25n, 35n].map((k): DecimalPair => [rational(k, 10n), 2]),
];

/** Superscript n (U+207F) for the unknown exponent. */
const UNKNOWN_EXPONENT = 'ⁿ';

/** A base as a factor: a negative one in parentheses (§5.8). */
function factorText(base: Rational): string {
  const text = formatRational(base);
  return base.num < 0n ? `(${text})` : text;
}

function powerText(base: Rational, exponent: number): string {
  return `${factorText(base)}${toSuperscript(exponent)}`;
}

function repeated(base: Rational, exponent: number): string {
  return Array.from({ length: exponent }, () => factorText(base)).join(' × ');
}

/** `2⁵ = 2 × 2 × 2 × 2 × 2 = 32`, `7⁰ = 1: …`, `7¹ = 7` (spec §5.18). */
export function explainPower(base: Rational, exponent: number): string {
  const shown = powerText(base, exponent);
  if (exponent === 0) return `${shown} = 1: elk getal (behalve 0) tot de macht 0 is 1`;
  if (exponent === 1) return `${shown} = ${formatRational(base)}`;
  return `${shown} = ${repeated(base, exponent)} = ${formatRational(power(base, exponent))}`;
}

/** Exponent 0 as 0, a wrong sign with a negative base, then base × exponent (spec §3.4.1). */
function wholePowerTip(base: Rational, exponent: number): Diagnose {
  const answer = power(base, exponent);
  const shown = powerText(base, exponent);
  return (given) => {
    if (exponent === 0 && equals(given, fromInteger(0))) {
      return 'Elk getal (behalve 0) tot de macht 0 is 1.';
    }
    if (base.num < 0n && equals(given, negate(answer))) {
      const parity =
        exponent % 2 === 0
          ? 'een even aantal mintekens geeft plus'
          : 'een oneven aantal mintekens geeft min';
      return `${shown} = ${repeated(base, exponent)}: ${parity}.`;
    }
    if (exponent >= 2 && equals(given, multiply(base, fromInteger(exponent)))) {
      return (
        `Een macht is herhaald vermenigvuldigen: ${shown} = ${repeated(base, exponent)}, ` +
        `niet ${factorText(base)} × ${exponent}.`
      );
    }
    return undefined;
  };
}

/** Too few decimals: the answer 10ᵏ times too large (spec §3.4.1). */
function decimalPowerTip(base: Rational, exponent: number): Diagnose {
  const answer = power(base, exponent);
  const together = exponent === 2 ? 'beide getallen samen' : 'alle getallen samen';
  const tip =
    `${repeated(base, exponent)} = ${formatRational(answer)}: ` +
    `de uitkomst heeft evenveel decimalen als ${together}.`;
  return (given) => {
    const shift = powerOfTenShift(given, answer);
    return shift !== null && shift > 0 ? tip : undefined;
  };
}

function powerQuestion(base: Rational, exponent: number, diagnose: Diagnose): Question {
  const prompt = powerText(base, exponent);
  return {
    key: `powersRoots:${prompt}`,
    topic: 'powersRoots',
    steps: [
      numberStep({
        prompt: `${prompt} = ?`,
        answer: power(base, exponent),
        explanation: explainPower(base, exponent),
        diagnose,
      }),
    ],
  };
}

/** `2⁵ = ?`, `(−3)³ = ?` or `7⁰ = ?` */
export function wholePowerQuestion(base: number, exponent: number): Question {
  const value = fromInteger(base);
  return powerQuestion(value, exponent, wholePowerTip(value, exponent));
}

/** `0,3² = ?` */
export function decimalPowerQuestion(base: Rational, exponent: number): Question {
  return powerQuestion(base, exponent, decimalPowerTip(base, exponent));
}

/** `10⁻³ = ?`, or asking the exponent: `0,001 = 10ⁿ. n = ?` */
export function negativeExponentQuestion(n: number, askExponent: boolean): Question {
  const value = powerOfTen(-n);
  const shown = formatRational(value);
  const negativePower = formatPowerOfTen(-n);
  const division = `1 : ${f(10 ** n)}`;
  if (!askExponent) {
    return {
      key: `powersRoots:${negativePower}`,
      topic: 'powersRoots',
      steps: [
        numberStep({
          prompt: `${negativePower} = ?`,
          answer: value,
          explanation: `${negativePower} = 1 : ${formatPowerOfTen(n)} = ${division} = ${shown}`,
          diagnose: (given) =>
            equals(given, negate(powerOfTen(n)))
              ? `Een negatieve exponent maakt geen negatief getal: ${negativePower} = ${division}.`
              : undefined,
        }),
      ],
    };
  }
  return {
    key: `powersRoots:${shown} = 10${UNKNOWN_EXPONENT}`,
    topic: 'powersRoots',
    steps: [
      numberStep({
        prompt: `${shown} = 10${UNKNOWN_EXPONENT}. n = ?`,
        answer: fromInteger(-n),
        explanation: `${shown} = ${division} = 1 : ${formatPowerOfTen(n)} = ${negativePower}`,
        // The answer is an exponent: a factor-of-ten tip would be meaningless (as in §5.14).
        noPowerOfTenTip: true,
        diagnose: (given) => {
          if (equals(given, fromInteger(n))) {
            return 'Een getal kleiner dan 1 heeft een negatieve exponent.';
          }
          if (equals(given, fromInteger(1 - n))) {
            return `Tel de plaatsen waarover de komma schuift: ${shown} = ${division} = ${negativePower}.`;
          }
          return undefined;
        },
      }),
    ],
  };
}

/** `∛64 = ?` */
export function cubeRootQuestion(n: number): Question {
  const cube = f(n ** 3);
  return {
    key: `powersRoots:∛${cube}`,
    topic: 'powersRoots',
    steps: [
      numberStep({
        prompt: `∛${cube} = ?`,
        answer: fromInteger(n),
        explanation: `∛${cube} = ${n}, want ${n} × ${n} × ${n} = ${cube}`,
        diagnose: (given) =>
          equals(given, divide(fromInteger(n ** 3), fromInteger(3)))
            ? `∛${cube} is het getal dat 3 keer met zichzelf vermenigvuldigd ${cube} geeft, niet ${cube} : 3.`
            : undefined,
      }),
    ],
  };
}

/** `√0,49 = ?` or `√6400 = ?`: the root of a scaled square. */
export function squareRootQuestion(root: Rational): Question {
  const square = formatRational(power(root, 2));
  const shown = formatRational(root);
  return {
    key: `powersRoots:√${square}`,
    topic: 'powersRoots',
    steps: [
      numberStep({
        prompt: `√${square} = ?`,
        answer: root,
        explanation: `√${square} = ${shown}, want ${shown} × ${shown} = ${square}`,
      }),
    ],
  };
}

function wholePower(rng: Rng): Question {
  const draw = rng();
  if (draw < POSITIVE_SHARE) {
    const [base, exponent] = pick(rng, POSITIVE_POWERS);
    return wholePowerQuestion(base, exponent);
  }
  if (draw < POSITIVE_SHARE + NEGATIVE_SHARE) {
    const [base, exponent] = pick(rng, NEGATIVE_POWERS);
    return wholePowerQuestion(-base, exponent);
  }
  return wholePowerQuestion(randomInt(rng, 2, MAX_SMALL_EXPONENT_BASE), randomInt(rng, 0, 1));
}

function decimalPower(rng: Rng): Question {
  const [base, exponent] = pick(rng, pick(rng, DECIMAL_POWERS));
  return decimalPowerQuestion(base, exponent);
}

function negativeExponent(rng: Rng): Question {
  return negativeExponentQuestion(randomInt(rng, 1, 6), rng() < 0.5);
}

function root(rng: Rng): Question {
  if (rng() < 0.5) return cubeRootQuestion(randomInt(rng, 2, 10));
  const k = randomIntWhere(rng, 2, 15, (value) => value !== 10);
  return squareRootQuestion(rng() < 0.5 ? rational(BigInt(k), 10n) : fromInteger(k * 10));
}

const BUILDERS: Record<PowerForm, (rng: Rng) => Question> = {
  wholePower,
  decimalPower,
  negativeExponent,
  root,
};

/** One question of the given form. */
export function buildPowersRoots(rng: Rng, form: PowerForm): Question {
  return BUILDERS[form](rng);
}

/** One of four forms, each equally likely (spec §5.18). */
export function generatePowersRoots(rng: Rng): Question {
  return buildPowersRoots(rng, pick(rng, POWER_FORMS));
}
```

Break the two tip template lines that exceed 100 columns (the "Tel de plaatsen" and the "∛ … geeft" strings) into concatenated parts before committing.

- [ ] **Step 4: Register the topic**

In `src/lib/types.ts`, add `| 'powersRoots'` as the last member of `Topic`.

In `src/lib/topics/index.ts`:
- add `import { generatePowersRoots } from './powersRoots';` (after the `percentages` import)
- add `powersRoots: generatePowersRoots,` as the last entry of `GENERATORS`
- add `powersRoots: 'Machten en wortels (2⁵, 0,3², 10⁻³, ∛64)',` as the last entry of `TOPIC_LABELS`

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/lib/topics/powersRoots.test.ts` then `npm test` and `npm run check`
Expected: all PASS; check 0 errors, 0 warnings.

- [ ] **Step 6: Commit**

```bash
git diff src/lib/types.ts src/lib/topics/index.ts
git add src/lib/topics/powersRoots.ts src/lib/topics/powersRoots.test.ts src/lib/types.ts src/lib/topics/index.ts
git commit -m "feat: powers beyond squares, base-10 negative exponents and roots" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: `scientificNotation` (spec §5.19)

**Files:**
- Create: `src/lib/topics/scientificNotation.ts`
- Create: `src/lib/topics/scientificNotation.test.ts`
- Modify: `src/lib/types.ts` (`Topic`), `src/lib/topics/index.ts`

`c` comes from `randomMantissa` (measurement.ts): an integer with 1 to 3 significant digits that does not end in 0 (`45` → `c = 4,5`). The `scientificStep` of Task 4 does the judging and the generic tips; this task adds the topic tips (counting zeros, normalising the wrong way).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/topics/scientificNotation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { GROUP_SEPARATOR, SUPERSCRIPT_DIGITS } from '../format';
import { createRng } from '../random';
import { compare, fromInteger, multiply, parseDutchNumber, powerOfTen } from '../rational';
import { isNormalised, parseScientific, scientificValue } from '../steps';
import type { Question, Step } from '../types';
import {
  buildScientificNotation,
  EXPONENTS,
  generateScientificNotation,
  NOTATION_FORMS,
  type NotationForm,
  normaliseQuestion,
  toNotationQuestion,
  toNumberQuestion,
} from './scientificNotation';

const PER_FORM = 1000;
const TO_NOTATION = /^Schrijf in wetenschappelijke notatie: ([\d,\u{202f}]+)$/u;
const NORMALISE =
  /^Schrijf in wetenschappelijke notatie: ([\d,\u{202f}]+) × 10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)$/u;
const TO_NUMBER = /^(?:([\d,]+) × )?10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+) = \?$/u;

function questionsOf(form: NotationForm): Question[] {
  const rng = createRng(600 + NOTATION_FORMS.indexOf(form));
  return Array.from({ length: PER_FORM }, () => buildScientificNotation(rng, form));
}

function stepOf(question: Question): Step {
  return question.steps[0]!;
}

/** Text as typed on the keypad: no digit grouping. */
function plain(text: string): string {
  return text.replaceAll(GROUP_SEPARATOR, '');
}

/** '⁻³' → −3 */
function fromSuperscript(text: string): number {
  const digits = [...text.replace('⁻', '')].map((char) => SUPERSCRIPT_DIGITS.indexOf(char));
  return (text.startsWith('⁻') ? -1 : 1) * Number(digits.join(''));
}

/** '4,5 × 10⁶' as typed on the scientific keypad: '4,5×10^6'. */
function typedScientific(expected: string): string {
  const [coefficient = '', power = ''] = expected.split(' × ');
  return `${coefficient}×10^${fromSuperscript(power.slice(2))}`;
}

function typedAnswer(step: Step): string {
  const { expected } = step.check('');
  return step.kind === 'scientific' ? typedScientific(expected) : plain(expected);
}

describe('generateScientificNotation', () => {
  it('produces all three forms, each accepting its expected answer', () => {
    const rng = createRng(1);
    const kinds = new Set<string>();
    for (let i = 0; i < 1500; i++) {
      const question = generateScientificNotation(rng);
      expect(question.topic).toBe('scientificNotation');
      const step = stepOf(question);
      expect(step.check(typedAnswer(step)).correct, step.prompt).toBe(true);
      kinds.add(question.key.split(':')[1]!);
    }
    expect([...kinds].sort()).toEqual(['from', 'normalise', 'to']);
  });
});

describe('to notation', () => {
  const questions = questionsOf('toNotation');

  it('writes out a number of at most 10 digits and expects its normalised notation', () => {
    for (const question of questions) {
      const step = stepOf(question);
      expect(step.kind).toBe('scientific');
      const written = plain(TO_NOTATION.exec(step.prompt)![1]!);
      expect(written.replace(',', '').length, written).toBeLessThanOrEqual(10);
      const answer = parseScientific(typedAnswer(step))!;
      expect(isNormalised(answer)).toBe(true);
      expect(EXPONENTS).toContain(answer.exponent);
      expect(scientificValue(answer)).toEqual(parseDutchNumber(written));
    }
  });

  it('explains via the power of ten written out', () => {
    const step = stepOf(toNotationQuestion(45, 6));
    expect(step.prompt).toBe('Schrijf in wetenschappelijke notatie: 4\u{202f}500\u{202f}000');
    expect(step.check('4,5×10^6')).toEqual({
      correct: true,
      expected: '4,5 × 10⁶',
      explanation: '4\u{202f}500\u{202f}000 = 4,5 × 1\u{202f}000\u{202f}000 = 4,5 × 10⁶',
    });
    expect(stepOf(toNotationQuestion(45, -5)).check('4,5×10^-5').explanation).toBe(
      '0,000045 = 4,5 × 0,00001 = 4,5 × 10⁻⁵',
    );
  });

  it('names counting the zeros, also for small numbers', () => {
    expect(stepOf(toNotationQuestion(45, 6)).check('4,5×10^5').tip).toBe(
      'Tel de plaatsen waarover de komma schuift, niet de nullen.',
    );
    const small = stepOf(toNotationQuestion(45, -5));
    expect(small.check('4,5×10^-4').tip).toBe(
      'Tel de plaatsen waarover de komma schuift, niet de nullen.',
    );
    expect(small.check('4,5×10^5').tip).toBe(
      'Een getal kleiner dan 1 heeft een negatieve exponent.',
    );
  });

  it('gives the zeros tip only when counting zeros gives a different exponent', () => {
    // 4 000 000 has 6 zeros and n = 6: 4 × 10⁵ is just off by a factor 10.
    expect(stepOf(toNotationQuestion(4, 6)).check('4×10^5').tip).toBe(
      'Je antwoord is 10 keer te klein. Let op de komma en het aantal nullen.',
    );
  });
});

describe('to number', () => {
  const questions = questionsOf('toNumber');

  it('writes c × 10ⁿ, or just 10ⁿ for c = 1, and expects the number', () => {
    let bare = 0;
    for (const question of questions) {
      const step = stepOf(question);
      expect(step.kind).toBe('number');
      const match = TO_NUMBER.exec(step.prompt);
      expect(match, step.prompt).not.toBeNull();
      const coefficient = match![1] === undefined ? fromInteger(1) : parseDutchNumber(match![1])!;
      if (match![1] === undefined) bare++;
      else expect(compare(coefficient, fromInteger(1))).toBe(1);
      const exponent = fromSuperscript(match![2]!);
      expect(EXPONENTS).toContain(exponent);
      expect(parseDutchNumber(typedAnswer(step))).toEqual(
        multiply(coefficient, powerOfTen(exponent)),
      );
    }
    expect(bare).toBeGreaterThan(0);
  });

  it('explains via the power of ten written out', () => {
    const step = stepOf(toNumberQuestion(45, -3));
    expect(step.prompt).toBe('4,5 × 10⁻³ = ?');
    expect(step.check('0,0045')).toMatchObject({
      correct: true,
      explanation: '4,5 × 10⁻³ = 4,5 × 0,001 = 0,0045',
    });
    const bare = stepOf(toNumberQuestion(1, 6));
    expect(bare.prompt).toBe('10⁶ = ?');
    expect(bare.check('1000000').explanation).toBe('10⁶ = 1\u{202f}000\u{202f}000');
  });
});

describe('normalise', () => {
  const questions = questionsOf('normalise');

  it('shows a coefficient outside [1, 10) and expects the normalised notation', () => {
    for (const question of questions) {
      const step = stepOf(question);
      const match = NORMALISE.exec(step.prompt);
      expect(match, step.prompt).not.toBeNull();
      const shown = parseDutchNumber(plain(match![1]!))!;
      const k = fromSuperscript(match![2]!);
      expect(k).not.toBe(0);
      expect(isNormalised({ coefficient: shown, exponent: k })).toBe(false);
      const answer = parseScientific(typedAnswer(step))!;
      expect(isNormalised(answer)).toBe(true);
      expect(EXPONENTS).toContain(answer.exponent);
      expect(scientificValue(answer)).toEqual(multiply(shown, powerOfTen(k)));
    }
  });

  it('explains the shift and names moving the exponent the wrong way', () => {
    const step = stepOf(normaliseQuestion(45, 6, 2));
    expect(step.prompt).toBe('Schrijf in wetenschappelijke notatie: 450 × 10⁴');
    expect(step.check('4,5×10^6')).toMatchObject({
      correct: true,
      explanation: '450 × 10⁴ = 4,5 × 10² × 10⁴ = 4,5 × 10⁶',
    });
    expect(step.check('4,5×10^2').tip).toBe(
      'Het getal vóór × 10 wordt 100 keer kleiner, dus de exponent wordt 2 groter.',
    );
    expect(step.check('450×10^4').tip).toBe(
      'De waarde klopt, maar het getal vóór × 10 moet minstens 1 en kleiner dan 10 zijn.',
    );
  });

  it('handles a coefficient below 1 and a negative exponent', () => {
    const step = stepOf(normaliseQuestion(3, -3, -1));
    expect(step.prompt).toBe('Schrijf in wetenschappelijke notatie: 0,3 × 10⁻²');
    expect(step.check('3×10^-3')).toMatchObject({
      correct: true,
      explanation: '0,3 × 10⁻² = 3 × 10⁻¹ × 10⁻² = 3 × 10⁻³',
    });
    expect(step.check('3×10^-1').tip).toBe(
      'Het getal vóór × 10 wordt 10 keer groter, dus de exponent wordt 1 kleiner.',
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/topics/scientificNotation.test.ts`
Expected: FAIL, cannot resolve `./scientificNotation`.

- [ ] **Step 3: Implement the generator**

Create `src/lib/topics/scientificNotation.ts`:

```ts
import { formatInteger, formatPowerOfTen, formatRational, formatScientific } from '../format';
import { drawUntil, pick, type Rng } from '../random';
import { divide, equals, fromInteger, multiply, powerOfTen, type Rational } from '../rational';
import { numberStep, scientificStep, type ScientificInput } from '../steps';
import type { Question } from '../types';
import { randomMantissa } from './measurement';

// Scientific notation (spec §5.19).
export const NOTATION_FORMS = ['toNotation', 'toNumber', 'normalise'] as const;
export type NotationForm = (typeof NOTATION_FORMS)[number];

/** n of c × 10ⁿ: a written-out number has at most 10 digits. */
export const EXPONENTS: readonly number[] = [-6, -5, -4, -3, -2, -1, 2, 3, 4, 5, 6, 7, 8, 9];
/** s of the prompt's m = c × 10ˢ in the normalise form. */
export const SHIFTS: readonly number[] = [-2, -1, 1, 2, 3];

const ONE = fromInteger(1);
const NOTATION_PROMPT = 'Schrijf in wetenschappelijke notatie:';

/** c in [1, 10) from a mantissa with 1 to 3 significant digits: 45 → 4,5. */
function coefficientOf(mantissa: number): Rational {
  return divide(fromInteger(mantissa), powerOfTen(String(mantissa).length - 1));
}

/** The number written out: 4 500 000, 0,000045. */
function writtenOut(coefficient: Rational, exponent: number): string {
  return formatRational(multiply(coefficient, powerOfTen(exponent)));
}

/** Counted the zeros instead of the places the comma moves (spec §3.4.1). */
function zerosTip(mantissa: number, exponent: number) {
  const coefficient = coefficientOf(mantissa);
  const digits = String(mantissa).length;
  // 4 500 000 has 5 zeros (n = 6); 0,000045 has 4 zeros after the comma (n = −5).
  const zeros = exponent > 0 ? exponent - (digits - 1) : exponent + 1;
  return (given: ScientificInput) =>
    zeros !== exponent && given.exponent === zeros && equals(given.coefficient, coefficient)
      ? 'Tel de plaatsen waarover de komma schuift, niet de nullen.'
      : undefined;
}

/** Moved the exponent the wrong way: k − s instead of k + s (spec §3.4.1). */
function shiftTip(coefficient: Rational, shift: number, k: number) {
  const factor = formatInteger(10 ** Math.abs(shift));
  const tip =
    shift > 0
      ? `Het getal vóór × 10 wordt ${factor} keer kleiner, dus de exponent wordt ${shift} groter.`
      : `Het getal vóór × 10 wordt ${factor} keer groter, dus de exponent wordt ${-shift} kleiner.`;
  return (given: ScientificInput) =>
    given.exponent === k - shift && equals(given.coefficient, coefficient) ? tip : undefined;
}

/** `Schrijf in wetenschappelijke notatie: 4 500 000` */
export function toNotationQuestion(mantissa: number, exponent: number): Question {
  const coefficient = coefficientOf(mantissa);
  const shown = writtenOut(coefficient, exponent);
  const power = formatRational(powerOfTen(exponent));
  return {
    key: `scientificNotation:to:${mantissa}:${exponent}`,
    topic: 'scientificNotation',
    steps: [
      scientificStep({
        prompt: `${NOTATION_PROMPT} ${shown}`,
        coefficient,
        exponent,
        explanation:
          `${shown} = ${formatRational(coefficient)} × ${power} = ` +
          formatScientific(coefficient, exponent),
        diagnose: zerosTip(mantissa, exponent),
      }),
    ],
  };
}

/** `4,5 × 10⁻³ = ?`, or `10⁶ = ?` for c = 1 (as in §5.14). */
export function toNumberQuestion(mantissa: number, exponent: number): Question {
  const coefficient = coefficientOf(mantissa);
  const shown = writtenOut(coefficient, exponent);
  const bare = equals(coefficient, ONE);
  const prompt = bare ? formatPowerOfTen(exponent) : formatScientific(coefficient, exponent);
  const power = formatRational(powerOfTen(exponent));
  return {
    key: `scientificNotation:from:${mantissa}:${exponent}`,
    topic: 'scientificNotation',
    steps: [
      numberStep({
        prompt: `${prompt} = ?`,
        answer: multiply(coefficient, powerOfTen(exponent)),
        explanation: bare
          ? `${prompt} = ${shown}`
          : `${prompt} = ${formatRational(coefficient)} × ${power} = ${shown}`,
      }),
    ],
  };
}

/** `Schrijf in wetenschappelijke notatie: 450 × 10⁴`: m = c × 10ˢ and k = n − s. */
export function normaliseQuestion(mantissa: number, exponent: number, shift: number): Question {
  const coefficient = coefficientOf(mantissa);
  const k = exponent - shift;
  const shown = `${formatRational(multiply(coefficient, powerOfTen(shift)))} × ${formatPowerOfTen(k)}`;
  return {
    key: `scientificNotation:normalise:${mantissa}:${exponent}:${shift}`,
    topic: 'scientificNotation',
    steps: [
      scientificStep({
        prompt: `${NOTATION_PROMPT} ${shown}`,
        coefficient,
        exponent,
        explanation:
          `${shown} = ${formatRational(coefficient)} × ${formatPowerOfTen(shift)} × ` +
          `${formatPowerOfTen(k)} = ${formatScientific(coefficient, exponent)}`,
        diagnose: shiftTip(coefficient, shift, k),
      }),
    ],
  };
}

function toNotation(rng: Rng): Question {
  return toNotationQuestion(randomMantissa(rng), pick(rng, EXPONENTS));
}

function toNumber(rng: Rng): Question {
  return toNumberQuestion(randomMantissa(rng), pick(rng, EXPONENTS));
}

function normalise(rng: Rng): Question {
  const mantissa = randomMantissa(rng);
  const { exponent, shift } = drawUntil(() => {
    const exponent = pick(rng, EXPONENTS);
    const shift = pick(rng, SHIFTS);
    // k = n − s must not be 0: the prompt always shows a power of ten.
    return exponent !== shift ? { exponent, shift } : null;
  });
  return normaliseQuestion(mantissa, exponent, shift);
}

const BUILDERS: Record<NotationForm, (rng: Rng) => Question> = {
  toNotation,
  toNumber,
  normalise,
};

/** One question of the given form. */
export function buildScientificNotation(rng: Rng, form: NotationForm): Question {
  return BUILDERS[form](rng);
}

/** One of three forms, each equally likely (spec §5.19). */
export function generateScientificNotation(rng: Rng): Question {
  return buildScientificNotation(rng, pick(rng, NOTATION_FORMS));
}
```

Break the `shown` line in `normaliseQuestion` (over 100 columns) into two parts before committing.

- [ ] **Step 4: Register the topic**

In `src/lib/types.ts`, add `| 'scientificNotation'` as the last member of `Topic`.

In `src/lib/topics/index.ts`:
- add `import { generateScientificNotation } from './scientificNotation';` (after the `rounding` import)
- add `scientificNotation: generateScientificNotation,` as the last entry of `GENERATORS`
- add `scientificNotation: 'Wetenschappelijke notatie (4,5 × 10⁶)',` as the last entry of `TOPIC_LABELS`

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/lib/topics/scientificNotation.test.ts` then `npm test` and `npm run check`
Expected: all PASS; check 0 errors, 0 warnings.

- [ ] **Step 6: Commit**

```bash
git diff src/lib/types.ts src/lib/topics/index.ts
git add src/lib/topics/scientificNotation.ts src/lib/topics/scientificNotation.test.ts src/lib/types.ts src/lib/topics/index.ts
git commit -m "feat: scientific notation to and from numbers, and normalising" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: The Getalbegrip set

**Files:**
- Modify: `src/lib/sets.ts`
- Test: `src/lib/sets.test.ts`, `src/lib/session.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/lib/sets.test.ts`, add `NUMBER_SENSE_SET` to the import list from `'./sets'`. Change the roadmap-order test to:

```ts
  it('offers the implemented sets in roadmap order', () => {
    expect(PRACTICE_SETS.map((set) => set.id)).toEqual([
      'tafels',
      'meten',
      'verhoudingen',
      'getallen',
      'bewerkingen',
      'getalbegrip',
    ]);
  });
```

Add inside `describe('practice sets', …)`:

```ts
  it('makes Getalbegrip five equally weighted topics with 15% tables', () => {
    expect(NUMBER_SENSE_SET.name).toBe('Getalbegrip');
    expect(NUMBER_SENSE_SET.tablesPercent).toBe(15);
    expect(NUMBER_SENSE_SET.topics).toEqual([
      { topic: 'mentalOperations', weight: 1 },
      { topic: 'negativeNumbers', weight: 1 },
      { topic: 'rounding', weight: 1 },
      { topic: 'powersRoots', weight: 1 },
      { topic: 'scientificNotation', weight: 1 },
    ]);
  });
```

Add inside `describe('describeSetTopics', …)`:

```ts
  it('describes the Getalbegrip set', () => {
    expect(describeSetTopics(NUMBER_SENSE_SET)).toEqual([
      'Hoofdrekenen met grote getallen (ook delen met rest)',
      'Negatieve getallen (ook temperatuur)',
      'Afronden (tientallen t/m miljoenen, decimalen)',
      'Machten en wortels (2⁵, 0,3², 10⁻³, ∛64)',
      'Wetenschappelijke notatie (4,5 × 10⁶)',
      '15% tafels',
    ]);
  });
```

In `src/lib/session.test.ts`, add `NUMBER_SENSE_SET` to the import list from `'./sets'`, and add after `describe('buildSession for Bewerkingen', …)`:

```ts
describe('buildSession for Getalbegrip', () => {
  it('mixes 2 tables with 3 + 3 + 3 + 2 + 2 exercises at n = 15 (spec §4.2)', () => {
    const questions = buildSession(NUMBER_SENSE_SET, 15, createRng(3));
    const counts = new Map<string, number>();
    for (const { topic } of questions) counts.set(topic, (counts.get(topic) ?? 0) + 1);
    expect(counts.get('tables')).toBe(2);
    const perTopic = NUMBER_SENSE_SET.topics.map(({ topic }) => counts.get(topic) ?? 0);
    expect(perTopic.sort((a, b) => a - b)).toEqual([2, 2, 3, 3, 3]);
  });

  it.each([...SESSION_SIZES])('builds %i unique questions', (size) => {
    const questions = buildSession(NUMBER_SENSE_SET, size, createRng(size));
    expect(questions).toHaveLength(size);
    expect(new Set(questions.map((q) => q.key)).size).toBe(size);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/sets.test.ts src/lib/session.test.ts`
Expected: FAIL, `NUMBER_SENSE_SET` is undefined.

- [ ] **Step 3: Implement**

In `src/lib/sets.ts`, add after `OPERATIONS_SET`:

```ts
export const NUMBER_SENSE_SET: PracticeSet = {
  id: 'getalbegrip',
  name: 'Getalbegrip',
  description: 'Hoofdrekenen, negatieve getallen, afronden, machten en wetenschappelijke notatie',
  topics: [
    { topic: 'mentalOperations', weight: 1 },
    { topic: 'negativeNumbers', weight: 1 },
    { topic: 'rounding', weight: 1 },
    { topic: 'powersRoots', weight: 1 },
    { topic: 'scientificNotation', weight: 1 },
  ],
  tablesPercent: 15,
};
```

and append `NUMBER_SENSE_SET,` as the last entry of `PRACTICE_SETS`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test` then `npm run check`
Expected: all PASS; check 0 errors, 0 warnings. (No component test counts the set cards.)

- [ ] **Step 5: Commit**

```bash
git diff src/lib/sets.ts src/lib/sets.test.ts src/lib/session.test.ts
git add src/lib/sets.ts src/lib/sets.test.ts src/lib/session.test.ts
git commit -m "feat: Getalbegrip practice set" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Docs and final verification

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

In the **Status** paragraph, change the first sentence's list so it ends with:

```
**Getallen & delers** (plan: `docs/superpowers/plans/2026-10-06-getallen-delers.md`),
**Bewerkingen** (plan: `docs/superpowers/plans/2026-10-06-bewerkingen.md`) and **Getalbegrip**
(plan: `docs/superpowers/plans/2026-10-07-getalbegrip.md`).
```

In the roadmap table, set the Status column of row 5 (**Getalbegrip**) from `spec ready` to `✅ done`, and the Status column of row 6 (**Breuken & kommagetallen**) from `later` to `next`.

In **Architecture**, change the `steps.ts` line to mention the scientific step, and the `keypadInput.ts` line to mention scientific notation:

```
    steps.ts            step factories (number, fraction, boolean, factorization, rewrite,
                        scientific), parseAnswer, parseFactorization and parseScientific — all
                        answer parsing and checking goes through here
    keypadInput.ts      pure key → input reducers (numbers, fraction templates, factorizations,
                        expressions, scientific notation)
```

and change the `random.ts` line to:

```
    random.ts           seedable RNG; every generator takes an rng argument; drawUntil redraws
                        until all rules of an exercise hold
```

Under **Known follow-ups for the next plans**, add:

```
- Manual phone check for Getalbegrip: the scientific keypad has 4 rows instead of 5 (the prompt
  sits lower), and the long remainder prompts (`Een kaartje kost € 7. Je koopt zoveel mogelijk
  …`) must keep the keypad on screen.
```

- [ ] **Step 3: Commit**

```bash
git diff CLAUDE.md
git add CLAUDE.md
git commit -m "docs: mark Getalbegrip as done" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```
