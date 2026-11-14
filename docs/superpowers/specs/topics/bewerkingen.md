# Bewerkingen: topics

Part of the design spec (`../2026-10-05-rekenhulp-design.md`, §5). The § numbers are those of the
spec; its §5 holds the index and the rules shared by several sets.

### 5.8 Order of operations (`orderOfOperations`)

- Expressions are built from these 10 templates (2 to 4 operations, a power counts as one),
  each equally likely:
  - `a + b × c`
  - `a × (b − c) + d`
  - `a − b : c × d`
  - `(a + b)² − c × d`
  - `a² + b × c − d`
  - `a : b + c × (d − e)`
  - `a × b − c : d`
  - `(a − b) × c + d²`
  - `a − (b + c) : d`
  - `a × (b + c²) − d`
- Literals are integers in `[1, 20]`.
- Powers: base `[2, 12]` with exponent 2, or base `[2, 5]` with exponent 3. A power slot (`²`
  above) has exponent 3 in 25% of the exercises. With a negative base, these ranges apply to its
  absolute value.
- Every division is exact, including its intermediate results.
- No trivial parts: a divisor and a quotient have an absolute value of at least 2 (no `x : 1`,
  no `x : x`), no factor of `×` has the value 1 or −1, and no parenthesized part has the
  value 0 (no `(7 − 7)`).
- The power base is spread evenly: per exercise, the exponent (2 or 3) and then the absolute
  value of the base (`[2, 12]` or `[2, 5]`) are drawn first, and the exercise is redrawn until
  its power has exactly that base. Without this, `(a + b)²` would favour large bases.
- The answer is an integer with `|answer| ≤ 500`. Negative answers are allowed.
- Values are drawn at random and the exercise is redrawn (same template) until all of the above
  hold.
- **Negative numbers:** 30% of exercises contain negative literals: 1 or 2 of them (equally
  likely), at random literal positions (never an exponent).
  - In a prompt, a negative literal is always written in parentheses, except when it is the
    first term of the expression or of a parenthesized part, where unary minus is allowed
    (§7): `−7 − (−12)`, `5 × (−3) + 8`, `(−3 + 5) × 2`.
  - A negative power base is always written in parentheses: `(−4)² − 10`. The form `−3²` is
    not generated, because it is a common source of confusion.
- The convention from §8 applies: `×` and `:` have equal priority and are evaluated left to
  right.
- Explanation on error: the evaluation one operation at a time, in the order of §8 (innermost
  parentheses first, then powers, then `×`/`:` from left to right, then `+`/`−` from left to
  right): `3 × (8 − 2) + 4 = 3 × 6 + 4 = 18 + 4 = 22`.

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
- The six strategies are equally likely. Values per strategy:
  - **Compensating (+):** a magnitude `m ∈ {10, 100, 1000}` (equally likely), a round
    `R = k·m` (`k ∈ [2, 8]` for `m = 10`, otherwise `[1, 8]`) and `a = R ± d` with
    `d ∈ [1, 3]`. `b ∈ [m + 1, min(10m − 1, 10 000 − a)]` and not a multiple of 10, so the
    answer never exceeds 10 000 and no redraw skews the mix of magnitudes. The near-round
    number comes first.
  - **Compensating (−):** `b = R ± d` as above, and `a ∈ [R + m, 10m − 1]`: `a` lies beyond
    the next round number, so the difference is not tiny and the explanation never goes below
    zero. Explanation `a − R + d` or `a − R − d`.
  - **Complement:** `100 − b` with `b ∈ [11, 89]`, or `1000 − b` with `b ∈ [101, 989]`, each
    equally likely; `b` is not a multiple of 10, and the answer is at least 11.
  - **Split (×):** `a × 25` with `a = 4k`, `k ∈ [3, 25]`; `a × 50` with `a = 2k`,
    `k ∈ [6, 50]`; `a × 125` with `a = 8k`, `k ∈ [2, 10]`; `a` is never a multiple of 10
    (`100 × 25` is not smart calculation). Explanations `a : 4 × 100`, `a : 2 × 100` and
    `a : 8 × 1000`.
  - **Double / halve:** `a ∈ {15, 25, …, 75}` and `b = 2h` with `h ∈ [6, 15]`, not a multiple
    of 5. Explanation `2a × h`, which is a table fact times 10: `35 × 18 → 70 × 9`.
  - **Split (:):** quotient `q ∈ [13, 99]` for 4 and 8, `[13, 199]` for 5, `[5, 99]` for 25,
    and `a = b × q`; `q` is not a multiple of 10 (`200 : 4` is not smart calculation).
    Explanations `a : 2 : 2`, `a : 2 : 2 : 2`, `a × 2 : 10` and `a × 4 : 100`.
