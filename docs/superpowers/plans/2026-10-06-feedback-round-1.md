# Feedback Round 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The first round of UI feedback. A grey `…` placeholder replaces `?`. Fractions are shown stacked everywhere. A **breuk** key opens a fraction template that also builds mixed numbers (`12 2/3`). The session counts become 5, 10, 15, 25 and 50 in one column. Stop is light red. Keypad keys act on press.

**Architecture:**

- **Display only.** Answer strings stay as text (`25/2`, `12,5 of 25/2`, `12½%`). A pure splitter (`lib/fractionText.ts`) cuts text into plain runs and fractions. A `MathText` component renders those fractions stacked through a shared `Fraction` component. A hidden `/` keeps the text readable for screen readers and keeps `textContent` as `25/2`.
- **Mixed numbers in answers.** `rational.ts` gets `parseMixedNumber` (`12 1/2`, `-12 1/2`). `parseAnswer('fraction', …)` accepts it, so checking and results need no other change.
- **Typing state per kind.** `InputModel` becomes generic over its typing state `S`. Number and factorization keep a plain string. Fraction gets a structured state: `{ negative, whole, template }`, where the template holds `{ num, den, slot }`. The model turns that state into the submitted string (`toInput`) and into field segments (`view`), and handles a tapped slot (`select`). A new generic `KeypadAnswer` component owns the answer field, the inline error and the keypad. `QuestionView` only picks the model.
- **Keys act on press.** A `press` action fires on `pointerdown` and also on keyboard activation (a click with `detail === 0`). It ignores the click that follows a pointer press. `OK` stays on `click`. It replaces the whole view, so firing on press would let the release land on the next screen. A global passive `touchstart` listener makes iOS Safari show `:active`.

**Tech Stack:** Svelte 5 (runes, generic components), TypeScript (strict, `noUncheckedIndexedAccess`), Vitest + @testing-library/svelte (jsdom). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-05-rekenhulp-design.md`. Read §3.2, §3.3, §5.12, §6, §8 and §11.14 before starting.

---

## Scope

| Spec section | What is built |
|---|---|
| §3.2 | Counts 5, 10, 15, 25, 50 (default 15), full-width options in one column |
| §3.3 | Stop button in the wrong-answer colours (light red) |
| §5.12 | `12½%` in prompts rendered as `12` plus a stacked `½`; `12 1/2` accepted as an answer |
| §6 | `…` placeholder in muted grey; breuk key with template, slot tap, mixed numbers; keys on press; iOS `:active` |
| §8 | Stacked fractions in prompts, input field, feedback, results and explanations |

**Out of scope:** mixed numbers as *expected* answers (v2). The 600 ms correct-answer pause stays as it is (§3.4).

## Prerequisites & command permissions

- Pre-approved in this repo: `npm install`, `npm test`, `npm run check`, `npm run build`, `git add`, `git commit`.
- **Not pre-approved:** `npm run dev` and `npm run preview`. They are only for the user's manual check.
- **Never** use `npx` or `node`.
- Every commit message ends with the trailer `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. The commands below pass it via a second `-m`.
- `npm run check` must stay at 0 errors and 0 warnings after **every** task. This is why Task 7 changes the input models and their UI in a single commit.
- If a commit fails because signing via 1Password is locked, stop and ask the user to unlock it. Never bypass signing.

## Domain notes for the implementer

- **The breuk key is the existing `'/'` `KeypadKey`.** Only its label (`breuk`, drawn as an icon) and its behaviour change.
- **Raw input vs display.** The submitted input stays raw: ASCII `-` for minus and one ASCII space between the whole part and the fraction (`-12 1/2`). `display` turns `-` into `−` (U+2212). `MathText` stacks the fraction.
- **Glyphs used in this plan:** `…` U+2026 (placeholder), `□` U+25A1 (breuk icon), `½` U+00BD, `−` U+2212, `×` U+00D7, `⌫` U+232B. All of them are visible characters; type them as shown. The thin space in numbers is written as the escape `\u{202f}`. Never paste it as a literal.
- **Whitespace in Svelte markup matters** for `MathText`, `Fraction` and the answer field. Line breaks between tags inside inline content become visible spaces. Keep the markup exactly as shown, including the `>` placed at the start of the next line.
- **`getByText` only matches an element's own text nodes.** For text that contains a stacked fraction, assert on `textContent` of the container element instead.

## File structure

```
src/lib/
  sets.ts (+ .test.ts)              SESSION_SIZES = [5, 10, 15, 25, 50]
  rational.ts (+ .test.ts)          + parseMixedNumber
  steps.ts (+ .test.ts)             parseAnswer('fraction') accepts mixed numbers
  fractionText.ts (+ .test.ts)      NEW splitFractions(text) → text and fraction segments
  keypadInput.ts (+ .test.ts)       applyKey loses '/'; + FractionInput, applyFractionKey,
                                    selectFractionSlot, fractionInputToString
  inputModels.ts (+ .test.ts)       generic InputModel<S>; FieldSegment; fraction model; okSpan(keys)
src/components/
  Fraction.svelte                   NEW stacked numerator/bar/denominator with a hidden slash
  MathText.svelte (+ .test.ts)      NEW text with stacked fractions
  KeypadAnswer.svelte               NEW generic answer field + inline error + keypad
  Keypad.svelte                     keys prop, breuk icon, press action
  press.ts (+ .test.ts)             NEW act-on-press action
  QuestionView.svelte (+ .test.ts)  picks the model; prompt via MathText
  Feedback.svelte (+ .test.ts)      prompt, answers, explanation via MathText
  ResultScreen.svelte               prompt, answers, explanation via MathText
  SetupScreen.svelte                counts in one column
  PlayScreen.svelte                 light red Stop
src/main.ts                         passive touchstart listener (iOS :active)
CLAUDE.md                           status, follow-ups, architecture
```

---

### Task 1: Session counts in one column

**Files:**
- Modify: `src/lib/sets.ts:4`
- Modify: `src/lib/sets.test.ts:65-68`
- Modify: `src/components/SetupScreen.svelte` (style block)

- [ ] **Step 1: Update the failing test**

In `src/lib/sets.test.ts`, replace:

```ts
  it('offers the session sizes from the spec with 15 as default', () => {
    expect(SESSION_SIZES).toEqual([15, 25, 50, 75, 100]);
    expect(DEFAULT_SESSION_SIZE).toBe(15);
  });
```

with:

```ts
  it('offers the session sizes from the spec with 15 as default', () => {
    expect(SESSION_SIZES).toEqual([5, 10, 15, 25, 50]);
    expect(DEFAULT_SESSION_SIZE).toBe(15);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/sets.test.ts`
Expected: FAIL. The output shows `[15, 25, 50, 75, 100]` where `[5, 10, 15, 25, 50]` was expected.

- [ ] **Step 3: Change the sizes**

In `src/lib/sets.ts`, replace:

```ts
export const SESSION_SIZES: readonly number[] = [15, 25, 50, 75, 100];
```

with:

```ts
export const SESSION_SIZES: readonly number[] = [5, 10, 15, 25, 50];
```

- [ ] **Step 4: Stack the options in one column**

In `src/components/SetupScreen.svelte`, replace:

```css
  .sizes {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.5rem;
  }
```

with:

```css
  .sizes {
    display: grid;
    gap: 0.5rem;
  }
```

- [ ] **Step 5: Verify**

Run: `npm test && npm run check`
Expected: all tests pass; 0 errors and 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add src/lib/sets.ts src/lib/sets.test.ts src/components/SetupScreen.svelte
git commit -m "feat: offer 5 to 50 exercises in one column" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Light red Stop button

**Files:**
- Modify: `src/components/PlayScreen.svelte:80` and its style block

No unit test: this is a style-only change, and PlayScreen tests already find Stop by its name.

- [ ] **Step 1: Give Stop its own class**

In `src/components/PlayScreen.svelte`, replace:

```svelte
    <button type="button" class="secondary" onclick={finish}>Stop</button>
```

with:

```svelte
    <button type="button" class="stop" onclick={finish}>Stop</button>
```

