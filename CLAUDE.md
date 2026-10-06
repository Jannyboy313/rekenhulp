# Rekenhulp

Offline-first PWA for practising mental arithmetic on a phone (no calculator), aimed at general
skill and the PABO rekentoets. A session is a short, generated set of exercises (default 15,
target ~3 minutes). No accounts, no database, no persistence, no network calls.

The design spec is the source of truth: `docs/superpowers/specs/2026-10-05-rekenhulp-design.md`.
Read it before changing behaviour. If code and spec disagree, ask which one is wrong.

## Status

Implemented sets: **Tafels** (plan: `docs/superpowers/plans/2026-10-05-beta-tafels.md`), **Meten**
(plan: `docs/superpowers/plans/2026-10-05-meten.md`), **Verhoudingen** v1
(plan: `docs/superpowers/plans/2026-10-05-verhoudingen.md`), **Getallen & delers**
(plan: `docs/superpowers/plans/2026-10-06-getallen-delers.md`) and **Bewerkingen**
(plan: `docs/superpowers/plans/2026-10-06-bewerkingen.md`).
UI feedback round 1 (plan: `docs/superpowers/plans/2026-10-06-feedback-round-1.md`) added stacked
fractions everywhere, the breuk key with a fraction template and mixed numbers, counts 5–50,
a light red Stop button and keys that act on press.
The kladblok (plan: `docs/superpowers/plans/2026-10-06-kladblok.md`, revised without a plan) is a
2×3 scratchpad above the prompt, typed on the number keypad with a spatie in the place of OK
(numbers separated by spaces); cells are switched by tapping. Notes last one question and are
hidden for tables and Ja/Nee (spec §3.6).
Repeat until correct (no plan, spec §3.4): a wrong question returns at a random later place in
the queue (`insertRepeat` in `lib/session.ts`, queue in `PlayScreen.svelte`) until it is correct;
repeats show "Herhaling" and are not recorded, so the results cover first attempts only.
Every other set gets its own implementation plan; do not start one until the user says so. To add a
set: widen `Topic`/`AnswerKind` in `lib/types.ts`, register generators and labels in
`lib/topics/index.ts`, and append the set to `PRACTICE_SETS` in `lib/sets.ts`.

## Roadmap: practice sets

All sets (spec §4.1). Every set except Tafels mixes in 15% tables. Build them in this order, one
implementation plan per step:

| # | Set | Topics (spec section) | New infrastructure needed | Version | Status |
|---|---|---|---|---|---|
| 0 | **Tafels** | `tables` (§5.1) | — (beta foundation) | v1 | ✅ done |
| 1 | **Meten** | `volume`, `area`, `length`, `mass`, `time` (§5.10), `numberUnits` (§5.14) | One shared conversion engine; number input + unit suffix only; superscript powers of 10 in prompts | v1 | ✅ done |
| 2 | **Verhoudingen** (v1 part) | `percentages` (§5.12), `ratios` (§5.13) | `Step.prefix` (`€`); `fraction` input (`/` key) brought forward from v2 for `12½%` | v1 | ✅ done |
| 3 | **Getallen & delers** | `lcm`, `gcd`, `prime`, `factorization`, `divisibility`, `squares` (§5.2–§5.7) | Per-kind input model (`lib/inputModels.ts`) with inline invalid-input errors; `boolean` (Ja/Nee) and `factorization` answer kinds; first `lib/expr` tokenizer and parser (`×`, `^`) | v1 | ✅ done |
| 4 | **Bewerkingen** | `orderOfOperations` (§5.8), `smartCalculation` (§5.9), `properties` weight 0.5 (§5.11) | Full `lib/expr` engine (§7): parser, evaluate, formatter, evaluation steps, chains, rewrite checker; `expression` answer kind with a 4-column keypad; negative literals; two-step questions | v1 | ✅ done |
| 5 | **Verhoudingen** (v2 part) | `fractionConversion`, `fractionArithmetic` (§12) | Judging simplified vs unsimplified fractions (the `fraction` input exists since set 2) | v2 | later |
| 6 | **Toepassingen** | `speed`, `scale`, `average`, `geometry` (§12) | Context/word problems | v3 | later |

