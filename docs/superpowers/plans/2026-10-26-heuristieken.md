# Plan: Heuristieken (2026-10-26)

Light plan for the set Heuristieken. The spec is the source of truth: §5.41–§5.44 (topics), the
new rows in §3.4.1 (tips) and §4.2 (quota). This plan gives per task the files, the signatures
and types, the test cases and the tips; it has no complete code.

## Conventions for every task

- TDD: write the failing tests first, then the code. One commit per task (`feat: …`, ending with
  the `Co-Authored-By` line). `git diff` every file before `git add`; parallel sessions edit
  `main`.
- Each topic gets its own module `src/lib/topics/<topic>.ts` with `<topic>.test.ts`, following
  `sequences.ts`: exported constants for the ranges, a `…Question(…)` builder per form that
  takes the numbers (so tests can pick them), and `generate<Topic>(rng: Rng): Question`, which
  draws the numbers (`randomInt`, `pick`, `drawUntil`) and calls the builders.
- Each task widens `Topic` in `src/lib/types.ts` and registers the generator and its Dutch label
  in `src/lib/topics/index.ts` (`GENERATORS`, `TOPIC_LABELS`), so `npm run check` stays green
  after every task. The set is added in the last task.
- Every step is a `numberStep` (`src/lib/steps.ts`) with a whole answer (`fromInteger`), an
  `explanation` and, where the spec has a tip, a `diagnose` built with `firstTip`/`exactTip`
  (`src/lib/tips.ts`); a tip fires only on the exact mistaken value and only when that value
  differs from the answer. The factor-of-ten fallback stays on everywhere.
- Every explanation starts with its heuristic: `Systematisch tellen: `, `Terugrekenen `
  (followed by `vanaf …:`), `Slim proberen: `, `Vereenvoudigen: `.
- Numbers in text with `formatInteger` (thin-space separator from 10 000), money with
  `formatMoney` (`€`, `\u{a0}`, whole euros). Write a non-breaking space in source as `\u{a0}`,
  never as a literal character.
- Prompts are question text (no slot); a literal `?` only as the last character
  (`slot.sweep.test.ts` covers the new generators by itself). Every generated prompt is at most
  170 characters: one test per topic over 1000 generated questions.
- A text that puts a whole number, a space and a fraction side by side reads as a mixed number
  (§8). The only fractions in this set are `2/3` and `3/4` in the money explanations, always
  after `is ` (`€ 20 is 2/3 van wat je had`), which is fine.
- Keys: `<topic>:<form>:<context>:<numbers…>`, joined with `:`.
- Generator invariants with a seeded RNG over ≥ 1000 questions: the ranges of the spec,
  `check(expected).correct`, the explanation is set and starts with the heuristic, and the form
  and context shares lie within ±5 percentage points of the spec.
- Do not use `[a, b] = cond ? [x, y] : [p, q]` destructuring (`noUncheckedIndexedAccess`).

## Task 1: `systematicCounting` (spec §5.41)

Files: `src/lib/topics/systematicCounting.ts`, `systematicCounting.test.ts`, `types.ts`,
`topics/index.ts`.

```ts
export type CombinationContext = 'kleding' | 'menu';
export type HandshakeContext = 'handen' | 'competitie';
export type OrderingContext = 'rij' | 'podium';
/** kleding: two counts (broeken, truien); menu: three (voor-, hoofd-, nagerechten). */
export function combinationsQuestion(context: CombinationContext, counts: readonly number[]): Question;
export function handshakesQuestion(context: HandshakeContext, n: number): Question;
export function orderingsQuestion(context: OrderingContext, n: number): Question;
export function generateSystematicCounting(rng: Rng): Question;
```

Label: `Systematisch tellen (combinaties, handdrukken, volgordes)`.

