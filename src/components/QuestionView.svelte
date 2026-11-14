<script lang="ts">
  import { CORRECT_FEEDBACK_MS } from '../lib/feedback';
  import { displayAnswer, INPUT_MODELS } from '../lib/inputModels';
  import type { KeypadKey } from '../lib/keypadInput';
  import { choiceFor } from '../lib/physicalKeys';
  import { promptSize } from '../lib/promptSize';
  import { applyNoteKey, EMPTY_NOTES, visibleCells, type ScratchpadInput } from '../lib/scratchpad';
  import { hasSlot } from '../lib/slot';
  import { NO, YES } from '../lib/steps';
  import type { CheckResult, Step } from '../lib/types';
  import KeypadAnswer from './KeypadAnswer.svelte';
  import { viewport } from './layout.svelte';
  import MathText from './MathText.svelte';
  import Scratchpad from './Scratchpad.svelte';

  interface Props {
    step: Step;
    /** Whether this step shows the kladblok; PlayScreen decides per step (topic and answer kind) (spec §3.6). */
    scratchpad?: boolean;
    /** The session has kladblok steps: a step without one keeps its space, empty (v4 spec §5.1). */
    reserved?: boolean;
    /** The kladblok notes. PlayScreen binds them, so they outlive this step. */
    notes?: readonly string[];
    onanswer: (input: string, result: CheckResult) => void;
  }

  let {
    step,
    scratchpad = false,
    reserved = false,
    notes = $bindable(EMPTY_NOTES),
    onanswer,
  }: Props = $props();

  // This view is keyed per step, so every step starts with the answer field active.
  let activeNote = $state<number | null>(null);

  // The cells the layout has room for (v4 spec §5.2). A shorter screen or a rotation can hide the
  // active cell; keys then go to the answer field.
  const cells = $derived(visibleCells(viewport.shown, viewport.height));
  $effect(() => {
    if (activeNote !== null && activeNote >= cells) activeNote = null;
  });

  const scratch: ScratchpadInput | undefined = $derived(
    scratchpad
      ? {
          active: activeNote !== null,
          onkey: typeNote,
          onfocusanswer: () => (activeNote = null),
        }
      : undefined,
  );

  function typeNote(key: KeypadKey) {
    if (activeNote !== null) notes = applyNoteKey(notes, activeNote, key);
  }

  // Guards against a double tap submitting twice before the feedback replaces this view.
  let answered = false;
  // The input of a correct answer: this view then turns into the correct state (spec §3.4) and
  // PlayScreen moves on by itself. A wrong answer is shown by Feedback instead of this view.
  let correctInput = $state<string | null>(null);
  const locked = $derived(correctInput !== null);

  /** Physical keyboard on a step without a keypad: j/n and 1–4 (v4 spec §6). */
  function handleKeydown(event: KeyboardEvent) {
    if (step.kind !== 'boolean' && step.kind !== 'choice') return;
    if (locked || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    const choices = step.kind === 'boolean' ? [NO, YES] : (step.options ?? []);
    const index = choiceFor(event.key, step.kind, choices.length);
    const choice = index === null ? undefined : choices[index];
    if (choice === undefined) return;
    event.preventDefault();
    answer(choice);
  }

  function answer(input: string) {
    if (answered) return;
    answered = true;
    const result = step.check(input);
    if (result.correct) correctInput = input;
    onanswer(input, result);
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- The bar of the correct state runs as long as PlayScreen's timer (inherited by KeypadAnswer). -->
<div
  class="question"
  class:keyless={step.kind === 'boolean' || step.kind === 'choice'}
  style:--advance-ms="{CORRECT_FEEDBACK_MS}ms"
>
  {#if scratchpad || reserved}
    <Scratchpad
      {notes}
      {cells}
      active={activeNote}
      disabled={locked}
      hidden={!scratchpad}
      onselect={(index) => (activeNote = index)}
    />
  {/if}
  <div class="prompt-area">
    {#if step.kind === 'boolean'}
      <p class="prompt yesno"><MathText text={step.prompt} /></p>
    {:else if hasSlot(step.prompt)}
      <p class="prompt sum {promptSize(step.prompt)}">
        <!-- The unknown shows the user's own input, as typed, never the expected answer. -->
        <MathText
          text={step.prompt}
          slot={correctInput === null
            ? { tone: 'primary' }
            : { tone: 'good', fill: displayAnswer(step.kind, correctInput) }}
        />
      </p>
    {:else}
      <p class="prompt text" class:choice-question={step.kind === 'choice'}>
        <MathText text={step.prompt} />
      </p>
    {/if}
  </div>
  {#if step.kind === 'boolean'}
    <!-- Ja/Nee has no keypad: a tap on a choice is the answer (spec §6). The chosen button turns
         green, the other is dimmed. -->
    <div class="choices">
      {#each [NO, YES] as choice (choice)}
        <button
          type="button"
          class="choice"
          class:good={correctInput === choice}
          class:dim={locked && correctInput !== choice}
          disabled={locked}
          onclick={() => answer(choice)}
        >
          {choice}
        </button>
      {/each}
      {#if locked}
        <div class="advance"><div class="advance-fill"></div></div>
      {/if}
    </div>
  {:else if step.kind === 'choice'}
    <!-- Multiple choice works like Ja/Nee: a tap on an option is the answer (spec §6). -->
    <div class="options" class:reserved>
      {#each step.options ?? [] as option (option)}
        <button
          type="button"
          class="choice option"
          class:good={correctInput === option}
          class:dim={locked && correctInput !== option}
          disabled={locked}
          onclick={() => answer(option)}
        >
          <MathText text={option} />
        </button>
      {/each}
      {#if locked}
        <div class="advance"><div class="advance-fill"></div></div>
      {/if}
    </div>
  {:else if step.kind === 'fraction'}
    <!-- A separate branch per typing state: a union of models cannot infer KeypadAnswer's S. -->
    <KeypadAnswer
      model={INPUT_MODELS.fraction}
      prefix={step.prefix}
      suffix={step.suffix}
      {scratch}
      tall={!scratchpad && !reserved}
      {locked}
      onsubmit={answer}
    />
  {:else}
    <KeypadAnswer
      model={INPUT_MODELS[step.kind]}
      prefix={step.prefix}
      suffix={step.suffix}
      {scratch}
      tall={!scratchpad && !reserved}
      {locked}
      onsubmit={answer}
    />
  {/if}
</div>

<style>
  .question {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  /* The free space between header (or kladblok) and answer. When the screen is too short, only
     this area gives way, down to 96 px, and scrolls; the kladblok and the keypad keep their size
     (spec §2, §3.3). The auto margin on the prompt centres it without clipping its top. */
  .prompt-area {
    flex: 1 1 120px;
    min-height: 96px;
    display: flex;
    overflow-y: auto;
  }

  .prompt {
    margin: auto;
    text-align: center;
    text-wrap: balance;
  }

  /* Landscape with a keypad (v4 spec §4.2): the kladblok, the prompt and the answer field in the
     left pane, the keypad in the right one. KeypadAnswer has no wrapper, so its field, error
     line and keypad are grid items here; nothing is remounted on a rotation. The empty rows
     above the prompt and below the field centre the two; a long prompt shrinks and scrolls. */
  :global([data-layout^='tablet-landscape']) .question {
    padding: var(--play-body-top) 0 calc(var(--play-body-bottom) + env(safe-area-inset-bottom));
  }

  :global([data-layout^='tablet-landscape']) .question:not(.keyless) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) var(--play-pane);
    grid-template-rows: auto minmax(0, 1fr) minmax(0, auto) auto minmax(0, 1fr);
    grid-template-areas:
      'pad    keys'
      '.      keys'
      'prompt keys'
      'field  keys'
      'error  keys';
    column-gap: var(--play-pane-gap);
  }

  :global([data-layout^='tablet-landscape']) .question:not(.keyless) .prompt-area {
    grid-area: prompt;
    margin: 20px 0 28px;
  }

  /* A sum: the unknown is the primary-coloured slot. Longer sums get smaller text, so they do
     not push the keypad down (spec §3.3). */
  .prompt.sum {
    padding: 0 16px;
    font-weight: 800;
    letter-spacing: -0.01em;
    line-height: 1.2;
  }

  /* The sizes per layout are the --play-* tokens in app.css (v4 spec §4.1). */
  .prompt.sum.large {
    font-size: var(--play-sum-large);
  }

  .prompt.sum.medium {
    font-size: var(--play-sum-medium);
  }

  .prompt.sum.small {
    font-size: var(--play-sum-small);
  }

  /* A sentence without an unknown (word problems, instructions): never truncated. */
  .prompt.text {
    padding: 0 24px;
    font-size: var(--play-text);
    line-height: var(--play-text-line);
    font-weight: 700;
  }

  /* A multiple-choice question is short: on a tablet it gets more size than a word problem. */
  .prompt.text.choice-question {
    font-size: var(--play-choice-text);
    line-height: var(--play-choice-line);
  }

  .prompt.yesno {
    padding: 0 24px;
    font-size: var(--play-yesno);
    line-height: var(--play-yesno-line);
    font-weight: 800;
  }

  .choices {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 0 16px calc(32px + env(safe-area-inset-bottom));
  }

  :global([data-layout^='tablet']) .choices,
  :global([data-layout^='tablet']) .options {
    gap: 16px;
    padding: 0 0 calc(var(--play-bottom) + env(safe-area-inset-bottom));
  }

  .choice {
    height: var(--play-yesno-height);
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border-radius: 20px;
    border: 2px solid var(--border-key);
    background: var(--surface);
    box-shadow: var(--shadow-card);
    font-size: 22px;
    font-weight: 700;
  }

  /* Ja/Nee: text only, no ✕ or ✓ (v4 spec §9). */
  .choices .choice {
    font-size: var(--play-yesno-label);
    font-weight: 800;
  }

  /* Four options fill the height of a keypad without a kladblok: 4 × 72 + 3 × 8 = 312 px, with
     the keypad's padding (spec §6). */
  .options {
    display: grid;
    gap: 8px;
    padding: 0 16px calc(24px + env(safe-area-inset-bottom));
  }

  .choice.option {
    height: 72px;
    padding: 0 16px;
    border-radius: 14px;
    font-size: 20px;
    line-height: 24px;
    text-align: center;
  }

  /* In a kladblok session the options fill the lower keypad: 4 × 67 + 3 × 8 = 292 px. */
  .options.reserved .choice.option {
    height: 67px;
  }

  /* On a tablet the options are a 2 × 2 grid in reading order (v4 spec §4.1). */
  :global([data-layout^='tablet']) .options {
    grid-template-columns: 1fr 1fr;
  }

  :global([data-layout^='tablet']) .choice.option {
    height: 104px;
    border-radius: 20px;
    font-size: 24px;
    line-height: 30px;
  }

  :global([data-layout='tablet-landscape-compact']) .choice.option {
    height: 80px;
    font-size: 20px;
    line-height: 24px;
  }

  /* Landscape without a keypad (v4 spec §4.3): one centred column. The buttons sit at the bottom
     of a box as high as the keypad, and the reserved kladblok keeps the width of the left pane. */
  :global([data-layout^='tablet-landscape']) .question.keyless :is(.choices, .options) {
    align-self: center;
    align-content: end;
    width: 720px;
    max-width: 100%;
    height: var(--play-keypad-height);
    padding-bottom: 0;
  }

  :global([data-layout^='tablet-landscape']) .question.keyless :global(.scratchpad) {
    width: calc(100% - var(--play-pane) - var(--play-pane-gap));
  }

  .choice:active:not(:disabled) {
    background: var(--key-alt);
  }

  /* Ja/Nee in the correct state: the chosen button is green, the other one is dimmed. */
  .choice:disabled {
    opacity: 1;
  }

  .choice.good {
    background: var(--good-tint);
    border-color: var(--good);
    color: var(--good-text);
    box-shadow: none;
  }

  .choice.dim {
    opacity: 0.4;
  }

  /* The auto-advance timer under the buttons; full width without animation (reduced motion). */
  .advance {
    grid-column: 1 / -1;
    height: 4px;
    border-radius: 2px;
    background: var(--good-track);
    overflow: hidden;
  }

  .advance-fill {
    height: 100%;
    background: var(--good);
    transform-origin: left;
    animation: advance var(--advance-ms) linear both;
  }

  @keyframes advance {
    from {
      transform: scaleX(0);
    }
  }
</style>
