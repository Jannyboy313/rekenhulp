# Breuken & kommagetallen: topics

Part of the design spec (`../2026-10-05-rekenhulp-design.md`, §5). The § numbers are those of the
spec; its §5 holds the index and the rules shared by several sets.

### 5.20 Fraction conversion (`fractionConversion`)

Part of the set Breuken & kommagetallen. Converting between fraction, decimal and percentage, for
the fractions that are worth knowing by heart.

- **Fractions:** `p/q` in lowest terms with `0 < p < q` and `q ∈ {2, 4, 5, 8, 10, 20, 25, 50}`.
  Fraction ↔ percentage also uses `q ∈ {3, 6}`: `1/3`, `2/3`, `1/6` and `5/6`
  (`33 1/3%`, `66 2/3%`, `16 2/3%`, `83 1/3%`). `q` is drawn uniformly, then `p`.

There are six directions, each picked with equal probability:

| Direction             | Prompt                          | Answer   | Answer kind |
|-----------------------|---------------------------------|----------|-------------|
| fraction → decimal    | `Schrijf als kommagetal: 3/8`   | `0,375`  | number      |
| decimal → fraction    | `Schrijf als breuk: 0,375`      | `3/8`    | fraction, simplest form, no decimal |
| fraction → percentage | `3/8 = ?%`                      | `37,5`   | fraction, any equal value |
| percentage → fraction | `Schrijf als breuk: 37,5%`      | `3/8`    | fraction, simplest form, no decimal |
| decimal → percentage  | `0,375 = ?%`                    | `37,5`   | number      |
| percentage → decimal  | `Schrijf als kommagetal: 37,5%` | `0,375`  | number      |

- A percentage prompt uses a decimal comma (`37,5%`), or a mixed number for thirds and sixths
  (`33 1/3%`, drawn stacked). The `%` answers have the suffix `%`.
- Fraction → percentage always uses the fraction keypad, as in §5.12, so the breuk key does not
  give away the thirds. Any equal value is correct (`37,5`, `75/2`); the expected answer is
  `37,5` or `33 1/3`.
- Explanations:
  - fraction → decimal, via the smallest power of ten the denominator divides:
    `3/8 = 375/1000 = 0,375`, `7/20 = 35/100 = 0,35`
  - decimal → fraction, the other way round: `0,375 = 375/1000 = 3/8`, `0,7 = 7/10`
  - fraction → percentage: `3/8 = 0,375 = 37,5%`; thirds and sixths via 100%:
    `1/3 = 100% : 3 = 33 1/3%`, `5/6 = 5 × 16 2/3% = 83 1/3%`
  - percentage → fraction: `37,5% = 0,375 = 375/1000 = 3/8`, `33 1/3% = 100% : 3 = 1/3`,
    `66 2/3% = 2 × 33 1/3% = 2/3`
  - decimal → percentage: `0,375 = 0,375 × 100% = 37,5%`
  - percentage → decimal: `37,5% = 37,5 : 100 = 0,375`
- The de-duplication key is the direction and the fraction.

### 5.21 Fraction arithmetic (`fractionArithmetic`)

Part of the set Breuken & kommagetallen. A **proper fraction** below is `p/q` in lowest terms
with `0 < p < q` and `q ∈ [2, 12]`.

There are four groups, each picked with equal probability, with two forms each (50% each,
unless stated otherwise):

| Group                 | Form              | Example                               | Answer          | Answer kind |
|-----------------------|-------------------|---------------------------------------|-----------------|-------------|
| Simplify, equivalent  | simplify          | `Vereenvoudig 18/24`                  | `3/4`           | fraction, simplest form, no decimal |
|                       | equivalent        | `3/4 = ?/12`                          | `9`             | number      |
| Add, subtract         | add / subtract    | `2/3 + 1/4 = ?`, `3 1/2 − 1 3/4 = ?`  | `11/12`, `1 3/4` | fraction, simplest form, decimal allowed |
| Multiply, divide      | multiply / divide | `3/4 × 2/5 = ?`, `2/3 : 4/9 = ?`      | `3/10`, `1 1/2` | fraction, simplest form, decimal allowed |
| Part of a number      | part              | `3/4 van 24 = ?`                      | `18`            | number      |
|                       | back to the whole | `3/4 is 18. Hoeveel is het geheel?`   | `24`            | number      |

