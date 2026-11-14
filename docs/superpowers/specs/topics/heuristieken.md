# Heuristieken: topics

Part of the design spec (`../2026-10-05-rekenhulp-design.md`, §5). The § numbers are those of the
spec; its §5 holds the index and the rules shared by several sets.

### Heuristieken (§5.41–§5.44)

The set Heuristieken (v2, LKT). Its card (§3.1) reads "Systematisch tellen, terugrekenen,
proberen en vereenvoudigen". Every prompt is question text (§3.3): a sentence without a slot.
Every answer is a whole `number` step; money answers have the `€` prefix (§8, whole euros).
Each explanation starts with the name of its heuristic: `Systematisch tellen:`,
`Terugrekenen:`, `Slim proberen:` or `Vereenvoudigen:`. The longest prompts (about 165
characters: money left over, §5.42) wrap at the question-text size of §3.3 and scroll on short
screens (§2); no prompt is longer than 170 characters.

### 5.41 Systematic counting (`systematicCounting`)

There are three forms, each picked with equal probability, each with two contexts (50% each):

| Form         | Example                                                                                                            | Answer |
|--------------|--------------------------------------------------------------------------------------------------------------------|--------|
| Combinations | `Je hebt 3 broeken en 4 truien. Hoeveel verschillende combinaties van een broek en een trui kun je maken?`          | 12     |
| Combinations | `Een restaurant heeft 3 voorgerechten, 4 hoofdgerechten en 2 nagerechten. Hoeveel verschillende menu's van drie gangen kun je kiezen?` | 24 |
| Handshakes   | `Op een feest geeft elke gast elke andere gast één keer een hand. Er zijn 6 gasten. Hoeveel handdrukken zijn dat?` | 15     |
| Handshakes   | `In een competitie speelt elk team één keer tegen elk ander team. Er doen 8 teams mee. Hoeveel wedstrijden zijn dat?` | 28   |
| Orderings    | `Op hoeveel manieren kunnen 4 kinderen naast elkaar in een rij staan?`                                              | 24     |
| Orderings    | `Aan een hardloopwedstrijd doen 6 kinderen mee. Op hoeveel manieren kunnen de 1e, 2e en 3e plaats verdeeld worden?` | 120  |

- **Combinations:** kleding has two counts in `[2, 8]`; menu has three counts in `[2, 6]` with
  a product of at most 120. The answer is the product.
- **Handshakes:** `n ∈ [4, 16]` gasten or teams; the answer is `n × (n − 1) : 2`.
- **Orderings:** a row of `n ∈ [3, 5]` kinderen (`n × … × 1`), or a podium out of
  `n ∈ [4, 8]` kinderen (`n × (n − 1) × (n − 2)`).
- Explanations:
  - `Systematisch tellen: bij elke broek passen 4 truien → 3 × 4 = 12`
  - `Systematisch tellen: elk voorgerecht met elk hoofdgerecht en elk nagerecht → 3 × 4 × 2 = 24`
  - `Systematisch tellen: elk van de 6 gasten geeft 5 handen → 6 × 5 = 30 → zo telt elke
    handdruk dubbel: 30 : 2 = 15` (competitie: `elk van de 8 teams speelt 7 wedstrijden → …
    elke wedstrijd …`)
  - `Systematisch tellen: 4 kinderen kunnen vooraan staan, dan 3 op de 2e plek, … → 4 × 3 × 2 ×
    1 = 24`
  - `Systematisch tellen: 6 kinderen voor de 1e plaats, 5 voor de 2e, 4 voor de 3e → 6 × 5 × 4 =
    120`
- Tips (§3.4.1): combinations, the counts added; handshakes, the product not halved.
- The de-duplication key is the form, the context and the counts.

### 5.42 Working backwards (`workingBackwards`)

There are two forms, each picked with equal probability:

| Form           | Example                                                                                                                 | Answer |
|----------------|-------------------------------------------------------------------------------------------------------------------------|--------|
| Think of a number | `Ik denk aan een getal. Ik doe het keer 3, tel er 7 bij op en deel de uitkomst door 2. Ik kom uit op 14. Aan welk getal dacht ik?` | 7 |
| Money left over | `Je geeft de helft van je geld uit aan kleren. Daarna geef je € 6 uit aan een lunch. Je hebt nog € 9 over. Hoeveel geld had je eerst?` | € 30 |
| Money left over | `Je geeft € 6 uit aan een lunch. Daarna geef je de helft van wat je over hebt uit aan kleren. Je hebt nog € 9 over. Hoeveel geld had je eerst?` | € 24 |

