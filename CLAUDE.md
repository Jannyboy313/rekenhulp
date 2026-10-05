# Rekenhulp

Offline-first PWA for practising mental arithmetic on a phone (no calculator), aimed at general
skill and the PABO rekentoets. A session is a short, generated set of exercises (default 15,
target ~3 minutes). No accounts, no database, no persistence, no network calls.

The design spec is the source of truth: `docs/superpowers/specs/2026-10-05-rekenhulp-design.md`.
Read it before changing behaviour. If code and spec disagree, ask which one is wrong.

## Status

Design phase. The spec is being iterated on; do not start implementation until the user says so.

## Stack

- Svelte 5 (runes) + TypeScript (strict) + Vite — no SvelteKit
- `vite-plugin-pwa` (generateSW, full precache, works fully offline)
- Vitest for tests, `svelte-check` for type checking, Prettier for formatting
- Output is a static `dist/` folder; the user hosts it themselves

## Commands

```bash
npm install     # install dependencies
npm test        # run Vitest once
npm run dev     # dev server (not pre-approved, ask first)
npm run build   # production build incl. service worker (not pre-approved, ask first)
npm run check   # svelte-check (not pre-approved, ask first)
```

## Command allowlist override (this project only)

The user's global allowlist (`~/.claude/rules/allowlist.md`) is extended **for this repository only**
with the commands below, so work can proceed autonomously. Authorised by the user on 2026-10-05.

- `npm install` (incl. adding packages)
- `npm test`
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
  App.svelte            state machine: start → playing → results
  components/           StartScreen, QuestionView, Keypad, Feedback, ResultScreen
  lib/
    random.ts           seedable RNG; every generator takes an rng argument
    session.ts          builds a session: quotas, shuffle, de-duplication
    format.ts           Dutch number/expression formatting
    rational.ts         exact bigint fractions (expressions, unit conversions, input parsing)
    expr/               tokenizer, parser (AST), evaluate, rewriteCheck
    topics/             one generator module per topic
```

- A topic generator is a pure function `(rng) => Question`. `Question.check(input)` returns
  `{ correct, expected, explanation? }`. Adding a topic = adding a generator + quota entry.
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
