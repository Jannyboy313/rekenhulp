# Beta (Tafels set) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an installable, offline PWA that offers the **Tafels** practice set end-to-end: set overview → setup → session with keypad and feedback → results. It also includes all the shared infrastructure that later sets build on.

**Architecture:**

- Svelte 5 (runes) + Vite SPA without SvelteKit.
- All logic lives in framework-free TypeScript under `src/lib/`, so it is unit-testable in Node. Components are thin.
- A seeded RNG drives generation. The answer checking for every exercise goes through `steps.ts` and uses exact `bigint` fractions from `rational.ts`.
- `App.svelte` is a four-state machine: `sets → setup → playing → results`.

**Tech Stack:** Svelte 5, TypeScript (strict), Vite, Vitest + jsdom + @testing-library/svelte, vite-plugin-pwa + @vite-pwa/assets-generator, svelte-check, Prettier.

**Spec:** `docs/superpowers/specs/2026-10-05-rekenhulp-design.md`. Read §3, §4, §5.1, §6 and §8 before starting.

---

## Scope

**In scope:**

| Spec section | What is built |
|---|---|
| §2 | Stack, PWA and mobile UX |
| §3 | Full flow |
| §4.2 | Quota algorithm, complete and generic, so later sets only add config |
| §5.1 | Tables |
| §6 | The `number` keypad only |
| §8 | Formatting conventions |

**Not in scope:** all other topics and sets, the answer kinds `boolean`, `expression` and `factorization`, `lib/expr`, and rational arithmetic (add/multiply). Each later set gets its own plan.

**Deliberate narrowing for the beta:**

- `Topic` is `'tables'` only.
- `AnswerKind` is `'number'` only.
- `PRACTICE_SETS` contains only the Tafels set.

Later plans widen these unions.

## Prerequisites & command permissions

- Node.js 22 LTS or newer.
- Pre-approved in this repo (`.claude/settings.json`): `npm install`, `npm test`, `git init`, `git add`, `git commit`.
- Also pre-approved (added 2026-10-05): `npm run check` and `npm run build`. Steps still marked **⚠ approval** for these two may simply be run.
- **Not pre-approved:** `npm run dev` and `npm run preview`. Do not run them; they are only for the user's manual check.
- **Never** use `npx`, `node`, `npm create` or `npm init`. Write every config file by hand, as shown below.
- Every commit message ends with the trailer `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. The commands below pass it via a second `-m`.

## File structure

```
package.json, package-lock.json      scripts + devDependencies
tsconfig.json                        strict TS for src + config files
svelte.config.js                     vitePreprocess for svelte-check
vite.config.ts                       svelte plugin, PWA (build) / svelteTesting (tests), vitest config
pwa-assets.config.ts                 icon generation preset (Task 15)
.prettierrc, .prettierignore
index.html                           mobile meta tags, mount point
public/icon.svg                      source icon (Task 15)
src/
  main.ts                            mounts App
  vite-env.d.ts                      ambient types for svelte + vite
  app.css                            design tokens, light/dark, safe areas, base controls
  App.svelte                         state machine sets → setup → playing → results
  App.test.ts
  components/
    SetOverview.svelte               start screen: one card per set
    SetupScreen.svelte               topics + count selector + Start/Terug
    PlayScreen.svelte                header (progress, timer, Stop) + question/feedback loop
    PlayScreen.test.ts
    QuestionView.svelte              prompt + answer display + Keypad
    QuestionView.test.ts
    Keypad.svelte                    number keypad (stateless)
    Feedback.svelte                  correct (auto-advance) / wrong (Verder)
    Feedback.test.ts
    ResultScreen.svelte              score, times, mistakes, Opnieuw/Menu
  lib/
    random.ts (+ .test.ts)           mulberry32 RNG, randomInt, pick, shuffle, randomSeed
    rational.ts (+ .test.ts)         exact bigint fractions, Dutch number parsing
    format.ts (+ .test.ts)           Dutch number/rational/duration formatting
    types.ts                         Topic, AnswerKind, Step, Question, Generator, PracticeSet
    steps.ts (+ .test.ts)            numberStep factory
    keypadInput.ts (+ .test.ts)      pure key → input reducer
    results.ts (+ .test.ts)          QuestionRecord, isCorrect, summarize
    sets.ts (+ .test.ts)             SESSION_SIZES, TABLES_SET, PRACTICE_SETS, describeSetTopics
    session.ts (+ .test.ts)          tablesCount, allocateQuotas, buildSession
    topics/
      index.ts                       GENERATORS + TOPIC_LABELS registry
      tables.ts (+ .test.ts)         tables generator (spec §5.1)
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `svelte.config.js`, `vite.config.ts`, `.prettierrc`, `.prettierignore`, `index.html`, `src/main.ts`, `src/vite-env.d.ts`, `src/app.css`, `src/App.svelte`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "rekenhulp",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-check --tsconfig ./tsconfig.json",
    "test": "vitest run",
    "format": "prettier --write ."
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install -D svelte@^5 @sveltejs/vite-plugin-svelte vite typescript svelte-check @types/node vitest jsdom @testing-library/svelte prettier prettier-plugin-svelte
```

Expected:
- `package.json` gains `devDependencies`.
- `package-lock.json` and `node_modules/` are created.

If npm reports an `ERESOLVE` peer-dependency conflict:
- Read which `vite` major version `@sveltejs/vite-plugin-svelte` and `vitest` both accept.
- Re-run with `vite@^<that major>` added.
- Never use `--force` or `--legacy-peer-deps`.

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts", "src/**/*.svelte", "vite.config.ts", "pwa-assets.config.ts"]
}
```

- [ ] **Step 4: Write `svelte.config.js`**

```js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
};
```

- [ ] **Step 5: Write `vite.config.ts`**

The PWA plugin is added in Task 15.

```ts
/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vite';

const isTest = process.env.VITEST !== undefined;

export default defineConfig({
  // Relative base so the static build can be hosted in any (sub)folder.
  base: './',
  plugins: [svelte(), ...(isTest ? [svelteTesting()] : [])],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 6: Write `.prettierrc` and `.prettierignore`**

`.prettierrc`:
```json
{
  "singleQuote": true,
  "printWidth": 100,
  "plugins": ["prettier-plugin-svelte"],
  "overrides": [{ "files": "*.svelte", "options": { "parser": "svelte" } }]
}
```

`.prettierignore`:
```
dist/
dev-dist/
node_modules/
package-lock.json
```

- [ ] **Step 7: Write `index.html`**

```html
<!doctype html>
<html lang="nl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="description" content="Oefen hoofdrekenen zonder rekenmachine" />
    <meta name="theme-color" content="#1d4ed8" />
    <title>Rekenhulp</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 8: Write `src/vite-env.d.ts` and `src/main.ts`**

`src/vite-env.d.ts`:
```ts
/// <reference types="svelte" />
/// <reference types="vite/client" />
```

`src/main.ts`:
```ts
import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';

const target = document.getElementById('app');
if (!target) throw new Error('Mount point #app not found');

mount(App, { target });
```

- [ ] **Step 9: Write `src/app.css`**

```css
:root {
  color-scheme: light dark;
  --bg: #f8fafc;
  --surface: #ffffff;
  --text: #0f172a;
  --muted: #64748b;
  --border: #e2e8f0;
  --primary: #1d4ed8;
  --primary-text: #ffffff;
  --key: #e2e8f0;
  --key-active: #cbd5e1;
  --correct: #15803d;
  --correct-bg: #dcfce7;
  --wrong: #b91c1c;
  --wrong-bg: #fee2e2;
  --radius: 0.75rem;

  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-variant-numeric: tabular-nums;
  background: var(--bg);
  color: var(--text);
  -webkit-text-size-adjust: 100%;
  touch-action: manipulation;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f172a;
    --surface: #1e293b;
    --text: #f1f5f9;
    --muted: #94a3b8;
    --border: #334155;
    --primary: #3b82f6;
    --key: #334155;
    --key-active: #475569;
    --correct: #4ade80;
    --correct-bg: #14532d;
    --wrong: #f87171;
    --wrong-bg: #7f1d1d;
  }
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
  overscroll-behavior: none;
}

body {
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

#app {
  min-height: 100dvh;
  max-width: 30rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right))
    max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
}

h1,
h2,
p {
  margin: 0;
}

button {
  font: inherit;
  color: inherit;
  border: none;
  border-radius: var(--radius);
  min-height: 3rem;
  cursor: pointer;
}

button:disabled {
  opacity: 0.4;
  cursor: default;
}

button:focus-visible,
input:focus-visible + span {
  outline: 3px solid var(--primary);
  outline-offset: 2px;
}

.primary {
  background: var(--primary);
  color: var(--primary-text);
  font-weight: 600;
  padding: 0 1.5rem;
}

.secondary {
  background: var(--key);
  padding: 0 1rem;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
  }
}
```

- [ ] **Step 10: Write placeholder `src/App.svelte`**

```svelte
<h1>Rekenhulp</h1>
```

- [ ] **Step 11: Verify the tooling runs**

Run: `npm test`
Expected: Vitest starts and reports `No test files found`, exiting with code 1. This is fine because there are no tests yet. Any other error (config or import failure) must be fixed before you continue.

⚠ approval: `npm run check`. Expected: `svelte-check found 0 errors and 0 warnings`.

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json tsconfig.json svelte.config.js vite.config.ts .prettierrc .prettierignore index.html src/main.ts src/vite-env.d.ts src/app.css src/App.svelte
git commit -m "chore: scaffold Svelte 5 + Vite + Vitest project" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Seedable RNG (`lib/random.ts`)

