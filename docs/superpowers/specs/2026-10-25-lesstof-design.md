# Lesstof — Design Spec

- Started: 2026-10-25
- Status: living spec for the study material (lesstof). The main spec
  (`2026-10-05-rekenhulp-design.md`) stays the source of truth for everything else, incl. the
  number conventions (§8) and the entry points to the lesstof (§3, §3.1). Decision history
  is in git.

## 1. Goal

Study material per practice set, to understand and refresh the methods before practising, aimed
at the LKT and the RWT. It is read on demand, never part of a session.

**Several methods.** The reader is a PABO student who will teach children that calculate in
different ways, so a topic shows **more than one method** wherever a common second method exists
(§7).

- One lesson per practice set, named like the set (Getalbegrip → lesson Getalbegrip).
- A lesson consists of **lesson topics**. The user opens one topic to read; nothing walks
  through the topics in sequence (no "next", no progress).

### Non-goals

- No persistence of any kind: no "read" marks, no last-opened topic (main spec §1).
- No exercises, interaction, images or network inside a lesson.
- No didactics (main spec §12.7): the lesstof shows calculation methods, not how to teach them:
  no teaching models or terms, no typical pupils' errors.
- No link from a session or the feedback panel to a lesson (for now).

## 2. Build order

1. **Framework** (this spec, §3–§6): data model, checks, screens, tabs, navigation. Ships with
   no lessons.
2. **Content per set**, developed separately from the practice sets and outside the main
   roadmap (main spec §12): no fixed order, one set at a time, only when the user asks. Each set
   adds its section to §7 (topics, examples) before its content is written.

A new practice set appears greyed out on the Lesstof tab by itself (§3) and needs no lesson.

## 3. Navigation

States in `App.svelte` (main spec §3), next to `sets → setup → playing → results`:

- `lessonTopics` (set, lesson, return target): the topic list of one lesson.
- `lesson` (set, lesson, topic, return target of its topic list): one topic.

Entry point: the **Lesstof tab** on the overview (main spec §3.1). It lists **all** practice
sets, in `PRACTICE_SETS` order, with the same glyph, name and description as **Oefenen**. A set
with a lesson is a normal row and opens `lessonTopics`; a set without a lesson is shown greyed
out and disabled (the global disabled style, `disabled` attribute, not focusable).

**Linking is supported, not used yet.** `lessonTopics` carries the screen to return to, so a
later entry point (e.g. a button on the setup screen) only has to open it with its own screen as
return target; the lesson screens do not change. No such entry point is built now: the practice
screens (setup, playing, results) stay untouched.

Back:

- **Terug** on `lesson` → `lessonTopics` of the same set.
- **Terug** on `lessonTopics` → its return target; for now always `sets`, with the Lesstof tab
  still active.
- The **system back** does what Terug does and never closes the app (main spec §3). Because both
  lesson states are off `sets`, the back-guard entry consumed by a `popstate` must be pushed
  again whenever the new screen is still off `sets`.

## 4. Screens

- **Overview tabs:** a segmented control **Oefenen | Lesstof** under the title, `role="tablist"`,
  two `role="tab"` with `aria-selected`, arrow keys move between them. Default **Oefenen**; the
  active tab lives in `App.svelte` memory only.
- **Code separation:** the lesstof is its own part of the app, not mixed into the practice
  code. Lesson screens and lists are their own components (`LessonSetList`, `LessonTopicList`,
  `LessonView`); practice components get no lesson props or branches; `lib/lessons/` does not
  extend `PracticeSet` or `lib/sets.ts` (it only reads the sets to link a lesson by `setId`).
  Shared pieces are purely presentational: the overview shell (header + tabs) that renders
  either list, and the set row (glyph tile, name, description, chevron, `disabled`) used by both
  lists. `App.svelte` stays the single state machine, with the lesson states as their own
  branches.
- **`lessonTopics`:** header like the setup screen (back button with aria-label **Terug**, glyph
  tile, set name), then one row per topic with its title and a one-line summary, in the row style
  of the overview. Scrolls when long.
- **`lesson`:** header with the back button and the topic title, then the blocks (§5), scrolling
  as one page, respecting the safe-area insets.

## 5. Data model

Typed data in `src/lib/lessons/`, one module per set, registered in `lib/lessons/index.ts`.
Kept free of Svelte imports (CLAUDE.md).

```ts
type LessonBlock =
  | { type: 'text'; text: string }                        // a paragraph
  | { type: 'worked'; title?: string; lines: string[] }   // each line an equality chain
  | { type: 'table'; head: string[]; rows: string[][] }   // a small table
  | { type: 'tip'; text: string };                        // a highlighted rule of thumb

interface LessonTopic { id: string; title: string; summary: string; blocks: LessonBlock[] }
interface Lesson { setId: string; topics: LessonTopic[] }

const LESSONS: readonly Lesson[];                          // one entry per set in §7
function lessonFor(set: PracticeSet): Lesson | undefined;
```

- A lesson belongs to a set by `setId`. Its topics are its own and need not match the set's
  practice topics (Tafels has one practice topic but could have several lesson topics).
- Rendering: all text goes through `MathText`, so stacked fractions, mixed numbers and the slot
  work as in prompts. Text follows the number conventions of main spec §8 (decimal comma, thin
  space thousands separator, `×` and `:`, `−`, the `SLOT` marker for an unknown).

## 6. Checks (tests)

- Every `lesson.setId` is the id of a set in `PRACTICE_SETS`, at most one lesson per set; topic
  ids are unique within a lesson; a lesson has at least one topic and every topic at least one
  block.
- No test requires a set to have a lesson: adding a practice set never touches lesson code.
- **Worked examples are correct:** every line of a `worked` block is an equality chain
  (`13 × 7 = 10 × 7 + 3 × 7 = 70 + 21 = 91`); each side is parsed and evaluated with `lib/expr`
  and all sides must be equal. Fractions (`3/4`) and thin-space grouped numbers (`2 500`) are
  allowed; a line without ` = `, with a mixed number or with an unparsable side fails.
- Text uses no ASCII operators: no `*`, no `x` between numbers, no `/` with spaces around it
  (`km/u` and `3/4` are fine). A `worked` line has no literal `?` and no ASCII `-` as minus.
- The framework itself is tested with a fixture lesson, independent of the real `LESSONS`.

## 7. Content per set

Added per set in its own session (§2). Worked lines below are pure equality chains (§6); words,
`√` and "GGD van" go in text blocks or the worked block's title.

Several methods (§1): a topic shows at least two methods when a common second method exists, the
second preferably on the same numbers so the reader can compare them. Facts, definitions and
properties need only one. The first method is the one of the practice explanation (main spec
§5); where a set below says its methods match the practice explanations, that is the first
method.

### 7.1 Getallen & delers (`getallen`)

Eight topics, ordered so each builds on the previous one (divisibility before primes, primes
before factorization, factorization before GGD and KGV). The methods match the explanations of
the practice topics (main spec §5.2–§5.7).

1. **`digitRules` — Deelbaarheid aan de cijfers** (summary: `2, 3, 4, 5, 8, 9 en 11`)
   - Table `Deler | Kijk naar | Deelbaar als`: 2 and 5 last digit; 4 last two digits; 8 last
     three digits; 3 and 9 cijfersom; 11 alternerende som (starting with `+` at the leftmost
     digit) is a multiple of 11 (0 counts).
   - Worked `2718 en 9`: `2 + 7 + 1 + 8 = 18`, `2718 = 9 × 302`.
   - Worked `9174 en 11`: `9 − 1 + 7 − 4 = 11`, `9174 = 11 × 834`.
   - Tip: a cijfersom you are unsure of: take the cijfersom again (`18 → 1 + 8 = 9`).
2. **`combinedRules` — Deelbaarheid door 6, 12, 14 en 15** (summary: `Twee regels tegelijk`)
   - Text: split the divisor into two factors without a common divisor and check both.
   - Table `Deler | Factoren`: `6 | 2 × 3`, `12 | 3 × 4`, `14 | 2 × 7`, `15 | 3 × 5`.
   - Text example: `1246` is even, but cijfersom `1 + 2 + 4 + 6 = 13` → not by 3 → not by 6.
   - Tip: `12 = 2 × 6` does not work: 2 and 6 share 2. `18` is divisible by 2 and by 6, not by 12.
3. **`chunking` — Deelbaarheid door 7 en 13** (summary: `Happen in veelvouden`)
   - Text: there is no digit rule like that of 3 or 9; take off big multiples you know
     (`7 × 300`, `7 × 80`) until a small remainder is left.
   - Worked `2716 en 7`: `2716 = 2100 + 560 + 56`, `2716 : 7 = 300 + 80 + 8 = 388`.
   - Text: `2718 = 2100 + 560 + 56 + 2` → remainder 2, not divisible.
   - Text, the rule for 7: strike the last digit and subtract it twice from the rest; repeat
     until you see it.
   - Worked `2716 en 7, met de regel`: `271 − 2 × 6 = 271 − 12 = 259`,
     `25 − 2 × 9 = 25 − 18 = 7`.
   - Worked `1859 en 13`: `1859 = 1300 + 520 + 39`, `1859 : 13 = 100 + 40 + 3 = 143`.
