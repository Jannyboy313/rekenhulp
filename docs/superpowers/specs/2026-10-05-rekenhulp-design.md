# Rekenhulp — Design Spec

- Date: 2026-10-05
- Status: Draft, under iteration (not approved for implementation yet)

## 1. Goal

A phone-first PWA for practising arithmetic without a calculator. Purpose: improve general
mental-arithmetic skill and prepare for the PABO rekentoets. The user picks a themed practice
set, works through a generated session of exercises, gets immediate feedback per exercise and
an overview at the end.

### Non-goals

- No accounts, database, statistics, streaks or history
- No persistence at all, including localStorage. Every app start uses defaults.
- No network traffic after the initial load. The app works fully offline.
- No adaptive difficulty
- Only the topics marked v1 in §4 are in scope for v1. v2 and v3 are on the roadmap (§12), and
  the architecture must make adding them cheap.

## 2. Platform & stack

| Concern    | Choice                                                                 |
|------------|------------------------------------------------------------------------|
| UI         | Svelte 5 (runes), TypeScript strict, no SvelteKit                      |
| Build      | Vite, static output in `dist/`                                         |
| PWA        | `vite-plugin-pwa`, `generateSW`, precache all assets, `autoUpdate`     |
| Tests      | Vitest (unit), `@testing-library/svelte` for a few component tests     |
| Quality    | `svelte-check`, Prettier                                               |
| Hosting    | Self-hosted by the user, as static files                                |

Rationale for not using SvelteKit: the app has four screens driven by a state machine and
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

The app is a state machine in `App.svelte` with four states:
`sets → setup → playing → results`.

- "Terug" moves from `setup` back to `sets`.
- "Opnieuw" moves from `results` back to `playing`, with the same set and count.
- "Menu" moves from `results` to `sets`.

### 3.1 Set overview (start screen)

- The app always opens on this screen, with no set preselected.
- It shows a list of cards, one per available set (§4). Each card shows the set's name and a
  one-line description of its topics.
- Tapping a card opens the setup screen for that set.
- Sets whose topics are not implemented yet (v2/v3) are not shown.

### 3.2 Setup screen

- The header shows the set name and a **Terug** button.
- Below it is a list of the set's topics. For every set except Tafels, the list includes
  "15% tafels".
- **Count:** 15, 25, 50, 75 or 100 exercises. The default is 15.
- A **Start** button.
- The chosen count is kept in memory only while the app stays open; nothing is persisted.

Note: the 3-minute target corresponds to roughly 15 exercises (~12 s each). Larger counts are
deliberate longer sessions.

### 3.3 Playing

- The header shows the set name, progress (`7 / 15`), the elapsed time (`mm:ss`, counting up,
  no time limit) and a **Stop** button.
- Stop ends the session immediately and goes to results. Results then cover only the answered
  exercises; the current, unanswered exercise is not counted.
- The time spent on each exercise is recorded, measured from when it is shown until the final
  submission.

### 3.4 Feedback per exercise

- **Correct:** green confirmation for 600 ms, then automatically on to the next exercise. With
  reduced motion, a static colour is shown instead of an animation.
- **Wrong:** red, with "Jouw antwoord", "Juist antwoord" and an optional explanation (e.g.
  `91 = 7 × 13`). The user moves on by tapping **Verder**.
- Each exercise allows exactly one attempt (two steps for property exercises, §5.11).

### 3.5 Results

- Score `x / n` and percentage
- Total time, and average time per exercise
- A list of wrong exercises, each showing the prompt, the user's answer, the correct answer
  and the explanation
- Buttons **Opnieuw** (new session with the same set and count) and **Menu**

## 4. Practice sets & session composition

### 4.1 Sets

A set is pure configuration (`lib/sets.ts`). Every set except **Tafels** mixes in 15% table
exercises.

| Set                   | Topics (weight 1 unless stated)                                                  | Tables | Version |
|-----------------------|----------------------------------------------------------------------------------|--------|---------|
| **Tafels**            | `tables`                                                                         | 100%   | v1      |
| **Getallen & delers** | `lcm`, `gcd`, `prime`, `factorization`, `divisibility`, `squares`                | 15%    | v1      |
| **Bewerkingen**       | `orderOfOperations`, `properties` (weight 0.5), `smartCalculation`               | 15%    | v1      |
| **Meten**             | `volume`, `area`, `length`, `mass`, `time`, `numberUnits`                        | 15%    | v1      |
| **Verhoudingen**      | `percentages`, `ratios` (v1); `fractionConversion`, `fractionArithmetic` (v2)    | 15%    | v1 + v2 |
| **Toepassingen**      | `speed`, `scale`, `average`, `geometry`                                          | 15%    | v3      |

