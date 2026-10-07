# Rekenhulp

Offline-first PWA for practising mental arithmetic on a phone (no calculator), aimed at general
skill and the PABO rekentoets. A session is a short, generated set of exercises (default 15,
target ~3 minutes). No accounts, no database, no persistence, no network calls.

The design spec is the source of truth: `docs/superpowers/specs/2026-10-05-rekenhulp-design.md`.
If code and spec disagree, ask which one is wrong. The spec is long; read what the change needs,
not all of it:

- always: §1–§4 (goal, platform, session flow incl. tips and kladblok, sets and quotas), §6
  (input) and §8 (conventions)
- per topic: its §5.x section and its rows in the tips table (§3.4.1)
- expressions: §7; a new set: its entry in §12.1, open assumptions in §11

## Status

Done: the sets Tafels, Meten (v1), Verhoudingen (v1), Getallen & delers, Bewerkingen, Getalbegrip
and Breuken & kommagetallen, plus stacked fractions, the kladblok (§3.6), repeat until correct
(§3.4), tips (§3.4.1) and the table choice for Tafels (§3.2).

Next sets, in this order (topics and reasons in spec §12.1), one at a time and only when the user
says so:

| # | Set | New infrastructure |
|---|---|---|
| 7 | **Verhoudingen** v2: `percentChange`, `scale` | — |
| 8 | **Meten** v2: `speed` | compound units in the conversion engine |
| 9 | **Meetkunde**: `perimeterArea`, `solids`, `pythagoras`, `angles` | figures described in words |
| 10 | **Verbanden & statistiek**: `statistics`, `sequences`, `formulas`, `equations`, `probability` | — |
| 11 | **Talstelsels** (LKT): `numberSystems`, `romanNumerals` | text answer kind with letter keys |
| 12 | **Heuristieken** (LKT): `systematicCounting`, `workingBackwards`, `guessAndCheck`, `simplifyProblem` | long prompts must keep the keypad on screen |
| — | v3: multiple choice, calculator problems (§12.2) | multiple-choice answer kind |

To add a set: widen `Topic`/`AnswerKind` in `lib/types.ts`, register generators and labels in
`lib/topics/index.ts`, and append the set to `PRACTICE_SETS` in `lib/sets.ts`.

## Workflow

**New set or large infrastructure** (new session each time):
1. Read this file and the spec sections listed above.
2. Ask the user about open assumptions (list them in spec §11 while open). Update and commit the
   spec.
3. Write a light plan `docs/superpowers/plans/<date>-<set>.md`: per task the files, the
   signatures and types, the test cases as a table (input → expected, incl. edge cases) and the
   tips. No complete code. TDD, one commit per task. Stop for the user's review.
4. After approval, execute with subagents. Review per task bundle, then a final review that also
   checks `dist/sw.js`.
5. Update the Status above and delete the plan file (git keeps it).

**Small feature or fix:** no plan document and no review rounds. State assumptions briefly, ask
only the real choices, update and commit the spec, then implement directly with TDD and commit.

## Open follow-ups

- Manual phone checks: long prompts plus kladblok (Bewerkingen properties, Getalbegrip remainder
  prompts), the scientific keypad with 4 rows, and feedback with several stacked fractions plus a
  tip must keep the keypad or **Verder** on screen. If **Verder** falls off: give `.feedback`
  `overflow-y: auto` and `justify-content: safe center` (`.play` has `overflow: hidden`). The `?`
  slot in `3/4 = ?/12` must read well.
- Kladblok short-screen thresholds (`Scratchpad.svelte`: 816 px for 3 rows, 760 px for 2) are
  estimates; adjust after the phone check.
- Focus falls back to `body` after a screen or question change, and when the kladblok's "Naar
  antwoordveld" overlay is activated by keyboard (keyboard/screen-reader users only).
- Android splash uses the light `background_color` in dark mode (cosmetic).

## Svelte pitfalls

- Inline markup with stacked fractions (`MathText`, `KeypadAnswer`) is whitespace-sensitive: a line
  break between tags renders as a space, and Svelte trims spaces at the edges of an element's
  content, so write a deliberate edge space as an expression (`{' en '}`). Tests assert exact
  `textContent` to catch this.

## PWA pitfalls

- Do not add `webmanifest` to `workbox.globPatterns`: vite-plugin-pwa already precaches the manifest,
  and a second entry with a different revision makes Workbox throw at SW startup (no offline mode).
  After `npm run build`, `dist/sw.js` must contain exactly one `manifest.webmanifest` entry.

## Stack

- Svelte 5 (runes) + TypeScript (strict) + Vite — no SvelteKit
- `vite-plugin-pwa` (generateSW, full precache, works fully offline)
- Vitest for tests, `svelte-check` for type checking, Prettier for formatting
- Output is a static `dist/` folder; the user hosts it themselves

## Commands

