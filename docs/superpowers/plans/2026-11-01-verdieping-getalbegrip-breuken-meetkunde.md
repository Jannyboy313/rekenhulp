# Plan: v3 of Getalbegrip, Breuken & kommagetallen and Meetkunde

Spec: §5.67–§5.84 (topics), §4.1–§4.2 (sets, quotas), §12.2 step 4, §12.3. Three sets are built
in parallel by three implementer agents, each in its own git worktree; the orchestrator merges.

## Orchestration

| Role         | Who                                   | Where                    | Does                                                   |
|--------------|---------------------------------------|--------------------------|--------------------------------------------------------|
| Orchestrator | main session                          | main checkout            | spec, plan, dispatch, checkpoints, merges, final review, docs |
| Agent N      | `general-purpose`, model `sonnet`     | worktree, branch per set | Getalbegrip tasks N1–N7                                |
| Agent F      | `general-purpose`, model `sonnet`     | worktree, branch per set | Breuken & kommagetallen tasks F1–F8                    |
| Agent M      | `general-purpose`, model `sonnet`     | worktree, branch per set | Meetkunde tasks M1–M6                                  |
| Reviewer     | `honey:hive-reviewer`                 | main checkout            | one review of the combined diff after the merges       |
| Fixers       | fresh `general-purpose` (sonnet) or `honey:hive-builder` | main checkout, one at a time | fix briefs from the review           |

- At most 5 agents at once; the build phase runs 3. Agents never start agents.
- Why worktrees: every generator sets its `topic`, and `GENERATORS` / `TOPIC_LABELS` are
  `Record<Topic, …>`, so three agents in one checkout would break each other's `npm run check`
  and commits (no partial staging allowed).
- `origin/main` is behind local `main` only if the user has not pushed: before dispatch the
  orchestrator compares them; if they differ, each agent first runs `git merge --no-ff main`.
- Each agent runs `npm install` once in its worktree, then per task: tests first, code,
  `npm test` + `npm run check`, one commit (only its own files, explicit paths). Commit rules
  from `~/.claude/CLAUDE.md`, ending with the attribution line. If a commit fails on signing
  (1Password locked): stop and report, never bypass.
- Agents do not touch the spec, `CLAUDE.md`, lessons or UI components.
- Agent command rules: the project allowlist (`CLAUDE.md`), no `npx`, `node`, `tail`, `head`,
  `wc`; read files with Read, filter output with `grep`.

### Merge-friendly registration

Each agent adds its ids at its own anchor, so the three branches touch different lines:

| Set         | `Topic` union, `GENERATORS`, `TOPIC_LABELS`: insert after | imports in `topics/index.ts` |
|-------------|-----------------------------------------------------------|------------------------------|
| Getalbegrip | `negativeNumbers`                                         | alphabetical                 |
| Breuken     | `fractionConversion`                                      | alphabetical                 |
| Meetkunde   | `symmetry`                                                | alphabetical                 |

`sets.ts`: each agent edits only its own set object (`NUMBER_SENSE_SET`, `FRACTIONS_SET`,
`GEOMETRY_SET`). Import conflicts (alphabetical neighbours) are resolved by the orchestrator.

### Sequence

1. Orchestrator: spec committed (`e7a9e92`), this plan committed (the worktrees branch from it).
2. Dispatch N, F and M in one message, `isolation: "worktree"`.
3. Per returning agent (checkpoint): read its `git log` and diff against spec and plan; short
   status to the user; fix brief to a fresh agent in the same worktree if needed.
4. Merge into `main` in the order N, F, M with `git merge --no-ff <branch>`; after each merge
   `npm test`, `npm run check`. Clean up with `git worktree remove` and `git branch -d`.
5. One `honey:hive-reviewer` over `git diff <base>..main`; fixes; `npm run build` and check
   `dist/sw.js` (one `manifest.webmanifest`, `woff2` present, `skipWaiting` only in the message
   handler).
6. Orchestrator: `CLAUDE.md` Status, §12.2 "Done", delete this plan.

## Shared per topic task

- Files: `src/lib/topics/<topic>.ts`, `src/lib/topics/<topic>.test.ts`, registration in
  `lib/types.ts` (`Topic`) and `lib/topics/index.ts` (`GENERATORS`, `TOPIC_LABELS` = the spec
  label).