`properties` has weight 0.5 because it is a two-step exercise and takes about 2–3× as long as
the others.

### 4.2 Quota algorithm

Given a set and a session size `n`:

1. `tablesCount = Math.round(tablesPercent × n / 100)`. The share is stored as an integer
   percentage to avoid float artefacts: `0.15 × 50` must give exactly 7.5, so it rounds to 8.
   For the Tafels set, `tablesPercent = 100` and `topics` is empty.
2. The remaining `r = n − tablesCount` exercises are distributed over the set's topics in
   proportion to their weights, using the **largest remainder method**:
   - Each topic first gets `floor(r × wᵢ / Σw)`.
   - The leftover exercises go one at a time to the topics with the largest fractional parts.
   - Ties are broken by the session RNG.
3. If `r` is at least the number of topics, every topic gets at least 1 exercise. If a topic
   ended up with 0, it takes 1 from the topic with the largest quota.
4. Questions are generated per quota, then the whole list is shuffled (Fisher–Yates with the
   session RNG).
5. **De-duplication:** each question has a canonical `key`. The builder retries a generator up
   to 20 times to obtain an unused key. After that, a duplicate is accepted.

Table share for each count:

| `n`         | 15 | 25 | 50 | 75 | 100 |
|-------------|----|----|----|----|-----|
| tables      | 2  | 4  | 8  | 11 | 15  |

Examples with `n = 15`:

- **Bewerkingen:** `r = 13`, weights 1 / 0.5 / 1, so the shares are 5,2 / 2,6 / 5,2. That gives
  orderOfOperations 5, properties 3 and smartCalculation 5.
- **Getallen & delers:** `r = 13` over 6 topics, so 3 + 2 + 2 + 2 + 2 + 2. The topic with 3 is
  chosen at random.
- **Verhoudingen (v1):** `r = 13` over 2 topics, so 7 + 6.
- **Meten:** `r = 13` over 6 topics, so 3 + 2 + 2 + 2 + 2 + 2. The topic with 3 is chosen at
  random.

## 5. Topics

All prompts are in Dutch. Ranges are chosen so that everything can be done mentally. Every
topic answers with a number unless stated otherwise.

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

- Two distinct numbers `a, b ∈ [2, 60]` with `lcm(a, b) ≤ 300`, in random order
- 75% of the pairs share a factor (`gcd(a, b) > 1`), so that simply multiplying them is not
  enough. The other 25% are coprime.
- Prompt: `KGV van 12 en 18 = ?`
- Explanation on error: the prime factorizations of both numbers, then the LCM as the highest
  power of every prime: `12 = 2² × 3 en 18 = 2 × 3² → KGV = 2² × 3² = 36`. A prime is written
  as `13 is priem`.

### 5.3 GCD — GGD (`gcd`)

- 90% of exercises are generated as `a = g·p` and `b = g·q`, with `g ∈ [2, 30]`, `p ≠ q`,
  `gcd(p, q) = 1`, and `a, b ≤ 200`. First `g` is drawn uniformly, then `(p, q)`. `p = 1` is
  allowed, so one number can divide the other.
- 10% of exercises are coprime pairs, whose answer is `1`. Both numbers are composite and lie in
  `[10, 200]`, so the answer does not follow from spotting two primes.
- Prompt: `GGD van 84 en 126 = ?`
- Explanation on error: the prime factorizations of both numbers, then the common prime powers:
  `84 = 2² × 3 × 7 en 126 = 2 × 3² × 7 → GGD = 2 × 3 × 7 = 42`. For a coprime pair it ends in
  `→ geen gemeenschappelijke priemfactor, GGD = 1`.

### 5.4 Prime yes/no (`prime`)

- `n ∈ [11, 199]`. Prompt: `Is 91 een priemgetal?`
- 50% of the numbers are prime and 50% are composite.
- Composites are odd and not divisible by 5. Half of them are also not divisible by 3, which
  makes them the hard ones: 49, 77, 91, 119, 121, 133, 143, 161, 169 and 187. The other half
  are odd multiples of 3 that are not divisible by 5 (21, 27, 33, …, 189).
- Answer: **Ja** / **Nee** buttons.
- Explanation on error:
  - if `n` is composite: its smallest prime factor times the cofactor, e.g. `91 = 7 × 13` or
    `27 = 3 × 9`
  - if `n` is prime: `Geen deler tot en met √151`, with the actual number

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
- Explanation on error: the division ladder, dividing by the smallest prime each time:
  `84 : 2 = 42, 42 : 2 = 21, 21 : 3 = 7`.

