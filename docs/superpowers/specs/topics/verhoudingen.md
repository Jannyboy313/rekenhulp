# Verhoudingen: topics

Part of the design spec (`../2026-10-05-rekenhulp-design.md`, §5). The § numbers are those of the
spec; its §5 holds the index and the rules shared by several sets.

### 5.12 Percentages (`percentages`)

There are four forms, each picked with equal probability:

| Form                | Example                                   | Answer |
|---------------------|-------------------------------------------|--------|
| Part of a whole     | `15% van 80 = ?`                          | 12     |
| What percentage     | `30 is ?% van 120`                        | 25     |
| Discount / increase | `€ 60 na 25% korting = ?`, `€ 40 na 15% verhoging = ?` | 45, 46 |
| Back to 100%        | `20% is 14. Hoeveel is 100%?`             | 70     |

- `p ∈ {1, 2, 5, 10, 12½, 15, 20, 25, 30, 40, 50, 60, 75, 80, 90, 120, 150}`
  - `12½` is written as the mixed number `12 1/2` in prompts and explanations: `12` followed by
    a stacked `1/2` (§8).
  - Discount uses only `p < 100`; increase uses only `p ≤ 50`.
- The whole (the 100% amount, or the price) is an integer in `[10, 1000]` with at most 2
  significant digits: `85`, `470` and `1000`, but not `487`.
- Answers have at most 2 decimals. Per form:
  - **Part of a whole** and **discount / increase:** 80% of the answers are integers.
  - **What percentage:** the part and the whole are integers. The answer is `p`, so it is an
    integer except for `12½`. This form uses the `fraction` answer kind (§6): `12,5`, `25/2`
    and `12 1/2` are all correct, and so is any other equal value. The expected answer is the
    mixed number `12 1/2` (§8). All exercises of this form
    use it, so the breuk key does not give away the answer.
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
  `gcd(a, b)` is an integer, and the answer is at most 2000. The amount per person or notebook
  (`amount / a`) is realistic: pasta 50–150 g, milk 50–250 ml, notebooks € 1–5 (bounds
  inclusive), so `Voor 12 personen: 10 g pasta` and `2 schriften kosten € 90` do not occur. A
  drawn context with counts `a` and `b` that leaves no amount is redrawn.
- **Dividing in ratio:** a simplified ratio `a : b` with `a ≠ b`, terms in `[1, 12]`. The total
  is `(a + b) × k` with `k ≥ 2` and is at most 500. The exercise asks for the largest or the
  smallest part, each equally likely.
- Explanation on error:
  - missing term: `3 : 5 = 12 : 20 (× 4)`, `12 : 20 = 3 : 5 (: 4)` or `4 : 6 = 2 : 3 = 10 : 15`
  - scaling: a ratio table via `gcd(a, b)`, e.g. `4 → 300, 2 → 150, 6 → 450`, or
    `4 → 300, 8 → 600`
  - dividing: `2 + 3 = 5 delen → 1 deel = 60 : 5 = 12 → 3 delen = 36`

### 5.23 Percentage change (`percentChange`)

Part of the set Verhoudingen (v2). §5.12 already has a price after a discount or increase and
plain back to 100%; this topic adds the forms around a change.

There are three forms, each picked with equal probability:

| Form              | Example                                                          | Answer |
|-------------------|------------------------------------------------------------------|--------|
| Percentage change | `Een prijs gaat van € 80 naar € 92. Hoeveel procent stijging?`   | 15     |
| VAT               | `€ 80 zonder btw. Met 21% btw = ?`, `€ 96,80 met 21% btw. Zonder btw = ?` | 96,80, 80 |
| Original value    | `Na 25% korting kost een jas € 60. Wat was de oude prijs?`       | 80     |

