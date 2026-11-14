# Meten: topics

Part of the design spec (`../2026-10-05-rekenhulp-design.md`, §5). The § numbers are those of the
spec; its §5 holds the index and the rules shared by several sets.

### 5.10 Measurement (`volume`, `area`, `length`, `mass`, `time`)

There is one shared conversion engine (`topics/measurement.ts`) with one topic per dimension.
The exercise is always a conversion, e.g. `3,5 L = ? cm³`. The target unit is also shown as the
input suffix (§6).

| Topic    | Units                                          | Steps                                                  |
|----------|------------------------------------------------|--------------------------------------------------------|
| `volume` | `ml, cl, dl, L, hl, kl` and `mm³, cm³, dm³, m³`, plus `cc` (= cm³) and `kuub` (= m³) | capacity ×10 (`1 hl = 100 L`); cubic ×1000; links `1 cm³ = 1 ml`, `1 dm³ = 1 L`, `1 m³ = 1000 L`, `1 kl = 1 m³` |
| `area`   | `mm², cm², dm², m², are, ha, km²`, plus `ca` (= m²) | ×100 (`are = dam²`, `ha = hm²`)                   |
| `length` | `mm, cm, dm, m, dam, hm, km`                   | ×10                                                    |
| `mass`   | `mg, g, kg, ton`                               | ×1000                                                  |
| `time`   | `s, min, uur, dag`                             | ×60, ×60, ×24                                          |

Value rules for metric dimensions:

- Unit pairs: any two different units of the dimension whose sizes differ by at most a factor
  10⁶, in both directions. So `m³ ↔ cm³` occurs, `m³ ↔ mm³` (10⁹) does not. Within `volume`,
  capacity and cubic units mix freely. Of the pairs with factor 1, only the links occur:
  `ml ↔ cm³`, `cc ↔ cm³`, `L ↔ dm³`, `kl ↔ m³`, `kuub ↔ m³` and `ca ↔ m²`; `cc ↔ ml` and
  `kuub ↔ kl` are left out.
- The units `dam`, `hm`, `kl`, `cc`, `kuub` and `ca` were added in v3 (RWT C.2, §12.3). `km³` is
  not converted (every other unit is more than 10⁶ away); it only occurs in `measureSense`
  (§5.48). `cc` and `kuub` count as cubic units for the tips (§3.4.1).
- The source value has 1 to 3 significant digits.
- The source value and the answer both lie in `[0,001; 10 000 000]` and have at most 3
  decimals. Because every factor is a power of 10, the answer also has at most 3 significant
  digits.

Value rules for `time`:

- Unit pairs: `s ↔ min`, `min ↔ uur`, `uur ↔ dag`, `s ↔ uur` and `min ↔ dag`, in both
  directions. `s ↔ dag` (factor 86 400) is left out.
- The value in the larger unit is at most 100 and is a whole number, a half, a quarter, or a
  number of tenths such as 0,2 or 0,7 (these four groups equally likely; a group without values
  for the pair, such as tenths for `uur ↔ dag`, is left out). The value in the smaller unit is
  a whole number of at most 10 000. As a result both values have at most 2 decimals, e.g.
  `135 min = 2,25 uur` or `3,5 dag = 84 uur`.
- Prompts never contain mixed notation such as `1 uur 45 min`.

Explanation on error: the conversion fact, followed by the calculation:

- `1 L = 1000 cm³ → 3,5 × 1000 = 3500`
- `1 uur = 60 min → 135 : 60 = 2,25`
- for factor-1 links only the fact: `1 dm³ = 1 L`, `1 kuub = 1 m³`

General rules:

- Arithmetic is exact (`lib/rational.ts`), with no floats.
- Accepted input:
  - `0,25`, `,25` and `0,250` are all accepted
  - `−` is accepted
  - a leading zero is optional

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

There are five forms, each picked with equal probability:

| Form           | Example                                    | Answer |
|----------------|--------------------------------------------|--------|
| Name → power   | `1 biljard = 10ⁿ. n = ?`                   | 15     |
|                | `250 miljoen = 2,5 × 10ⁿ. n = ?`           | 8      |
| Name ↔ name    | `3,5 biljoen = ? miljard`                  | 3500   |
| Power → name   | `2,5 × 10⁹ = ? miljoen`                    | 2500   |
| Name ↔ number  | `10,6 miljoen = ?`                         | 10 600 000 |
|                | `6 500 000 = ? miljoen`                    | 6,5    |
| Money (ton)    | `Een huis kost 3,5 ton. Hoeveel euro is dat?` | € 350 000 |
|                | `Een huis kost € 450 000. Hoeveel ton is dat?` | 4,5 ton |

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
- **Name ↔ number** (v3, RWT A.1): writing a number with a name in full, and back. Only
  `miljoen` and `miljard` (A.1 goes up to a miljard). The value with the name has 1 to 3
  significant digits, lies in `[1; 999]` and has at most 2 decimals (`10,6 miljoen`,
  `2,75 miljard`). The full number is shown with thousands separators (§8) and typed without
  them. Both directions, 50/50.