4. **`primes` — Priemgetallen** (summary: `Precies twee delers`)
   - Text: a prime has exactly two divisors, 1 and itself. 1 is not a prime; 2 is the only even
     prime.
   - Text: to test `n`, divide by the primes whose square is at most `n`. For `151`: 2, 3, 5, 7
     and 11, because `13² = 169` is more than 151. None divides, so 151 is prime.
   - Table `Priemgetallen tot 100`, one row per ten (`0–9 | 2, 3, 5, 7`, …, `90–99 | 97`).
   - Table `Lijkt priem, is het niet` with the hard composites under 200 (not divisible by 2, 3
     or 5): `49 = 7²`, `77 = 7 × 11`, `91 = 7 × 13`, `119 = 7 × 17`, `121 = 11²`,
     `133 = 7 × 19`, `143 = 11 × 13`, `161 = 7 × 23`, `169 = 13²`, `187 = 11 × 17`.
   - Tip: below 200, a number not divisible by 2, 3 or 5 is prime unless it is in this table.
5. **`factorization` — Ontbinden in priemfactoren** (summary: `De deelladder`)
   - Text: divide by the smallest prime that fits, again and again, until a prime is left;
     write repeated factors as a power.
   - Worked `84`: `84 = 2 × 42 = 2 × 2 × 21 = 2 × 2 × 3 × 7 = 2² × 3 × 7`.
   - Worked `180, met een makkelijke splitsing`: `180 = 18 × 10 = 2 × 9 × 2 × 5 = 2² × 3² × 5`.
   - Tip: 1 is not a factor; check by multiplying back.
6. **`gcd` — GGD** (summary: `Grootste gemeenschappelijke deler`)
   - Text: the largest number that divides both; at most the smaller number.
   - Worked `84 en 126`: `84 = 2² × 3 × 7`, `126 = 2 × 3² × 7`, `2 × 3 × 7 = 42`, with text:
     take the primes in both, each with its lowest power.
   - Worked `24, 36, 60 en 90`: `24 = 2³ × 3`, `36 = 2² × 3²`, `60 = 2² × 3 × 5`,
     `90 = 2 × 3² × 5`, `2 × 3 = 6`, with text: with more numbers a prime counts only if it is in
     all of them; 5 is not in 24 and 36, so it drops out.
   - Text, difference method: the GGD also divides the difference. `126 − 84 = 42` and 42
     divides 84, so GGD = 42. Otherwise repeat with the smaller number and the difference:
     120 and 72 → 48; 72 and 48 → 24; 24 divides 48, so GGD = 24.
   - Tip: if the smaller number divides the larger, it is the GGD. No common prime → GGD = 1.
7. **`lcm` — KGV** (summary: `Kleinste gemeenschappelijke veelvoud`)
   - Text: the smallest number both divide; at least the larger number.
   - Text, counting up: walk the multiples of the larger number until the smaller divides it:
     12 and 18 → 18 no, 36 yes.
   - Worked `12 en 18, met priemfactoren`: `12 = 2² × 3`, `18 = 2 × 3²`, `2² × 3² = 36`, with
     text: every prime that occurs, with its highest power.
   - Worked `12 en 18, via de GGD`: `12 × 18 : 6 = 216 : 6 = 36`.
   - Worked `24, 36, 60 en 90` (the GGD example): the four factorizations and
     `2³ × 3² × 5 = 8 × 9 × 5 = 360`, with text: every prime that occurs in any of them, with its
     highest power, so 5 counts too; via de GGD only works for two numbers.
   - Table `GGD | KGV`: `deler van allebei | veelvoud van allebei`, `hoogstens het kleinste getal
     | minstens het grootste getal`, `laagste macht van gedeelde priemen | hoogste macht van alle
     priemen`.
   - Tip: no common divisor (GGD 1) → KGV = the product: `8 × 15 = 120`.
8. **`squares` — Kwadraten en wortels** (summary: `11² tot en met 25²`)
   - Table `n | n²` for 11 to 25.
   - Worked `Tientallen afsplitsen`: `17² = 17 × 10 + 17 × 7 = 170 + 119 = 289`,
     `23² = 23 × 20 + 23 × 3 = 460 + 69 = 529`.
   - Worked `Eindigt op 5`: `15² = 1 × 2 × 100 + 25 = 225`, `25² = 2 × 3 × 100 + 25 = 625`, with
     text: tens digit times one more, then 25.
   - Text, roots: √529 lies between 20 and 30 (`20² = 400`, `30² = 900`); a square ending in 9
     has a root ending in 3 or 7; `25² = 625` is too big, so √529 = 23.
   - Table `Kwadraat eindigt op | Wortel eindigt op`: `1 | 1 of 9`, `4 | 2 of 8`, `5 | 5`,
     `6 | 4 of 6`, `9 | 3 of 7`, `0 | 0`.

### 7.2 Meten (`meten`)

Seven topics. Metric units first (prefixes, shifting the comma); area and volume build on them
with ×100 and ×1000; large numbers reuse the ×1000 ladder; then time, speed (which needs the
parts of an hour) and km/u ↔ m/s. The methods match the explanations of the practice topics
(main spec §5.10, §5.14, §5.26), the tips repeat the tip texts of main spec §3.4.1. Worked lines
hold numbers only; the units go in the title.

1. **`metric` — Lengte en gewicht** (summary: `Voorvoegsels en de komma verschuiven`)
   - Table `Voorvoegsel | Betekent | Voorbeeld`: `kilo | 1000 | 1 km = 1000 m`,
     `hecto | 100 | 1 hl = 100 L`, `deca | 10 | 1 dam = 10 m`, `deci | 0,1 | 1 dm = 0,1 m`,
     `centi | 0,01 | 1 cl = 0,01 L`, `milli | 0,001 | 1 mg = 0,001 g`.
   - Table `Eenheid | Is`: `1 km | 1000 m`, `1 m | 10 dm = 100 cm = 1000 mm`, `1 ton | 1000 kg`,
     `1 kg | 1000 g`, `1 g | 1000 mg`.
   - Text: to a smaller unit the number gets larger (multiply), to a larger unit smaller
     (divide). Every factor 10 moves the comma one place.
   - Worked `3,5 km naar m`: `3,5 × 1000 = 3500`; `250 g naar kg`: `250 : 1000 = 0,25`;
     `47 mm naar dm`: `47 : 100 = 0,47`.
   - Tip: a smaller unit fits more often, so the number grows. Check the direction first.
2. **`area` — Oppervlakte** (summary: `Elke stap ×100`)
   - Text: 1 m² is a square of 10 dm by 10 dm, so 1 m² = 100 dm². Every step is ×100: the comma
     moves two places.
   - Worked `1 m² in cm²`: `100 × 100 = 10 000`.
   - Table `Eenheid | Is`: `1 cm² | 100 mm²`, `1 dm² | 100 cm²`, `1 m² | 100 dm²`,
     `1 are | 100 m² (10 m bij 10 m)`, `1 ha | 100 are = 10 000 m² (100 m bij 100 m)`,
     `1 km² | 100 ha`.
   - Worked `2,5 ha naar m²`: `2,5 × 10 000 = 25 000`; `350 cm² naar dm²`: `350 : 100 = 3,5`.
   - Tip: "Bij oppervlakte is elke stap ×100 (10 × 10), niet ×10."
3. **`volume` — Inhoud** (summary: `Kubieke eenheden en liters`)
   - Text: 1 dm³ is a cube of 10 by 10 by 10 cm, so 1 dm³ = 1000 cm³. Every cubic step is ×1000:
     the comma moves three places.
   - Text: liters go like length: ml → cl → dl → L each ×10, and 1 hl = 100 L.
   - Table `Kubiek | Liter`: `1 cm³ | 1 ml`, `1 dm³ | 1 L`, `1 m³ | 1000 L`.
   - Worked `3,5 L naar cm³`: `3,5 × 1000 = 3500` (text: 1 L = 1 dm³ = 1000 cm³);
     `0,4 m³ naar L`: `0,4 × 1000 = 400`; `250 ml naar dl`: `250 : 100 = 2,5`.
   - Tip: "Bij kubieke eenheden is elke stap ×1000 (10 × 10 × 10), niet ×10."
4. **`largeNumbers` — Grote getallen** (summary: `Miljoen, miljard, biljoen`)
   - Table `Naam | Macht`: duizend 10³, miljoen 10⁶, miljard 10⁹, biljoen 10¹², biljard 10¹⁵,
     triljoen 10¹⁸, triljard 10²¹, quadriljoen 10²⁴.
   - Text: every next name is ×1000, the exponent goes up by 3.
   - Worked `250 miljoen als macht van 10`: `250 × 10⁶ = 2,5 × 10² × 10⁶ = 2,5 × 10⁸`, with text:
     exponents of 10 add up when you multiply.
   - Worked `3,5 biljoen in miljard`: `3,5 × 1000 = 3500`; `2,5 × 10⁹ in miljoen`:
     `2,5 × 10⁹ = 2500 × 10⁶`.
   - Tip: "Een biljoen is 10¹²; 10⁹ is een miljard (Engels: billion)."