- **Percentage change:** increase or decrease, each 50%. The percentage `p` comes from the list
  of §5.12: an increase uses any `p`, a decrease only `p < 100`. The old value is a nice whole
  (§5.12: an integer in `[10, 1000]` with at most 2 significant digits; for inhabitants at least
  100, so no village of 10) and the new value is an integer too. Three contexts, each equally
  likely:
  - price: `Een prijs gaat van € 80 naar € 92. Hoeveel procent stijging?`
  - inhabitants: `Een dorp gaat van 800 naar 920 inwoners. Hoeveel procent stijging?`
  - visitors: `Een museum gaat van 400 naar 340 bezoekers per dag. Hoeveel procent daling?`
  - The answer is `p` as a fraction step with any equal value correct and suffix `%`, as in
    §5.12, so `12½` can be typed and the breuk key gives nothing away.
  - Explanation: the change, then the part-of-a-whole strategy of §5.12 on the old value:
    `92 − 80 = 12 → 10% = 8, 5% = 4 → 15% = 12`, `100 − 80 = 20 → 25% = 80 : 4 = 20`.
- **VAT:** the rate is 21% or 9% and the direction is adding or removing, each 50%. The amounts
  are money (`€` prefix, the expected answer with 2 decimals when not whole, §8).
  - Adding: the price without VAT is a nice whole of at most 1000. Example:
    `€ 85 zonder btw. Met 21% btw = ?` → `102,85`.
  - Removing: the price without VAT is the answer. It has 1 significant digit
    (`10, 20, …, 90, 100, 200, …, 900`), so 1% stays easy to see: `121% = 48,40 → 1% = 0,40`.
  - Explanation, adding: `10% = 80 : 10 = 8, 20% = 16, 1% = 0,80 → 21% = 16,80 → 80 + 16,80 =
    96,80`, and for 9%: `10% = 80 : 10 = 8, 1% = 0,80 → 9% = 8 − 0,80 = 7,20 → 80 + 7,20 =
    87,20`.
  - Explanation, removing: `121% = 96,80 → 1% = 96,80 : 121 = 0,80 → 100% = 80`.
- **Original value:** a price after a discount (`p < 100`) or an increase (`p ≤ 50`), each 50%,
  with the `p` of §5.12. The old price is a nice whole and is the answer; the new price is an
  integer in 80% of the exercises, otherwise it has 1 or 2 decimals. Prompts:
  `Na 25% korting kost een jas € 60. Wat was de oude prijs?` and
  `Na 15% verhoging kost een abonnement € 46. Wat was de oude prijs?`
  - Explanation via the base `b = gcd(100, p)` (`12½` for `p = 12½`): the new price is
    `(100 ± p)%`, so `75% = 60 → 25% = 20 → 100% = 80`, `115% = 46 → 5% = 2 → 100% = 40`.
- The de-duplication key is the form and its numbers.

### 5.24 Scale (`scale`)

Part of the set Verhoudingen (v2). A scale is always `1 : n` (a reduction).

There are three forms, each picked with equal probability:

| Form           | Example                                                  | Answer |
|----------------|----------------------------------------------------------|--------|
| Map → real     | `Schaal 1 : 25 000. 4 cm op de kaart is in het echt ? km` | 1      |
| Real → map     | `Schaal 1 : 50 000. 3 km in het echt is op de kaart ? cm` | 6      |
| Find the scale | `4 cm op de kaart is 2 km in het echt. Schaal 1 : ?`      | 50 000 |

- `n ∈ {100, 200, 250, 500, 1000, 2000, 2500, 5000, 10 000, 20 000, 25 000, 50 000, 100 000,
  200 000, 250 000, 500 000, 1 000 000}`. For `n ≤ 5000` (a floor plan or a building drawing) the
  real distance is in `m`, for `n ≥ 10 000` (a map) in `km`. The drawing uses "op de tekening"
  instead of "op de kaart" for `n ≤ 5000`.
- The map distance is in `cm`, in `[0,5; 30]`, with at most 1 decimal and at most 2 significant
  digits. The real distance is in `[0,1; 1000]` in its unit with at most 2 decimals; in the
  real → map and find-the-scale forms, where it has to be divided, with at most 1 decimal
  (`7,5 m`, not `24,75 m`).
- The unit of the answer is the suffix; in the find-the-scale form the prefix is `1 :` and the
  answer is `n`. The user never types a unit.
- Explanation: what 1 cm is in reality, then the calculation:
  - map → real: `1 cm = 25 000 cm = 250 m = 0,25 km → 4 × 0,25 = 1 km`
  - real → map: `1 cm = 50 000 cm = 500 m = 0,5 km → 3 : 0,5 = 6 cm`
  - for `m` the chain stops at metres: `1 cm = 250 cm = 2,5 m → 3 × 2,5 = 7,5 m`
  - find the scale: `2 km = 200 000 cm → 200 000 : 4 = 50 000`