- **Money (ton)** (v3, RWT C.2): `1 ton = € 100 000`. Two contexts, each equally likely: `huis`
  (`Een huis kost 3,5 ton.`), with 2 to 8 ton in halves, and `winst` (`Een bedrijf maakt 1,2 ton
  winst.`), with 0,5 to 9,9 ton in tenths. Both directions, 50/50: the euro answer has the `€`
  prefix, the ton answer the suffix `ton`.
- Explanation on error:
  - name ↔ number: `1 miljoen = 1 000 000 → 10,6 × 1 000 000 = 10 600 000`, and
    `… → 6 500 000 : 1 000 000 = 6,5`
  - money: `1 ton = € 100 000 → 3,5 × 100 000 = 350 000`, and `… → 450 000 : 100 000 = 4,5`
  - name → power: `1 miljard = 1000 miljoen = 10⁹`, `1 duizend = 1000 = 10³`,
    `250 miljoen = 2,5 × 10² × 10⁶ = 2,5 × 10⁸`, `7 miljard = 7 × 10⁹`
  - name ↔ name: as in §5.10, `1 biljoen = 1000 miljard → 3,5 × 1000 = 3500`
  - power → name: `10⁹ = 1000 miljoen → 2,5 × 1000 = 2500`, or `10⁵ = 0,1 miljoen → 2,5 × 0,1 = 0,25`

### 5.26 Speed (`speed`)

Part of the set Meten (v2). Its own module `topics/speed.ts`: km/u ↔ m/s has the factor 3,6,
which fits neither the decimal scales nor the integer factors of the conversion engine (§5.10).

There are four forms, each picked with equal probability:

| Form       | Example                                         | Answer | Suffix |
|------------|-------------------------------------------------|--------|--------|
| Speed      | `Je fietst 6 km in 20 min. Hoe snel is dat?`    | 18     | `km/u` |
| Distance   | `Een auto rijdt 80 km/u. Hoeveel km rijdt de auto in 45 min?` | 60 | `km` |
| Time       | `Je wandelt 5 km/u. Hoe lang doe je over 2 km?` | 24     | `min`  |
| Conversion | `72 km/u = ? m/s`, `15 m/s = ? km/u`            | 20, 54 | `m/s`, `km/u` |

- **Contexts** (speed, distance and time), each equally likely, with their speeds and the
  largest distance. Within a context the speed is picked with equal probability, then a time or
  distance that fits it:

  | Context  | Speeds (km/u)                    | Distance   | Prompts |
  |----------|----------------------------------|------------|---------|
  | wandelen | 4, 5, 6                          | ≤ 20 km    | `Je wandelt 3 km in 45 min. Hoe snel is dat?`, `Je wandelt 5 km/u. Hoeveel km loop je in 45 min?`, `Je wandelt 5 km/u. Hoe lang doe je over 2 km?` |
  | fietsen  | 12, 15, 16, 18, 20, 24           | ≤ 80 km    | `Je fietst …`, `Je fietst 18 km/u. Hoeveel km fiets je in 40 min?`, `Je fietst 18 km/u. Hoe lang doe je over 12 km?` |
  | auto     | 30, 50, 60, 80, 90, 100, 120     | ≤ 400 km   | `Een auto rijdt 60 km in 45 min. Hoe snel is dat?`, `Een auto rijdt 80 km/u. Hoeveel km rijdt de auto in 45 min?`, `Een auto rijdt 80 km/u. Hoe lang doet de auto over 60 km?` |
  | trein    | 80, 100, 120, 150                | ≤ 500 km   | as auto, with `trein` |

- **Times** in the prompt: in `min` from `{10, 12, 15, 20, 30, 40, 45}` or in `uur` from
  `{1,5; 2; 2,5; 3; 4}`. Never mixed notation such as `1 uur 45 min` (§5.10).
- **Distances** are at least 0,5 km and whole or with 1 decimal.
- **Speed and distance:** the speed comes from the context, the time from the list above, the
  distance is speed × time. Every value in the ratio table of the explanation has at most 1
  decimal, so `5 km/u in 10 min` (0,83 km) does not occur.
- **Time:** the speed comes from the context and the distance is a whole number of km. The time
  is a whole number of minutes in `[5, 59]`, asked in `min`, or one of the hour values above,
  asked in `uur`. The step value of the table is a whole number of minutes, or of half hours.
