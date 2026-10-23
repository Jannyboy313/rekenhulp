# Plan: Meetkunde (2026-10-23)

Light plan for the set Meetkunde. The spec is the source of truth: §5.27–§5.32 (topics), the new
rows in §3.4.1 (tips), §4.1 and §4.2 (set and quota). This plan gives per task the files, the
signatures and types, the test cases and the tips; it has no complete code.

## Conventions for every task

- TDD: write the failing tests first, then the code. One commit per task (`feat: …`, ending with
  the `Co-Authored-By` line). `git diff` every file before `git add`; parallel sessions edit
  `main`.
- Each topic gets its own module `src/lib/topics/<topic>.ts` with `<topic>.test.ts`, following
  `speed.ts` and `scale.ts`: exported constants for the ranges, small pure helpers for each form
  (`…Question(…)` builds the `Question` from given numbers, so the tests can pick the numbers),
  and `generate<Topic>(rng: Rng): Question`, which draws the numbers and calls the helpers.
- Each task widens `Topic` in `src/lib/types.ts` with its topic and registers the generator and
  its Dutch label in `src/lib/topics/index.ts` (`GENERATORS`, `TOPIC_LABELS`), so
  `npm run check` stays green after every task. The set is added in the last task.
- Steps: `numberStep` (`src/lib/steps.ts`) with `suffix`, `explanation` and `diagnose`; Ja/Nee
  with `booleanStep`. Tips with `firstTip` and `exactTip` (`src/lib/tips.ts`); a tip fires only
  on the exact mistaken value. The factor-of-ten fallback stays on (it covers `72000` for `72 L`).
- Exact arithmetic with `Rational` (`src/lib/rational.ts`); `π` is `PI = rational(314n, 100n)`.
  Prompt and explanation numbers with `formatRational`. Answers have at most 2 decimals.
- Keys: `<topic>:<form>:<figure or context>:<numbers…>`, joined with `:`.
- Generator invariants with a seeded RNG over ≥ 1000 questions: the ranges of the spec,
  `check(expected).correct`, the explanation is set, the key and the prompt match the numbers,
  and the form shares lie within ±5 percentage points of the spec.
- Prompts are Dutch and exact as in the tables below. Write a non-breaking space in source as
  `\u{a0}`, never as a literal character.
- Do not use `[a, b] = cond ? [x, y] : [p, q]` destructuring: with `noUncheckedIndexedAccess` it
  types as `T | undefined`.

## Task 1: `perimeterArea` (spec §5.27)

Files: `src/lib/topics/perimeterArea.ts`, `perimeterArea.test.ts`, `types.ts`, `topics/index.ts`.

Types and signatures:

```ts
export const PI: Rational; // 3,14
export type PlaneFigure =
  | 'vierkant' | 'rechthoek' | 'driehoek' | 'rechthoekigeDriehoek'
  | 'parallellogram' | 'trapezium' | 'cirkel';
export type Measure = 'oppervlakte' | 'omtrek';
export type RectangleContext = 'tafelblad' | 'vloerkleed' | 'raam';
export type MissingSide = 'rectangleFromArea' | 'rectangleFromPerimeter'
  | 'squareFromPerimeter' | 'squareFromArea';
/** The given lengths of a figure in cm; `circleGiven` says whether the radius or the diameter is shown. */
export interface PlaneShape { figure: PlaneFigure; lengths: readonly number[]; circleGiven?: 'straal' | 'diameter' }
export function figureQuestion(shape: PlaneShape, measure: Measure): Question;
export function mixedRectangleQuestion(context: RectangleContext, lengthM: Rational, widthCm: number, measure: Measure): Question;
export function missingSideQuestion(variant: MissingSide, given: readonly number[]): Question;
/** Shared with solids: the tip for using the diameter as the radius. */
export function diameterAsRadiusTip(diameter: number): string;
export function generatePerimeterArea(rng: Rng): Question;
```