### 5.6 Divisibility rules (`divisibility`)

- Prompt: `Is 2718 deelbaar door 9?`
- Answer: **Ja** / **Nee**.
- Divisors: 2 to 15 without 10, like the tables: `{2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15}`,
  each equally likely.
- The number of digits is drawn uniformly: 3 to 5 digits (`[100, 99 999]`), but only 3 or 4
  digits (`[100, 9999]`) for 7, 13 and 14, which have no digit rule.
- 50% of the numbers are divisible.
- Non-divisible numbers are close calls, so that guessing does not work. Their remainder modulo
  the divisor comes from this table; where there are two groups, each is picked with equal
  probability:

  | Divisor | Remainders                                  | Close call                               |
  |---------|---------------------------------------------|------------------------------------------|
  | 2       | 1                                           | odd                                      |
  | 3       | 1, 2                                        | digit sum off by 1 or 2                  |
  | 4       | 2                                           | last two digits even, not divisible      |
  | 5       | 1, 2, 3, 4                                  | —                                        |
  | 6       | 2, 4 / 3                                    | even but not by 3 / by 3 but odd         |
  | 7       | 1, 2, 5, 6                                  | off by 1 or 2 from a multiple            |
  | 8       | 2, 4, 6                                     | last three digits even, not divisible    |
  | 9       | 1, 2, 7, 8                                  | digit sum off by 1 or 2                  |
  | 11      | 1, 2, 9, 10                                 | alternating sum off by 1 or 2            |
  | 12      | 4, 8 / 3, 6, 9                              | by 4 but not by 3 / by 3 but not by 4    |
  | 13      | 1, 2, 11, 12                                | off by 1 or 2 from a multiple            |
  | 14      | 2, 4, 6, 8, 10, 12 / 7                      | even but not by 7 / by 7 but odd         |
  | 15      | 5, 10 / 3, 6, 9, 12                         | by 5 but not by 3 / by 3 but not by 5    |

- The explanation shows the rule as it applies to the number:
  - 2 and 5: `Laatste cijfer 8 → deelbaar door 2`
  - 3 and 9: `Cijfersom 2 + 7 + 1 + 8 = 18 → deelbaar door 9`
  - 4: `Laatste twee cijfers 18 → niet deelbaar door 4`; 8: `Laatste drie cijfers 718 → …`
  - 11: `Alternerende som 2 − 7 + 1 − 8 = −12 → niet deelbaar door 11`, starting with `+` at
    the leftmost digit
  - 7 and 13, by chunking (*happen*): one multiple of the divisor per non-zero digit of the
    quotient, then the remainder: `2718 = 2100 + 560 + 56 + rest 2 → niet deelbaar door 7`, or
    `2716 = 2100 + 560 + 56 → deelbaar door 7`
  - 6, 12, 14 and 15 combine the rules of two coprime factors (`2 × 3`, `3 × 4`, `2 × 7`,
    `3 × 5`), and always show both: `Deelbaar door 2 (laatste cijfer 6) en niet deelbaar door 3
    (cijfersom 1 + 2 + 4 + 6 = 13) → niet deelbaar door 6`

### 5.7 Squares & square roots (`squares`)

- There are two forms, each picked with equal probability:
  - `17² = ?` with `n ∈ [2, 25]`
  - `√289 = ?` where the radicand is a perfect square from `2²` up to `25²`
- In 70% of exercises `n ∈ [11, 25]`, because those are the squares worth memorising. The other
  30% have `n ∈ [2, 10]`.
- Explanation on error, the same for both forms: `7² = 7 × 7 = 49` for `n ≤ 10`,
  `20² = 20 × 20 = 400`, and otherwise splitting off the tens:
  `17² = 17 × 10 + 17 × 7 = 170 + 119 = 289`, `23² = 23 × 20 + 23 × 3 = 460 + 69 = 529`.

### 5.8 Order of operations (`orderOfOperations`)

- Expressions are built from templates with 3 to 5 operations, for example:
  - `a + b × c`
  - `a × (b − c) + d`
  - `a − b : c × d`
  - `(a + b)² − c × d`
  - `a² + b × c − d`
  - `a : b + c × (d − e)`