- **Conversion:** the speed in m/s is a multiple of 5 in `[5, 40]`, so km/u is 18, 36, …, 144.
  The direction is 50/50.
- Explanation: a ratio table, with one step via the greatest common divisor where needed. A
  step equal to the first or last row is left out.
  - speed: `20 min → 6 km, 60 min → 18 km`, `45 min → 3 km, 15 min → 1 km, 60 min → 4 km`,
    `2,5 uur → 50 km, 0,5 uur → 10 km, 1 uur → 20 km`, `2 uur → 40 km, 1 uur → 20 km`
  - distance: `60 min → 80 km, 15 min → 20 km, 45 min → 60 km`,
    `1 uur → 120 km, 0,5 uur → 60 km, 2,5 uur → 300 km`
  - time: `5 km → 60 min, 1 km → 12 min, 2 km → 24 min`,
    `120 km → 1 uur, 60 km → 0,5 uur, 300 km → 2,5 uur` (the step `gcd(speed, distance)` km)
  - conversion: `1 m/s = 3600 m/u = 3,6 km/u → 20 × 3,6 = 72`, and `… → 72 : 3,6 = 20`
- The de-duplication key is the form, the context and the numbers.
- With `speed`, the description of Meten on its card (§3.1) becomes "Eenheden, grote getallen
  en snelheid".

### Meten v3 (§5.45–§5.52)

The v3 step of the set Meten (§12.2 step 4): its RWT gaps (§12.3) and its Verdieping. Opfrisser
gets four new topics (§5.45–§5.48) next to the new units of §5.10 and the new forms of §5.14;
Verdieping has four topics of its own (§5.49–§5.52, §4.1). The card description (§3.1) becomes
"Eenheden, klok, grote getallen en snelheid".

- Multiple-choice forms use the `choice` answer kind (§6): four options, no kladblok, no tip.
- The new topics have no topic tips (§3.4.1); number steps keep the factor-of-ten fallback.
- Times of day are written `H:MM` in 24-hour notation without a leading zero for the hour, as in
  the Cito examples: `8:20`, `19:35`, `0:05`.
- The de-duplication key of every new topic is the form, the variant or context and the numbers
  (for fixed lists: the item).

### 5.45 Calendar units (`calendar`)

Opfrisser (RWT C.2). Conversions between time units of a day and longer, written like §5.10:
`3 eeuwen = ? jaar`, the target unit as the suffix. Label: `Kalender (etmaal t/m millennium)`.

| Pair                  | Factor | Pair                  | Factor |
|-----------------------|--------|-----------------------|--------|
| etmaal → uur          | 24     | decennium → jaar      | 10     |
| week → dag            | 7      | decennium → lustrum   | 2      |
| jaar → maand          | 12     | eeuw → jaar           | 100    |
| jaar → kwartaal       | 4      | eeuw → decennium      | 10     |
| kwartaal → maand      | 3      | millennium → jaar     | 1000   |
| lustrum → jaar        | 5      | millennium → eeuw     | 10     |

- The pair is picked uniformly, the direction 50/50. The value in the larger unit is a whole
  number in `[2, 12]`; the value in the smaller unit is that times the factor.
- `maand ↔ dag`, `jaar ↔ week` and `jaar ↔ dag` are left out: they have no exact factor.
- Both values are at least 2, so units are plural: `etmalen`, `weken`, `dagen`, `maanden`,
  `kwartalen`, `lustra`, `decennia`, `eeuwen`, `millennia`; `jaar` and `uur` stay as they are.
- Explanation as §5.10, with the singular in the fact: `1 eeuw = 100 jaar → 3 × 100 = 300`,
  `1 jaar = 12 maanden → 36 : 12 = 3`.

### 5.46 Data size (`dataSize`)

Opfrisser (RWT C.2). `kB`, `MB`, `GB` and `TB`, each step **×1024** (the user's choice; the
explanation names the factor). Written like §5.10: `3 GB = ? MB`. Label:
`Geheugen (kB t/m TB)`.

- Only neighbouring units (`kB ↔ MB`, `MB ↔ GB`, `GB ↔ TB`), picked uniformly, the direction
  50/50.
- The value in the larger unit is one of `0,25; 0,5; 1; 1,5; 2; 3; 4; 8`, so the value in the
  smaller unit is one of `256; 512; 1024; 1536; 2048; 3072; 4096; 8192`: doable without a
  calculator.
- Explanation: `1 GB = 1024 MB → 3 × 1024 = 3072`, `1 GB = 1024 MB → 512 : 1024 = 0,5`.

### 5.47 Clock (`clock`)

Opfrisser (RWT C.9). Label: `Klok (kijken en tijdsduur)`. There are three forms, each picked
with equal probability:

| Form             | Example                                       | Answer                         |
|------------------|-----------------------------------------------|--------------------------------|
| Words → digital  | `Hoe laat is tien voor half 9 's avonds?`     | `20:20` (multiple choice)      |
| Digital → words  | `Hoe zeg je 19:35?`                           | `vijf over half 8 's avonds` (multiple choice) |
| Elapsed time     | `Van 9:45 tot 10:20. Hoeveel minuten is dat?` | 35, suffix `min`               |

- **Spoken time.** Minutes are a multiple of 5. With `h` the hour on a 12-hour clock (1–12)
  and `h + 1` the next one: `:00` `h uur`, `:05` `vijf over h`, `:10` `tien over h`, `:15`
  `kwart over h`, `:20` `tien voor half h+1`, `:25` `vijf voor half h+1`, `:30` `half h+1`,
  `:35` `vijf over half h+1`, `:40` `tien over half h+1`, `:45` `kwart voor h+1`, `:50`
  `tien voor h+1`, `:55` `vijf voor h+1`. Hours are digits, as in the Cito examples
  (`tien voor half 9`, `vijf over 12`).
- **Part of the day**, from the 24-hour time: `'s nachts` 0:00–5:59, `'s ochtends` 6:00–11:59,
  `'s middags` 12:00–17:59, `'s avonds` 18:00–23:59. Times from `:20` up to the next boundary
  (5:20–5:55, 11:20–11:55, 17:20–17:55, 23:20–23:55) are left out: their spoken hour lies in
  the next part of the day.
- **Words → digital:** the options are four 24-hour times in chronological order (from 0:00):
  the answer, the same time 12 hours off (`8:20`), the answer + 1 hour (for a `half` phrase this
  is `half 9` read as 9:30, so 21:20), and the mirror voor ↔ over (`tien over half 9`, 20:40).
  When the mirror gives no new time (`:00`, `:30`), it is replaced by the answer − 1 hour.
- **Digital → words:** the options are four phrases in random order: the answer, the phrase with
  the spoken hour one lower (`vijf over half 7`), the mirror voor ↔ over (`vijf voor half 8`),
  and the answer with the part of the day of the time 12 hours off (`'s ochtends`). For `:00`
  and `:30` the mirror is replaced by the phrase with the spoken hour one higher.
- **Elapsed time:** the start is a multiple of 5 minutes in `[6:00, 22:00]`; the duration is a
  multiple of 5 in `[10, 95]` minutes and passes at least one full hour; the end is on the same
  day.
- Explanations:
  - words → digital: `tien voor half 9 = 8:20 → 's avonds is dat 20:20`, `'s ochtends`: only
    `tien voor half 9 = 8:20`; `vijf over 12 's nachts = 0:05`
  - digital → words: `19:35 = 7:35 → vijf over half 8 's avonds`
  - elapsed: `9:45 → 10:00 is 15 min, 10:00 → 10:20 is 20 min → 15 + 20 = 35` (with whole
    hours in between: `…, 10:00 → 11:00 is 60 min, …`)

### 5.48 Measure sense (`measureSense`)

Opfrisser (RWT 0.1, 0.2, C.2, and C.1 for grootheid and eenheid), all multiple choice. Label:
`Maatgevoel (referenties, meetinstrumenten, eenheden, grootheden)`. There are five forms, each
picked with equal probability:

| Form       | Example                                  | Answer                            |
|------------|------------------------------------------|-----------------------------------|
| Reference  | `Hoe hoog is een deur ongeveer?`         | `2 m`                             |
| Instrument | `Waarmee meet je de lengte van een potlood?` | `liniaal`                     |
| Unit       | `In een drinkglas past ongeveer 200 ?.`  | `ml`                              |
| Ordering   | `Welke rij staat van klein naar groot?`  | `5,2 mm – 76 cm – 2 m – 104 dm`   |
| Quantity   | `Bij welke grootheid hoort de eenheid liter?` | `inhoud`                     |

- **Reference** (0.2): the nine Cito references, each with fixed options in ascending order:

  | Prompt                                                    | Options (answer in bold)                     |
  |-----------------------------------------------------------|----------------------------------------------|
  | `Hoeveel drinken zit er ongeveer in een drinkpak?`        | 100 ml, **1 L**, 5 L, 10 L                   |
  | `Hoe lang is een volwassene ongeveer?`                    | 80 cm, **1,80 m**, 2,50 m, 18 m              |
  | `Hoe hoog is een deur ongeveer?`                          | 1 m, **2 m**, 4 m, 20 m                      |
  | `Hoe hoog is één woonlaag van een huis ongeveer?`         | 1 m, **3 m**, 10 m, 30 m                     |
  | `Hoe lang is een stap ongeveer?`                          | 10 cm, **1 m**, 3 m, 10 m                    |
  | `Hoe snel wandel je ongeveer?`                            | 1 km/u, **5 km/u**, 17 km/u, 50 km/u         |
  | `Hoe zwaar is 1 liter water ongeveer?`                    | 1 g, 100 g, **1 kg**, 10 kg                  |
  | `Hoe snel fiets je ongeveer op een gewone fiets?`         | 5 km/u, **17 km/u**, 45 km/u, 100 km/u       |
  | `Hoeveel inwoners heeft Nederland ongeveer?`              | 1,8 miljoen, **18 miljoen**, 180 miljoen, 1,8 miljard |

