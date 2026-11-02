# Plan: Verdieping for Verbanden & statistiek, Talstelsels and Heuristieken

Spec: `docs/superpowers/specs/2026-10-05-rekenhulp-design.md` §5.86–§5.97 (rules block above
§5.86), §4.1, §4.2, §12.2 step 4. Twelve topics, one agent each, built in parallel under one
orchestrator. Goal of this plan: low token cost, no long handovers, no merge conflicts.

## 0. Roles and hard rules

- **Orchestrator** = the session that executes this plan (Opus). It only: runs the preflight,
  dispatches, merges, integrates `deep`, verifies, updates docs. It never reads topic source
  files and never implements a topic itself. Keep its context small: read agent reports
  (≤ 12 lines each), not diffs.
- **Agents never start agents.** Only the orchestrator dispatches. Max **7 agents at once**;
  start the next task as soon as one finishes (rolling, not waves).
- Agent type: `honey:hive-builder` (≤ 2 files per task), with `model` passed explicitly and
  `isolation: "worktree"`. No resume (`SendMessage`) of finished agents: a fix round is a **fresh**
  agent with only the fix brief.
- Models (per task table): **Haiku** by default; **Sonnet** only for the two tasks marked S.
  Each agent stops and reports at ~100K tokens used (Haiku is only cheap under ~150K).
- Commands (project allowlist, CLAUDE.md): `npm install`, `npm test`, `npm run check`,
  `git status|diff|log|add|commit`, `git merge --no-ff main` (in a worktree), `ls`, `cat`, `echo`,
  `grep`. Output is filtered with `grep -E` only. Forbidden, also for agents: `npx`, `node`,
  `tail`, `head`, `wc`, `cut`, anything that rewrites files from the shell, `npm run format`,
  `git push|checkout|reset|rebase|stash|commit --amend`. Agents must list breaches in their
  report (they self-report reliably).
- Commits: English, one subject line, no body, no footer, no ticket key, capitalised past
  tense (`Implemented the twoDice topic for the Verbanden Verdieping`).
- Cost stop: if three agents fail their gates, stop and ask the user (an earlier sweep was
  stopped at ~1.5M tokens). Expected: ~12 × 60–100K, mostly Haiku.

## 1. Preflight (orchestrator, inline)

1. Read CLAUDE.md and spec §11. If the user has not confirmed the open assumptions there,
   ask once (AskUserQuestion), then fold the answers into the spec and commit it.
2. 1Password unlocked (commit signing fails otherwise; never bypass).
3. `git status` clean on `main`. Agent worktrees branch from `origin/main`, not local `main`,
   so every agent starts with `git merge --no-ff main` (step 3 below makes this necessary).

4. State 2026-11-02: §1 and §2 are done (`0808490`, `63a6271`). The first dispatch failed: the
   repo has no `origin`, worktrees started at `b48639d` and every agent was denied
   `git merge --no-ff main`, even after `Bash(git merge --no-ff main)` was added to
   `.claude/settings.json`. Before dispatching 7, dispatch one agent and confirm its merge works.
   Seven stale clean worktrees under `.claude/worktrees/` (branches `worktree-agent-*`) still need
   `git worktree remove` + `git branch -d`. In the brief, drop the "load skill" line
   (`honey:hive-builder` has no Skill tool) and say "run exactly `git merge --no-ff main`, no -m".

## 2. Scaffold (one Haiku agent, no worktree, runs alone, then one commit)

Goal: after this commit each topic agent edits only its own two files, so branches never conflict.
Brief the agent with the 12 ids, labels and file names of the task table (below):

- `src/lib/types.ts`: add the 12 ids to `Topic` (after the last Opfrisser topic of each set's
  group, as the other v3 topics).
- `src/lib/topics/<id>.ts` per topic: a **valid stub** exporting `generate<Id>(rng): Question`
  (copy the shape of `topics/remainders.ts`; one `numberStep`, prompt `Stub`, answer 0) so the
  all-topics tests (`topics/slot.sweep.test.ts`, `session.test.ts`) stay green.
- `src/lib/topics/index.ts`: import, `GENERATORS` entry and `TOPIC_LABELS` entry per topic (labels
  from the spec, `splitTopicLabel` format: `Name (detail)`).