5. **`time` — Tijd** (summary: `Rekenen met 60 en 24`)
   - Text: time is not decimal: 1 min = 60 s, 1 uur = 60 min = 3600 s, 1 dag = 24 uur.
   - Table `Deel van een uur | Minuten`: `0,1 | 6`, `0,2 | 12`, `1/4 = 0,25 | 15`, `1/3 | 20`,
     `1/2 = 0,5 | 30`, `3/4 = 0,75 | 45`.
   - Worked `2,25 uur naar min`: `2,25 × 60 = 2 × 60 + 0,25 × 60 = 120 + 15 = 135`.
   - Worked `2,25 uur naar min, met breuken`: `2,25 = 2 + 1/4`, `1/4 × 60 = 60 : 4 = 15`,
     `2 × 60 + 15 = 135`, with text: 0,25 uur is a quarter, 1/4 of 60 min.
   - Worked `150 min naar uur`: `150 : 60 = 2,5`, with text: 150 min = 120 + 30 min, so 2 hours
     and half an hour.
   - Worked `3,5 dag naar uur`: `3,5 × 24 = 72 + 12 = 84`.
   - Tip: "0,5 uur is 30 min, niet 50 min. En 30 min is 0,5 uur, niet 0,3 uur."
6. **`speed` — Snelheid** (summary: `Afstand, tijd en km/u`)
   - Text: km/u is the distance in one hour. Afstand = snelheid × tijd, with the time in hours.
     Without the formula: a ratio table to 60 min.
   - Table `Tijd | Afstand`: `20 min | 6 km`, `60 min | 18 km`, with text: three times as long,
     three times as far, so 18 km/u.
   - Worked `6 km in 20 min`: `60 : 20 = 3`, `6 × 3 = 18`.
   - Worked `80 km/u, hoeveel km in 45 min`: `80 × 3/4 = 80 : 4 × 3 = 60`.
   - Worked `5 km/u, hoe lang over 2 km`: `60 : 5 = 12`, `2 × 12 = 24`, with text: 1 km takes
     12 min.
   - Tip: "km/u is per uur: reken eerst uit hoeveel km je in 60 min aflegt."
7. **`metersPerSecond` — km/u en m/s** (summary: `Keer of gedeeld door 3,6`)
   - Text: 1 m/s is 3600 m per hour, that is 3,6 km/u.
   - Worked `1 m/s in km/u`: `1 × 3600 : 1000 = 3,6`.
   - Text: 3,6 = 18/5, so ×3,6 is :5 then ×18, and :3,6 is :18 then ×5.
   - Worked `15 m/s naar km/u`: `15 × 3,6 = 15 : 5 × 18 = 3 × 18 = 54`;
     `72 km/u naar m/s`: `72 : 3,6 = 72 : 18 × 5 = 4 × 5 = 20`.
   - Table `m/s | km/u`: 5 | 18, 10 | 36, 15 | 54, 20 | 72, 25 | 90, 30 | 108, 35 | 126,
     40 | 144.
   - Tip: "Naar m/s wordt het getal kleiner: deel door 3,6."

### 7.3 Verhoudingen (`verhoudingen`)

Seven topics: percentages first (they come back in every later topic), then ratios, ratio
stories, the step via a unit and scale. The methods match the explanations of main spec §5.12,
§5.13 and §5.23–§5.25; the tips repeat or generalise their tip texts (§3.4.1). Worked lines hold
numbers only (no `%`, no `€`); percentages and units go in the title and the text.

1. **`percentages` — Procenten** (summary: `Via 1%, 10%, 25% en 50%`)
   - Text: procent means hundredth. Work via a base percentage you can see at once.
   - Table `Procent | Breuk | Reken`: `1% | 1/100 | : 100`, `5% | 1/20 | 10% : 2`,
     `10% | 1/10 | : 10`, `12,5% | 1/8 | : 8`, `20% | 1/5 | : 5`, `25% | 1/4 | : 4`,
     `50% | 1/2 | : 2`.
   - Worked `30% van 80`: `80 : 10 = 8`, `3 × 8 = 24`.
   - Worked `15% van 80`: `80 : 10 = 8`, `8 : 2 = 4`, `8 + 4 = 12`, with text: 10% + 5%.
   - Worked `30 is hoeveel procent van 120`: `30 : 120 = 1/4 = 25/100`, with text: deel : geheel,
     then × 100: 25%.
   - Text and table `Getal | Procent`, the ratio table: `120 | 100%`, `30 | 25%` (120 : 4 = 30,
     so 100% : 4 = 25%).
   - Worked `20% is 14, hoeveel is 100%`: `14 : 2 = 7`, `10 × 7 = 70`, with text: 10% = 7.
   - Tip: "Deel : geheel is nog geen percentage; × 100 geeft het percentage."
2. **`priceChange` — Korting, verhoging en btw** (summary: `De nieuwe en de oude prijs`)
   - Text: korting: trek het bedrag af; verhoging and btw: tel het op.
   - Worked `€ 60 na 25% korting`: `60 : 4 = 15`, `60 − 15 = 45`.
   - Worked `€ 60 na 25% korting, in één keer`: `3/4 × 60 = 60 : 4 × 3 = 45`, with text: you pay
     75%, that is 3/4.
   - Worked `€ 80 met 21% btw`: `80 : 10 = 8`, `2 × 8 = 16`, `80 : 100 = 0,80`,
     `16 + 0,80 = 16,80`, `80 + 16,80 = 96,80`, with text: 21% = 20% + 1%.
   - Text: back to the old price: after 25% korting the new price is 75%; with 21% btw it is
     121%.
   - Worked `Na 25% korting € 60, oude prijs`: `60 : 3 = 20`, `4 × 20 = 80`, with text:
     75% = 60, so 25% = 20 and 100% = 80.
   - Worked `€ 96,80 met 21% btw, zonder btw`: `96,80 : 121 = 0,80`, `100 × 0,80 = 80`.
   - Tip: "De korting is een percentage van de oude prijs, niet van de nieuwe."
3. **`percentChange` — Procentuele verandering** (summary: `Stijging of daling in procenten`)
   - Text: first the change (new − old, or old − new), then that change as a percentage of the
     **old** value.
   - Worked `€ 80 naar € 92`: `92 − 80 = 12`, `12 : 80 = 15/100`, with text: 15% stijging.
   - Worked `400 naar 340 bezoekers`: `400 − 340 = 60`, `60 : 400 = 15/100`, with text: 15%
     daling.
   - Worked `Nieuw als percentage van oud`: `92 : 80 = 115/100`, `340 : 400 = 85/100`, with text:
     115% is 15% stijging, 85% is 15% daling.
   - Tip: "Reken met de oude waarde: de stijging is een percentage van 80, niet van 92."
4. **`ratios` — Verhoudingen** (summary: `Beide getallen met hetzelfde getal`)
   - Text: in a ratio you multiply or divide both numbers by the same number.
   - Worked `3 : 5 = 12 : SLOT`: `12 : 3 = 4`, `5 × 4 = 20`.
   - Table `Personen | Pasta (g)`: `4 | 300`, `2 | 150`, `6 | 450`, with text: a ratio table
     via a step both numbers reach (here 2).
   - Worked `Verdeel 60 in de verhouding 2 : 3`: `2 + 3 = 5`, `60 : 5 = 12`, `3 × 12 = 36`, with
     text: 5 delen, 1 deel = 12, het grootste deel is 3 delen.
   - Tip: "Bij een verhouding vermenigvuldig of deel je beide getallen met hetzelfde getal; het
     verschil blijft niet gelijk."
5. **`ratioProblems` — Deel van het geheel en mengen** (summary: `Tel eerst de delen op`)
   - Text: `jongens : meisjes = 2 : 3` compares two groups; the whole class is 2 + 3 = 5 delen.
   - Worked `Jongens : meisjes = 2 : 3, deel jongens`: `2/5 = 40/100`, with text: 2/5 = 40%.
   - Worked `Siroop : water = 1 : 6, siroop in 350 ml limonade`: `1 + 6 = 7`, `350 : 7 = 50`.
   - Text and table `Siroop | Water | Limonade`, the ratio table: `1 deel | 6 delen | 7 delen`,
     `50 ml | 300 ml | 350 ml` (× 50).
   - Worked `Cement : zand = 2 : 5, zand bij 100 kg cement`: `100 : 2 = 50`, `5 × 50 = 250`.
   - Tip: "2 : 3 is jongens tegenover meisjes. Het geheel is 2 + 3 = 5 delen, dus 2/5."
6. **`perUnit` — Prijs per eenheid** (summary: `Een tussenstap via 100 g, 1 L of 1 uur`)
   - Text: when neither amount is a multiple of the other, step via a convenient unit.
   - Table `Kaas | Prijs`: `1,5 kg | € 12`, `100 g | € 0,80`, `400 g | € 3,20`.
   - Worked `1,5 kg kost € 12, wat kost 400 g`: `12 : 15 = 0,80`, `4 × 0,80 = 3,20`, with text:
     1,5 kg = 15 × 100 g.
   - Text and table `Kaas | Prijs`, in small steps (: 3, : 5, × 4): `1,5 kg | € 12`,
     `500 g | € 4`, `100 g | € 0,80`, `400 g | € 3,20`.
   - Tip: "Controleer de richting: 400 g is minder dan 1,5 kg, dus het kost minder dan € 12."
7. **`scale` — Schaal** (summary: `1 cm op de kaart is … in het echt`)
   - Text: schaal 1 : 25 000 means 1 cm on the map is 25 000 cm in reality; convert to m or km
     (1 m = 100 cm, 1 km = 100 000 cm).
   - Table `Schaal | 1 cm is`: `1 : 100 | 1 m`, `1 : 1000 | 10 m`, `1 : 25 000 | 250 m`,
     `1 : 50 000 | 500 m`, `1 : 100 000 | 1 km`, `1 : 1 000 000 | 10 km`.
   - Worked `Schaal 1 : 25 000, 4 cm op de kaart in km`: `25 000 : 100 000 = 0,25`,
     `4 × 0,25 = 1`.
   - Text and table `Kaart | In het echt`, × 4 first, then convert: `1 cm | 25 000 cm`,
     `4 cm | 100 000 cm = 1 km`.
   - Worked `Schaal 1 : 50 000, 3 km op de kaart in cm`: `50 000 : 100 000 = 0,5`,
     `3 : 0,5 = 6`.
   - Worked `4 cm op de kaart is 2 km, schaal`: `2 × 100 000 = 200 000`,
     `200 000 : 4 = 50 000`.
   - Tip: "Reken in dezelfde eenheid: 1 km = 100 000 cm."

