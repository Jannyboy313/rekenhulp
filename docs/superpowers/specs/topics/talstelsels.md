# Talstelsels: topics

Part of the design spec (`../2026-10-05-rekenhulp-design.md`, §5). The § numbers are those of the
spec; its §5 holds the index and the rules shared by several sets.

### Talstelsels (§5.39–§5.40)

The set Talstelsels (v2, LKT). Its card (§3.1) reads "Tweetallig (binair), vijftallig, zestientallig
(hexadecimaal) en Romeinse cijfers", and the topic label "Talstelsels (tweetallig/binair, vijftallig,
zestientallig/hexadecimaal)". Every prompt is question text (§3.3): a sentence without a slot. An answer
that is a plain number is a `number` step; an answer in another number system is typed with a
letter keypad, `baseDigits` or `roman` (§6).

### 5.39 Number systems (`numberSystems`)

Base 2, 5 or 16, each equally likely, and a direction, each 50%:

| Direction     | Example                                              | Answer | Kind         |
|---------------|------------------------------------------------------|--------|--------------|
| To decimal    | `Schrijf het tweetallige getal 1011 als gewoon getal.` | 11   | `number`     |
| From decimal  | `Schrijf 11 in het tweetallig stelsel.`               | 1011   | `baseDigits` |
| To decimal    | `Schrijf het vijftallige getal 243 als gewoon getal.` | 73     | `number`     |
| From decimal  | `Schrijf 180 in het zestientallig stelsel.`           | B4     | `baseDigits` |

- Names: `tweetallig`/`tweetallige`, `vijftallig`/`vijftallige`, `zestientallig`/
  `zestientallige`.
- Values: base 2 in `[5, 63]` (3–6 digits), base 5 in `[6, 124]` (2–3 digits), base 16 in
  `[26, 255]` (2 digits) with at least one letter `A`–`F` among its digits.
- Digits above 9 are the capitals `A`–`F`.
- A `baseDigits` answer is correct when it equals the expected digits after leading zeros are
  removed (`01011` is correct for `1011`). A digit that does not exist in the base (`2` in a
  tweetallig answer) is simply wrong. No tips: the explanation shows the place values.
- Explanations, by place value; terms with digit 0 are left out of the middle part:
  - to decimal: `1 × 8 + 0 × 4 + 1 × 2 + 1 × 1 = 8 + 2 + 1 = 11`,
    `2 × 25 + 4 × 5 + 3 × 1 = 50 + 20 + 3 = 73`, `B = 11: 11 × 16 + 4 × 1 = 176 + 4 = 180`
    (each letter digit is named first: `A = 10, F = 15: …`)
  - from decimal: `11 = 8 + 2 + 1 = 1 × 8 + 0 × 4 + 1 × 2 + 1 × 1 → 1011`,
    `73 = 2 × 25 + 4 × 5 + 3 × 1 → 243`, `180 = 11 × 16 + 4 × 1 en B = 11 → B4`
  - with only one non-zero digit, the middle part (and the binary sum) is left out:
    `1 × 8 + 0 × 4 + 0 × 2 + 0 × 1 = 8`, `32 = 1 × 32 + 0 × 16 + … + 0 × 1 → 100000`
- The de-duplication key is the direction, the base and the value.

### 5.40 Roman numerals (`romanNumerals`)

A direction, each 50%:

| Direction     | Example                              | Answer  | Kind     |
|---------------|--------------------------------------|---------|----------|
| To decimal    | `Schrijf MCMXCIV als gewoon getal.`  | 1994    | `number` |
| From decimal  | `Schrijf 1994 met Romeinse cijfers.` | MCMXCIV | `roman`  |

- Symbols `I V X L C D M` (1, 5, 10, 50, 100, 500, 1000) with the subtractive pairs `IV`, `IX`,
  `XL`, `XC`, `CD` and `CM`; at most three equal symbols in a row. Every number has one
  canonical numeral, per decimal place from high to low.
- Values: 50% in `[1, 100]`, 50% a year in `[1000, 2030]`. The numeral always contains at least
  one subtractive pair (redraw otherwise).
- A `roman` answer is correct only when it is the canonical numeral. Any string of the symbols
  is valid input; there is no inline error.
- Explanations, per group (the symbols of one decimal place):
  - to decimal: `MCMXCIV = M + CM + XC + IV = 1000 + 900 + 90 + 4 = 1994`; one group: `IX = 9`
  - from decimal: `1994 = 1000 + 900 + 90 + 4 = M + CM + XC + IV → MCMXCIV`; one group:
    `9 = IX`
- Tips (§3.4.1): from decimal, an input of symbols in non-increasing order (no subtractive pair)
  whose sum equals the answer; to decimal, the sum of all symbols of the numeral.
- The de-duplication key is the direction and the value.

### Talstelsels v3 (§5.90–§5.93)

Four Verdieping topics; the answers are `number`, `baseDigits` or `roman` steps (§6), with the
input and checking rules of §5.39–§5.40 (leading zeros are allowed in a `baseDigits` answer;
a `roman` answer is correct only when it is the canonical numeral). The base names are those of
§5.39.

### 5.90 Calculating in other bases (`baseArithmetic`)

Verdieping. Label: `Rekenen in een ander talstelsel`. Two forms, 50/50, the answer a `baseDigits` step in
the same base:

| Form       | Example                                                                           | Answer |
|------------|-----------------------------------------------------------------------------------|--------|
| Sum        | `Tel op in het tweetallig stelsel: 101 + 11. Schrijf je antwoord ook tweetallig.` | 1000   |
| Times base | `Vermenigvuldig in het vijftallig stelsel: 243 × 10. Schrijf je antwoord ook vijftallig.` | 2430 |