| Input | Prompt | Answer | Explanation |
|---|---|---|---|
| kleding 3, 4 | `Je hebt 3 broeken en 4 truien. Hoeveel verschillende combinaties van een broek en een trui kun je maken?` | 12 | `Systematisch tellen: bij elke broek passen 4 truien → 3 × 4 = 12` |
| kleding 8, 8 (edge: largest) | `Je hebt 8 broeken en 8 truien. …` | 64 | `… bij elke broek passen 8 truien → 8 × 8 = 64` |
| menu 3, 4, 2 | `Een restaurant heeft 3 voorgerechten, 4 hoofdgerechten en 2 nagerechten. Hoeveel verschillende menu's van drie gangen kun je kiezen?` | 24 | `Systematisch tellen: elk voorgerecht met elk hoofdgerecht en elk nagerecht → 3 × 4 × 2 = 24` |
| menu 5, 6, 4 (edge: product 120) | | 120 | `… → 5 × 6 × 4 = 120` |
| handen 6 | `Op een feest geeft elke gast elke andere gast één keer een hand. Er zijn 6 gasten. Hoeveel handdrukken zijn dat?` | 15 | `Systematisch tellen: elk van de 6 gasten geeft 5 handen → 6 × 5 = 30 → zo telt elke handdruk dubbel: 30 : 2 = 15` |
| competitie 8 | `In een competitie speelt elk team één keer tegen elk ander team. Er doen 8 teams mee. Hoeveel wedstrijden zijn dat?` | 28 | `Systematisch tellen: elk van de 8 teams speelt 7 wedstrijden → 8 × 7 = 56 → zo telt elke wedstrijd dubbel: 56 : 2 = 28` |
| handen 16 (edge: largest) | | 120 | `… 16 × 15 = 240 → … 240 : 2 = 120` |
| rij 4 | `Op hoeveel manieren kunnen 4 kinderen naast elkaar in een rij staan?` | 24 | `Systematisch tellen: 4 kinderen kunnen vooraan staan, dan 3 op de 2e plek, … → 4 × 3 × 2 × 1 = 24` |
| rij 3 (edge: smallest) | | 6 | `… 3 kinderen kunnen vooraan staan, dan 2 op de 2e plek, … → 3 × 2 × 1 = 6` |
| podium 6 | `Aan een hardloopwedstrijd doen 6 kinderen mee. Op hoeveel manieren kunnen de 1e, 2e en 3e plaats verdeeld worden?` | 120 | `Systematisch tellen: 6 kinderen voor de 1e plaats, 5 voor de 2e, 4 voor de 3e → 6 × 5 × 4 = 120` |
| podium 8 (edge: largest) | | 336 | `… → 8 × 7 × 6 = 336` |

Tips (§3.4.1):

| Question | Answer typed | Tip |
|---|---|---|
| kleding 3, 4 | 7 | `Bij elke broek passen 4 truien: vermenigvuldig, 3 × 4.` |
| menu 3, 4, 2 | 9 | `Elk voorgerecht past bij elk hoofdgerecht en elk nagerecht: vermenigvuldig, 3 × 4 × 2.` |
| kleding 2, 2 (edge: sum = product) | 4 | correct, no tip |
| handen 6 | 30 | `Zo tel je elke handdruk twee keer: deel nog door 2.` |
| competitie 8 | 56 | `Zo tel je elke wedstrijd twee keer: deel nog door 2.` |
| orderings | | no topic tip, only the fallback |

Generator invariants: forms 1/3 each, contexts 1/2 each within a form; kleding counts in
`[2, 8]`; menu counts in `[2, 6]` with a product ≤ 120; handshakes `n ∈ [4, 16]`; rij
`n ∈ [3, 5]`; podium `n ∈ [4, 8]`. Key: `systematicCounting:<form>:<context>:<numbers>`.

## Task 2: `workingBackwards` (spec §5.42)

Files: `src/lib/topics/workingBackwards.ts`, `workingBackwards.test.ts`, `types.ts`,
`topics/index.ts`.