At the end of the `<style>` block (after the `.set-name` rule), add:

```css

  /* Light red, so ending the session stands apart from the neutral buttons (spec §3.3). */
  .stop {
    padding: 0 1rem;
    background: var(--wrong-bg);
    color: var(--wrong);
    font-weight: 600;
  }
```

- [ ] **Step 2: Verify**

Run: `npm test && npm run check`
Expected: all tests pass; 0 errors and 0 warnings.

- [ ] **Step 3: Commit**

```bash
git add src/components/PlayScreen.svelte
git commit -m "feat: make the Stop button light red" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Mixed numbers as fraction answers

**Files:**
- Modify: `src/lib/rational.ts` (after `parseFraction`)
- Modify: `src/lib/rational.test.ts`
- Modify: `src/lib/steps.ts:1-22`
- Modify: `src/lib/steps.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/lib/rational.test.ts`, add `parseMixedNumber` to the import list from `./rational`, keeping it alphabetical (directly after `parseFraction`). Then add at the end of the file:

```ts
describe('parseMixedNumber', () => {
  it.each([
    ['12 1/2', rational(25n, 2n)],
    ['-12 1/2', rational(-25n, 2n)],
    ['−1 2/3', rational(-5n, 3n)],
    ['12 5/3', rational(41n, 3n)],
    ['0 1/2', rational(1n, 2n)],
    [' 2 0/7 ', rational(2n)],
  ])('parses %j', (input, expected) => {
    expect(parseMixedNumber(input)).toEqual(expected);
  });

  it.each(['', '12', '1/2', '12 1/0', '12 /2', '12 1/', '12  1/2', '12,5 1/2', '12 -1/2', ' 1/2'])(
    'rejects %j',
    (input) => {
      expect(parseMixedNumber(input)).toBeNull();
    },
  );
});
```

In `src/lib/steps.test.ts`, replace the test `'parses fractions and decimals for fraction steps'` with:

```ts
  it('parses fractions, mixed numbers and decimals for fraction steps', () => {
    expect(parseAnswer('fraction', '25/2')).toEqual(rational(25n, 2n));
    expect(parseAnswer('fraction', '12 1/2')).toEqual(rational(25n, 2n));
    expect(parseAnswer('fraction', '-12 1/2')).toEqual(rational(-25n, 2n));
    expect(parseAnswer('fraction', '12,5')).toEqual(rational(25n, 2n));
    expect(parseAnswer('fraction', '25/')).toBeNull();
    expect(parseAnswer('fraction', '12 /2')).toBeNull();
    expect(parseAnswer('fraction', '')).toBeNull();
  });
```

and in the same `describe('parseAnswer')` block, replace:

```ts
    expect(parseAnswer('number', '25/2')).toBeNull();
```

with:

```ts
    expect(parseAnswer('number', '25/2')).toBeNull();
    expect(parseAnswer('number', '12 1/2')).toBeNull();