- The de-duplication key is the sum itself, with the factors of a product in ascending order,
  so the same calculation never appears twice in a session, whichever strategy produced it
  (`12 × 25` and `25 × 12` count as one).

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
| distributive      | `a × n`, n close to round        | `7 × 98`, `15 × 99`      | `n = R ± d`, `d ∈ [1,3]`, `a ∈ [3,19]`, `a ≠ n` |
| distributive      | `a × (b + c)`                    | `6 × (40 + 3)`           | `b` round                     |
| distributive      | `a × b + a × c` (factor out)     | `7 × 13 + 7 × 87`        | `b + c` round                 |
| associative       | `(a + b) + c`                    | `(17 + 25) + 75`         | `b + c` round                 |
| associative       | `(a × b) × c`                    | `(13 × 25) × 4`          | `b × c ∈ {100, 1000}`         |
| commutative       | `a + b + c`                      | `38 + 57 + 62`           | `a + c` round                 |
| commutative       | `a × b × c`                      | `25 × 37 × 4`            | `a × c ∈ {100, 1000}`         |

The seven templates are equally likely. Values:

- `a ∈ [3, 19]` without 10 in the three distributive templates; `n = R ± d` with `R` one of
  `20, 30, …, 90, 100, 200, …, 900, 1000` and `d ∈ [1, 3]`; `b ∈ {20, 30, …, 90}` and
  `c ∈ [1, 9]` in `a × (b + c)`.
- The sums that must be round (`b + c` in the factor-out and associative templates, `a + c` in
  the commutative one) are always 100: two numbers in `[11, 89]` that are not multiples of 10.
  The third number is in `[11, 99]` and not a multiple of 10.
- The products that must be round use the pairs `25·4`, `50·2`, `20·5` (100) and `125·8`
  (1000), in either order. The third factor is in `[11, 49]` and not a multiple of 10, so the
  property is worth using (`5 × 3 × 20` is not).
- Only the intended pair is round, so the useful step is unique and Basis never rejects an
  equally handy step: in `a + b + c` and `(a + b) + c` the free number does not end in the
  same digit as either other number (so no other pair adds up to a multiple of 10); in
  `a × b × c` and `(a × b) × c` the free factor times either other factor is not a multiple
  of 100 (so no `2 × 12 × 50` or `(12 × 25) × 4`).
- The de-duplication key is the expression, so the same expression never appears twice in a
  session, not even once as Basis and once as Gevorderd.

Applicable properties (Gevorderd picks one of these, equally likely) and the example rewrite
for each:

| Template          | Commutative            | Associative        | Distributive             |
|-------------------|------------------------|--------------------|--------------------------|
| `a × n`           | `n × a`                | —                  | `a × R − a × d` (or `+`) |
| `a × (b + c)`     | `(b + c) × a`          | —                  | `a × b + a × c`          |
| `a × b + a × c`   | `a × c + a × b`        | —                  | `a × (b + c)`            |
| `(a + b) + c`     | `c + (a + b)`          | `a + (b + c)`      | —                        |
| `(a × b) × c`     | `c × (a × b)`          | `a × (b × c)`      | —                        |
| `a + b + c`       | `a + c + b`            | `a + (b + c)`      | —                        |
| `a × b × c`       | `a × c × b`            | `a × (b × c)`      | —                        |

Example rewrites of the intended property, for instance:

- `7 × 100 − 7 × 2`
- `17 + (25 + 75)`
- `38 + 62 + 57`
- `25 × 4 × 37`

Feedback:

- **Step 1** is an `expression` step. The correct answer shown is the example rewrite of the
  asked property (Basis: the intended one). The explanation is the reason from the rewrite
  checker (§7.1):
  - only a number: "Schrijf een som op, niet alleen de uitkomst."
  - the same expression, or parentheses that do not change the order of evaluation
    (`(17 + 25) + 75` → `17 + 25 + 75`): "Er is niets veranderd."
  - another value: "Deze stap verandert de uitkomst."
  - only a number written differently (`7 × (100 − 2)`), or only a part worked out
    (`6 × (40 + 3)` → `6 × 43`): "Hier is nog geen eigenschap toegepast."
  - more than one step: "Dit zijn meerdere stappen: pas één eigenschap per keer toe."
  - reordering `−` or `:`: "Deze eigenschap geldt niet voor − en :."
  - a valid step with another property: "Geldige stap (commutatief), maar niet handig. Probeer
    distributief." (Basis) or "Geldige stap (commutatief), maar gevraagd is associatief."
    (Gevorderd)
- **Step 2** is a number step with the prompt `7 × 98 = ?`. Its explanation is the evaluation
  of the intended rewrite, one operation at a time as in §5.8:
  `7 × 100 − 7 × 2 = 700 − 7 × 2 = 700 − 14 = 686`.

### Bewerkingen v3 (§5.63–§5.66)

Bewerkingen has no RWT gaps (§12.3); its v3 step is a Verdieping (RWT A.4c, LKT properties and
inverse relations) with four topics (§4.1). The card description stays.

### 5.63 Bracket placement (`bracketPlacement`)

Verdieping. Label: `Haakjes plaatsen (zodat de uitkomst klopt)`. Prompt:
`Zet haakjes zodat het klopt: 3 + 4 × 5 − 2 = 33`. The user types the whole left side with
parentheses on the expression keypad (§6).

- Templates: 3 or 4 integers in `[1, 12]` with 2 or 3 operators from `+ − × :`, at least one
  `×` or `:`. One pair of parentheses around two or more numbers gives the target; without
  parentheses the value differs from the target. Every division is exact, also in the
  parenthesized version; the target is an integer in `[0, 200]`.
- Check (`bracketCheck`): the input parses (§7); its numbers and operators, read without
  parentheses, are the prompt's in the same order; its value equals the target. Any placement
  that does this is correct, also more than one pair. Otherwise:
  - other numbers or operators: `Gebruik dezelfde getallen en bewerkingen in dezelfde volgorde.`
  - another value: the evaluation of the input as §5.8, ending in `≠ 33`.
  - Invalid input gives "Ongeldige som" (§6) and does not count.
- Expected answer: the generated placement. Explanation: its evaluation as §5.8,
  `(3 + 4) × 5 − 2 = 7 × 5 − 2 = 35 − 2 = 33`.
- The de-duplication key is the expression without parentheses and the target.

### 5.64 Derived facts (`derivedFacts`)

Verdieping (LKT inverse relations). Label: `Afleiden (uit een gegeven som)`. Prompt:
`37 × 24 = 888. Hoeveel is 37 × 25?`. The given fact is `a × b` with `a ∈ [13, 99]`,
`b ∈ [12, 49]`, neither a multiple of 10, the product at most 5000. Four derivations, each
equally likely:

| Derivation      | Asked                                     | Explanation                                    |
|-----------------|-------------------------------------------|------------------------------------------------|
| One more / less | `37 × 25`, `37 × 23`, `38 × 24`           | `37 × 25 = 37 × 24 + 37 = 888 + 37 = 925`       |
| Inverse         | `888 : 24`, `888 : 37`                    | `888 : 24 = 37, want 37 × 24 = 888`             |
| Double / halve  | `74 × 24`, `37 × 12` (`b` even), `74 × 12` | `74 × 12 = 37 × 2 × 24 : 2 = 888`              |
| Factor of ten   | `370 × 24`, `3,7 × 24`, `8880 : 24`        | `3,7 × 24 = 888 : 10 = 88,8`                   |

- The answer has at most 2 decimals; each variant within a derivation is equally likely.

### 5.65 Multi-step problems (`multiStepProblems`)

Verdieping (RWT A.4a–c). Label: `Meerstapsopgaven (contexten, delen met rest)`. There are three
forms, each picked with equal probability:

| Form       | Example                                                                                                   | Answer | Suffix     |
|------------|-----------------------------------------------------------------------------------------------------------|--------|------------|
| Operations | `Een school bestelt 28 dozen met elk 24 schriften en verdeelt ze eerlijk over 16 klassen. Hoeveel schriften krijgt elke klas?` | 42 | `schriften` |
| Round up   | `59 kinderen gaan met busjes van 8 plaatsen. Hoeveel busjes zijn er nodig?`                                | 8      | `busjes`   |
| Round down | `Je hebt € 50 en een kaartje kost € 7. Hoeveel kaartjes kun je kopen?`                                      | 7      | `kaartjes` |

- **Operations**, three contexts, each equally likely; every intermediate result is an integer
  (money: at most 2 decimals):
  - `schriften`: `d × s : k`, `d ∈ [5, 40]`, `s ∈ {12, 16, 20, 24, 25, 30}`, `k ∈ [4, 30]`,
    answer at least 5
  - `wisselgeld`: `a` kaartjes van `€ p` en `b` van `€ q`, betalen met `€ B`; `a, b ∈ [2, 6]`,
    `p, q` whole or half euros in `[3, 25]`, `B ∈ {50, 100, 200}` above the total (`€` prefix)
  - `schoolreis`: a bus of `€ B` shared by `n` children plus `€ e` entree each, per child;
    `B ∈ {300, 400, 450, 500, 600, 750}`, `n ∈ [20, 60]` with `B : n` whole, `e ∈ [3, 15]`
    (`€` prefix)
- **Round up / round down:** dividend in `[20, 500]`, divisor in `[3, 15]`, remainder not 0.
  Round up contexts: `busjes` (plaatsen), `dozen` (eieren, 6, 10 or 12 per doos), `tafels`
  (stoelen). Round down: `kaartjes` (€), `zakjes` (snoepjes per zakje, `volle zakjes`),
  `stukken` (cm uit een plank).
- Explanations: `28 × 24 = 672 → 672 : 16 = 42`; `59 : 8 = 7 rest 3 → 8 busjes`;
  `50 : 7 = 7 rest 1 → 7 kaartjes`.

### 5.66 Smart calculation, deeper (`smartCalculationDeep`)

Verdieping. Label: `Handig rekenen+ (buiten haakjes, kommagetallen)`. Four strategies, each
equally likely:

| Strategy          | Example                          | Explanation shown                         |
|-------------------|----------------------------------|-------------------------------------------|
| Factor out        | `99 × 47 + 47`, `47 × 63 + 47 × 37` | `100 × 47 = 4700`, `47 × 100 = 4700`     |
| Decimal factor    | `0,25 × 128`, `2,5 × 4,8`, `1,25 × 24` | `128 : 4 = 32`, `10 × 4,8 : 4 = 12`, `10 × 24 : 8 = 30` |
| Divide by a decimal | `37 : 0,5`, `14 : 0,25`, `9 : 0,2` | `37 × 2 = 74`, `14 × 4 = 56`, `9 × 5 = 45` |
| Money compensation | `€ 7,99 + € 2,98`, `€ 20 − € 4,95` | `8 + 3 − 0,03 = 10,97`, `20 − 5 + 0,05 = 15,05` |

- **Factor out:** `a × n ± a` with `n ∈ {9, 11, 99, 101, 999}` (the sign makes `n ± 1` round),
  or `a × b + a × c` with `b + c ∈ {100, 1000}`; `a ∈ [13, 99]`, not a multiple of 10; the order
  of the terms and factors random.
- **Decimal factor:** `0,25 × 4k` (`k ∈ [3, 50]`), `2,5 × b` with `b` a multiple of 0,4 in
  `[1,2; 12]` and 1 decimal, `1,25 × 8k` (`k ∈ [2, 12]`); the factors in random order.
- **Divide by a decimal:** `a : 0,5` (`a ∈ [11, 99]`), `a : 0,25` (`a ∈ [3, 30]`),
  `a : 0,2` (`a ∈ [3, 50]`).
- **Money compensation:** amounts ending in `,99`, `,98` or `,95` in `[1, 50]`; sum of two such
  amounts, or a whole amount in `{10, 20, 50, 100}` minus one; `€` prefix, answer money.
- The de-duplication key is the sum, factors of a product in ascending order.