Why this order: 1 and 2 add useful sets quickly with only small infrastructure additions. 3 introduces
the answer-kind refactor and the first parser pieces, which 4 then extends.

Workflow per set (new session each time):
1. Read this file, the spec and the beta plan, the reference for structure and level of detail.
2. Ask the user about open spec assumptions affecting the set (spec §11). Update and commit the spec.
3. Write `docs/superpowers/plans/<date>-<set>.md` in the beta plan's style: TDD, complete code, one
   commit per task. Then stop for the user's review. No implementation without approval.
4. After approval, execute with subagents. Run per-task (or per-bundle) spec and quality reviews,
   then a final review that also checks `dist/sw.js`.
5. Update the Status column above when the set is done.

Known follow-ups for the next plans:
- The repo is not fully Prettier-clean (`npm run format` is not pre-approved): a few lines in
  several modules exceed the print width. Run `npm run format` once with the user's approval and
  commit the result.
- Manual phone check for Bewerkingen (plan Task 15 Step 2) is still open, incl. whether long
  property prompts with the kladblok keep the keypad on screen.
- Focus falls back to `body` after a screen or question change (keyboard/screen-reader users only).
  The same happens inside a step when the kladblok's "Naar antwoordveld" overlay is activated by
  keyboard: the overlay is removed while it has focus.
- Kladblok short-screen thresholds (CSS media queries in `Scratchpad.svelte`: 816 px for 3 rows,
  760 px for 2) are estimates; adjust them after the phone check if the keypad is cut off.
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
npm run dev     # dev server (not pre-approved, ask first)
npm run preview # serve dist/ (not pre-approved, ask first)
```

## Command allowlist override (this project only)

The user's global allowlist (`~/.claude/rules/allowlist.md`) is extended **for this repository only**
with the commands below, so work can proceed autonomously. Authorised by the user on 2026-10-05.

- `npm install` (incl. adding packages)
- `npm test`
- `npm run check`, `npm run build` (authorised 2026-10-05, for autonomous verification)
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
  components/           SetOverview, SetupScreen, PlayScreen, QuestionView, KeypadAnswer
                        (answer field + error + keypad, routes keys to the kladblok), Keypad,
                        Scratchpad (kladblok cells), Feedback, ResultScreen, MathText +
                        Fraction (stacked fractions), press.ts (act-on-press action)
  lib/
    random.ts           seedable RNG; every generator takes an rng argument
    steps.ts            step factories (number, fraction, boolean, factorization, rewrite),
                        parseAnswer and parseFactorization — all answer parsing and checking
                        goes through here
    keypadInput.ts      pure key → input reducers (numbers, fraction templates, factorizations,
                        expressions)
    inputModels.ts      per answer kind: keys, columns, typing state, reducer, validate,
                        display, view
    scratchpad.ts       kladblok: cell count, keys (spatie), typing, when shown
    fractionText.ts     splits text into plain runs and (mixed) fractions for stacked display
    primes.ts           gcd, lcm, isPrime, prime factorization
    results.ts          question records + session summary
    sets.ts             practice sets (config): topics + weights + tables share
    session.ts          builds a session: quotas, shuffle, de-duplication
    format.ts           Dutch number/expression formatting
    rational.ts         exact bigint fractions (expressions, unit conversions, input parsing)
    expr/               tokenizer, parser (AST with groups), evaluate, format (prompt text),
                        reduce (evaluation steps), chains, rewriteCheck (one property per step)
    topics/             one generator module per topic
```

- A topic generator is a pure function `(rng) => Question`. `Question.check(input)` returns
  `{ correct, expected, explanation? }`. Adding a topic = adding a generator, registering it in
  `topics/index.ts` and adding it to a set in `sets.ts`.
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