- The de-duplication key is the form, `n` and the map distance.

### 5.25 Ratio word problems (`ratioProblems`)

Part of the set Verhoudingen (v2). Short stories around a ratio; §5.13 has the bare forms.

There are three forms, each picked with equal probability:

| Form              | Example                                                                         | Answer |
|-------------------|---------------------------------------------------------------------------------|--------|
| Part of the whole | `In een klas is jongens : meisjes = 2 : 3. Welk deel van de klas is jongen?`   | 2/5    |
| Mixing            | `Siroop : water = 1 : 6. Hoeveel ml siroop zit er in 350 ml limonade?`          | 50     |
| Per unit          | `1,5 kg kaas kost € 12. Wat kost 400 g?`                                        | 3,20   |

- **Part of the whole:** a simplified ratio `a : b` with `a ≠ b`. The question asks for the
  part of one of the two groups, as a fraction or as a percentage (each 50%).
  - Fraction: `a + b ≤ 12`. The answer `a/(a + b)` is in lowest terms because `gcd(a, b) = 1`.
    Fraction step, simplest form, decimal allowed (`2/5` and `0,4` are correct, `4/10` is
    not).
  - Percentage: `a + b ∈ {3, 4, 5, 6, 8, 10}`, prompt `Hoeveel procent van de klas is
    jongen?`. Fraction step with any equal value correct and suffix `%`, so `33 1/3` can be typed
    (as in §5.20).
  - Contexts, each equally likely: jongens : meisjes in een klas, rode : blauwe knikkers in een
    zak, volwassenen : kinderen bij een voorstelling.
  - Explanation: `2 + 3 = 5 delen → jongens = 2/5`, and for a percentage
    `2 + 3 = 5 delen → 2/5 = 40%`.
- **Mixing:** a simplified ratio `a : b` with `a ≠ b` and terms in `[1, 9]`. One part `u` is an
  integer in `[2, 200]`; the amounts are `a × u`, `b × u` and the total `(a + b) × u ≤ 2000`.
  Two variants, each 50%:
  - from the total: `Siroop : water = 1 : 6. Hoeveel ml siroop zit er in 350 ml limonade?`,
    asking for either ingredient (the total has at most 2 significant digits)
  - from one part: `Siroop : water = 1 : 6. Je hebt 50 ml siroop. Hoeveel ml water moet
    erbij?` (the given amount has at most 2 significant digits: `50`, `140`, not `137`)
  - Contexts, each equally likely: siroop : water (ml, limonade), cement : zand (kg, mortel),
    witte verf : blauwe verf (L, lichtblauwe verf; `u ≤ 20`). Siroop and cement are the
    smaller part (`a < b`); the paint ratio goes either way. The unit is the suffix.
  - Explanation: `1 + 6 = 7 delen → 1 deel = 350 : 7 = 50 → siroop = 1 deel = 50`, and from one
    part: `siroop = 1 deel = 50 → water = 6 delen = 300`, or with more parts given
    `cement = 2 delen = 100 → 1 deel = 50 → zand = 5 delen = 250`.
- **Per unit:** a ratio table that needs a step via a convenient unit. Contexts, each equally
  likely:
  - cheese: `1,5 kg kaas kost € 12. Wat kost 400 g?` Amounts are multiples of 100 g in
    `[200 g, 3 kg]`, shown in `g` below 1 kg and in `kg` (at most 1 decimal) from 1 kg. The
    price per 100 g is a multiple of 10 cents in `[€ 0,60; € 2,50]`. Step: 100 g.
  - petrol: `40 L benzine kost € 76. Wat kost 25 L?` Amounts are whole litres in `[5, 60]`;
    in 50% of the exercises both are multiples of 5. The price per litre is a multiple of 10
    cents in `[€ 1,60; € 2,20]`. Step: 5 L when both amounts are multiples of 5, otherwise 1 L.
  - wage: `Voor 4 uur werk krijg je € 60. Hoeveel voor 2,5 uur?` Amounts are whole or half hours
    in `[1, 10]`. The wage is a whole number of euros in `[10, 25]` per hour. Step: 1 uur.
  - Neither amount is a whole multiple of the other, and neither equals the step, so the step is
    needed. Both prices, the given one and the answer, are at most `€ 200`, money formatting as
    in §8.
  - Explanation: the ratio table, `1,5 kg → € 12, 100 g → € 0,80, 400 g → € 3,20`.