- **Instrument** (0.1): `Waarmee meet je …?` with four instruments from `liniaal`, `meetlint`,
  `maatbeker`, `weegschaal`, `stopwatch`, `snelheidsmeter` and `thermometer`. The distractors
  are three random instruments other than the answer and its excluded neighbour; options in
  random order.

  | `Waarmee meet je …`                       | Answer          | Never a distractor |
  |-------------------------------------------|-----------------|--------------------|
  | `de lengte van een potlood`               | liniaal         | meetlint           |
  | `de breedte van een kamer`                | meetlint        | liniaal            |
  | `250 ml melk voor een recept`             | maatbeker       | weegschaal         |
  | `200 gram bloem voor een taart`           | weegschaal      | maatbeker          |
  | `hoe zwaar je bent`                       | weegschaal      | —                  |
  | `hoe lang je over 100 meter hardlopen doet` | stopwatch     | —                  |
  | `hoe hard een auto rijdt`                 | snelheidsmeter  | —                  |
  | `hoe warm het buiten is`                  | thermometer     | —                  |

- **Unit** (C.2, the most suitable unit): the prompt has a slot for the unit, which shows the
  chosen option (§3.4). Fixed items, options in ascending order of size:

  | Prompt                                               | Options (answer in bold)   |
  |------------------------------------------------------|----------------------------|
  | `In een drinkglas past ongeveer 200 ?.`              | **ml**, cl, dl, L          |
  | `In een theelepel past ongeveer 5 ?.`                | **ml**, cl, dl, L          |
  | `In een emmer past ongeveer 10 ?.`                   | ml, cl, dl, **L**          |
  | `Een vrachtwagen levert 10 ? zand.`                  | cl, L, **kuub**, km³       |
  | `Het IJsselmeer bevat ongeveer 6 ? water.`           | L, hl, m³, **km³**         |
  | `Een potlood is ongeveer 18 ? lang.`                 | mm, **cm**, dm, m          |
  | `Van Amsterdam naar Utrecht is het ongeveer 40 ?.`   | cm, m, hm, **km**          |
  | `Een appel weegt ongeveer 150 ?.`                    | mg, **g**, kg, ton         |
  | `Een olifant weegt ongeveer 5 ?.`                    | mg, g, kg, **ton**         |
  | `Een A4'tje is ongeveer 600 ? groot.`                | mm², **cm²**, dm², m²      |
  | `Een voetbalveld is ongeveer 7000 ? groot.`          | dm², **m²**, ha, km²       |
  | `Een film duurt ongeveer 2 ?.`                       | s, min, **uur**, dagen     |
  | `Een schooljaar duurt ongeveer 40 ?.`                | dagen, **weken**, maanden, jaar |
  | `Een foto op je telefoon is ongeveer 3 ?.`           | kB, **MB**, GB, TB         |

- **Ordering** (C.2): four lengths in four different units from `mm`, `cm`, `dm` and `m`. Each
  length has at most 3 significant digits and at most 1 decimal, lies in `[0,1; 999]` as written
  and between 5 mm and 20 m in size; any two differ by at least 10%. Ordering by the bare
  numbers must give a different order than by size. The direction is 50/50 (`van klein naar
  groot`, `van groot naar klein`). The options, in random order: the right order, the order of
  the bare numbers, and two orders that each swap one neighbouring pair of the right order
  (all four different). An option reads `5,2 mm – 76 cm – 2 m – 104 dm` (an en dash with
  spaces).
- **Quantity** (C.1): the seven grootheden `lengte`, `oppervlakte`, `inhoud`, `gewicht` (the
  Cito word), `tijd`, `snelheid`, `temperatuur`, each with its units written as words:

  | Grootheid   | Units                             |
  |-------------|-----------------------------------|
  | lengte      | meter, kilometer                  |
  | oppervlakte | vierkante meter, hectare          |
  | inhoud      | liter, kubieke meter              |
  | gewicht     | gram, kilogram, ton               |
  | tijd        | seconde, minuut                   |
  | snelheid    | kilometer per uur                 |
  | temperatuur | graad Celsius                     |

  Two variants, 50/50; options in random order:
  - *unit:* `Bij welke grootheid hoort de eenheid liter?`, one of the 13 units, each equally
    likely; the options are its grootheid and three other grootheden.
  - *which:* `Welk woord is een grootheid?`; the options are one grootheid and three units of
    three other grootheden.