```ts
export type OperationKind = 'times' | 'divide' | 'plus' | 'minus';
export interface Operation { kind: OperationKind; k: number }
/** Applies the operations in order; null when a rule of §5.42 breaks (same kind in a row, an
 * undo, a division that is not exact, a value outside [1, 200]). */
export function applyChain(start: number, operations: readonly Operation[]): number | null;
export function thinkOfNumberQuestion(start: number, operations: readonly Operation[]): Question;
export type Part = 'helft' | 'derde' | 'kwart';
export const PART_ITEMS: readonly string[];   // kleren, een cadeau, een spelletje
export const AMOUNT_ITEMS: readonly string[]; // een lunch, een boek, een bioscoopkaartje, een tijdschrift
export interface Expenses {
  part: Part;
  partItem: string;
  amount: number;
  amountItem: string;
  partFirst: boolean;
}
/** The rest after both expenses, or null when an amount is not whole or the rest is below 1. */
export function moneyRest(start: number, expenses: Expenses): number | null;
export function moneyQuestion(start: number, expenses: Expenses): Question;
export function generateWorkingBackwards(rng: Rng): Question;
```

Label: `Terugrekenen (ik denk aan een getal, geld over)`.

Think of a number:

| Input | Prompt | Answer | Explanation |
|---|---|---|---|
| 7; × 3, + 7, : 2 | `Ik denk aan een getal. Ik doe het keer 3, tel er 7 bij op en deel de uitkomst door 2. Ik kom uit op 14. Aan welk getal dacht ik?` | 7 | `Terugrekenen vanaf 14: 14 × 2 = 28 → 28 − 7 = 21 → 21 : 3 = 7` |
| 5; + 7, × 4 (two operations) | `Ik denk aan een getal. Ik tel er 7 bij op en doe de uitkomst keer 4. Ik kom uit op 48. Aan welk getal dacht ik?` | 5 | `Terugrekenen vanaf 48: 48 : 4 = 12 → 12 − 7 = 5` |
| 18; : 3, − 5 (edge: result 1) | `Ik denk aan een getal. Ik deel het door 3 en trek er 5 van af. Ik kom uit op 1. …` | 18 | `Terugrekenen vanaf 1: 1 + 5 = 6 → 6 × 3 = 18` |
| 20; − 4, × 5, + 20 (edge: 100 + 20) | `… Ik trek er 4 van af, doe de uitkomst keer 5 en tel er 20 bij op. Ik kom uit op 100. …` | 20 | `Terugrekenen vanaf 100: 100 − 20 = 80 → 80 : 5 = 16 → 16 + 4 = 20` |

`applyChain`:

| Input | Expected |
|---|---|
| 7; × 3, + 7, : 2 | 14 |
| 5; × 3, × 2 (same kind) | null |
| 5; + 3, + 4 (same kind) | null |
| 6; × 3, : 3 (undo) | null |
| 8; + 5, − 5 (undo) | null |
| 6; × 3, : 2 (no undo: different k) | 9 |
| 7; : 2 (not exact) | null |
| 20; × 5, + 120 (220, above 200) | null |
| 3; − 3 (below 1) | null |

Money left over:

| Input | Prompt | Answer | Explanation |
|---|---|---|---|
| 30; helft kleren, then € 6 een lunch | `Je geeft de helft van je geld uit aan kleren. Daarna geef je € 6 uit aan een lunch. Je hebt nog € 9 over. Hoeveel geld had je eerst?` | € 30 | `Terugrekenen vanaf € 9: 9 + 6 = 15 → € 15 is de helft van wat je had → 15 × 2 = 30` |
| 30; derde een cadeau, then € 6 een boek | `Je geeft een derde van je geld uit aan een cadeau. Daarna geef je € 6 uit aan een boek. Je hebt nog € 14 over. …` | € 30 | `Terugrekenen vanaf € 14: 14 + 6 = 20 → € 20 is 2/3 van wat je had → 20 : 2 × 3 = 30` |
| 20; kwart een spelletje, then € 6 een lunch | `Je geeft een kwart van je geld uit aan een spelletje. …` | € 20 | `Terugrekenen vanaf € 9: 9 + 6 = 15 → € 15 is 3/4 van wat je had → 15 : 3 × 4 = 20` |
| 24; € 6 een lunch, then helft kleren | `Je geeft € 6 uit aan een lunch. Daarna geef je de helft van wat je over hebt uit aan kleren. Je hebt nog € 9 over. Hoeveel geld had je eerst?` | € 24 | `Terugrekenen vanaf € 9: € 9 is de helft van wat je over had → 9 × 2 = 18 → 18 + 6 = 24` |
| 36; € 6 een boek, then derde een cadeau | `… Daarna geef je een derde van wat je over hebt uit aan een cadeau. Je hebt nog € 20 over. …` | € 36 | `Terugrekenen vanaf € 20: € 20 is 2/3 van wat je over had → 20 : 2 × 3 = 30 → 30 + 6 = 36` |
| 12; helft, then € 5 (edge: rest 1) | | € 12 | |

