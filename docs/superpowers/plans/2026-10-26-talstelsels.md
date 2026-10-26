# Talstelsels — light plan

Spec: §5.39–§5.40, §6 (letter input, ⌫ bottom left), §3.4.1 (two Roman tips), §4.1/§4.2
(set, quota example).

TDD per task: tests first, then code, `npm test` + `npm run check`, one commit per task.
Checkpoints: after Task 3 (infrastructure) and after Task 6 (set done).

## Task 1 — Letter keys and reducers

Files: `src/lib/keypadInput.ts`, `src/lib/keys.ts`, tests in `keypadInput.test.ts`,
`keys.test.ts`, `scratchpad.test.ts`.

- Widen `KeypadKey` with `LetterKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'I' | 'V' | 'X' | 'L' | 'M'`
  (`C` and `D` are shared by both keypads).
- `KEYS`: one entry per letter, label = the letter, no aria label (`digit()`-style helper).
- `MAX_BASE_DIGITS_LENGTH = 8`, `MAX_ROMAN_LENGTH = 15`.
- `applyBaseDigitsKey(value: string, key: KeypadKey): string` and
  `applyRomanKey(value: string, key: KeypadKey): string`: backspace deletes the last character;
  an allowed key is appended below the maximum; every other key is ignored. One private helper
  `appendOnly(allowed: ReadonlySet<KeypadKey>, max: number)` builds both.

| Reducer    | Value             | Key         | Result             |
|------------|-------------------|-------------|--------------------|
| baseDigits | `''`              | `B`         | `B`                |
| baseDigits | `B`               | `4`         | `B4`               |
| baseDigits | `''`              | `0`         | `0` (leading zero allowed) |
| baseDigits | `B4`              | backspace   | `B`                |
| baseDigits | `''`              | backspace   | `''`               |
| baseDigits | 8 chars           | `1`         | unchanged          |
| baseDigits | `1`               | `I`, `,`, `-`, `/`, `^`, `=`, `' '` | unchanged |
| roman      | `MCM`             | `X`         | `MCMX`             |
| roman      | `''`              | `A`, `7`, `,` | unchanged        |
| roman      | 15 chars          | `I`         | unchanged          |
| roman      | `IV`              | backspace   | `I`                |

- Existing reducers ignore letters: `applyKey('12', 'A')` → `12`, `applyFractionKey`,
  `applyExpressionKey`, `applyFactorizationKey`, `applyScientificKey`, and the kladblok
  `applyNoteKey` leave the state unchanged for `A` and `M`.
- `keys.test.ts`: every letter has label = key.

## Task 2 — Answer kinds `baseDigits` and `roman`

Files: `src/lib/types.ts`, `src/lib/inputModels.ts`, `src/lib/keys.ts` (`span`, `okSpan`,
`keyRows`), `src/components/Keypad.svelte`, tests
`inputModels.test.ts`, `keys.test.ts`.

- `AnswerKind` gains `'baseDigits' | 'roman'`.
- `KeypadStates`: `baseDigits: string; roman: string`.
- `BASE_DIGITS_KEYS` (4 columns, rows as spec §6: `7 8 9 A / 4 5 6 B / 1 2 3 C / 0 D E F / ⌫`),
  `ROMAN_KEYS` (3 columns: `I V X / L C D / ⌫ M(span 2)`; OK fills row 4).
- `KeyDef` gains `span?: number` (grid columns, default 1). A keypad sets it on its own copy:
  `{ ...KEYS.M, span: 2 }`; the catalogue `KEYS` stays without spans.
- `okSpan(keys, columns)` counts cells as the sum of spans: `columns − (cells % columns)`
  (roman: 9 cells → OK spans 3, its own row).