- **Sum:** base 2 (50%) with both terms in `[3, 31]` (decimal values) and base 5 with both in
  `[6, 60]`; the sum at most 63 (base 2) or 124 (base 5); at least one carry in the column
  addition; the two terms differ.
- **Times base:** `× 10` in base 2 or 5 (50% each); the numeral has 2 or 3 digits (value in
  `[3, 7]`, resp. `[6, 124]`). `10` is the base itself, so every digit moves up one place.
- Explanations: `tweetallig → gewoon getal: 101 = 5 en 11 = 3 → 5 + 3 = 8 → 8 = 1 × 8 + 0 × 4 +
  0 × 2 + 0 × 1 → 1000`; `× 10 in het vijftallig stelsel is × 5: elk cijfer schuift een plaats
  op → 243 wordt 2430`.
- The de-duplication key is the form, the base and the numbers.

### 5.91 Understanding number systems (`baseReasoning`)

Verdieping. Label: `Talstelsels begrijpen (grootste getal, aantal cijfers, plaatswaarde)`. Three
forms, each equally likely, all `number` answers (as a plain number):

| Form        | Example                                                                                                              | Answer |
|-------------|----------------------------------------------------------------------------------------------------------------------|--------|
| Largest     | `Wat is het grootste getal dat je met 4 cijfers in het tweetallig stelsel kunt schrijven? Geef je antwoord als gewoon getal.` | 15 |
| Digits      | `Hoeveel cijfers heeft het getal 100 in het tweetallig stelsel?`                                                      | 7      |
| Place value | `Wat is de waarde van het eerste cijfer in het vijftallige getal 213? Geef je antwoord als gewoon getal.`             | 50     |

- **Largest:** base 2 with `k ∈ [3, 8]` digits (`2ᵏ − 1`), base 5 with `k ∈ [2, 4]` (`5ᵏ − 1`)
  or base 16 with `k = 2` (255); each base equally likely.
- **Digits:** the number of digits of a decimal number: base 2 for `N ∈ [10, 255]`, base 5 for
  `N ∈ [26, 624]`, base 16 for `N ∈ [200, 4000]`; each base equally likely. A hexadecimal count is
  the number of hexadecimal digits.
- **Place value:** base 5 and base 16: a numeral of 3 digits with its first digit `d ≠ 0`
  (base 5: `d ∈ [1, 4]`, base 16: `d ∈ [1, 9]`); the value of `d` at its place. The base 16
  numeral contains a letter in its other digits and is written as `3A7`. Base 2: a numeral of 4
  digits; the asked digit is a `1` that is not the first (`Wat is de waarde van het derde cijfer
  in het tweetallige getal 1011?` → 2), so the answer is 1, 2 or 4.
- Explanations: `1111 = 8 + 4 + 2 + 1 = 15, of 2⁴ − 1 = 16 − 1 = 15`; `64 = 2⁶ en 128 = 2⁷ →
  100 zit tussen 64 en 128 → 7 cijfers`; `het eerste van 3 cijfers staat op de plaats van 5 × 5 =
  25 → 2 × 25 = 50`; `het derde van 4 cijfers staat op de plaats van 2 → 1 × 2 = 2`.
- The de-duplication key is the form, the base and the numbers (for base 2 also the asked
  position).

### 5.92 Binary and hexadecimal (`hexBinary`)

Verdieping. Label: `Tweetallig ↔ zestientallig (groepjes van vier)`. A direction, each 50%, the answer a
`baseDigits` step:

| Direction | Example                                                                | Answer |
|-----------|------------------------------------------------------------------------|--------|
| To hex    | `Schrijf het tweetallige getal 10110111 in het zestientallig stelsel.` | B7     |
| To binary | `Schrijf het zestientallige getal 3E in het tweetallig stelsel.`       | 111110 |

- A value in `[32, 255]` whose hexadecimal numeral contains at least one letter `A`–`F`. The
  binary numeral is shown without leading zeros (6 to 8 digits).
- Explanations: `groepjes van 4 vanaf rechts: 1011 | 0111 → 1011 = 11 = B en 0111 = 7 → B7`
  (a short numeral is padded on the left: `0011 | 1110`); `3 = 0011 en E = 14 = 1110 → 0011
  1110 → 111110`.
- The de-duplication key is the direction and the value.

### 5.93 Calculating with Roman numerals (`romanCalc`)

Verdieping. Label: `Rekenen met Romeinse cijfers`. Three forms, each equally likely:

| Form       | Example                                                          | Answer | Kind     |
|------------|------------------------------------------------------------------|--------|----------|
| Sum        | `Tel op: XIV + XXVIII. Schrijf je antwoord met Romeinse cijfers.`  | XLII   | `roman`  |
| Difference | `Trek af: XLII − XVIII. Schrijf je antwoord met Romeinse cijfers.` | XXIV   | `roman`  |
| Years      | `Hoeveel jaar zit er tussen MCMXLV en MMXXV?`                    | 80     | `number` (suffix `jaar`) |

- **Sum:** `a ≠ b` in `[10, 99]`; **Difference:** `a ∈ [20, 99]`, `b ∈ [10, a − 5]`. In both,
  at least one of the three numerals contains a subtractive pair (§5.40), redraw otherwise.
- **Years:** a first year in `[1400, 1999]` and a second year `d ∈ [10, 120]` later, at most
  2030; the gap in years.
- Explanations: `XIV = 14 en XXVIII = 28 → 14 + 28 = 42 = 40 + 2 = XL + II → XLII`;
  `MCMXLV = 1945 en MMXXV = 2025 → 2025 − 1945 = 80`.
- The de-duplication key is the form and the numbers.