### 7.4 Bewerkingen (`bewerkingen`)

Six topics: the order of operations, the properties (split in two: swapping and grouping, and
distributing), then the smart-calculation strategies of main spec §5.9. The worked examples are
the explanations of §5.8, §5.9 and §5.11.

1. **`orderOfOperations` — Volgorde van bewerkingen** (summary: `Haakjes, machten, × en :, + en −`)
   - Table `Stap | Wat`: `1 | haakjes`, `2 | machten`, `3 | × en :, van links naar rechts`,
     `4 | + en −, van links naar rechts`.
   - Text: × and : are equally strong, as are + and −. The mnemonic "Meneer Van Dale Wacht Op
     Antwoord" misleads: it puts × before :.
   - Worked: `3 × (8 − 2) + 4 = 3 × 6 + 4 = 18 + 4 = 22`, `24 : 4 × 2 = 6 × 2 = 12`,
     `20 − 8 + 2 = 12 + 2 = 14`, `(2 + 3)² − 4 × 5 = 5² − 4 × 5 = 25 − 20 = 5`.
   - Text: a negative base is written in parentheses: `(−4)² = 16`.
   - Worked `(−4)² − 10 = 16 − 10 = 6`.
   - Tip: "× en : zijn even sterk: reken die van links naar rechts."
2. **`swapGroup` — Commutatief en associatief** (summary: `Wisselen en anders groeperen`)
   - Table `Eigenschap | Wat mag | Voorbeeld`: `commutatief | de volgorde wisselen |
     38 + 57 + 62 = 38 + 62 + 57`, `associatief | de haakjes verschuiven |
     (17 + 25) + 75 = 17 + (25 + 75)`.
   - Text: both only hold for + and ×, never for − and :: `10 − 4 ≠ 4 − 10`,
     `(16 : 4) : 2 ≠ 16 : (4 : 2)`.
   - Worked: `25 × 37 × 4 = 25 × 4 × 37 = 100 × 37 = 3700`,
     `(17 + 25) + 75 = 17 + (25 + 75) = 17 + 100 = 117`, with text: look for a pair that makes
     100 or 1000.
   - Tip: "Wisselen en anders groeperen mag alleen bij + en ×, nooit bij − en :."
3. **`distributive` — Distributief** (summary: `Verdelen over + en −`)
   - Text: `a × (b + c) = a × b + a × c`, and the other way round (buiten haakjes brengen).
   - Worked: `7 × 98 = 7 × 100 − 7 × 2 = 700 − 14 = 686`,
     `6 × (40 + 3) = 6 × 40 + 6 × 3 = 240 + 18 = 258`,
     `7 × 13 + 7 × 87 = 7 × (13 + 87) = 7 × 100 = 700`.
   - Tip: "Pas één eigenschap per stap toe."
4. **`compensation` — Compenseren** (summary: `Rond af en verbeter`)
   - Text: make one number round, then correct for what you added or took off too much.
   - Worked: `398 + 247 = 400 + 247 − 2 = 647 − 2 = 645`,
     `5003 − 2998 = 5003 − 3000 + 2 = 2003 + 2 = 2005`, with text: you took off 2 too much, so
     add 2 back.
   - The same sums without rounding: worked `398 + 247, in stappen`:
     `398 + 247 = 398 + 200 + 47 = 598 + 47 = 645`; worked `5003 − 2998, door aan te vullen`:
     `2998 + 2 = 3000`, `3000 + 2003 = 5003`, `2 + 2003 = 2005`, with text: numbers close
     together, fill up from the smaller to the larger.
   - Tip: "398 = 400 − 2, dus compenseer met − 2, niet met + 2."
5. **`complement` — Aanvullen tot 100 en 1000** (summary: `Wat mist er nog`)
   - Text: count up from the smaller number to the round one.
   - Worked `1000 − 463`: `463 + 7 = 470`, `470 + 30 = 500`, `500 + 500 = 1000`,
     `7 + 30 + 500 = 537`.
   - Text, shortcut: the digits fill up to 9, the last one to 10: 463 → 537.
   - Tip: "Controleer door op te tellen: 463 + 537 = 1000."
6. **`splitting` — Handig vermenigvuldigen en delen** (summary: `× 25, × 50, × 125, : 4 en : 5`)
   - Table `Som | Handig`: `× 25 | : 4 × 100`, `× 50 | : 2 × 100`, `× 125 | : 8 × 1000`,
     `: 4 | : 2 : 2`, `: 8 | : 2 : 2 : 2`, `: 5 | × 2 : 10`, `: 25 | × 4 : 100`.
   - Worked: `48 × 25 = 48 : 4 × 100 = 12 × 100 = 1200`,
     `16 × 125 = 16 : 8 × 1000 = 2 × 1000 = 2000`, `72 : 4 = 72 : 2 : 2 = 36 : 2 = 18`,
     `340 : 5 = 340 × 2 : 10 = 680 : 10 = 68`.
   - Text, double and halve: when one factor ends in 5 and the other is even.
   - Worked `35 × 18 = 70 × 9 = 630`.
   - Tip: "Verdubbel de factor die op 5 eindigt en halveer de andere: 35 × 18 = 70 × 9."

### 7.5 Getalbegrip (`getalbegrip`)

Eight topics, in the order of the practice topics (main spec §5.15–§5.19); powers are split into
whole and decimal powers, negative exponents and roots. `10⁻³` cannot be parsed, so negative
exponents only appear in text and tables.

1. **`mentalOperations` — Hoofdrekenen met grote getallen** (summary: `Rijgen en rekenen met nullen`)
   - Text: add or subtract in steps, the largest part first.
   - Worked: `6347 + 2800 = 6347 + 2000 + 800 = 8347 + 800 = 9147`,
     `15 213 − 470 = 15 213 − 400 − 70 = 14 813 − 70 = 14 743`.
   - Text: or split both numbers; worked
     `6347 + 2800 = 6000 + 2000 + 347 + 800 = 8000 + 1147 = 9147`.
   - Text: multiply: the table fact, then the zeros. Divide: strike equal zeros first.
   - Worked: `28 × 500 = 28 × 5 × 100 = 140 × 100 = 14 000`, `7200 : 80 = 720 : 8 = 90`.
   - Tip: "Streep bij delen evenveel nullen weg in beide getallen."
2. **`remainder` — Delen met rest** (summary: `Naar boven, naar beneden of de rest`)
   - Worked `230 leerlingen, busjes van 8`: `230 = 28 × 8 + 6`, with text: 28 rest 6, the last 6
     need a bus too → 29.
   - Text: find the 28 by taking off big multiples of 8; worked
     `230 − 20 × 8 = 230 − 160 = 70`, `70 − 8 × 8 = 70 − 64 = 6`, with text: 20 + 8 = 28, rest 6.
   - Worked `200 eieren, dozen van 12`: `200 = 16 × 12 + 8`.
   - Table `Vraag | Antwoord`: `Hoeveel busjes nodig? | naar boven: 29`,
     `Hoeveel volle dozen? | naar beneden: 16`, `Hoeveel eieren over? | de rest: 8`.
   - Tip: "Moet wat overblijft ook mee, rond dan naar boven af."
3. **`negativeNumbers` — Negatieve getallen** (summary: `Door nul heen en de tekenregels`)
   - Text: crossing zero, split at zero.
   - Worked: `3 − 8 = 3 − 3 − 5 = −5`, `−7 + 12 = −7 + 7 + 5 = 5`.
   - Worked: `−4 − (−6) = −4 + 6 = 2`, `5 + (−8) = 5 − 8 = −3`.
   - Text, as money: € 3 and spend € 8 → € 5 debt, 3 − 8 = −5; taking away a debt of € 6 is
     € 6 more, −4 − (−6) = −4 + 6.
   - Table `× of : met | Uitkomst`: `twee positieve getallen | positief`,
     `twee negatieve getallen | positief`, `één negatief getal | negatief`.
   - Worked: `−6 × 4 = −24`, `−24 : (−3) = 8`.
   - Worked `Verschil tussen −7 °C en 4 °C`: `4 − (−7) = 4 + 7 = 11`.
   - Tip: "Min een negatief getal is plus: −4 − (−6) = −4 + 6."
4. **`rounding` — Afronden** (summary: `Het eerste cijfer dat wegvalt beslist`)
   - Text: 5 or more rounds up, less than 5 down. First name the two neighbours: 4386 ligt
     tussen 4300 en 4400; the first dropped digit is 8 → 4400.
   - Table `Getal | Afronden op | Uitkomst`: `4386 | tientallen | 4390`,
     `4386 | honderdtallen | 4400`, `48 512 | duizendtallen | 49 000`,
     `3970 | honderdtallen | 4000`, `12,5 | een heel getal | 13`, `3,746 | 1 decimaal | 3,7`,
     `2,96 | 1 decimaal | 3,0`, `0,385 | 2 decimalen | 0,39`.
   - Tip: "Alleen het eerste cijfer dat wegvalt telt: 3,746 op 1 decimaal is 3,7."
