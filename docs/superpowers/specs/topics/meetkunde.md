# Meetkunde: topics

Part of the design spec (`../2026-10-05-rekenhulp-design.md`, §5). The § numbers are those of the
spec; its §5 holds the index and the rules shared by several sets.

### Meetkunde (§5.27–§5.32)

The set Meetkunde (v2). Figures are described in words; there are no pictures. Its card (§3.1)
reads "Omtrek, oppervlakte, inhoud, hoeken en vormen". Circles and cylinders use `π = 3,14`,
said in the prompt (`Neem π = 3,14.`). Answers with a unit show it as the suffix (§6): `cm`,
`cm²`, `cm³`, `m`, `m²`, `L` or `°`. The longest prompts (up to about 140 characters: the `symmetry`
rotation and the `pythagoras` walk) use the small size of §3.3; they were checked on a phone
(2026-10-25).

### 5.27 Perimeter and area (`perimeterArea`)

There are three forms, each picked with equal probability:

| Form         | Example                                                                                       | Answer | Suffix |
|--------------|-----------------------------------------------------------------------------------------------|--------|--------|
| Area         | `Een driehoek heeft een basis van 8 cm en een hoogte van 5 cm. Hoe groot is de oppervlakte?`  | 20     | `cm²`  |
| Perimeter    | `Een rechthoek is 12 cm lang en 5 cm breed. Hoe groot is de omtrek?`                          | 34     | `cm`   |
| Missing side | `Een rechthoek heeft een oppervlakte van 48 cm² en is 6 cm breed. Hoe lang is de rechthoek?`  | 8      | `cm`   |

- **Figures**, in cm, each equally likely within the form:

  | Figure         | Given                                                                                      | Area                 | Perimeter      |
  |----------------|--------------------------------------------------------------------------------------------|----------------------|----------------|
  | vierkant       | side `z ∈ [2, 25]`                                                                         | `z × z`              | `4 × z`        |
  | rechthoek      | length `l ∈ [3, 40]`, width `b ∈ [2, 12]`, `b < l`                                         | `l × b`              | `2 × (l + b)`  |
  | driehoek       | base and height in `[2, 20]` with an even product; or (50%) the two legs of a right-angled triangle | `b × h : 2`  | —              |
  | parallellogram | base in `[3, 20]`, height `h ∈ [2, 12]`, slanted sides in `[h + 1, 20]`, all three given   | `b × h`              | `2 × (b + s)`  |
  | trapezium      | parallel sides `a ≠ b` in `[2, 20]` with `a + b` even, height in `[2, 12]`                 | `(a + b) : 2 × h`    | —              |
  | cirkel         | radius `r ∈ {1, 2, 3, 4, 5, 10}`, given as the radius or (50%) as the diameter              | `3,14 × r × r`       | `3,14 × d`     |

- Prompts: `Een rechthoekige driehoek heeft rechthoekszijden van 6 cm en 9 cm.`, `Een parallellogram
  heeft een basis van 8 cm, schuine zijden van 5 cm en een hoogte van 4 cm.`, `Een trapezium heeft
  evenwijdige zijden van 6 cm en 10 cm en een hoogte van 4 cm.`, `Een cirkel heeft een diameter
  van 10 cm. Hoe groot is de omtrek? Neem π = 3,14.` The parallelogram always gives all three
  lengths, so the area needs the height and the perimeter the sides.
- **Mixed units:** 25% of the area and perimeter exercises are a rectangle in a context, with the
  length in m and the width in cm, asked in m or m²: `Een tafelblad is 1,6 m lang en 80 cm breed.
  Hoe groot is de oppervlakte in m²?` (1,28). The length is in `[1; 3]` m with at most 1 decimal,
  the width a multiple of 10 cm in `[30, 90]`. Contexts, each equally likely: tafelblad,
  vloerkleed, raam.
- **Missing side**, four variants, each equally likely: a rectangle from its area and width
  (`l = A : b`), a rectangle from its perimeter and one side (`P : 2 − b`), a square from its
  perimeter (`P : 4`) and a square from its area (`√A`). The ranges are those of the figure table.
- Answers have at most 2 decimals (circles and mixed units).
- Explanation: the formula with the numbers, after a conversion step where needed:
  `8 × 5 : 2 = 20`, `2 × (12 + 5) = 34`, `(6 + 10) : 2 × 4 = 32`, `3,14 × 5 × 5 = 78,5`,
  `straal = 10 : 2 = 5 → 3,14 × 5 × 5 = 78,5`, `diameter = 2 × 5 = 10 → 3,14 × 10 = 31,4`,
  `80 cm = 0,8 m → 1,6 × 0,8 = 1,28`, `48 : 6 = 8`, `34 : 2 − 5 = 12`, `36 : 4 = 9`,
  `√144 = 12`.
- The de-duplication key is the form, the figure and the numbers.