Label: `Omtrek en oppervlakte (vierkant t/m cirkel)`.

Prompts:

| Figure | Prompt start |
|---|---|
| vierkant | `Een vierkant heeft zijden van 7 cm.` |
| rechthoek | `Een rechthoek is 12 cm lang en 5 cm breed.` |
| driehoek | `Een driehoek heeft een basis van 8 cm en een hoogte van 5 cm.` |
| rechthoekigeDriehoek | `Een rechthoekige driehoek heeft rechthoekszijden van 6 cm en 9 cm.` |
| parallellogram | `Een parallellogram heeft een basis van 8 cm, schuine zijden van 5 cm en een hoogte van 4 cm.` |
| trapezium | `Een trapezium heeft evenwijdige zijden van 6 cm en 10 cm en een hoogte van 4 cm.` |
| cirkel | `Een cirkel heeft een straal van 5 cm.` / `… een diameter van 10 cm.` |

followed by ` Hoe groot is de oppervlakte?` or ` Hoe groot is de omtrek?`, and for a circle
` Neem π = 3,14.` Mixed: `Een tafelblad is 1,6 m lang en 80 cm breed. Hoe groot is de
oppervlakte in m²?` / `… de omtrek in m?` (vloerkleed, raam alike). Missing side:
`Een rechthoek heeft een oppervlakte van 48 cm² en is 6 cm breed. Hoe lang is de rechthoek?`,
`Een rechthoek heeft een omtrek van 34 cm en is 5 cm breed. Hoe lang is de rechthoek?`,
`Een vierkant heeft een omtrek van 36 cm. Hoe lang is een zijde?`,
`Een vierkant heeft een oppervlakte van 144 cm². Hoe lang is een zijde?`

Test cases:

| Input | Answer | Suffix | Explanation |
|---|---|---|---|
| vierkant 7, oppervlakte | 49 | `cm²` | `7 × 7 = 49` |
| vierkant 7, omtrek | 28 | `cm` | `4 × 7 = 28` |
| rechthoek 12 × 5, omtrek | 34 | `cm` | `2 × (12 + 5) = 34` |
| rechthoek 12 × 5, oppervlakte | 60 | `cm²` | `12 × 5 = 60` |
| driehoek 8, 5 | 20 | `cm²` | `8 × 5 : 2 = 20` |
| rechthoekigeDriehoek 6, 9 | 27 | `cm²` | `6 × 9 : 2 = 27` |
| parallellogram 8, 5, 4, oppervlakte | 32 | `cm²` | `8 × 4 = 32` |
| parallellogram 8, 5, 4, omtrek | 26 | `cm` | `2 × (8 + 5) = 26` |
| trapezium 6, 10, 4 | 32 | `cm²` | `(6 + 10) : 2 × 4 = 32` |
| cirkel straal 5, oppervlakte | 78,5 | `cm²` | `3,14 × 5 × 5 = 78,5` |
| cirkel diameter 10, oppervlakte | 78,5 | `cm²` | `straal = 10 : 2 = 5 → 3,14 × 5 × 5 = 78,5` |
| cirkel diameter 10, omtrek | 31,4 | `cm` | `3,14 × 10 = 31,4` |
| cirkel straal 5, omtrek | 31,4 | `cm` | `diameter = 2 × 5 = 10 → 3,14 × 10 = 31,4` |
| cirkel straal 1 / 4, oppervlakte (edges) | 3,14 / 50,24 | `cm²` | |
| tafelblad 1,6 m × 80 cm, oppervlakte | 1,28 | `m²` | `80 cm = 0,8 m → 1,6 × 0,8 = 1,28` |
| tafelblad 1,6 m × 80 cm, omtrek | 4,8 | `m` | `80 cm = 0,8 m → 2 × (1,6 + 0,8) = 4,8` |
| raam 1 m × 30 cm, oppervlakte (edge: whole metres shown as `1 m`) | 0,3 | `m²` | |
| rectangleFromArea 48, 6 | 8 | `cm` | `48 : 6 = 8` |
| rectangleFromPerimeter 34, 5 | 12 | `cm` | `34 : 2 − 5 = 12` |
| squareFromPerimeter 36 | 9 | `cm` | `36 : 4 = 9` |
| squareFromArea 144 | 12 | `cm` | `√144 = 12` |

