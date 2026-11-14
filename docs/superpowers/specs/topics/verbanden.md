# Verbanden & statistiek: topics

Part of the design spec (`../2026-10-05-rekenhulp-design.md`, §5). The § numbers are those of the
spec; its §5 holds the index and the rules shared by several sets.

### Verbanden & statistiek (§5.33–§5.38)

The set Verbanden & statistiek (v2). Its card (§3.1) reads "Statistiek, rijen, formules,
vergelijkingen en kans". Every topic uses an existing answer kind: `number`, or `fraction` for
`probability`. Negative numbers are typed with the `−` key (§5.16) and written as `−4` in lists
and as the first term, in parentheses elsewhere (§5.8). The longest prompts (about 120
characters: the marbles of `probability`) use the small size of §3.3.

### 5.33 Statistics (`statistics`)

There are five forms, each picked with equal probability:

| Form             | Example                                                                  | Answer |
|------------------|--------------------------------------------------------------------------|--------|
| Mean             | `Cijfers: 6, 8, 7, 5, 9. Wat is het gemiddelde?`                         | 7      |
| Median           | `Temperaturen deze week in °C: 4, −2, 3, 0, 5, 1, −4. Wat is de mediaan?` | 1      |
| Mode             | `Doelpunten per wedstrijd: 2, 0, 3, 1, 2. Wat is de modus?`             | 2      |
| Range            | `Cijfers: 6, 8, 7, 5, 9. Wat is de spreidingsbreedte?`                   | 4      |
| Missing value    | `Je hebt de cijfers 6, 8 en 7. Welk cijfer moet je nog halen om gemiddeld een 7 te staan?` | 7 |

- **Contexts** for the first four forms, each equally likely, with their values and list lengths.
  The list is shown in the drawn order, not sorted:

  | Context    | Label                            | Values (whole)   | Length    | Suffix |
  |------------|----------------------------------|------------------|-----------|--------|
  | cijfers    | `Cijfers:`                       | `[3, 10]`        | 5 or 6    | —      |
  | doelpunten | `Doelpunten per wedstrijd:`      | `[0, 6]`         | 5, 6 or 7 | —      |
  | temperatuur | `Temperaturen deze week in °C:` | `[−5, 15]`       | 7         | `°C` (range: `graden`) |

  Temperature lists have at least one value below zero.
- **Mean:** the sum is divisible by the length, so the mean is whole (redraw otherwise).
- **Median:** an odd length gives the middle value, an even length the mean of the two middle
  values (`6,5` possible).
- **Mode:** exactly one value occurs most often (2 or 3 times; redraw otherwise).
- **Range:** highest − lowest.
- **Missing value:** cijfers only. 3, 4 or 5 given values in `[3, 10]`, a whole mean in `[5, 8]`,
  the answer in `[4, 10]`.
- Answers are `number` steps.
- Explanations: `6 + 8 + 7 + 5 + 9 = 35 → 35 : 5 = 7`; `op volgorde: −4, −2, 0, 1, 3, 4, 5 →
  de middelste is 1`, even length `… → (6 + 7) : 2 = 6,5`; `2 komt het vaakst voor (2 keer)`;
  `hoogste − laagste = 9 − 5 = 4`, `15 − (−3) = 18`; `gemiddeld 7 bij 4 cijfers = 4 × 7 = 28
  → 28 − 6 − 8 − 7 = 7`.
- The de-duplication key is the form, the context and the list.

### 5.34 Percentage points (`percentagePoints`)

There are two forms, each picked with equal probability:

| Form       | Example                                                                     | Answer | Suffix |
|------------|-----------------------------------------------------------------------------|--------|--------|
| Difference | `De rente stijgt van 4% naar 5%. Hoeveel procentpunt is dat?`               | 1      | `procentpunt` |
| Difference | `De rente stijgt van 4% naar 5%. Met hoeveel procent stijgt de rente?`      | 25     | `%`    |
| New value  | `De rente is 4%. Die stijgt met 1 procentpunt. Hoeveel procent is de rente nu?` | 5  | `%`    |
| New value  | `De rente is 4%. Die stijgt met 25%. Hoeveel procent is de rente nu?`        | 5      | `%`    |