- Literals are integers in `[1, 20]`.
- Powers: base `[2, 12]` with exponent 2, or base `[2, 5]` with exponent 3.
- Every division is exact, including its intermediate results.
- The answer is an integer with `|answer| ≤ 500`. Negative answers are allowed.
- **Negative numbers:** about 30% of exercises contain negative literals.
  - In a prompt, a negative literal is always written in parentheses, except when it is the
    first term: `−7 − (−12)`, `5 × (−3) + 8`, `(−4)² − 10`.
  - The form `−3²` is not generated (§11).
- The convention from §8 applies: `×` and `:` have equal priority and are evaluated left to
  right.

### 5.9 Smart calculation (`smartCalculation`)

These exercises are designed so that a mental strategy makes them fast. The answer is a single
number. The difference from `properties` (§5.11) is that the user only gives the result, not
the rewrite.

| Strategy           | Template                        | Example                   | Explanation shown                  |
|--------------------|---------------------------------|---------------------------|------------------------------------|
| Compensating (+)   | `a + b`, `a` close to round     | `398 + 247`               | `400 + 247 − 2 = 645`              |
| Compensating (−)   | `a − b`, `b` close to round     | `5003 − 2998`             | `5003 − 3000 + 2 = 2005`           |
| Complement         | `1000 − b` or `100 − b`         | `1000 − 463`              | `463 + 537 = 1000`                 |
| Split (×)          | `a × b`, `b ∈ {25, 125, 50}`    | `48 × 25`, `16 × 125`     | `48 : 4 × 100 = 1200`              |
| Double / halve     | `a × b`, one factor ends in 5, the other is even | `35 × 18` | `70 × 9 = 630`                |
| Split (:)          | `a : b`, `b ∈ {4, 5, 8, 25}`    | `72 : 4`, `340 : 5`       | `72 : 2 : 2 = 18`                  |

- "Close to round" means within ±1 to ±3 of a multiple of 10, 100 or 1000.
- Answers are integers in `[1, 10 000]`.

### 5.10 Measurement (`volume`, `area`, `length`, `mass`, `time`)

There is one shared conversion engine (`topics/measurement.ts`) with one topic per dimension.
The exercise is always a conversion, e.g. `3,5 L = ? cm³`. The target unit is also shown as the
input suffix (§6).

| Topic    | Units                                          | Steps                                                  |
|----------|------------------------------------------------|--------------------------------------------------------|
| `volume` | `ml, cl, dl, L, hl` and `mm³, cm³, dm³, m³`    | capacity ×10 (`1 hl = 100 L`); cubic ×1000; links `1 cm³ = 1 ml`, `1 dm³ = 1 L`, `1 m³ = 1000 L` |
| `area`   | `mm², cm², dm², m², are, ha, km²`              | ×100 (`are = dam²`, `ha = hm²`)                        |
| `length` | `mm, cm, dm, m, km`                            | ×10 up to m, then `1 km = 1000 m`                      |
| `mass`   | `mg, g, kg, ton`                               | ×1000                                                  |
| `time`   | `s, min, uur, dag`                             | ×60, ×60, ×24                                          |

Value rules for metric dimensions:

- Unit pairs: any two different units of the dimension whose sizes differ by at most a factor
  10⁶, in both directions. So `m³ ↔ cm³` occurs, `m³ ↔ mm³` (10⁹) does not. Within `volume`,
  capacity and cubic units mix freely, including the factor-1 links `ml ↔ cm³` and `L ↔ dm³`.
- The source value has 1 to 3 significant digits.
- The source value and the answer both lie in `[0,001; 10 000 000]` and have at most 3
  decimals. Because every factor is a power of 10, the answer also has at most 3 significant
  digits.

Value rules for `time`:

- Unit pairs: `s ↔ min`, `min ↔ uur`, `uur ↔ dag`, `s ↔ uur` and `min ↔ dag`, in both
  directions. `s ↔ dag` (factor 86 400) is left out.
- The value in the larger unit is at most 100 and is a whole number, a half, a quarter, or a
  number of tenths such as 0,2 or 0,7 (these four groups equally likely). The value in the
  smaller unit is a whole number of at most 10 000. As a result both values have at most 2 decimals, e.g.
  `135 min = 2,25 uur` or `3,5 dag = 84 uur`.
- Prompts never contain mixed notation such as `1 uur 45 min`.

Explanation on error: the conversion fact, followed by the calculation:

- `1 L = 1000 cm³ → 3,5 × 1000 = 3500`
- `1 uur = 60 min → 135 : 60 = 2,25`
- for factor-1 links only the fact: `1 dm³ = 1 L`

General rules:

- Arithmetic is exact (`lib/rational.ts`), with no floats.
- Accepted input:
  - `0,25`, `,25` and `0,250` are all accepted
  - `−` is accepted
  - a leading zero is optional