Tips (§3.4.1):

| Question | Answer typed | Tip |
|---|---|---|
| rechthoek 12 × 5, oppervlakte | 34 | `Dat is de omtrek; gevraagd is de oppervlakte.` |
| rechthoek 12 × 5, omtrek | 60 | `Dat is de oppervlakte; gevraagd is de omtrek.` |
| vierkant 4, oppervlakte | 16 | none: equal to the perimeter, so correct |
| driehoek 8, 5 | 40 | `Een driehoek is de helft van een rechthoek: deel nog door 2.` |
| parallellogram 8, 5, 4, oppervlakte | 40 | `Reken met de hoogte, niet met de schuine zijde: 8 × 4.` |
| cirkel diameter 10, oppervlakte | 314 | `De straal is de helft van de diameter: 10 : 2 = 5.` |
| cirkel straal 5, omtrek | 15,7 | `De omtrek is π × diameter, en de diameter is 2 × 5 = 10.` |
| cirkel straal 5, oppervlakte | 785 | the factor-of-ten fallback (10 keer te groot) |
| missing side, any | | no topic tips, only the fallback |

Generator invariants: forms 1/3 each; figures equally likely within the form (area: all 7,
perimeter: vierkant, rechthoek, parallellogram, cirkel); 25% (±5) of the area and perimeter
questions are mixed rectangles; ranges: vierkant `[2, 25]`; rechthoek `l ∈ [3, 40]`,
`b ∈ [2, 12]`, `b < l`; driehoek base and height `[2, 20]` with an even product (both
variants); parallellogram base `[3, 20]`, `h ∈ [2, 12]`, `s ∈ [h + 1, 20]`; trapezium `a ≠ b`
in `[2, 20]`, `a + b` even, `h ∈ [2, 12]`; radius in `{1, 2, 3, 4, 5, 10}`, diameter 50%;
mixed length in `[1; 3]` m with at most 1 decimal, width a multiple of 10 in `[30, 90]`;
missing-side variants 1/4 each, the asked length of `rectangleFromPerimeter` larger than the
given width; `Neem π = 3,14.` only in circle prompts.

## Task 2: `solids` (spec §5.28)

Files: `src/lib/topics/solids.ts`, `solids.test.ts`, `types.ts`, `topics/index.ts`. Imports `PI`
and `diameterAsRadiusTip` from `perimeterArea.ts`.

```ts
export type Solid = 'kubus' | 'balk' | 'cilinder';
export type Container = 'aquarium' | 'koelbox' | 'opbergbox';
/** Length × width × height ranges in cm, multiples of 10 (spec §5.28). */
export const CONTAINER_RANGES: Readonly<Record<Container, readonly [readonly [number, number], readonly [number, number], readonly [number, number]]>>;
export function volumeQuestion(solid: Solid, lengths: readonly number[], cylinderGiven?: 'straal' | 'diameter'): Question;
export function surfaceQuestion(solid: 'kubus' | 'balk', lengths: readonly number[]): Question;
export function litresQuestion(container: Container, lengths: readonly [number, number, number]): Question;
export function generateSolids(rng: Rng): Question;
```

Label: `Inhoud en oppervlakte (kubus, balk, cilinder, liters)`.