5. **`powers` — Machten** (summary: `Herhaald vermenigvuldigen`)
   - Worked: `2⁵ = 2 × 2 × 2 × 2 × 2 = 32`, `(−3)³ = (−3) × (−3) × (−3) = −27`.
   - Text: an even number of minus signs gives plus, an odd number minus. `7¹ = 7` and every
     number (except 0) to the power 0 is 1.
   - Worked: `0,3² = 0,3 × 0,3 = 0,09`, `0,2³ = 0,2 × 0,2 × 0,2 = 0,008`, with text: the result
     has as many decimals as all factors together.
   - Table `Macht | Uitkomst`: 2³ to 2¹⁰ (8 … 1024), 3³, 3⁴, 3⁵ (27, 81, 243).
   - Tip: "Een macht is herhaald vermenigvuldigen: 2⁵ = 2 × 2 × 2 × 2 × 2, niet 2 × 5."
6. **`negativeExponents` — Negatieve exponenten** (summary: `10⁻³ = 0,001`)
   - Text: `10⁻³ = 1 : 10³ = 1 : 1000 = 0,001`. Every step down is : 10.
   - Worked `1 : 10³ = 1 : 1000 = 0,001`.
   - Table `Macht | Getal`: `10³ | 1000`, `10² | 100`, `10¹ | 10`, `10⁰ | 1`, `10⁻¹ | 0,1`,
     `10⁻² | 0,01`, `10⁻³ | 0,001`, `10⁻⁶ | 0,000001`.
   - Text: the exponent counts the places the comma moves: `0,001 = 10⁻³` (3 places, not the
     2 zeros after the comma).
   - Tip: "Een negatieve exponent maakt geen negatief getal: 10⁻³ = 1 : 1000."
7. **`roots` — Wortels** (summary: `Derdemachtswortels en geschaalde wortels`)
   - Text: `∛64 = 4`, because 4 × 4 × 4 = 64.
   - Table `n | n³` for 2 to 10.
   - Text, estimating: 343 lies between `6³ = 216` and `8³ = 512`; of 6, 7 and 8 only 7³ ends
     in 3, so ∛343 = 7. Worked `7 × 7 × 7 = 49 × 7 = 343`.
   - Text: a root of a scaled square: √0,49 = 0,7 (half the decimals), √6400 = 80 (half the
     zeros).
   - Worked: `0,7 × 0,7 = 0,49`, `80 × 80 = 6400`, `120 × 120 = 14 400`.
   - Tip: "∛27 is het getal dat 3 keer met zichzelf vermenigvuldigd 27 geeft, niet 27 : 3."
8. **`scientificNotation` — Wetenschappelijke notatie** (summary: `Getal van 1 tot 10 keer een macht
   van 10`)
   - Text: `c × 10ⁿ` with `1 ≤ c < 10`. Count the places the comma moves: a number of 10 or
     more gets a positive exponent, a number below 1 a negative one.
   - Worked `4 500 000 = 4,5 × 1 000 000 = 4,5 × 10⁶`.
   - Worked `0,000045 = 4,5 × 0,00001`, with text: `0,00001 = 10⁻⁵`, so `4,5 × 10⁻⁵`.
   - Worked `450 × 10⁴ = 4,5 × 10² × 10⁴ = 4,5 × 10⁶`, with text: c gets 100 times smaller, so
     the exponent goes up by 2.
   - Tip: "Tel de plaatsen waarover de komma schuift, niet de nullen."

### 7.6 Breuken & kommagetallen (`breuken`)

Seven topics: converting (with the fractions to know by heart), then simplifying, the four
operations with fractions, part of a number, and decimals. The worked examples are the
explanations of main spec §5.20–§5.22. Mixed numbers cannot be parsed, so they only appear in
text and tables.

1. **`conversion` — Breuk, kommagetal en procent** (summary: `Omzetten via 10, 100 of 1000`)
   - Text: a fraction is a division (3/8 = 3 : 8). Make the denominator 10, 100 or 1000.
   - Worked: `3/8 = 375/1000 = 0,375`, `7/20 = 35/100 = 0,35`.
   - Text: or via a known fraction (1/8 = 0,125); worked `3/8 = 3 × 1/8 = 3 × 0,125 = 0,375`.
   - Text: or divide: 3 : 8 = 0,375 (30 : 8 = 3 rest 6, 60 : 8 = 7 rest 4, 40 : 8 = 5).
   - Text: procent means hundredth: × 100 to a percentage, : 100 back.
   - Worked: `0,375 × 100 = 37,5`, `37,5 : 100 = 0,375`.
   - Tip: "3/8 betekent 3 : 8, niet 3,8."
2. **`knownFractions` — Breuken om te kennen** (summary: `Van 1/2 tot 1/50, derden en zesden`)
   - Table `Breuk | Kommagetal | Procent`: 1/2, 1/4, 3/4, 1/5, 1/8, 3/8, 1/10, 1/20, 1/25, 1/50,
     then 1/3, 2/3, 1/6, 5/6 with `—` as decimal and `33 1/3%`, `66 2/3%`, `16 2/3%`,
     `83 1/3%`.
   - Text: thirds and sixths are no finite decimals (0,333…): via 100% : 3 = 33 1/3%, and
     5/6 = 5 × 16 2/3% = 83 1/3%.
   - Tip: "2/3 is geen eindig kommagetal: schrijf het als breuk."
3. **`simplify` — Vereenvoudigen en gelijknamig** (summary: `Teller en noemer met hetzelfde getal`)
   - Worked: `18/24 = 3/4` (text: teller en noemer : 6), `3/4 = 9/12` (teller en noemer × 3).
   - Worked `In kleine stappen: : 2, dan : 3`: `18/24 = 9/12 = 3/4`, with text: in one step you
     divide by the GGD of numerator and denominator, 6.
   - Text: to a mixed number, take out the wholes.
   - Worked `17/12 = 12/12 + 5/12 = 1 + 5/12`, with text: so 1 5/12.
   - Tip: "Vermenigvuldig of deel teller en noemer met hetzelfde getal; het verschil blijft niet
     gelijk."
4. **`addSubtract` — Optellen en aftrekken** (summary: `Eerst de noemers gelijk`)
   - Text: make the denominators equal (the KGV), then add or subtract the numerators only.
   - Worked: `2/3 + 1/4 = 8/12 + 3/12 = 11/12`, `2/3 + 3/4 = 8/12 + 9/12 = 17/12` (text: =
     1 5/12).
   - Text: the product of the denominators always works too, but often needs simplifying at the
     end. Worked `1/4 + 1/6, met het KGV en met het product`: `1/4 + 1/6 = 3/12 + 2/12 = 5/12`,
     `1/4 + 1/6 = 6/24 + 4/24 = 10/24 = 5/12`.
   - Text, mixed numbers keep their wholes; exchange one whole when the fraction is too small:
     3 1/2 − 1 3/4 = 3 2/4 − 1 3/4 = 2 6/4 − 1 3/4 = 1 3/4.
   - Text: or make improper fractions first (3 1/2 = 7/2, 1 3/4 = 7/4); worked
     `7/2 − 7/4 = 14/4 − 7/4 = 7/4`, with text: 7/4 = 1 3/4.
   - Tip: "Maak eerst de noemers gelijk; tel daarna alleen de tellers op."
5. **`multiplyDivide` — Vermenigvuldigen en delen** (summary: `Delen is keer het omgekeerde`)
   - Text: teller × teller and noemer × noemer; simplify at the end.
   - Worked: `3/4 × 2/5 = 6/20 = 3/10`, `6 × 2/3 = 12/3 = 4` (text: only the numerator goes
     × 6).
   - Worked: `2/3 : 4/9 = 2/3 × 9/4 = 18/12 = 3/2`, `3/4 : 3 = 3/4 × 1/3 = 3/12 = 1/4`.
   - Text: or make the denominators equal and divide the numerators only (4/9 fits in 6/9 as
     often as 4 in 6); worked `2/3 : 4/9 = 6/9 : 4/9 = 6 : 4 = 3/2`.
   - Tip: "Delen door 4/9 is keer het omgekeerde: × 9/4."
6. **`partOf` — Deel van een getal** (summary: `3/4 van 24 en terug naar het geheel`)
   - Worked `3/4 van 24`: `24 : 4 = 6`, `3 × 6 = 18`, with text: first 1/4, then 3/4.
   - Text: or first × 3, then : 4; worked `3 × 24 : 4 = 72 : 4 = 18`.
   - Worked `3/4 is 18, het geheel`: `18 : 3 = 6`, `4 × 6 = 24`, with text: 1/4 = 6, 4/4 = 24.
   - Tip: "Is 18 zelf al 3/4, reken dan terug: eerst 1/4, dan 4/4."
7. **`decimals` — Rekenen met kommagetallen** (summary: `Komma's onder elkaar, decimalen tellen`)
   - Text: add and subtract with the commas aligned; fill up with zeros.
   - Worked: `4,70 + 0,35 = 5,05`, `5,00 − 0,25 = 4,75`.
   - Text: multiply without commas, then give the result as many decimals as both numbers
     together.
   - Worked `0,3 × 0,4`: `3 × 4 = 12`, `0,3 × 0,4 = 0,12`.
   - Text: or with fractions; worked `0,3 × 0,4 = 3/10 × 4/10 = 12/100 = 0,12`.
   - Text: divide by a decimal: make the divisor whole first, both × the same power of 10.
   - Worked: `2,5 : 0,05 = 250 : 5 = 50`, `0,36 : 4 = 0,09` (text: 36 : 4 = 9).
   - Tip: "De uitkomst heeft evenveel decimalen als beide getallen samen."