- **Think of a number:** a start number in `[2, 20]` and 2 or 3 operations (50% each), each
  drawn from: `keer k` (`k ∈ [2, 5]`), `deel door k` (`k ∈ [2, 5]`, only when the value is
  divisible), `tel er k bij op` and `trek er k van af` (`k ∈ [1, 20]`). Two operations in a row
  are never of the same kind, and an operation never undoes the previous one (`× 3` then `: 3`,
  `+ 5` then `− 5`). Every intermediate value and the result are whole and in `[1, 200]`.
  - Phrases: the first operation `Ik doe het keer 3`, `Ik deel het door 2`, `Ik tel er 7 bij op`,
    `Ik trek er 5 van af`; later ones `doe de uitkomst keer 3`, `deel de uitkomst door 2`,
    `tel er 7 bij op`, `trek er 5 van af`. They are joined with `, ` and a final ` en `.
- **Money left over:** a start amount in `[12, 80]` and two expenses in either order (50%
  each): a part (`de helft` 50%, `een derde` 25%, `een kwart` 25%) and an amount in `[3, 15]`.
  The part is spent on `kleren`, `een cadeau` or `een spelletje`, the amount on `een lunch`,
  `een boek`, `een bioscoopkaartje` or `een tijdschrift`. Every amount is whole and the rest is
  at least € 1. A part spent second reads `van wat je over hebt`.
- Explanations, the operations undone from the last to the first:
  - `Terugrekenen vanaf 14: 14 × 2 = 28 → 28 − 7 = 21 → 21 : 3 = 7`
  - `Terugrekenen vanaf € 9: 9 + 6 = 15 → € 15 is de helft van wat je had → 15 × 2 = 30`
    (een derde: `€ 20 is 2/3 van wat je had → 20 : 2 × 3 = 30`; een kwart: `€ 15 is 3/4 van wat
    je had → 15 : 3 × 4 = 20`)
  - `Terugrekenen vanaf € 9: € 9 is de helft van wat je over had → 9 × 2 = 18 → 18 + 6 = 24`
- No tips.
- The de-duplication key is the form and the numbers and operations.

### 5.43 Guess and check (`guessAndCheck`)

There are two forms, each picked with equal probability:

| Form             | Example                                                                                                  | Answer |
|------------------|----------------------------------------------------------------------------------------------------------|--------|
| Two kinds        | `Op een boerderij lopen kippen en konijnen. Samen hebben ze 10 koppen en 28 poten. Hoeveel konijnen zijn er?` | 4  |
| Two kinds        | `In een stalling staan fietsen en driewielers, samen 12 stuks met 29 wielen. Hoeveel driewielers staan er?`   | 5  |
| Sum and difference | `Twee getallen zijn samen 50 en verschillen 14. Wat is het grootste getal?`                            | 32     |

- **Two kinds:** kippen (2 poten) and konijnen (4) on a boerderij, eenden (2 poten) and schapen
  (4) on a weide, fietsen (2 wielen) and driewielers (3) in a stalling, or motoren (2 wielen)
  and auto's (4) in a garage, 25% each. The total is in `[5, 20]`, each kind at least 1. Asks
  either kind, 50% each. The weide and garage texts mirror the boerderij and stalling ones
  (`Op een weide lopen eenden en schapen. Samen hebben ze 10 koppen en 28 poten.`, `In een
  garage staan motoren en auto's, samen 12 stuks met 34 wielen.`).
- **Sum and difference:** two whole numbers with an even sum in `[10, 200]` and a difference of
  at least 2, the smaller at least 1. Asks `het grootste` or `het kleinste getal`, 50% each.
- Explanations, by a first guess and its correction:
  - `Slim proberen: stel dat alle 10 dieren kippen zijn: 10 × 2 = 20 poten → 28 − 20 = 8 poten
    te weinig → elk konijn heeft 2 poten meer: 8 : 2 = 4 konijnen` (kippen asked: `… → 10 − 4 =
    6 kippen`)
  - `Slim proberen: stel dat alle 12 fietsen zijn: 12 × 2 = 24 wielen → 29 − 24 = 5 wielen te
    weinig → elke driewieler heeft 1 wiel meer: 5 driewielers` (the division is left out for a
    difference of 1)
  - `Slim proberen: 25 en 25 zijn samen 50 maar verschillen 0 → maak het ene getal 7 groter en
    het andere 7 kleiner: 32 en 18 verschillen 14 → 32` (kleinste: `… → 18`)
- Tips (§3.4.1): the other kind; the other number.
- The de-duplication key is the form, the context, the numbers and what is asked.