Prompts: `Een kubus heeft ribben van 4 cm. Hoe groot is de inhoud?` (`… de oppervlakte?`),
`Een balk is 8 cm lang, 5 cm breed en 3 cm hoog. Hoe groot is de inhoud?`,
`Een cilinder heeft een straal van 5 cm en een hoogte van 4 cm. Hoe groot is de inhoud? Neem π = 3,14.`
(`… een diameter van 10 cm …`), `Een aquarium is 60 cm lang, 30 cm breed en 40 cm hoog. Hoeveel
liter water past erin?`, `Een koelbox is … Hoeveel liter past erin?` (opbergbox alike).

| Input | Answer | Suffix | Explanation |
|---|---|---|---|
| kubus 4, inhoud | 64 | `cm³` | `4 × 4 × 4 = 64` |
| kubus 4, oppervlakte | 96 | `cm²` | `6 × 4 × 4 = 96` |
| balk 8, 5, 3, inhoud | 120 | `cm³` | `8 × 5 × 3 = 120` |
| balk 8, 5, 3, oppervlakte | 158 | `cm²` | `2 × (8 × 5 + 8 × 3 + 5 × 3) = 2 × 79 = 158` |
| cilinder straal 5, hoogte 4 | 314 | `cm³` | `3,14 × 5 × 5 × 4 = 314` |
| cilinder diameter 10, hoogte 4 | 314 | `cm³` | `straal = 10 : 2 = 5 → 3,14 × 5 × 5 × 4 = 314` |
| cilinder straal 1, hoogte 7 (edge: 2 decimals) | 21,98 | `cm³` | |
| aquarium 60, 30, 40 | 72 | `L` | `60 cm = 6 dm, 30 cm = 3 dm, 40 cm = 4 dm → 6 × 3 × 4 = 72 dm³ = 72 L` |
| aquarium 100, 50, 60 (edge: 10 dm) | 300 | `L` | `100 cm = 10 dm, …` |

Tips:

| Question | Typed | Tip |
|---|---|---|
| kubus 4, oppervlakte | 64 | `Dat is de inhoud; gevraagd is de oppervlakte.` |
| balk 8, 5, 3, inhoud | 158 | `Dat is de oppervlakte; gevraagd is de inhoud.` |
| kubus 6, either | 216 | none: volume and surface area are equal, so correct |
| cilinder diameter 10, hoogte 4 | 1256 | `De straal is de helft van de diameter: 10 : 2 = 5.` |
| aquarium 60, 30, 40 | 72000 | the factor-of-ten fallback (1000 keer te groot) |

Generator invariants: volume 50%, surface area 25%, litres 25% (±5); volume solids 1/3 each,
surface solids 1/2 each; kubus `[2, 10]`; balk three different lengths, `l ∈ [3, 20]`,
`b, h ∈ [2, 10]`, volume ≤ 2000; cilinder radius in `{1, 2, 5, 10}`, diameter 50%, height
`[1, 10]`; containers 1/3 each, every length a multiple of 10 within its context range;
litres whole; at most 2 decimals; no cylinder surface area.

## Task 3: `pythagoras` (spec §5.29)

Files: `src/lib/topics/pythagoras.ts`, `pythagoras.test.ts`, `types.ts`, `topics/index.ts`.

```ts
export type Triple = readonly [number, number, number]; // legs a < b, hypotenuse c
/** The 8 triples of spec §5.29, hypotenuse at most 25. */
export const TRIPLES: readonly Triple[];
export type PythagorasContext = 'kaal' | 'schoolplein' | 'wandelen';
/** asked: 'c' for the hypotenuse, 'a' or 'b' for a leg. */
export function pythagorasQuestion(context: PythagorasContext, triple: Triple, asked: 'a' | 'b' | 'c'): Question;
export function generatePythagoras(rng: Rng): Question;
```

Label: `Pythagoras (schuine zijde en rechthoekszijde)`.

Prompts (bare in cm, contexts in m):