- **Simplify:** the answer `p/q` is in lowest terms with `q ∈ [2, 12]`: a proper fraction in
  80%, and an improper one with `q < p < 2q` in 20% (`Vereenvoudig 15/12` → `5/4` or `1 1/4`).
  The prompt multiplies both by `k ∈ [2, 10]`, with both terms at most 100.
  - Explanation: `18/24 = 3/4 (teller en noemer : 6)`, improper: `15/12 = 5/4 = 1 1/4 (teller
    en noemer : 3)`.
- **Equivalent:** a proper fraction `p/q` and `kp/kq` with `k ∈ [2, 10]` and `kq ≤ 100`. Four
  variants, each equally likely: `3/4 = ?/12`, `3/4 = 9/?`, `9/12 = ?/4` and `9/12 = 3/?`. The
  `?` is drawn as a slot of the stacked fraction (§8).
  - Explanation: `3/4 = 9/12 (teller en noemer × 3)`, `9/12 = 3/4 (teller en noemer : 3)`.
- **Add / subtract** (each 50%): two proper fractions with different denominators whose LCM is at
  most 36. In 30% both terms are mixed numbers with whole parts in `[1, 5]`. A difference is
  positive; with mixed numbers the first whole part is larger than the second.
  - Explanation: make the denominators equal (the LCM), then add, simplify and take out the
    wholes as needed: `2/3 + 1/4 = 8/12 + 3/12 = 11/12`, `1/6 + 1/3 = 1/6 + 2/6 = 3/6 = 1/2`,
    `2/3 + 3/4 = 8/12 + 9/12 = 17/12 = 1 5/12`. Mixed numbers keep their wholes:
    `2 2/3 + 1 3/4 = 2 8/12 + 1 9/12 = 3 17/12 = 4 5/12`, and a subtraction that needs it
    exchanges one whole: `3 1/2 − 1 3/4 = 3 2/4 − 1 3/4 = 2 6/4 − 1 3/4 = 1 3/4`.
- **Multiply / divide** (each 50%):
  - multiply: two proper fractions (60%, `3/4 × 2/5`), or a whole number `n ∈ [2, 12]` and a
    proper fraction in either order (40%, `6 × 2/3`)
  - divide: two different proper fractions (60%, `2/3 : 4/9`), a proper fraction by a whole
    number `n ∈ [2, 12]` (20%, `3/4 : 3`), or a whole number by a proper fraction (20%,
    `6 : 2/3`)
  - Explanation: numerator times numerator and denominator times denominator; dividing is
    multiplying by the inverse. Simplify and take out the wholes at the end:
    `3/4 × 2/5 = 6/20 = 3/10`, `6 × 2/3 = 12/3 = 4`, `2/3 : 4/9 = 2/3 × 9/4 = 18/12 = 3/2 = 1 1/2`,
    `3/4 : 3 = 3/4 × 1/3 = 3/12 = 1/4`, `6 : 2/3 = 6 × 3/2 = 18/2 = 9`.
- **Part of a number:** a proper fraction `p/q` and a whole `N = q × m` with `m ∈ [2, 12]`.
  - part: `3/4 van 24 = ?`, answer `p × m`. Explanation: `1/4 van 24 = 24 : 4 = 6 → 3/4 = 3 × 6
    = 18` (for `p = 1` only the first part).
  - back to the whole: `3/4 is 18. Hoeveel is het geheel?`, answer `N`. Explanation:
    `3/4 = 18 → 1/4 = 18 : 3 = 6 → 4/4 = 4 × 6 = 24`, or `1/4 = 6 → 4/4 = 4 × 6 = 24`.
- Fraction answers may be improper or whole (`6 × 2/3 = 4`); see §6 for what counts as the
  simplest form. The de-duplication key is the form and its numbers.

### 5.22 Decimal arithmetic (`decimalArithmetic`)

Part of the set Breuken & kommagetallen. The four operations with decimals, the way they are done
mentally.

There are three forms, each picked with equal probability:

| Form             | Example                                    | Answer        |
|------------------|--------------------------------------------|---------------|
| Add / subtract   | `4,7 + 0,35 = ?`, `5 − 0,25 = ?`           | 5,05, 4,75    |
| Multiply         | `0,3 × 0,4 = ?`, `0,25 × 8 = ?`            | 0,12, 2       |
| Divide           | `2,5 : 0,05 = ?`, `0,36 : 4 = ?`           | 50, 0,09      |