- `keyRows(keys, columns): number`: rows including the OK row (`(cells + okSpan) / columns`).
- Every keypad is as high as five rows (spec §6): `Keypad` always sets `--rows` from
  `keyRows(keys, columns)` and gives `.key`
  `height: calc((5 * 52px + 4 * 8px - (var(--rows) - 1) * 8px) / var(--rows))`, and `.tall .key`
  the same with 56 px. Five-row keypads keep 52/56 px; scientific and roman (4 rows) get 67/72
  px. The tray keeps its own 48 px (`.tray .key` must still win). No flag on the model.
- `Keypad.svelte`: `style:grid-column="span {span}"` on a key with a span.
- `INPUT_MODELS.baseDigits = { ...textModel(BASE_DIGITS_KEYS, applyBaseDigitsKey, () => null,
  (input) => input), columns: 4 }`; `INPUT_MODELS.roman = { ...textModel(ROMAN_KEYS,
  applyRomanKey, () => null, (input) => input)` (3 columns, the default).
- `QuestionView` needs no change: its `else` branch takes every text model.

| Test                                   | Expected |
|----------------------------------------|----------|
| labels of `baseDigits`                 | `7 8 9 A 4 5 6 B 1 2 3 C 0 D E F ⌫` |
| labels of `roman`                      | `I V X L C D ⌫ M` |
| `okSpan(baseDigits keys, 4)`           | 3 |
| `okSpan(roman keys, 3)`                | 3 (9 cells: OK in its own row) |
| `okSpan` of existing keypads           | unchanged (regression: number 2, expression 3, scientific 1) |
| `keyRows`                              | roman 4, baseDigits 5, number 5, scientific 4 |
| every keypad incl. kladblok            | `⌫` is bottom left: the cells before it ≡ 0 mod columns, and the keys after it fit in its row |

Component check (`Keypad.test.ts` or `QuestionView.test.ts`): the roman and scientific keypads
set `--rows: 4`, the number keypad `--rows: 5`; `M` has `grid-column: span 2`. Phone check
later by the user: the prompt does not move between a number step and a scientific or roman
step, nor when a kladblok cell becomes active.
| `validate('B4')`, `validate('IIII')`   | `null` |
| `display('B4')`, `view('MCM')`         | `B4`, `[{ type: 'text', text: 'MCM' }]` |
| `displayAnswer('roman', 'XIV')`        | `XIV` |
| typing `B`, `4` via `apply`            | `B4`, `canSubmit` true; `''` → false |

Component check (`QuestionView.test.ts`, one case): a `roman` step shows the keys `I`–`M` and
submits `XIV` on OK.

## Task 3 — Text step

Files: `src/lib/steps.ts`, test `steps.test.ts`.

```ts
interface TextStepOptions {
  kind: 'baseDigits' | 'roman';
  prompt: string;
  /** The canonical answer, shown as the correct answer. */
  answer: string;
  /** Applied to the input before comparing, e.g. removing leading zeros. */
  normalize?: (input: string) => string;
  /** Names the likely mistake of a wrong answer (spec §3.4.1). */
  tip?: (input: string) => string | undefined;
  explanation?: string;
}
export function textStep(options: TextStepOptions): Step
```

- correct ⇔ `normalize(input) === answer`; `expected` = `answer`; `tip` only when wrong.

| Options                                   | Input   | correct | tip |
|-------------------------------------------|---------|---------|-----|
| answer `1011`, normalize strips zeros     | `1011`  | ✔ | — |
| same                                      | `01011` | ✔ | — |
| same                                      | `1012`  | ✘ | — |
| answer `IV`, tip returns `'t'` for `IIII` | `IIII`  | ✘ | `t` |
| same                                      | `IV`    | ✔ | none (tip not called) |
| any                                       | wrong   | — | `expected` is the answer |

**Checkpoint:** reread the diff of Tasks 1–3 against spec §6; short status to the user.

## Task 4 — Topic `numberSystems` (spec §5.39)

Files: `src/lib/topics/numberSystems.ts` (+ test), `src/lib/types.ts` (`Topic`),
`src/lib/topics/index.ts` (generator, label `Talstelsels (tweetallig, vijftallig, zestientallig)`).