### 5.11 Properties: commutative, associative, distributive (`properties`)

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

### 5.12 Percentages (`percentages`)

There are four forms, each picked with equal probability:

| Form                | Example                                   | Answer |
|---------------------|-------------------------------------------|--------|
| Part of a whole     | `15% van 80 = ?`                          | 12     |
| What percentage     | `30 is ?% van 120`                        | 25     |
| Discount / increase | `€ 60 na 25% korting = ?`, `€ 40 na 15% verhoging = ?` | 45, 46 |
| Back to 100%        | `20% is 14. Hoeveel is 100%?`             | 70     |

- `p ∈ {1, 2, 5, 10, 12½, 15, 20, 25, 30, 40, 50, 60, 75, 80, 90, 120, 150}`
  - `12½` is written with the fraction glyph in prompts: `12½% van 80 = ?`.
  - Discount uses only `p < 100`; increase uses only `p ≤ 50`.
- The whole (the 100% amount, or the price) is an integer in `[10, 1000]` with at most 2
  significant digits: `85`, `470` and `1000`, but not `487`.
- Answers have at most 2 decimals. Per form:
  - **Part of a whole** and **discount / increase:** 80% of the answers are integers.
  - **What percentage:** the part and the whole are integers. The answer is `p`, so it is an
    integer except for `12½`. This form uses the `fraction` answer kind (§6): `12,5` and
    `25/2` are both correct, and so is any other equal value. All exercises of this form use it,
    so the `/` key does not give away the answer.
  - **Back to 100%:** the answer is the whole, so it is always an integer. In 80% of the
    exercises the given part is an integer as well; otherwise it has 1 or 2 decimals, e.g.
    `15% is 4,5. Hoeveel is 100%?`.
- Money (discount / increase): the prompt reads `€ 60 na 25% korting = ?`, `€` is the input
  prefix (§6), and the correct answer is shown with 2 decimals when it is not whole (`25,50`).
- Explanation on error: a strategy via 1%, 10% or a simple base percentage. Each `p` has a fixed
  base: `1%` for 1 and 2, `5%` for 5 and 15, `10%` for 10, 20, 30, 40, 60, 80, 90 and 120,
  `12½%`, `25%` for 25 and 75, and `50%` for 50 and 150.
  - Part of a whole: `10% = 80 : 10 = 8 → 30% = 3 × 8 = 24`, `25% = 80 : 4 = 20`. 5% and 15%
    go via 10%: `10% = 8, 5% = 4 → 15% = 12`.
  - Discount / increase: the same, followed by the price step:
    `25% = 60 : 4 = 15 → 60 − 15 = 45`, `10% = 4, 5% = 2 → 15% = 6 → 40 + 6 = 46`.
  - What percentage: the part-of-a-whole explanation for the answer, e.g.
    `25% = 120 : 4 = 30`.
  - Back to 100%: from the part via the base: `20% = 14 → 10% = 7 → 100% = 10 × 7 = 70`, or
    `25% = 14 → 100% = 4 × 14 = 56`.

### 5.13 Ratios (`ratios`)

There are three forms, each picked with equal probability:

| Form               | Example                                                         | Answer |
|--------------------|-----------------------------------------------------------------|--------|
| Missing term       | `3 : 5 = 12 : ?`                                                | 20     |
| Scaling            | `Voor 4 personen: 300 g pasta. Hoeveel g voor 6 personen?`      | 450    |
| Dividing in ratio  | `Verdeel 60 in de verhouding 2 : 3. Hoe groot is het grootste deel?` | 36 |

- Answers are integers. The given ratio has terms in `[1, 12]`.
- **Missing term:** a simplified ratio `p : q` with `p ≠ q`. The left side is `m × (p : q)` with
  terms ≤ 12, so it need not be simplified (`4 : 6 = 10 : ?`). The right side is
  `n × (p : q)` with `n ≠ m` and terms ≤ 100. The unknown is in any of the four positions, each
  equally likely.
- **Scaling:** counts `a ≠ b` in `[2, 12]`. There are three contexts: pasta (g) and milk (ml)
  for a number of people, and the price of notebooks (`€`, input prefix). The amount has at
  most 2 significant digits and is at most 1000 (at most `€ 100` for prices). The amount for
  `gcd(a, b)` is an integer, and the answer is at most 2000.
- **Dividing in ratio:** a simplified ratio `a : b` with `a ≠ b`, terms in `[1, 12]`. The total
  is `(a + b) × k` with `k ≥ 2` and is at most 500. The exercise asks for the largest or the
  smallest part, each equally likely.