`moneyRest`:

| Input | Expected |
|---|---|
| 30; helft, € 6, part first | 9 |
| 25; helft, € 6, part first (12,5) | null |
| 30; derde, € 6, amount first (24 − 8) | 16 |
| 31; derde, € 6, amount first (25 : 3) | null |
| 12; helft, € 6, part first (rest 0) | null |

The money answer has the prefix `€`; `€ 9` in the prompt and the explanation via `formatMoney`.

Tips: none (§5.42).

Generator invariants: forms 1/2 each; think of a number: start in `[2, 20]`, 2 or 3 operations
1/2 each, kinds and `k` within the spec, `applyChain` not null; money: start in `[12, 80]`,
parts 50/25/25%, amount in `[3, 15]`, `partFirst` 1/2, the items from their lists, the rest
≥ 1. Prompt length ≤ 170 for the longest case (`€ 15 een bioscoopkaartje, then kwart een
spelletje`) and over 1000 generated questions. Key: `workingBackwards:number:<start>:<ops>`
and `workingBackwards:money:<start>:<part>:<amount>:<partFirst>`.

## Task 3: `guessAndCheck` (spec §5.43)

Files: `src/lib/topics/guessAndCheck.ts`, `guessAndCheck.test.ts`, `types.ts`,
`topics/index.ts`.

```ts
export type KindsContext = 'boerderij' | 'stalling';
export interface Kind { singular: string; plural: string; per: number }
/** kip/kippen 2, konijn/konijnen 4 (poten); fiets/fietsen 2, driewieler/driewielers 3 (wielen). */
export const KINDS: Readonly<Record<KindsContext, readonly [Kind, Kind]>>;
/** `first` of the first kind (2 per), `second` of the second; asks the second kind when `askSecond`. */
export function twoKindsQuestion(context: KindsContext, first: number, second: number, askSecond: boolean): Question;
export function sumDifferenceQuestion(larger: number, smaller: number, askLarger: boolean): Question;
export function generateGuessAndCheck(rng: Rng): Question;
```

Label: `Slim proberen (kippen en konijnen, som en verschil)`.

The explanation writes a count of 1 in the singular (`1 konijn`, `1 driewieler`); the prompt
always asks with the plural.