- The de-duplication key is the form, the context and the numbers.

### Verhoudingen v3 (§5.53–§5.58)

The RWT gaps of Verhoudingen (§12.3) and its Verdieping. Opfrisser gets two new topics
(§5.53–§5.54); Verdieping has four topics of its own (§5.55–§5.58, §4.1). The card description
(§3.1) becomes "Procenten, promille, verhoudingen en schaal".

### 5.53 Permille (`permille`)

Opfrisser (RWT B.1, B.7). Label: `Promille (‰ van, ‰ ↔ % ↔ kommagetal)`. There are three forms,
each picked with equal probability:

| Form            | Example                  | Answer | Suffix |
|-----------------|--------------------------|--------|--------|
| Part of a whole | `3‰ van 4000 = ?`        | 12     | —      |
| Conversion      | `25‰ = ?%`               | 2,5    | `%`    |
| What permille   | `6 is ?‰ van 2000`       | 3      | `‰`    |

- **Part of a whole:** `p ∈ {1, 2, 3, 4, 5, 8, 10, 12, 15, 20, 25, 50}`, the whole a nice whole
  in `[1000, 900 000]`, the answer an integer.
- **Conversion**, three directions, each equally likely:
  - `‰ → %`: `v ∈ [1, 99]` ‰, so the answer has at most 1 decimal (`25‰ = 2,5%`)
  - `% → ‰`: `v ∈ {0,1; 0,2; 0,5; 1; 1,5; 2; 2,5; 5; 10; 12,5}` %
  - `‰ → kommagetal`: `7‰ = ?`, `v ∈ [1, 99]`, answer `v : 1000` (`0,007`)
- **What permille:** the whole and `p` as in part of a whole; the part is given, `p` is the
  answer.
- Explanations: `1‰ = 4000 : 1000 = 4 → 3‰ = 3 × 4 = 12`, `1% = 10‰ → 25 : 10 = 2,5`,
  `1‰ = 0,001 → 7‰ = 0,007`, `1‰ = 2000 : 1000 = 2 → 6 : 2 = 3`.

### 5.54 Proportion concepts (`proportionConcepts`)

Opfrisser (RWT B.1), all multiple choice. Label: `Begrippen (absoluut, relatief, 1 op de n)`.
There are two forms, each picked with equal probability:

| Form              | Example                                       | Answer                         |
|-------------------|-----------------------------------------------|--------------------------------|
| Absolute/relative | `Welke uitspraak is relatief?`                | `Er wonen 5% meer mensen.`     |
| 1 op de n         | `"1 op de 4" betekent hetzelfde als …`        | `25%`                          |

- **Absolute/relative:** the question asks for the relative or the absolute statement (50/50).
  Four statements about one context, each with its own numbers: one of the asked kind, three of
  the other. Relative statements use a percentage, a fraction or `1 op de n`; absolute ones a
  count or an amount. Contexts, each equally likely:

  | Context   | Absolute statements (templates)                                                  | Relative statements (templates)                                    |
  |-----------|----------------------------------------------------------------------------------|--------------------------------------------------------------------|
  | dorp      | `Er wonen 300 mensen meer.`, `Er wonen nu 6300 mensen.`, `Er zijn 40 nieuwe huizen.` | `Er wonen 5% meer mensen.`, `1 op de 20 inwoners is nieuw.`, `Een kwart van de inwoners is kind.` |
  | school    | `Er zijn 24 leerlingen ziek.`, `Er zitten 12 meisjes in de klas.`, `De school heeft 18 leraren.` | `10% van de leerlingen is ziek.`, `De helft van de klas is meisje.`, `1 op de 3 leerlingen fietst.` |
  | winkel    | `De jas is € 20 goedkoper.`, `Er zijn 150 jassen verkocht.`, `De jas kost nu € 60.` | `De jas is 25% goedkoper.`, `1 op de 4 klanten koopt een jas.`, `Een derde van de jassen is verkocht.` |

  The numbers in a template are drawn from small sets (`[2, 9]` × 10 for counts, `[20, 90]` × 100
  for the population of the dorp, `{5, 10, 20, 25}` for percentages, `{2, 3, 4, 5, 10}` for `n`);
  the options are in random order.