### 5.44 Simplify the problem (`simplifyProblem`)

There are three forms, each picked with equal probability:

| Form      | Example                                                                                                                  | Answer |
|-----------|--------------------------------------------------------------------------------------------------------------------------|--------|
| Gauss sum | `Wat is 1 + 2 + 3 + … + 40?`                                                                                             | 820    |
| Counting  | `Hoeveel getallen van 1 tot en met 100 zijn deelbaar door 7?`                                                           | 14     |
| Counting  | `Hoeveel getallen zijn er van 37 tot en met 82?`                                                                        | 46     |
| Counting  | `Langs een pad van 40 meter staat om de 5 meter een paaltje, ook aan het begin en aan het eind. Hoeveel paaltjes zijn dat?` | 9  |
| Figures   | `Vierkantjes van lucifers op een rij: figuur 1 heeft 4 lucifers, figuur 2 heeft 7 en figuur 3 heeft 10. Hoeveel lucifers heeft figuur 20?` | 61 |
| Figures   | `Vierkantjes van lucifers op een rij: figuur 1 heeft 4 lucifers, figuur 2 heeft 7 en figuur 3 heeft 10. Welke figuur heeft 61 lucifers?` | figuur 20 |

- **Gauss sum:** `1 + 2 + 3 + … + n` with `n` even in `[10, 50]` or `n ∈ {60, 70, 80, 90,
  100}`, uniformly from these 26 values. The answer is `n × (n + 1) : 2`.
- **Counting:** three kinds, each equally likely:
  - deelbaar: `1 tot en met N`, `N ∈ {50, 100, 200}`, divisor `d ∈ [3, 9]`; the answer is
    `N : d` rounded down
  - tot en met: `a ∈ [11, 99]`, `b − a ∈ [10, 150]`; the answer is `b − a + 1`
  - paaltjes: spacing `s ∈ {2, 4, 5, 10, 20, 25}` meter, `k ∈ [3, 20]` pieces, the path
    `s × k ≤ 500` meter; the answer is `k + 1`
- **Figures:** five patterns, each equally likely, described by their first three figures. The
  lucifer patterns are rows of regular polygons that share a side, so a k-gon has `k` lucifers
  in figure 1 and adds `k − 1` per figure:

  | Pattern                     | Values        | Rule      |
  |-----------------------------|---------------|-----------|
  | vierkantjes van lucifers    | 4, 7, 10      | `3n + 1`  |
  | driehoekjes van lucifers    | 3, 5, 7       | `2n + 1`  |
  | vijfhoekjes van lucifers    | 5, 9, 13      | `4n + 1`  |
  | zeshoekjes van lucifers     | 6, 11, 16     | `5n + 1`  |
  | tafels met stoelen          | 4, 6, 8       | `2n + 2`  |

  `n ∈ {10, 12, 15, 20, 25, 30, 50, 100}`. Asks the value of figure `n`, or the figure with a
  given value (50% each). The tafels pattern reads `Tafels staan in een rij tegen elkaar. Aan
  1 tafel passen 4 stoelen, aan 2 tafels 6 en aan 3 tafels 8.`, with the questions `Hoeveel
  stoelen passen er aan 15 tafels?` and `Hoeveel tafels heb je nodig voor 32 stoelen?`. The
  driehoekjes pattern reads like vierkantjes. A figure answer of the lucifer patterns has the
  prefix `figuur` (`figuur 20`); the tafels answer has none.
- Explanations:
  - `Vereenvoudigen: maak paren van de buitenste getallen: 1 + 40 = 41, 2 + 39 = 41, … → 40
    getallen zijn 20 paren van 41 → 20 × 41 = 820`
  - `Vereenvoudigen: 7 = 1 × 7, …, 98 = 14 × 7 en 15 × 7 = 105 is te groot → 14 getallen`
  - `Vereenvoudigen: van 1 tot en met 82 zijn 82 getallen; zonder 1 tot en met 36 blijven er
    82 − 36 = 46 over`
  - `Vereenvoudigen: een pad van 10 meter heeft 3 paaltjes, 1 meer dan de 2 stukken → 40 : 5 =
    8 stukken → 8 + 1 = 9 paaltjes` (the small case is a path of `2 × s`)
  - `Vereenvoudigen: elke figuur heeft 3 lucifers meer; van figuur 1 naar figuur 20 zijn 19
    stappen → 4 + 19 × 3 = 61` (tafels: `elke tafel geeft 2 stoelen meer; van 1 naar 15 tafels
    zijn 14 stappen → 4 + 14 × 2 = 32`)
  - `Vereenvoudigen: 61 − 4 = 57 lucifers meer dan figuur 1 → 57 : 3 = 19 stappen → figuur 1 +
    19 = figuur 20` (tafels: `32 − 4 = 28 stoelen meer dan bij 1 tafel → 28 : 2 = 14 stappen →
    1 + 14 = 15 tafels`)