| Input | Prompt | Answer | Explanation |
|---|---|---|---|
| boerderij 6 kippen, 4 konijnen, konijnen | `Op een boerderij lopen kippen en konijnen. Samen hebben ze 10 koppen en 28 poten. Hoeveel konijnen zijn er?` | 4 | `Slim proberen: stel dat alle 10 dieren kippen zijn: 10 × 2 = 20 poten → 28 − 20 = 8 poten te weinig → elk konijn heeft 2 poten meer: 8 : 2 = 4 konijnen` |
| same, kippen | `… Hoeveel kippen zijn er?` | 6 | `… 8 : 2 = 4 konijnen → 10 − 4 = 6 kippen` |
| stalling 7 fietsen, 5 driewielers, driewielers | `In een stalling staan fietsen en driewielers, samen 12 stuks met 29 wielen. Hoeveel driewielers staan er?` | 5 | `Slim proberen: stel dat alle 12 fietsen zijn: 12 × 2 = 24 wielen → 29 − 24 = 5 wielen te weinig → elke driewieler heeft 1 wiel meer: 5 driewielers` |
| same, fietsen | `… Hoeveel fietsen staan er?` | 7 | `… 5 driewielers → 12 − 5 = 7 fietsen` |
| boerderij 4 kippen, 1 konijn (edge: singular) | `… 5 koppen en 12 poten. Hoeveel konijnen zijn er?` | 1 | `… 12 − 10 = 2 poten te weinig → elk konijn heeft 2 poten meer: 2 : 2 = 1 konijn` |
| stalling 1 fiets, 19 driewielers, fietsen (edge: total 20, singular) | `… samen 20 stuks met 59 wielen. Hoeveel fietsen staan er?` | 1 | `… 59 − 40 = 19 wielen te weinig → … 19 driewielers → 20 − 19 = 1 fiets` |
| sum 50, difference 14, larger | `Twee getallen zijn samen 50 en verschillen 14. Wat is het grootste getal?` | 32 | `Slim proberen: 25 en 25 zijn samen 50 maar verschillen 0 → maak het ene getal 7 groter en het andere 7 kleiner: 32 en 18 verschillen 14 → 32` |
| same, smaller | `… Wat is het kleinste getal?` | 18 | `… → 18` |
| 6 and 4 (edge: sum 10, difference 2) | `Twee getallen zijn samen 10 en verschillen 2. …` | 6 | `… 5 en 5 zijn samen 10 maar verschillen 0 → maak het ene getal 1 groter en het andere 1 kleiner: 6 en 4 verschillen 2 → 6` |
| 99 and 1 (edge: sum 100, smallest 1) | | 1 (smaller) | |

Tips (§3.4.1):

| Question | Answer typed | Tip |
|---|---|---|
| boerderij 6, 4, konijnen | 6 | `Dat is het aantal kippen; gevraagd is het aantal konijnen.` |
| boerderij 6, 4, kippen | 4 | `Dat is het aantal konijnen; gevraagd is het aantal kippen.` |
| stalling 7, 5, driewielers | 7 | `Dat is het aantal fietsen; gevraagd is het aantal driewielers.` |
| boerderij 5, 5, konijnen (edge: equal counts) | 5 | correct, no tip |
| sum 50, difference 14, larger | 18 | `Dat is het kleinste getal; gevraagd is het grootste.` |
| sum 50, difference 14, smaller | 32 | `Dat is het grootste getal; gevraagd is het kleinste.` |

Generator invariants: forms 1/2 each; contexts 1/2 each, asked kind 1/2; total in `[5, 20]`,
each kind ≥ 1; sum and difference: sum even in `[10, 100]`, difference ≥ 2, smaller ≥ 1, asked
1/2. Key: `guessAndCheck:kinds:<context>:<first>:<second>:<asked>` and
`guessAndCheck:sum:<larger>:<smaller>:<asked>`.

## Task 4: `simplifyProblem` (spec §5.44)

Files: `src/lib/topics/simplifyProblem.ts`, `simplifyProblem.test.ts`, `types.ts`,
`topics/index.ts`.

```ts
/** n even in [10, 50] and 60, 70, 80, 90, 100: 26 values. */
export const GAUSS_ENDS: readonly number[];
export function gaussQuestion(n: number): Question;
export const DIVISIBLE_LIMITS: readonly number[]; // 50, 100, 200
export function divisibleQuestion(limit: number, divisor: number): Question;
export function inclusiveCountQuestion(from: number, to: number): Question;
export const POST_SPACINGS: readonly number[]; // 2, 4, 5, 10, 20, 25
export function fencePostQuestion(spacing: number, pieces: number): Question;
export type Pattern = 'vierkantjes' | 'driehoekjes' | 'tafels';
export interface PatternRule { first: number; step: number } // 4/3, 3/2, 4/2
export const PATTERNS: Readonly<Record<Pattern, PatternRule>>;
export const FIGURE_NUMBERS: readonly number[]; // 10, 12, 15, 20, 25, 30, 50, 100
/** Asks the value of figure `n`, or with `reverse` the figure with that value. */
export function figureQuestion(pattern: Pattern, n: number, reverse: boolean): Question;
export function generateSimplifyProblem(rng: Rng): Question;
```