- Do **not** touch `sets.ts` (`deep` comes in step 5).
- Gate: `npm test` and `npm run check` green. Orchestrator checks with
  `git diff --stat` and commits (`Added stubs and labels for twelve Verdieping topics`).

## 3. Topic tasks (agents)

| #   | Topic id              | Spec    | Set          | Model | Exemplar to copy (besides `remainders.ts`)                   | Notes |
|-----|-----------------------|---------|--------------|-------|--------------------------------------------------------------|-------|
| T1  | `twoDice`             | §5.86   | Verbanden    | Haiku | `topics/probability.ts` (fraction step)                      | enumerate 36 outcomes; assert the count table |
| T2  | `statisticsReasoning` | §5.87   | Verbanden    | **S** | `topics/compareRatios.ts` (`choice`), `topics/statistics.ts` | exact rationals, `drawUntil`; MC |
| T3  | `statisticsProblems`  | §5.88   | Verbanden    | Haiku | `topics/statistics.ts`                                       | redraw rules on decimals |
| T4  | `formulaProblems`     | §5.89   | Verbanden    | Haiku | `topics/formulas.ts`, `topics/sequences.ts`                  | reuse the word-formula table of `formulas.ts` (export it if needed: that is a 3rd file, allowed) |
| T5  | `baseArithmetic`      | §5.90   | Talstelsels  | Haiku | `topics/numberSystems.ts`                                    | `baseDigits` answer |
| T6  | `baseReasoning`       | §5.91   | Talstelsels  | Haiku | `topics/numberSystems.ts`                                    | `number` answers |
| T7  | `hexBinary`           | §5.92   | Talstelsels  | Haiku | `topics/numberSystems.ts`                                    | `baseDigits` answer |
| T8  | `romanCalc`           | §5.93   | Talstelsels  | Haiku | `topics/romanNumerals.ts`                                    | reuse its numeral converter (export if needed) |
| T9  | `countingCases`       | §5.94   | Heuristieken | Haiku | `topics/systematicCounting.ts`                               | |
| T10 | `backwardsProblems`   | §5.95   | Heuristieken | **S** | `topics/workingBackwards.ts`                                 | reuse its operation drawing and phrases; exact fractions |
| T11 | `twoUnknowns`         | §5.96   | Heuristieken | Haiku | `topics/guessAndCheck.ts`                                    | money format §8 |
| T12 | `simplifyDeep`        | §5.97   | Heuristieken | Haiku | `topics/simplifyProblem.ts`                                  | |

Dispatch order: T2, T10 first (Sonnet, the longest), then T1, T3–T9, T11, T12 until 7 run at once.

### Agent brief (paste per task; fill the `<…>` only; keep it under ~40 lines)

```
You implement ONE topic of the Rekenhulp app: `<id>` (spec §<n>). You are an implementer, not an
orchestrator: never start agents. Apply the Honey directive (load skill honey:honey-superpowers,
worker variant): minimum code, terse report.

1. In your worktree run `git merge --no-ff main`, then `npm install`.
2. Read ONLY: CLAUDE.md sections "Domain rules" and "Testing"; spec §<n> in
   docs/superpowers/specs/2026-10-05-rekenhulp-design.md (find it with
   grep -n "^### 5.<n>"), the rules block "v3 rules for Verbanden & statistiek, Talstelsels and
   Heuristieken", §8 (conventions) and §6 only for the answer kind you use. Copy patterns from
   src/lib/topics/remainders.ts(+.test.ts) and <exemplar>.
3. Files you may edit: src/lib/topics/<id>.ts and src/lib/topics/<id>.test.ts (replace the
   stub). <extra file if the table allows>. Never edit types.ts, index.ts, sets.ts or another topic.
4. TDD. First the test file: a table of spec examples (input → expected, incl. edge cases),
   then ≥1000 seeded generations asserting every range and rule of the spec, `check(expected)`
   correct, a wrong answer rejected, an explanation present, distinct keys. Then the generator.
   Use `lib/format.ts` and the `SLOT`/step factories; never type U+2212 minus, thin spaces or
   NBSP by hand (use \u{…} escapes or the helpers). No `eval`, no floats (lib/rational.ts).
   noUncheckedIndexedAccess: no `[a, b] = cond ? [x, y] : …`.
5. Gate: `npm test -- src/lib/topics/<id>.test.ts` and finally the full `npm test`, and
   `npm run check`. Filter output with grep only, e.g.
   `npm test 2>&1 | grep -E "FAIL|Tests |Test Files|Error"`.
6. Commit just your two files: `git add <files>` then `git commit -m "<English subject>"`
   (one line, no body, no footer, no ticket key).
7. Stop rules: after 2 failed fix attempts, or at ~100K tokens, do not commit; report the
   failing output (≤ 30 lines).
Allowed commands: npm install, npm test, npm run check, git status/diff/log/add/commit,
git merge --no-ff main, ls, cat, echo, grep. Everything else is forbidden (no npx, node, tail,
head, wc, cut, npm run format).
Report, ≤ 12 lines: status (green/red), commit hash and branch name, worktree path, test count,
spec ambiguities with the reading you chose, command-rule breaches (or "none"). No code.
```

