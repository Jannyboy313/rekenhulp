# Plan: multiple-choice framework (spec §12.2 step 3, §6)

Light plan: files, signatures, test cases. No topic uses `choice` yet; the framework is tested
with test-only steps built in the tests themselves (no fixture set or topic needed). TDD, one
commit per task.

Core idea: `choice` is a second keypad-less kind next to `boolean`. The tapped option text is
the input, as with `Ja`/`Nee`, so `displayAnswer`, `Feedback` and `ResultScreen` need (almost)
no new code. The step carries its four options in display order.

## Task 1 — model and step (`lib/types.ts`, `lib/steps.ts`, `lib/inputModels.ts`, `lib/scratchpad.ts`)

- `types.ts`: `AnswerKind` gets `'choice'`; `Step` gets
  `/** The four options of a choice step, in display order (spec §6). */ options?: readonly string[];`
- `steps.ts`:
  ```ts
  interface ChoiceStepOptions {
    prompt: string;
    /** In display order: the generator shuffles them or uses a natural order. */
    options: readonly string[];
    answer: string;
    explanation?: string;
  }
  export function choiceStep(options: ChoiceStepOptions): Step
  ```
  `check(input)`: `{ correct: input === answer, expected: answer, explanation }`. Throws at
  construction (a generator bug, caught by the generator's ≥1000-run test) when there are not
  exactly 4 options, when two are equal, or when `answer` is not one of them. No prefix/suffix.
- `inputModels.ts`: `KeypadKind = Exclude<AnswerKind, 'boolean' | 'choice'>`; `displayAnswer`
  returns the input as is for both (comment: "Ja, Nee and a chosen option are shown as they
  are").
- `scratchpad.ts`: `showsScratchpad` is `false` for `choice` as for `boolean`.

Tests:

| File                  | Input                                                        | Expected                                   |
| --------------------- | ------------------------------------------------------------ | ------------------------------------------ |
| `steps.test.ts`       | `choiceStep` options `['40', '400', '4000', '40 000']`, answer `'4000'`; check `'4000'` | `correct: true`, `expected: '4000'` |
|                       | same, check `'400'`                                          | `correct: false`, `expected: '4000'`, no tip, explanation passed through |
|                       | same, check `'4 000'` (not an option text)                   | `correct: false`                           |
|                       | step fields                                                  | `kind: 'choice'`, `options` in given order, no prefix/suffix |
|                       | 3 options                                                    | throws                                     |
|                       | 5 options                                                    | throws                                     |
|                       | duplicate option                                             | throws                                     |
|                       | answer not among the options                                 | throws                                     |
| `inputModels.test.ts` | `displayAnswer('choice', '3/4')`                             | `'3/4'` (unchanged; MathText stacks it)    |
| `scratchpad.test.ts`  | `showsScratchpad('statistics', 'choice')`                    | `false`                                    |

## Task 2 — question view (`components/QuestionView.svelte`)

- New branch `{:else if step.kind === 'choice'}` for the answer area (the prompt keeps the
  existing sum/text branches; only `boolean` has the `yesno` prompt). Four buttons from
  `step.options ?? []`, each `<MathText text={option} />`, `onclick={() => answer(option)}`,
  same `good`/`dim`/`disabled` logic as Ja/Nee and the advance bar under them.
- CSS: `.options` a one-column grid, 4 rows of 72 px with 8 px gaps (spec §6: as high as a
  keypad without kladblok); horizontal and bottom padding as the keypad (`Keypad.svelte`:
  `0 16px calc(24px + env(safe-area-inset-bottom))`). Option text 20 px bold, centred, wraps;
  it reuses the `.choice` look (border, surface, shadow, radius, `:active`, `.good`, `.dim`)
  by sharing that class, not by copying it. Tokens only, no raw colours.
- Check during execution that the prompt does not move between a number step, a Ja/Nee step
  and a choice step (compare the computed heights of the answer areas in the dev tools of the
  build; no phone check, see memory).

Tests (`QuestionView.test.ts`, with a `choiceStep` built in the test):

| Case                                              | Expected                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------- |
| render                                            | 4 buttons in the given order, no keypad, no `OK`, no kladblok    |
| option `'3/4'`                                    | its button contains a stacked fraction (as `MathText` tests do)  |
| click the right option                            | `onanswer('4000', { correct: true, … })`; that button `good`, the 3 others dimmed and disabled; advance bar shown |
| click a wrong option                              | `onanswer('400', { correct: false, … })`                         |
| double click                                      | `onanswer` called once                                           |
| prompt with `${SLOT}`, click the right option     | the slot shows the chosen option in the good tone                |
| prompt without a slot                             | `.prompt.text` (not `yesno`)                                     |

## Task 3 — feedback, results and play screen (tests only, code where a test fails)

Expected to need no component code: `Feedback` and `ResultScreen` show `displayAnswer(kind,
input)` and `result.expected`.

| File                   | Case                                                  | Expected                                                         |
| ---------------------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| `Feedback.test.ts`     | `kind: 'choice'`, input `'400'`, expected `'4000'`, text prompt | tiles `400` and `4000`, no Tip block, Uitleg shown; `.prompt.text` |
| `Feedback.test.ts`     | input `'3/4'`                                         | the tile shows a stacked fraction                                |
| `ResultScreen.test.ts` | a wrong choice record                                 | error card with both option texts                                |
| `PlayScreen.test.ts`   | session of one choice question, tap a wrong option, Verder | Feedback shown, then the repeat (§3.4) shows the same 4 options in the same order |

## Task 4 — docs

- Spec: mark §12.2 step 3 done.
- `CLAUDE.md`: Status (multiple-choice framework done), drop its roadmap row and the sentence
  "The multiple-choice framework comes first"; "To add a set": a keypad-less kind (`boolean`,
  `choice`) needs no `KeypadStates`/`INPUT_MODELS` entry; architecture: `steps.ts` lists the
  choice step factory.
- Final review incl. `npm run build` and `dist/sw.js` (one `manifest.webmanifest` entry,
  `woff2` listed); delete this plan file.