Label: `Vereenvoudigen (Gauss, tellen, figuurpatronen)`.

| Input | Prompt | Answer | Explanation |
|---|---|---|---|
| Gauss 40 | `Wat is 1 + 2 + 3 + … + 40?` | 820 | `Vereenvoudigen: maak paren van de buitenste getallen: 1 + 40 = 41, 2 + 39 = 41, … → 40 getallen zijn 20 paren van 41 → 20 × 41 = 820` |
| Gauss 10 (edge: smallest) | `Wat is 1 + 2 + 3 + … + 10?` | 55 | `… 1 + 10 = 11, 2 + 9 = 11, … → 10 getallen zijn 5 paren van 11 → 5 × 11 = 55` |
| Gauss 100 (edge: largest) | | 5050 | `… → 100 getallen zijn 50 paren van 101 → 50 × 101 = 5050` |
| deelbaar 100, 7 | `Hoeveel getallen van 1 tot en met 100 zijn deelbaar door 7?` | 14 | `Vereenvoudigen: 7 = 1 × 7, …, 98 = 14 × 7 en 15 × 7 = 105 is te groot → 14 getallen` |
| deelbaar 50, 5 (edge: exact) | | 10 | `… 5 = 1 × 5, …, 50 = 10 × 5 en 11 × 5 = 55 is te groot → 10 getallen` |
| deelbaar 200, 3 (edge: largest answer) | | 66 | `… 198 = 66 × 3 en 67 × 3 = 201 is te groot → 66 getallen` |
| tot en met 37, 82 | `Hoeveel getallen zijn er van 37 tot en met 82?` | 46 | `Vereenvoudigen: van 1 tot en met 82 zijn 82 getallen; zonder 1 tot en met 36 blijven er 82 − 36 = 46 over` |
| tot en met 11, 21 (edge: smallest) | | 11 | `… 21 − 10 = 11 over` |
| paaltjes 5, 8 | `Langs een pad van 40 meter staat om de 5 meter een paaltje, ook aan het begin en aan het eind. Hoeveel paaltjes zijn dat?` | 9 | `Vereenvoudigen: een pad van 10 meter heeft 3 paaltjes, 1 meer dan de 2 stukken → 40 : 5 = 8 stukken → 8 + 1 = 9 paaltjes` |
| paaltjes 2, 3 (edge: smallest) | `Langs een pad van 6 meter staat om de 2 meter …` | 4 | `… een pad van 4 meter heeft 3 paaltjes, … → 6 : 2 = 3 stukken → 3 + 1 = 4 paaltjes` |
| paaltjes 25, 20 (edge: 500 m) | | 21 | |
| vierkantjes 20 | `Vierkantjes van lucifers op een rij: figuur 1 heeft 4 lucifers, figuur 2 heeft 7 en figuur 3 heeft 10. Hoeveel lucifers heeft figuur 20?` | 61 | `Vereenvoudigen: elke figuur heeft 3 lucifers meer; van figuur 1 naar figuur 20 zijn 19 stappen → 4 + 19 × 3 = 61` |
| driehoekjes 20 | `Driehoekjes van lucifers op een rij: figuur 1 heeft 3 lucifers, figuur 2 heeft 5 en figuur 3 heeft 7. Hoeveel lucifers heeft figuur 20?` | 41 | `… elke figuur heeft 2 lucifers meer; … → 3 + 19 × 2 = 41` |
| tafels 15 | `Tafels staan in een rij tegen elkaar. Aan 1 tafel passen 4 stoelen, aan 2 tafels 6 en aan 3 tafels 8. Hoeveel stoelen passen er aan 15 tafels?` | 32 | `Vereenvoudigen: elke tafel geeft 2 stoelen meer; van 1 naar 15 tafels zijn 14 stappen → 4 + 14 × 2 = 32` |
| vierkantjes 20, reverse | `Vierkantjes van lucifers … Welke figuur heeft 61 lucifers?` | figuur 20 (prefix `figuur`) | `Vereenvoudigen: 61 − 4 = 57 lucifers meer dan figuur 1 → 57 : 3 = 19 stappen → figuur 1 + 19 = figuur 20` |
| tafels 15, reverse | `Tafels staan … Hoeveel tafels heb je nodig voor 32 stoelen?` | 15 (no prefix) | `Vereenvoudigen: 32 − 4 = 28 stoelen meer dan bij 1 tafel → 28 : 2 = 14 stappen → 1 + 14 = 15 tafels` |
| vierkantjes 100 (edge: largest) | | 301 | `… 99 stappen → 4 + 99 × 3 = 301` |