**Files:**
- Create: `src/lib/random.ts`
- Test: `src/lib/random.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { createRng, pick, randomInt, randomSeed, shuffle } from './random';

describe('createRng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect(Array.from({ length: 5 }, a)).toEqual(Array.from({ length: 5 }, b));
  });

  it('produces different sequences for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(Array.from({ length: 5 }, a)).not.toEqual(Array.from({ length: 5 }, b));
  });

  it('returns floats in [0, 1)', () => {
    const rng = createRng(1);
    for (let i = 0; i < 10_000; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('randomSeed', () => {
  it('returns an unsigned 32-bit integer', () => {
    const seed = randomSeed();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2 ** 32);
  });
});

describe('randomInt', () => {
  it('stays within inclusive bounds and reaches both ends', () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const value = randomInt(rng, 2, 5);
      expect(value).toBeGreaterThanOrEqual(2);
      expect(value).toBeLessThanOrEqual(5);
      seen.add(value);
    }
    expect([...seen].sort((x, y) => x - y)).toEqual([2, 3, 4, 5]);
  });

  it('rejects an invalid range', () => {
    expect(() => randomInt(createRng(1), 5, 2)).toThrow(RangeError);
    expect(() => randomInt(createRng(1), 1.5, 2)).toThrow(RangeError);
  });
});

describe('pick', () => {
  it('returns an element of the list', () => {
    const items = ['a', 'b', 'c'];
    const rng = createRng(3);
    for (let i = 0; i < 100; i++) expect(items).toContain(pick(rng, items));
  });

  it('rejects an empty list', () => {
    expect(() => pick(createRng(1), [])).toThrow(RangeError);
  });
});

describe('shuffle', () => {
  it('returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const copy = [...input];
    const output = shuffle(createRng(3), input);
    expect(input).toEqual(copy);
    expect([...output].sort((x, y) => x - y)).toEqual(input);
    expect(output).not.toEqual(input);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/random.test.ts`
Expected: FAIL, with `Failed to resolve import "./random"`.

- [ ] **Step 3: Write the implementation**

```ts
/** A source of uniformly distributed floats in [0, 1). */
export type Rng = () => number;

/** mulberry32: a tiny, fast, seedable PRNG. Not cryptographically secure (not needed here). */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]!;
}

/** Uniform integer in [min, max], both inclusive. */
export function randomInt(rng: Rng, min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
    throw new RangeError(`Invalid integer range [${min}, ${max}]`);
  }
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new RangeError('Cannot pick from an empty list');
  return items[Math.floor(rng() * items.length)]!;
}

/** Fisher–Yates; returns a new array. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/random.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/random.ts src/lib/random.test.ts
git commit -m "feat: add seedable RNG helpers" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Exact numbers (`lib/rational.ts`)

**Files:**
- Create: `src/lib/rational.ts`
- Test: `src/lib/rational.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { equals, fromInteger, parseDutchNumber, rational } from './rational';

describe('rational', () => {
  it('normalises sign and reduces the fraction', () => {
    expect(rational(6n, 8n)).toEqual({ num: 3n, den: 4n });
    expect(rational(3n, -6n)).toEqual({ num: -1n, den: 2n });
    expect(rational(0n, 5n)).toEqual({ num: 0n, den: 1n });
    expect(rational(7n)).toEqual({ num: 7n, den: 1n });
  });

  it('rejects a zero denominator', () => {
    expect(() => rational(1n, 0n)).toThrow(RangeError);
  });
});

describe('fromInteger', () => {
  it('converts safe integers', () => {
    expect(fromInteger(12)).toEqual({ num: 12n, den: 1n });
    expect(fromInteger(-3)).toEqual({ num: -3n, den: 1n });
  });

  it('rejects non-integers', () => {
    expect(() => fromInteger(1.5)).toThrow(RangeError);
  });
});

describe('equals', () => {
  it('compares normalised values', () => {
    expect(equals(rational(1n, 2n), rational(2n, 4n))).toBe(true);
    expect(equals(rational(1n, 2n), rational(1n, 3n))).toBe(false);
  });
});

