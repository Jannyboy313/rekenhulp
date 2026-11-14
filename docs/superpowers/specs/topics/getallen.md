# Getallen & delers: topics

Part of the design spec (`../2026-10-05-rekenhulp-design.md`, §5). The § numbers are those of the
spec; its §5 holds the index and the rules shared by several sets.

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
  digits (`[100, 9999]`) for 7, 13 and 14, which have no simple digit rule.
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

### Getallen & delers v3 (§5.59–§5.62)

Getallen & delers has no RWT gaps (§12.3); its v3 step is a Verdieping at LKT level with four
topics (§4.1). The card description stays.

### 5.59 LCM and GCD in context (`lcmGcdProblems`)

Verdieping. Label: `KGV en GGD in context (samen vertrekken, gelijke stukken)`. LCM and GCD
each 50%, three contexts each, each equally likely:

| Kind | Context | Example                                                                                                               | Suffix      |
|------|---------|-----------------------------------------------------------------------------------------------------------------------|-------------|
| KGV  | bus     | `Bus A vertrekt elke 12 minuten, bus B elke 18 minuten. Om 8:00 vertrekken ze samen. Na hoeveel minuten weer?`        | `min`       |
| KGV  | lampen  | `Lamp A knippert elke 4 seconden, lamp B elke 6 seconden. Ze knipperen nu samen. Na hoeveel seconden weer?`           | `s`         |
| KGV  | groepjes | `Een klas kan in groepjes van 4 en in groepjes van 6, zonder dat er iemand overblijft. Hoeveel kinderen zijn er minstens?` | `kinderen` |
| GGD  | planken | `Een plank van 84 cm en een van 126 cm zaag je in zo lang mogelijke gelijke stukken, zonder afval. Hoe lang is een stuk?` | `cm`     |
| GGD  | fruit   | `Je hebt 24 appels en 36 peren en maakt zoveel mogelijk gelijke fruitschalen zonder over te houden. Hoeveel schalen?`  | `schalen`   |
| GGD  | tegels  | `Een vloer van 360 cm bij 480 cm leg je vol met zo groot mogelijke vierkante tegels. Hoe lang is een zijde?`         | `cm`        |

- KGV: `a ≠ b ∈ [4, 30]`, `lcm ≤ 120` (groepjes `[2, 12]`, `lcm ≤ 60`; in 30% three sizes), and
  in 75% `gcd(a, b) > 1`, as §5.2.
- GGD: as §5.3 without coprime pairs and with `p, q ≥ 2`; planken `a, b ∈ [50, 200]`, fruit
  `a, b ≤ 100`, tegels `a, b` multiples of 10 in `[100, 900]` with `g ≥ 20`.
- Explanation: the concept, then the §5.2/§5.3 explanation: `Weer samen = KGV. 12 = 2² × 3 en
  18 = 2 × 3² → KGV = 2² × 3² = 36`, `Zo lang mogelijk = GGD. 84 = 2² × 3 × 7 en 126 = 2 × 3² × 7
  → GGD = 2 × 3 × 7 = 42`.

### 5.60 Divisors (`divisors`)

Verdieping. Label: `Delers (aantal delers, drie getallen, uit ontbinding)`. There are three forms,
each picked with equal probability:

| Form                  | Example                                                    | Answer |
|-----------------------|------------------------------------------------------------|--------|
| Number of divisors    | `Hoeveel delers heeft 36?`                                 | 9      |
| Three numbers         | `KGV van 4, 6 en 10 = ?`, `GGD van 24, 36 en 60 = ?`        | 60, 12 |
| From a factorization  | `a = 2² × 3 × 5 en b = 2 × 3² × 7. GGD van a en b = ?`      | 6      |

- **Number of divisors:** composite `n ∈ [12, 120]` with 4 to 12 divisors (1 and `n` count).
- **Three numbers:** KGV or GGD, 50/50. KGV: distinct `a, b, c ∈ [2, 20]`, none a divisor of
  another, `lcm ≤ 360`. GGD: `g ∈ [2, 25]` and `g × p₁, g × p₂, g × p₃` with distinct `pᵢ ≥ 2`,
  `gcd(p₁, p₂, p₃) = 1`, all at most 200.