- Tips (§3.4.1): Gauss, the pairs not halved; tot en met and paaltjes, the count without the
  `+ 1`; figure value, `n` steps instead of `n − 1`.
- The de-duplication key is the form, the kind or pattern and the numbers.

### Heuristieken v3 (§5.94–§5.97)

Four Verdieping topics; every answer is a whole `number` step. The explanation starts with the
name of the heuristic (§5.41–§5.44; the new `Schema maken:` for an unknown found with parts or
a table).

### 5.94 Counting with conditions (`countingCases`)

Verdieping. Label: `Systematisch tellen met voorwaarden`. Three forms, each equally likely:

| Form             | Example                                                                                                                  | Answer |
|------------------|--------------------------------------------------------------------------------------------------------------------------|--------|
| Codes, once      | `Hoeveel getallen van 3 cijfers kun je maken met de cijfers 1, 2, 3 en 4, als elk cijfer hoogstens één keer voorkomt?`   | 24     |
| Codes, repeating | `Een slot heeft een code van 3 cijfers uit 1, 2, 3, 4 en 5. Een cijfer mag vaker voorkomen. Hoeveel codes zijn er?`       | 125    |
| Together         | `Op hoeveel manieren kunnen 5 kinderen in een rij staan als Anna en Bram naast elkaar moeten staan?`                      | 48     |

- **Codes, once:** `s ∈ [4, 6]` digits `1` to `s`, length `k ∈ [2, 3]`; the answer
  `s × (s − 1) × …` (`k` factors).
- **Codes, repeating:** `s ∈ [3, 5]`, `k ∈ [2, 3]`; the answer `sᵏ`.
- **Together:** `n ∈ {4, 5}` children, two of them (Anna and Bram, or Chris and Dora, 50/50)
  next to each other; the answer `(n − 1)! × 2`.
- Explanations: `Systematisch tellen: 4 keuzes voor het 1e cijfer, 3 voor het 2e, 2 voor het
  3e → 4 × 3 × 2 = 24`; `5 keuzes voor elk van de 3 cijfers → 5 × 5 × 5 = 125`; `Anna en Bram
  samen zijn 1 blok → 4 dingen in een rij: 4 × 3 × 2 × 1 = 24 → het blok kan twee kanten op
  → 24 × 2 = 48`.
- The de-duplication key is the form and the numbers.

### 5.95 Working backwards, deeper (`backwardsProblems`)

Verdieping. Label: `Terugrekenen (lange reeks, in rondes)`. Two forms, 50/50:

| Form       | Example                                                                                                                  | Answer |
|------------|--------------------------------------------------------------------------------------------------------------------------|--------|
| Long chain | `Ik denk aan een getal. Ik trek er 4 van af, doe het keer 3, deel de uitkomst door 2 en tel er 9 bij op. Ik kom uit op 24. Aan welk getal dacht ik?` | 14 |
| Rounds     | `Een bakker verkoopt 's ochtends de helft van de broden en 's middags een derde van de rest. Er blijven 12 broden over. Hoeveel broden waren het eerst?` | 36 |

- **Long chain:** the think-of-a-number form of §5.42 with 4 operations (same operation
  kinds, phrases and rules); the start in `[2, 20]`, every intermediate value and the result
  whole and in `[1, 300]`. Reuse the operation drawing and the phrases of §5.42.
- **Rounds:** a part `p₁` sold in the morning and a part `p₂` of the rest in the afternoon,
  each from `{de helft, een derde, een kwart}`; `L ∈ [4, 20]` left over; the start
  `L : ((1 − p₁)(1 − p₂))` is whole and at most 120, and so is the stock after the first round.
  Contexts, each equally likely: `Een bakker … broden`, `Een kraam … appels`, `Een kassa …
  kaartjes` (`verkoopt 's ochtends …` in all three).
- Explanations: `Terugrekenen vanaf 24: 24 − 9 = 15 → 15 × 2 = 30 → 30 : 3 = 10 → 10 + 4 = 14`;
  `Terugrekenen vanaf 12: na de middag is 2/3 over → 12 : 2 × 3 = 18 → na de ochtend is 1/2
  over → 18 × 2 = 36` (een kwart: `3/4 over → … : 3 × 4`; de helft: `1/2 over → … × 2`).