```bash
npm install     # install dependencies
npm test        # run Vitest once
npm run check   # svelte-check (type check)
npm run build   # production build incl. service worker
npm run format  # Prettier, writes all files
npm run dev     # dev server (not pre-approved, ask first)
npm run preview # serve dist/ (not pre-approved, ask first)
```

## Command allowlist override (this project only)

The user's global allowlist (`~/.claude/rules/allowlist.md`) is extended **for this repository only**
with the commands below, so work can proceed autonomously. Authorised by the user on 2026-10-05.

- `npm install` (incl. adding packages)
- `npm test`
- `npm run check`, `npm run build` (authorised 2026-10-05, for autonomous verification)
- `npm run format` (Prettier, authorised 2026-10-06)
- `sed -n` (read-only printing only; `sed -i` and other write forms stay forbidden; authorised
  2026-10-06)
- `git init`
- `git add`
- `git commit`

Everything else from the global allowlist still applies (no `git push`, `git checkout`,
`git reset`, `npx`, `node`, etc.). Ask before running anything not listed here or globally.

## Language conventions

- Code, identifiers, comments, tests, commit messages, docs: **English**
- User-facing UI text and exercise prompts: **Dutch**
- Numbers in the UI use Dutch notation: decimal comma (`0,25`), thin-space thousands
  separator (`2 500 000`), `×` and `:` as operators, superscript powers

## Architecture

```
src/
  App.svelte            state machine: sets → setup → playing → results
  components/           SetOverview, SetupScreen, PlayScreen (question queue incl. repeats),
                        QuestionView, KeypadAnswer (answer field + error + keypad, routes keys
                        to the kladblok), Keypad, Scratchpad (kladblok cells), Feedback,
                        ResultScreen, MathText + Fraction (stacked fractions), press.ts
                        (act-on-press action)
  lib/
    types.ts            Question, Step, AnswerKind, CheckResult, Topic, PracticeSet
    random.ts           seedable RNG; every generator takes an rng argument; drawUntil redraws
                        until all rules of an exercise hold
    steps.ts            step factories (number, fraction, simplest fraction, boolean,
                        factorization, rewrite, scientific) and all answer parsing and checking
    keypadInput.ts      pure key → input reducers per answer kind
    keys.ts             key catalogue (label, aria label) and keyDefs; keypads list key names
                        one grid row per line. A new key: widen KeypadKey, add it to KEYS,
                        handle it in the reducers that should accept it
    inputModels.ts      per answer kind: keys, columns, typing state, reducer, validate,
                        display, view
    scratchpad.ts       kladblok: cell count, keys, typing, when shown
    fractionText.ts     splits text into plain runs and (mixed) fractions for stacked display
    promptSize.ts       prompt font size step from the displayed length
    primes.ts           gcd, lcm, isPrime, prime factorization
    results.ts          question records + session summary
    sets.ts             practice sets (config): topics + weights + tables share
    session.ts          quotas, shuffle, de-duplication, table choice (generatorsFor),
                        repeats (insertRepeat)
    backGuard.ts        keeps the system back inside the app (wired in App.svelte)
    wakeLock.ts         keeps the screen on while PlayScreen is mounted
    tips.ts             Diagnose type, firstTip, factor-of-ten tip (fallback of number steps)
    format.ts           Dutch number/expression formatting
    rational.ts         exact bigint fractions (expressions, unit conversions, input parsing)
    expr/               tokenizer, parser, evaluate, format, reduce (evaluation steps), chains,
                        rewriteCheck (one property per step), misconceptions (for tips)
    topics/             one generator module per topic + index.ts (registry and labels)
```

- A topic generator is a pure function `(rng) => Question`. `Question.check(input)` returns
  `{ correct, expected, tip?, explanation? }`. Each generator passes a `diagnose` to its step for
  tips; a tip fires only when the answer equals exactly what that mistake produces.
- Keep `lib/` free of Svelte imports so it is unit-testable in plain Node.

## Domain rules (do not get these wrong)

- Order of operations (Dutch convention): parentheses → powers → `×` and `:` with **equal**
  priority, left to right → `+` and `−` with equal priority, left to right.
- Never use `eval`/`Function` for expressions; always go through `lib/expr`.
- Commutative and associative properties apply to `+` and `×` only, never to `−` or `:`.
- All arithmetic is exact; never compare floats. Use `lib/rational.ts`.
- Generated exercises must be solvable without a calculator: divisions are exact, numbers stay
  within the ranges in the spec.

## Testing

- TDD for everything in `lib/`. Generators are tested with a seeded RNG by generating many
  (≥1000) exercises and asserting invariants (ranges, exactness, `check(expected)` is correct).
- Rewrite checker: table-driven tests, including the accept/reject examples in the spec.

## Out of scope

Persistence of any kind (incl. localStorage), statistics, streaks, accounts, analytics,
adaptive difficulty, network requests. Do not add these without an explicit request.