## 4. Merge (orchestrator, per finished agent)

1. `git merge --no-ff <branch>` into `main` (no conflicts expected: distinct files; only
   exported helpers of T4/T8/T10 touch an existing file, and no other task touches those).
   Then `git worktree remove <path>` and `git branch -d <branch>` (no `--force`, no `-D`).
2. After all merges: `npm test` and `npm run check` once.
3. Failures: one fresh Sonnet agent per failing topic, brief = the failing output (≤ 40 lines)
   and the two file paths. A Haiku task that failed its own gate is retried the same way,
   with Sonnet.

## 5. Integration (one Sonnet `honey:hive-builder`, `sets.ts` + `sets.test.ts`)

- `lib/sets.ts`: add `deep` (weight 1 each) to `RELATIONS_SET`, `NUMBER_SYSTEMS_SET` and
  `HEURISTICS_SET` with the ids of spec §4.1.
- `lib/sets.test.ts`: extend the `hasDeep` list at `levels › gives the sets with a v3 step a
  Verdieping` (all sets except Tafels now), and add one test per set after the pattern of
  `lists the four Meetkunde Verdieping topics …` (rows at sizes 5/10/15; quota examples of
  spec §4.2: 3 + 3 + 3 + 3 and the Opfrisser share 3).
- It greps the tests and components for assertions that assume these three sets have no
  Verdieping (`grep -rn "verbanden\|talstelsels\|heuristieken\|disabled" src`) and fixes only
  those. Gate: `npm test`, `npm run check`.

## 6. Verification and review

1. `npm run build`; then `grep -o "manifest.webmanifest" dist/sw.js` shows exactly one match,
   `grep -o "woff2" dist/sw.js` finds the font, and `grep -o "skipWaiting" dist/sw.js` shows
   it only inside the `SKIP_WAITING` handler (CLAUDE.md PWA pitfalls).
2. One `honey:hive-reviewer` (read-only, Haiku-class) over the combined diff
   (`git diff a2c7eff..HEAD`, 12 topic files + sets): check each topic against its spec
   section (ranges, option sets, explanation wording, dedup key), plus realism and mental
   feasibility (spec §11 item 3). Id-keyed findings only, max 15. Fixes: a fresh agent per
   finding group, as in §4.3. No per-task review rounds.
3. Spec ambiguities the agents reported: fold the chosen readings into the spec in one commit.

## 7. Close

- `CLAUDE.md` Status: every set except Tafels now has a Verdieping; replace the sentence that
  names Verbanden & statistiek, Talstelsels and Heuristieken as the exceptions; add the three
  sets with their topics to the Done list. Remove the §11 items (they live in §5 now) and the
  plan line in spec §12.2 step 4 ("Done: …" instead).
- Delete this plan: `rm docs/superpowers/plans/2026-11-02-last-three-verdieping.md`.
- Commit the docs, then `npm run format` as its own commit (`Formatted the new topic modules with
  Prettier`), as before.
- Memory: update `parallel-sets-via-worktrees` with what this run taught (stubs + one topic per
  Haiku agent, token use per task, breaches).
- Report to the user in Dutch, short: what merged, tokens per model if known, breaches, open
  follow-ups. The user checks the sets on the phone in a later chat; do not wait for it.