- Explanations: reference `Een deur is ongeveer 2 m hoog.`; instrument `De lengte van een
  potlood meet je met een liniaal.`; unit the filled-in sentence, `In een drinkglas past
  ongeveer 200 ml (2 dl).` where a second unit helps; ordering all lengths in cm,
  `in cm: 0,52 – 76 – 200 – 1040`; quantity `Liter is een eenheid van inhoud.` and
  `Inhoud is een grootheid; meter, gram en seconde zijn eenheden.`
- The de-duplication key of a quantity question is the variant and the unit or grootheid.

### 5.49 Compound quantities (`compoundUnits`)

Verdieping (RWT C.3). Label: `Samengestelde grootheden (snelheid, dichtheid, debiet,
verbruik)`. There are four forms, each picked with equal probability:

| Form       | Example                                                                                    | Answer | Suffix     |
|------------|--------------------------------------------------------------------------------------------|--------|------------|
| Speed      | `Een hardloper rent 500 m in 3 min. Hoe snel is dat in km/u?`                              | 10     | `km/u`     |
|            | `Een trein rijdt 96 km/u. Hoeveel km rijdt de trein in 10 minuten?`                        | 16     | `km`       |
| Density    | `Een gemeente heeft 48 000 inwoners en is 40 km² groot. Hoeveel inwoners per km² is dat?`  | 1200   | `per km²`  |
| Flow       | `Een kraan geeft 12 liter per minuut. Hoeveel minuten duurt het om een bad van 180 L te vullen?` | 15 | `min`   |
| Fuel       | `Een auto rijdt 1 op 15: op 1 liter benzine rijdt hij 15 km. Hoeveel liter heeft hij nodig voor 240 km?` | 16 | `L` |

- **Speed**, two variants, 50/50:
  - from metres: contexts `wandelaar` (4, 5, 6 km/u), `hardloper` (8, 9, 10, 12, 15),
    `schaatser` (24, 30, 36) and `wielrenner` (24, 30, 36, 40); the time is in minutes from
    `{1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30}` or in seconds from `{10, 15, 20, 30, 45}`. The
    distance is a whole multiple of 10 m in `[100, 10 000]`, written in m below 1000 m and
    otherwise in km with at most 1 decimal.
  - a speed that is not round: contexts `trein`, `auto` and `bus`, the speed a multiple of 12
    in `[36, 144]` km/u (bus at most 84), the time from `{5, 10, 15, 20, 25, 35, 40, 50}`
    minutes; the answer `speed × time : 60` is whole.
- **Density**, three variants, each equally likely: the density, the number of inhabitants, or
  the area asked. Context `gemeente`; area from `{10, 20, 25, 40, 50, 80, 100, 120, 150, 200}`
  km², density with 1 or 2 significant digits in `[100, 5000]` per km², inhabitants
  `area × density` in `[2000, 900 000]`. Suffixes `per km²`, `inwoners` and `km²`.
- **Flow**, three variants, each equally likely: the time (`volume : rate`, whole minutes in
  `[4, 40]`), the volume (`rate × time`, whole minutes in `[2, 30]`), or the rate per hour
  (`12 liter per minuut = ? liter per uur`, suffix `L per uur`). Rate from
  `{5, 6, 8, 10, 12, 15, 20, 25}` liter per minuut; contexts `bad` (80–200 L), `regenton`
  (100–250 L) and `aquarium` (40–200 L) for the time and volume variants.
- **Fuel**, three variants, each equally likely: the liters, the distance (`Met 40 liter …`),
  or the cost with a petrol price from `{€ 1,90; € 2; € 2,10}` per liter (`€` prefix). The
  efficiency is from `{12, 15, 16, 18, 20, 25}` km per liter; the liters are whole in
  `[4, 50]`, the distance at most 1000 km.
- Explanations: a ratio table as in §5.26 where a speed is involved, otherwise the calculation:
  `3 min → 500 m, 60 min → 10 000 m = 10 km`, `30 s → 200 m, 3600 s → 24 000 m = 24 km`,
  `60 min → 96 km, 10 min → 16 km`, `48 000 : 40 = 1200`, `180 : 12 = 15`,
  `1 uur = 60 min → 12 × 60 = 720`, `240 : 15 = 16`, `240 : 15 = 16 L → 16 × € 2 = € 32`.

### 5.50 Measure problems (`measureProblems`)

