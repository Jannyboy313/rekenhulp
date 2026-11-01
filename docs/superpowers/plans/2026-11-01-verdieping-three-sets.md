# Plan: v3 of Verhoudingen, Getallen & delers and Bewerkingen

Spec: §5.53–§5.66 (topics), §4.1–§4.2 (sets, quotas), §12.2 step 4. Three sets are built in
parallel by three implementer agents, each in its own git worktree; the orchestrator merges.

## Orchestration

| Role         | Who                                   | Where                    | Does                                                   |
|--------------|---------------------------------------|--------------------------|--------------------------------------------------------|
| Orchestrator | main session                          | main checkout            | spec, plan, dispatch, checkpoints, merges, final review, docs |
| Agent V      | `general-purpose`, model `sonnet`     | worktree, branch per set | Verhoudingen tasks V1–V7                               |
| Agent G      | `general-purpose`, model `sonnet`     | worktree, branch per set | Getallen & delers tasks G1–G5                          |
| Agent B      | `general-purpose`, model `sonnet`     | worktree, branch per set | Bewerkingen tasks B1–B5                                |
| Reviewer     | `honey:hive-reviewer`                 | main checkout            | one review of the combined diff after the merges       |
| Fixers       | fresh `general-purpose` (sonnet) or `honey:hive-builder` | main checkout, one at a time | fix briefs from the review           |

- At most 5 agents at once; the build phase runs 3. Agents never start agents.
- Why worktrees: every generator sets its `topic`, and `GENERATORS` / `TOPIC_LABELS` are
  `Record<Topic, …>`, so three agents in one checkout would break each other's `npm run check`
  and commits (no partial staging allowed).
- Each agent runs `npm install` once in its worktree, then per task: tests first, code,
  `npm test` + `npm run check`, one commit (only its own files, explicit paths). Commit rules
  from `~/.claude/CLAUDE.md`, ending with the attribution line. If a commit fails on signing
  (1Password locked): stop and report, never bypass.
- Agents do not touch the spec, `CLAUDE.md`, lessons or UI components.
- Agent command rules: the project allowlist (`CLAUDE.md`), no `npx`, `node`, `tail`, `head`,
  `wc`; read files with Read, filter output with `grep`.

### Merge-friendly registration

Each agent adds its ids at its own anchor, so the three branches touch different lines:

| Set          | `Topic` union, `GENERATORS`, `TOPIC_LABELS`: insert after | imports in `topics/index.ts` |
|--------------|-----------------------------------------------------------|------------------------------|
| Verhoudingen | `ratioProblems`                                           | alphabetical                 |
| Getallen     | `squares`                                                 | alphabetical                 |
| Bewerkingen  | `properties`                                              | alphabetical                 |

`sets.ts`: each agent edits only its own set object (`PROPORTIONS_SET`, `NUMBERS_SET`,
`OPERATIONS_SET`). Import conflicts (alphabetical neighbours) are resolved by the
orchestrator.

### Sequence

1. Orchestrator: spec committed, this plan committed (the worktrees branch from it).
2. Dispatch V, G and B in one message, `isolation: "worktree"`.
3. Per returning agent (checkpoint): read its `git log` and diff against spec and plan; short
   status to the user; fix brief to a fresh agent in the same worktree if needed.
4. Merge into `main` in the order V, G, B with `git merge --no-ff <branch>`; after each merge
   `npm test`, `npm run check`.
5. One `honey:hive-reviewer` over `git diff <base>..main`; fixes; `npm run build` and check
   `dist/sw.js` (one `manifest.webmanifest`, `woff2` present, `skipWaiting` only in the message
   handler).
6. Orchestrator: `CLAUDE.md` Status, spec §11 cleared, §12.2 "Done", delete this plan.

Needs from the user before step 2: `git merge --no-ff <branch>` allowed for this repo (added
to the `CLAUDE.md` override). Worktree and branch cleanup afterwards: by the user, or allow
`git worktree remove <path>` and `git branch -d <branch>`.

## Shared per topic task

- Files: `src/lib/topics/<topic>.ts`, `src/lib/topics/<topic>.test.ts`, registration in
  `lib/types.ts` (`Topic`) and `lib/topics/index.ts` (`GENERATORS`, `TOPIC_LABELS` = the spec
  label).
- Signature: `export function generate<Topic>(rng: Rng): Question`, steps from `lib/steps.ts`
  (number, fraction, choice, expression); `drawUntil` for the rules; exact arithmetic via
  `lib/rational.ts`; unknown written as `${SLOT}`.
- Tests always include (seeded RNG, ≥ 1000 questions): every range and rule of the spec
  section; `check(expected)` correct; key stable and per spec; every form/variant/context
  occurs; no literal `?` (the sweep test covers it once registered); for `choice`: four
  distinct options, exactly one correct, order per spec.
- Plus the spec examples as fixed cases (table per task below: input → expected).
- Tips: none (spec v3 rules); number steps keep the factor-of-ten fallback.
- An Opfrisser topic goes into the set's `topics` in its own task; Verdieping topics go into
  `deep` in the set's last task.

