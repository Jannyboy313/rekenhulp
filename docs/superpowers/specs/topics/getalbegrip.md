# Getalbegrip: topics

Part of the design spec (`../2026-10-05-rekenhulp-design.md`, §5). The § numbers are those of the
spec; its §5 holds the index and the rules shared by several sets.

### 5.15 Mental operations with larger numbers (`mentalOperations`)

Part of the set Getalbegrip. The four operations on larger whole numbers, the way they are done
mentally: adding in steps (*rijgen*), computing with zeros, and dividing with a remainder in a
context. Tricks such as compensating or splitting `× 25` belong to `smartCalculation` (§5.9) and
are left out here.

There are four forms, each picked with equal probability:

| Form              | Example                                                                   | Answer |
|-------------------|---------------------------------------------------------------------------|--------|
| Add / subtract    | `6347 + 2800 = ?`, `15 213 − 470 = ?`                                     | 9147, 14 743 |
| Multiply by zeros | `28 × 500 = ?`, `60 × 700 = ?`                                            | 14 000, 42 000 |
| Divide by zeros   | `7200 : 80 = ?`, `4800 : 6 = ?`                                           | 90, 800 |
| Remainder         | `230 leerlingen gaan met busjes van 8 plaatsen. Hoeveel busjes zijn er nodig?` | 29 |

- **Add / subtract** (each 50%): `a ∈ [1000, 99 999]`, and `b` has exactly 2 significant digits
  followed by 1 or 2 zeros (`b ∈ [110, 9900]`, e.g. `2800`, `470`). The sum needs at least one
  carry, the difference at least one borrow, so no column can be done on its own. The
  difference is positive.
  - Explanation: add the significant digits of `b` one at a time, largest first:
    `6347 + 2000 = 8347 → 8347 + 800 = 9147`, `15 213 − 400 = 14 813 → 14 813 − 70 = 14 743`.
- **Multiply by zeros:** `a = p × 10ⁱ` and `b = q × 10ʲ` with `p ∈ [2, 99]` not a multiple of 10,
  `q ∈ [2, 9]`, `i + j ∈ [1, 4]` and the product at most 1 000 000. The two factors appear in
  random order. Products that look like §5.9 are left out: `25`, `50` or `125` times a factor
  that is not a multiple of 10 (`27 × 50` too, although §5.9 only makes even ones).
  - Explanation: the table fact, then the zeros: `28 × 5 = 140 → 28 × 500 = 140 × 100 = 14 000`.
- **Divide by zeros:** the quotient is `p × 10ⁱ` and the divisor `q × 10ʲ`, with
  `p, q ∈ [2, 12] \ {10}`, `i + j ∈ [1, 4]` and the dividend at most 1 000 000. Because `i + j ≥ 1`,
  §5.9 never generates the same division (its quotients are no multiples of 10).
  - Explanation: when the divisor ends in zeros, strike equal zeros first:
    `7200 : 80 = 720 : 8 = 90`, `36 000 : 900 = 360 : 9 = 40`. Otherwise the table fact, then the
    zeros: `48 : 6 = 8 → 4800 : 6 = 800`.
- **Remainder:** a division `N = q × d + r` with `q ∈ [3, 40]`, `r ∈ [1, d − 1]` and `N ≤ 1000`,
  in a context. The question is one of three, each equally likely, and the context is picked
  among those that ask it:

  | Context  | Prompt                                                                    | Asks | `d` | Suffix |
  |----------|---------------------------------------------------------------------------|------|-----|--------|
  | busjes   | `230 leerlingen gaan met busjes van 8 plaatsen. Hoeveel busjes zijn er nodig?` | up | `[6, 50]` | `busjes` |
  | tafels   | `Aan een tafel passen 6 gasten. Hoeveel tafels zijn er nodig voor 75 gasten?` | up | `[4, 12]` | `tafels` |
  | dozen    | `In een doos passen 12 eieren. Hoeveel volle dozen maak je van 200 eieren?` | down | `[6, 30]` | `dozen` |
  | dozen    | `In een doos passen 12 eieren. Je vult zoveel mogelijk dozen met 200 eieren. Hoeveel eieren houd je over?` | rest | `[6, 30]` | `eieren` |
  | kaartjes | `Een kaartje kost € 7. Hoeveel kaartjes koop je voor € 100?`               | down | `[3, 25]` | `kaartjes` |
  | kaartjes | `Een kaartje kost € 7. Je koopt zoveel mogelijk kaartjes voor € 100. Hoeveel geld houd je over?` | rest | `[3, 25]` | prefix `€` |

  - The answer is `q + 1` (up), `q` (down) or `r` (rest).
  - Explanation: the division with its remainder, then the conclusion:
    `230 : 8 = 28 rest 6 → 29 busjes`, `200 : 12 = 16 rest 8 → 16 dozen`,
    `200 = 16 × 12 + 8 → 8 eieren over`, `100 = 14 × 7 + 2 → € 2 over`.