### 5.28 Solids (`solids`)

There are three forms:

| Form                 | Example                                                                                       | Answer | Suffix |
|----------------------|-----------------------------------------------------------------------------------------------|--------|--------|
| Volume (50%)         | `Een balk is 8 cm lang, 5 cm breed en 3 cm hoog. Hoe groot is de inhoud?`                     | 120    | `cm³`  |
| Surface area (25%)   | `Een kubus heeft ribben van 4 cm. Hoe groot is de oppervlakte?`                               | 96     | `cm²`  |
| Litres (25%)         | `Een aquarium is 60 cm lang, 30 cm breed en 40 cm hoog. Hoeveel liter water past erin?`       | 72     | `L`    |

- **Volume:** a cube, a box or a cylinder, each equally likely. **Surface area:** a cube or a box
  (50%). The cylinder has no surface-area exercises: `2πr² + 2πrh` is too much mental work.
- Cube: edge `z ∈ [2, 10]`, volume `z × z × z`, surface area `6 × z × z`.
- Box: three different whole lengths, `l ∈ [3, 20]`, `b, h ∈ [2, 10]`, volume at most 2000.
  Surface area `2 × (l × b + l × h + b × h)`.
- Cylinder: radius `{1, 2, 5, 10}`, given as the radius or (50%) as the diameter, height a whole
  number in `[1, 10]`: `Een cilinder heeft een straal van 5 cm en een hoogte van 4 cm. Hoe groot is
  de inhoud? Neem π = 3,14.` Volume `3,14 × r × r × h`, at most 2 decimals.
- **Litres:** a box-shaped container with every length a multiple of 10 cm, so the volume is a
  whole number of litres. Contexts, each equally likely, with their ranges (length × width ×
  height): aquarium `[40, 100] × [30, 50] × [30, 60]`, koelbox `[40, 60] × [30, 40] × [30, 40]`,
  opbergbox `[40, 80] × [30, 50] × [20, 40]`. Prompts: `Hoeveel liter water past erin?`
  (aquarium), `Hoeveel liter past erin?` (koelbox, opbergbox).
- Explanation: `8 × 5 × 3 = 120`, `6 × 4 × 4 = 96`,
  `2 × (8 × 5 + 8 × 3 + 5 × 3) = 2 × 79 = 158`, `3,14 × 5 × 5 × 4 = 314` (diameter given:
  `straal = 10 : 2 = 5 → …`), and litres via dm:
  `60 cm = 6 dm, 30 cm = 3 dm, 40 cm = 4 dm → 6 × 3 × 4 = 72 dm³ = 72 L`.
- The de-duplication key is the form, the solid or context and the numbers.

### 5.29 Pythagoras (`pythagoras`)

- Triples: `(3, 4, 5)` and its multiples up to `(15, 20, 25)`, `(5, 12, 13)`, `(8, 15, 17)` and
  `(7, 24, 25)`. The hypotenuse is at most 25, so every square is in the range of §5.7.
- Two forms, each 50%: the hypotenuse, or a leg (either one, 50%).
- 50% bare in cm, 50% a context in m, each context equally likely:

  | Context     | Hypotenuse                                                                                   | Leg |
  |-------------|----------------------------------------------------------------------------------------------|-----|
  | bare        | `Een rechthoekige driehoek heeft rechthoekszijden van 6 cm en 8 cm. Hoe lang is de schuine zijde?` | `Een rechthoekige driehoek heeft een schuine zijde van 13 cm en een rechthoekszijde van 5 cm. Hoe lang is de andere rechthoekszijde?` |
  | schoolplein | `Een schoolplein is 20 m lang en 15 m breed. Hoe lang is de diagonaal?`                     | `Een schoolplein is 20 m lang en de diagonaal is 25 m. Hoe breed is het schoolplein?` |
  | wandelen    | `Je loopt 12 m naar het oosten en dan 5 m naar het noorden. Hoe ver ben je hemelsbreed van je beginpunt?` | `Je loopt 12 m naar het oosten en dan naar het noorden. Je bent nu hemelsbreed 13 m van je beginpunt. Hoeveel m liep je naar het noorden?` |

  The schoolplein is longer than it is wide and has a diagonal of at least 13 m. A ladder against a wall is left out: its realistic
  lengths do not fit the triples.
- Explanation: `6² + 8² = 36 + 64 = 100 → √100 = 10`, `13² − 5² = 169 − 25 = 144 → √144 = 12`.
- The de-duplication key is the form, the context and the sides.

### 5.30 Angles (`angles`)

There are four forms, each picked with equal probability. The suffix is `°`.

