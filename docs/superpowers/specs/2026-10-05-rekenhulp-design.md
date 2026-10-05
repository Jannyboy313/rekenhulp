# Rekenhulp — Design Spec

- Date: 2026-10-05
- Status: Draft, under iteration (not approved for implementation yet)

## 1. Goal

A phone-first PWA for practising arithmetic without a calculator. Purpose: improve general
mental-arithmetic skill and prepare for the PABO rekentoets. The user starts a session, works
through a generated set of exercises, gets immediate feedback per exercise and an overview at
the end.

### Non-goals

- No accounts, database, statistics, streaks or history
- No persistence at all, including localStorage. Every app start uses defaults.
- No network traffic after the initial load. The app works fully offline.
- No adaptive difficulty
- Topics outside the list below (fractions, percentages, ratios, geometry) are not part of v1.
  The architecture must make adding them cheap.

## 2. Platform & stack

| Concern    | Choice                                                                 |
|------------|------------------------------------------------------------------------|
| UI         | Svelte 5 (runes), TypeScript strict, no SvelteKit                      |
| Build      | Vite, static output in `dist/`                                         |
| PWA        | `vite-plugin-pwa`, `generateSW`, precache all assets, `autoUpdate`     |
| Tests      | Vitest (unit), `@testing-library/svelte` for a few component tests     |
| Quality    | `svelte-check`, Prettier                                               |
| Hosting    | Self-hosted by the user, as static files                                |

Rationale for not using SvelteKit: the app has three screens driven by a state machine and
needs no routing, SSR or server endpoints. Plain Vite + Svelte keeps the surface minimal.

### PWA requirements

- Manifest: name `Rekenhulp`, `display: standalone`, `orientation: portrait`, theme and
  background colour, icons 192/512 px plus a maskable icon, and an `apple-touch-icon` for iOS.
- An SVG source icon is checked in. PNGs are generated as part of the build.
- Service worker precaches everything, so the app works in airplane mode after the first visit.
- When a new version is deployed, the app updates silently on the next launch.

### Mobile UX requirements

- Portrait layout for 360–430 px wide screens. Respects `env(safe-area-inset-*)`.
- `touch-action: manipulation` disables double-tap zoom, and the page cannot scroll while
  answering.
- Tap targets are ≥ 48 px. Feedback is announced via `aria-live`.
- Supports `prefers-color-scheme` (light/dark) and `prefers-reduced-motion`.
- The system keyboard is never used for answers; the app has its own keypad (§6).

## 3. Session flow

The app is a state machine in `App.svelte` with three states: `start → playing → results`.
"Opnieuw" moves from `results` back to `playing`, and "Menu" moves to `start`.

### 3.1 Start screen

- The count selector offers 15, 25, 50, 75 and 100 exercises. The default is 15.
- A **Start** button.
- The previous choice is kept in memory only while the app stays open; nothing is persisted.

Note: the 3-minute target corresponds to roughly 15 exercises (~12 s each). Larger counts are
deliberate longer sessions.

### 3.2 Playing

- The header shows progress (`7 / 15`), the elapsed time (`mm:ss`, counting up, no time limit)
  and a **Stop** button.
- Stop ends the session immediately and goes to results. Results then cover only the answered
  exercises; the current, unanswered exercise is not counted.
- The time spent on each exercise is recorded, measured from when it is shown until the final
  submission.

### 3.3 Feedback per exercise

- **Correct:** green confirmation for 600 ms, then automatically on to the next exercise. With
  reduced motion, a static colour is shown instead of an animation.
- **Wrong:** red, with "Jouw antwoord", "Juist antwoord" and an optional explanation (e.g.
  `91 = 7 × 13`). The user moves on by tapping **Verder**.
- Each exercise allows exactly one attempt (two steps for property exercises, §5.6).

### 3.4 Results

- Score `x / n` and percentage
- Total time, and average time per exercise
- A list of wrong exercises, each showing the prompt, the user's answer, the correct answer
  and the explanation
- Buttons **Opnieuw** (new session with the same count) and **Menu**

## 4. Session composition

Given a session size `n`:

| Bucket        | Share                      | Topics                                              |
|---------------|----------------------------|-----------------------------------------------------|
| Mandatory     | `round(0.35 n)`            | Multiplication tables                               |
| Mandatory     | `round(0.30 n)`            | Number theory: LCM, GCD, prime yes/no, factorization |
| Optional      | the remainder              | Each picks uniformly: order of operations, properties, units |

- Number-theory exercises pick their subtype uniformly from the four options.
- Optional exercises pick their topic uniformly per exercise, so an optional topic may be absent
  from a session.
- The final list is shuffled (Fisher–Yates with the session RNG).
- **De-duplication:** each question has a canonical `key`. The session builder retries a
  generator up to 20 times to obtain an unused key. After that, a duplicate is accepted.