- Answers are whole numbers. The de-duplication key is the calculation itself, with the factors
  of a product in ascending order, as in §5.9; for the remainder form it is context, question,
  `N` and `d`.

### 5.16 Negative numbers (`negativeNumbers`)

Part of the set Getalbegrip. The minus sign is typed with the `−` key of the number keypad (§6),
which toggles the sign of the whole number.

There are three forms, each picked with equal probability:

| Form             | Example                                                               | Answer |
|------------------|-----------------------------------------------------------------------|--------|
| Add / subtract   | `−4 − (−6) = ?`, `3 − 8 = ?`, `−7 + 12 = ?`                           | 2, −5, 5 |
| Multiply / divide | `−6 × 4 = ?`, `−24 : (−3) = ?`                                       | −24, 8 |
| Temperature      | `Het is −5 °C. Het wordt 8 graden warmer. Hoeveel graden is het dan?` | 3 |

- Negative literals are written as in §5.8: in parentheses, except as the first term.
- **Add / subtract** (each 50%): `a, b ∈ [−20, 20] \ {0}`. At least one of `a`, `b` or the answer
  is negative, so `5 + 7` never occurs. The answer is not 0.
- **Multiply / divide** (each 50%): `|x|, |y| ∈ [2, 12]` with at least one of them negative. A
  division is written as `(x × y) : y`, so it is always exact.
- **Temperature** (each 50%):
  - *change:* a start temperature in `[−15, 15]`, `n ∈ [2, 20]` degrees `warmer` or `kouder`,
    the result in `[−20, 25]`. The start or the result is below zero. Suffix `°C`.
  - *difference:* `'s Nachts is het −7 °C, overdag 4 °C. Hoeveel graden is het verschil?` Night
    in `[−20, 5]`, day in `[−10, 30]`, the night colder than the day and at least one of them
    below zero. Suffix `graden`.
- Explanations:
  - subtracting a negative number: `−4 − (−6) = −4 + 6 = 2`; adding one:
    `5 + (−8) = 5 − 8 = −3`
  - crossing zero, split at zero: `3 − 8 = 3 − 3 − 5 = −5`, `−7 + 12 = −7 + 7 + 5 = 5`
  - otherwise the sum itself: `−4 − 6 = −10`
  - multiply / divide: the sum without signs, then the sign rule:
    `6 × 4 = 24; één negatief getal → −24`, `24 : 3 = 8; twee negatieve getallen → 8`
  - temperature: the sum with the explanation above, e.g. `−5 + 8 = −5 + 5 + 3 = 3`, and for the
    difference `4 − (−7) = 4 + 7 = 11`

### 5.17 Rounding (`rounding`)

Part of the set Getalbegrip. Rounding follows the Dutch school rule: the first digit that is
dropped decides; 5 or more rounds up, less than 5 rounds down. Only positive numbers occur.

Prompt: `Rond 4386 af op honderdtallen`, `Rond 3,746 af op 1 decimaal`. Seven places, each
equally likely:

| Place          | Prompt ends in          | Source number                                | Example            |
|----------------|-------------------------|----------------------------------------------|--------------------|
| tens           | `op tientallen`         | `[101, 9999]`                                | `4386 → 4390`      |
| hundreds       | `op honderdtallen`      | `[1001, 99 999]`                             | `4386 → 4400`      |
| thousands      | `op duizendtallen`      | `[10 001, 999 999]`                          | `48 512 → 49 000`  |
| millions       | `op miljoenen`          | `[1 000 001, 99 999 999]`                    | `2 456 789 → 2 000 000` |
| whole number   | `op een heel getal`     | `(0, 1000)` with 1 or 2 decimals             | `12,5 → 13`        |
| 1 decimal      | `op 1 decimaal`         | `(0, 100)` with 2 or 3 decimals              | `3,746 → 3,7`      |
| 2 decimals     | `op 2 decimalen`        | `(0, 100)` with 3 decimals                   | `0,385 → 0,39`     |

- The source number is never already rounded: at least one dropped digit is not 0. The answer is
  never 0.
- The first dropped digit is 5 in at least 20% of the exercises (the rule's edge case). In at
  least another 15%,
  rounding up carries over a 9 (`3970 → 4000` on hundreds, `2,96 → 3,0` on 1 decimal).
- The answer is the full number (`2 000 000`, not `2 miljoen`). Any equal value is correct, so
  `3` counts for `3,0`; the expected answer is shown with the asked number of decimals (`3,0`).
- Explanation: the two neighbours, the decisive digit and the result:
  `4386 ligt tussen 4300 en 4400; het eerste cijfer dat wegvalt is 8 → 4400`,
  `3,746 ligt tussen 3,7 en 3,8; het eerste cijfer dat wegvalt is 4 → 3,7`.

### 5.18 Powers and roots (`powersRoots`)

Part of the set Getalbegrip. Extends `squares` (§5.7), which stays in Getallen & delers. The
scaled roots below can overlap with it (`√400 = 20`); that is fine, the topics are in different
sets.

There are four forms, each picked with equal probability:

| Form              | Example                                | Answer |
|-------------------|----------------------------------------|--------|
| Whole-number power | `2⁵ = ?`, `(−3)³ = ?`, `7⁰ = ?`       | 32, −27, 1 |
| Decimal power     | `0,3² = ?`, `0,2³ = ?`, `1,5² = ?`     | 0,09, 0,008, 2,25 |
| Negative exponent | `10⁻³ = ?`, `0,001 = 10ⁿ. n = ?`       | 0,001, −3 |
| Root              | `∛64 = ?`, `√0,49 = ?`, `√6400 = ?`    | 4, 0,7, 80 |

- **Whole-number power:**
  - 70%: a positive base with exponent ≥ 3: base 2 with exponent `[3, 10]`, 3 with `[3, 5]`, 4
    and 5 with `[3, 4]`, 6 to 9 with 3, and 10 with `[3, 6]`. The (base, exponent) pair is drawn
    uniformly from these 23 pairs.
  - 20%: a negative base `(−b)ⁿ` with `b ∈ [2, 5]`, `n ∈ [2, 4]` and `bⁿ ≤ 125`: 10 pairs, from
    `(−2)²` to `(−5)³`. The base is always written in parentheses (§5.8).
  - 10%: exponent 0 or 1 with a base in `[2, 20]`.
- **Decimal power:** a base `0,1` to `0,9` with exponent 2 or 3, a base `0,01` to `0,09` with
  exponent 2, or a base `1,1`, `1,2`, `1,5`, `2,5` or `3,5` with exponent 2. Each of these three
  groups is equally likely.
- **Negative exponent:** base 10 only, `n ∈ [1, 6]`. Two questions, each 50%: `10⁻ⁿ = ?` with a
  decimal answer, or `0,001 = 10ⁿ. n = ?` with a negative whole-number answer. Negative
  exponents with other bases (`2⁻³ = 1/8`) are left out; *Breuken & kommagetallen* does not add
  them either.
- **Root** (each 50%):
  - cube root `∛n³` with `n ∈ [2, 10]`
  - square root of a scaled square: `√m²` with `m = k : 10` or `m = k × 10` and
    `k ∈ [2, 15] \ {10}`, so `√0,49`, `√1,44`, `√6400` and `√14 400`
- Explanations:
  - `2⁵ = 2 × 2 × 2 × 2 × 2 = 32`, `(−3)³ = (−3) × (−3) × (−3) = −27`
  - `7⁰ = 1: elk getal (behalve 0) tot de macht 0 is 1`, `7¹ = 7`
  - `0,3² = 0,3 × 0,3 = 0,09`
  - `10⁻³ = 1 : 10³ = 1 : 1000 = 0,001`, and for the exponent question
    `0,001 = 1 : 1000 = 1 : 10³ = 10⁻³`
  - `∛64 = 4, want 4 × 4 × 4 = 64`, `√0,49 = 0,7, want 0,7 × 0,7 = 0,49`
- The exponent question skips the factor-of-ten tip, like §5.14.

### 5.19 Scientific notation (`scientificNotation`)

Part of the set Getalbegrip. A number in scientific notation is `c × 10ⁿ` with `1 ≤ c < 10`.
Large numbers with names (`miljard`) stay in `numberUnits` (§5.14).

There are three forms, each picked with equal probability:

| Form             | Prompt                                             | Answer        | Answer kind |
|------------------|----------------------------------------------------|---------------|-------------|
| To notation      | `Schrijf in wetenschappelijke notatie: 4 500 000`  | `4,5 × 10⁶`   | `scientific` |
| To number        | `4,5 × 10⁻³ = ?`                                   | `0,0045`      | `number`    |
| Normalise        | `Schrijf in wetenschappelijke notatie: 450 × 10⁴`  | `4,5 × 10⁶`   | `scientific` |

- `c` has 1 to 3 significant digits. `c = 1` occurs; a prompt then writes just `10⁶` (as in
  §5.14), and the expected answer is `1 × 10⁶`. The exponent `n ∈ [−6, −1] ∪ [2, 9]`, so a written-out number has at most 10 digits
  (`3 210 000 000`, `0,00000125`).
- **Normalise:** the prompt shows `m × 10ᵏ` with `m = c × 10ˢ`, `s ∈ {−2, −1, 1, 2, 3}` and
  `k ≠ 0`, e.g. `450 × 10⁴` or `0,3 × 10⁻²`. The result exponent `n = k + s` is in the range
  above.
- **Judging a `scientific` answer:** correct when the value is equal **and** the form is
  `c × 10ⁿ` with `1 ≤ c < 10`. `10⁶` alone counts as `1 × 10⁶`. Trailing zeros in `c` are
  allowed (`4,50 × 10⁶`). An equal value in another form (`45 × 10⁵`, `4500000`) is wrong and
  gets a tip (§3.4.1).
- The expected answer is shown as `4,5 × 10⁶`.
- Explanations:
  - to notation: `4 500 000 = 4,5 × 1 000 000 = 4,5 × 10⁶`,
    `0,000045 = 4,5 × 0,00001 = 4,5 × 10⁻⁵`
  - to number: `4,5 × 10⁻³ = 4,5 × 0,001 = 0,0045`
  - normalise: `450 × 10⁴ = 4,5 × 10² × 10⁴ = 4,5 × 10⁶`,
    `0,3 × 10⁻² = 3 × 10⁻¹ × 10⁻² = 3 × 10⁻³`

### Getalbegrip v3 (§5.67–§5.72)

The RWT gaps of Getalbegrip (§12.3) and its Verdieping. Opfrisser gets two new topics
(§5.67–§5.68); Verdieping has four topics of its own (§5.69–§5.72, §4.1). The card description
stays.

### 5.67 Number order (`numberOrder`)

Opfrisser (RWT A.3), all multiple choice. Label: `Ordenen (negatief, kommagetal, getallenlijn)`.
Two forms, 50/50:

| Form    | Example                                     | Answer                          |
|---------|---------------------------------------------|---------------------------------|
| Order   | `Welke rij klopt?`                          | `−3,5 < −1,2 < 0,35 < 0,4`      |
| Between | `Welk getal ligt tussen −2,5 en −2,4?`      | `−2,45`                         |

- **Order:** four distinct numbers in `[−20, 20]` with 0 to 2 decimals and at most 3
  significant digits; two or three of them negative; at least two have a different number of
  decimals. The direction is 50/50. Options in random order: the right chain, the chain ordered
  by the numbers without their sign (the sign trap), and two chains that each swap one
  neighbouring pair of the right chain; all four different (redraw otherwise).
- **Between:** bounds `a` and `a + 0,1` with 1 decimal, `a ∈ [−9,9; −0,2]` (always negative; `−0,1` is left out because its sign trap would equal
  `a + 0,15`).
  The answer is `a + 0,05`. Distractors: `−(a + 0,05)` (the sign trap), `a − 0,05` and
  `a + 0,15`. Options in ascending order.
- Explanations: order `op de getallenlijn van links naar rechts: −3,5, −1,2, 0,35, 0,4`, and with
  the sign trap in mind `−3,5 is kleiner dan −1,2: hoe verder onder nul, hoe kleiner`; between
  `−2,5 = −2,50 en −2,4 = −2,40 → −2,45 ligt ertussen`.

### 5.68 Words of arithmetic (`arithmeticWords`)

Opfrisser (RWT A.2, and A.1 for cijfer versus getal), all multiple choice. Label: `Rekentaal
(som, verschil, bijna, ruim, cijfer)`. Three forms, each equally likely:

| Form        | Example                                                        | Answer |
|-------------|----------------------------------------------------------------|--------|
| Operation   | `Wat is het verschil van 48 en 12?`                            | `36`   |
| Bijna, ruim | `Welk bedrag is ruim € 50?`                                    | `€ 53` |
| Digit       | `Welk cijfer staat op de plaats van de duizendtallen in 207 458?` | `7`  |

- **Operation:** the word is `som`, `verschil`, `product` or `quotiënt` (each 25%); `a ∈ [12, 99]`,
  `b ∈ [2, 12]`, `a` a multiple of `b`. Options in ascending order: `a + b`, `a − b`, `a × b`,
  `a : b` (all four different; redraw otherwise).
- **Bijna, ruim** (50/50): a round number `R` from `{20, 50, 100, 200, 500, 1000}` and a context:
  `bedrag` (`€` before the number), `kinderen`, `km`, `minuten` (the unit after it:
  `Welke afstand is bijna 100 km?`). With `d` a whole number in `[2%, 8%]` of `R` (at least
  1), the options in ascending order: `R − d`, `R`, `R + d` and the far one `R + 30%` (ruim) or
  `R − 30%` (bijna). The answer is `R + d` (ruim) or `R − d` (bijna).
- Explanations: `verschil = aftrekken: 48 − 12 = 36`, `som = optellen`, `product =
  vermenigvuldigen`, `quotiënt = delen`; `ruim € 50 = iets meer dan € 50`, `bijna 100 km = iets
  minder dan 100 km`.
- **Digit** (A.1): a number in `[100 000, 999 999]` with six different digits, and one of the
  six places (`eenheden`, `tientallen`, `honderdtallen`, `duizendtallen`, `tienduizendtallen`,
  `honderdduizendtallen`), each equally likely. The options are the digit on that place and
  three other digits of the number, in ascending order. Explanation: the places from the right
  up to the asked one, `207 458: 8 eenheden, 5 tientallen, 4 honderdtallen, 7 duizendtallen → 7`.
  The de-duplication key is the place and the number.

### 5.69 Negative numbers in context (`negativeContexts`)

Verdieping (RWT A.4b). Label: `Negatief in context (rood staan, tekort, NAP)`. Three forms, each
equally likely:

| Form        | Example                                                                                    | Answer | Suffix     |
|-------------|--------------------------------------------------------------------------------------------|--------|------------|
| Money       | `Je hebt € 318 op je rekening en betaalt € 774. Hoeveel sta je in het rood?`               | 456    | `€` prefix |
| Height      | `Een polder ligt op −4 m NAP, een duin op 23 m NAP. Hoeveel meter hoger ligt het duin?`    | 27     | `m`        |
| Temperature | `'s Ochtends is het −3 °C. Het wordt 9 graden warmer en 's avonds weer 11 graden kouder. Hoeveel graden is het dan?` | −5 | `°C` |

- **Money**, three variants, each equally likely; whole euros:
  - `in het rood`: balance `[50, 900]`, payment `[100, 999]` above it, with at least one borrow;
    the answer is the shortage.
  - `saldo`: `Je staat € 145 in het rood. Je krijgt € 400 salaris. Wat is je saldo nu?`; minus
    `[20, 900]`, income `[100, 2000]`, a multiple of 10 when above 1000; the answer can be
    negative (typed with `−`) and is not 0.
  - `te kort`: `Je wilt een fiets van € 849 kopen en hebt € 387 gespaard. Hoeveel kom je te
    kort?`; price `[100, 999]`, savings `[20, price − 10]`. Contexts: fiets, telefoon, laptop.
- **Height**, two variants, 50/50:
  - `verschil`: a low point in `[−7; −1]` m NAP with at most 1 decimal (`polder`, `meer`) and a
    high point in `[5, 50]` m NAP (`duin`, `dijk`, `heuvel`); the difference.
  - `lift`: `Een lift staat op verdieping −2 en gaat 7 verdiepingen omhoog. Op welke verdieping
    stopt hij?` A start in `[−3, 10]` and a move in `[2, 12]` up or down, the end in `[−3, 12]`;
    the start or the end is below 0. No suffix.
- **Temperature:** start `[−10, 10]`, two changes `[2, 15]` (`warmer` or `kouder`, not both the
  same), each value in `[−15, 20]`; at least one change crosses 0.
- Explanations: `774 − 318 = 456 → € 456 in het rood`, `−145 + 400 = −145 + 145 + 255 = 255`,
  `849 − 387 = 462`; `23 − (−4) = 23 + 4 = 27`, `−2 + 7 = −2 + 2 + 5 = 5`;
  `−3 + 9 = −3 + 3 + 6 = 6 → 6 − 11 = 6 − 6 − 5 = −5`. A step that crosses zero is split at
  zero as in §5.16; a step that does not is written as the sum itself.

### 5.70 Rounding reasoning (`roundingReasoning`)

Verdieping (RWT A.3, B.2). Label: `Afronden redeneren (grenzen, contant betalen)`. Two forms,
50/50:

| Form   | Example                                                                                       | Answer | Suffix     |
|--------|-----------------------------------------------------------------------------------------------|--------|------------|
| Bounds | `Een getal is afgerond op honderdtallen 4500. Wat is het kleinste getal dat het kan zijn?`    | 4450   | —          |
| Cash   | `Je boodschappen kosten € 7,93. Je betaalt contant. Hoeveel betaal je?`                       | 7,95   | `€` prefix |

- **Bounds:** `kleinste` or `grootste` (50/50).
  - Whole numbers (70%): the place `tientallen`, `honderdtallen` or `duizendtallen`; the rounded
    value has 2 or 3 significant digits and lies in `[100, 99 000]`. The answer is the rounded
    value − half a unit (kleinste) or + half a unit − 1 (grootste): `4450`, `4549`.
  - Decimals (30%): `Een getal met 2 decimalen is afgerond op 1 decimaal 3,7. Wat is het
    kleinste getal dat het kan zijn?`, the rounded value in `[0,1; 99,9]` with 1 decimal (not
    whole); answer `3,65` or `3,74`.
- **Cash** (Dutch cash rounding to 5 cents): cents ending in 1 or 2 go down to 0, 3 to 7 go to
  5, 8 or 9 go up to 10. The amount is in `[1, 50]` and does not end in 0 or 5. Two variants,
  50/50: what you pay, or the change from a note of `€ 5`, `€ 10`, `€ 20` or `€ 50` above the
  amount (`Je betaalt contant met € 10. Hoeveel krijg je terug?`, `€ 7,93 → € 7,95 → 10 − 7,95 =
  2,05`).
- Explanations: `4449 wordt 4400, 4450 wordt 4500 → 4450`, `4549 wordt 4500, 4550 wordt 4600 →
  4549`; `3,64 wordt 3,6, 3,65 wordt 3,7 → 3,65`; `€ 7,93: 3 cent wordt 5 cent → € 7,95`.

### 5.71 Estimating calculations (`estimateCalc`)

Verdieping (RWT A.3), all multiple choice. Label: `Schatten (uitkomst ongeveer)`. Prompt:
`Ongeveer hoeveel is 6189 : 31?`.

- `×` or `:` (50/50). Generated backwards: first the rounded operands, each 1 significant digit
  (`6000 : 30`, `400 × 0,5`); a rounded dividend may have 2 significant digits and is a
  multiple of the rounded divisor. Then each operand is moved by 3% to 10% to a number that is
  not round: a whole number with at least 2 digits whose last digit is not 0 (3 or 4 digits
  from a rounded operand of 100 up, 2 digits below), or (in 30% of the exercises, one operand) a
  decimal with 2 or 3 significant digits in `[0,1; 99]`. Rounded whole operands are in
  `[10, 900]`, the dividend at most 9900 and the estimate at most 10 000. The estimate `c` (the
  calculation with the rounded operands) and the exact value differ by at most a factor 1,4.
- Options as §5.52: `c × {0,1; 1; 10; 100}` or `c × {0,01; 0,1; 1; 10}` (50/50), in ascending
  order; a set with an option of more than 2 decimals is not used.
- Explanation: `6189 ≈ 6000 en 31 ≈ 30 → 6000 : 30 = 200`.

### 5.72 Calculating with powers (`powerCalc`)

Verdieping (LKT: powers, roots and scientific notation). Label: `Rekenen met machten
(rekenregels, wortels, wetenschappelijke notatie)`. Three forms, each equally likely:

| Form       | Example                                        | Answer        | Answer kind  |
|------------|------------------------------------------------|---------------|--------------|
| Rules      | `2³ × 2⁴ = 2ⁿ. n = ?`, `(3²)³ = 3ⁿ. n = ?`     | 7, 6          | number       |
| Combined   | `√(36 × 25) = ?`, `2⁵ − 3³ = ?`                | 30, 5         | number       |
| Scientific | `(3 × 10⁴) × (5 × 10³) = ?`                    | `1,5 × 10⁸`   | scientific   |

- **Rules:** `aᵐ × aⁿ`, `aᵐ : aⁿ` (`m > n`) or `(aᵐ)ⁿ`, each equally likely; `a ∈ {2, 3, 5, 10}`,
  `m, n ∈ [2, 6]`, the result exponent at most 12. The question is the exponent, written as in
  §5.18 (`2ⁿ`, `UNKNOWN_EXPONENT`).
- **Combined**, two variants, 50/50:
  - `√(p × q)` with `p ≠ q` squares of `[2, 10]` and the answer at most 90.
  - `aᵐ ± bⁿ` with `a ≠ b`, each power from the positive pairs of §5.18 (bases 2 to 9) with value
    at most 1000; in 20% one base is negative, `(−2)³`, `(−3)²` style, from the negative pairs of
    §5.18. The answer is not 0; it may be negative.
- **Scientific**, three variants, each equally likely:
  - product `(c₁ × 10ᵐ) × (c₂ × 10ⁿ)`, `c₁, c₂ ∈ [1, 9]` whole, `m, n ∈ [2, 9]`; the answer
    normalised (`15 × 10⁷ = 1,5 × 10⁸`), its exponent at most 15.
  - quotient `(c₁ × 10ᵐ) : (c₂ × 10ⁿ)`, `c₁` a multiple of `c₂` (`c₁ ∈ [2, 9]`), `m > n`.
  - `Hoeveel keer zo groot is 6 × 10⁸ als 2 × 10⁵?`, the same numbers as the quotient, a number
    answer of at most 10⁷ (`3000`).
  - Answers with `scientificStep` (§5.19, normalised form required); the times question with a
    number step.
- Explanations: `2³ × 2⁴ = 2³⁺⁴ = 2⁷`, `2⁶ : 2² = 2⁶⁻² = 2⁴`, `(3²)³ = 3²ˣ³ = 3⁶`;
  `√(36 × 25) = √36 × √25 = 6 × 5 = 30`, `2⁵ − 3³ = 32 − 27 = 5`;
  `3 × 5 = 15 en 10⁴ × 10³ = 10⁷ → 15 × 10⁷ = 1,5 × 10⁸`, `6 : 2 = 3 en 10⁸ : 10⁵ = 10³ → 3000`.