- **Triangle**, two variants, each 50%:
  - two angles given, multiples of 5, each at least 20, together at most 160: `Een driehoek heeft
    hoeken van 50° en 70°. Hoe groot is de derde hoek?` Explanation `180 − 50 − 70 = 60`.
  - isosceles: `Een gelijkbenige driehoek heeft een tophoek van 40°. Hoe groot is een
    basishoek?` (top angle a multiple of 10 in `[20, 160]`), or `Een gelijkbenige driehoek heeft
    basishoeken van 70°. Hoe groot is de tophoek?` (base angle a multiple of 5 in `[20, 85]`),
    each 50%. Explanation `(180 − 40) : 2 = 70`, `180 − 2 × 70 = 40`.
- **Angle sum** of a polygon, `n ∈ {4, 5, 6, 8, 10, 12}`, named (vierhoek, vijfhoek, zeshoek,
  achthoek, tienhoek, twaalfhoek): `Hoeveel graden zijn de hoeken van een zeshoek samen?`
  Explanation `(6 − 2) × 180 = 720`.
- **Regular polygon**, `n ∈ {5, 6, 8, 9, 10, 12}`: `Hoe groot is één hoek van een regelmatige
  achthoek?` Explanation `(8 − 2) × 180 : 8 = 135`.
- **Clock**, the smaller angle between the hands, whole or half hours (50%):
  `Hoe groot is de kleinste hoek tussen de wijzers om 4 uur?` (1 to 11 uur) and `… om half 4?`
  (half 1 to half 12; Dutch: half 4 is 3:30, so the hour hand is halfway between 3 and 4).
  Explanation: `elk uur op de klok is 360 : 12 = 30° → 4 × 30 = 120`, and for a half hour
  `de grote wijzer staat op de 6, de kleine halverwege de 3 en de 4 → 2,5 × 30 = 75`. Past 6 the
  explanation counts the other way round the clock (`om 9 uur: 3 × 30 = 90`).
- The de-duplication key is the form and the numbers.

### 5.31 Symmetry (`symmetry`)

The figures, with their lines of symmetry, smallest rotation angle and point symmetry. The prompt
uses the name in the first column; a qualifier excludes the special case, because the
definitions are inclusive (§5.32).

| Figure                                         | Lines | Rotation | Point symmetric |
|------------------------------------------------|-------|----------|-----------------|
| een vierkant                                   | 4     | 90°      | ja              |
| een rechthoek die geen vierkant is             | 2     | 180°     | ja              |
| een ruit die geen vierkant is                  | 2     | 180°     | ja              |
| een parallellogram dat geen rechthoek of ruit is | 0   | 180°     | ja              |
| een vlieger die geen ruit is                   | 1     | —        | nee             |
| een gelijkbenig trapezium dat geen rechthoek is | 1    | —        | nee             |
| een gelijkzijdige driehoek                     | 3     | 120°     | nee             |
| een gelijkbenige driehoek die niet gelijkzijdig is | 1 | —        | nee             |
| een regelmatige vijfhoek                       | 5     | 72°      | nee             |
| een regelmatige zeshoek, achthoek, tienhoek, twaalfhoek | n | 360° : n | ja         |

There are three forms, each picked with equal probability:

- **Lines of symmetry:** `Hoeveel symmetrieassen heeft een ruit die geen vierkant is?` (0 is a
  valid answer). Explanation per figure: `de 2 diagonalen` (ruit), `de 2 diagonalen en de 2
  lijnen door de middens van de overstaande zijden` (vierkant), `de 2 lijnen door de middens van
  de overstaande zijden; de diagonalen zijn geen symmetrieas` (rechthoek), `geen` (parallellogram),
  `de diagonaal door de hoeken waar de gelijke zijden samenkomen` (vlieger), `de lijn door de
  middens van de evenwijdige zijden` (trapezium), `van elke hoek naar het midden van de
  overstaande zijde` (gelijkzijdige driehoek), `van de tophoek naar het midden van de basis`
  (gelijkbenige driehoek), `een regelmatige n-hoek heeft n symmetrieassen` (regular polygons).
- **Rotation:** only figures with a rotation angle: `Over hoeveel graden moet je een regelmatige
  vijfhoek minstens draaien om hem weer precies op zichzelf te laten vallen?` Suffix `°`.
  Explanation `360 : 5 = 72`, and for the figures of 180° `pas na een halve draai: 360 : 2 = 180`.
- **Point symmetry:** Ja/Nee, 50% each: `Is een parallellogram dat geen rechthoek of ruit is
  puntsymmetrisch?` Explanation: `Na een halve draai (180°) valt de figuur weer op zichzelf.`, or
  `… valt de figuur niet op zichzelf.`
- The de-duplication key is the form and the figure.

### 5.32 Shape properties (`shapeProperties`)

Ja/Nee statements, 50% each: the answer is drawn first, then a statement with that answer. Three
kinds: quadrilateral hierarchy (40%), quadrilateral properties (40%) and triangles (20%).