- Example for n = 15: 5 table exercises, 5 number-theory exercises (`Math.round(4.5)` = 5),
  and 5 optional exercises.

## 5. Topics

All prompts are in Dutch. Ranges are chosen so that everything can be done mentally.

### 5.1 Multiplication tables (`tables`)

- Factors `a, b ∈ {2, …, 15} \ {10}` (13 values each, 169 combinations)
  - No table of 1, so ×1 never occurs.
  - No table of 10. The exclusion applies to both factors, so `7 × 10` and `70 : 10` never
    occur either.
- There are three forms, each picked with equal probability:
  - product: `13 × 7 = ?`
  - division: `91 : 7 = ?`, where the dividend is always `a × b`
  - missing factor: `? × 7 = 91` or `13 × ? = 91`
- Answer: integer.

### 5.2 LCM — KGV (`lcm`)

- Two distinct numbers `a, b ∈ [2, 60]` with `lcm(a, b) ≤ 300`
- In at least 50% of pairs the numbers share a factor (`gcd(a, b) > 1`), so that simply
  multiplying them is not enough.
- Prompt: `KGV van 12 en 18 = ?`. Explanation on error: the prime factorizations of both numbers.

### 5.3 GCD — GGD (`gcd`)

- Generated as `a = g·p` and `b = g·q`, with `g ∈ [2, 30]`, `p ≠ q`, `gcd(p, q) = 1`, and
  `a, b ≤ 200`
- 10% of exercises are coprime pairs, whose answer is `1`.
- Prompt: `GGD van 84 en 126 = ?`. Explanation on error: the prime factorizations of both numbers.

### 5.4 Prime yes/no (`prime`)

- `n ∈ [11, 199]`
- 50% of the numbers are prime and 50% are composite.
- Composites are odd and not divisible by 5. At least half of them are also not divisible by 3,
  which makes them the hard ones: 49, 77, 91, 119, 121, 133, 143, 161, 169 and 187.
- Answer: **Ja** / **Nee** buttons.
- Explanation on error:
  - if `n` is composite: its smallest factorization, e.g. `91 = 7 × 13`
  - if `n` is prime: "Geen deler tot en met √n"

### 5.5 Prime factorization (`factorization`)

- Composite `n ∈ [12, 200]` with at least 3 prime factors counted with multiplicity (e.g. 84,
  but not 15)
- Prompt: `Ontbind 84 in priemfactoren`
- Input: an expression containing only integers, `×` and `^` (§6).
- The answer is correct when all of the following hold:
  - every base is prime
  - every exponent is ≥ 1
  - the product equals `n`
  - the order of the factors and the notation are free: `2×2×3×7`, `2^2×3×7` and `7×3×2^2` are
    all correct
- Expected answer shown: the canonical form `2² × 3 × 7`.

### 5.6 Properties: commutative, associative, distributive (`properties`)

A two-step exercise:

1. **Rewrite step.** The user enters a rewritten expression, which is validated by the rewrite
   checker (§7).
2. **Result step.** The user enters the numeric result.

- The exercise counts as correct only if both steps are correct.
- If step 1 is wrong, feedback is shown (including an example rewrite), and the user still
  proceeds to step 2.

**Variants**, 50/50 per exercise:

- **Basis:** `Vereenvoudig in één stap: 7 × 98`. The step must be a single valid application of
  the template's *intended* property, i.e. the useful one. A valid step using another property
  is rejected with a hint, e.g. "Geldige stap (commutatief), maar niet handig. Probeer
  distributief."
- **Gevorderd:** `Pas de associatieve eigenschap toe: (17 + 25) + 75`. The named property is
  picked from the properties *applicable* to the expression; it does not have to be the useful
  one. The step must be a single valid application of exactly that property.

**Templates.** In all of them, "round" means a multiple of 10, 100 or 1000.

| Intended property | Template                         | Example                  | Constraint                    |
|-------------------|----------------------------------|--------------------------|-------------------------------|
| distributive      | `a × n`, n close to round        | `7 × 98`, `15 × 99`      | `n = R ± d`, `d ∈ [1,3]`, `a ∈ [3,19]` |
| distributive      | `a × (b + c)`                    | `6 × (40 + 3)`           | `b` round                     |
| distributive      | `a × b + a × c` (factor out)     | `7 × 13 + 7 × 87`        | `b + c` round                 |
| associative       | `(a + b) + c`                    | `(17 + 25) + 75`         | `b + c` round                 |
| associative       | `(a × b) × c`                    | `(13 × 25) × 4`          | `b × c ∈ {100, 1000}`         |
| commutative       | `a + b + c`                      | `38 + 57 + 62`           | `a + c` round                 |
| commutative       | `a × b × c`                      | `25 × 37 × 4`            | `a × c ∈ {100, 1000}`         |