```ts
export type Base = 2 | 5 | 16;
export function toBase(value: number, base: Base): string   // capitals A–F
export function fromBase(digits: string, base: Base): number
export function generateNumberSystems(rng: Rng): Question
```

- Draw the base (`pick`), the direction (50%) and the value (`randomInt` in the base's range;
  base 16 via `drawUntil` until a digit is a letter).
- To decimal: `numberStep({ prompt, answer, explanation })`. From decimal:
  `textStep({ kind: 'baseDigits', answer: toBase(…), normalize: strip leading zeros, … })`.
- Key: `numberSystems:<to|from>:<base>:<value>`.

| Function / case             | Input                | Expected |
|-----------------------------|----------------------|----------|
| `toBase`                    | 11, 2                | `1011` |
| `toBase`                    | 73, 5                | `243` |
| `toBase`                    | 180, 16 / 26, 16 / 255, 16 | `B4` / `1A` / `FF` |
| `fromBase`                  | `1011`, 2 / `243`, 5 / `B4`, 16 | 11 / 73 / 180 |
| round trip                  | every value of every range | `fromBase(toBase(v)) === v` |
| prompt to decimal, base 2   | 11                   | `Schrijf het tweetallige getal 1011 als gewoon getal.` |
| prompt from decimal, base 16 | 180                 | `Schrijf 180 in het zestientallig stelsel.` |
| explanation to decimal      | 11, base 2           | `1 × 8 + 0 × 4 + 1 × 2 + 1 × 1 = 8 + 2 + 1 = 11` |
| explanation to decimal      | 73, base 5           | `2 × 25 + 4 × 5 + 3 × 1 = 50 + 20 + 3 = 73` |
| explanation to decimal      | 180, base 16         | `B = 11: 11 × 16 + 4 × 1 = 176 + 4 = 180` |
| explanation to decimal      | 175 (`AF`)           | `A = 10, F = 15: 10 × 16 + 15 × 1 = 160 + 15 = 175` |
| explanation, one non-zero term (middle left out) | 8, base 2 | `1 × 8 + 0 × 4 + 0 × 2 + 0 × 1 = 8` |
| same                        | 160 (`A0`)           | `A = 10: 10 × 16 + 0 × 1 = 160` |
| explanation from decimal    | 11, base 2           | `11 = 8 + 2 + 1 = 1 × 8 + 0 × 4 + 1 × 2 + 1 × 1 → 1011` |
| same, one term              | 32, base 2           | `32 = 1 × 32 + 0 × 16 + 0 × 8 + 0 × 4 + 0 × 2 + 0 × 1 → 100000` |
| explanation from decimal    | 73, base 5           | `73 = 2 × 25 + 4 × 5 + 3 × 1 → 243` |
| explanation from decimal    | 180, base 16         | `180 = 11 × 16 + 4 × 1 en B = 11 → B4` |
| check from decimal          | 11, base 2: `01011` / `1012` | ✔ / ✘ without tip |

Invariants over 1000 seeds: every base and both directions occur; values in their ranges;
base 16 has a letter; `check(expected)` is correct; to-decimal answer equals `fromBase` of the
digits in the prompt; prompts have no slot.

## Task 5 — Topic `romanNumerals` (spec §5.40)

Files: `src/lib/topics/romanNumerals.ts` (+ test), `types.ts`, `topics/index.ts` (label
`Romeinse cijfers (tot 100 en jaartallen)`).

```ts
interface RomanGroup { symbols: string; value: number }   // one decimal place: 'CM', 900
export function toRoman(value: number): string
export function romanGroups(value: number): RomanGroup[]  // non-zero places, high to low
/** Sum of all symbols, as if no pair were subtracted: XIV → 16. */
export function additiveValue(numeral: string): number
export function generateRomanNumerals(rng: Rng): Question
```

- Value: 50% `randomInt(1, 100)`, 50% `randomInt(1000, 2030)`, `drawUntil` a group is a
  subtractive pair (`IV IX XL XC CD CM`).