| Context | Hypotenuse | Leg |
|---|---|---|
| kaal | `Een rechthoekige driehoek heeft rechthoekszijden van 6 cm en 8 cm. Hoe lang is de schuine zijde?` | `Een rechthoekige driehoek heeft een schuine zijde van 13 cm en een rechthoekszijde van 5 cm. Hoe lang is de andere rechthoekszijde?` |
| schoolplein | `Een schoolplein is 20 m lang en 15 m breed. Hoe lang is de diagonaal?` | `Een schoolplein is 20 m lang en de diagonaal is 25 m. Hoe breed is het schoolplein?` / `Een schoolplein is 15 m breed en de diagonaal is 25 m. Hoe lang is het schoolplein?` |
| wandelen | `Je loopt 12 m naar het oosten en dan 5 m naar het noorden. Hoe ver ben je hemelsbreed van je beginpunt?` | `Je loopt 12 m naar het oosten en dan naar het noorden. Je bent nu hemelsbreed 13 m van je beginpunt. Hoeveel m liep je naar het noorden?` / `Je loopt naar het oosten en dan 5 m naar het noorden. … Hoeveel m liep je naar het oosten?` |

In the schoolplein the length is the longer leg `b`, the width `a`. In the walk, east is `b` and
north `a`.

| Input | Answer | Explanation |
|---|---|---|
| kaal (6, 8, 10), c | 10 | `6² + 8² = 36 + 64 = 100 → √100 = 10` |
| kaal (5, 12, 13), b | 12 | `13² − 5² = 169 − 25 = 144 → √144 = 12` |
| kaal (5, 12, 13), a | 5 | `13² − 12² = 169 − 144 = 25 → √25 = 5` |
| schoolplein (15, 20, 25), c | 25 | |
| schoolplein (15, 20, 25), a | 15 | |
| wandelen (5, 12, 13), a | 5 | |
| `TRIPLES` | exactly (3,4,5), (6,8,10), (9,12,15), (12,16,20), (15,20,25), (5,12,13), (8,15,17), (7,24,25) | |

Tips:

| Question | Typed | Tip |
|---|---|---|
| (6, 8, 10), c | 14 | `Tel de kwadraten op: 6² + 8² = 100, en neem daarvan de wortel.` |
| (5, 12, 13), b | 8 | `Trek de kwadraten af: 13² − 5² = 144, en neem daarvan de wortel.` |

Generator invariants: hypotenuse 50%, legs 25% each (±5); kaal 50%, schoolplein and wandelen
25% each; schoolplein only with `c ≥ 13`; suffix `cm` for kaal, `m` otherwise; `a² + b² = c²`.

## Task 4: `angles` (spec §5.30)

Files: `src/lib/topics/angles.ts`, `angles.test.ts`, `types.ts`, `topics/index.ts`.

```ts
export const POLYGON_NAMES: Readonly<Record<number, string>>; // 4 → 'vierhoek', …, 12 → 'twaalfhoek'
export const SUM_SIDES: readonly number[];     // 4, 5, 6, 8, 10, 12
export const REGULAR_SIDES: readonly number[]; // 5, 6, 8, 9, 10, 12
export function triangleQuestion(first: number, second: number): Question;
export function isoscelesQuestion(given: 'tophoek' | 'basishoek', angle: number): Question;
export function angleSumQuestion(sides: number): Question;
export function regularAngleQuestion(sides: number): Question;
/** A whole hour 1–11, or a half hour by its Dutch name: `half 4` (3:30) is hour 4, half 1 to half 12. */
export function clockQuestion(hour: number, half: boolean): Question;
export function generateAngles(rng: Rng): Question;
```

Label: `Hoeken (driehoek, veelhoek, klok)`. Suffix `°` everywhere.

Prompts: `Een driehoek heeft hoeken van 50° en 70°. Hoe groot is de derde hoek?`, `Een gelijkbenige
driehoek heeft een tophoek van 40°. Hoe groot is een basishoek?`, `Een gelijkbenige driehoek heeft
basishoeken van 70°. Hoe groot is de tophoek?`, `Hoeveel graden zijn de hoeken van een zeshoek
samen?`, `Hoe groot is één hoek van een regelmatige achthoek?`, `Hoe groot is de kleinste hoek
tussen de wijzers om 4 uur?`, `… om half 4?`