### 7.7 Meetkunde (`meetkunde`)

Nine topics: flat figures (perimeter and area, the circle), solids, Pythagoras, angles, the
clock, symmetry, quadrilaterals and triangles. The worked examples are the explanations of main
spec §5.27–§5.31, the facts those of §5.31–§5.32. Formulas with letters go in tables; worked
lines hold numbers only.

1. **`perimeterArea` — Omtrek en oppervlakte** (summary: `Vierkant, rechthoek, driehoek, trapezium`)
   - Table `Figuur | Oppervlakte | Omtrek`: `vierkant | z × z | 4 × z`,
     `rechthoek | l × b | 2 × (l + b)`, `driehoek | basis × hoogte : 2 | de zijden samen`,
     `parallellogram | basis × hoogte | 2 × (basis + schuine zijde)`,
     `trapezium | (a + b) : 2 × hoogte | de zijden samen`.
   - Text: the height is perpendicular to the base; a slanted side is not the height.
   - Worked: `8 × 5 : 2 = 20` (driehoek, basis 8, hoogte 5), `2 × (12 + 5) = 2 × 17 = 34`
     (omtrek rechthoek 12 bij 5), `(6 + 10) : 2 × 4 = 8 × 4 = 32` (trapezium).
   - Text: or split the trapezium into a rectangle 6 by 4 and two triangles with together base
     10 − 6 = 4 and height 4; worked `6 × 4 + 4 × 4 : 2 = 24 + 8 = 32`.
   - Worked `Tafelblad 1,6 m bij 80 cm, in m²`: `1,6 × 0,8 = 1,28`, with text: first 80 cm =
     0,8 m.
   - Text, a missing side: `48 : 6 = 8` (area 48, width 6), `34 : 2 − 5 = 12` (perimeter 34,
     one side 5), as worked lines.
   - Tip: "Een driehoek is de helft van een rechthoek: deel nog door 2."
2. **`circle` — De cirkel** (summary: `Straal, diameter en π = 3,14`)
   - Table `Wat | Formule`: `diameter | 2 × straal`, `omtrek | π × diameter`,
     `oppervlakte | π × straal × straal`.
   - Worked: `3,14 × 10 = 31,4` (omtrek, diameter 10), `3,14 × 5 × 5 = 3,14 × 25 = 78,5`
     (oppervlakte, straal 5).
   - Worked `Oppervlakte, diameter 10`: `10 : 2 = 5`, `3,14 × 5 × 5 = 78,5`.
   - Tip: "De straal is de helft van de diameter."
3. **`solids` — Ruimtefiguren** (summary: `Inhoud, oppervlakte en liters`)
   - Table `Figuur | Inhoud | Oppervlakte`: `kubus | z × z × z | 6 × z × z`,
     `balk | l × b × h | 2 × (l × b + l × h + b × h)`, `cilinder | π × straal × straal × hoogte |
     —`.
   - Worked: `8 × 5 × 3 = 40 × 3 = 120`,
     `2 × (8 × 5 + 8 × 3 + 5 × 3) = 2 × (40 + 24 + 15) = 2 × 79 = 158`,
     `3,14 × 5 × 5 × 4 = 3,14 × 100 = 314`.
   - Worked `Aquarium 60 bij 30 bij 40 cm, in liters`: `6 × 3 × 4 = 72`, with text: reken in dm,
     1 dm³ = 1 L.
   - Tip: "Reken liters in dm: 1 dm³ = 1 L."
4. **`pythagoras` — Stelling van Pythagoras** (summary: `Kwadraten optellen of aftrekken`)
   - Text: in a right-angled triangle the square of the schuine zijde (the longest side, opposite
     the right angle) is the sum of the squares of the rechthoekszijden.
   - Worked `Schuine zijde bij 6 en 8`: `6² + 8² = 36 + 64 = 100`, with text: √100 = 10.
   - Worked `Rechthoekszijde bij 13 en 5`: `13² − 5² = 169 − 25 = 144`, with text: √144 = 12.
   - Table `a | b | c` with the triples of §5.29: 3 4 5, 6 8 10, 9 12 15, 12 16 20, 15 20 25,
     5 12 13, 8 15 17, 7 24 25.
   - Tip: "Tel de kwadraten op voor de schuine zijde, trek ze af voor een rechthoekszijde, en
     neem daarna de wortel."
5. **`angles` — Hoeken** (summary: `Driehoek en veelhoek`)
   - Text: the angles of a triangle add up to 180°; an isosceles triangle has two equal base
     angles.
   - Worked: `180 − 50 − 70 = 60`, `(180 − 40) : 2 = 70`, `180 − 2 × 70 = 40`.
   - Text: an n-hoek splits into n − 2 triangles.
   - Worked: `(6 − 2) × 180 = 720`, `(8 − 2) × 180 : 8 = 135` (regelmatige achthoek).
   - Text, via the exterior angle: walking round the figure you turn 360° in total, every turn
     equal in a regular polygon, and interior + exterior angle = 180°. Worked `Regelmatige
     achthoek, via de buitenhoek`: `360 : 8 = 45`, `180 − 45 = 135`.
   - Table `Veelhoek | Samen | Eén hoek, regelmatig`: vierhoek 360° 90°, vijfhoek 540° 108°,
     zeshoek 720° 120°, achthoek 1080° 135°, tienhoek 1440° 144°, twaalfhoek 1800° 150°.
   - Tip: "Een zeshoek kun je verdelen in 6 − 2 = 4 driehoeken: 4 × 180°."
6. **`clock` — De klok** (summary: `Elk uur is 30°`)
   - Worked: `360 : 12 = 30`, `4 × 30 = 120` (om 4 uur).
   - Text: at half past, the big hand is on the 6 and the small hand halfway between two hours.
     Om half 4 (3:30) it is halfway between the 3 and the 4: 2,5 hours from the 6.
   - Worked `Om half 4`: `2,5 × 30 = 75`.
   - Text, via the minutes: the big hand turns 6° per minute, the small one 0,5°; both
     positions from the 12, then subtract. Worked `Om half 4, via de minuten`: `30 × 6 = 180`,
     `3 × 30 + 30 × 0,5 = 90 + 15 = 105`, `180 − 105 = 75`.
   - Text: past 6, count the other way round the clock: om 9 uur 3 × 30 = 90.
   - Tip: "Om half 4 staat de kleine wijzer halverwege de 3 en de 4."
7. **`symmetry` — Symmetrie** (summary: `Spiegelen, draaien en puntsymmetrie`)
   - Text: a symmetrieas folds the figure onto itself; draaisymmetrie: the smallest turn that
     makes it fall onto itself; puntsymmetrisch: a half turn (180°) does.
   - Table `Figuur | Assen | Draaihoek | Puntsymmetrisch`, the rows of §5.31 with short names (rechthoek
     (geen vierkant), …) and `ja` / `nee`.
   - Worked `Regelmatige vijfhoek`: `360 : 5 = 72`.
   - Tip: "Een regelmatige n-hoek heeft n symmetrieassen en een draaihoek van 360° : n; hij is
     puntsymmetrisch als n even is."
8. **`quadrilaterals` — Vierhoeken** (summary: `Eigenschappen en wie is wat`)
   - Text: the definitions are inclusive: a trapezium has at least one pair of parallel sides,
     a vlieger a diagonal that is a symmetrieas. X is a Y when X always has every property of Y.
   - Table `Figuur | Altijd`, per quadrilateral its properties from the table in §5.32, in
     short words.
   - Table `Figuur | Is ook een`: `vierkant | rechthoek, ruit, parallellogram, trapezium,
     vlieger`, `rechthoek | parallellogram, trapezium`, `ruit | parallellogram, trapezium,
     vlieger`, `parallellogram | trapezium`, `trapezium | —`, `vlieger | —`.
   - Tip: "Elk vierkant is ook een rechthoek en een ruit."
9. **`triangles` — Driehoeken** (summary: `Soorten en welke bestaan`)
   - Table `Soort | Betekent`: `scherphoekig | alle hoeken kleiner dan 90°`,
     `rechthoekig | één hoek van 90°`, `stomphoekig | één hoek groter dan 90°`,
     `gelijkbenig | minstens twee zijden even lang`, `gelijkzijdig | drie zijden even lang,
     alle hoeken 60°`.
   - Text: the angles add up to 180°, so at most one right or obtuse angle. Every gelijkzijdige
     driehoek is gelijkbenig.
   - Text: the two shortest sides together must be longer than the longest: 2, 3 en 6 cm no;
     3, 4 en 6 cm yes.
   - Tip: "De twee kortste zijden samen moeten langer zijn dan de langste."

### 7.8 Verbanden & statistiek (`verbanden`)

Seven topics in the order of the practice topics (main spec §5.33–§5.38), statistics split into
the mean and the other measures. The first methods are the explanations of those sections, the
tips repeat their tip texts (§3.4.1). Letters cannot be parsed, so formulas and equations with
`x` go in text and tables; worked lines hold the arithmetic and the check.