- To decimal: `numberStep` with `diagnose: exactTip(additiveValue(numeral), …)` naming the first
  pair. From decimal: `textStep({ kind: 'roman', tip })`; `tip` fires when the input's symbols
  are non-increasing in value and `additiveValue(input) === value`.
- Key: `romanNumerals:<to|from>:<value>`.

| Function / case | Input | Expected |
|---|---|---|
| `toRoman` | 1, 4, 9, 14, 40, 88, 90, 99, 100 | `I IV IX XIV XL LXXXVIII XC XCIX C` |
| `toRoman` | 1888, 1994, 2024, 2030 | `MDCCCLXXXVIII MCMXCIV MMXXIV MMXXX` |
| `toRoman` brute force | 1–3999 | at most 3 equal symbols in a row; `additiveValue` minus twice each subtracted symbol equals the value |
| `additiveValue` | `XIV`, `MCMXCIV`, `IIII` | 16, 2216, 4 |
| prompts | 1994 | `Schrijf MCMXCIV als gewoon getal.` / `Schrijf 1994 met Romeinse cijfers.` |
| explanation to decimal | 1994 | `MCMXCIV = M + CM + XC + IV = 1000 + 900 + 90 + 4 = 1994` |
| explanation to decimal, one group | 9 | `IX = 9` |
| explanation from decimal | 2024 | `2024 = 2000 + 20 + 4 = MM + XX + IV → MMXXIV` |
| explanation from decimal, one group | 9 | `9 = IX` |
| tip from decimal | 4, `IIII` | `De waarde klopt, maar gebruik de aftrekregel: 4 = IV.` |
| tip from decimal | 1994, `MDCCCCLXXXXIIII` | `… aftrekregel: 900 = CM, 90 = XC en 4 = IV.` |
| no tip | 1994, `MCMLXXXXIIII` (has a pair) / 14, `XVI` (sum 16) / 14, `IIIIX` (increasing) | none |
| tip to decimal | `XIV`, 16 | `Een kleiner teken vóór een groter teken trek je af: IV = 4, niet 6.` |
| tip to decimal | `MCMXCIV`, 2216 | `… CM = 900, niet 1100.` |
| no tip to decimal | `XIV`, 15 | none |

Invariants over 1000 seeds: both directions and both ranges occur; every numeral has a pair;
`check(expected)` is correct; to-decimal answer equals the value of the numeral; no slot.

## Task 6 — Set Talstelsels

Files: `src/lib/sets.ts` (+ `sets.test.ts`), `src/components/SetGlyph.svelte`,
`src/lib/topics/slot.sweep.test.ts`, `src/lib/session.test.ts` if quotas are listed there.

- `NUMBER_SYSTEMS_SET = { id: 'talstelsels', name: 'Talstelsels', description: 'Tweetallig,
  vijftallig, zestientallig en Romeinse cijfers', topics: numberSystems 1, romanNumerals 1,
  tablesPercent: 15 }`, appended to `PRACTICE_SETS`.
- Glyph `talstelsels` in `KNOWN` and the `{#if}` chain: a stroked `X` (amber) beside `1 0`
  (violet), with a blue base line, in the 28×28 style of the others.

| Test | Expected |
|---|---|
| quota n = 15 | tables 2, topics 7 + 6 (either way) |
| quota n = 5 | tables 0, 3 + 2 |
| `describeSetTopicRows(set, 15)` | Talstelsels, Romeinse cijfers, `15% tafels` |
| slot sweep | both topics never have a slot |
| Lesstof tab | Talstelsels row present and disabled (existing test covers new sets; check) |

**Checkpoint + final review:** reread the whole diff against spec §5.39–§5.40, §6 and this
plan; `npm run build` and check `dist/sw.js` (one `manifest.webmanifest`, `woff2` listed).
Then update `CLAUDE.md` (Status, roadmap row removed, Architecture if needed), spec §12.1
item 7 → "done", remove the open items from spec §11, and delete this plan.