- The de-duplication key is the form and the numbers and operations.

### 5.96 Two unknowns (`twoUnknowns`)

Verdieping. Label: `Twee onbekenden (leeftijden, munten, rechthoek)`. Three forms, each equally likely:

| Form      | Example                                                                                              | Answer | Suffix |
|-----------|------------------------------------------------------------------------------------------------------|--------|--------|
| Ages      | `Een vader is 4 keer zo oud als zijn zoon. Samen zijn ze 50 jaar. Hoe oud is de zoon?`                | 10     | `jaar` |
| Coins     | `Je hebt 12 munten van € 1 en € 2, samen € 20. Hoeveel munten van € 2 heb je?`                        | 8      | —      |
| Rectangle | `Een rechthoek heeft een omtrek van 36 cm. De lengte is 2 keer de breedte. Hoe groot is de oppervlakte?` | 72  | `cm²`  |

- **Ages:** factor `f ∈ {2, 3, 4, 5}`, the smaller age `s ∈ [4, 20]`, the sum `(f + 1)s` at
  most 90; vader/zoon or moeder/dochter (50/50); asks the younger or the older (50/50). With
  `f = 2` the text reads `2 keer zo oud`, as for the other factors.
- **Coins:** two kinds from `€ 1 en € 2` or `50 cent en € 1` (50/50); a total count in
  `[6, 15]`, each kind at least 1; the total value is given (`€ 8,50` as §8); asks one of the
  two kinds (50/50).
- **Rectangle:** the length is `k` times the width (`k ∈ {2, 3}`, width `[2, 12]`) or `d`
  cm longer (`d ∈ [2, 8]`, width `[3, 15]`), 50/50; asks the area.
- Explanations: `Schema maken: zoon 1 deel, vader 4 delen → samen 5 delen = 50 → 1 deel = 10 →
  de zoon is 10 jaar`; `Slim proberen: stel dat alle 12 munten € 1 zijn: 12 × 1 = € 12 → 20 −
  12 = € 8 te weinig → elke munt van € 2 is € 1 meer: 8 : 1 = 8` (the division by 1 is left
  out; for 50 cent and € 1: `… elke euro is € 0,50 meer: 2 : 0,50 = 4`); `Schema maken: halve
  omtrek 36 : 2 = 18 = lengte + breedte → 2 + 1 = 3 delen → 18 : 3 = 6 = breedte, lengte 12 →
  12 × 6 = 72` (the `d` cm longer variant: `18 − d = 2 × breedte → …`).
- The de-duplication key is the form, the variant and the numbers.

### 5.97 Simplify the problem, deeper (`simplifyDeep`)

Verdieping. Label: `Vereenvoudigen (reeks optellen, bladzijden nummeren)`. Three forms, each equally likely:

| Form      | Example                                                                           | Answer |
|-----------|-----------------------------------------------------------------------------------|--------|
| Range sum | `Wat is 11 + 12 + 13 + … + 30?`                                                    | 410    |
| Odd sum   | `Wat is 1 + 3 + 5 + … + 39?`                                                       | 400    |
| Pages     | `Hoeveel cijfers heb je nodig om de bladzijden 1 tot en met 120 te nummeren?`      | 252    |

- **Range sum:** `a ∈ [2, 30]` to `b` with an even number of terms in `[8, 30]`; the answer
  `(a + b) × aantal : 2` at most 1500 (redraw otherwise).
- **Odd sum:** `1 + 3 + … + (2n − 1)`, `n ∈ [10, 30]`; the answer `n × n`.
- **Pages:** `N ∈ {25, 40, 60, 80, 100, 120, 150, 180}`; `9 + 2 × (N − 9)` up to 99, else
  `189 + 3 × (N − 99)`.
- Explanations: `Vereenvoudigen: maak paren van de buitenste getallen: 11 + 30 = 41, 12 + 29 =
  41, … → 20 getallen zijn 10 paren van 41 → 10 × 41 = 410`; `Vereenvoudigen: 1 = 1 × 1, 1 + 3 =
  4 = 2 × 2, 1 + 3 + 5 = 9 = 3 × 3 → n getallen geven n × n; 39 is het 20e oneven getal → 20 ×
  20 = 400`; `Vereenvoudigen: 1 t/m 9: 9 × 1 = 9 cijfers → 10 t/m 99: 90 × 2 = 180 → 100 t/m 120: 21
  × 3 = 63 → 9 + 180 + 63 = 252` (up to 99 the last part is left out).
- The de-duplication key is the form and the numbers.