| Input | Answer | Explanation |
|---|---|---|
| triangle 50, 70 | 60 | `180 − 50 − 70 = 60` |
| tophoek 40 | 70 | `(180 − 40) : 2 = 70` |
| tophoek 160 (edge) | 10 | |
| basishoek 70 | 40 | `180 − 2 × 70 = 40` |
| basishoek 85 (edge) | 10 | |
| sum 6 / 4 / 12 | 720 / 360 / 1800 | `(6 − 2) × 180 = 720` |
| regular 8 / 9 / 5 | 135 / 140 / 108 | `(8 − 2) × 180 : 8 = 135` |
| 4 uur | 120 | `elk uur op de klok is 360 : 12 = 30° → 4 × 30 = 120` |
| 9 uur | 90 | `elk uur op de klok is 360 : 12 = 30° → 3 × 30 = 90` |
| 6 uur (edge) | 180 | |
| half 4 | 75 | `de grote wijzer staat op de 6, de kleine halverwege de 3 en de 4 → 2,5 × 30 = 75` |
| half 7 | 15 | `… halverwege de 6 en de 7 → 0,5 × 30 = 15` |
| half 10 | 105 | `… halverwege de 9 en de 10 → 3,5 × 30 = 105` |
| half 1 (edge) | 165 | `… halverwege de 12 en de 1 → 5,5 × 30 = 165` |
| half 12 (edge) | 165 | `… halverwege de 11 en de 12 → 5,5 × 30 = 165` |

Tips:

| Question | Typed | Tip |
|---|---|---|
| sum 6 | 1080 | `Een zeshoek kun je verdelen in 6 − 2 = 4 driehoeken: 4 × 180°.` |
| regular 8 | 45 | `Dat is de buitenhoek; één hoek binnenin is 180° − 45° = 135°.` |
| regular 9 | 40 | `Dat is de buitenhoek; één hoek binnenin is 180° − 40° = 140°.` |
| half 4 | 90 or 60 | `Om half 4 staat de kleine wijzer halverwege de 3 en de 4.` |
| half 1 | 180 or 150 | `Om half 1 staat de kleine wijzer halverwege de 12 en de 1.` |

Generator invariants: four forms 1/4 each; triangle variants 1/2, isosceles directions 1/2; two
given angles multiples of 5, each ≥ 20, sum ≤ 160; tophoek a multiple of 10 in `[20, 160]`;
basishoek a multiple of 5 in `[20, 85]`; whole hours `[1, 11]` and half hours `[1, 12]`, 1/2
each; every answer a whole number of degrees.

## Task 5: `symmetry` (spec §5.31)

Files: `src/lib/topics/symmetry.ts`, `symmetry.test.ts`, `types.ts`, `topics/index.ts`.

```ts
export interface SymmetryFigure {
  id: string;                 // 'ruit', 'regelmatigeVijfhoek', …
  name: string;               // prompt text: 'een ruit die geen vierkant is'
  lines: number;
  linesExplanation: string;   // 'de 2 diagonalen'
  rotation: number | null;    // smallest angle in degrees, null without rotational symmetry
  pointSymmetric: boolean;
}
/** The 13 figures of spec §5.31: the 9 named ones and the regular 6-, 8-, 10- and 12-gon. */
export const FIGURES: readonly SymmetryFigure[];
export function linesQuestion(figure: SymmetryFigure): Question;
export function rotationQuestion(figure: SymmetryFigure): Question; // throws for rotation null
export function pointQuestion(figure: SymmetryFigure): Question;
export function generateSymmetry(rng: Rng): Question;
```