- An old percentage `o` and a relative change `r ∈ {10, 20, 25, 50, 75, 100}` (a decrease only
  `r ≤ 75`) give the new percentage `n = o × (100 ± r) / 100`, which is whole. The difference
  `|n − o|` is the change in procentpunten. Increase or decrease, each 50%.
- Contexts, each equally likely, with the range of `o` and `n`: rente `[1, 8]`
  (`De rente stijgt van …`), werkloosheid `[2, 12]` (`De werkloosheid daalt van …`), opkomst bij
  verkiezingen `[40, 95]` (`De opkomst bij de verkiezingen stijgt van …`). The verb follows the
  direction (`stijgt`/`daalt`, `Met hoeveel procent daalt …`). A drawn `o` and `r` without a
  whole `n` in range is redrawn.
- **Difference:** asks procentpunten or procent, each 50%. **New value:** gives the change in
  procentpunten or in procent, each 50%, and asks `n`.
- Answers are whole `number` steps.
- Explanations: `5 − 4 = 1 procentpunt`; `5 − 4 = 1 → 1 van 4 = 1/4 = 25%`; `4 + 1 = 5%`;
  `25% van 4 = 1 → 4 + 1 = 5%`.
- The de-duplication key is the form, the context, `o`, `n` and what is asked or given.

### 5.35 Sequences (`sequences`)

There are three forms, each picked with equal probability:

| Form       | Example                                                                 | Answer |
|------------|-------------------------------------------------------------------------|--------|
| Next term  | `3, 7, 11, 15, … Wat is het volgende getal?`                            | 19     |
| n-th term  | `3, 7, 11, 15, … Wat is het 20e getal?`                                 | 79     |
| Figurate   | `Driehoeksgetallen: 1, 3, 6, 10, … Wat is het 8e driehoeksgetal?`       | 36     |

- Four terms are shown, then `…`.
- **Next term:** arithmetic or geometric, each 50%.
  - arithmetic: start in `[−20, 50]`, difference in `[2, 15]`, decreasing in 30% of the
    exercises; every term, the answer included, in `[−50, 100]`
  - geometric: `× 2` (start `[1, 12]`), `× 3` (start `[1, 5]`) or `: 2` (start `16 × k`,
    `k ∈ [1, 10]`), each equally likely; every term at most 1000
- **n-th term:** arithmetic and increasing, start in `[1, 20]`, difference in `[2, 10]`,
  `n ∈ {10, 12, 15, 20, 25, 30, 50, 100}`, the answer at most 1000.
- **Figurate:** triangular numbers (`n(n + 1) : 2`, `n ∈ [5, 20]`) or square numbers
  (`Kwadraatgetallen: 1, 4, 9, 16, …`, `n ∈ [5, 20]`), each 50%.
- Answers are `number` steps.
- Explanations: `+4 → 15 + 4 = 19`, `× 2 → 24 × 2 = 48`, `: 2 → 20 : 2 = 10`; `van het 1e naar
  het 20e getal zijn 19 stappen van 4 → 3 + 19 × 4 = 79`; `1 + 2 + … + 8 = 8 × 9 : 2 = 36`,
  `15 × 15 = 225`.
- The de-duplication key is the form and the numbers.

### 5.36 Formulas (`formulas`)

There are two forms, each picked with equal probability:

| Form         | Example                                                                         | Answer |
|--------------|---------------------------------------------------------------------------------|--------|
| Substitution | `Taxi: kosten in euro = 4 + 2,50 × aantal km. Wat kost een rit van 12 km?`      | 34     |
| Substitution | `y = 3x − 4. Wat is y als x = 5?`                                               | 11     |
| Table        | `Tabel: bij x = 2, 4, 6, 8 hoort y = 11, 17, 23, 29. Wat is het hellingsgetal?` | 3      |