Example rewrites shown on error:

- `7 × 100 − 7 × 2`
- `17 + (25 + 75)`
- `38 + 62 + 57`
- `25 × 4 × 37`

### 5.7 Order of operations (`orderOfOperations`)

- Expressions are built from templates with 3 to 5 operations, for example:
  - `a + b × c`
  - `a × (b − c) + d`
  - `a − b : c × d`
  - `(a + b)² − c × d`
  - `a² + b × c − d`
  - `a : b + c × (d − e)`
- Literals are integers in `[1, 20]`, and there are no negative literals in prompts.
- Powers: base `[2, 12]` with exponent 2, or base `[2, 5]` with exponent 3.
- Every division is exact, including its intermediate results.
- The answer is an integer with `|answer| ≤ 500`. Negative answers are allowed.
- The convention from §8 applies: `×` and `:` have equal priority and are evaluated left to
  right.

### 5.8 Units (`units`)

The exercise is a conversion within one dimension, e.g. `3,5 L = … cm³`.

- Capacity: `ml, cl, dl, L, hl`. The step between neighbouring units is 10, with
  `1 hl = 100 L`.
- Volume: `mm³, cm³, dm³, m³`. The step is 1000.
- Cross links between capacity and volume: `1 cm³ = 1 ml`, `1 dm³ = 1 L`, `1 m³ = 1000 L`.
- Area: `mm², cm², dm², m², are, ha, km²`. The step is 100, with `are = dam²` and
  `ha = hm²`.
- The source value has 1 to 3 significant digits.
- The answer lies in `[0,001; 10 000 000]`, has at most 3 decimals and at most 7 significant
  digits.
- Arithmetic is exact (`lib/rational.ts`), with no floats.
- Accepted input:
  - `0,25`, `,25` and `0,250` are all accepted
  - `−` is accepted
  - a leading zero is optional

## 6. Input (keypad)

The keypad is custom. The system keyboard is never opened.

| Answer kind        | Keys                                                           |
|--------------------|----------------------------------------------------------------|
| number             | `0–9`, `,`, `−`, `⌫`, `OK`                                      |
| boolean            | two large buttons: `Ja` / `Nee`                                |
| expression         | number keys plus `+ − × : ( ) ^`                               |
| factorization      | `0–9`, `×`, `^`, `⌫`, `OK`                                      |

- The input field shows a pretty-printed version as you type: `×`, `:`, and `^2` rendered as
  a superscript.
- `OK` is disabled while the input is empty.
- An unparsable expression gives an inline error ("Ongeldige som") and does **not** count as
  the attempt.

## 7. Expression engine (`lib/expr`)

- **Tokenizer:** integers, decimal commas, `+ − × : ( ) ^`. On the keypad, unary minus only
  occurs at the start of number input.
- **Parser:** recursive descent producing an AST. Explicit parentheses are kept as `Group`
  nodes, because the associative check depends on them.
  - Grammar, by increasing precedence: `sum := product (('+'|'−') product)*`,
    `product := power (('×'|':') power)*`, `power := atom ('^' atom)?`,
    `atom := number | '(' sum ')'`.
- **Evaluate:** exact rational arithmetic via `lib/rational.ts`. Division by zero is reported
  as an error.
- **Chains:** within one parenthesis level, consecutive `+` operands form an n-ary `Sum` chain
  and consecutive `×` operands form a `Product` chain. Subtraction and division are not
  chainable for commutative/associative purposes.

### 7.1 Rewrite checker

`checkRewrite(original, rewritten, property | 'any') → { valid, detected: Property[], reason }`

A step is a single valid application of property P when the value is preserved, the rewritten
expression differs from the original, and exactly one of the following matches:

- **Commutative.** There is exactly one chain (`Sum` or `Product`) whose children are
  permuted, by a non-identity permutation. The children themselves, including `Group`s, are
  unchanged. Everything else in the AST is identical.
- **Associative.** There is exactly one chain whose fully flattened operand sequence (flattened
  through `Group`s of the same operator) is identical *in order*, while the grouping differs.
  Everything else in the AST is identical.
- **Distributive**, in one of two forms:
  - Expand: `F × S` or `S × F` becomes `F×t₁ ± F×t₂`. Here `S` is either `(t₁ ± t₂)`, or a
    literal `n` that is split as `t₁ ± t₂ = n`. The factor may appear on either side within each
    term.
  - Factor out: `F×t₁ ± F×t₂` becomes `F × (t₁ ± t₂)`, again with the factor on either side.
  - In both forms everything else in the AST is identical.