- **From a factorization:** `a` and `b` are products of primes from `{2, 3, 5, 7}` with
  exponents at most 3, each at most 1000, written as in §5.5; KGV (at most 2000) or GGD (at
  least 2), 50/50.
- Explanations: the divisor pairs, `1 × 36, 2 × 18, 3 × 12, 4 × 9, 6 × 6 → 9 delers`; three
  numbers as §5.2/§5.3 with three factorizations; from a factorization
  `gemeenschappelijk: 2 × 3 → GGD = 6`, `hoogste machten: 2² × 3² × 5 × 7 → KGV = 1260`.

### 5.61 Missing digit (`missingDigit`)

Verdieping. Label: `Ontbrekend cijfer en deelbaarheid`. There are two forms, each picked with
equal probability:

| Form             | Example                                                                 | Answer |
|------------------|-------------------------------------------------------------------------|--------|
| Missing digit    | `3?72 is deelbaar door 9. Welk cijfer staat op de lege plek?`            | 6      |
| Smallest/largest | `Wat is het kleinste getal van vier cijfers dat deelbaar is door 6?`     | 1002   |

- **Missing digit:** the `?` is the slot (`SLOT`, never a literal `?`). Divisors
  `{3, 4, 6, 8, 9, 11, 12}`; the number has 3 to 5 digits and the slot is never its first digit.
  When more than one digit fits, the prompt ends `Geef het kleinste.` (or `het grootste`,
  50/50) and that digit is the answer.
- **Smallest/largest:** `kleinste getal van n cijfers`, `grootste getal van n cijfers` or
  `kleinste getal boven m`, each equally likely; `n ∈ {3, 4}`, `m` a multiple of 100 in
  `[200, 900]`, divisors `{3, 4, 6, 7, 8, 9, 11, 12, 13, 15}`.
- Explanations: the rule of §5.6 with the digit filled in: `Cijfersom 3 + 7 + 2 = 12 →
  12 + 6 = 18 is deelbaar door 9 → 6`; `1000 : 6 = 166 rest 4 → 1000 + 2 = 1002`,
  `9999 : 7 = 1428 rest 3 → 9999 − 3 = 9996`.

### 5.62 Remainders (`remainders`)

Verdieping. Label: `Restpuzzels (delen met rest en KGV)`. There are three forms, each picked with
equal probability:

| Form               | Example                                                                                                        | Answer |
|--------------------|----------------------------------------------------------------------------------------------------------------|--------|
| Same remainder     | `Een getal tussen 50 en 100 geeft bij delen door 2, 3, 4 en 5 steeds rest 1. Welk getal is het?`                | 61     |
| Groups             | `Bij groepjes van 4 blijft er 1 kind over, bij groepjes van 5 ook. Er zijn tussen de 20 en 30 kinderen. Hoeveel?` | 21   |
| Two remainders     | `Wat is het kleinste getal dat bij delen door 4 rest 2 geeft en bij delen door 3 rest 1?`                      | 10     |

- **Same remainder:** divisor sets with `L = lcm ≤ 60`: `{2, 3}`, `{3, 4}`, `{4, 6}`, `{2, 5}`,
  `{3, 5}`, `{4, 5}`, `{2, 3, 4}`, `{2, 3, 5}`, `{2, 3, 4, 5}`, `{3, 4, 5}`; remainder `r ∈ [1,
  min − 1]`; bounds multiples of 10 at most 200 that contain exactly one `k × L + r`, `k ≥ 1`.
- **Groups:** two group sizes from `[3, 8]`, `lcm ≤ 40`, the same remainder `r ≥ 1`, bounds as
  above; context `kinderen`.
- **Two remainders:** coprime `m₁, m₂ ∈ [3, 9]`, `r₁ ∈ [1, m₁ − 1]`, `r₂ ∈ [1, m₂ − 1]`, answer
  the smallest positive solution, at most 60.
- Explanations: `KGV van 2, 3, 4 en 5 = 60 → 60 + 1 = 61`; `KGV van 4 en 5 = 20 → 20 + 1 = 21`;
  `rest 2 bij 4: 2, 6, 10 → 10 : 3 = 3 rest 1 → 10`.