## Agent V — Verhoudingen (§5.53–§5.58)

| Task | Topic / work           | Answer kinds          | Key test cases (prompt → expected)                                           |
|------|------------------------|-----------------------|-------------------------------------------------------------------------------|
| V1   | `permille` (Opfrisser) | number                | `3‰ van 4000` → 12; `25‰ = ?%` → 2,5; `0,5% = ?‰` → 5; `7‰ = ?` → 0,007; `6 is ?‰ van 2000` → 3 |
| V2   | `proportionConcepts` (Opfrisser) | choice      | `"1 op de 4"` → `25%`, options contain `1 : 4`, `4%`, `1/3`; relative question has exactly 1 relative statement |
| V3   | `percentProblems`      | number, fraction      | 80, 25%, 10% → 54; 20 + 10 → 28; 25 + 10 → `32 1/2` (and `32,5` correct); 360 ml, 20% extra → 300; 550 000, 2‰ → 1100 |
| V4   | `enlargement`          | number                | 12 cm met 25% → 15; 20 cm op 80% → 16; 10 → 15 cm → 150; na +50% 18 → 12     |
| V5   | `compareRatios`        | choice                | 1 : 2 vs 3 : 4, 3 appels → first name; 1 : 2 vs 3 : 6 → `evenveel`; 6/24 vs 8/40 → `klas A`; offers: exactly one cheapest per item |
| V6   | `ratioReasoning`       | number                | 3 : 5, verschil 12 → Anna 18; 4 → 300 g, 30 → 2,25 kg; 30 knikkers 2 : 3 → 1 : 1 → 6 |
| V7   | Verdieping on          | config                | `PROPORTIONS_SET.deep` = V3–V6 weight 1; description `Procenten, promille, verhoudingen en schaal`; `sets.test.ts`: `forLevel` and topic rows |

## Agent G — Getallen & delers (§5.59–§5.62)

| Task | Topic / work       | Answer kinds | Key test cases                                                                    |
|------|--------------------|--------------|------------------------------------------------------------------------------------|
| G1   | `lcmGcdProblems`   | number       | bus 12, 18 → 36; planken 84, 126 → 42; tegels 360 × 480 → 120; groepjes 4, 6 → 12  |
| G2   | `divisors`         | number       | 36 → 9; KGV 4, 6, 10 → 60; GGD 24, 36, 60 → 12; `2² × 3 × 5`, `2 × 3² × 7` → GGD 6, KGV 1260 |
| G3   | `missingDigit`     | number       | `3□72`, 9 → 6; several fits → smallest/largest per prompt; kleinste 4 cijfers door 6 → 1002; grootste 4 cijfers door 7 → 9996 |
| G4   | `remainders`       | number       | {2, 3, 4, 5}, rest 1, 50–100 → 61; groepjes 4, 5, rest 1, 20–30 → 21; rest 2 bij 4, rest 1 bij 3 → 10; interval holds exactly one solution |
| G5   | Verdieping on      | config       | `NUMBERS_SET.deep` = G1–G4 weight 1; `sets.test.ts`                                |

## Agent B — Bewerkingen (§5.63–§5.66)

| Task | Topic / work            | Answer kinds | Key test cases                                                               |
|------|-------------------------|--------------|-------------------------------------------------------------------------------|
| B1   | `bracketPlacement`      | expression (custom check `bracketCheck(prompt numbers/ops, target)` via `lib/expr`) | `(3+4)×5−2` → correct; `((3+4))×5−2` → correct; `3+4×(5−2)` → wrong, explanation ends `≠ 33`; `3+4×5−3` → other-numbers message; `3+4×5−2` without brackets → wrong; `(3+4×5−2` → invalid, not counted |
| B2   | `derivedFacts`          | number       | 37 × 24 = 888: `37 × 25` → 925, `888 : 24` → 37, `74 × 12` → 888, `3,7 × 24` → 88,8 |
| B3   | `multiStepProblems`     | number       | 28 × 24 : 16 → 42; 59 / 8 up → 8; € 50 / 7 down → 7; wisselgeld and schoolreis money formatting |
| B4   | `smartCalculationDeep`  | number       | `99 × 47 + 47` → 4700; `2,5 × 4,8` → 12; `14 : 0,25` → 56; `€ 7,99 + € 2,98` → 10,97; key equal for swapped factors |
| B5   | Verdieping on           | config       | `OPERATIONS_SET.deep` = B1–B4 weight 1; `sets.test.ts`                        |

## Risks

- B1 is the only new check logic; it reuses the parser and evaluation of `lib/expr` and the
  expression keypad unchanged (§6).
- `proportionConcepts` and `compareRatios` are the first generated (non-fixed) MC texts;
  long statements must fit four option buttons on a phone (user checks later).
- Realism: ranges are in the spec; agents flag any range that yields no or unrealistic
  questions instead of widening it themselves.