- **Substitution:** a word formula or a letter formula, each 50%.
  - Word formulas, each equally likely:

    | Context      | Formula                                         | Start          | Rate                 | Input           | Answer |
    |--------------|-------------------------------------------------|----------------|----------------------|-----------------|--------|
    | taxi         | `Taxi: kosten in euro = 4 + 2,50 × aantal km.`   | `{3, 4, 5}`    | `{2; 2,50; 3}`       | km `[2, 20]`    | `€` prefix |
    | fietsverhuur | `Fietsverhuur: prijs in euro = 5 + 8 × aantal dagen.` | `{5, 10, 15}` | `[6, 15]`       | dagen `[2, 10]` | `€` prefix |
    | kaars        | `Kaars: lengte in cm = 24 − 2 × aantal uren.`    | `{15, 20, 24, 30}` | `{1; 1,5; 2; 3}` | uren `[2, 12]`, length at least 1 | `cm` suffix |

    Questions: `Wat kost een rit van 12 km?`, `Wat kost 4 dagen huren?`, `Hoe lang is de kaars
    na 5 uur?`
  - Letter formula `y = ax ± b`: `a ∈ [2, 9]`, `b ∈ [1, 20]`, `x ∈ [−5, 10]`, `x ≠ 0`,
    negative in 25% of the exercises.
- **Table:** a linear relation `y = ax + b`, four x-values starting at `[1, 3]` with step 1 or 2
  (each 50%), `a ∈ [−5, 10]`, `a ≠ 0`, decreasing in 25%, `b ∈ [−10, 30]`, every y in
  `[−50, 100]`. Asks the startgetal (`b`) or the hellingsgetal (`a`), each 50%.
- Answers are `number` steps; money answers with the formatting of §8.
- Explanations: `4 + 2,50 × 12 = 4 + 30 = 34`; `3 × 5 − 4 = 15 − 4 = 11`, `3 × (−2) − 4 =
  −6 − 4 = −10`; `x wordt 2 groter, y wordt 6 groter → 6 : 2 = 3` (step 1: `… → 3`);
  `hellingsgetal 3 → bij x = 0: 11 − 2 × 3 = 5`.
- The de-duplication key is the form, the context and the numbers.

### 5.37 Equations (`equations`)

Linear equations in `x` with a whole solution. There are three forms, each picked with equal
probability:

| Form             | Example                     | Answer |
|------------------|-----------------------------|--------|
| `ax ± b = c`     | `Los op: 3x + 5 = 20`       | 5      |
| `a(x ± b) = c`   | `Los op: 4(x − 2) = 12`     | 5      |
| `ax ± b = cx ± d` | `Los op: 5x + 3 = 2x + 18` | 5      |

- The answer is a `number` step with the prefix `x =` (§6).
- The solution `x ∈ [−10, 20]`, `x ≠ 0`, negative in 25% of the exercises.
- `a ∈ [2, 9]`, `b ∈ [1, 20]` with `+` or `−` (each 50%). In the third form `a ∈ [3, 9]` and the
  `x` on the right has a coefficient in `[1, a − 1]` (written `x` for 1), the constant on the
  right is not 0 and its absolute value at most 50. The right side of the other forms is not 0,
  at most 100 in absolute value and may be negative (`= −4`).
- Explanations, by balancing:
  - `3x + 5 = 20 → 3x = 20 − 5 = 15 → x = 15 : 3 = 5`
  - `3x + 20 = 5 → 3x = 5 − 20 = −15 → x = −15 : 3 = −5`
  - `4(x − 2) = 12 → x − 2 = 12 : 4 = 3 → x = 3 + 2 = 5`
  - `5x + 3 = 2x + 18 → 3x + 3 = 18 → 3x = 18 − 3 = 15 → x = 15 : 3 = 5`; when one `x`
    is left, the division is left out: `3x + 3 = 2x + 18 → x + 3 = 18 → x = 18 − 3 = 15`
- The de-duplication key is the equation.

### 5.38 Probability (`probability`)

There are two forms, each picked with equal probability:

| Form     | Example                                                                                                       | Answer |
|----------|---------------------------------------------------------------------------------------------------------------|--------|
| Die      | `Je gooit met een dobbelsteen. Hoe groot is de kans op een even getal?`                                        | 1/2    |
| Marbles  | `In een zak zitten 3 rode, 5 blauwe en 2 groene knikkers. Je pakt er zonder te kijken één. Hoe groot is de kans op een blauwe?` | 1/2 |

- **Die:** one regular die, events from a fixed list, each equally likely: `een 6` (1/6), `een
  even getal` (1/2), `een oneven getal` (1/2), `meer dan 4` (1/3), `minder dan 3` (1/3),
  `meer dan 2` (2/3), `een 5 of een 6` (1/3), `geen 6` (5/6), `een veelvoud van 3` (1/3).
- **Marbles:** 2 or 3 colours from rood, blauw, groen and geel, each count in `[1, 12]`, the total
  in `[5, 20]`. Asks for one colour (75%) or for `een knikker die niet rood is` (25%, any of
  the colours).
- The answer is a fraction step in simplest form, decimal allowed (§6): `1/2` and `0,5` are
  correct, `3/6` is not. Non-terminating answers (`1/3`) can only be typed as a fraction; the
  existing tips of §3.4.1 cover `0,33` and `3/6`.
- Explanations: `3 van de 6 uitkomsten: 2, 4, 6 → 3/6 = 1/2`, `1 van de 6 uitkomsten: 6 → 1/6`;
  `5 van de 3 + 5 + 2 = 10 knikkers zijn blauw → 5/10 = 1/2` (one marble: `1 van de … is
  rood`); `7 van de 3 + 5 + 2 = 10 knikkers zijn niet rood → 7/10`. The `= …` simplification is
  left out when the fraction is already in simplest form.
- The de-duplication key is the form and the event or the counts.

### Verbanden & statistiek v3 (§5.86–§5.89)

### 5.86 Two dice and coins (`twoDice`)

Verdieping (RWT B.11). Label: `Kans (twee dobbelstenen, munten)`. Two forms, 50/50:

| Form  | Example                                                                      | Answer |
|-------|------------------------------------------------------------------------------|--------|
| Dice  | `Je gooit met twee dobbelstenen. Hoe groot is de kans op een som van 5?`     | 1/9    |
| Coins | `Je gooit 3 keer een munt op. Hoe groot is de kans op precies één keer kop?` | 3/8    |

- **Dice:** 36 equally likely outcomes, counted by enumeration. Events, each equally likely, with
  their number of favourable outcomes:

  | Event                        | Count | Event                   | Count |
  |------------------------------|-------|-------------------------|-------|
  | `een som van 5`              | 4     | `twee even getallen`    | 9     |
  | `een som van 7`              | 6     | `minstens één zes`      | 11    |
  | `een som van 8`              | 5     | `geen enkele zes`       | 25    |
  | `een som van 11 of meer`     | 3     | `een even som`          | 18    |
  | `een som kleiner dan 5`      | 6     | `een product van 12`    | 4     |
  | `twee dezelfde getallen`     | 6     |                         |       |

- **Coins:** `n ∈ {3, 4}` throws (`Je gooit 3 keer een munt op.`), events, each equally likely:
  `elke keer kop` (1 outcome), `precies één keer kop` (`n`), `precies twee keer kop`
  (`n(n − 1) : 2`) and `minstens één keer munt` (`2ⁿ − 1`); the total is `2ⁿ`.
- The answer is the fraction step of §5.38 (simplest form, decimal allowed): `1/9`, `3/8`,
  `0,125` are correct, `4/36` is not.
- Explanations: `36 uitkomsten; een som van 5: 1 + 4, 2 + 3, 3 + 2, 4 + 1 = 4 uitkomsten →
  4/36 = 1/9` (the sum events list their pairs; `twee dezelfde getallen: 1-1 t/m 6-6`; `geen
  enkele zes: 5 × 5 = 25`; `minstens één zes: 36 − 25 = 11`; `twee even getallen: 3 × 3 = 9`;
  `een even som: de helft van 36 = 18`; `een product van 12: 2 × 6, 6 × 2, 3 × 4, 4 × 3`);
  `2 × 2 × 2 = 8 uitkomsten; precies één keer kop: KMM, MKM, MMK = 3 uitkomsten → 3/8` (the
  outcomes are listed; `minstens één keer munt: alles behalve KKK → 8 − 1 = 7 → 7/8`). The
  `= …` simplification is left out when the fraction is already in simplest form.
