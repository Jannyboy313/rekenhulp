<script lang="ts">
  import { INPUT_MODELS } from '../lib/inputModels';
  import type { KeypadKey } from '../lib/keypadInput';
  import { promptSize } from '../lib/promptSize';
  import { applyNoteKey, EMPTY_NOTES, type ScratchpadInput } from '../lib/scratchpad';
  import { NO, YES } from '../lib/steps';
  import type { CheckResult, Step } from '../lib/types';
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

  function answer(input: string) {
    if (answered) return;
    answered = true;
    onanswer(input, step.check(input));
  }
</script>

<div class="question">
  {#if scratchpad}
    <Scratchpad {notes} active={activeNote} onselect={(index) => (activeNote = index)} />
  {/if}
  <p class="prompt {promptSize(step.prompt)}"><MathText text={step.prompt} /></p>
  {#if step.kind === 'boolean'}
    <!-- Ja/Nee has no keypad: a tap on a choice is the answer (spec §6). -->
    <div class="choices">
      {#each [YES, NO] as choice (choice)}
        <button type="button" class="choice" onclick={() => answer(choice)}>{choice}</button>
      {/each}
    </div>
  {:else if step.kind === 'fraction'}
    <!-- A separate branch per typing state: a union of models cannot infer KeypadAnswer's S. -->
    <KeypadAnswer
      model={INPUT_MODELS.fraction}
      prefix={step.prefix}
      suffix={step.suffix}
      {scratch}
      onsubmit={answer}
    />
  {:else}
    <KeypadAnswer
      model={INPUT_MODELS[step.kind]}
      prefix={step.prefix}
      suffix={step.suffix}
      {scratch}
      onsubmit={answer}
    />
  {/if}
</div>

<style>
  .question {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex: 1;
    min-height: 0;
    justify-content: flex-end;
  }

  /* When the screen is too short, only the prompt gives way and scrolls; the kladblok and the
     keypad keep their size (spec §2, §3.3). */
  .prompt {
    min-height: 0;
    overflow-y: auto;
    font-weight: 600;
    text-align: center;
    text-wrap: balance;
  }

  /* Long prompts get smaller text, so they do not push the keypad down (spec §3.3). */
  .prompt.large {
    font-size: 2.5rem;
  }

  .prompt.medium {
    font-size: 1.75rem;
  }

  .prompt.small {
    font-size: 1.375rem;
  }

  /* As tall as the number answer field plus keypad (4 + 2.25 + 17 rem), with the buttons at the
     bottom, so the prompt stays at the height it has in keypad steps (spec §6). */
  .choices {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-content: end;
    gap: 0.75rem;
    min-height: 23.25rem;
  }

  .choice {
    min-height: 6rem;
    font-size: 2rem;
    font-weight: 600;
    background: var(--key);
  }

  .choice:active {
    background: var(--key-active);
  }
</style>