- Explanation on error:
  - missing term: `3 : 5 = 12 : 20 (× 4)`, `12 : 20 = 3 : 5 (: 4)` or `4 : 6 = 2 : 3 = 10 : 15`
  - scaling: a ratio table via `gcd(a, b)`, e.g. `4 → 300, 2 → 150, 6 → 450`, or
    `4 → 300, 8 → 600`
  - dividing: `2 + 3 = 5 delen → 1 deel = 60 : 5 = 12 → 3 delen = 36`

### 5.14 Large numbers (`numberUnits`)

Part of the set Meten. The names of large numbers and their powers of 10, following the Dutch
**long scale**:

| Name          | Value | Name          | Value |
|---------------|-------|---------------|-------|
| `duizend`     | 10³   | `biljard`     | 10¹⁵  |
| `miljoen`     | 10⁶   | `triljoen`    | 10¹⁸  |
| `miljard`     | 10⁹   | `triljard`    | 10²¹  |
| `biljoen`     | 10¹²  | `quadriljoen` | 10²⁴  |

- Note: `biljoen` is 10¹², not 10⁹ (the English *billion* is a `miljard`).
- `tien` and `honderd` are not used; the topic starts at `duizend`.
- Large numbers are never written out with all their zeros. A prompt uses a power of 10
  instead, e.g. `2,5 × 10⁹`.

There are three forms, each picked with equal probability:

| Form           | Example                                    | Answer |
|----------------|--------------------------------------------|--------|
| Name → power   | `1 biljard = 10ⁿ. n = ?`                   | 15     |
|                | `250 miljoen = 2,5 × 10ⁿ. n = ?`           | 8      |
| Name ↔ name    | `3,5 biljoen = ? miljard`                  | 3500   |
| Power → name   | `2,5 × 10⁹ = ? miljoen`                    | 2500   |

- **Name → power:** in 40% of these the value is 1. Otherwise it is an integer in `[1, 999]`
  with 1 to 3 significant digits. The right-hand side writes the value in scientific notation
  `c × 10ⁿ` with `c ∈ [1, 10)`; for the value 1 it is just `10ⁿ`.
- **Name ↔ name:** only neighbouring names (factor 1000), in both directions. The source value
  has 1 to 3 significant digits; the source value and the answer lie in `[0,001; 100 000]` with
  at most 3 decimals. This is stricter than §5.10, so a prompt never shows something like
  `3 000 000 duizend`.
- **Power → name:** `c ∈ [1, 10)` with 1 to 3 significant digits (`c = 1` is written as just
  `10⁹`), the exponent is at least 3, and the answer lies in `[0,001; 100 000]` with at most 3
  decimals.
- Explanation on error:
  - name → power: `1 miljard = 1000 miljoen = 10⁹`, `1 duizend = 1000 = 10³`,
    `250 miljoen = 2,5 × 10² × 10⁶ = 2,5 × 10⁸`, `7 miljard = 7 × 10⁹`
  - name ↔ name: as in §5.10, `1 biljoen = 1000 miljard → 3,5 × 1000 = 3500`
  - power → name: `10⁹ = 1000 miljoen → 2,5 × 1000 = 2500`, or `10⁵ = 0,1 miljoen → 2,5 × 0,1 = 0,25`

## 6. Input (keypad)

The keypad is custom. The system keyboard is never opened.

| Answer kind        | Keys                                                           |
|--------------------|----------------------------------------------------------------|
| number             | `0–9`, `,`, `−`, `⌫`, `OK`                                      |
| fraction           | number keys plus `/`                                           |
| boolean            | two large buttons: `Ja` / `Nee`; a tap submits at once, no `OK` |
| expression         | number keys plus `+ − × : ( ) ^`                               |
| factorization      | `0–9`, `×`, `^`, `⌫`, `OK`                                      |

- Every answer kind has its own input model: keys, key reducer, validation and display.
- The input field shows a pretty-printed version as you type: `×`, `:`, and `^2` rendered as
  a superscript. The feedback and the results show the given answer the same way.
- `OK` is disabled only while the input is empty.
- Input that cannot be submitted, such as `−`, `25/0` or `2 ×`, gives an inline error and does
  **not** count as the attempt: "Ongeldig getal" for number and fraction, "Ongeldige
  ontbinding" for factorization and "Ongeldige som" for expressions. The error disappears at
  the next key press.