1. **`mean` — Gemiddelde** (summary: `Alles optellen, delen door het aantal`)
   - Text: add all values, divide by how many there are.
   - Worked `Cijfers 8, 9, 6, 9, 8`: `(8 + 9 + 6 + 9 + 8) : 5 = 40 : 5 = 8`.
   - Text, via a guess: pick a round guess, write each value as its difference from the guess,
     and share the total difference out.
   - Worked `Cijfers 8, 9, 6, 9, 8, vanaf 7`: `7 + (1 + 2 − 1 + 2 + 1) : 5 = 7 + 5 : 5 = 8`.
   - Worked `Gemiddeld een 7 bij 4 cijfers, je hebt 6, 8 en 5`: `4 × 7 = 28`,
     `28 − 6 − 8 − 5 = 9`, with text: the total must be 28.
   - Worked `Hetzelfde, vanaf 7`: `7 − (−1 + 1 − 2) = 7 + 2 = 9`, with text: 6, 8 and 5 are
     together 2 below 7, so the last one must be 2 above it.
   - Tip: "Deel de som nog door het aantal getallen."
2. **`median` — Mediaan, modus en spreidingsbreedte** (summary: `Eerst op volgorde`)
   - Table `Maat | Wat`: `mediaan | het middelste getal op volgorde`,
     `modus | het getal dat het vaakst voorkomt`,
     `spreidingsbreedte | hoogste − laagste`.
   - Table `Getallen | Op volgorde | Mediaan`:
     `4, −2, 3, 0, 5, 1, −4 | −4, −2, 0, 1, 3, 4, 5 | 1`,
     `8, 6, 10, 7, 5, 9 | 5, 6, 7, 8, 9, 10 | 7,5`.
   - Worked `Twee middelste getallen 7 en 8`: `(7 + 8) : 2 = 7,5`, with text: an even number of
     values has two middle ones; the mediaan is their mean.
   - Text, without sorting everything: strike the lowest and the highest, again and again, until
     one or two are left.
   - Text: modus of 2, 0, 3, 1, 2 is 2 (2 keer).
   - Worked `Spreidingsbreedte van −4 °C tot 5 °C`: `5 − (−4) = 5 + 4 = 9`.
   - Tip: "Zet de getallen eerst op volgorde; de mediaan is het middelste getal."
3. **`percentagePoints` — Procentpunten** (summary: `Verschil tussen twee percentages`)
   - Text: the difference of two percentages is in procentpunten; the change as a percentage of
     the old percentage is in procent.
   - Worked `De rente gaat van 4% naar 5%`: `5 − 4 = 1`, `1 : 4 = 25/100`, with text:
     1 procentpunt, 25% stijging.
   - Worked `De rente is 4% en stijgt met 25%`: `4 : 4 = 1`, `4 + 1 = 5`, with text: 25% of 4 is
     1 procentpunt, so 5%.
   - Worked `Hetzelfde, in één keer`: `4 × 5/4 = 5`, with text: you get 125% of 4, that is 5/4.
   - Table `Van | Naar | Procentpunt | Procent`: `4% | 5% | 1 | 25% stijging`,
     `8% | 6% | 2 | 25% daling`, `50% | 75% | 25 | 50% stijging`.
   - Tip: "Procentpunten is het verschil tussen de percentages: 5 − 4 = 1."
4. **`sequences` — Rijen** (summary: `Het volgende en het n-de getal`)
   - Text: a rekenkundige rij adds the same number each time, a meetkundige rij multiplies by the
     same number.
   - Worked: `15 + 4 = 19` (3, 7, 11, 15), `24 × 2 = 48` (3, 6, 12, 24), `20 : 2 = 10`
     (160, 80, 40, 20).
   - Worked `20e getal van 3, 7, 11, 15`: `3 + 19 × 4 = 3 + 76 = 79`, with text: from the 1st to
     the 20th are 19 steps.
   - Text, via the 0th term: the number before the first is 3 − 4 = −1, so the 20th is −1 plus
     20 steps; worked `−1 + 20 × 4 = −1 + 80 = 79`.
   - Table `n | Driehoeksgetal | Kwadraatgetal` for 1 to 8.
   - Worked `8e driehoeksgetal`: `1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 = 8 × 9 : 2 = 36`;
     `15e kwadraatgetal`: `15 × 15 = 225`.
   - Tip: "Van het 1e naar het 20e getal zijn 19 stappen, geen 20."
5. **`formulas` — Formules** (summary: `Invullen, hellingsgetal en startgetal`)
   - Text: substitute the number, then follow the order of operations; `3x` means `3 × x`.
   - Worked `Taxi: 4 + 2,50 × aantal km, 12 km`: `4 + 2,50 × 12 = 4 + 30 = 34`.
   - Worked `y = 3x − 4 bij x = −2`: `3 × (−2) − 4 = −6 − 4 = −10`.
   - Text: in the table of a formula `y = ax + b` y changes by the same amount at each step of x;
     the hellingsgetal is that change per 1, the startgetal is y at x = 0.
   - Table `x | y`: `2 | 11`, `4 | 17`, `6 | 23`, `8 | 29`.
   - Worked `Hellingsgetal`: `(17 − 11) : (4 − 2) = 6 : 2 = 3`.
   - Worked `Startgetal`: `11 − 2 × 3 = 11 − 6 = 5`, with text: from x = 2 back to x = 0 is
     2 steps of 3; the formula is y = 3x + 5.
   - Text: or extend the table backwards: x = 0 is one x-step of 2 before x = 2, so y goes
     6 down: 11 − 6 = 5.
   - Tip: "Het startgetal is y bij x = 0, niet bij de eerste x van de tabel."
6. **`equations` — Vergelijkingen** (summary: `Aan beide kanten hetzelfde doen`)
   - Text: the balance: do the same on both sides until x is alone.
   - Table `Stap | Vergelijking`: `begin | 3x + 5 = 20`, `− 5 | 3x = 15`, `: 3 | x = 5`.
   - Worked: `20 − 5 = 15`, `15 : 3 = 5`, and the check `3 × 5 + 5 = 15 + 5 = 20`.
   - Text, by working backwards: x goes × 3 and + 5 to 20; undo from the end: 20 − 5 = 15,
     15 : 3 = 5 (the Heuristieken lesson, terugrekenen).
   - Table `Stap | Vergelijking` with brackets: `begin | 4(x − 2) = 12`, `: 4 | x − 2 = 3`,
     `+ 2 | x = 5`; worked `12 : 4 = 3`, `3 + 2 = 5`.
   - Text, or first remove the brackets: 4x − 8 = 12, 4x = 20; worked `12 + 8 = 20`,
     `20 : 4 = 5`.
   - Table `Stap | Vergelijking`, x on both sides: `begin | 5x + 3 = 2x + 18`,
     `− 2x | 3x + 3 = 18`, `− 3 | 3x = 15`, `: 3 | x = 5`; worked check
     `5 × 5 + 3 = 28 = 2 × 5 + 18`.
   - Tip: "Doe aan beide kanten hetzelfde: haal 5 weg, dan 3x = 20 − 5."
7. **`probability` — Kans** (summary: `Gunstig gedeeld door mogelijk`)
   - Text: with equally likely outcomes the kans is the number of outcomes you want divided by
     all outcomes; it lies between 0 and 1.
   - Worked `Even getal met een dobbelsteen`: `3/6 = 1/2`, with text: 2, 4 and 6 out of 6.
   - Table `Gebeurtenis | Kans`, the die events of main spec §5.38.
   - Worked `3 rode, 5 blauwe en 2 groene knikkers, kans op blauw`:
     `5 : (3 + 5 + 2) = 5 : 10 = 1/2`.
   - Worked `Kans op niet rood`: `(5 + 2) : 10 = 7/10`.
   - Worked `Kans op niet rood, via rood`: `1 − 3/10 = 7/10`, with text: rood and niet rood
     together are certain, kans 1.
   - Tip: "Deel door het totaal aantal knikkers: 3 + 5 + 2 = 10."

### 7.9 Talstelsels (`talstelsels`)

Three topics: to a plain number, from a plain number, Roman numerals. The first methods are the
explanations of main spec §5.39–§5.40. Digits of another base and Roman numerals cannot be
parsed: they go in titles, text and tables; worked lines hold their decimal values.

1. **`toDecimal` — Naar een gewoon getal** (summary: `Cijfer keer plaatswaarde`)
   - Text: like the tientallig stelsel, but every place to the left is × the grondtal instead of
     × 10. Base b uses the digits 0 to b − 1; zestientallig uses A to F for 10 to 15.
   - Table `Stelsel | Plaatswaarden, van rechts`: `tientallig | 1, 10, 100, 1000`,
     `tweetallig (binair) | 1, 2, 4, 8, 16, 32`, `vijftallig | 1, 5, 25, 125`,
     `zestientallig (hexadecimaal) | 1, 16, 256`.
   - Table `Cijfer | Waarde`: A 10 to F 15.
   - Worked `Tweetallig 1011`: `1 × 8 + 0 × 4 + 1 × 2 + 1 × 1 = 8 + 2 + 1 = 11`;
     `Vijftallig 243`: `2 × 25 + 4 × 5 + 3 × 1 = 50 + 20 + 3 = 73`;
     `Zestientallig B4, B = 11`: `11 × 16 + 4 × 1 = 176 + 4 = 180`.
   - Text, from left to right: multiply by the grondtal and add the next digit.
   - Worked `Tweetallig 1011, van links naar rechts`:
     `((1 × 2 + 0) × 2 + 1) × 2 + 1 = (2 × 2 + 1) × 2 + 1 = 5 × 2 + 1 = 11`;
     `Vijftallig 243, van links naar rechts`: `(2 × 5 + 4) × 5 + 3 = 14 × 5 + 3 = 73`.
   - Tip: "Begin rechts met plaatswaarde 1; elke plaats naar links is keer het grondtal."