- The de-duplication key is the form, the event and `n`.

### 5.87 Statistics concepts (`statisticsReasoning`)

Verdieping (RWT: mean versus median and other concepts), all multiple choice. Label:
`Statistiek (welke maat: gemiddelde, mediaan, modus)`. Two forms, 50/50:

| Form           | Example                                                                | Answer                                  |
|----------------|------------------------------------------------------------------------|-----------------------------------------|
| Unchanged      | `Cijfers: 5, 6, 6, 7, 9. Er komt een 10 bij. Welke maat blijft gelijk?` | `de modus`                              |
| Mean vs median | `Inkomens in € 1000: 2, 2, 3, 3, 15. Welke uitspraak klopt?`           | `Het gemiddelde is groter dan de mediaan` |

- Measures: `het gemiddelde`, `de mediaan`, `de modus`, `de spreidingsbreedte`.
- **Unchanged:** always the context `Cijfers:`, 5 to 7 whole values in `[1, 10]`, shown in the
  drawn order, and one added value in `[1, 10]`. Redraw unless the mode is unique before and after and exactly one of the
  four measures is equal before and after (exact). Options: the four measures in the order
  above; the answer is the unchanged one.
- **Mean vs median:** 5 whole values with a unique mode; contexts `Cijfers:` (values in
  `[1, 10]`), `Inkomens in € 1000:` and `Leeftijden:` (values in `[1, 20]`), each equally likely. Options in this order:
  `Het gemiddelde is groter dan de mediaan`, `Het gemiddelde is kleiner dan de mediaan`,
  `Het gemiddelde is gelijk aan de mediaan`, `De modus is gelijk aan het gemiddelde`. Redraw
  unless the last statement is false (so exactly one of the four is true); the answer is the
  true one.
- Explanations: `voor → na: gemiddelde 6,6 → 7,17 (verandert), mediaan 6 → 6,5 (verandert), modus
  6 → 6 (blijft), spreidingsbreedte 4 → 5 (verandert)`; `gemiddelde 25 : 5 = 5, mediaan 3 →
  het gemiddelde is groter dan de mediaan`. A mean that is not whole is shown with a decimal
  comma, rounded half up to at most 2 decimals (`43/6 → 7,17`); the comparison uses exact values.
- The de-duplication key is the form, the list and the added value.

### 5.88 Averages in context (`statisticsProblems`)

Verdieping. Label: `Gemiddelde in context (samen, erbij, eraf)`. Three forms, each equally likely, all
`number` answers:

| Form        | Example                                                                                                                                  | Answer |
|-------------|------------------------------------------------------------------------------------------------------------------------------------------|--------|
| Combined    | `In klas A zitten 20 leerlingen met gemiddeld een 6. In klas B zitten 30 leerlingen met gemiddeld een 7. Wat is het gemiddelde van beide klassen samen?` | 6,6 |
| Added value | `Het gemiddelde van 5 getallen is 6. Er komt een zesde getal bij en het gemiddelde wordt 7. Welk getal is dat?`                           | 12     |
| Removed     | `Het gemiddelde van 6 getallen is 8. Je haalt het getal 14 weg. Wat is het gemiddelde van de andere 5?`                                  | 6,8    |

- **Combined:** two contexts, 50/50: klassen (`leerlingen met gemiddeld een`, means whole in
  `[5, 9]`) and groepen (`In groep A zitten 10 kinderen met een gemiddelde leeftijd van 8 jaar`,
  means whole in `[6, 14]`, suffix `jaar`, question `Wat is het gemiddelde samen?` to stay
  within 170 characters). Group sizes from `{10, 15, 20, 25, 30, 40}`, the
  two sizes and the two means different; redraw unless the combined mean has at most 1 decimal.