- **Add / subtract** (each 50%): two positive numbers below 100 with 0 to 2 decimals and at most
  3 significant digits, written without trailing zeros. Their numbers of decimals differ, so the
  commas must be aligned. The sum is below 100; the difference is positive.
  - Explanation: the commas aligned with trailing zeros: `4,70 + 0,35 = 5,05`,
    `5,00 − 0,25 = 4,75`.
- **Multiply:** `p × 10⁻ⁱ` and `q × 10⁻ʲ` with `p ∈ {2, …, 9, 11, 12, 15, 25}`, `q ∈ [2, 9]`,
  `i, j ∈ [0, 2]` and `i + j ∈ [1, 3]`, in random order.
  - Explanation: the product without commas, then the decimals:
    `3 × 4 = 12; 1 + 1 = 2 decimalen → 0,12`, `25 × 4 = 100; 2 + 0 = 2 decimalen → 1`,
    `7 × 6 = 42; 0 + 1 = 1 decimaal → 4,2`.
- **Divide:** the quotient `p × 10ˢ` and the divisor `q × 10ᵗ` with `p, q ∈ [2, 12] \ {10}`,
  `s ∈ [−2, 1]` and `t ∈ [−2, 0]`. The dividend is their product. The dividend or the divisor
  is not whole; dividend, divisor and quotient have at most 3 decimals, and the dividend is
  below 1000.
  - Explanation: a decimal divisor is made whole first, `2,5 : 0,05 = 250 : 5 = 50 (beide
    × 100)`; with a whole divisor, the table fact, then the comma: `36 : 4 = 9 → 0,36 : 4 = 0,09`.
- The de-duplication key is the calculation, with the factors of a product in ascending order.

### Breuken & kommagetallen v3 (§5.73–§5.79)

The RWT gaps of Breuken & kommagetallen (§12.3) and its Verdieping, which adds the contexts (the
set was almost only formal). Opfrisser gets three new topics (§5.73–§5.75); Verdieping has four
topics of its own (§5.76–§5.79, §4.1). The card description (§3.1) becomes "Omzetten,
vergelijken en rekenen met breuken en kommagetallen".

### 5.73 Decimal names (`decimalNames`)

Opfrisser (RWT B.2). Label: `Kommagetallen in woorden (tiende t/m miljardste)`. Two directions,
50/50:

| Direction        | Example                                 | Answer                 | Answer kind |
|------------------|-----------------------------------------|------------------------|-------------|
| Words → number   | `Schrijf als kommagetal: acht duizendste` | `0,008`              | number      |
| Number → words   | `Hoe spreek je 0,007 uit?`              | `zeven duizendste` (multiple choice) | choice |

- Places: `tiende` (10⁻¹), `honderdste`, `duizendste`, `tienduizendste`, `honderdduizendste`,
  `miljoenste` (10⁻⁶) and `miljardste` (10⁻⁹), each equally likely. The count `k ∈ [1, 19] \
  {10} ∪ {25, 75}` as a word (`één`, `twee`, …, `negentien`, `vijfentwintig`, `vijfenzeventig`;
  a fixed list in the module).
- **Number → words:** the options are `k` with four consecutive places of the list that contain
  the answer (at a random position), in the order of the list.
- Explanations: `duizendste = 0,001 → 8 × 0,001 = 0,008`; `0,007: de 7 staat op de plek van de
  duizendsten → zeven duizendste`.

### 5.74 Comparing fractions, decimals, percentages and ratios (`compareFractions`)

Opfrisser (RWT B.4). Label: `Vergelijken (breuken, kommagetallen, procenten)`. Three forms, each
picked with equal probability:

| Form    | Example                                          | Answer                       | Answer kind |
|---------|--------------------------------------------------|------------------------------|-------------|
| Extreme | `Welk getal is het grootst: 3/5, 0,58 of 5/8?`   | `5/8`                        | fraction, any equal value |
| Order   | `Welke rij klopt?`                               | `0,58 < 3/5 < 5/8 < 0,65`    | choice      |
| Mixed   | `Welke is het grootst?`                          | `5 op de 8` (options `3/5`, `0,58`, `62%`, `5 op de 8`) | choice |