Verdieping (RWT C.2, functional). Word problems and sums with a conversion inside. Label:
`Rekenen met maten (omrekenen in contexten)`. There are four forms, each picked with equal
probability:

| Form      | Example                                                                                   | Answer | Suffix    |
|-----------|-------------------------------------------------------------------------------------------|--------|-----------|
| Fit       | `Hoeveel glazen van 25 cl kun je vullen uit een pak van 1,5 L?`                            | 6      | `glazen`  |
| Mixed sum | `1,2 m + 45 cm + 8 dm = ? cm`                                                              | 245    | `cm`      |
| Total     | `Je koopt 4 pakken van 1,5 kg en 3 zakken van 750 g. Hoeveel kg is dat samen?`             | 8,25   | `kg`      |
| Remainder | `Van een rol touw van 5 m knip je 3 stukken van 80 cm. Hoeveel cm blijft er over?`          | 260    | `cm`      |

- **Fit**, three contexts, each equally likely; the count is whole in `[3, 40]`:
  - `glazen` of `{15, 20, 25}` cl from a `pak` or `fles` of `{1; 1,5; 2; 3}` L
  - `stukken` of `{20, 25, 30, 40, 60, 80}` cm from a `plank` of `[1,2; 4,8]` m (1 decimal)
  - `porties` of `{50, 75, 100, 125, 250}` g from a `zak` of `{1; 1,5; 2; 2,5; 5}` kg
- **Mixed sum** (formal): three terms of one dimension (length `mm`–`km`, capacity `ml`–`L`,
  mass `mg`–`kg`) in at least two different units, joined by `+`, or in 30% by one `+` and one
  `−`; every partial result is positive. The answer unit is one of the units in the sum. Every
  unit lies within a factor 1000 of the answer unit; each term has 1 to 3 significant digits and
  at most 2 decimals; the answer has at most 2 decimals and is at most 10 000.
- **Total**, three contexts, each equally likely:
  - `flesjes`: `Je koopt 6 flesjes van 33 cl. Hoeveel liter is dat?`, `[2, 12]` flesjes of
    `{25, 33, 50}` cl
  - `boodschappen`: `[2, 6]` pakken of `{0,5; 1; 1,5; 2}` kg and `[2, 6]` zakken of
    `{250, 500, 750}` g, asked in kg
  - `hardlopen`: `Je loopt 3 rondjes van 400 m en daarna nog 2,8 km. Hoeveel km loop je?`,
    `[2, 10]` rondjes, the extra distance in `[0,5; 5]` km with 1 decimal
- **Remainder**, three contexts, each equally likely; the number of pieces is in `[2, 8]`, the
  rest is positive and asked in the smaller unit:
  - `touw`: a rol of `{5, 10, 20}` m, stukken of a multiple of 5 cm in `[30, 90]`
  - `fles`: `Een fles bevat 1,5 L. Je schenkt 4 glazen van 25 cl in. Hoeveel cl blijft er
    over?`, the fles and glazen as in Fit
  - `meel`: `Een zak bevat 2 kg meel. Je gebruikt 3 keer 350 g. Hoeveel g blijft er over?`, a
    zak of `{1; 1,5; 2; 2,5}` kg, portions a multiple of 50 g in `[100, 500]`
- Explanations: the conversion first, then the calculation: `1,5 L = 150 cl → 150 : 25 = 6`,
  `1,2 m = 120 cm, 8 dm = 80 cm → 120 + 45 + 80 = 245`, `6 × 33 = 198 cl = 1,98 L`,
  `4 × 1,5 = 6 kg, 3 × 750 = 2250 g = 2,25 kg → 6 + 2,25 = 8,25`,
  `5 m = 500 cm, 3 × 80 = 240 → 500 − 240 = 260`.

### 5.51 Time calculations (`timeCalc`)

Verdieping (RWT C.9 and C.2). Label: `Rekenen met tijd (aankomst, vertrek, duur)`. There are
three forms, each picked with equal probability:

| Form      | Example                                                                                       | Answer                 |
|-----------|-----------------------------------------------------------------------------------------------|------------------------|
| Arrival   | `De film begint om 19:45 en duurt 145 minuten. Hoe laat is de film afgelopen?`                 | `22:10` (multiple choice) |
| Departure | `Je moet om 8:50 op school zijn en fietst 35 minuten. Hoe laat moet je vertrekken?`            | `8:15` (multiple choice)  |
| Duration  | `De trein vertrekt om 9:47 en komt om 11:22 aan. Hoeveel minuten duurt de reis?`               | 95, suffix `min`       |

- **Durations in a prompt:** in minutes (`145 minuten`), or in 50% of the prompts with a
  duration over 60 minutes as hours and minutes (`2 uur en 25 minuten`). This is the one place
  where mixed notation occurs; §5.10 keeps it out of conversions.