Tips (§3.4.1):

| Question | Answer typed | Tip |
|---|---|---|
| Gauss 40 | 1640 | `40 getallen maken 20 paren, geen 40: 20 × 41.` |
| tot en met 37, 82 | 45 | `Tel 37 en 82 allebei mee: 82 − 37 + 1 = 46.` |
| paaltjes 5, 8 | 8 | `Er staat ook een paaltje aan het begin: 8 stukken hebben 9 paaltjes.` |
| vierkantjes 20 | 64 | `Van figuur 1 naar figuur 20 zijn 19 stappen, geen 20.` |
| tafels 15 | 34 | `Van 1 naar 15 tafels zijn 14 stappen, geen 15.` |
| deelbaar, reverse figure | | no topic tip, only the fallback |

Generator invariants: forms 1/3 each; Gauss `n` from `GAUSS_ENDS`; counting kinds 1/3 each,
deelbaar `limit` from `DIVISIBLE_LIMITS` and `d ∈ [3, 9]`, tot en met `a ∈ [11, 99]` and
`b − a ∈ [10, 150]`, paaltjes spacing from `POST_SPACINGS`, `k ∈ [3, 20]`, path ≤ 500;
figures: patterns 1/3 each, `n` from `FIGURE_NUMBERS`, reverse 1/2. Key:
`simplifyProblem:gauss:<n>`, `simplifyProblem:<kind>:<numbers>` and
`simplifyProblem:figure:<pattern>:<n>:<reverse>`.

## Task 5: the set Heuristieken (spec §4.1, §4.2)

Files: `src/lib/sets.ts`, `sets.test.ts`, `session.test.ts`, `src/components/SetGlyph.svelte`.

- `HEURISTICS_SET`: id `heuristieken`, name `Heuristieken`, description `Systematisch tellen,
  terugrekenen, proberen en vereenvoudigen`, topics `systematicCounting`, `workingBackwards`,
  `guessAndCheck`, `simplifyProblem` (weight 1 each, in this order), `tablesPercent: 15`.
  Append it to `PRACTICE_SETS` after `NUMBER_SYSTEMS_SET`.
- Glyph `heuristieken`: a light bulb (violet bulb, amber rays, blue base; the `fv`/`fa`/`fb`
  classes), added to `KNOWN`.
- The set shows up greyed out on the Lesstof tab by itself (no lesson).

| Test | Expected |
|---|---|
| `PRACTICE_SETS` ids, `PRACTICE_SETS.at(-1)` | `…, 'talstelsels', 'heuristieken'`; `HEURISTICS_SET` |
| `rowLabels(HEURISTICS_SET, 15)` (as for Talstelsels in `sets.test.ts`) | the four labels, then `15% tafels` |
| `buildSession(HEURISTICS_SET, 15, rng)` | 2 tables, per topic sorted `[3, 3, 3, 4]` |
| `buildSession(HEURISTICS_SET, n, rng)` for every `SESSION_SIZES` | `n` questions with unique keys |

## After the tasks

- Final review over all tasks against the spec and this plan, including `npm test`,
  `npm run check`, `npm run build`, and `dist/sw.js` with exactly one `manifest.webmanifest`
  entry and the `woff2` font.
- The phone check of the longest prompts (money left over, the tafels pattern) is done by the
  user later; do not wait for it.
- Update the Status in `CLAUDE.md` (Heuristieken done; the roadmap table starts with the v3
  levels framework), mark §12.1 item 8 as done, and delete this plan file, in one `docs:`
  commit.
