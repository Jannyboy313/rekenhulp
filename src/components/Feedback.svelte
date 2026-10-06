<script module lang="ts">
  export const CORRECT_FEEDBACK_MS = 600;
</script>

<script lang="ts">
  import { displayAnswer } from '../lib/inputModels';
  import type { AnswerKind, CheckResult } from '../lib/types';
  import MathText from './MathText.svelte';

  interface Props {
    prompt: string;
    kind: AnswerKind;
    input: string;
    result: CheckResult;
    onnext: () => void;
  }

  let { prompt, kind, input, result, onnext }: Props = $props();

  let nextButton: HTMLButtonElement | undefined = $state();

  $effect(() => {
    if (!result.correct) nextButton?.focus();
  });

  $effect(() => {
    if (!result.correct) return;
    const timer = setTimeout(onnext, CORRECT_FEEDBACK_MS);
    return () => clearTimeout(timer);
  });
</script>

<div class="feedback" class:correct={result.correct} class:wrong={!result.correct}>
  <p class="prompt"><MathText text={prompt} /></p>
  <div class="details">
    {#if result.correct}
      <p class="verdict">Goed!</p>
    {:else}
      <p class="verdict">Fout</p>
      <dl>
        <dt>Jouw antwoord</dt>
        <dd><MathText text={displayAnswer(kind, input)} /></dd>
        <dt>Juist antwoord</dt>
        <dd><MathText text={result.expected} /></dd>
      </dl>
      {#if result.tip}
        <p class="tip"><strong>Tip:</strong> <MathText text={result.tip} /></p>
      {/if}
      {#if result.explanation}
        <p class="explanation"><MathText text={result.explanation} /></p>
      {/if}
    {/if}
  </div>
  {#if !result.correct}
    <button type="button" class="primary next" bind:this={nextButton} onclick={onnext}>Verder</button>
  {/if}
</div>

<style>
  .feedback {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1.5rem;
    padding: 1.5rem;
    border-radius: var(--radius);
    text-align: center;
    animation: appear 150ms ease-out;
  }

  .correct {
    background: var(--correct-bg);
    color: var(--correct);
  }

  .wrong {
    background: var(--wrong-bg);
    color: var(--text);
  }

  .prompt {
    font-size: 2rem;
    font-weight: 600;
    text-wrap: balance;
  }

  .verdict {
    font-size: 1.75rem;
    font-weight: 700;
  }

  .wrong .verdict {
    color: var(--wrong);
  }

  dl {
    display: grid;
    grid-template-columns: auto auto;
    justify-content: center;
    gap: 0.5rem 1rem;
    margin: 1rem 0 0;
    font-size: 1.25rem;
  }

  dt {
    text-align: right;
    color: var(--muted);
  }

  dd {
    margin: 0;
    text-align: left;
    font-weight: 600;
  }

  .tip,
  .explanation {
    margin-top: 1rem;
    font-size: 1.25rem;
  }

  .next {
    min-height: 3.5rem;
  }

  @keyframes appear {
    from {
      opacity: 0;
      transform: scale(0.97);
    }
  }
</style>