- **Factorization input:** `×` is allowed only directly after a number. `^` is allowed only
  directly after a base, so never at the start, after `×`, or after an exponent. Exponents are
  digits. `2^2×3×7` is shown as `2² × 3 × 7`.
- Units are shown next to the input field, and the user never types them. `€` is a fixed
  prefix (`€ 45`); other units (`%`, `cm³`, …) are a fixed suffix.
- **Fraction input** (introduced with Verhoudingen v1 for `12½%`): the user types `a/b`, e.g.
  `25/2`, or a decimal (`12,5`). `/` is allowed once, after a digit, and not together with a
  comma. Mixed numbers (`12 1/2`) cannot be typed. Any value equal to the answer is correct.

## 7. Expression engine (`lib/expr`)

- **Tokenizer:** integers, decimal commas, `+ − × : ( ) ^`.
- **Unary minus:** it is allowed at the start of an expression and directly after `(`. It is
  needed for the negative literals in §5.8. In user input it only occurs in number answers.
- **Parser:** recursive descent producing an AST. Explicit parentheses are kept as `Group`
  nodes, because the associative check depends on them.
  - Grammar, by increasing precedence: `sum := product (('+'|'−') product)*`,
    `product := power (('×'|':') power)*`, `power := unary ('^' atom)?`,
    `unary := '−' atom | atom`, `atom := number | '(' sum ')'`.
  - As a result, `−3²` would parse as `(−3)²`. This is the reason §5.8 never generates that form
    in a prompt.
- **Evaluate:** exact rational arithmetic via `lib/rational.ts`. Division by zero is reported
  as an error.
- **Formatter:** turns an AST into prompt text following §8. It inserts the parentheses around
  negative literals itself.
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
  - thousands separator from 10 000 onwards (`2 500 000`): a narrow no-break space (U+202F),
    i.e. a thin space that never wraps
  - no separator for 4-digit numbers (`1000`)
  - the minus sign is shown as `−` (U+2212)
  - money: `€`, a no-break space (U+00A0), then the amount; whole euros without decimals,
    otherwise 2 decimals (`€ 45`, `€ 25,50`)
  - half percentages use the fraction glyph: `12½%`
- **Language:** UI text is in Dutch. Code, comments, tests and documentation are in English.

## 9. Code structure

```
src/
  App.svelte
  main.ts
  components/
    SetOverview.svelte      start screen: set cards
    SetupScreen.svelte      topics of the chosen set + count selector + Start
    PlayScreen.svelte       header (progress, timer, Stop) + question/feedback loop
    QuestionView.svelte     renders prompt + input for any answer kind
    Keypad.svelte           layout chosen by answer kind
    Feedback.svelte
    ResultScreen.svelte
  lib/
    random.ts               seedable PRNG (e.g. mulberry32), helpers: int, pick, shuffle
    rational.ts             exact bigint fractions; Dutch decimal parsing; used everywhere
    format.ts
    steps.ts                step factories, e.g. numberStep (shared answer checking)
    keypadInput.ts          pure key → input-string reducers used by Keypad
    inputModels.ts          per answer kind: keys, reducer, validation, display (§6)
    primes.ts               gcd, lcm, isPrime, prime factorization (shared math helpers)
    results.ts              per-question records + session summary
    sets.ts                 practice set definitions (§4.1)
    session.ts              quota algorithm (§4.2), generation, shuffle, de-duplication
    types.ts                Question, Step, AnswerKind, CheckResult, Topic, PracticeSet
    expr/
      tokenizer.ts
      parser.ts
      evaluate.ts
      format.ts
      chains.ts
      rewriteCheck.ts
    topics/
      index.ts              Topic → generator registry
      tables.ts
      numberTheory.ts       lcm, gcd, prime, factorization
      divisibility.ts
      squares.ts
      orderOfOperations.ts
      smartCalculation.ts
      properties.ts
      measurement.ts        conversion engine + volume, area, length, mass, time
      numberUnits.ts        large numbers: names and powers of 10 (reuses the engine)
      percentages.ts
      ratios.ts
```

Core types:

```ts
type AnswerKind = 'number' | 'fraction' | 'boolean' | 'expression' | 'factorization';

type Topic =
  | 'tables' | 'lcm' | 'gcd' | 'prime' | 'factorization' | 'divisibility' | 'squares'
  | 'orderOfOperations' | 'smartCalculation' | 'properties'
  | 'volume' | 'area' | 'length' | 'mass' | 'time' | 'numberUnits'
  | 'percentages' | 'ratios';

interface CheckResult {
  correct: boolean;
  expected: string;
  explanation?: string;
}

interface Step {
  kind: AnswerKind;
  prompt: string;
  prefix?: string;  // fixed unit shown before the input: '€'
  suffix?: string;  // fixed unit shown after the input, e.g. 'cm³', '%'
  check(input: string): CheckResult;
}

interface Question {
  key: string;      // canonical, for de-duplication
  topic: Topic;
  steps: Step[];    // 1 step, or 2 for properties
}

interface PracticeSet {
  id: string;
  name: string;           // Dutch, e.g. 'Getallen & delers'
  description: string;    // Dutch, one line
  topics: { topic: Topic; weight: number }[];   // excludes the mixed-in tables
  tablesPercent: number;  // 100 for Tafels, 15 otherwise
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
  - Parser: precedence, left-to-right evaluation, unary minus, parentheses, and error cases.
  - Rewrite checker: the table in §7.1, plus generated cases taken from each template's
    example rewrite.
  - Divisibility: every generated explanation agrees with actual divisibility.
  - Sets and session builder:
    - quotas for every set × every allowed `n` (incl. the examples in §4.2)
    - every topic is present when `r ≥ topics`
    - de-duplication works
    - output is deterministic with a fixed seed
- **Component tests (`@testing-library/svelte`):** keypad input per answer kind, and the
  feedback flow (auto-advance when correct, Verder when wrong).
- **Manual:** install the PWA on iOS Safari and Android Chrome, then verify offline mode.

## 11. Decisions to confirm during iteration

These are assumptions made while writing the spec. Each one is easy to change.

1. ~~Table ranges~~ — confirmed: factors `{2, …, 15} \ {10}` (see §5.1).
2. ~~Session quotas~~ — replaced by practice sets with 15% tables (§4).
3. Basis property exercises require the *useful* property. A different valid property is
   rejected with a hint.
4. In property exercises, a wrong step 1 still continues to step 2.
5. Feedback for a correct answer lasts 600 ms before auto-advancing.
6. Stop counts only the exercises that have been answered.
7. ~~Invalid input~~ — confirmed: input that cannot be submitted gives an inline error and
   does not consume the attempt, for every keypad answer kind (§6).
8. The form `−3²` (which equals −9) is not generated, because it is a common source of
   confusion. It could be added as a deliberate trick question.
9. ~~Divisors~~ — confirmed: 2 to 15 without 10, like the tables. 7 and 13 are explained by
   chunking, and with 14 they use numbers of at most 4 digits (§5.6).
10. ~~Units~~ — confirmed: length `mm, cm, dm, m, km` without `dam`/`hm`, mass
    `mg, g, kg, ton` without `cg`/`dg`. Metric conversions span at most a factor 10⁶, and time
    leaves out `s ↔ dag` (§5.10). Large numbers (§5.14) were added to Meten.
11. ~~Default set~~ — confirmed: the app opens on the set overview, with no set preselected.
    Choosing a set leads to a separate setup screen (§3.1, §3.2).
12. ~~Verhoudingen v1~~ — confirmed: `€` is an input prefix and money answers show 2 decimals
    when not whole. `12½` is written as a fraction in prompts, and as an answer both `25/2`
    and `12,5` are correct, which brings the `fraction` input (`/` key) forward from v2.
    Discount uses `p < 100` and increase `p ≤ 50`. A missing ratio term can be in any of the
    four positions (§5.12, §5.13).
13. ~~Getallen & delers~~ — confirmed: a tap on `Ja` or `Nee` submits at once (§6). A prime
    is explained as `Geen deler tot en met √n` with the actual number (§5.4).

## 12. Roadmap (not in v1)

- **v2 — Fractions** (in set *Verhoudingen*)
  - The answer kind `fraction` (number keypad plus `/`, exact comparison via `rational.ts`)
    already exists since Verhoudingen v1 (§6). v2 adds per-exercise judging of the simplified
    and the unsimplified form.
  - `fractionConversion`: fraction ↔ decimal ↔ percentage, e.g. `3/8 = ?`, `0,125 = ?%`,
    `40% = ?/?`.
  - `fractionArithmetic`: `2/3 + 1/4`, `3/4 × 2/5`, `vereenvoudig 18/24`.
- **v3 — Applications** (new set *Toepassingen*)
  - `speed`: distance, time and speed; km/u ↔ m/s
  - `scale`: map scale ↔ real distance
  - `average`: mean, median and mode of a short list
  - `geometry`: compute the perimeter, area or volume of rectangles and boxes, including unit
    conversion
- **Optional later:** an "Alles gemengd" set, and topic toggles on the setup screen.