- **Arrival**, three contexts, each equally likely: `film` (start a multiple of 5 in
  `[13:00, 21:30]`, duration a multiple of 5 in `[85, 180]`), `treinreis` (start any minute in
  `[6:00, 22:00]`, duration in `[20, 150]`) and `nachtbus` (start a multiple of 5 in
  `[23:00, 23:55]`, duration in `[15, 75]`, so the arrival is after midnight).
- **Departure**, three contexts, each equally likely: `school` (arrival a multiple of 5 in
  `[8:15, 8:45]`, travel in `[10, 45]`), `afspraak` (arrival a multiple of 5 in
  `[9:00, 20:00]`, travel a multiple of 5 in `[15, 120]`) and `trein` (arrival any minute in
  `[7:00, 23:00]`, travel in `[20, 150]`).
- **Arrival and departure options:** the answer, the answer − 1 hour, the answer + 1 hour, and
  the answer + or − 10 minutes (50/50), in the order they come in time, also across midnight
  (`23:30` before `0:20`).
- **Duration**, two variants, 50/50: `reis` (departure any minute in `[6:00, 21:00]`, duration in
  `[20, 240]` minutes, asked in minutes) and `werkdag` (`Je werkt van 8:30 tot 17:15 en hebt
  45 minuten pauze. Hoeveel uur werk je?`, start and end multiples of 15 minutes, pause from
  `{30, 45, 60}`, the answer in hours, a multiple of 0,25 in `[4, 9]`, suffix `uur`).
- Explanations: whole hours first, then the minutes via the full hour when they pass one:
  - arrival: `145 min = 2 uur en 25 min → 19:45 + 2 uur = 21:45 → 21:45 + 15 min = 22:00 →
    22:00 + 10 min = 22:10` (a duration written as hours and minutes skips the first step)
  - departure: `8:50 − 35 min = 8:15`, and over a full hour
    `9:10 − 25 min → 9:10 − 10 min = 9:00 → 9:00 − 15 min = 8:45`
  - duration: `9:47 → 10:00 is 13 min, 10:00 → 11:00 is 60 min, 11:00 → 11:22 is 22 min →
    13 + 60 + 22 = 95` (several whole hours are one part: `10:00 → 13:00 is 180 min`); werkdag: `8:30 → 17:15 is 8 uur en 45 min → min 45 min pauze = 8 uur`

### 5.52 Estimating (`estimating`)

Verdieping (RWT 0.2), all multiple choice: an estimate via one of the references of §5.48.
Label: `Schatten (met referentiematen)`. Six contexts, each equally likely:

| Context  | Example                                                                                       | Answer    | Reference      | Range                                         |
|----------|-----------------------------------------------------------------------------------------------|-----------|----------------|-----------------------------------------------|
| flat     | `Een flat heeft 12 woonlagen. Hoe hoog is de flat ongeveer?`                                  | 36 m      | 3 m per laag   | `[4, 20]` woonlagen                           |
| wandelen | `Je wandelt 2,5 uur. Hoe ver kom je ongeveer?`                                                | 12,5 km   | 5 km/u         | `{0,5; 1; 1,5; 2; 2,5; 3; 4}` uur             |
| fietsen  | `Je fietst 3 uur. Hoe ver kom je ongeveer?`                                                   | 51 km     | 17 km/u        | `{0,5; 1; 2; 3; 4}` uur                       |
| stappen  | `Je loopt 2,5 km. Hoeveel stappen zet je ongeveer?`                                           | 2500      | 1 m per stap   | `{0,5; 1; 1,5; 2; 2,5; 3; 5}` km              |
| water    | `Een aquarium is 80 cm lang, 40 cm breed en 50 cm hoog. Hoe zwaar is het water als het vol is, ongeveer?` | 160 kg | 1 L ≈ 1 kg | length `{40, 50, 60, 80, 100}`, width and height `{30, 40, 50}` cm |
| mensen   | `20 volwassenen liggen achter elkaar op de grond. Hoe lang is de rij ongeveer?`               | 36 m      | 1,80 m         | `[5, 50]` volwassenen                         |

- Options: the answer `c` with its unit and three powers of ten of it, `c × {0,1; 1; 10; 100}`
  or `c × {0,01; 0,1; 1; 10}` (50/50), in ascending order. A set whose options would have more
  than 2 decimals is not used (`12,5 × 0,01`). They are far enough apart that `ongeveer` has one
  answer.
- Explanation: the reference, then the calculation: `1 woonlaag ≈ 3 m → 12 × 3 = 36 m`,
  `80 × 40 × 50 = 160 000 cm³ = 160 L, 1 L water ≈ 1 kg → ongeveer 160 kg`.