- **1 op de n:** `n ∈ {4, 5, 10, 20, 25}`. Options in random order: the answer `100/n %`, the
  ratio trap `1 : n` (that is 1 of `n + 1`), `n%` and the fraction `1/(n − 1)` (written stacked,
  §8). For `n = 10` the trap `n%` equals the answer and is replaced by `1%`.
- Explanations: `Relatief: een deel van het geheel (procent, breuk, 1 op de n).`,
  `Absoluut: een aantal of bedrag.`; `1 op de 4 = 1/4 = 25%; 1 : 4 is 1 op de 5`.

### 5.55 Percent problems (`percentProblems`)

Verdieping (RWT B.7). Label: `Procentenproblemen (stapelkorting, extra inhoud, promille)`. There
are four forms, each picked with equal probability:

| Form             | Example                                                                                                   | Answer | Suffix     |
|------------------|-----------------------------------------------------------------------------------------------------------|--------|------------|
| Stacked change   | `Een jas kost € 80. Je krijgt 25% korting en op de nieuwe prijs nog 10%. Wat betaal je?`                   | 54     | `€` prefix |
| Total percentage | `Eerst 20% korting en op de nieuwe prijs nog 10% korting. Hoeveel procent korting is dat samen?`            | 28     | `%`        |
| Extra content    | `Een actiefles shampoo bevat 20% extra: 360 ml. Hoeveel ml zit er in een gewone fles?`                     | 300    | `ml`       |
| Permille growth  | `Een gemeente heeft 550 000 inwoners en groeit in een jaar met 2‰. Met hoeveel inwoners groeit ze?`        | 1100   | `inwoners` |

- **Stacked change:** the price is a nice whole in `[20, 400]`. Two variants, 70/30:
  - two discounts, `p₁, p₂ ∈ {10, 20, 25, 50}`
  - first an increase of `p`, then a decrease of the same `p` (`Een prijs stijgt met 20% en
    daalt daarna met 20%. …`), `p ∈ {10, 20, 25, 50}`; the answer is below the old price
  - the answer has at most 2 decimals.
- **Total percentage:** `p₁, p₂ ∈ {10, 20, 25, 50}`; answer `100 − (100 − p₁)(100 − p₂)/100`
  (`20, 10 → 28`, `25, 10 → 32½`). Fraction step with any equal value correct, as §5.12, so
  `32 1/2` and `32,5` are correct.
- **Extra content:** `p ∈ {10, 20, 25, 50}`; the normal content is a nice whole in `[100, 1000]`
  and the action content `normal × (100 + p)/100` is an integer. Contexts: `fles shampoo` (ml),
  `pak koffie` (g), `zak chips` (g).
- **Permille growth:** the population is a nice whole in `[10 000, 900 000]`,
  `p ∈ {1, 2, 3, 4, 5, 8}`, the growth `population × p : 1000` an integer. Two variants, 50/50:
  the growth, or the population after a year (`Hoeveel inwoners heeft ze na een jaar?`).
- Explanations: `25% van 80 = 20 → 60 → 10% van 60 = 6 → 54`, up and down with the steps
  written out, `20% van 80 = 16 → 80 + 16 = 96 → 20% van 96 = 19,2 → 96 − 19,2 = 76,8`; total
  `stel 100 → 20% korting: 80 → 10% van 80 = 8: 72 → 100 − 72 = 28%`; extra
  `120% = 360 → 10% = 30 → 100% = 300`; permille `1‰ = 550 000 : 1000 = 550 → 2‰ = 1100`.

### 5.56 Enlargement (`enlargement`)

Verdieping (RWT B.10). One dimension per exercise. Label: `Vergroten en verkleinen
(kopieerapparaat)`. There are four forms, each picked with equal probability:

| Form           | Example                                                                                   | Answer | Suffix |
|----------------|-------------------------------------------------------------------------------------------|--------|--------|
| With p%        | `Je vergroot een foto van 12 cm breed met 25%. Hoe breed wordt de foto?`                  | 15     | `cm`   |
| At q%          | `Je kopieert een tekening van 20 cm breed op 80%. Hoe breed wordt de kopie?`              | 16     | `cm`   |
| Find q         | `Een foto van 10 cm breed wordt 15 cm breed. Op hoeveel procent stel je het kopieerapparaat in?` | 150 | `%`   |
| Back           | `Na vergroten met 50% is een foto 18 cm breed. Hoe breed was hij?`                        | 12     | `cm`   |

- `met p%`: enlarging `p ∈ {10, 20, 25, 50, 100}` or reducing (`verklein met`)
  `p ∈ {10, 20, 25, 50}`, 50/50. `op q%`: `q ∈ {50, 75, 80, 120, 125, 150, 200}`.
- The original is an integer in `[4, 40]` cm; the result has at most 1 decimal. Find q uses
  the `op q%` list with an integer result; back uses the `met p%` list.
- Context: `foto`, `tekening` or `plattegrond`, `breed` or `hoog` (each equally likely).
- Explanations: `vergroten met 25% → 125% van 12: 25% = 3 → 12 + 3 = 15`,
  `80% van 20: 10% = 2 → 8 × 2 = 16`, `15 : 10 = 1,5 → 150%`, `150% = 18 → 50% = 6 → 100% = 12`.

### 5.57 Comparing ratios (`compareRatios`)

Verdieping (RWT B.4, B.1), all multiple choice. Label: `Verhoudingen vergelijken (meer,
voordeliger, naar verhouding)`. There are four forms, each picked with equal probability:

| Form     | Example                                                                                                                                | Answer   |
|----------|----------------------------------------------------------------------------------------------------------------------------------------|----------|
| Recipe   | `Jack bakt met appels : peren = 1 : 2, Jasmijn met 3 : 4. Ze gebruiken allebei 3 appels. Wie gebruikt de meeste peren?`                 | `Jack`   |
| Offer    | `Welke aanbieding is het voordeligst?`                                                                                                 | `5 voor € 3,75` |
| Relative | `Klas A: 6 van de 24 leerlingen zijn ziek. Klas B: 8 van de 40. Waar is naar verhouding het meest ziek?`                               | `klas A` |
| Three groups | `Bij een politiecontrole rijden op dag 1 13 van de 125 automobilisten onder invloed. Op dag 2 zijn het er 21 van de 200, op dag 3 22 van de 210. Op welke dag rijden naar verhouding de meeste automobilisten onder invloed?` | `dag 2` |

- **Recipe:** name pairs `Jack/Jasmijn`, `Sam/Noor`, `Daan/Lotte`; ratios `a : b` and `c : d`
  with terms in `[1, 6]` and `a ≠ c`. The common apples `A` is a multiple of `a` and `c`, at
  most 12; both pear counts are integers, at most 30. In 80% both ratios are simplified and
  the pear counts differ; in 20% the second ratio is the first times 2 or 3, not simplified
  (`1 : 2` and `3 : 6`), so the pear counts are equal. Options in this order: the first name,
  the second name,
  `evenveel`, `niet te zeggen`.
- **Offer:** four offers `k voor € x` with distinct `k ∈ {2, 3, 4, 5, 6, 10}`, the price per item
  a multiple of 5 cents in `[€ 0,40; € 3]`, all four different by at least 5 cents and
  `x = k × price`; exactly one is the cheapest. Products: `pakken sap`, `bekers yoghurt`,
  `rollen koekjes`. Options in random order.