- Signature: `export function generate<Topic>(rng: Rng): Question`, steps from `lib/steps.ts`
  (`numberStep`, `fractionStep`, `simplestFractionStep`, `choiceStep`, `scientificStep`);
  `drawUntil` for the rules; exact arithmetic via `lib/rational.ts`; formatting via
  `lib/format.ts`; unknown written as `${SLOT}`.
- Tests always include (seeded RNG, ≥ 1000 questions): every range and rule of the spec
  section; `check(expected)` correct; key stable and per spec; every form/variant/context
  occurs; no literal `?` (the sweep test covers it once registered); for `choice`: four
  distinct options, exactly one correct, order per spec.
- Plus the spec examples as fixed cases (table per task below: input → expected).
- Tips: none (spec v3 rules); number steps keep the factor-of-ten fallback.
- An Opfrisser topic goes into the set's `topics` (weight 1) in its own task; Verdieping topics
  go into `deep` (weight 1) in the set's last task.
- Ordering chains (§5.67, §5.74) and the "any equal value" fraction answers (§5.74, §5.76,
  §5.79) follow the shared rules at the top of §5.67–§5.84. Agents N and F each write their own
  chain formatting inside their topic module (no shared helper; the orchestrator may extract one
  after the merge if both are identical).

## Agent N — Getalbegrip (§5.67–§5.72)

| Task | Topic / work                 | Answer kinds              | Key test cases (prompt → expected)                                           |
|------|------------------------------|---------------------------|-------------------------------------------------------------------------------|
| N1   | `numberOrder` (Opfrisser)    | choice                    | order: options = right chain, sign-trap chain, two neighbour swaps, all distinct; between −2,5 en −2,4 → `−2,45`, options ascending `−2,55`, `−2,45`, `−2,35`, `2,45` |
| N2   | `arithmeticWords` (Opfrisser)| choice                    | verschil 48, 12 → `36`, options `4`, `36`, `60`, `576`; ruim € 50 with d = 3 → `€ 53`, options `€ 47`, `€ 50`, `€ 53`, `€ 65`; bijna 100 km, d = 4 → `96 km`, options `70 km`, `96 km`, `100 km`, `104 km` |
| N3   | `negativeContexts`           | number (money, `°C`, `m`) | 312 / 774 rood → 462; saldo −145 + 400 → 255; fiets 849 / 387 → 462; polder −4, duin 23 → 27; lift −2 + 7 → 5; −3, +9, −11 → −5 |
| N4   | `roundingReasoning`          | number                    | honderdtallen 4500 kleinste → 4450, grootste → 4549; 3,7 kleinste → 3,65, grootste → 3,74; € 7,93 → 7,95; € 7,91 → 7,90; € 7,98 → 8; met € 10 → 2,05 |
| N5   | `estimateCalc`               | choice                    | 6189 : 31 → `200` among `2`, `20`, `200`, `2000` or `20`, `200`, `2000`, `20 000`; exact/estimate ratio ≤ 1,4 over 1000 draws; operands never round |
| N6   | `powerCalc`                  | number, scientific        | `2³ × 2⁴` → 7; `2⁶ : 2²` → 4; `(3²)³` → 6; `√(36 × 25)` → 30; `2⁵ − 3³` → 5; `(3 × 10⁴) × (5 × 10³)` → `1,5 × 10⁸` (and `15 × 10⁷` wrong); `6 × 10⁸` vs `2 × 10⁵` → 3000 |
| N7   | Verdieping on                | config                    | `NUMBER_SENSE_SET.deep` = N3–N6 weight 1; topics + N1, N2; `sets.test.ts`: `forLevel`, topic rows, n = 15 split |

## Agent F — Breuken & kommagetallen (§5.73–§5.79)