describe('parseDutchNumber', () => {
  it.each([
    ['12', rational(12n)],
    ['007', rational(7n)],
    ['-3', rational(-3n)],
    ['−3', rational(-3n)],
    ['0,25', rational(1n, 4n)],
    [',25', rational(1n, 4n)],
    ['0,250', rational(1n, 4n)],
    ['  2,5 ', rational(5n, 2n)],
    ['-0', rational(0n)],
  ])('parses %j', (input, expected) => {
    expect(parseDutchNumber(input)).toEqual(expected);
  });

  it.each(['', '-', ',', '5,', '1,2,3', '1.5', 'abc', '--1', '1-'])('rejects %j', (input) => {
    expect(parseDutchNumber(input)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/rational.test.ts`
Expected: FAIL, with `Failed to resolve import "./rational"`.

- [ ] **Step 3: Write the implementation**

```ts
/** An exact fraction, always normalised: den > 0 and gcd(num, den) = 1. */
export interface Rational {
  readonly num: bigint;
  readonly den: bigint;
}

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) [x, y] = [y, x % y];
  return x;
}

export function rational(num: bigint, den: bigint = 1n): Rational {
  if (den === 0n) throw new RangeError('Denominator must not be zero');
  const sign = den < 0n ? -1n : 1n;
  const divisor = gcd(num, den);
  return { num: (sign * num) / divisor, den: (sign * den) / divisor };
}

export function fromInteger(value: number): Rational {
  if (!Number.isSafeInteger(value)) throw new RangeError(`Not a safe integer: ${value}`);
  return rational(BigInt(value));
}

export function equals(a: Rational, b: Rational): boolean {
  return a.num === b.num && a.den === b.den;
}

// Optional ASCII or typographic minus, optional integer part, optional ",digits".
const DUTCH_NUMBER = /^([-−])?(\d*)(?:,(\d+))?$/;

/** Parses Dutch notation such as "12", "−3", "0,25" or ",5". Returns null for anything else. */
export function parseDutchNumber(input: string): Rational | null {
  const match = DUTCH_NUMBER.exec(input.trim());
  if (!match) return null;
  const [, sign, integerPart = '', fractionPart = ''] = match;
  if (integerPart === '' && fractionPart === '') return null;
  const digits = BigInt(integerPart + fractionPart);
  const den = 10n ** BigInt(fractionPart.length);
  return rational(sign ? -digits : digits, den);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/rational.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rational.ts src/lib/rational.test.ts
git commit -m "feat: add exact rational numbers with Dutch number parsing" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Dutch formatting (`lib/format.ts`)

**Files:**
- Create: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import {
  formatDuration,
  formatInput,
  formatInteger,
  formatRational,
  formatSeconds,
  GROUP_SEPARATOR as S,
  MINUS,
} from './format';
import { rational } from './rational';

describe('formatInteger', () => {
  it.each([
    [7, '7'],
    [1000, '1000'],
    [9999, '9999'],
    [10_000, `10${S}000`],
    [2_500_000, `2${S}500${S}000`],
    [-12, `${MINUS}12`],
    [-25_000, `${MINUS}25${S}000`],
    [0, '0'],
  ])('formats %d', (value, expected) => {
    expect(formatInteger(value)).toBe(expected);
  });

  it('accepts bigint', () => {
    expect(formatInteger(12345n)).toBe(`12${S}345`);
  });
});

describe('formatRational', () => {
  it.each([
    [rational(12n), '12'],
    [rational(1n, 4n), '0,25'],
    [rational(-5n, 2n), `${MINUS}2,5`],
    [rational(12345n, 10n), '1234,5'],
    [rational(2_500_000n), `2${S}500${S}000`],
    [rational(-1n, 8n), `${MINUS}0,125`],
  ])('formats %o', (value, expected) => {
    expect(formatRational(value)).toBe(expected);
  });

  it('rejects values without a finite decimal representation', () => {
    expect(() => formatRational(rational(1n, 3n))).toThrow(RangeError);
  });
});

describe('formatInput', () => {
  it('shows a typographic minus', () => {
    expect(formatInput('-12,5')).toBe(`${MINUS}12,5`);
    expect(formatInput('')).toBe('');
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '00:00'],
    [999, '00:00'],
    [65_000, '01:05'],
    [600_999, '10:00'],
    [-5, '00:00'],
  ])('formats %d ms', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});

describe('formatSeconds', () => {
  it('formats with one decimal and a comma', () => {
    expect(formatSeconds(4230)).toBe('4,2 s');
    expect(formatSeconds(0)).toBe('0,0 s');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/format.test.ts`
Expected: FAIL, with `Failed to resolve import "./format"`.

- [ ] **Step 3: Write the implementation**

```ts
import type { Rational } from './rational';

/** Typographic minus sign (U+2212). */
export const MINUS = '−';
/** Narrow no-break space (U+202F): a thin space for digit grouping that never wraps (spec §8). */
export const GROUP_SEPARATOR = ' ';

const MAX_DECIMALS = 20;

function groupDigits(digits: string): string {
  if (digits.length < 5) return digits;
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR);
}

export function formatInteger(value: number | bigint): string {
  const big = typeof value === 'bigint' ? value : BigInt(value);
  const negative = big < 0n;
  return (negative ? MINUS : '') + groupDigits((negative ? -big : big).toString());
}

/** Formats a terminating decimal in Dutch notation; throws for e.g. 1/3 (fractions come in v2). */
export function formatRational(value: Rational): string {
  let decimals = 0;
  while (10n ** BigInt(decimals) % value.den !== 0n) {
    decimals++;
    if (decimals > MAX_DECIMALS) {
      throw new RangeError('Value has no finite decimal representation');
    }
  }
  const negative = value.num < 0n;
  const absolute = negative ? -value.num : value.num;
  const scaled = (absolute * 10n ** BigInt(decimals)) / value.den;
  const text = scaled.toString().padStart(decimals + 1, '0');
  const integerPart = text.slice(0, text.length - decimals);
  const fractionPart = text.slice(text.length - decimals);
  return (
    (negative ? MINUS : '') + groupDigits(integerPart) + (decimals > 0 ? `,${fractionPart}` : '')
  );
}

/** Keypad input uses ASCII '-'; the UI shows a typographic minus. */
export function formatInput(raw: string): string {
  return raw.replaceAll('-', MINUS);
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/format.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: add Dutch number and duration formatting" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Core types and number steps (`lib/types.ts`, `lib/steps.ts`)

**Files:**
- Create: `src/lib/types.ts`, `src/lib/steps.ts`
- Test: `src/lib/steps.test.ts`

- [ ] **Step 1: Write `src/lib/types.ts`**

This file contains types only, so it has no test of its own.

```ts
import type { Rng } from './random';

/** Beta: numeric answers only. Later plans add 'boolean' | 'expression' | 'factorization'. */
export type AnswerKind = 'number';

/** Beta: tables only. Each later plan adds the topics of its set (spec §4.1). */
export type Topic = 'tables';

export interface CheckResult {
  correct: boolean;
  /** Correct answer, formatted for display. */
  expected: string;
  explanation?: string;
}

export interface Step {
  kind: AnswerKind;
  prompt: string;
  /** Fixed unit shown next to the input, e.g. 'cm³'. */
  suffix?: string;
  check(input: string): CheckResult;
}

export interface Question {
  /** Canonical identity, used for de-duplication within a session. */
  key: string;
  topic: Topic;
  steps: readonly Step[];
}

export type Generator = (rng: Rng) => Question;

export interface TopicWeight {
  topic: Topic;
  weight: number;
}

export interface PracticeSet {
  id: string;
  /** Dutch display name. */
  name: string;
  /** Dutch one-line description. */
  description: string;
  /** Topics besides the mixed-in tables. */
  topics: readonly TopicWeight[];
  /** Integer percentage of table exercises: 100 for Tafels, 15 for the other sets. */
  tablesPercent: number;
}
```

- [ ] **Step 2: Write the failing test `src/lib/steps.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { fromInteger, rational } from './rational';
import { numberStep } from './steps';

describe('numberStep', () => {
  const step = numberStep({
    prompt: '3 × 4 = ?',
    answer: fromInteger(12),
    explanation: '3 × 4 = 12',
  });

  it('exposes kind and prompt', () => {
    expect(step.kind).toBe('number');
    expect(step.prompt).toBe('3 × 4 = ?');
    expect(step.suffix).toBeUndefined();
  });

  it('accepts the exact answer and equivalent notation', () => {
    expect(step.check('12')).toEqual({ correct: true, expected: '12', explanation: '3 × 4 = 12' });
    expect(step.check('012').correct).toBe(true);
  });

  it('rejects a wrong answer and reports the expected one', () => {
    expect(step.check('13')).toEqual({
      correct: false,
      expected: '12',
      explanation: '3 × 4 = 12',
    });
  });

  it('rejects unparsable input', () => {
    expect(step.check('').correct).toBe(false);
    expect(step.check('-').correct).toBe(false);
  });

  it('compares decimals exactly', () => {
    const quarter = numberStep({ prompt: '250 ml = ? L', answer: rational(1n, 4n), suffix: 'L' });
    expect(quarter.suffix).toBe('L');
    expect(quarter.check(',25').correct).toBe(true);
    expect(quarter.check('0,250').correct).toBe(true);
    expect(quarter.check('0,26').correct).toBe(false);
    expect(quarter.check('0,26').expected).toBe('0,25');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- src/lib/steps.test.ts`
Expected: FAIL, with `Failed to resolve import "./steps"`.

- [ ] **Step 4: Write `src/lib/steps.ts`**

```ts
import { formatRational } from './format';
import { equals, parseDutchNumber, type Rational } from './rational';
import type { Step } from './types';

export interface NumberStepOptions {
  prompt: string;
  answer: Rational;
  suffix?: string;
  explanation?: string;
}

export function numberStep({ prompt, answer, suffix, explanation }: NumberStepOptions): Step {
  const expected = formatRational(answer);
  return {
    kind: 'number',
    prompt,
    suffix,
    check(input) {
      const given = parseDutchNumber(input);
      return { correct: given !== null && equals(given, answer), expected, explanation };
    },
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/lib/steps.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/steps.ts src/lib/steps.test.ts
git commit -m "feat: add core types and numeric answer steps" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Tables generator (`lib/topics/tables.ts`)

Spec §5.1:

- Factors are `{2, …, 15} \ {10}`, applied to both factors.
- There are three forms with equal probability: product, division and missing factor. The missing factor is on the left or the right, 50/50.

**Files:**
- Create: `src/lib/topics/tables.ts`
- Test: `src/lib/topics/tables.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import type { Question } from '../types';
import { generateTables, TABLE_FACTORS } from './tables';

const SAMPLES = 1000;

function sample(seed = 1): Question[] {
  const rng = createRng(seed);
  return Array.from({ length: SAMPLES }, () => generateTables(rng));
}

function expectedOf(question: Question): string {
  // `expected` does not depend on the input.
  return question.steps[0]!.check('').expected;
}

describe('TABLE_FACTORS', () => {
  it('is 2 to 15 without 10', () => {
    expect(TABLE_FACTORS).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15]);
  });
});

describe('generateTables', () => {
  const questions = sample();

  it('creates single-step numeric questions on the tables topic', () => {
    for (const question of questions) {
      expect(question.topic).toBe('tables');
      expect(question.key.startsWith('tables:')).toBe(true);
      expect(question.steps).toHaveLength(1);
      expect(question.steps[0]!.kind).toBe('number');
      expect(question.steps[0]!.prompt).toMatch(/\?/);
    }
  });

  it('accepts its own expected answer', () => {
    for (const question of questions) {
      expect(question.steps[0]!.check(expectedOf(question)).correct).toBe(true);
    }
  });

  it('only uses table factors and their exact product', () => {
    for (const question of questions) {
      const numbers = [...question.steps[0]!.prompt.matchAll(/\d+/g)].map((m) => Number(m[0]));
      numbers.push(Number(expectedOf(question)));
      const [a, b, product] = numbers.sort((x, y) => x - y) as [number, number, number];
      expect(TABLE_FACTORS).toContain(a);
      expect(TABLE_FACTORS).toContain(b);
      expect(a * b).toBe(product);
    }
  });

  it('covers every factor', () => {
    const seen = new Set<number>();
    for (const question of questions) {
      for (const m of question.steps[0]!.prompt.matchAll(/\d+/g)) {
        const value = Number(m[0]);
        if (TABLE_FACTORS.includes(value)) seen.add(value);
      }
    }
    expect([...seen].sort((x, y) => x - y)).toEqual(TABLE_FACTORS);
  });

  it('uses the three forms roughly equally', () => {
    const counts = { product: 0, division: 0, missing: 0 };
    for (const { key } of questions) {
      if (key.startsWith('tables:product:')) counts.product++;
      else if (key.startsWith('tables:division:')) counts.division++;
      else if (key.startsWith('tables:missing')) counts.missing++;
    }
    for (const count of Object.values(counts)) {
      expect(count / SAMPLES).toBeGreaterThan(0.28);
      expect(count / SAMPLES).toBeLessThan(0.39);
    }
  });

  it('puts the missing factor on both sides', () => {
    const keys = questions.map((q) => q.key);
    expect(keys.some((k) => k.startsWith('tables:missingLeft:'))).toBe(true);
    expect(keys.some((k) => k.startsWith('tables:missingRight:'))).toBe(true);
  });

  it('explains division and missing-factor answers with the multiplication fact', () => {
    for (const question of questions) {
      const { explanation } = question.steps[0]!.check('');
      if (question.key.startsWith('tables:product:')) {
        expect(explanation).toBeUndefined();
      } else {
        expect(explanation).toMatch(/^\d+ × \d+ = \d+$/);
      }
    }
  });

  it('is deterministic for a fixed seed', () => {
    expect(sample(5).map((q) => q.key)).toEqual(sample(5).map((q) => q.key));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/topics/tables.test.ts`
Expected: FAIL, with `Failed to resolve import "./tables"`.

- [ ] **Step 3: Write the implementation**

```ts
import { formatInteger } from '../format';
import { pick, type Rng } from '../random';
import { fromInteger } from '../rational';
import { numberStep } from '../steps';
import type { Question } from '../types';

/** Tables 2 to 15 without 1 and 10 (spec §5.1). The exclusion applies to both factors. */
export const TABLE_FACTORS: readonly number[] = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15];

type TableForm = 'product' | 'division' | 'missingFactor';
const FORMS: readonly TableForm[] = ['product', 'division', 'missingFactor'];

export function generateTables(rng: Rng): Question {
  const a = pick(rng, TABLE_FACTORS);
  const b = pick(rng, TABLE_FACTORS);
  const product = a * b;
  const [fa, fb, fp] = [formatInteger(a), formatInteger(b), formatInteger(product)];
  const fact = `${fa} × ${fb} = ${fp}`;

  switch (pick(rng, FORMS)) {
    case 'product':
      return tableQuestion(`product:${a}x${b}`, `${fa} × ${fb} = ?`, product);
    case 'division':
      return tableQuestion(`division:${product}:${b}`, `${fp} : ${fb} = ?`, a, fact);
    case 'missingFactor':
      return rng() < 0.5
        ? tableQuestion(`missingLeft:${b}:${product}`, `? × ${fb} = ${fp}`, a, fact)
        : tableQuestion(`missingRight:${a}:${product}`, `${fa} × ? = ${fp}`, b, fact);
  }
}

function tableQuestion(
  key: string,
  prompt: string,
  answer: number,
  explanation?: string,
): Question {
  return {
    key: `tables:${key}`,
    topic: 'tables',
    steps: [numberStep({ prompt, answer: fromInteger(answer), explanation })],
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/topics/tables.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/topics/tables.ts src/lib/topics/tables.test.ts
git commit -m "feat: add multiplication tables generator" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Topic registry and practice sets (`lib/topics/index.ts`, `lib/sets.ts`)

**Files:**
- Create: `src/lib/topics/index.ts`, `src/lib/sets.ts`
- Test: `src/lib/sets.test.ts`

- [ ] **Step 1: Write `src/lib/topics/index.ts`**

This is a registry with no logic of its own. It is covered through the sets and session tests.

```ts
import type { Generator, Topic } from '../types';
import { generateTables } from './tables';

export const GENERATORS: Record<Topic, Generator> = {
  tables: generateTables,
};

/** Dutch labels shown on the setup screen. */
export const TOPIC_LABELS: Record<Topic, string> = {
  tables: 'Tafels van 2 t/m 15 (zonder 10)',
};
```

- [ ] **Step 2: Write the failing test `src/lib/sets.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SESSION_SIZE,
  describeSetTopics,
  PRACTICE_SETS,
  SESSION_SIZES,
  TABLES_SET,
} from './sets';
import type { PracticeSet } from './types';

describe('practice sets', () => {
  it('offers only the Tafels set in the beta', () => {
    expect(PRACTICE_SETS.map((set) => set.id)).toEqual(['tafels']);
  });

  it('makes Tafels a pure tables set', () => {
    expect(TABLES_SET.name).toBe('Tafels');
    expect(TABLES_SET.tablesPercent).toBe(100);
    expect(TABLES_SET.topics).toEqual([]);
  });

  it('offers the session sizes from the spec with 15 as default', () => {
    expect(SESSION_SIZES).toEqual([15, 25, 50, 75, 100]);
    expect(DEFAULT_SESSION_SIZE).toBe(15);
  });
});

describe('describeSetTopics', () => {
  it('describes the Tafels set', () => {
    expect(describeSetTopics(TABLES_SET)).toEqual(['Tafels van 2 t/m 15 (zonder 10)']);
  });

  it('appends the mixed-in tables share for other sets', () => {
    const mixed: PracticeSet = {
      ...TABLES_SET,
      topics: [{ topic: 'tables', weight: 1 }],
      tablesPercent: 15,
    };
    expect(describeSetTopics(mixed)).toEqual(['Tafels van 2 t/m 15 (zonder 10)', '15% tafels']);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- src/lib/sets.test.ts`
Expected: FAIL, with `Failed to resolve import "./sets"`.

- [ ] **Step 4: Write `src/lib/sets.ts`**

```ts
import { TOPIC_LABELS } from './topics';
import type { PracticeSet } from './types';

export const SESSION_SIZES: readonly number[] = [15, 25, 50, 75, 100];
export const DEFAULT_SESSION_SIZE = 15;

export const TABLES_SET: PracticeSet = {
  id: 'tafels',
  name: 'Tafels',
  description: 'Vermenigvuldigen, delen en ontbrekende factor',
  topics: [],
  tablesPercent: 100,
};

/** Beta: only Tafels. Later plans append their set here (spec §4.1). */
export const PRACTICE_SETS: readonly PracticeSet[] = [TABLES_SET];

export function describeSetTopics(set: PracticeSet): string[] {
  if (set.tablesPercent === 100) return [TOPIC_LABELS.tables];
  const labels = set.topics.map(({ topic }) => TOPIC_LABELS[topic]);
  return set.tablesPercent > 0 ? [...labels, `${set.tablesPercent}% tafels`] : labels;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/lib/sets.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/topics/index.ts src/lib/sets.ts src/lib/sets.test.ts
git commit -m "feat: add topic registry and Tafels practice set" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Session builder (`lib/session.ts`)

This implements the full quota algorithm from spec §4.2. It is generic on purpose, so that later sets only add configuration.

**Files:**
- Create: `src/lib/session.ts`
- Test: `src/lib/session.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createRng } from './random';
import { allocateQuotas, buildSession, MAX_UNIQUE_ATTEMPTS, tablesCount } from './session';
import { SESSION_SIZES, TABLES_SET } from './sets';
import type { Generator, Question } from './types';

describe('tablesCount', () => {
  it.each([
    [15, 2],
    [25, 4],
    [50, 8],
    [75, 11],
    [100, 15],
  ])('mixes 15%% of %i exercises as %i tables', (size, expected) => {
    expect(tablesCount(15, size)).toBe(expected);
  });

  it('uses every exercise for a 100% set', () => {
    for (const size of SESSION_SIZES) expect(tablesCount(100, size)).toBe(size);
  });
});

describe('allocateQuotas', () => {
  it('distributes by weight with the largest remainder (spec §4.2 Bewerkingen example)', () => {
    const quotas = allocateQuotas(
      [
        { key: 'orderOfOperations', weight: 1 },
        { key: 'properties', weight: 0.5 },
        { key: 'smartCalculation', weight: 1 },
      ],
      13,
      createRng(1),
    );
    expect(Object.fromEntries(quotas)).toEqual({
      orderOfOperations: 5,
      properties: 3,
      smartCalculation: 5,
    });
  });

  it('splits 13 over two equal topics as 7 + 6', () => {
    const quotas = allocateQuotas(
      [
        { key: 'a', weight: 1 },
        { key: 'b', weight: 1 },
      ],
      13,
      createRng(1),
    );
    expect([...quotas.values()].sort((x, y) => x - y)).toEqual([6, 7]);
  });

  it('breaks ties randomly', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f'].map((key) => ({ key, weight: 1 }));
    const winners = new Set<string>();
    for (let seed = 1; seed <= 50; seed++) {
      const quotas = allocateQuotas(items, 13, createRng(seed));
      expect([...quotas.values()].sort((x, y) => x - y)).toEqual([2, 2, 2, 2, 2, 3]);
      for (const [key, count] of quotas) if (count === 3) winners.add(key);
    }
    expect(winners.size).toBeGreaterThan(1);
  });

  it('gives every topic at least one exercise when the total allows', () => {
    const quotas = allocateQuotas(
      [
        { key: 'big', weight: 1 },
        { key: 'tiny', weight: 0.01 },
      ],
      5,
      createRng(1),
    );
    expect(Object.fromEntries(quotas)).toEqual({ big: 4, tiny: 1 });
  });

  it('always allocates exactly the total', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = createRng(seed);
      const count = 1 + Math.floor(rng() * 6);
      const items = Array.from({ length: count }, (_, key) => ({
        key,
        weight: [0.5, 1, 2][Math.floor(rng() * 3)]!,
      }));
      const total = Math.floor(rng() * 101);
      const values = [...allocateQuotas(items, total, rng).values()];
      expect(values.reduce((sum, value) => sum + value, 0)).toBe(total);
      if (total >= count) expect(Math.min(...values)).toBeGreaterThanOrEqual(1);
    }
  });

  it('returns zero quotas for a zero total', () => {
    expect(Object.fromEntries(allocateQuotas([{ key: 'a', weight: 1 }], 0, createRng(1)))).toEqual(
      { a: 0 },
    );
    expect(allocateQuotas([], 0, createRng(1)).size).toBe(0);
  });

  it('rejects invalid input', () => {
    expect(() => allocateQuotas([], 3, createRng(1))).toThrow(RangeError);
    expect(() => allocateQuotas([{ key: 'a', weight: 0 }], 3, createRng(1))).toThrow(RangeError);
  });
});

describe('buildSession', () => {
  it.each([...SESSION_SIZES])('builds %i unique table questions for Tafels', (size) => {
    const questions = buildSession(TABLES_SET, size, createRng(size));
    expect(questions).toHaveLength(size);
    expect(questions.every((q) => q.topic === 'tables')).toBe(true);
    expect(new Set(questions.map((q) => q.key)).size).toBe(size);
  });

  it('is deterministic for a fixed seed', () => {
    const keys = (seed: number) => buildSession(TABLES_SET, 25, createRng(seed)).map((q) => q.key);
    expect(keys(9)).toEqual(keys(9));
    expect(keys(9)).not.toEqual(keys(10));
  });

  it('accepts duplicates after the retry limit instead of looping forever', () => {
    const constant: Question = { key: 'same', topic: 'tables', steps: [] };
    const generate = vi.fn<Generator>(() => constant);
    const questions = buildSession(TABLES_SET, 15, createRng(1), { tables: generate });
    expect(questions).toHaveLength(15);
    expect(generate).toHaveBeenCalledTimes(1 + 14 * MAX_UNIQUE_ATTEMPTS);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/session.test.ts`
Expected: FAIL, with `Failed to resolve import "./session"`.

- [ ] **Step 3: Write the implementation**

```ts
import { shuffle, type Rng } from './random';
import { GENERATORS } from './topics';
import type { Generator, PracticeSet, Question, Topic } from './types';

export const MAX_UNIQUE_ATTEMPTS = 20;

export interface Weighted<K> {
  key: K;
  weight: number;
}

/** Number of table exercises; the share is an integer percentage to avoid float artefacts. */
export function tablesCount(tablesPercent: number, size: number): number {
  return Math.round((tablesPercent * size) / 100);
}

/**
 * Largest remainder method with random tie-breaks (spec §4.2). When the total allows it, every
 * key gets at least one; a key that ended at 0 takes one from the largest quota.
 */
export function allocateQuotas<K>(
  items: readonly Weighted<K>[],
  total: number,
  rng: Rng,
): Map<K, number> {
  if (total > 0 && items.length === 0) {
    throw new RangeError('Cannot allocate exercises without topics');
  }
  if (items.some((item) => !(item.weight > 0))) {
    throw new RangeError('Topic weights must be positive');
  }

  const weightSum = items.reduce((sum, item) => sum + item.weight, 0);
  const shares = items.map((item) => {
    const exact = (total * item.weight) / weightSum;
    const count = Math.floor(exact);
    // Rounded so float noise (0.2000000001 vs 0.2) does not decide ties.
    const remainder = Math.round((exact - count) * 1e9);
    return { key: item.key, count, remainder, tieBreak: rng() };
  });

  let leftover = total - shares.reduce((sum, share) => sum + share.count, 0);
  const byRemainder = [...shares].sort(
    (x, y) => y.remainder - x.remainder || y.tieBreak - x.tieBreak,
  );
  for (const share of byRemainder) {
    if (leftover === 0) break;
    share.count++;
    leftover--;
  }

  if (total >= shares.length) {
    for (const share of shares) {
      if (share.count > 0) continue;
      const donor = shares.reduce((max, candidate) => (candidate.count > max.count ? candidate : max));
      donor.count--;
      share.count++;
    }
  }

  return new Map(shares.map((share) => [share.key, share.count]));
}

export function buildSession(
  set: PracticeSet,
  size: number,
  rng: Rng,
  generators: Record<Topic, Generator> = GENERATORS,
): Question[] {
  const tables = tablesCount(set.tablesPercent, size);
  const quotas = allocateQuotas(
    set.topics.map(({ topic, weight }) => ({ key: topic, weight })),
    size - tables,
    rng,
  );

  const plan: Topic[] = Array.from({ length: tables }, (): Topic => 'tables');
  for (const [topic, count] of quotas) {
    for (let i = 0; i < count; i++) plan.push(topic);
  }

  const usedKeys = new Set<string>();
  const questions = plan.map((topic) => generateUnique(generators[topic], rng, usedKeys));
  return shuffle(rng, questions);
}

function generateUnique(generate: Generator, rng: Rng, usedKeys: Set<string>): Question {
  let question = generate(rng);
  for (let attempt = 1; attempt < MAX_UNIQUE_ATTEMPTS && usedKeys.has(question.key); attempt++) {
    question = generate(rng);
  }
  usedKeys.add(question.key);
  return question;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/session.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/session.ts src/lib/session.test.ts
git commit -m "feat: add session builder with weighted quotas and de-duplication" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Results summary (`lib/results.ts`)

**Files:**
- Create: `src/lib/results.ts`
- Test: `src/lib/results.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { fromInteger } from './rational';
import { isCorrect, summarize, type QuestionRecord } from './results';
import { numberStep } from './steps';

function record(stepResults: boolean[], durationMs: number, answeredSteps = stepResults.length) {
  const steps = stepResults.map((_, i) => numberStep({ prompt: `p${i}`, answer: fromInteger(i) }));
  const attempts = stepResults
    .slice(0, answeredSteps)
    .map((correct) => ({ input: '1', result: { correct, expected: '0' } }));
  return {
    question: { key: `k${durationMs}`, topic: 'tables', steps },
    attempts,
    durationMs,
  } satisfies QuestionRecord;
}

describe('isCorrect', () => {
  it('requires every step to be answered correctly', () => {
    expect(isCorrect(record([true], 1000))).toBe(true);
    expect(isCorrect(record([true, true], 1000))).toBe(true);
    expect(isCorrect(record([true, false], 1000))).toBe(false);
    expect(isCorrect(record([true, true], 1000, 1))).toBe(false);
  });
});

describe('summarize', () => {
  it('computes score, percentage, times and mistakes', () => {
    const wrong = record([false], 4000);
    const summary = summarize([record([true], 2000), wrong, record([true], 3000)], 12_000);
    expect(summary).toEqual({
      answered: 3,
      correct: 2,
      percentage: 67,
      totalMs: 12_000,
      averageMs: 3000,
      mistakes: [wrong],
    });
  });

  it('handles a session stopped before any answer', () => {
    expect(summarize([], 5000)).toEqual({
      answered: 0,
      correct: 0,
      percentage: 0,
      totalMs: 5000,
      averageMs: 0,
      mistakes: [],
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/results.test.ts`
Expected: FAIL, with `Failed to resolve import "./results"`.

- [ ] **Step 3: Write the implementation**

```ts
import type { CheckResult, Question } from './types';

export interface StepAttempt {
  input: string;
  result: CheckResult;
}

export interface QuestionRecord {
  question: Question;
  attempts: readonly StepAttempt[];
  /** From showing the question until the final step was submitted. */
  durationMs: number;
}

export interface SessionSummary {
  answered: number;
  correct: number;
  percentage: number;
  /** Wall-clock session time, as shown by the header timer. */
  totalMs: number;
  averageMs: number;
  mistakes: QuestionRecord[];
}

export function isCorrect(record: QuestionRecord): boolean {
  return (
    record.attempts.length === record.question.steps.length &&
    record.attempts.every((attempt) => attempt.result.correct)
  );
}

export function summarize(records: readonly QuestionRecord[], totalMs: number): SessionSummary {
  const answered = records.length;
  const correct = records.filter(isCorrect).length;
  const durationSum = records.reduce((sum, record) => sum + record.durationMs, 0);
  return {
    answered,
    correct,
    percentage: answered === 0 ? 0 : Math.round((correct / answered) * 100),
    totalMs,
    averageMs: answered === 0 ? 0 : durationSum / answered,
    mistakes: records.filter((record) => !isCorrect(record)),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/results.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/results.ts src/lib/results.test.ts
git commit -m "feat: add question records and session summary" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Keypad input reducer (`lib/keypadInput.ts`)

**Files:**
- Create: `src/lib/keypadInput.ts`
- Test: `src/lib/keypadInput.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { applyKey, MAX_INPUT_LENGTH, type KeypadKey } from './keypadInput';

function type(keys: KeypadKey[], start = ''): string {
  return keys.reduce(applyKey, start);
}

describe('applyKey', () => {
  it('appends digits', () => {
    expect(type(['1', '2'])).toBe('12');
  });

  it('allows a single decimal comma', () => {
    expect(type(['1', ',', '5', ','])).toBe('1,5');
    expect(type([','])).toBe(',');
  });

  it('toggles a leading minus regardless of cursor position', () => {
    expect(type(['1', '2', '-'])).toBe('-12');
    expect(type(['1', '2', '-', '-'])).toBe('12');
    expect(type(['-', '5'])).toBe('-5');
  });

  it('removes the last character on backspace', () => {
    expect(type(['1', '2', 'backspace'])).toBe('1');
    expect(type(['backspace'])).toBe('');
    expect(type(['-', 'backspace'])).toBe('');
  });

  it('limits the length of digits and comma', () => {
    const full = '9'.repeat(MAX_INPUT_LENGTH);
    expect(applyKey(full, '1')).toBe(full);
    expect(applyKey(full, ',')).toBe(full);
    expect(applyKey(full, '-')).toBe(`-${full}`);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/keypadInput.test.ts`
Expected: FAIL, with `Failed to resolve import "./keypadInput"`.

- [ ] **Step 3: Write the implementation**

```ts
export type DigitKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
export type KeypadKey = DigitKey | ',' | '-' | 'backspace';

/** Maximum number of digits and comma; the sign is not counted. */
export const MAX_INPUT_LENGTH = 12;

export function applyKey(value: string, key: KeypadKey): string {
  const length = value.replace('-', '').length;
  switch (key) {
    case 'backspace':
      return value.slice(0, -1);
    case '-':
      return value.startsWith('-') ? value.slice(1) : `-${value}`;
    case ',':
      return value.includes(',') || length >= MAX_INPUT_LENGTH ? value : `${value},`;
    default:
      return length >= MAX_INPUT_LENGTH ? value : value + key;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/keypadInput.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/keypadInput.ts src/lib/keypadInput.test.ts
git commit -m "feat: add keypad input reducer" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Keypad and QuestionView components

**Files:**
- Create: `src/components/Keypad.svelte`, `src/components/QuestionView.svelte`
- Test: `src/components/QuestionView.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { fromInteger } from '../lib/rational';
import { numberStep } from '../lib/steps';
import QuestionView from './QuestionView.svelte';

const step = numberStep({ prompt: '3 × 4 = ?', answer: fromInteger(12) });

function answerText(): string {
  return screen.getByLabelText('Jouw antwoord').textContent?.trim() ?? '';
}

function okButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'OK' }) as HTMLButtonElement;
}

describe('QuestionView', () => {
  it('shows the prompt, an empty answer and a disabled OK', () => {
    render(QuestionView, { props: { step, onanswer: vi.fn() } });
    expect(screen.getByText('3 × 4 = ?')).toBeTruthy();
    expect(answerText()).toBe('?');
    expect(okButton().disabled).toBe(true);
  });

  it('builds the answer from key presses and submits the checked result', async () => {
    const onanswer = vi.fn();
    render(QuestionView, { props: { step, onanswer } });
    await fireEvent.click(screen.getByRole('button', { name: '1' }));
    await fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(answerText()).toBe('12');
    await fireEvent.click(okButton());
    expect(onanswer).toHaveBeenCalledWith('12', { correct: true, expected: '12' });
  });

  it('shows a typographic minus and supports backspace', async () => {
    render(QuestionView, { props: { step, onanswer: vi.fn() } });
    await fireEvent.click(screen.getByRole('button', { name: 'min' }));
    await fireEvent.click(screen.getByRole('button', { name: '5' }));
    expect(answerText()).toBe('−5');
    await fireEvent.click(screen.getByRole('button', { name: 'wissen' }));
    expect(answerText()).toBe('−');
    expect(okButton().disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/QuestionView.test.ts`
Expected: FAIL, with `Failed to resolve import "./QuestionView.svelte"`.

- [ ] **Step 3: Write `src/components/Keypad.svelte`**

```svelte
<script lang="ts">
  import type { KeypadKey } from '../lib/keypadInput';

  interface Props {
    canSubmit: boolean;
    onkey: (key: KeypadKey) => void;
    onsubmit: () => void;
  }

  let { canSubmit, onkey, onsubmit }: Props = $props();

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
  <button type="button" class="key ok" disabled={!canSubmit} onclick={onsubmit}>OK</button>
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
    grid-column: span 2;
    background: var(--primary);
    color: var(--primary-text);
    font-weight: 600;
  }
</style>
```

- [ ] **Step 4: Write `src/components/QuestionView.svelte`**

```svelte
<script lang="ts">
  import { formatInput } from '../lib/format';
  import { applyKey, type KeypadKey } from '../lib/keypadInput';
  import { parseDutchNumber } from '../lib/rational';
  import type { CheckResult, Step } from '../lib/types';
  import Keypad from './Keypad.svelte';

  interface Props {
    step: Step;
    onanswer: (input: string, result: CheckResult) => void;
  }

  let { step, onanswer }: Props = $props();

  let value = $state('');
  const canSubmit = $derived(parseDutchNumber(value) !== null);

  function handleKey(key: KeypadKey) {
    value = applyKey(value, key);
  }

  function submit() {
    if (canSubmit) onanswer(value, step.check(value));
  }
</script>

<div class="question">
  <p class="prompt">{step.prompt}</p>
  <output class="answer" aria-label="Jouw antwoord"
    >{value === '' ? '?' : formatInput(value)}{#if step.suffix}<span class="suffix"
        >{step.suffix}</span
      >{/if}</output
  >
  <Keypad {canSubmit} onkey={handleKey} onsubmit={submit} />
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
  }

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

  .suffix {
    margin-left: 0.5rem;
    color: var(--muted);
  }
</style>
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/components/QuestionView.test.ts`
Expected: PASS.

If `answerText()` contains stray whitespace, the `.trim()` in the test already handles it. If the test still fails on whitespace, check that `<output>` contains no newline text nodes.

- [ ] **Step 6: Commit**

```bash
git add src/components/Keypad.svelte src/components/QuestionView.svelte src/components/QuestionView.test.ts
git commit -m "feat: add number keypad and question view" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Feedback component

Spec §3.4:

- **Correct:** shown for 600 ms, then advance automatically.
- **Wrong:** show the user's answer, the correct answer and the explanation, and advance only on **Verder**.

**Files:**
- Create: `src/components/Feedback.svelte`
- Test: `src/components/Feedback.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Feedback from './Feedback.svelte';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Feedback', () => {
  it('auto-advances 600 ms after a correct answer', async () => {
    const onnext = vi.fn();
    render(Feedback, {
      props: { prompt: '3 × 4 = ?', input: '12', result: { correct: true, expected: '12' }, onnext },
    });
    expect(screen.getByText('Goed!')).toBeTruthy();
    await vi.advanceTimersByTimeAsync(599);
    expect(onnext).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(onnext).toHaveBeenCalledOnce();
  });

  it('waits for Verder after a wrong answer and shows the details', async () => {
    const onnext = vi.fn();
    render(Feedback, {
      props: {
        prompt: '91 : 7 = ?',
        input: '-12',
        result: { correct: false, expected: '13', explanation: '13 × 7 = 91' },
        onnext,
      },
    });
    expect(screen.getByText('Fout')).toBeTruthy();
    expect(screen.getByText('−12')).toBeTruthy();
    expect(screen.getByText('13')).toBeTruthy();
    expect(screen.getByText('13 × 7 = 91')).toBeTruthy();

    await vi.advanceTimersByTimeAsync(5000);
    expect(onnext).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByRole('button', { name: 'Verder' }));
    expect(onnext).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/Feedback.test.ts`
Expected: FAIL, with `Failed to resolve import "./Feedback.svelte"`.

- [ ] **Step 3: Write the implementation**

```svelte
<script module lang="ts">
  export const CORRECT_FEEDBACK_MS = 600;
</script>

<script lang="ts">
  import { formatInput } from '../lib/format';
  import type { CheckResult } from '../lib/types';

  interface Props {
    prompt: string;
    input: string;
    result: CheckResult;
    onnext: () => void;
  }

  let { prompt, input, result, onnext }: Props = $props();

  $effect(() => {
    if (!result.correct) return;
    const timer = setTimeout(onnext, CORRECT_FEEDBACK_MS);
    return () => clearTimeout(timer);
  });
</script>

<div class="feedback" class:correct={result.correct} class:wrong={!result.correct}>
  <p class="prompt">{prompt}</p>
  <div role="status" aria-live="polite" class="details">
    {#if result.correct}
      <p class="verdict">Goed!</p>
    {:else}
      <p class="verdict">Fout</p>
      <dl>
        <dt>Jouw antwoord</dt>
        <dd>{formatInput(input)}</dd>
        <dt>Juist antwoord</dt>
        <dd>{result.expected}</dd>
      </dl>
      {#if result.explanation}
        <p class="explanation">{result.explanation}</p>
      {/if}
    {/if}
  </div>
  {#if !result.correct}
    <button type="button" class="primary next" onclick={onnext}>Verder</button>
  {/if}
</div>

<style>
  .feedback {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1.5rem;
    padding: 1.5rem;
    border-radius: var(--radius);
    text-align: center;
    animation: appear 150ms ease-out;
  }

  .correct {
    background: var(--correct-bg);
    color: var(--correct);
  }

  .wrong {
    background: var(--wrong-bg);
    color: var(--text);
  }

  .prompt {
    font-size: 2rem;
    font-weight: 600;
  }

  .verdict {
    font-size: 1.75rem;
    font-weight: 700;
  }

  .wrong .verdict {
    color: var(--wrong);
  }

  dl {
    display: grid;
    grid-template-columns: auto auto;
    justify-content: center;
    gap: 0.5rem 1rem;
    margin: 1rem 0 0;
    font-size: 1.25rem;
  }

  dt {
    text-align: right;
    color: var(--muted);
  }

  dd {
    margin: 0;
    text-align: left;
    font-weight: 600;
  }

  .explanation {
    margin-top: 1rem;
    font-size: 1.25rem;
  }

  .next {
    min-height: 3.5rem;
  }

  @keyframes appear {
    from {
      opacity: 0;
      transform: scale(0.97);
    }
  }
</style>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/components/Feedback.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Feedback.svelte src/components/Feedback.test.ts
git commit -m "feat: add answer feedback with auto-advance on correct answers" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: PlayScreen component

Spec §3.3:

- The header shows the set name, progress, the elapsed timer and a Stop button.
- Stop finishes the session with only the answered questions.
- The duration of each question runs until its final submission.

**Files:**
- Create: `src/components/PlayScreen.svelte`
- Test: `src/components/PlayScreen.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fromInteger } from '../lib/rational';
import { isCorrect, type QuestionRecord } from '../lib/results';
import { TABLES_SET } from '../lib/sets';
import { numberStep } from '../lib/steps';
import type { Question } from '../lib/types';
import PlayScreen from './PlayScreen.svelte';

function question(prompt: string, answer: number): Question {
  return {
    key: prompt,
    topic: 'tables',
    steps: [numberStep({ prompt, answer: fromInteger(answer) })],
  };
}

async function press(...names: string[]) {
  for (const name of names) await fireEvent.click(screen.getByRole('button', { name }));
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('PlayScreen', () => {
  const questions = [question('2 × 3 = ?', 6), question('4 × 5 = ?', 20)];

  it('records answers and finishes after the last question', async () => {
    const onfinish = vi.fn<(records: QuestionRecord[], totalMs: number) => void>();
    render(PlayScreen, { props: { set: TABLES_SET, questions, onfinish } });

    expect(screen.getByText('Tafels')).toBeTruthy();
    expect(screen.getByText('1 / 2')).toBeTruthy();
    await vi.advanceTimersByTimeAsync(2000);
    await press('6', 'OK');
    await vi.advanceTimersByTimeAsync(600);

    expect(screen.getByText('2 / 2')).toBeTruthy();
    await press('9', 'OK', 'Verder');

    expect(onfinish).toHaveBeenCalledOnce();
    const [records, totalMs] = onfinish.mock.calls[0]!;
    expect(records.map(isCorrect)).toEqual([true, false]);
    expect(records[0]!.durationMs).toBe(2000);
    expect(totalMs).toBe(2600);
  });

  it('shows the elapsed time', async () => {
    render(PlayScreen, { props: { set: TABLES_SET, questions, onfinish: vi.fn() } });
    expect(screen.getByText('00:00')).toBeTruthy();
    await vi.advanceTimersByTimeAsync(65_000);
    expect(screen.getByText('01:05')).toBeTruthy();
  });

  it('Stop finishes with only the answered questions', async () => {
    const onfinish = vi.fn<(records: QuestionRecord[], totalMs: number) => void>();
    render(PlayScreen, { props: { set: TABLES_SET, questions, onfinish } });
    await press('6', 'OK');
    await vi.advanceTimersByTimeAsync(600);
    await press('2', 'Stop');
    expect(onfinish).toHaveBeenCalledOnce();
    expect(onfinish.mock.calls[0]![0]).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/PlayScreen.test.ts`
Expected: FAIL, with `Failed to resolve import "./PlayScreen.svelte"`.

- [ ] **Step 3: Write the implementation**

```svelte
<script lang="ts">
  import { formatDuration } from '../lib/format';
  import type { QuestionRecord, StepAttempt } from '../lib/results';
  import type { CheckResult, PracticeSet, Question } from '../lib/types';
  import Feedback from './Feedback.svelte';
  import QuestionView from './QuestionView.svelte';

  interface Props {
    set: PracticeSet;
    questions: readonly Question[];
    onfinish: (records: QuestionRecord[], totalMs: number) => void;
  }

  let { set, questions, onfinish }: Props = $props();

  const sessionStart = Date.now();
  let now = $state(sessionStart);
  let questionIndex = $state(0);
  let stepIndex = $state(0);
  let feedback = $state.raw<StepAttempt | null>(null);

  // Bookkeeping that the template never reads, so plain variables are enough.
  let questionStart = sessionStart;
  let attempts: StepAttempt[] = [];
  let records: QuestionRecord[] = [];

  const question = $derived(questions[questionIndex]!);
  const step = $derived(question.steps[stepIndex]!);

  $effect(() => {
    const interval = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(interval);
  });

  function handleAnswer(input: string, result: CheckResult) {
    const attempt = { input, result };
    attempts = [...attempts, attempt];
    if (attempts.length === question.steps.length) {
      records = [...records, { question, attempts, durationMs: Date.now() - questionStart }];
    }
    feedback = attempt;
  }

  function handleNext() {
    feedback = null;
    if (stepIndex + 1 < question.steps.length) {
      stepIndex++;
    } else if (questionIndex + 1 < questions.length) {
      questionIndex++;
      stepIndex = 0;
      attempts = [];
      questionStart = Date.now();
    } else {
      finish();
    }
  }

  function finish() {
    onfinish(records, Date.now() - sessionStart);
  }
</script>

<div class="play">
  <header>
    <span class="set-name">{set.name}</span>
    <span class="progress">{questionIndex + 1} / {questions.length}</span>
    <span class="timer">{formatDuration(now - sessionStart)}</span>
    <button type="button" class="secondary stop" onclick={finish}>Stop</button>
  </header>

  {#if feedback}
    <Feedback
      prompt={step.prompt}
      input={feedback.input}
      result={feedback.result}
      onnext={handleNext}
    />
  {:else}
    {#key `${questionIndex}-${stepIndex}`}
      <QuestionView {step} onanswer={handleAnswer} />
    {/key}
  {/if}
</div>

<style>
  .play {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: hidden;
  }

  header {
    display: grid;
    grid-template-columns: 1fr auto auto auto;
    align-items: center;
    gap: 0.75rem;
    color: var(--muted);
  }

  .set-name {
    font-weight: 600;
    color: var(--text);
  }

  .stop {
    min-height: 2.75rem;
  }
</style>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/components/PlayScreen.test.ts`
Expected: PASS.

The duration assertions (2000 / 2600) rely on Vitest's fake timers also faking `Date`, which is the default. If they fail, add `vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })`.

- [ ] **Step 5: Commit**

```bash
git add src/components/PlayScreen.svelte src/components/PlayScreen.test.ts
git commit -m "feat: add play screen with progress, timer and stop" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: Overview, setup and result screens + App state machine

Spec §3.1, §3.2, §3.5. The four states are `sets → setup → playing → results`.

**Files:**
- Create: `src/components/SetOverview.svelte`, `src/components/SetupScreen.svelte`, `src/components/ResultScreen.svelte`
- Modify: `src/App.svelte` (replace the placeholder entirely)
- Test: `src/App.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import App from './App.svelte';

async function click(name: string | RegExp) {
  await fireEvent.click(screen.getByRole('button', { name }));
}

describe('App', () => {
  it('opens on the set overview without a preselected set', () => {
    render(App);
    expect(screen.getByText('Kies een oefenset')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Tafels/ })).toBeTruthy();
  });

  it('walks from a set via setup to the first exercise', async () => {
    render(App);
    await click(/Tafels/);
    expect(screen.getByRole('heading', { name: 'Tafels' })).toBeTruthy();
    expect(screen.getByText('Tafels van 2 t/m 15 (zonder 10)')).toBeTruthy();
    expect((screen.getByLabelText('15') as HTMLInputElement).checked).toBe(true);
    await click('Start');
    expect(screen.getByText('1 / 15')).toBeTruthy();
  });

  it('uses the chosen session size and keeps it after Menu', async () => {
    render(App);
    await click(/Tafels/);
    await fireEvent.click(screen.getByLabelText('25'));
    await click('Start');
    expect(screen.getByText('1 / 25')).toBeTruthy();

    await click('Stop');
    expect(screen.getByText('Geen opgaven beantwoord.')).toBeTruthy();
    await click('Menu');
    await click(/Tafels/);
    expect((screen.getByLabelText('25') as HTMLInputElement).checked).toBe(true);
  });

  it('Terug returns to the overview and Opnieuw starts a fresh session', async () => {
    render(App);
    await click(/Tafels/);
    await click('Terug');
    expect(screen.getByText('Kies een oefenset')).toBeTruthy();

    await click(/Tafels/);
    await click('Start');
    await click('Stop');
    await click('Opnieuw');
    expect(screen.getByText('1 / 15')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/App.test.ts`
Expected: FAIL. The placeholder App has no "Kies een oefenset" text.

- [ ] **Step 3: Write `src/components/SetOverview.svelte`**

```svelte
<script lang="ts">
  import type { PracticeSet } from '../lib/types';

  interface Props {
    sets: readonly PracticeSet[];
    onselect: (set: PracticeSet) => void;
  }

  let { sets, onselect }: Props = $props();
</script>

<main class="overview">
  <h1>Rekenhulp</h1>
  <p class="intro">Kies een oefenset</p>
  <ul>
    {#each sets as set (set.id)}
      <li>
        <button type="button" class="card" onclick={() => onselect(set)}>
          <span class="name">{set.name}</span>
          <span class="description">{set.description}</span>
        </button>
      </li>
    {/each}
  </ul>
</main>

<style>
  .overview {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  h1 {
    font-size: 2rem;
  }

  .intro {
    color: var(--muted);
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.75rem;
  }

  .card {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    padding: 1rem 1.25rem;
    text-align: left;
    background: var(--surface);
    border: 2px solid var(--border);
  }

  .card:active {
    border-color: var(--primary);
  }

  .name {
    font-size: 1.25rem;
    font-weight: 600;
  }

  .description {
    color: var(--muted);
  }
</style>
```

- [ ] **Step 4: Write `src/components/SetupScreen.svelte`**

```svelte
<script lang="ts">
  import { DEFAULT_SESSION_SIZE, describeSetTopics, SESSION_SIZES } from '../lib/sets';
  import type { PracticeSet } from '../lib/types';

  interface Props {
    set: PracticeSet;
    size?: number;
    onstart: () => void;
    onback: () => void;
  }

  let { set, size = $bindable(DEFAULT_SESSION_SIZE), onstart, onback }: Props = $props();
</script>

<main class="setup">
  <header>
    <button type="button" class="secondary" onclick={onback}>Terug</button>
    <h1>{set.name}</h1>
  </header>

  <section>
    <h2>Onderwerpen</h2>
    <ul>
      {#each describeSetTopics(set) as label (label)}
        <li>{label}</li>
      {/each}
    </ul>
  </section>

  <fieldset>
    <legend>Aantal opgaven</legend>
    <div class="sizes">
      {#each SESSION_SIZES as option (option)}
        <label>
          <input type="radio" name="size" value={option} bind:group={size} />
          <span>{option}</span>
        </label>
      {/each}
    </div>
  </fieldset>

  <button type="button" class="primary start" onclick={onstart}>Start</button>
</main>

<style>
  .setup {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  h1 {
    font-size: 1.75rem;
  }

  h2,
  legend {
    font-size: 1rem;
    color: var(--muted);
    margin-bottom: 0.5rem;
  }

  ul {
    margin: 0;
    padding-left: 1.25rem;
  }

  fieldset {
    border: none;
    margin: 0;
    padding: 0;
  }

  .sizes {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.5rem;
  }

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  label span {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 3rem;
    border-radius: var(--radius);
    background: var(--key);
    font-weight: 600;
  }

  input:checked + span {
    background: var(--primary);
    color: var(--primary-text);
  }

  .start {
    margin-top: auto;
    min-height: 3.5rem;
  }
</style>
```

- [ ] **Step 5: Write `src/components/ResultScreen.svelte`**

```svelte
<script lang="ts">
  import { formatDuration, formatInput, formatSeconds } from '../lib/format';
  import type { SessionSummary } from '../lib/results';
  import type { PracticeSet } from '../lib/types';

  interface Props {
    set: PracticeSet;
    summary: SessionSummary;
    onrestart: () => void;
    onmenu: () => void;
  }

  let { set, summary, onrestart, onmenu }: Props = $props();

  // Flatten to one entry per wrong step, so multi-step questions show only the failing step.
  const wrongSteps = $derived(
    summary.mistakes.flatMap((record) =>
      record.attempts
        .map((attempt, index) => ({ prompt: record.question.steps[index]?.prompt ?? '', attempt }))
        .filter(({ attempt }) => !attempt.result.correct),
    ),
  );
</script>

<main class="results">
  <h1>Resultaat</h1>
  <p class="set-name">{set.name}</p>

  {#if summary.answered === 0}
    <p>Geen opgaven beantwoord.</p>
  {:else}
    <p class="score">
      {summary.correct} / {summary.answered}
      <span class="percentage">{summary.percentage}%</span>
    </p>
    <dl class="stats">
      <dt>Totale tijd</dt>
      <dd>{formatDuration(summary.totalMs)}</dd>
      <dt>Gemiddeld per opgave</dt>
      <dd>{formatSeconds(summary.averageMs)}</dd>
    </dl>

    {#if wrongSteps.length > 0}
      <h2>Fouten</h2>
      <ul class="mistakes">
        {#each wrongSteps as { prompt, attempt }, index (index)}
          <li>
            <p class="prompt">{prompt}</p>
            <p>Jouw antwoord: <strong>{formatInput(attempt.input)}</strong></p>
            <p>Juist antwoord: <strong>{attempt.result.expected}</strong></p>
            {#if attempt.result.explanation}
              <p class="explanation">{attempt.result.explanation}</p>
            {/if}
          </li>
        {/each}
      </ul>
    {:else}
      <p>Alles goed!</p>
    {/if}
  {/if}

  <div class="actions">
    <button type="button" class="secondary" onclick={onmenu}>Menu</button>
    <button type="button" class="primary" onclick={onrestart}>Opnieuw</button>
  </div>
</main>

<style>
  .results {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .set-name {
    color: var(--muted);
  }

  .score {
    font-size: 2.5rem;
    font-weight: 700;
  }

  .percentage {
    margin-left: 0.75rem;
    font-size: 1.5rem;
    color: var(--muted);
  }

  .stats {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.25rem 1rem;
    margin: 0;
  }

  dt {
    color: var(--muted);
  }

  dd {
    margin: 0;
    font-weight: 600;
  }

  .mistakes {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.75rem;
  }

  .mistakes li {
    padding: 0.75rem 1rem;
    border-radius: var(--radius);
    background: var(--wrong-bg);
  }

  .prompt {
    font-weight: 600;
  }

  .explanation {
    color: var(--muted);
  }

  .actions {
    position: sticky;
    bottom: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    padding-top: 0.5rem;
    background: var(--bg);
  }
</style>
```

- [ ] **Step 6: Replace `src/App.svelte`**

```svelte
<script lang="ts">
  import PlayScreen from './components/PlayScreen.svelte';
  import ResultScreen from './components/ResultScreen.svelte';
  import SetOverview from './components/SetOverview.svelte';
  import SetupScreen from './components/SetupScreen.svelte';
  import { createRng, randomSeed } from './lib/random';
  import { summarize, type QuestionRecord, type SessionSummary } from './lib/results';
  import { buildSession } from './lib/session';
  import { DEFAULT_SESSION_SIZE, PRACTICE_SETS } from './lib/sets';
  import type { PracticeSet, Question } from './lib/types';

  type Screen =
    | { name: 'sets' }
    | { name: 'setup'; set: PracticeSet }
    | { name: 'playing'; set: PracticeSet; questions: Question[] }
    | { name: 'results'; set: PracticeSet; summary: SessionSummary };

  let screen = $state.raw<Screen>({ name: 'sets' });
  // Kept in memory only while the app is open (spec §3.2: nothing is persisted).
  let size = $state(DEFAULT_SESSION_SIZE);

  function showSets() {
    screen = { name: 'sets' };
  }

  function startSession(set: PracticeSet) {
    screen = { name: 'playing', set, questions: buildSession(set, size, createRng(randomSeed())) };
  }

  function finishSession(set: PracticeSet, records: QuestionRecord[], totalMs: number) {
    screen = { name: 'results', set, summary: summarize(records, totalMs) };
  }
</script>

{#if screen.name === 'sets'}
  <SetOverview sets={PRACTICE_SETS} onselect={(set) => (screen = { name: 'setup', set })} />
{:else if screen.name === 'setup'}
  {@const set = screen.set}
  <SetupScreen {set} bind:size onstart={() => startSession(set)} onback={showSets} />
{:else if screen.name === 'playing'}
  {@const set = screen.set}
  {@const questions = screen.questions}
  {#key questions}
    <PlayScreen
      {set}
      {questions}
      onfinish={(records, totalMs) => finishSession(set, records, totalMs)}
    />
  {/key}
{:else}
  {@const set = screen.set}
  <ResultScreen
    {set}
    summary={screen.summary}
    onrestart={() => startSession(set)}
    onmenu={showSets}
  />
{/if}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test -- src/App.test.ts`
Expected: PASS.

- [ ] **Step 8: Run the full suite**

Run: `npm test`
Expected: all test files PASS.

⚠ approval: `npm run check`. Expected: `0 errors`. Fix any warnings about unused CSS selectors or a11y before committing.

- [ ] **Step 9: Commit**

```bash
git add src/App.svelte src/App.test.ts src/components/SetOverview.svelte src/components/SetupScreen.svelte src/components/ResultScreen.svelte
git commit -m "feat: wire set overview, setup, play and results screens" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: PWA (manifest, icons, service worker)

Spec §2, PWA requirements:

- Standalone, portrait.
- Full precache, so the app works offline.
- Silent auto-update.
- Icons are generated from the SVG during the build.

**Files:**
- Create: `public/icon.svg`, `pwa-assets.config.ts`
- Modify: `vite.config.ts`, `package.json` (via npm install)

- [ ] **Step 1: Install the PWA dependencies**

Run: `npm install -D vite-plugin-pwa @vite-pwa/assets-generator`
Expected: both appear in `devDependencies`. The same `ERESOLVE` rule as in Task 1 applies.

- [ ] **Step 2: Write `public/icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#1d4ed8"/>
  <g fill="#ffffff">
    <!-- plus -->
    <rect x="96" y="156" width="120" height="32" rx="16"/>
    <rect x="140" y="112" width="32" height="120" rx="16"/>
    <!-- minus -->
    <rect x="296" y="156" width="120" height="32" rx="16"/>
    <!-- times -->
    <g transform="rotate(45 156 356)">
      <rect x="96" y="340" width="120" height="32" rx="16"/>
      <rect x="140" y="296" width="32" height="120" rx="16"/>
    </g>
    <!-- divide -->
    <rect x="296" y="340" width="120" height="32" rx="16"/>
    <circle cx="356" cy="304" r="18"/>
    <circle cx="356" cy="408" r="18"/>
  </g>
</svg>
```

- [ ] **Step 3: Write `pwa-assets.config.ts`**

```ts
import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset,
  images: ['public/icon.svg'],
});
```

- [ ] **Step 4: Replace `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const isTest = process.env.VITEST !== undefined;

const pwa = VitePWA({
  registerType: 'autoUpdate',
  injectRegister: 'auto',
  pwaAssets: { config: true, overrideManifestIcons: true, includeHtmlHeadLinks: true },
  manifest: {
    name: 'Rekenhulp',
    short_name: 'Rekenhulp',
    description: 'Oefen hoofdrekenen zonder rekenmachine',
    lang: 'nl',
    start_url: '.',
    scope: '.',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#1d4ed8',
    background_color: '#f8fafc',
  },
  workbox: {
    // No 'webmanifest' here: the plugin precaches the manifest itself; a second entry with a
    // different revision makes Workbox throw at SW startup (found in the final review).
    globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
  },
});

export default defineConfig({
  // Relative base so the static build can be hosted in any (sub)folder.
  base: './',
  plugins: [svelte(), ...(isTest ? [svelteTesting()] : [pwa])],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 5: Verify that the tests still pass**

Run: `npm test`
Expected: all PASS. The PWA plugin is not loaded during tests.

- [ ] **Step 6: Verify the build** (⚠ approval)

Run: `npm run build`

Expected: the build succeeds. `dist/` then contains:
- `index.html`
- `sw.js`
- `workbox-*.js`
- `manifest.webmanifest`
- `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`
- `maskable-icon-512x512.png`
- `apple-touch-icon-180x180.png`
- `favicon.ico`

Verify with:
- `ls dist`
- `grep -c "apple-touch-icon" dist/index.html` (expected: ≥ 1)
- `cat dist/manifest.webmanifest` (expected: `"display":"standalone"`, `"orientation":"portrait"` and icons listed)

If the assets generator fails because `sharp` is missing a native binary, run `npm install -D sharp` and build again.

- [ ] **Step 7: Commit**

```bash
git add public/icon.svg pwa-assets.config.ts vite.config.ts package.json package-lock.json
git commit -m "feat: make the app an installable offline PWA" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 16: Final verification and docs

**Files:**
- Modify: `CLAUDE.md` (Status section)

- [ ] **Step 1: Run the full verification**

1. Run `npm test`. Expected: every test file passes, with 0 failures.
2. ⚠ approval: run `npm run check`. Expected: 0 errors and 0 warnings.
3. ⚠ approval: run `npm run build`. Expected: success.

- [ ] **Step 2: Manual check on a phone** (by the user)

1. Host `dist/` (or use `npm run preview -- --host` on the local network, ⚠ approval).
2. iOS Safari: Share → "Zet op beginscherm". Android Chrome: install the app.
3. Open the installed app, then check each of the following:
   - The app opens on the set overview.
   - Tafels leads to setup, with 15 selected.
   - Start shows the first exercise.
   - The keypad does not open the system keyboard.
   - A correct answer advances by itself.
   - A wrong answer shows the correct answer and waits for Verder.
   - Stop leads to results.
   - The page does not scroll or zoom while you answer.
4. Turn on airplane mode, close the app completely and reopen it. The app must still work.
5. Switch the system to dark mode. The app must follow it.

- [ ] **Step 3: Update the Status section in `CLAUDE.md`**

Replace:
```markdown
## Status

Implementing the beta (Tafels set only) via `docs/superpowers/plans/2026-10-05-beta-tafels.md`.
Other sets come later, each with its own plan; do not start those until the user says so.
```
with:
```markdown
## Status

Beta: only the **Tafels** set is implemented (plan: `docs/superpowers/plans/2026-10-05-beta-tafels.md`).
Every other set gets its own implementation plan; widen `Topic`/`AnswerKind` in `lib/types.ts`,
register generators in `lib/topics/index.ts` and append the set to `PRACTICE_SETS` in `lib/sets.ts`.
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: mark beta (Tafels set) as implemented" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Spec coverage (self-review)

| Spec | Covered by |
|---|---|
| §2 stack, PWA, mobile UX | Tasks 1, 15 (CSS: safe areas, `touch-action`, dark mode, reduced motion in Task 1; `aria-live` in Task 12) |
| §3.1 set overview, no preselection | Task 14 (`SetOverview`, App test) |
| §3.2 setup, count 15–100, default 15, in-memory only | Tasks 7, 14 (`SetupScreen`, `bind:size`) |
| §3.3 header, Stop, per-question duration | Task 13 |
| §3.4 feedback, 600 ms / Verder | Task 12 |
| §3.5 results, Opnieuw / Menu | Tasks 9, 14 |
| §4.2 quota algorithm, shuffle, de-duplication | Task 8 |
| §5.1 tables | Task 6 |
| §6 number keypad, OK disabled when empty or invalid | Tasks 10, 11 |
| §8 formatting (comma, U+202F grouping, U+2212 minus) | Task 4 |
| §10 testing strategy (seeded 1000-sample generator tests, session quotas, component tests) | Tasks 2–14 |

Deliberately not covered in the beta: §5.2–§5.13, the answer kinds other than `number`, and §7 (expression engine). These belong to the follow-up plans per set.