- **Added value:** `n ∈ [4, 8]` numbers with a whole mean `m ∈ [5, 9]`; the new mean is `m + 1`
  or `m − 1` (50%); the added number `(n + 1)(m ± 1) − n·m` is in `[1, 20]` (redraw otherwise).
- **Removed:** `n ∈ [5, 8]` numbers with a whole mean `m ∈ [6, 12]`; the removed number `r` in
  `[1, 30]`, `r ≠ m`; redraw unless the new mean `(n·m − r)/(n − 1)` is at least 1 and has at
  most 1 decimal.
- Explanations: `klas A: 20 × 6 = 120, klas B: 30 × 7 = 210 → samen 120 + 210 = 330 voor 50
  leerlingen → 330 : 50 = 6,6`; `6 getallen met gemiddelde 7 = 6 × 7 = 42, eerst 5 × 6 = 30 →
  42 − 30 = 12`; `6 × 8 = 48 → 48 − 14 = 34 → 34 : 5 = 6,8`.
- The de-duplication key is the form, the context and the numbers.

### 5.89 Formulas and sequences in context (`formulaProblems`)

Verdieping. Label: `Formules en rijen in context (omgekeerd, gelijk, plek)`. Three forms, each equally
likely, all `number` answers:

| Form       | Example                                                                                                                    | Answer | Suffix  |
|------------|----------------------------------------------------------------------------------------------------------------------------|--------|---------|
| Reverse    | `Taxi: kosten in euro = 4 + 2,50 × aantal km. Een rit kost € 29. Hoeveel km is dat?`                                        | 10     | `km`    |
| Break-even | `Abonnement A kost € 10 per maand plus € 2 per film. Abonnement B kost € 4 per maand plus € 3 per film. Bij hoeveel films kosten ze evenveel?` | 6 | `films` |
| Position   | `Patroon: 4, 7, 10, 13, … Op welke plek staat 100?`                                                                          | 33     | —       |

- **Reverse:** the three word formulas of §5.36 (taxi, fietsverhuur, kaars) with their ranges;
  a quantity is drawn and the result given: `Een rit kost € 29. Hoeveel km is dat?`, `Je
  betaalt € 69 voor de huur. Hoeveel dagen was dat?`, `De kaars is nog 14 cm lang. Hoeveel uur
  brandt hij al?` (suffixes `km`, `dagen`, `uur`). The quantity is whole. A fourth context,
  equally likely, is temperatuur (RWT D.4): `Temperatuur: graden Fahrenheit = 32 + 1,8 × graden
  Celsius. Het is 77 °F. Hoeveel °C is dat?` (answer 25, suffix `°C`); the Celsius value is a
  multiple of 5 in `[−20, 40]` and not 0, so the Fahrenheit value is whole (`−4` to `104`).
- **Break-even:** two offers `start + rate × x` in whole euros, `start₁ > start₂` and
  `rate₁ < rate₂`; `start₁ − start₂ ∈ [2, 12]`, `rate₂ − rate₁ ∈ [1, 3]` dividing it, the
  answer `x = (start₁ − start₂) : (rate₂ − rate₁) ∈ [2, 10]`. Two contexts, 50/50: abonnement
  (`per maand plus € 2 per film`, suffix `films`) and sportschool (`per maand plus € 3 per
  les`, suffix `lessen`).
- **Position:** an increasing arithmetic sequence with start in `[1, 20]` and difference in
  `[2, 9]`, four terms shown and `…`; the asked term is at `n ∈ [10, 60]` and at most 500.
- Explanations: `4 + 2,50 × aantal km = 29 → 2,50 × aantal km = 29 − 4 = 25 → 25 : 2,50 = 10`;
  `32 + 1,8 × graden Celsius = 77 → 1,8 × graden Celsius = 77 − 32 = 45 → 45 : 1,8 = 25`;
  `A is € 6 duurder per maand (10 − 4), B is € 1 duurder per film (3 − 2) → 6 : 1 = 6 films`;
  `van 4 naar 100 is 96 meer → 96 : 3 = 32 stappen → plek 1 + 32 = 33`.
- The de-duplication key is the form, the context and the numbers.