- **Definitions are inclusive** (as in the user's book): a trapezium has at least one pair of
  parallel sides, so every parallelogram is a trapezium; a kite (vlieger) has a diagonal that is a
  line of symmetry, so every rhombus is a kite. One table holds which properties each
  quadrilateral **always** has; the hierarchy follows from it (X is a Y when X always has every
  property of Y):

  | Property (verb, rest)                         | vierkant | rechthoek | ruit | parallellogram | trapezium | vlieger |
  |-----------------------------------------------|----------|-----------|------|----------------|-----------|---------|
  | zijn, de vier zijden even lang                | ✓        |           | ✓    |                |           |         |
  | zijn, de vier hoeken recht                    | ✓        | ✓         |      |                |           |         |
  | zijn, de overstaande zijden evenwijdig        | ✓        | ✓         | ✓    | ✓              |           |         |
  | zijn, minstens twee zijden evenwijdig         | ✓        | ✓         | ✓    | ✓              | ✓         |         |
  | is, een diagonaal een symmetrieas             | ✓        |           | ✓    |                |           | ✓       |
  | zijn, de diagonalen even lang                 | ✓        | ✓         |      |                |           |         |
  | staan, de diagonalen loodrecht op elkaar      | ✓        |           | ✓    |                |           | ✓       |
  | delen, de diagonalen elkaar middendoor        | ✓        | ✓         | ✓    | ✓              |           |         |

  A property is a verb and a rest, so it fits a question (`Zijn bij elke ruit de vier zijden
  even lang?`) and a fact (`Bij elke ruit zijn de vier zijden even lang.`). The first property a
  shape has defines it.
- **Hierarchy:** `Is elk vierkant een ruit?` for every ordered pair of different quadrilaterals
  (30 statements, 11 ja). Articles: elk vierkant, elk parallellogram, elk trapezium; elke
  rechthoek, elke ruit, elke vlieger. Explanation, ja: `Bij een ruit zijn de vier zijden even
  lang; bij elk vierkant ook.` (the defining property of Y); nee: `Bij een vierkant zijn de vier
  hoeken recht, bij een ruit niet altijd.` (the first property of Y that X lacks).
- **Properties:** every shape with every property (48 statements): `Zijn bij elke ruit de vier
  zijden even lang?`, `Is bij elke vlieger een diagonaal een symmetrieas?`, `Staan bij elk
  parallellogram de diagonalen loodrecht op elkaar?`. Explanation: the fact, `Bij elke ruit staan
  de diagonalen loodrecht op elkaar.`, or `Niet bij elk parallellogram staan de diagonalen
  loodrecht op elkaar.`
- **Triangles**, a fixed list:

  | Statement                                                    | Answer | Explanation                                                        |
  |--------------------------------------------------------------|--------|--------------------------------------------------------------------|
  | `Bestaat er een driehoek met twee rechte hoeken?`            | nee    | `De hoeken zijn samen 180°: na 90° + 90° blijft 0° over.`          |
  | `Bestaat er een driehoek met twee stompe hoeken?`            | nee    | `Twee stompe hoeken zijn samen al meer dan 180°.`                  |
  | `Bestaat er een rechthoekige driehoek die gelijkbenig is?`   | ja     | `Bijvoorbeeld hoeken van 90°, 45° en 45°.`                         |
  | `Bestaat er een stomphoekige driehoek die gelijkbenig is?`   | ja     | `Bijvoorbeeld hoeken van 120°, 30° en 30°.`                        |
  | `Bestaat er een rechthoekige driehoek die gelijkzijdig is?`  | nee    | `Een gelijkzijdige driehoek heeft drie hoeken van 60°.`            |
  | `Is elke gelijkzijdige driehoek gelijkbenig?`                | ja     | `Hij heeft zelfs drie gelijke zijden.`                             |
  | `Is elke gelijkbenige driehoek gelijkzijdig?`                | nee    | `Bijvoorbeeld zijden van 5 cm, 5 cm en 3 cm.`                      |
  | `Is elke gelijkzijdige driehoek scherphoekig?`               | ja     | `Alle hoeken zijn 60°.`                                            |
  | `Bestaat er een driehoek met zijden van 2 cm, 3 cm en 6 cm?` | nee    | `2 + 3 is kleiner dan 6: de korte zijden halen elkaar niet.`       |
  | `Bestaat er een driehoek met zijden van 3 cm, 4 cm en 6 cm?` | ja     | `3 + 4 is groter dan 6.`                                           |

- The de-duplication key is the statement.

### Meetkunde v3 (§5.80–§5.84)

The RWT gaps of Meetkunde (§12.3) and its Verdieping. Opfrisser gets one new topic (§5.80);
Verdieping has four topics of its own (§5.81–§5.84, §4.1). The card description stays. As in
§5.27–§5.32, figures are described in words.

### 5.80 Solid names (`solidNames`)

Opfrisser (RWT C.1). Label: `Ruimtefiguren en lijnen (namen, vlakken, begrippen)`. Three
forms, each equally likely:

| Form  | Example                                                                  | Answer   | Answer kind |
|-------|--------------------------------------------------------------------------|----------|-------------|
| Name  | `Welk ruimtefiguur heeft een cirkel als grondvlak en een punt als top?`  | `kegel`  | choice      |
| Count | `Hoeveel ribben heeft een prisma met een zeshoek als grondvlak?`          | 18       | number      |
| Line  | `Welk woord hoort bij: een lijn die recht omhoog loopt, zoals een vlaggenmast?` | `verticaal` | choice |

- **Name**, a fixed list; the options are the answer and three random others from `balk`,
  `kubus`, `prisma`, `kegel`, `bol`, `cilinder`, `piramide`, in random order. Definitions are
  inclusive (§5.32): a kubus is a balk and a balk is a prisma, so `kubus`, `balk` and `prisma`
  are never a distractor for each other.

  | `Welk ruimtefiguur heeft …?`                                                         | Answer     |
  |--------------------------------------------------------------------------------------|------------|
  | `een cirkel als grondvlak en een punt als top`                                       | `kegel`    |
  | `twee gelijke cirkels als grondvlak en bovenvlak`                                    | `cilinder` |
  | `een veelhoek als grondvlak en driehoeken als zijvlakken die in één punt samenkomen` | `piramide` |
  | `twee gelijke driehoeken als grondvlak en bovenvlak en rechthoeken als zijvlakken`   | `prisma`   |
  | `zes vierkanten als zijvlakken`                                                      | `kubus`    |
  | `zes rechthoeken als zijvlakken, niet allemaal vierkant`                             | `balk`     |
  | `geen ribben en geen hoekpunten, en elk punt even ver van het middelpunt`            | `bol`      |

- **Count:** `vlakken`, `ribben` or `hoekpunten` (each equally likely, also the suffix) of a
  `kubus` or `balk` (6, 12, 8), a prisma with an `n`-hoek as grondvlak (`n + 2`, `3n`, `2n`) or a
  piramide with an `n`-hoek as grondvlak (`n + 1`, `2n`, `n + 1`); `n ∈ {3, 4, 5, 6, 8}`, named
  `driehoek`, `vierkant`, `vijfhoek`, `zeshoek`, `achthoek`. Each of the three solids equally
  likely.
- **Line** (the line terms of C.1), a fixed list; the options are the answer and three random
  others from the five terms, in random order. `Loodrecht` also means "straight up" in everyday
  Dutch, so `verticaal` and `loodrecht` are never a distractor for each other.

  | `Welk woord hoort bij: …?`                                          | Answer        | Explanation                                                        |
  |---------------------------------------------------------------------|---------------|--------------------------------------------------------------------|
  | `een lijn die waterpas loopt, zoals de horizon`                     | `horizontaal` | `Horizontaal betekent waterpas, zoals de horizon.`                 |
  | `een lijn die recht omhoog loopt, zoals een vlaggenmast`            | `verticaal`   | `Verticaal betekent recht omhoog, zoals een vlaggenmast.`          |
  | `een lijn tussen twee hoekpunten die niet naast elkaar liggen`      | `diagonaal`   | `Een diagonaal verbindt twee hoekpunten die niet naast elkaar liggen.` |
  | `twee lijnen die een rechte hoek met elkaar maken`                  | `loodrecht`   | `Loodrechte lijnen maken een rechte hoek (90°) met elkaar.`        |
  | `twee lijnen die elkaar nooit snijden, hoe ver je ze ook doortrekt` | `evenwijdig`  | `Evenwijdige lijnen snijden elkaar nooit.`                         |

- Explanations: `Een kegel heeft een cirkel als grondvlak en loopt uit in een punt.`;
  `zeshoek als grondvlak: 6 ribben onder, 6 boven en 6 opstaand → 18`, `piramide: 4 ribben in
  het grondvlak en 4 naar de top → 8`.

### 5.81 Scaling solids (`scalingSolids`)

Verdieping (RWT C.13). Label: `Kwadratisch en kubisch vergroten`. Three forms, each equally
likely:

| Form    | Example                                                                                                        | Answer | Suffix      |
|---------|----------------------------------------------------------------------------------------------------------------|--------|-------------|
| Factor  | `De ribben van een kubus worden 3 keer zo lang. Hoeveel keer zo groot wordt de inhoud?`                         | 27     | `keer`      |
| Value   | `Een kubus met ribben van 2 cm heeft een inhoud van 8 cm³. De ribben worden 3 keer zo lang. Hoe groot wordt de inhoud?` | 216 | `cm³` |
| Back    | `De inhoud van een kubus wordt 8 keer zo groot. Hoeveel keer zo lang worden de ribben?`                          | 2      | `keer`      |

- Figures: `vierkant`, `rechthoek` (zijden; asked `omtrek` or `oppervlakte`) and `kubus`, `balk`
  (ribben; asked `oppervlakte` or `inhoud`), each equally likely. The `omtrek` question (factor
  `k`) is the linear trap and is 20% of the 2D exercises.
- **Factor:** `k ∈ {2, 3, 4, 5, 10}` `keer zo lang` (75%), or `keer zo klein` with `k ∈ {2, 3,
  4, 5}` (25%: `Hoeveel keer zo klein wordt …?`).
- **Value:** the original lengths whole in `[1, 10]` cm, its area or volume given; `k ∈ {2, 3, 4,
  5}`; the answer at most 10 000. Also as a model (50%): `Een maquette is 10 keer zo klein als
  het echte gebouw. Het dak van de maquette is 0,5 m². Hoe groot is het echte dak?`, `k ∈ {2, 5,
  10, 20}`, the area in m² with at most 1 decimal, the answer at most 5000 (suffix `m²`).
- **Back:** an area factor `k²` (`k ∈ [2, 10]`) asking the side, or a volume factor `k³`
  (`k ∈ {2, 3, 4, 5, 10}`) asking the edge.
- Explanations: `oppervlakte: 3 × 3 = 9 keer`, `inhoud: 3 × 3 × 3 = 27 keer`, `omtrek: 3 keer`
  (a length); `8 × 27 = 216`; `8 = 2 × 2 × 2 → 2 keer`.

### 5.82 Surface area of solids (`surfaceArea`)

Verdieping (RWT C.10, C.10b for the sphere). Label: `Oppervlakte van ruimtefiguren (piramide,
prisma, cilinder, bol)`. Four forms, each equally likely:

| Form     | Example                                                                                                                      | Answer | Suffix |
|----------|------------------------------------------------------------------------------------------------------------------------------|--------|--------|
| Pyramid  | `Een piramide heeft een vierkant grondvlak van 3 m bij 3 m. Elk zijvlak is een driehoek met een basis van 3 m en een hoogte van 5 m. Hoe groot is de totale oppervlakte?` | 39 | `m²` |
| Prism    | `Een tent is een prisma. De voorkant en achterkant zijn driehoeken met zijden van 3 m, 4 m en 5 m en een rechte hoek. De tent is 6 m lang. Hoe groot is de totale oppervlakte?` | 84 | `m²` |
| Cylinder | `Een blik heeft een grondvlak van 25,1 cm² en een mantel van 225,3 cm². Hoe groot is de totale oppervlakte?`                  | 275,5  | `cm²`  |
| Sphere   | `Een bol heeft een straal van 5 cm. De oppervlakte van een bol is 4 × π × straal × straal. Neem π = 3,14. Hoe groot is de oppervlakte?` | 314 | `cm²` |

- **Pyramid:** a square base `z ∈ [2, 12]`, the height of a side triangle `h ∈ [z, 20]`; in 50%
  the area of a side is given instead (`Elk van de vier zijvlakken heeft een oppervlakte van
  7,5 m².`). Unit m or cm (50/50).
- **Prism:** a right triangle (all three sides given); total `2 × (a × b : 2) + (a + b + c) ×
  l`. Two contexts, 50/50: `tent` with `(3, 4, 5)` m and a length in `[2, 6]` m, and `doos` with
  `(3, 4, 5)`, `(6, 8, 10)` or `(5, 12, 13)` cm and a length in `[5, 20]` cm.
- **Cylinder:** the base area and the mantle given with 1 decimal, base `[5, 80]`, mantle
  `[50, 500]` cm²; total `mantel + 2 × grondvlak`. Contexts: `blik`, `koker`, `ton` (`dm²`).
- **Sphere** (C.10b, the formula given): radius `r ∈ {1, 2, 5, 10}` cm, so `4 × r × r` is 4, 16,
  100 or 400; given as the radius or (50%) as the diameter (`Een bol heeft een diameter van
  10 cm.`). The answer is `4 × 3,14 × r × r` (12,56, 50,24, 314 or 1256).
- Explanations: `grondvlak 3 × 3 = 9, zijvlak 3 × 5 : 2 = 7,5 → 9 + 4 × 7,5 = 39`;
  `2 driehoeken: 2 × (3 × 4 : 2) = 12, 3 rechthoeken: (3 + 4 + 5) × 6 = 72 → 12 + 72 = 84`;
  `225,3 + 2 × 25,1 = 275,5`; `4 × 5 × 5 = 100 → 100 × 3,14 = 314` (diameter given: `straal =
  10 : 2 = 5 → …`).

### 5.83 Composite shapes (`compositeShapes`)

Verdieping (RWT C.10, C.2, C.13). Label: `Samengestelde figuren (hoek eruit, pad, hectare)`. Four
forms, each equally likely:

| Form        | Example                                                                                                   | Answer | Suffix |
|-------------|-----------------------------------------------------------------------------------------------------------|--------|--------|
| Corner out  | `Uit een rechthoek van 8 m bij 6 m is een hoek van 3 m bij 2 m weggehaald. Hoe groot is de omtrek?`        | 28     | `m`    |
| Path        | `Een gazon van 10 m bij 6 m heeft rondom een pad van 1 m breed. Hoe groot is de oppervlakte van het pad?`  | 36     | `m²`   |
| Are, ha     | `Een weiland is 250 m lang en 80 m breed. Hoeveel hectare is dat?`                                         | 2      | `ha`   |
| Fixed area  | `Een rechthoek heeft een oppervlakte van 24 cm². De zijden zijn hele cm. Wat is de kleinste mogelijke omtrek?` | 20 | `cm`  |

- **Corner out:** a rectangle `l ∈ [5, 20]`, `b ∈ [4, 15]` m, a corner `[1, l − 2] × [1, b − 2]`;
  `oppervlakte` (minus the corner) or `omtrek` (unchanged: the trap), 50/50.
- **Path:** a lawn `l ∈ [4, 20]`, `b ∈ [3, 12]` m, a path width from `{0,5; 1; 2}`; the area of the
  path `(l + 2w)(b + 2w) − l × b`, at most 2 decimals.
- **Are, ha:** a rectangle with sides multiples of 10 m in `[20, 500]`, asked in `are`
  (`1 are = 100 m²`) or `hectare` (`1 ha = 10 000 m²`), 50/50; the answer has at most 2 decimals.
- **Fixed area:** an area in `[12, 100]` with at least three factor pairs; `kleinste` or
  `grootste` omtrek (50/50), whole-number sides.
- Explanations: `oppervlakte 8 × 6 − 3 × 2 = 42`; `omtrek: de hoek verschuift twee zijden naar
  binnen, de omtrek blijft 2 × (8 + 6) = 28`; `12 × 8 − 10 × 6 = 96 − 60 = 36`;
  `250 × 80 = 20 000 m² = 2 ha`; `1 × 24, 2 × 12, 3 × 8, 4 × 6 → 4 × 6: 2 × (4 + 6) = 20`.

### 5.84 Angle reasoning (`angleReasoning`)

Verdieping (LKT: reasoning with angles). Label: `Redeneren met hoeken (buitenhoek, verhouding,
klok)`. Three forms, each equally likely; suffix `°`, except the number of angles:

| Form      | Example                                                                                         | Answer |
|-----------|-------------------------------------------------------------------------------------------------|--------|
| Exterior  | `Een driehoek heeft hoeken van 50° en 60°. Hoe groot is de buitenhoek bij de derde hoek?`        | 110    |
| Ratio     | `De hoeken van een driehoek verhouden zich als 2 : 3 : 4. Hoe groot is de grootste hoek?`        | 80     |
| Clock     | `Hoe groot is de kleinste hoek tussen de wijzers om 4:20?`                                      | 10     |

- **Exterior**, three variants, each equally likely: the exterior angle of a triangle (two angles
  as §5.30); the exterior angle of a regular `n`-hoek (`360 : n`, `n ∈ {5, 6, 8, 9, 10, 12}`);
  the number of angles of a regular polygon from one angle (`Een regelmatige veelhoek heeft
  hoeken van 140°. Hoeveel hoeken heeft hij?`, `n ∈ {5, 6, 8, 9, 10, 12, 15, 18, 20}`, suffix
  `hoeken`).
- **Ratio:** `a : b : c` with terms in `[1, 9]`, not all equal, `a + b + c` a divisor of 180;
  asked the smallest, the largest or (if distinct) the middle angle. In 30% an isosceles
  triangle instead: `In een gelijkbenige driehoek is de tophoek 3 keer zo groot als een
  basishoek. Hoe groot is de tophoek?`, factor from `{2, 3, 4, 6, 7}` (whole or half-degree angles), asked the top or a
  base angle.
- **Clock:** `H:MM` as §5.47, hours 1 to 12, minutes a multiple of 5 and not `:00` or `:30`
  (those are in §5.30); the smaller angle `|30 × H − 5,5 × MM|` (or 360 minus it), at most 1
  decimal (`4:25` → `17,5`). For 12 the explanation counts the hour hand from 0
  (`kleine wijzer: 0 × 30 + 20 × 0,5 = 10°`).
- Explanations: `buitenhoek = som van de twee andere hoeken: 50 + 60 = 110`, `360 : 8 = 45`,
  `buitenhoek 180 − 140 = 40 → 360 : 40 = 9`; `2 + 3 + 4 = 9 delen → 1 deel = 180 : 9 = 20 →
  4 × 20 = 80`; `grote wijzer: 20 × 6 = 120°, kleine wijzer: 4 × 30 + 20 × 0,5 = 130° → 130 −
  120 = 10`.

### Meetkunde v9 (§5.98–§5.99)

The first calculator topics (`2026-11-15-rekenmachine-design.md`, v9). Both are
Verdieping topics in `CALCULATOR_TOPICS`, so their exercises show the calculator button. The v3
rules of §5 apply (no topic tips, the de-duplication key is the form, the variant and the
numbers, prompts without a slot of at most 170 characters), except the rule on decimals: the
answer is rounded half up as the last sentence of the prompt says, and only the rounded value is
correct (calculator spec §6). `π = 3,14`, said in the prompt; the calculator has no `π` key.

### 5.98 Circle with the calculator (`calcCircle`)

Verdieping, calculator (RWT C.10b, C.11b). Label: `Cirkel met de rekenmachine (omtrek,
oppervlakte, terugrekenen)`. Three forms, each equally likely; always rounded to 1 decimal:

| Form        | Example                                                                                                      | Answer | Suffix |
|-------------|--------------------------------------------------------------------------------------------------------------|--------|--------|
| Omtrek      | `Een cirkel heeft een diameter van 7,5 cm. Hoe groot is de omtrek? Neem π = 3,14. Rond af op 1 decimaal.`    | 23,6   | `cm`   |
| Oppervlakte | `Een cirkel heeft een straal van 6,5 m. Hoe groot is de oppervlakte? Neem π = 3,14. Rond af op 1 decimaal.`  | 132,7  | `m²`   |
| Terug       | `Een cirkel heeft een omtrek van 40 cm. Hoe groot is de diameter? Neem π = 3,14. Rond af op 1 decimaal.`     | 12,7   | `cm`   |

- **Unit:** `cm` or `m`, 50/50, for every form; the area in `cm²` or `m²`.
- **Omtrek and Oppervlakte:** the given length has one decimal and is not a whole number, in
  `[1,5; 25]`; it is the radius or (50%) the diameter. Omtrek `3,14 × d`, oppervlakte
  `3,14 × r × r`; a given diameter gives a radius with up to 2 decimals (`7,5 : 2 = 3,75`).
- **Terug:** a whole circumference in `[10, 200]`; asked the diameter (`omtrek : 3,14`) or (50%)
  the radius (`omtrek : 3,14 : 2`).
- Explanations: `3,14 × 7,5 = 23,55 → 23,6`; `straal = 7,5 : 2 = 3,75 → 3,14 × 3,75² =
  44,15625 → 44,2`; `40 : 3,14 = 12,738… → 12,7`; `diameter = 40 : 3,14 = 12,738… → straal =
  6,369… → 6,4`.

### 5.99 Volume with the calculator (`calcVolume`)

Verdieping, calculator (RWT C.12, with C.2 for the litres). Label: `Inhoud met de rekenmachine
(bol, cilinder, liters)`. Three forms, each equally likely; always rounded to a whole number:

| Form     | Example                                                                                                                                              | Answer | Suffix  |
|----------|------------------------------------------------------------------------------------------------------------------------------------------------------|--------|---------|
| Bol      | `Een bol heeft een straal van 6 cm. De inhoud van een bol is 4/3 × π × straal³. Neem π = 3,14. Hoe groot is de inhoud? Rond af op een heel getal.`     | 904    | `cm³`   |
| Cilinder | `Een cilinder heeft een straal van 3,5 cm en een hoogte van 12 cm. Hoe groot is de inhoud? Neem π = 3,14. Rond af op een heel getal.`                 | 462    | `cm³`   |
| Bak      | `Een bak is 85 cm lang, 35 cm breed en 42 cm hoog. Hoeveel liter past erin? Rond af op een heel getal.`                                               | 125    | `L`     |

- **Bol** (C.12b, the formula given, `4/3` as a stacked fraction): a whole radius `r ∈ [2, 12]`
  cm, given as the radius or (50%) as the diameter `2r`. Volume `4 : 3 × 3,14 × r³`.
- **Cilinder** (C.12c): a radius with one decimal that is not whole, in `[1,5; 9,5]`, or (50%)
  an odd diameter in `[3, 19]`, so the radius ends on `,5`; a whole height `h ∈ [5, 30]` cm.
  Volume `3,14 × r × r × h`.
- **Bak** (C.12a): whole centimetres, length `[30, 120]`, width `[20, 60]`, height `[20, 60]`,
  length ≥ width, and at most one of the three a multiple of 10 (three round lengths are the
  mental exercise of §5.28). Volume in litres: `l × b × h : 1000`, with the suffix `L` as the
  Litres form of §5.28.
- No value within `0,001` of a rounding boundary, unless exactly on it (calculator spec §6).
- Explanations: `4 : 3 × 3,14 × 6³ = 904,32 → 904`; `straal = 7 : 2 = 3,5 → 3,14 × 3,5² × 12 =
  461,58 → 462`; `85 × 35 × 42 = 124 950 cm³ = 124,95 L → 125`.
