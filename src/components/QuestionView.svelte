<script lang="ts">
  import { CORRECT_FEEDBACK_MS } from '../lib/feedback';
  import { displayAnswer, INPUT_MODELS } from '../lib/inputModels';
  import type { KeypadKey } from '../lib/keypadInput';
  import { promptSize } from '../lib/promptSize';
  import {
    applyNoteKey,
    EMPTY_NOTES,
    SHORT_SCREENS,
    type ScratchpadInput,
  } from '../lib/scratchpad';
  import { hasSlot } from '../lib/slot';
  import { NO, YES } from '../lib/steps';
  import type { CheckResult, Step } from '../lib/types';
  import Icon from './Icon.svelte';
  import KeypadAnswer from './KeypadAnswer.svelte';
  import MathText from './MathText.svelte';
  import Scratchpad from './Scratchpad.svelte';

  interface Props {
    step: Step;
    /** Whether this step shows the kladblok; PlayScreen decides per step (topic and answer kind) (spec §3.6). */
    scratchpad?: boolean;
    /** The kladblok notes. PlayScreen binds them, so they outlive this step. */
    notes?: readonly string[];
    onanswer: (input: string, result: CheckResult) => void;
  }

  let { step, scratchpad = false, notes = $bindable(EMPTY_NOTES), onanswer }: Props = $props();

  // This view is keyed per step, so every step starts with the answer field active.
  let activeNote = $state<number | null>(null);

  // A shorter screen (split screen) can hide the active cell; keys then go to the answer field.
  $effect(() => {
    if (!scratchpad) return;
    const removers = SHORT_SCREENS.map(({ query, visibleCells }) => {
      const list = matchMedia(query);
      const onchange = () => {
        if (list.matches && activeNote !== null && activeNote >= visibleCells) activeNote = null;
      };
      list.addEventListener('change', onchange);
      return () => list.removeEventListener('change', onchange);
    });
    return () => removers.forEach((remove) => remove());
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

  function answer(input: string) {
    if (answered) return;
    answered = true;
    const result = step.check(input);
    if (result.correct) correctInput = input;
    onanswer(input, result);
  }
</script>

<!-- The bar of the correct state runs as long as PlayScreen's timer (inherited by KeypadAnswer). -->
<div class="question" style:--advance-ms="{CORRECT_FEEDBACK_MS}ms">
  {#if scratchpad}
    <Scratchpad
      {notes}
      active={activeNote}
      disabled={locked}
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
      <p class="prompt text"><MathText text={step.prompt} /></p>
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
          <Icon name={choice === YES ? 'check' : 'cross'} size={32} stroke={2.6} />
          <span>{choice}</span>
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
      {locked}
      onsubmit={answer}
    />
  {:else}
    <KeypadAnswer
      model={INPUT_MODELS[step.kind]}
      prefix={step.prefix}
      suffix={step.suffix}
      {scratch}
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

  /* A sum: the unknown is the primary-coloured slot. Longer sums get smaller text, so they do
     not push the keypad down (spec §3.3). */
  .prompt.sum {
    padding: 0 16px;
    font-weight: 800;
    letter-spacing: -0.01em;
    line-height: 1.2;
  }

  .prompt.sum.large {
    font-size: 38px;
  }

  .prompt.sum.medium {
    font-size: 28px;
  }

  .prompt.sum.small {
    font-size: 22px;
  }

  /* A sentence without an unknown (word problems, instructions): never truncated. */
  .prompt.text {
    padding: 0 24px;
    font-size: 22px;
    line-height: 30px;
    font-weight: 700;
  }

  .prompt.yesno {
    padding: 0 24px;
    font-size: 34px;
    line-height: 42px;
    font-weight: 800;
  }

  .choices {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 0 16px calc(32px + env(safe-area-inset-bottom));
  }

  .choice {
    height: 120px;
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