Label: `Symmetrie (assen, draaien, puntsymmetrie)`.

Prompts: `Hoeveel symmetrieassen heeft een ruit die geen vierkant is?`, `Over hoeveel graden moet je
een regelmatige vijfhoek minstens draaien om hem weer precies op zichzelf te laten vallen?`
(suffix `°`), `Is een parallellogram dat geen rechthoek of ruit is puntsymmetrisch?` (Ja/Nee).

| Input | Answer | Explanation |
|---|---|---|
| lines, ruit | 2 | `de 2 diagonalen` |
| lines, vierkant | 4 | `de 2 diagonalen en de 2 lijnen door de middens van de overstaande zijden` |
| lines, rechthoek | 2 | `de 2 lijnen door de middens van de overstaande zijden; de diagonalen zijn geen symmetrieas` |
| lines, parallellogram (edge: 0) | 0 | `geen` |
| lines, vlieger | 1 | `de diagonaal door de hoeken waar de gelijke zijden samenkomen` |
| lines, gelijkbenig trapezium | 1 | `de lijn door de middens van de evenwijdige zijden` |
| lines, gelijkzijdige driehoek | 3 | `van elke hoek naar het midden van de overstaande zijde` |
| lines, gelijkbenige driehoek | 1 | `van de tophoek naar het midden van de basis` |
| lines, regelmatige achthoek | 8 | `een regelmatige achthoek heeft 8 symmetrieassen` |
| rotation, vijfhoek / vierkant / gelijkzijdige driehoek | 72 / 90 / 120 | `360 : 5 = 72` |
| rotation, rechthoek / ruit / parallellogram | 180 | `pas na een halve draai: 360 : 2 = 180` |
| rotation, twaalfhoek | 30 | `360 : 12 = 30` |
| rotation, vlieger | throws | |
| point, parallellogram | Ja | `Na een halve draai (180°) valt de figuur weer op zichzelf.` |
| point, regelmatige vijfhoek | Nee | `Na een halve draai (180°) valt de figuur niet op zichzelf.` |
| `FIGURES` | 13 entries; 10 with a rotation; 8 point-symmetric | |

Tips: none (§3.4.1): neither for the number forms nor for Ja/Nee.

Generator invariants: forms 1/3 each; rotation only for figures with a rotation; point: Ja and
Nee 50% (±5) each; keys `symmetry:<form>:<id>`; 36 distinct keys (13 + 10 + 13).

## Task 6: `shapeProperties` (spec §5.32)

Files: `src/lib/topics/shapeProperties.ts`, `shapeProperties.test.ts`, `types.ts`,
`topics/index.ts`.

```ts
export type Quadrilateral = 'vierkant' | 'rechthoek' | 'ruit' | 'parallellogram' | 'trapezium' | 'vlieger';
export interface ShapeProperty { verb: string; rest: string } // { verb: 'zijn', rest: 'de vier zijden even lang' }
/** The 8 properties of spec §5.32, in table order; the first one a shape has defines it. */
export const PROPERTIES: readonly ShapeProperty[];
/** Which properties each quadrilateral always has, as indexes into PROPERTIES. */
export const ALWAYS: Readonly<Record<Quadrilateral, readonly number[]>>;
/** X is a Y when X always has every property of Y. */
export function isA(x: Quadrilateral, y: Quadrilateral): boolean;
export interface Statement { prompt: string; answer: boolean; explanation: string }
export function hierarchyStatements(): Statement[];  // 30
export function propertyStatements(): Statement[];   // 48
export const TRIANGLE_STATEMENTS: readonly Statement[]; // 10, from the spec table
export function generateShapeProperties(rng: Rng): Question;
```

Label: `Eigenschappen van vierhoeken en driehoeken (ja/nee)`. Articles: `elk` for vierkant,
parallellogram, trapezium; `elke` for rechthoek, ruit, vlieger.