If more than one property is needed (e.g. both reordering and regrouping), the step is rejected
with the reason "Dit zijn meerdere stappen". Steps that violate a property, such as reordering a
subtraction, are rejected with the reason "Deze eigenschap geldt niet voor − en :".

Required test cases (accept ✔ / reject ✘):

| Original          | Required      | Input                | Result |
|-------------------|---------------|----------------------|--------|
| `7 × 98`          | distributive  | `7 × 100 − 7 × 2`    | ✔      |
| `7 × 98`          | distributive  | `7 × 90 + 7 × 8`     | ✔      |
| `7 × 98`          | distributive  | `686`                | ✘ (no rewrite, just the value) |
| `7 × 98`          | distributive  | `98 × 7`             | ✘ (commutative) |
| `(17 + 25) + 75`  | associative   | `17 + (25 + 75)`     | ✔      |
| `(17 + 25) + 75`  | associative   | `(25 + 75) + 17`     | ✘ (multiple steps) |
| `(17 + 25) + 75`  | commutative   | `75 + (17 + 25)`     | ✔      |
| `25 × 37 × 4`     | commutative   | `25 × 4 × 37`        | ✔      |
| `25 × 37 × 4`     | commutative   | `(25 × 4) × 37`      | ✘ (multiple steps) |
| `7 × 13 + 7 × 87` | distributive  | `7 × (13 + 87)`      | ✔      |
| `20 − 5 − 3`      | commutative   | `20 − 3 − 5`         | ✘ (not for −) |

## 8. Conventions

- **Order of operations:** parentheses → powers → `×`/`:` (equal priority, left to right) →
  `+`/`−` (equal priority, left to right).
- **Number formatting:**
  - decimal comma
  - thin-space thousands separator from 10 000 onwards (`2 500 000`)
  - no separator for 4-digit numbers (`1000`)
- **Language:** UI text is in Dutch. Code, comments, tests and documentation are in English.

## 9. Code structure

```
src/
  App.svelte
  main.ts
  components/
    StartScreen.svelte
    QuestionView.svelte     renders prompt + input for any answer kind
    Keypad.svelte           layout chosen by answer kind
    Feedback.svelte
    ResultScreen.svelte
  lib/
    random.ts               seedable PRNG (e.g. mulberry32), helpers: int, pick, shuffle
    rational.ts             exact bigint fractions; Dutch decimal parsing; used everywhere
    format.ts
    session.ts
    types.ts                Question, AnswerKind, CheckResult, Topic
    expr/
      tokenizer.ts
      parser.ts
      evaluate.ts
      chains.ts
      rewriteCheck.ts
    topics/
      tables.ts
      numberTheory.ts       lcm, gcd, prime, factorization (+ math helpers)
      orderOfOperations.ts
      properties.ts
      units.ts
```

Core types:

```ts
type AnswerKind = 'number' | 'boolean' | 'expression' | 'factorization';

interface CheckResult {
  correct: boolean;
  expected: string;
  explanation?: string;
}

interface Step {
  kind: AnswerKind;
  prompt: string;
  check(input: string): CheckResult;
}

interface Question {
  key: string;      // canonical, for de-duplication
  topic: Topic;
  steps: Step[];    // 1 step, or 2 for properties
}
```

## 10. Testing strategy

- **Unit (Vitest), for everything in `lib/`:**
  - Generators are run with a seeded RNG, 1000 questions each, and checked for these
    invariants:
    - values stay within their ranges
    - divisions are exact
    - `check(expected)` returns correct
    - prompts are non-empty
  - Number-theory helpers are compared against brute force.
  - `rational.ts`: arithmetic, normalisation, and Dutch decimal parsing/formatting edge cases.
  - Parser: precedence, left-to-right evaluation, parentheses, and error cases.
  - Rewrite checker: the table in §7.1, plus generated cases taken from each template's
    example rewrite.
  - Session builder: the quotas for every allowed `n`, de-duplication, and determinism with a
    fixed seed.
- **Component tests (`@testing-library/svelte`):** keypad input per answer kind, and the
  feedback flow (auto-advance when correct, Verder when wrong).
- **Manual:** install the PWA on iOS Safari and Android Chrome, then verify offline mode.

## 11. Decisions to confirm during iteration

These are assumptions made while writing the spec. Each one is easy to change.

1. ~~Table ranges~~ — confirmed: factors `{2, …, 15} \ {10}` (see §5.1).
2. Quotas are 35% tables and 30% number theory; the rest is optional topics.
3. Basis property exercises require the *useful* property. A different valid property is
   rejected with a hint.
4. In property exercises, a wrong step 1 still continues to step 2.
5. Feedback for a correct answer lasts 600 ms before auto-advancing.
6. Stop counts only the exercises that have been answered.
7. An unparsable expression does not consume the attempt.