- **Relative:** two groups with wholes from `{20, 24, 25, 30, 40, 50, 60, 80, 100}` and parts
  whose share is a whole percentage. In 70% the group with the larger share has the smaller
  part (the absolute trap); in 15% the shares are equal. Contexts: `klas` (ziek), `club`
  (leden die meedoen), `vakantiepark` (huisjes bezet). Options: `klas A`, `klas B`, `evenveel`,
  `niet te zeggen` (with the context's own nouns).
- **Three groups:** the PABO-test version of Relative (after a Cito example): three groups with
  awkward wholes and close shares. Three distinct wholes from
  `{120, 125, 150, 160, 175, 200, 210, 240, 250, 300}`; each share (part : whole) in `[5%, 25%]`;
  the shares differ pairwise by at least 0,02 percentage point, and the largest and the
  smallest by at most 1,5 percentage point, so a quick look does not settle it. In 70% the
  group with the largest share does not have the largest part (the absolute trap). Contexts,
  each equally likely: `politiecontrole` (`dag 1`–`dag 3`, automobilisten onder invloed) and
  `school` (`school A`–`school C`, leerlingen die op de fiets komen). Options: the three groups
  in order, then `niet te zeggen`.
- Explanations: `Jack: 3 appels → 6 peren, Jasmijn: 3 appels → 4 peren → Jack`; per item
  `€ 0,80 – € 0,75 – … → 5 voor € 3,75`; `6/24 = 25%, 8/40 = 20% → klas A`;
  `13/125 = 10,4%, 21/200 = 10,5%, 22/210 ≈ 10,48% → dag 2` (each share in % with at most 2
  decimals, `≈` when rounded).

### 5.58 Ratio reasoning (`ratioReasoning`)

Verdieping (RWT B.5, B.9). Label: `Redeneren met verhoudingen (verschil, herschalen,
aanvullen, samenvoegen)`. There are four forms, each picked with equal probability:

| Form       | Example                                                                                                           | Answer | Suffix     |
|------------|-------------------------------------------------------------------------------------------------------------------|--------|------------|
| Difference | `Anna en Bas verdelen geld in de verhouding 3 : 5. Bas krijgt € 12 meer dan Anna. Hoeveel krijgt Anna?`            | 18     | `€` prefix |
| Rescale    | `Voor 4 personen heb je 300 g pasta nodig. Hoeveel kg is dat voor 30 personen?`                                   | 2,25   | `kg`       |
| Top up     | `In een zak zitten 30 knikkers, rood : blauw = 2 : 3. Hoeveel rode knikkers moet je erbij doen om 1 : 1 te krijgen?` | 6   | `knikkers` |
| Combine    | `Rosa, Merel en Suzan verdelen een prijs naar verhouding van hun inleg. Rosa : Merel = 7 : 2 en Merel : Suzan = 3 : 2. Wat is Rosa : Merel : Suzan?` | `21 : 6 : 4` (multiple choice) | — |

- **Difference:** a simplified ratio `a : b`, `a < b`, terms in `[1, 9]`; one part `u ∈ [2, 50]`;
  the prompt gives the difference `(b − a) × u` and asks for the smaller share, the larger share
  or the total (each equally likely). Contexts: `geld` (€), `knikkers`, `stickers`.
- **Rescale:** like the scaling form of §5.13 with the answer in the larger unit: pasta `g → kg`
  (50–150 g per person), melk `ml → L` (50–250 ml per person). The first count is in `[2, 8]`,
  the second a multiple of 5 in `[10, 60]`; the answer has at most 2 decimals.
- **Top up:** a start ratio `a : b` (simplified, terms in `[1, 5]`), the total `(a + b) × u` at
  most 60; a target ratio `c : d` from `{1 : 1, 2 : 1, 1 : 2, 3 : 2, 2 : 3, 3 : 1, 1 : 3}` that
  is reached by adding only the asked colour (an integer count of at least 1). Contexts:
  `knikkers` (rood : blauw), `kralen` (wit : zwart).
- **Combine** (after a Cito example), multiple choice (`choice`, §6, no tip): two simplified
  ratios `a : b` (first : middle) and `c : d` (middle : last), terms in `[1, 9]`, `b ≠ c`. With
  `m = lcm(b, c)` the answer is `a × m/b : m : d × m/c`, simplified; every term at most 50.
  Name triples, each equally likely: `Rosa/Merel/Suzan`, `Anna/Bas/Noor`, `Daan/Lotte/Sam`.
  Distractors: `a : b : d` and `a : c : d` (the ratios glued together) and `a × c : b × c : d`
  (the last person not scaled). Redraw when two options are equal ratios. Options in random
  order.
- Explanations: `5 − 3 = 2 delen = € 12 → 1 deel = € 6 → Anna = 3 × 6 = 18`;
  `4 → 300 g, 2 → 150 g, 30 → 2250 g = 2,25 kg`; `rood 12, blauw 18 → 1 : 1 → rood 18 → 18 −
  12 = 6 erbij`; `Merel 2 en 3 → 6: 7 : 2 = 21 : 6, 3 : 2 = 6 : 4 → 21 : 6 : 4`.
