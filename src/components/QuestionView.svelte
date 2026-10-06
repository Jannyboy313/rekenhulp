<script lang="ts">
  import { INPUT_MODELS } from '../lib/inputModels';
  import { NO, YES } from '../lib/steps';
  import type { CheckResult, Step } from '../lib/types';
  import KeypadAnswer from './KeypadAnswer.svelte';
  import MathText from './MathText.svelte';

  interface Props {
    step: Step;
    onanswer: (input: string, result: CheckResult) => void;
  }

  let { step, onanswer }: Props = $props();

  // Guards against a double tap submitting twice before the feedback replaces this view.
  let answered = false;

  function answer(input: string) {
    if (answered) return;
    answered = true;
    onanswer(input, step.check(input));
  }
</script>

<div class="question">
  <p class="prompt"><MathText text={step.prompt} /></p>
  {#if step.kind === 'boolean'}
    <!-- Ja/Nee has no keypad: a tap on a choice is the answer (spec §6). -->
    <div class="choices">
      {#each [YES, NO] as choice (choice)}
        <button type="button" class="choice" onclick={() => answer(choice)}>{choice}</button>
      {/each}
    </div>
  {:else if step.kind === 'fraction'}
    <KeypadAnswer
      model={INPUT_MODELS.fraction}
      prefix={step.prefix}
      suffix={step.suffix}
      onsubmit={answer}
    />
  {:else}
    <KeypadAnswer
      model={INPUT_MODELS[step.kind]}
      prefix={step.prefix}
      suffix={step.suffix}
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
    justify-content: flex-end;
  }

  .prompt {
    font-size: 2.5rem;
    font-weight: 600;
    text-align: center;
    text-wrap: balance;
  }

  .choices {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
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