2. **`fromDecimal` — Vanuit een gewoon getal** (summary: `De grootste plaatswaarde eerst`)
   - Text: take the largest place value that fits, as often as it fits, and go on with the rest;
     a place where nothing fits gets a 0.
   - Worked `11 tweetallig`: `11 = 8 + 2 + 1 = 1 × 8 + 0 × 4 + 1 × 2 + 1 × 1`, with text: 1011.
   - Worked `73 vijftallig`: `73 = 2 × 25 + 23 = 2 × 25 + 4 × 5 + 3`, with text: 243.
   - Worked `180 zestientallig`: `180 = 11 × 16 + 4`, with text: 11 = B, so B4.
   - Text, by dividing: divide by the grondtal again and again; the remainders, read from the
     last to the first, are the digits.
   - Worked `73 vijftallig, door te delen`: `73 = 14 × 5 + 3`, `14 = 2 × 5 + 4`, with text:
     2 : 5 = 0 rest 2; the remainders from bottom to top give 243.
   - Tip: "Een plaats waar niets in past krijgt een 0: 8 is tweetallig 1000."
3. **`romanNumerals` — Romeinse cijfers** (summary: `Zeven tekens en de aftrekregel`)
   - Table `Teken | Waarde`: I 1, V 5, X 10, L 50, C 100, D 500, M 1000.
   - Text: write per decimal place from high to low; at most three equal symbols in a row. A
     smaller symbol before a larger one is subtracted, only in these six pairs:
   - Table `Paar | Waarde`: IV 4, IX 9, XL 40, XC 90, CD 400, CM 900.
   - Worked `MCMXCIV = M + CM + XC + IV`: `1000 + 900 + 90 + 4 = 1994`.
   - Text, symbol by symbol: read from the left; subtract a symbol when the next one is larger,
     otherwise add it.
   - Worked `MCMXCIV, teken voor teken`: `1000 − 100 + 1000 − 10 + 100 − 1 + 5 = 1994`.
   - Worked `2024 met Romeinse cijfers`: `2024 = 2000 + 20 + 4`, with text: MM + XX + IV =
     MMXXIV.
   - Tip: "Een kleiner teken vóór een groter teken trek je af: IV = 4, niet 6."

### 7.10 Heuristieken (`heuristieken`)

Five topics, one per heuristic of main spec §5.41–§5.44, with Vereenvoudigen split into sums and
counting, and figure patterns. The first methods are the explanations of those sections, the
tips repeat or generalise their tip texts (§3.4.1). Worked lines hold numbers only (no `€`).

1. **`systematicCounting` — Systematisch tellen** (summary: `Combinaties, handdrukken en volgordes`)
   - Text: when every choice goes with every other choice, multiply.
   - Table `Broek | Combinaties`, the systematic list: `broek 1 | trui 1, 2, 3 of 4`, the same
     for broek 2 and 3, with text: 3 rows of 4.
   - Worked `3 broeken en 4 truien`: `3 × 4 = 12`; `menu met 3, 4 en 2 gerechten`:
     `3 × 4 × 2 = 24`.
   - Worked `6 gasten geven elkaar een hand`: `6 × 5 : 2 = 30 : 2 = 15`, with text: every guest
     shakes 5 hands, but so every handshake counts twice.
   - Worked `Hetzelfde, alleen nieuwe handdrukken`: `5 + 4 + 3 + 2 + 1 = 15`, with text: the 1st
     guest shakes 5 hands, the 2nd 4 new ones, and so on.
   - Worked `4 kinderen in een rij`: `4 × 3 × 2 × 1 = 24`; `podium uit 6 kinderen`:
     `6 × 5 × 4 = 120`.
   - Table `Rij van 3 kinderen`, the systematic list: ABC, ACB, BAC, BCA, CAB, CBA, with text:
     6 = 3 × 2 × 1.
   - Tip: "Past elke keuze bij elke andere keuze, vermenigvuldig dan: 3 × 4, niet 3 + 4."
2. **`workingBackwards` — Terugrekenen** (summary: `Van het eind naar het begin`)
   - Text: start at the end, undo every operation in reverse order.
   - Table `Bewerking | Terug`: `keer 3 | delen door 3`, `delen door 2 | keer 2`,
     `7 erbij | 7 eraf`, `de helft uitgeven | keer 2`, `een kwart uitgeven | : 3 × 4`.
   - Worked `Keer 3, plus 7, gedeeld door 2 geeft 14`: `14 × 2 = 28`, `28 − 7 = 21`,
     `21 : 3 = 7`, and the check `(7 × 3 + 7) : 2 = 28 : 2 = 14`.
   - Text, by trying (slim proberen): try a number and adjust.
   - Worked `Hetzelfde, proberen`: `(5 × 3 + 7) : 2 = 22 : 2 = 11`, with text: too small, try a
     larger number; then the check line with 7.
   - Worked `De helft aan kleren, € 6 aan een lunch, € 9 over`: `9 + 6 = 15`, `15 × 2 = 30`.
   - Worked `Eerst € 6, dan de helft van wat je over hebt, € 9 over`: `9 × 2 = 18`,
     `18 + 6 = 24`, with text: the order matters.
   - Worked `Een derde aan kleren, dan € 5 aan een lunch, € 15 over`: `15 + 5 = 20`,
     `20 : 2 × 3 = 30`, with text: after spending een derde, € 20 is 2/3 of what you had.
   - Tip: "Werk van achter naar voren en doe telkens het omgekeerde: × wordt :, + wordt −."
3. **`guessAndCheck` — Slim proberen** (summary: `Gok, controleer en verbeter`)
   - Text: make a guess, see how far off it is, and work out what one change does.
   - Table `Kippen | Konijnen | Poten`, trying step by step: `10 | 0 | 20`, `8 | 2 | 24`,
     `6 | 4 | 28`.
   - Worked `10 koppen en 28 poten, eerst allemaal kippen`: `10 × 2 = 20`, `28 − 20 = 8`,
     `8 : 2 = 4`, with text: every konijn has 2 legs more, so 4 konijnen and 6 kippen; check
     `6 × 2 + 4 × 4 = 12 + 16 = 28`.
   - Worked `Samen 50, verschil 14`: `50 : 2 = 25`, `14 : 2 = 7`, `25 + 7 = 32`, `25 − 7 = 18`,
     with text: start at two equal numbers, move each half the difference.
   - Worked `Hetzelfde, eerst het verschil eraf`: `(50 − 14) : 2 = 36 : 2 = 18`,
     `18 + 14 = 32`.
   - Tip: "Lees wat gevraagd is: de konijnen of de kippen, het grootste of het kleinste getal."
4. **`simplifySums` — Vereenvoudigen: optellen en tellen** (summary: `Eerst een klein geval`)
   - Text: try the same question with small numbers, see the pattern, then use it.
   - Worked `1 + 2 + 3 + 4, in paren`: `1 + 4 + 2 + 3 = 2 × 5 = 10`.
   - Worked `1 tot en met 40, in paren`: `20 × 41 = 820`, with text: 1 + 40, 2 + 39, … are 20
     pairs of 41.
   - Worked `1 tot en met 40, via het gemiddelde`: `(1 + 40) : 2 × 40 = 20,5 × 40 = 820`.
   - Worked `Van 37 tot en met 82`: `82 − 37 + 1 = 46`, with text: small case, 3 tot en met 5 is
     3 numbers, not 5 − 3 = 2.
   - Worked `Hetzelfde, door weg te laten`: `82 − 36 = 46`, with text: 1 to 82, without 1 to 36.
   - Worked `Deelbaar door 7 tot en met 100`: `14 × 7 = 98`, `15 × 7 = 105`, with text: 105 is
     too big, so 14.
   - Worked `Pad van 40 m, om de 5 m een paaltje`: `40 : 5 = 8`, `8 + 1 = 9`, with text: small
     case, 10 m has 2 pieces and 3 paaltjes.
   - Tip: "Tel het begin en het eind allebei mee: van 37 tot en met 82 zijn 82 − 37 + 1 getallen."
5. **`figurePatterns` — Vereenvoudigen: figuurpatronen** (summary: `Hoeveel komt er per figuur bij`)
   - Table `Figuur | Lucifers` (vierkantjes): `1 | 4`, `2 | 7`, `3 | 10`, `20 | 61`.
   - Worked `Figuur 20`: `4 + 19 × 3 = 4 + 57 = 61`, with text: 3 more per figure, 19 steps.
   - Text, via figuur 0: the figure before figuur 1 would have 4 − 3 = 1 lucifer; worked
     `1 + 20 × 3 = 1 + 60 = 61`.
   - Worked `Welke figuur heeft 61 lucifers`: `(61 − 4) : 3 + 1 = 57 : 3 + 1 = 20`.
   - Table `Patroon | Erbij per figuur | Figuur 1`: `vierkantjes van lucifers | 3 | 4`,
     `driehoekjes van lucifers | 2 | 3`, `tafels met stoelen | 2 | 4`.
   - Tip: "Van figuur 1 naar figuur 20 zijn 19 stappen, geen 20."

## 8. Open assumptions

- **Block types:** `text`, `worked`, `table` and `tip` are assumed to be enough. A bullet list
  is left out until a lesson needs it.
