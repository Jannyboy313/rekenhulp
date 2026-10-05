# Rekenhulp

Offline-first PWA for practising mental arithmetic on a phone (no calculator), aimed at general
skill and the PABO rekentoets. A session is a short, generated set of exercises (default 15,
target ~3 minutes). No accounts, no database, no persistence, no network calls.

The design spec is the source of truth: `docs/superpowers/specs/2026-10-05-rekenhulp-design.md`.
Read it before changing behaviour. If code and spec disagree, ask which one is wrong.

## Status

Beta: only the **Tafels** set is implemented (plan: `docs/superpowers/plans/2026-10-05-beta-tafels.md`).
Every other set gets its own implementation plan; do not start one until the user says so. To add a
set: widen `Topic`/`AnswerKind` in `lib/types.ts`, register generators and labels in
`lib/topics/index.ts`, and append the set to `PRACTICE_SETS` in `lib/sets.ts`.

Known follow-ups for the next plans:
- **Before adding the `boolean`/`expression`/`factorization` answer kinds:** `QuestionView` hard-codes
  number input (`parseDutchNumber` as `canSubmit`, always the number `Keypad`), and `Step` has no
  "invalid input, attempt not consumed" path (spec §6 "Ongeldige som"). Introduce a per-kind input
  model (keys, reducer, validate, display) and let `QuestionView` pick it by `step.kind` first.
- Focus falls back to `body` after a screen or question change (keyboard/screen-reader users only).
- Android splash uses the light `background_color` in dark mode (cosmetic).

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
  components/           SetOverview, SetupScreen, PlayScreen, QuestionView, Keypad, Feedback,
                        ResultScreen
  lib/
    random.ts           seedable RNG; every generator takes an rng argument
    steps.ts            step factories (numberStep) — all answer checking goes through here
    keypadInput.ts      pure key → input reducer
    results.ts          question records + session summary
    sets.ts             practice sets (config): topics + weights + tables share
    session.ts          builds a session: quotas, shuffle, de-duplication
    format.ts           Dutch number/expression formatting
    rational.ts         exact bigint fractions (expressions, unit conversions, input parsing)
    expr/               tokenizer, parser (AST), evaluate, rewriteCheck
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