| Input | Expected |
|---|---|
| `isA('vierkant', 'ruit')`, `isA('ruit', 'vlieger')`, `isA('parallellogram', 'trapezium')`, `isA('vierkant', 'vlieger')` | true |
| `isA('ruit', 'vierkant')`, `isA('rechthoek', 'vlieger')`, `isA('trapezium', 'parallellogram')`, `isA('vlieger', 'trapezium')` | false |
| all ordered pairs `x ≠ y` with `isA` | exactly 11: vierkant → rechthoek, ruit, parallellogram, trapezium, vlieger; rechthoek → parallellogram, trapezium; ruit → parallellogram, trapezium, vlieger; parallellogram → trapezium |
| `Is elk vierkant een ruit?` | Ja, `Bij een ruit zijn de vier zijden even lang; bij elk vierkant ook.` |
| `Is elke ruit een vierkant?` | Nee, `Bij een vierkant zijn de vier hoeken recht, bij een ruit niet altijd.` |
| `Is elke rechthoek een trapezium?` | Ja, `Bij een trapezium zijn minstens twee zijden evenwijdig; bij elke rechthoek ook.` |
| `Is elk parallellogram een vlieger?` | Nee, `Bij een vlieger is een diagonaal een symmetrieas, bij een parallellogram niet altijd.` |
| `Is elke vlieger een trapezium?` | Nee, `Bij een trapezium zijn minstens twee zijden evenwijdig, bij een vlieger niet altijd.` |
| `Zijn bij elke ruit de vier zijden even lang?` | Ja, `Bij elke ruit zijn de vier zijden even lang.` |
| `Staan bij elk parallellogram de diagonalen loodrecht op elkaar?` | Nee, `Niet bij elk parallellogram staan de diagonalen loodrecht op elkaar.` |
| `Is bij elke vlieger een diagonaal een symmetrieas?` | Ja, `Bij elke vlieger is een diagonaal een symmetrieas.` |
| `propertyStatements()` | 48, 25 Ja |
| `TRIANGLE_STATEMENTS` | 10, 5 Ja, texts exactly as in the spec |

Tips: none (Ja/Nee).

Generator invariants: Ja and Nee 50% (±5); kinds 40/40/20 (±5); the answer is drawn first,
then a statement of the kind with that answer; keys `shapeProperties:<prompt>`; prompts unique
across the three lists.

## Task 7: the set Meetkunde (spec §4.1, §4.2)

Files: `src/lib/sets.ts`, `sets.test.ts`, `session.test.ts`.

- `GEOMETRY_SET`: id `meetkunde`, name `Meetkunde`, description `Omtrek, oppervlakte, inhoud,
  hoeken en vormen`, topics `perimeterArea`, `solids`, `pythagoras`, `angles`, `symmetry`,
  `shapeProperties` (weight 1 each, in this order), `tablesPercent: 15`. Append it to
  `PRACTICE_SETS` after `FRACTIONS_SET`.

| Test | Expected |
|---|---|
| `PRACTICE_SETS` ids | `…, 'breuken', 'meetkunde'` |
| `describeSetTopics(GEOMETRY_SET)` | the six labels, then `15% tafels` |
| `buildSession(GEOMETRY_SET, 15, rng)` | 2 tables, per topic sorted `[2, 2, 2, 2, 2, 3]` |
| `buildSession(GEOMETRY_SET, n, rng)` for every `SESSION_SIZES` | `n` questions with unique keys |

## After the tasks

- Final review over all tasks, including `npm test`, `npm run check`, `npm run build`, and
  `dist/sw.js` with exactly one `manifest.webmanifest` entry.
- Check the longest prompts on a phone (the `symmetry` rotation, the `pythagoras` walk): ask the
  user, `npm run dev` is not pre-approved.
- Update the Status in `CLAUDE.md` (Meetkunde done; the roadmap table starts with Verbanden &
  statistiek) and delete this plan file, in one `docs:` commit.