- Fractions are proper with `q ∈ {2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 20, 25}` (the denominators
  of B.4); decimals have 1 to 3 decimals; all values in `(0, 1)` and distinct.
- **Extreme:** three numbers, at least one fraction and one decimal; `grootst` or `kleinst`
  (50/50); the largest and smallest differ by at most 0,2 and any two by at least 0,01. The
  answer is typed with the existing keys, and any equal value is correct (`5/8` or `0,625`); the
  expected answer is the number as written in the prompt.
- **Order:** four numbers, two fractions and two decimals, in either direction (50/50); options
  in random order: the right chain and the three chains that each swap one neighbouring pair.
- **Mixed:** four numbers, one of each notation: a fraction, a decimal, a percentage and a ratio;
  `grootst` or `kleinst` (50/50); the options are the four numbers in random order. Percentages
  are whole, in `[1, 99]` (`62%`). A ratio is part of a whole, written `p op de q` (`5 op de 8`),
  with `p/q` drawn like a fraction (same denominators, `gcd(p, q) = 1`). The spread and gap rules
  of Extreme hold. Percentages and ratios appear only here: the keypad has no `%` key, and
  `op de` is not a typed notation.
- Explanation: every number as a decimal (thirds and the like with `…`: `1/3 = 0,33…`), then the
  conclusion: `3/5 = 0,6 en 5/8 = 0,625 → 0,58 < 0,6 < 0,625 → 5/8`. Mixed converts the
  percentage and the ratio in the same way (`62% = 0,62`, `5 op de 8 = 0,625`).

### 5.75 Fraction concepts (`fractionConcepts`)

Opfrisser (RWT B.1), all multiple choice. Label: `Breukbegrippen (teller, stambreuk,
gelijkwaardig)`. Two forms, 50/50:

| Form       | Example                                         | Answer                    |
|------------|-------------------------------------------------|---------------------------|
| Concept    | `Wat is een stambreuk?`, `Hoe heet een breuk met teller 1?` | `een breuk met teller 1`, `stambreuk` |
| Equivalent | `Welke breuk is gelijkwaardig aan 3/4?`         | `9/12`                    |

- **Concept**, a fixed list of terms and definitions; the direction is 50/50 (`Wat is …?` with
  definitions as options, or `Hoe heet …?` with terms). The distractors are three random other
  entries of the list; options in random order.

  | Term                     | Definition                                         |
  |--------------------------|----------------------------------------------------|
  | `teller`                 | `het getal boven de breukstreep`                   |
  | `noemer`                 | `het getal onder de breukstreep`                   |
  | `stambreuk`              | `een breuk met teller 1`                           |
  | `onechte breuk`          | `een breuk met een teller groter dan de noemer`    |
  | `gemengd getal`          | `een heel getal en een breuk samen`                |
  | `samengestelde breuk`    | `een breuk met een breuk in de teller of de noemer` |
  | `gelijknamige breuken`   | `breuken met dezelfde noemer`                      |
  | `gelijkwaardige breuken` | `breuken met dezelfde waarde`                      |

  Prompts: `Wat is een stambreuk?`, `Wat zijn gelijknamige breuken?` (plural terms), and
  `Hoe heet een breuk met teller 1?`, `Hoe heten breuken met dezelfde noemer?`.
- **Equivalent:** a proper fraction `p/q` in lowest terms, `q ∈ [3, 10]`, `k ∈ [2, 5]`. Options in
  random order: `kp/kq` (the answer), `(p + k)/(q + k)` (adding the same), `q/p` (upside down)
  and `p/(q + 1)`; all four different.
- Explanations: the definition, `Een stambreuk is een breuk met teller 1, zoals 1/5.`;
  `3/4 = 9/12 (teller en noemer × 3)`.

### 5.76 Mixed notation (`mixedNotation`)

Verdieping (RWT B.9). Label: `Gemengd rekenen (breuk, kommagetal, procent)`. Prompt as a sum,
`4 3/5 : 0,2 = ?`. Answer kind fraction, any equal value; the expected answer is a decimal when
it has at most 3 decimals, otherwise a whole or mixed number. Four templates, each equally
likely:

| Template           | Example                 | Answer | Range                                                                                  |
|--------------------|-------------------------|--------|----------------------------------------------------------------------------------------|
| Divide by decimal  | `4 3/5 : 0,2 = ?`       | 23     | a mixed number `w p/q`, `w ∈ [1, 9]`, `q ∈ {2, 4, 5, 10}`, divided by `0,1`, `0,2`, `0,25` or `0,5`; whole answer |
| Decimal × fraction | `0,75 × 2/3 = ?`        | 0,5    | a decimal from `{0,2; 0,25; 0,4; 0,5; 0,6; 0,75; 0,8; 1,5; 2,5}` and a proper fraction with `q ∈ [2, 12]`, in random order; the answer has a denominator of at most 20 |
| Percent of         | `25% van 3/4 = ?`       | 3/16   | `p ∈ {10, 20, 25, 50, 75}` of a proper fraction (`q ∈ [2, 10]`) or of a decimal with 1 decimal in `[0,2; 9,9]` |
| Sum                | `1/4 + 0,15 = ?`        | 0,4    | a proper fraction with `q ∈ {2, 4, 5, 8, 10, 20, 25}` plus or minus a decimal with 1 or 2 decimals below 1; the answer positive |

- Explanations: one notation first, the easiest: `0,2 = 1/5 → 4 3/5 : 1/5 = 23/5 × 5 = 23`;
  `0,75 = 3/4 → 3/4 × 2/3 = 6/12 = 1/2 = 0,5`; `25% = 1/4 → 1/4 × 3/4 = 3/16`; `1/4 = 0,25 →
  0,25 + 0,15 = 0,4`.

### 5.77 Fraction problems (`fractionProblems`)

Verdieping (RWT B.6, in a context). Label: `Breuken in context (deel, rest, geheel)`. Four forms,
each equally likely:

| Form          | Example                                                                                                      | Answer | Suffix / kind |
|---------------|--------------------------------------------------------------------------------------------------------------|--------|---------------|
| Rest          | `Van de 32 leerlingen komt 3/8 op de fiets en 1/4 met de bus. De rest loopt. Hoeveel leerlingen lopen?`      | 12     | `leerlingen`  |
| Part of rest  | `Je hebt € 60. Je geeft 1/3 uit aan een boek en van wat over is 1/4 aan eten. Hoeveel houd je over?`          | 30     | `€` prefix    |
| Whole         | `2/5 van de klas is jongen. Dat zijn 12 kinderen. Hoeveel kinderen zitten er in de klas?`                    | 30     | `kinderen`    |
| Which part    | `In een klas van 30 kinderen zitten 12 jongens. Welk deel van de klas is meisje?`                            | 3/5    | fraction, simplest form, no decimal |

- Fractions are proper and in lowest terms with `q ∈ {2, 3, 4, 5, 6, 8, 10, 12}`; every
  intermediate result is whole.
- **Rest:** a whole `N ∈ [12, 60]` and two fractions with different denominators that together
  are below 1; the rest at least 1. Contexts: `leerlingen` (fiets, bus, lopen), `bezoekers`
  (volwassenen, kinderen, the rest senioren), `boeken` (romans, strips, the rest
  informatieboeken).
- **Part of rest:** `N ∈ [12, 240]`, two fractions; asked is what is left over or (50/50) the
  second part. Contexts: `geld` (€, a multiple of 5), `taart` (stukken, `N ≤ 48`), `snoepjes`.
- **Whole:** `p/q` and the part `p × m`, `m ∈ [2, 12]`, answer `q × m`. Contexts: `klas`
  (jongens, kinderen; the class has 20 to 36 children), `boek` (bladzijden gelezen), `tank`
  (liter, `vol`).
- **Which part:** a whole `N ∈ [12, 60]` (a `klas` at most 36) and one part; asked is the other
  part as a fraction in lowest terms (`q ≤ 12`). Contexts as Whole.
- Explanations: `3/8 van 32 = 12, 1/4 van 32 = 8 → 32 − 12 − 8 = 12`; `1/3 van 60 = 20 → 40 over
  → 1/4 van 40 = 10 → 40 − 10 = 30`; `2/5 = 12 → 1/5 = 6 → 5/5 = 30`; `30 − 12 = 18 meisjes →
  18/30 = 3/5`.

### 5.78 Decimal problems (`decimalProblems`)

Verdieping (RWT B.3, in a context). Label: `Kommagetallen in context (prijs per kilo, lengte)`.
Three forms, each equally likely:

| Form         | Example                                                                                   | Answer | Suffix     |
|--------------|-------------------------------------------------------------------------------------------|--------|------------|
| Price        | `Kaas kost € 14 per kilo. Wat kost 0,25 kg?`                                               | 3,50   | `€` prefix |
| Price back   | `1,5 kg appels kost € 3,60. Wat kost 1 kg?`                                                | 2,40   | `€` prefix |
| Length       | `Een plank van 2,4 m zaag je in stukken van 0,3 m. Hoeveel stukken krijg je?`              | 8      | `stukken`  |

- **Price:** a price per kilo that is a multiple of `€ 0,10` in `[1, 30]` and a weight from
  `{0,1; 0,2; 0,25; 0,3; 0,4; 0,5; 0,75; 1,2; 1,5; 2,5}` kg; the cost has at most 2 decimals
  (no rounding). Products: `kaas`, `gehakt`, `druiven`, `noten`.
- **Price back:** the same numbers, the weight not 1; the total and weight given, the price per
  kilo asked. Products: `appels`, `peren`, `tomaten`.
- **Length**, two variants, 50/50: the count (`stukken` of `{0,2; 0,25; 0,3; 0,4; 0,5; 0,6;
  0,75}` m from a `plank` or `lint` of at most 6 m, the count whole in `[3, 20]`), or the rest
  (`Van een lint van 5 m knip je 6 stukken van 0,45 m. Hoeveel m blijft er over?`, a lint of
  `{2, 3, 5, 10}` m, `[2, 8]` stukken of a multiple of 0,05 m in `[0,15; 1,5]`, the rest
  positive, suffix `m`).
- Explanations: `0,25 kg = 1/4 kilo → 14 : 4 = 3,50`; `1,5 kg = € 3,60 → 0,5 kg = 1,20 → 1 kg =
  2,40`; `2,4 : 0,3 = 24 : 3 = 8`; `6 × 0,45 = 2,7 → 5 − 2,7 = 2,3`.

### 5.79 Number line (`betweenNumbers`)

Verdieping (RWT B.4, on a number line). Label: `Getallenlijn (midden, sprongen, streepjes)`.
Three forms, each equally likely; answer kind fraction, any equal value (expected as §5.76):

| Form    | Example                                                                                            | Answer   |
|---------|----------------------------------------------------------------------------------------------------|----------|
| Middle  | `Welk getal ligt precies midden tussen 1/4 en 1/3?`                                                | 7/24     |
| Jumps   | `Je springt op de getallenlijn van 1,2 naar 3 in sprongen van 0,15. Hoeveel sprongen zijn dat?`     | 12       |
| Marks   | `De getallenlijn van 2 tot 3 is in 8 gelijke stukjes verdeeld. Welk getal staat bij het 5e streepje na 2?` | `2,625` |

- **Middle**, three variants, each equally likely: two proper fractions with `q ∈ [2, 12]` and a
  middle with denominator at most 48 (`1/4` and `1/3`); two decimals with 1 or 2 decimals in
  `[0, 20]`, at least 0,05 and at most 1 apart (`2,7` and `3,05` → `2,875`); a fraction and a decimal
  (`0,6` and `3/4` → `27/40` or `0,675`).
- **Jumps:** the count whole in `[4, 30]`; a decimal jump from `{0,05; 0,1; 0,15; 0,2; 0,25; 0,3;
  0,4; 0,5; 0,75}` with a start of 1 decimal in `[0, 10]`, or (30%) a fraction jump `1/q`,
  `q ∈ {2, 3, 4, 5, 8}`, from a whole or half start. Number answer.
- **Marks:** a whole `w ∈ [0, 9]` to `w + 1`, divided into `n ∈ {4, 5, 8, 10, 20}` pieces;
  mark `k ∈ [1, n − 1]`, `k/n` not `1/2`. The expected answer as §5.76 (`2,625`; `2 5/8` is
  also correct).
- Explanations: `1/4 = 6/24 en 1/3 = 8/24 → midden 7/24`, `(2,7 + 3,05) : 2 = 5,75 : 2 = 2,875`;
  `3 − 1,2 = 1,8 → 1,8 : 0,15 = 180 : 15 = 12`; `1 stukje = 1/8 → 2 + 5/8 = 2 5/8`.