```

In `describe('fractionStep')`, replace:

```ts
    for (const input of ['25/2', '50/4', '12,5', '12,50']) {
```

with:

```ts
    for (const input of ['25/2', '50/4', '12 1/2', '11 3/2', '12,5', '12,50']) {
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/rational.test.ts src/lib/steps.test.ts`
Expected: FAIL. `parseMixedNumber` is not exported, and `parseAnswer('fraction', '12 1/2')` returns `null`.

- [ ] **Step 3: Implement `parseMixedNumber`**

In `src/lib/rational.ts`, directly after the `parseFraction` function, add:

```ts

// Optional ASCII or typographic minus, the whole part, one space, then numerator/denominator.
const MIXED_NUMBER = /^([-−])?(\d+) (\d+)\/(\d+)$/;

/**
 * Parses a mixed number such as "12 1/2" or "−12 1/2" (= −25/2). The sign applies to the whole
 * number. An improper part ("12 5/3") is fine. Returns null for anything else, incl. "1 1/0".
 */
export function parseMixedNumber(input: string): Rational | null {
  const match = MIXED_NUMBER.exec(input.trim());
  if (!match) return null;
  const [, sign, whole = '', numerator = '', denominator = ''] = match;
  const den = BigInt(denominator);
  if (den === 0n) return null;
  const value = add(rational(BigInt(whole)), rational(BigInt(numerator), den));
  return sign ? rational(-value.num, value.den) : value;
}
```

- [ ] **Step 4: Accept mixed numbers in fraction steps**

In `src/lib/steps.ts`, replace the import:

```ts
import { decimalPlaces, equals, parseDutchNumber, parseFraction, type Rational } from './rational';
```

with:

```ts
import {
  decimalPlaces,
  equals,
  parseDutchNumber,
  parseFraction,
  parseMixedNumber,
  type Rational,
} from './rational';
```

and replace:

```ts
/** Turns keypad input into a value. A fraction step also accepts 'a/b' (spec §6). */
export function parseAnswer(kind: AnswerKind, input: string): Rational | null {
  return kind === 'fraction'
    ? (parseFraction(input) ?? parseDutchNumber(input))
    : parseDutchNumber(input);
}
```

with:

```ts
/** Turns keypad input into a value. A fraction step also accepts 'a/b' and '12 1/2' (spec §6). */
export function parseAnswer(kind: AnswerKind, input: string): Rational | null {
  return kind === 'fraction'
    ? (parseFraction(input) ?? parseMixedNumber(input) ?? parseDutchNumber(input))
    : parseDutchNumber(input);
}
```

Also update the doc comment of `fractionStep`:

```ts
/** Any value equal to the answer is correct: '25/2', '50/4' and '12,5' alike. */
```

becomes:

```ts
/** Any value equal to the answer is correct: '25/2', '50/4', '12 1/2' and '12,5' alike. */
```

- [ ] **Step 5: Verify**

Run: `npm test && npm run check`
Expected: all tests pass; 0 errors and 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add src/lib/rational.ts src/lib/rational.test.ts src/lib/steps.ts src/lib/steps.test.ts
git commit -m "feat: accept mixed numbers as fraction answers" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Fraction splitter (`lib/fractionText.ts`)

**Files:**
- Create: `src/lib/fractionText.ts`
- Test: `src/lib/fractionText.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/fractionText.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { splitFractions } from './fractionText';

const text = (value: string) => ({ type: 'text', text: value });
const fraction = (num: string, den: string) => ({ type: 'fraction', num, den });

describe('splitFractions', () => {
  it.each([
    ['', []],
    ['7 : 2 = ?', [text('7 : 2 = ?')]],
    ['25/2', [fraction('25', '2')]],
    ['12,5 of 25/2', [text('12,5 of '), fraction('25', '2')]],
    ['−3/4', [text('−'), fraction('3', '4')]],
    ['−12 1/2', [text('−12 '), fraction('1', '2')]],
    ['12½% van 80 = ?', [text('12'), fraction('1', '2'), text('% van 80 = ?')]],
    ['12½% = 80 : 8 = 10', [text('12'), fraction('1', '2'), text('% = 80 : 8 = 10')]],
    ['1/3 en 2/3', [fraction('1', '3'), text(' en '), fraction('2', '3')]],
    ['1\u{202f}000/3', [fraction('1\u{202f}000', '3')]],
  ])('splits %j', (input, expected) => {
    expect(splitFractions(input)).toEqual(expected);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/fractionText.test.ts`
Expected: FAIL. The module `./fractionText` does not exist.

- [ ] **Step 3: Implement the splitter**

Create `src/lib/fractionText.ts`:

```ts
export type TextSegment =
  | { type: 'text'; text: string }
  | { type: 'fraction'; num: string; den: string };

// 'a/b', where the digits may be grouped with thin spaces, or the ½ glyph of 12½% (spec §8).
const FRACTION = /(\d[\d\u{202f}]*)\/(\d[\d\u{202f}]*)|½/gu;

/** Splits text into plain runs and fractions, so the UI can draw the fractions stacked. */
export function splitFractions(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(FRACTION)) {
    const index = match.index ?? 0;
    if (index > last) segments.push({ type: 'text', text: text.slice(last, index) });
    // The ½ glyph has no capture groups.
    const [found, num = '1', den = '2'] = match;
    segments.push({ type: 'fraction', num, den });
    last = index + found.length;
  }
  if (last < text.length) segments.push({ type: 'text', text: text.slice(last) });
  return segments;
}
```

- [ ] **Step 4: Verify**

Run: `npm test && npm run check`
Expected: all tests pass; 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/fractionText.ts src/lib/fractionText.test.ts
git commit -m "feat: split text into plain runs and fractions" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Stacked fractions in prompts, feedback and results

**Files:**
- Create: `src/components/Fraction.svelte`
- Create: `src/components/MathText.svelte`
- Test: `src/components/MathText.test.ts`
- Modify: `src/components/Feedback.svelte`, `src/components/Feedback.test.ts`
- Modify: `src/components/ResultScreen.svelte`
- Modify: `src/components/QuestionView.svelte` (prompt only)

- [ ] **Step 1: Write the failing tests**

Create `src/components/MathText.test.ts`:

```ts
// @vitest-environment jsdom
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import MathText from './MathText.svelte';

describe('MathText', () => {
  it('renders plain text as is', () => {
    const { container } = render(MathText, { props: { text: '3 × 4 = ?' } });
    expect(container.textContent).toBe('3 × 4 = ?');
    expect(container.querySelector('.fraction')).toBeNull();
  });

  it('stacks a fraction and keeps a hidden slash for screen readers', () => {
    const { container } = render(MathText, { props: { text: '12,5 of 25/2' } });
    const fraction = container.querySelector('.fraction');
    expect(fraction?.querySelector('.numerator')?.textContent).toBe('25');
    expect(fraction?.querySelector('.denominator')?.textContent).toBe('2');
    expect(fraction?.querySelector('.sr-only')?.textContent).toBe('/');
    expect(container.textContent).toBe('12,5 of 25/2');
  });

  it('stacks the ½ of 12½% next to the whole part', () => {
    const { container } = render(MathText, { props: { text: '12½% van 80 = ?' } });
    expect(container.querySelector('.numerator')?.textContent).toBe('1');
    expect(container.querySelector('.denominator')?.textContent).toBe('2');
    expect(container.textContent).toBe('121/2% van 80 = ?');
  });
});
```

In `src/components/Feedback.test.ts`, add inside `describe('Feedback', …)`, after the last test:

```ts

  it('stacks fractions in the given and the correct answer', () => {
    const { container } = render(Feedback, {
      props: {
        prompt: '10 is ?% van 80',
        kind: 'fraction',
        input: '-12 1/2',
        result: { correct: false, expected: '12,5 of 25/2' },
        onnext: vi.fn(),
      },
    });
    const answers = [...container.querySelectorAll('dd')].map((dd) => dd.textContent);
    expect(answers).toEqual(['−12 1/2', '12,5 of 25/2']);
    expect(container.querySelectorAll('.fraction')).toHaveLength(2);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/components/MathText.test.ts src/components/Feedback.test.ts`
Expected: FAIL. `./MathText.svelte` does not exist, and Feedback renders no `.fraction`.

- [ ] **Step 3: Create `Fraction.svelte`**

Create `src/components/Fraction.svelte`:

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    numerator: Snippet;
    denominator: Snippet;
  }

  let { numerator, denominator }: Props = $props();
</script>

<!-- A handwritten-style fraction (spec §8). The hidden slash keeps it readable as '25/2'. -->
<span class="fraction"
  ><span class="numerator">{@render numerator()}</span><span class="sr-only">/</span><span
    class="denominator">{@render denominator()}</span
  ></span
>

<style>
  .fraction {
    position: relative;
    display: inline-flex;
    flex-direction: column;
    align-items: stretch;
    margin-inline: 0.1em;
    font-size: 0.8em;
    line-height: 1.15;
    text-align: center;
    vertical-align: middle;
  }

  .numerator {
    padding-inline: 0.15em;
    border-bottom: max(2px, 0.07em) solid currentColor;
  }

  .denominator {
    padding-inline: 0.15em;
  }
</style>
```

- [ ] **Step 4: Create `MathText.svelte`**

Create `src/components/MathText.svelte`. Keep the `{#each}` block markup exactly as shown, so no whitespace ends up between the segments:

```svelte
<script lang="ts">
  import { splitFractions } from '../lib/fractionText';
  import Fraction from './Fraction.svelte';

  interface Props {
    text: string;
  }

  let { text }: Props = $props();

  const segments = $derived(splitFractions(text));
</script>

{#each segments as segment, index (index)}{#if segment.type === 'text'}{segment.text}{:else}<Fraction
      >{#snippet numerator()}{segment.num}{/snippet}{#snippet denominator()}{segment.den}{/snippet}</Fraction
    >{/if}{/each}
```

- [ ] **Step 5: Use `MathText` in `Feedback.svelte`**

In `src/components/Feedback.svelte`, add to the imports of the instance script:

```ts
  import MathText from './MathText.svelte';
```

and replace the markup from `<p class="prompt">` to the end of the explanation block:

```svelte
  <p class="prompt">{prompt}</p>
  <div class="details">
    {#if result.correct}
      <p class="verdict">Goed!</p>
    {:else}
      <p class="verdict">Fout</p>
      <dl>
        <dt>Jouw antwoord</dt>
        <dd>{displayAnswer(kind, input)}</dd>
        <dt>Juist antwoord</dt>
        <dd>{result.expected}</dd>
      </dl>
      {#if result.explanation}
        <p class="explanation">{result.explanation}</p>
      {/if}
    {/if}
  </div>
```

with:

```svelte
  <p class="prompt"><MathText text={prompt} /></p>
  <div class="details">
    {#if result.correct}
      <p class="verdict">Goed!</p>
    {:else}
      <p class="verdict">Fout</p>
      <dl>
        <dt>Jouw antwoord</dt>
        <dd><MathText text={displayAnswer(kind, input)} /></dd>
        <dt>Juist antwoord</dt>
        <dd><MathText text={result.expected} /></dd>
      </dl>
      {#if result.explanation}
        <p class="explanation"><MathText text={result.explanation} /></p>
      {/if}
    {/if}
  </div>
```

- [ ] **Step 6: Use `MathText` in `ResultScreen.svelte`**

In `src/components/ResultScreen.svelte`, add to the imports:

```ts
  import MathText from './MathText.svelte';
```

and replace:

```svelte
            <p class="prompt">{prompt}</p>
            <p>Jouw antwoord: <strong>{displayAnswer(kind, attempt.input)}</strong></p>
            <p>Juist antwoord: <strong>{attempt.result.expected}</strong></p>
            {#if attempt.result.explanation}
              <p class="explanation">{attempt.result.explanation}</p>
            {/if}
```

with:

```svelte
            <p class="prompt"><MathText text={prompt} /></p>
            <p>
              Jouw antwoord: <strong><MathText text={displayAnswer(kind, attempt.input)} /></strong>
            </p>
            <p>Juist antwoord: <strong><MathText text={attempt.result.expected} /></strong></p>
            {#if attempt.result.explanation}
              <p class="explanation"><MathText text={attempt.result.explanation} /></p>
            {/if}
```

- [ ] **Step 7: Use `MathText` for the prompt in `QuestionView.svelte`**

In `src/components/QuestionView.svelte`, add to the imports:

```ts
  import MathText from './MathText.svelte';
```

and replace:

```svelte
  <p class="prompt">{step.prompt}</p>
```

with:

```svelte
  <p class="prompt"><MathText text={step.prompt} /></p>
```

- [ ] **Step 8: Verify**

Run: `npm test && npm run check`
Expected: all tests pass; 0 errors and 0 warnings. The existing `getByText('3 × 4 = ?')` and `getByText('−12')` assertions still pass, because plain text stays a single text node.

- [ ] **Step 9: Commit**

```bash
git add src/components/Fraction.svelte src/components/MathText.svelte src/components/MathText.test.ts src/components/Feedback.svelte src/components/Feedback.test.ts src/components/ResultScreen.svelte src/components/QuestionView.svelte
git commit -m "feat: show fractions stacked in prompts, feedback and results" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Fraction template reducer (`lib/keypadInput.ts`)

**Files:**
- Modify: `src/lib/keypadInput.ts`
- Modify: `src/lib/keypadInput.test.ts`

This task only **adds** functions. `applyKey` keeps its `'/'` handling until Task 7, because the current fraction model still uses it.

- [ ] **Step 1: Write the failing tests**

In `src/lib/keypadInput.test.ts`, replace the import block:

```ts
import {
  applyFactorizationKey,
  applyKey,
  MAX_FACTORIZATION_LENGTH,
  MAX_INPUT_LENGTH,
  type KeypadKey,
} from './keypadInput';
```

with:

```ts
import {
  applyFactorizationKey,
  applyFractionKey,
  applyKey,
  EMPTY_FRACTION_INPUT,
  fractionInputToString,
  MAX_FACTORIZATION_LENGTH,
  MAX_INPUT_LENGTH,
  MAX_SLOT_LENGTH,
  selectFractionSlot,
  type FractionInput,
  type KeypadKey,
} from './keypadInput';
```

and add at the end of the file:

```ts

function typeFraction(keys: KeypadKey[], start: FractionInput = EMPTY_FRACTION_INPUT): FractionInput {
  return keys.reduce(applyFractionKey, start);
}

function fractionText(keys: KeypadKey[]): string {
  return fractionInputToString(typeFraction(keys));
}

describe('applyFractionKey', () => {
  it('types a whole number like the number input', () => {
    expect(fractionText(['1', '2', ',', '5'])).toBe('12,5');
    expect(fractionText(['-', '3'])).toBe('-3');
    expect(fractionText(['1', ',', ','])).toBe('1,');
  });

  it('opens an empty template with the cursor in the numerator', () => {
    expect(typeFraction(['/'])).toEqual({
      negative: false,
      whole: '',
      template: { num: '', den: '', slot: 'num' },
    });
    expect(fractionText(['/', '2', '5', '/', '2'])).toBe('25/2');
  });

  it('builds a mixed number after a whole number', () => {
    expect(fractionText(['1', '2', '/', '2', '/', '3'])).toBe('12 2/3');
  });

  it('toggles between numerator and denominator with the breuk key', () => {
    const state = typeFraction(['/', '1', '/', '/', '2']);
    expect(fractionInputToString(state)).toBe('12/');
    expect(state.template?.slot).toBe('num');
  });

  it('does not open a template after a comma and ignores the comma inside one', () => {
    expect(fractionText(['1', ',', '5', '/'])).toBe('1,5');
    expect(typeFraction(['1', ',', '5', '/']).template).toBeNull();
    expect(fractionText(['/', '1', ','])).toBe('1/');
  });

  it('applies the minus to the whole number', () => {
    expect(fractionText(['1', '/', '1', '/', '2', '-'])).toBe('-1 1/2');
    expect(fractionText(['/', '3', '-'])).toBe('-3/');
    expect(fractionText(['-', '-'])).toBe('');
  });

  it('deletes in the active slot, then moves to the numerator, then closes the template', () => {
    let state = typeFraction(['1', '2', '/', '3', '/', '4']);
    const seen: string[] = [];
    for (let i = 0; i < 5; i++) {
      state = applyFractionKey(state, 'backspace');
      seen.push(fractionInputToString(state));
    }
    expect(seen).toEqual(['12 3/', '12 3/', '12 /', '12', '1']);
  });

  it('keeps a filled denominator when backspace hits an empty numerator', () => {
    const state = selectFractionSlot(typeFraction(['/', '/', '4']), 'num');
    expect(fractionInputToString(applyFractionKey(state, 'backspace'))).toBe('/4');
  });

  it('clears a lone minus on backspace', () => {
    expect(typeFraction(['-', 'backspace'])).toEqual(EMPTY_FRACTION_INPUT);
  });

  it('limits each slot to MAX_SLOT_LENGTH digits', () => {
    const nines = Array<KeypadKey>(MAX_SLOT_LENGTH + 1).fill('9');
    expect(fractionText(['/', ...nines])).toBe(`${'9'.repeat(MAX_SLOT_LENGTH)}/`);
  });

  it('ignores the factorization keys', () => {
    expect(fractionText(['/', '1', '×', '^'])).toBe('1/');
  });
});

describe('selectFractionSlot', () => {
  it('moves the cursor within an open template only', () => {
    expect(selectFractionSlot(typeFraction(['/']), 'den').template?.slot).toBe('den');
    expect(selectFractionSlot(EMPTY_FRACTION_INPUT, 'den')).toBe(EMPTY_FRACTION_INPUT);
  });
});

describe('fractionInputToString', () => {
  it('writes fractions, mixed numbers and decimals as parseAnswer reads them', () => {
    expect(fractionInputToString(EMPTY_FRACTION_INPUT)).toBe('');
    expect(fractionText(['/'])).toBe('/');
    expect(fractionText(['-', '1', '2', '/', '1', '/', '2'])).toBe('-12 1/2');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/keypadInput.test.ts`
Expected: FAIL. `applyFractionKey` and the other new exports do not exist.

- [ ] **Step 3: Implement the reducer**

In `src/lib/keypadInput.ts`, add at the end of the file:

```ts

export type FractionSlot = 'num' | 'den';

/** An open fraction template: numerator, denominator and the slot that has the cursor. */
export interface FractionTemplate {
  num: string;
  den: string;
  slot: FractionSlot;
}

/** Fraction typing state (spec §6): the sign, a whole part and an optional template. */
export interface FractionInput {
  negative: boolean;
  /** Digits and at most one comma. Next to a template it is the whole part of a mixed number. */
  whole: string;
  /** Null while no template is open. */
  template: FractionTemplate | null;
}

export const EMPTY_FRACTION_INPUT: FractionInput = { negative: false, whole: '', template: null };

/** Digits per numerator or denominator; far beyond any exercise. */
export const MAX_SLOT_LENGTH = 6;

/**
 * Fraction input with a template (spec §6). The breuk key ('/') opens a template, after a whole
 * number too (a mixed number), and inside a template it moves the cursor to the other slot.
 */
export function applyFractionKey(state: FractionInput, key: KeypadKey): FractionInput {
  const { negative, whole, template } = state;
  if (key === '-') return { ...state, negative: !negative };
  if (template === null) {
    if (key === '/') {
      return whole.includes(',') ? state : { ...state, template: { num: '', den: '', slot: 'num' } };
    }
    if (key === 'backspace' && whole === '') return { ...state, negative: false };
    // Without a template the whole part behaves like a number input.
    return { ...state, whole: applyKey(whole, key) };
  }
  const active = template[template.slot];
  switch (key) {
    case '/':
      return selectFractionSlot(state, template.slot === 'num' ? 'den' : 'num');
    case 'backspace':
      if (active !== '') return withActiveSlot(state, template, active.slice(0, -1));
      if (template.slot === 'den') return selectFractionSlot(state, 'num');
      return template.den === '' ? { ...state, template: null } : state;
    default:
      // Only digits go into a slot; the comma and the factorization keys are ignored.
      return /^\d$/.test(key) && active.length < MAX_SLOT_LENGTH
        ? withActiveSlot(state, template, active + key)
        : state;
  }
}

function withActiveSlot(
  state: FractionInput,
  template: FractionTemplate,
  digits: string,
): FractionInput {
  return {
    ...state,
    template: template.slot === 'num' ? { ...template, num: digits } : { ...template, den: digits },
  };
}

/** Moves the cursor to a slot of the open template: the breuk key, or a tap on the slot. */
export function selectFractionSlot(state: FractionInput, slot: FractionSlot): FractionInput {
  return state.template === null ? state : { ...state, template: { ...state.template, slot } };
}

/** '25/2', '12 1/2', '-12,5': the input string that parseAnswer('fraction', …) reads. */
export function fractionInputToString({ negative, whole, template }: FractionInput): string {
  const fraction = template === null ? '' : `${template.num}/${template.den}`;
  const separator = whole !== '' && template !== null ? ' ' : '';
  return (negative ? '-' : '') + whole + separator + fraction;
}
```

- [ ] **Step 4: Verify**

Run: `npm test && npm run check`
Expected: all tests pass; 0 errors and 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/keypadInput.ts src/lib/keypadInput.test.ts
git commit -m "feat: add the fraction template reducer" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Generic input models and the breuk template in the UI

**Files:**
- Modify: `src/lib/keypadInput.ts` (`applyKey` loses `'/'`)
- Modify: `src/lib/keypadInput.test.ts`
- Modify (rewrite): `src/lib/inputModels.ts`, `src/lib/inputModels.test.ts`
- Create: `src/components/KeypadAnswer.svelte`
- Modify (rewrite): `src/components/Keypad.svelte`, `src/components/QuestionView.svelte`
- Modify: `src/components/QuestionView.test.ts`

The model interface and its UI change together, so `npm run check` stays green. This task makes one commit.

- [ ] **Step 1: Write the failing model tests**

Replace the whole content of `src/lib/inputModels.test.ts` with:

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
import type { FractionInput, KeypadKey } from './keypadInput';

function labels(kind: KeypadKind): string[] {
  return INPUT_MODELS[kind].keys.map(({ label }) => label);
}

function ariaLabels(kind: KeypadKind): string[] {
  return INPUT_MODELS[kind].keys.map(({ label, ariaLabel }) => ariaLabel ?? label);
}

const DIGIT_ROWS = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];
const fraction = INPUT_MODELS.fraction;

function typeFraction(keys: KeypadKey[]): FractionInput {
  return keys.reduce((state, key) => fraction.apply(state, key), fraction.empty);
}

describe('INPUT_MODELS keys', () => {
  it('lays out the number keypad', () => {
    expect(labels('number')).toEqual([...DIGIT_ROWS, '−', '0', ',', '⌫']);
    expect(ariaLabels('number').slice(-4)).toEqual(['min', '0', 'komma', 'wissen']);
  });

  it('adds the breuk key with a fraction icon for fractions', () => {
    expect(labels('fraction')).toEqual([...DIGIT_ROWS, '−', '0', ',', '⌫', 'breuk']);
    expect(fraction.keys.at(-1)).toEqual({ key: '/', label: 'breuk', icon: 'fraction' });
  });

  it('offers × and ^ instead of minus and comma for factorizations', () => {
    expect(labels('factorization')).toEqual([...DIGIT_ROWS, '×', '0', '^', '⌫']);
    expect(ariaLabels('factorization').slice(-4)).toEqual(['keer', '0', 'tot de macht', 'wissen']);
  });

  it('lets OK fill the last row of the 3-column grid', () => {
    expect(okSpan(INPUT_MODELS.number.keys)).toBe(2);
    expect(okSpan(INPUT_MODELS.fraction.keys)).toBe(1);
    expect(okSpan(INPUT_MODELS.factorization.keys)).toBe(2);
  });
});

describe('text input models', () => {
  it('use the input string as their state', () => {
    expect(INPUT_MODELS.number.empty).toBe('');
    expect(INPUT_MODELS.number.apply('2', '×')).toBe('2');
    expect(INPUT_MODELS.number.apply('2', '/')).toBe('2');
    expect(INPUT_MODELS.factorization.apply('2', '^')).toBe('2^');
    expect(INPUT_MODELS.factorization.apply('2', ',')).toBe('2');
    expect(INPUT_MODELS.number.toInput('-12,5')).toBe('-12,5');
  });

  it('enable OK for any non-empty input', () => {
    expect(INPUT_MODELS.number.canSubmit('')).toBe(false);
    expect(INPUT_MODELS.number.canSubmit('-')).toBe(true);
    expect(INPUT_MODELS.factorization.canSubmit('2×')).toBe(true);
  });

  it('show the pretty-printed input, or nothing for the placeholder', () => {
    expect(INPUT_MODELS.number.view('')).toEqual([]);
    expect(INPUT_MODELS.number.view('-12,5')).toEqual([{ type: 'text', text: '−12,5' }]);
    expect(INPUT_MODELS.factorization.view('2^2×3')).toEqual([{ type: 'text', text: '2² × 3' }]);
    expect(INPUT_MODELS.number.select).toBeUndefined();
  });
});

describe('fraction input model', () => {
  it('enables OK only once a digit has been typed', () => {
    expect(fraction.canSubmit(fraction.empty)).toBe(false);
    expect(fraction.canSubmit(typeFraction(['/']))).toBe(false);
    expect(fraction.canSubmit(typeFraction(['-']))).toBe(false);
    expect(fraction.canSubmit(typeFraction(['/', '1']))).toBe(true);
  });

  it('submits fractions and mixed numbers as strings', () => {
    expect(fraction.toInput(typeFraction(['/', '2', '5', '/', '2']))).toBe('25/2');
    expect(fraction.toInput(typeFraction(['1', '2', '/', '1', '/', '2']))).toBe('12 1/2');
  });

  it('shows the whole part as text and the template with its cursor', () => {
    expect(fraction.view(fraction.empty)).toEqual([]);
    expect(fraction.view(typeFraction(['-', '1', '2', '/', '1']))).toEqual([
      { type: 'text', text: '−12' },
      { type: 'template', num: '1', den: '', active: 'num' },
    ]);
    expect(fraction.view(typeFraction(['/']))).toEqual([
      { type: 'template', num: '', den: '', active: 'num' },
    ]);
  });

  it('moves the cursor to a tapped slot', () => {
    expect(fraction.select?.(typeFraction(['/']), 'den').template?.slot).toBe('den');
  });
});

describe('INPUT_MODELS validation and display', () => {
  it.each([
    ['number', '12', null],
    ['number', '-12,5', null],
    ['number', '-', INVALID_NUMBER],
    ['number', ',', INVALID_NUMBER],
    ['fraction', '25/2', null],
    ['fraction', '12 1/2', null],
    ['fraction', '12 5/3', null],
    ['fraction', '12,5', null],
    ['fraction', '25/', INVALID_NUMBER],
    ['fraction', '25/0', INVALID_NUMBER],
    ['fraction', '12 /2', INVALID_NUMBER],
    ['fraction', '/', INVALID_NUMBER],
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

  it('pretty-prints a submitted input', () => {
    expect(INPUT_MODELS.number.display('-12,5')).toBe('−12,5');
    expect(INPUT_MODELS.fraction.display('-12 1/2')).toBe('−12 1/2');
    expect(INPUT_MODELS.factorization.display('2^2×3')).toBe('2² × 3');
  });
});

describe('displayAnswer', () => {
  it('shows a given answer like the input field did', () => {
    expect(displayAnswer('number', '-5')).toBe('−5');
    expect(displayAnswer('fraction', '-3/4')).toBe('−3/4');
    expect(displayAnswer('factorization', '2^2×21')).toBe('2² × 21');
    expect(displayAnswer('boolean', 'Ja')).toBe('Ja');
  });
});
```

- [ ] **Step 2: Update the `applyKey` tests**

In `src/lib/keypadInput.test.ts`, delete these three tests from `describe('applyKey')`: `'allows a single fraction slash directly after a digit'`, `'does not mix the slash and the decimal comma'` and `'counts the slash toward the length limit'`. Then replace:

```ts
  it('ignores the factorization keys', () => {
    expect(type(['2', '×', '^'])).toBe('2');
  });
```

(the one inside `describe('applyKey')`) with:

```ts
  it('ignores the slash and the factorization keys', () => {
    expect(type(['2', '/', '×', '^'])).toBe('2');
  });
```

- [ ] **Step 3: Update the QuestionView tests**

In `src/components/QuestionView.test.ts`, make these changes:

1. In `'shows the unit suffix next to the answer'`, replace `expect(answerText()).toBe('?cm³');` with `expect(answerText()).toBe('…cm³');`.
2. Replace the test `'shows the prompt, an empty answer, no error and a disabled OK'` with:

```ts
  it('shows the prompt, a grey placeholder, no error and a disabled OK', () => {
    render(QuestionView, { props: { step, onanswer: vi.fn() } });
    expect(screen.getByText('3 × 4 = ?')).toBeTruthy();
    expect(answerText()).toBe('…');
    expect(screen.getByLabelText('Jouw antwoord').querySelector('.placeholder')).not.toBeNull();
    expect(errorText()).toBe('');
    expect(okButton().disabled).toBe(true);
  });
```

3. In `'shows a typographic minus, supports backspace and disables OK only when empty'`, replace the second `expect(answerText()).toBe('?');` with `expect(answerText()).toBe('…');`.
4. In `'shows the euro prefix before the answer'`, replace `expect(answerText()).toBe('€?');` with `expect(answerText()).toBe('€…');`.
5. Replace the test `'offers the fraction slash and the factorization keys only for their kinds'` with:

```ts
  it('offers the breuk key and the factorization keys only for their kinds', () => {
    render(QuestionView, { props: { step, onanswer: vi.fn() } });
    expect(screen.queryByRole('button', { name: 'breuk' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'keer' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'tot de macht' })).toBeNull();
  });
```

6. Replace the tests `'accepts a typed fraction and rejects an incomplete one inline'` and `'rejects a zero denominator inline'` with:

```ts
  describe('fraction input', () => {
    const percent = fractionStep({
      prompt: '10 is ?% van 80',
      answer: rational(25n, 2n),
      suffix: '%',
    });

    it('builds a fraction in the template and rejects an incomplete one inline', async () => {
      const onanswer = vi.fn();
      render(QuestionView, { props: { step: percent, onanswer } });
      await press('breuk');
      expect(answerText()).toBe('…/…%');
      expect(okButton().disabled).toBe(true);

      await press('2', '5', 'breuk');
      expect(answerText()).toBe('25/…%');
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

    it('builds a mixed number after a whole number', async () => {
      const onanswer = vi.fn();
      render(QuestionView, { props: { step: percent, onanswer } });
      await press('1', '2', 'breuk', '1', 'breuk', '2');
      expect(answerText()).toBe('121/2%');
      await press('OK');
      expect(onanswer).toHaveBeenCalledWith('12 1/2', expect.objectContaining({ correct: true }));
    });

    it('moves the cursor to a tapped slot', async () => {
      render(QuestionView, { props: { step: percent, onanswer: vi.fn() } });
      await press('breuk', '1', 'noemer', '4');
      expect(answerText()).toBe('1/4%');
      await press('teller', '3');
      expect(answerText()).toBe('13/4%');
    });

    it('rejects a zero denominator inline', async () => {
      const onanswer = vi.fn();
      const half = fractionStep({ prompt: '1 : 2 = ?', answer: rational(1n, 2n) });
      render(QuestionView, { props: { step: half, onanswer } });
      await press('breuk', '1', 'breuk', '0', 'OK');
      expect(errorText()).toBe('Ongeldig getal');
      expect(onanswer).not.toHaveBeenCalled();
    });
  });
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npm test -- src/lib/inputModels.test.ts src/lib/keypadInput.test.ts src/components/QuestionView.test.ts`
Expected: FAIL. The model has no `empty`, `canSubmit`, `toInput` or `view`; `applyKey('2', '/')` still returns `'2/'`; the field shows `?`; there is no breuk button.

- [ ] **Step 5: Remove the slash from `applyKey`**

In `src/lib/keypadInput.ts`, replace:

```ts
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
```

with:

```ts
/** Maximum number of digits and comma; the sign is not counted. */
export const MAX_INPUT_LENGTH = 12;

/** Number input. Fractions have their own reducer, applyFractionKey. */
export function applyKey(value: string, key: KeypadKey): string {
  const length = value.replace('-', '').length;
  const full = length >= MAX_INPUT_LENGTH;
  switch (key) {
    case 'backspace':
      return value.slice(0, -1);
    case '-':
      return value.startsWith('-') ? value.slice(1) : `-${value}`;
    case ',':
      return value.includes(',') || full ? value : `${value},`;
    default:
```

(The `default:` branch and everything after it stay unchanged.)

- [ ] **Step 6: Rewrite `inputModels.ts`**

Replace the whole content of `src/lib/inputModels.ts` with:

```ts
import { formatFactorizationInput, formatInput } from './format';
import {
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

export interface KeyDef {
  key: KeypadKey;
  label: string;
  ariaLabel?: string;
  /** Drawn instead of the label: the breuk key shows a small stacked fraction. */
  icon?: 'fraction';
}

/** The answer field while typing: plain text, or an open fraction template with its cursor. */
export type FieldSegment =
  | { type: 'text'; text: string }
  | { type: 'template'; num: string; den: string; active: FractionSlot };

/** Everything that differs per answer kind on the keypad (spec §6). S is the typing state. */
export interface InputModel<S> {
  /** Keys in reading order on a 3-column grid; OK fills the rest of the last row. */
  keys: readonly KeyDef[];
  /** The state before the first key press. */
  empty: S;
  apply(state: S, key: KeypadKey): S;
  /** Whether OK is enabled. */
  canSubmit(state: S): boolean;
  /** The submitted input: what is validated, checked and stored in the results. */
  toInput(state: S): string;
  /** Null when the input can be submitted, otherwise the inline error. */
  validate(input: string): string | null;
  /** A submitted input as shown in the feedback and in the results. */
  display(input: string): string;
  /** The answer field while typing; no segments means the placeholder is shown. */
  view(state: S): FieldSegment[];
  /** Moves the cursor to a tapped slot; only kinds with a fraction template have it. */
  select?(state: S, slot: FractionSlot): S;
}

/** Ja/Nee has no keypad: QuestionView shows two buttons instead. */
export type KeypadKind = Exclude<AnswerKind, 'boolean'>;

/** Typing state per keypad kind. A new keypad kind must add its entry here. */
interface KeypadStates {
  number: string;
  fraction: FractionInput;
  factorization: string;
}

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

/** A model whose typing state is the input string itself. */
function textModel(
  keys: readonly KeyDef[],
  apply: (value: string, key: KeypadKey) => string,
  validate: (input: string) => string | null,
  display: (input: string) => string,
): InputModel<string> {
  return {
    keys,
    empty: '',
    apply,
    canSubmit: (value) => value !== '',
    toInput: (value) => value,
    validate,
    display,
    view: (value) => (value === '' ? [] : [{ type: 'text', text: display(value) }]),
  };
}

function validateNumber(kind: 'number' | 'fraction'): (input: string) => string | null {
  return (input) => (parseAnswer(kind, input) === null ? INVALID_NUMBER : null);
}

function viewFraction({ negative, whole, template }: FractionInput): FieldSegment[] {
  const text = formatInput((negative ? '-' : '') + whole);
  const segments: FieldSegment[] = text === '' ? [] : [{ type: 'text', text }];
  if (template !== null) {
    segments.push({ type: 'template', num: template.num, den: template.den, active: template.slot });
  }
  return segments;
}

export const INPUT_MODELS: { readonly [K in KeypadKind]: InputModel<KeypadStates[K]> } = {
  number: textModel(NUMBER_KEYS, applyKey, validateNumber('number'), formatInput),
  fraction: {
    keys: [...NUMBER_KEYS, { key: '/', label: 'breuk', icon: 'fraction' }],
    empty: EMPTY_FRACTION_INPUT,
    apply: applyFractionKey,
    // At least one digit, so an empty template cannot be submitted (spec §6).
    canSubmit: (state) => /\d/.test(fractionInputToString(state)),
    toInput: fractionInputToString,
    validate: validateNumber('fraction'),
    display: formatInput,
    view: viewFraction,
    select: selectFractionSlot,
  },
  factorization: textModel(
    [
      ...DIGIT_ROWS,
      { key: '×', label: '×', ariaLabel: 'keer' },
      digit('0'),
      { key: '^', label: '^', ariaLabel: 'tot de macht' },
      BACKSPACE,
    ],
    applyFactorizationKey,
    (input) => (parseFactorization(input) === null ? INVALID_FACTORIZATION : null),
    formatFactorizationInput,
  ),
};

/** A given answer as it was shown while typing; Ja and Nee are shown as they are. */
export function displayAnswer(kind: AnswerKind, input: string): string {
  return kind === 'boolean' ? input : INPUT_MODELS[kind].display(input);
}

/** Columns that OK spans, so that it fills the last row of the 3-column keypad. */
export function okSpan(keys: readonly KeyDef[]): number {
  return 3 - (keys.length % 3);
}
```

- [ ] **Step 7: Rewrite `Keypad.svelte`**

Replace the whole content of `src/components/Keypad.svelte` with:

```svelte
<script lang="ts">
  import { okSpan, type KeyDef } from '../lib/inputModels';
  import type { KeypadKey } from '../lib/keypadInput';
  import Fraction from './Fraction.svelte';

  interface Props {
    keys: readonly KeyDef[];
    canSubmit: boolean;
    onkey: (key: KeypadKey) => void;
    onsubmit: () => void;
  }

  let { keys, canSubmit, onkey, onsubmit }: Props = $props();
</script>

<div class="keypad">
  {#each keys as { key, label, ariaLabel, icon } (key)}
    <button type="button" class="key" aria-label={ariaLabel ?? label} onclick={() => onkey(key)}>
      {#if icon === 'fraction'}<Fraction
          >{#snippet numerator()}□{/snippet}{#snippet denominator()}□{/snippet}</Fraction
        >{:else}{label}{/if}
    </button>
  {/each}
  <button
    type="button"
    class="key ok"
    style:grid-column="span {okSpan(keys)}"
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
</style>
```

- [ ] **Step 8: Create `KeypadAnswer.svelte`**

Create `src/components/KeypadAnswer.svelte`. Keep the markup inside `<output>` exactly as shown, so no whitespace ends up between the prefix, the segments and the suffix:

```svelte
<script lang="ts" generics="S">
  import type { InputModel } from '../lib/inputModels';
  import type { FractionSlot, KeypadKey } from '../lib/keypadInput';
  import Fraction from './Fraction.svelte';
  import Keypad from './Keypad.svelte';

  interface Props {
    model: InputModel<S>;
    prefix?: string;
    suffix?: string;
    /** Called with valid input only; invalid input shows an inline error instead (spec §6). */
    onsubmit: (input: string) => void;
  }

  let { model, prefix, suffix, onsubmit }: Props = $props();

  // QuestionView is keyed per step, so the model never changes during this component's life.
  // svelte-ignore state_referenced_locally
  let value = $state.raw(model.empty);
  let error = $state<string | null>(null);

  const segments = $derived(model.view(value));

  function handleKey(key: KeypadKey) {
    value = model.apply(value, key);
    error = null;
  }

  function select(slot: FractionSlot) {
    if (model.select) value = model.select(value, slot);
  }

  function submit() {
    if (!model.canSubmit(value)) return;
    const input = model.toInput(value);
    error = model.validate(input);
    if (error === null) onsubmit(input);
  }
</script>

{#snippet slotButton(name: FractionSlot, digits: string, active: FractionSlot)}<button
    type="button"
    class="slot"
    class:active={name === active}
    aria-label={name === 'num' ? 'teller' : 'noemer'}
    onclick={() => select(name)}
    >{#if digits === ''}<span class="placeholder">…</span>{:else}{digits}{/if}</button
  >{/snippet}

<!-- Kinds with a fraction template get a taller field, so opening one does not shift the layout. -->
<output
  class="answer"
  class:tall={model.select !== undefined}
  aria-label="Jouw antwoord"
  aria-live="off"
  >{#if prefix}<span class="prefix">{prefix}</span>{/if}{#each segments as segment, index (index)}{#if segment.type === 'text'}{segment.text}{:else}<Fraction
        >{#snippet numerator()}{@render slotButton('num', segment.num, segment.active)}{/snippet}{#snippet denominator()}{@render slotButton(
            'den',
            segment.den,
            segment.active,
          )}{/snippet}</Fraction
      >{/if}{:else}<span class="placeholder">…</span>{/each}{#if suffix}<span class="suffix"
      >{suffix}</span
    >{/if}</output
>
<p class="error" role="alert">{error ?? ''}</p>
<Keypad keys={model.keys} canSubmit={model.canSubmit(value)} onkey={handleKey} onsubmit={submit} />

<style>
  .answer {
    display: block;
    min-height: 4rem;
    padding: 0.75rem 1rem;
    font-size: 2rem;
    text-align: center;
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: var(--radius);
  }

  .answer.tall {
    min-height: 7rem;
  }

  .placeholder {
    color: var(--muted);
  }

  .slot {
    min-width: 2.5rem;
    min-height: 2.25rem;
    padding: 0 0.25rem;
    background: none;
    border: 2px solid transparent;
    border-radius: 0.375rem;
  }

  .slot.active {
    border-color: var(--primary);
  }

  .suffix {
    margin-left: 0.5rem;
    color: var(--muted);
  }

  .prefix {
    margin-right: 0.5rem;
    color: var(--muted);
  }

  .error {
    min-height: 1.25rem;
    margin-block: -0.5rem;
    font-size: 1rem;
    text-align: center;
    font-weight: 600;
    color: var(--wrong);
  }
</style>
```

Note: the `svelte-ignore` comment silences the warning about reading a prop when the state is created. If `npm run check` reports that the ignore is unused, remove the comment line. Do not change anything else.

- [ ] **Step 9: Rewrite `QuestionView.svelte`**

Replace the whole content of `src/components/QuestionView.svelte` with:

```svelte
<script lang="ts">
  import { INPUT_MODELS } from '../lib/inputModels';
  import { NO, YES } from '../lib/steps';
  import type { CheckResult, Step } from '../lib/types';
  import KeypadAnswer from './KeypadAnswer.svelte';
  import MathText from './MathText.svelte';

  interface Props {
    step: Step;
    onanswer: (input: string, result: CheckResult) => void;
  }

  let { step, onanswer }: Props = $props();

  // Guards against a double tap submitting twice before the feedback replaces this view.
  let answered = false;

  function answer(input: string) {
    if (answered) return;
    answered = true;
    onanswer(input, step.check(input));
  }
</script>

<div class="question">
  <p class="prompt"><MathText text={step.prompt} /></p>
  {#if step.kind === 'boolean'}
    <!-- Ja/Nee has no keypad: a tap on a choice is the answer (spec §6). -->
    <div class="choices">
      {#each [YES, NO] as choice (choice)}
        <button type="button" class="choice" onclick={() => answer(choice)}>{choice}</button>
      {/each}
    </div>
  {:else if step.kind === 'fraction'}
    <KeypadAnswer
      model={INPUT_MODELS.fraction}
      prefix={step.prefix}
      suffix={step.suffix}
      onsubmit={answer}
    />
  {:else}
    <KeypadAnswer
      model={INPUT_MODELS[step.kind]}
      prefix={step.prefix}
      suffix={step.suffix}
      onsubmit={answer}
    />
  {/if}
</div>

<style>
  .question {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex: 1;
    justify-content: flex-end;
  }

  .prompt {
    font-size: 2.5rem;
    font-weight: 600;
    text-align: center;
    text-wrap: balance;
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
</style>
```

- [ ] **Step 10: Verify**

Run: `npm test && npm run check`
Expected: all tests pass; 0 errors and 0 warnings.

If `npm run check` reports a type error on `model={INPUT_MODELS[step.kind]}`, the template did not narrow `step.kind`. Fix it by adding `const kind = $derived(step.kind);` to the script and using `kind` in the `{#if}` chain and as the index. Do not cast.

- [ ] **Step 11: Commit**

```bash
git add src/lib/keypadInput.ts src/lib/keypadInput.test.ts src/lib/inputModels.ts src/lib/inputModels.test.ts src/components/KeypadAnswer.svelte src/components/Keypad.svelte src/components/QuestionView.svelte src/components/QuestionView.test.ts
git commit -m "feat: add the breuk key with a fraction template and mixed numbers" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Keys act on press

**Files:**
- Create: `src/components/press.ts`
- Test: `src/components/press.test.ts`
- Modify: `src/components/Keypad.svelte`
- Modify: `src/main.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/press.test.ts`:

```ts
// @vitest-environment jsdom
import { fireEvent } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { press } from './press';

function setup() {
  const button = document.createElement('button');
  const handler = vi.fn();
  const action = press(button, handler);
  return { button, handler, action };
}

describe('press', () => {
  it('fires on pointerdown and ignores the click that follows the press', async () => {
    const { button, handler } = setup();
    await fireEvent.pointerDown(button);
    expect(handler).toHaveBeenCalledOnce();
    await fireEvent.click(button, { detail: 1 });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('fires on keyboard activation, which clicks with detail 0', async () => {
    const { button, handler } = setup();
    await fireEvent.click(button, { detail: 0 });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('ignores secondary buttons and disabled keys', async () => {
    const { button, handler } = setup();
    await fireEvent.pointerDown(button, { button: 2 });
    button.disabled = true;
    await fireEvent.pointerDown(button);
    expect(handler).not.toHaveBeenCalled();
  });

  it('uses the latest handler and stops after destroy', async () => {
    const { button, handler, action } = setup();
    const next = vi.fn();
    action.update?.(next);
    await fireEvent.pointerDown(button);
    expect(next).toHaveBeenCalledOnce();
    expect(handler).not.toHaveBeenCalled();

    action.destroy?.();
    await fireEvent.pointerDown(button);
    expect(next).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/press.test.ts`
Expected: FAIL. The module `./press` does not exist.

- [ ] **Step 3: Implement the action**

Create `src/components/press.ts`:

```ts
import type { ActionReturn } from 'svelte/action';

/**
 * Runs the handler as soon as a key goes down, not on release, so typing feels immediate
 * (spec §6). Keyboard activation still works: it fires a click with detail 0. The click that
 * follows a pointer press has detail ≥ 1 and is ignored, so one press never counts twice.
 */
export function press(node: HTMLButtonElement, handler: () => void): ActionReturn<() => void> {
  let current = handler;
  const onPointerDown = (event: PointerEvent) => {
    // Primary button only. Disabled buttons can still receive pointer events in some browsers.
    if (event.button > 0 || node.disabled) return;
    current();
  };
  const onClick = (event: MouseEvent) => {
    if (event.detail === 0) current();
  };
  node.addEventListener('pointerdown', onPointerDown);
  node.addEventListener('click', onClick);
  return {
    update(next) {
      current = next;
    },
    destroy() {
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('click', onClick);
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/components/press.test.ts`
Expected: PASS.

- [ ] **Step 5: Use the action for the keys**

In `src/components/Keypad.svelte`, add to the imports:

```ts
  import { press } from './press';
```

and replace:

```svelte
    <button type="button" class="key" aria-label={ariaLabel ?? label} onclick={() => onkey(key)}>
```

with:

```svelte
    <button type="button" class="key" aria-label={ariaLabel ?? label} use:press={() => onkey(key)}>
```

Directly above the `OK` button (`<button` with `class="key ok"`), add:

```svelte
  <!-- OK acts on click (release): it replaces the view, and a submit on press would let the
       release land on the next screen. -->
```

The existing component tests keep passing. `fireEvent.click` sends `detail: 0`, which is the keyboard path.

- [ ] **Step 6: Make iOS Safari show `:active`**

In `src/main.ts`, replace:

```ts
mount(App, { target });
```

with:

```ts
// iOS Safari only applies :active to buttons when a touch listener exists (spec §6).
document.addEventListener('touchstart', () => {}, { passive: true });

mount(App, { target });
```

- [ ] **Step 7: Verify**

Run: `npm test && npm run check`
Expected: all tests pass; 0 errors and 0 warnings.

- [ ] **Step 8: Commit**

```bash
git add src/components/press.ts src/components/press.test.ts src/components/Keypad.svelte src/main.ts
git commit -m "feat: let keypad keys act on press" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Final verification and docs

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
   - Setup shows 5, 10, 15, 25 and 50 under each other, with 15 selected.
   - Stop is light red, and dark red in dark mode.
   - An empty answer field shows a grey `…`.
   - Verhoudingen → a `?% van` question: the prompt `12½%` shows a stacked ½. The keypad has a breuk key with a small fraction icon.
     - breuk → an empty template with the top slot highlighted → type `25` → breuk → `2` → OK.
     - `12` → breuk → `1` → breuk → `2` → OK is accepted as 12½.
     - Tap the bottom slot and then the top slot: the highlight follows the tap.
     - `⌫` empties the bottom slot, moves up, empties the top slot, then removes the template.
     - The field does not jump in height when the template opens.
   - A wrong fraction answer shows "Jouw antwoord" and "Juist antwoord" with stacked fractions, in the feedback and in the results.
   - Typing fast on the same digit (`7`, `7`, `7`) registers every press, and keys visibly light up while held.
   - Repeat the checks in dark mode and in airplane mode.

- [ ] **Step 3: Update `CLAUDE.md`**

Under `## Status`, after the paragraph that ends with `(plan: `docs/superpowers/plans/2026-10-06-getallen-delers.md`).`, add a new paragraph:

```markdown
UI feedback round 1 (plan: `docs/superpowers/plans/2026-10-06-feedback-round-1.md`) added stacked
fractions everywhere, the breuk key with a fraction template and mixed numbers, counts 5–50,
a light red Stop button and keys that act on press.
```

Under "Known follow-ups for the next plans", replace:

```markdown
- **Bewerkingen (`expression` answer kind):** add an `expression` entry to `INPUT_MODELS`
  (`lib/inputModels.ts`, with the "Ongeldige som" message) and extend `lib/expr/parser.ts`,
```

with:

```markdown
- **Bewerkingen (`expression` answer kind):** add `expression: string` to `KeypadStates` and an
  `expression` entry to `INPUT_MODELS` (`lib/inputModels.ts`, a `textModel` with the "Ongeldige
  som" message), and extend `lib/expr/parser.ts`,
```

In the architecture block, replace:

```
  components/           SetOverview, SetupScreen, PlayScreen, QuestionView, Keypad, Feedback,
                        ResultScreen
```

with:

```
  components/           SetOverview, SetupScreen, PlayScreen, QuestionView, KeypadAnswer
                        (answer field + error + keypad), Keypad, Feedback, ResultScreen,
                        MathText + Fraction (stacked fractions), press.ts (act-on-press action)
```

and replace:

```
    keypadInput.ts      pure key → input reducers (numbers/fractions, factorizations)
    inputModels.ts      per answer kind: keys, reducer, validate, display
```

with:

```
    keypadInput.ts      pure key → input reducers (numbers, fraction templates, factorizations)
    inputModels.ts      per answer kind: keys, typing state, reducer, validate, display, view
    fractionText.ts     splits text into plain runs and fractions for stacked display
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: record feedback round 1 in CLAUDE.md" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Spec coverage (self-review)

| Requirement | Task |
|---|---|
| §3.2 counts 5, 10, 15, 25, 50 in one column, default 15 | 1 |
| §3.3 Stop light red | 2 |
| §5.12 `12 1/2` accepted; `12½%` stacked in prompts | 3, 5 |
| §6 `…` placeholder in muted grey, also in empty slots | 7 |
| §6 breuk on empty input → template, cursor in numerator | 6, 7 |
| §6 breuk after a whole number → mixed number | 6, 7 |
| §6 breuk toggles slots; tapping a slot selects it; active slot highlighted | 6, 7 |
| §6 breuk does nothing after a comma; comma ignored inside a template | 6 |
| §6 ⌫ in slot → numerator → close template | 6 |
| §6 `−` applies to the whole number | 6 |
| §6 OK disabled without a digit; empty slot or zero denominator → "Ongeldig getal" | 7 |
| §6 improper part in a mixed number allowed | 3 |
| §6 submitted input is a string (`25/2`, `12 1/2`, `12,5`) | 6, 7 |
| §6 keys act on press; keyboard still works; no double count; iOS `:active` | 8 |
| §8 stacked fractions in prompt, input, feedback, results, explanations; hidden slash | 4, 5, 7 |