| Task | Topic / work                   | Answer kinds                 | Key test cases                                                              |
|------|--------------------------------|------------------------------|------------------------------------------------------------------------------|
| F1   | `decimalNames` (Opfrisser)     | number, choice               | acht duizendste → 0,008; drie miljardste → 0,000000003; vijfentwintig honderdste → 0,25; `0,007` → `zeven duizendste`, options 4 consecutive places in list order |
| F2   | `compareFractions` (Opfrisser) | fraction (any equal), choice | grootst 3/5, 0,58, 5/8 → `5/8` (and `0,625` correct); kleinst → `0,58`; order: right chain + the 3 neighbour swaps |
| F3   | `fractionConcepts` (Opfrisser) | choice                       | `Wat is een stambreuk?` → `een breuk met teller 1`; `Hoe heten breuken met dezelfde noemer?` → `gelijknamige breuken`; 3/4, k = 3 → `9/12` among `6/7`, `4/3`, `3/5` |
| F4   | `mixedNotation`                | fraction (any equal)         | `4 3/5 : 0,2` → 23; `0,75 × 2/3` → 0,5; `25% van 3/4` → `3/16`; `1/4 + 0,15` → 0,4 (and `2/5` correct); expected decimal when ≤ 3 decimals |
| F5   | `fractionProblems`             | number, simplest fraction    | 32, 3/8 fiets, 1/4 bus → 12; € 60, 1/3 then 1/4 of rest → 30; 2/5 = 12 → 30; 30, 12 jongens → `3/5` (`18/30` wrong) |
| F6   | `decimalProblems`              | number (money, count, m)     | € 14 per kilo, 0,25 kg → 3,50; 1,5 kg = € 3,60 → 2,40; 2,4 m / 0,3 m → 8; 5 m − 6 × 0,45 → 2,3 |
| F7   | `betweenNumbers`               | fraction (any equal), number | middle 1/4, 1/3 → `7/24`; 2,7, 3,05 → 2,875; 0,6, 3/4 → 0,675; jumps 1,2 → 3 by 0,15 → 12; marks 2–3, 8 pieces, 5th → 2,625 (and `2 5/8` correct) |
| F8   | Verdieping on                  | config                       | `FRACTIONS_SET.deep` = F4–F7 weight 1; topics + F1–F3; description `Omzetten, vergelijken en rekenen met breuken en kommagetallen`; `sets.test.ts` |

## Agent M — Meetkunde (§5.80–§5.84)

| Task | Topic / work               | Answer kinds   | Key test cases                                                                    |
|------|----------------------------|----------------|------------------------------------------------------------------------------------|
| M1   | `solidNames` (Opfrisser)   | choice, number | kegel description → `kegel`; kubus answer never has `balk`/`prisma` as option (and vice versa); zeshoek prisma ribben → 18; vierkant piramide ribben → 8, hoekpunten → 5 |
| M2   | `scalingSolids`            | number         | kubus ×3 inhoud → 27; oppervlakte → 9; omtrek vierkant ×3 → 3; 2 keer zo klein inhoud → 8; 8 cm³, ×3 → 216; maquette 10×, 0,5 m² → 50; inhoud ×8 → 2; oppervlakte ×9 → 3 |
| M3   | `surfaceArea`              | number         | piramide 3 × 3, zijvlak basis 3 hoogte 5 → 39; zijvlak 7,5 given → 39; tent 3-4-5, 6 m → 84; blik 25,1 + 225,3 → 275,5 |
| M4   | `compositeShapes`          | number         | 8 × 6 minus 3 × 2: oppervlakte → 42, omtrek → 28; gazon 10 × 6, pad 1 → 36; pad 0,5 → 17; 250 × 80 → 2 ha, 200 are; 24 cm² kleinste → 20, grootste → 50 |
| M5   | `angleReasoning`           | number         | 50°, 60° buitenhoek → 110; regelmatige achthoek buitenhoek → 45; hoek 140° → 9 hoeken; 2 : 3 : 4 grootste → 80; tophoek 3× basishoek → 108; 4:20 → 10; 4:25 → 17,5 |
| M6   | Verdieping on              | config         | `GEOMETRY_SET.deep` = M2–M5 weight 1; topics + M1; `sets.test.ts`                  |

## Risks

- `numberOrder` and `compareFractions` show chains of four numbers with `<`/`>` on an option
  button; long chains with stacked fractions must fit a 72 px button on a phone (user checks
  later).
- `decimalNames` needs Dutch number words for `k`; a fixed list in the module, no general
  number-to-words helper.
- `powerCalc` reuses `scientificStep` and `UNKNOWN_EXPONENT` from §5.18/§5.19 unchanged.
- `angleReasoning` clock answers can be half degrees (`17,5`): a number step with 1 decimal.
- Realism: ranges are in the spec; agents flag any range that yields no or unrealistic
  questions instead of widening it themselves.
