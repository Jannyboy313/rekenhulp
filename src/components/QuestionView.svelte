<script lang="ts">
  import { INPUT_MODELS } from '../lib/inputModels';
  import type { KeypadKey } from '../lib/keypadInput';
  import { NO, YES } from '../lib/steps';
  import type { CheckResult, Step } from '../lib/types';
  import Keypad from './Keypad.svelte';
  import MathText from './MathText.svelte';

  interface Props {
    step: Step;
    onanswer: (input: string, result: CheckResult) => void;
  }

  let { step, onanswer }: Props = $props();

  // Ja/Nee has no keypad: a tap on a choice is the answer (spec §6).
  const model = $derived(step.kind === 'boolean' ? null : INPUT_MODELS[step.kind]);

  let value = $state('');
  let error = $state<string | null>(null);
  // Guards against a double tap submitting twice before the feedback replaces this view.
  let answered = false;

  function handleKey(key: KeypadKey) {
    if (model === null) return;
    value = model.apply(value, key);
    error = null;
  }

  function submit() {
    if (model === null || value === '') return;
    error = model.validate(value);
    if (error === null) answer(value);
  }

  function answer(input: string) {
    if (answered) return;
    answered = true;
    onanswer(input, step.check(input));
  }
</script>

<div class="question">
  <p class="prompt"><MathText text={step.prompt} /></p>
  {#if model}
    <output class="answer" aria-label="Jouw antwoord" aria-live="off"
      >{#if step.prefix}<span class="prefix">{step.prefix}</span>{/if}{value === ''
        ? '?'
        : model.display(value)}{#if step.suffix}<span class="suffix">{step.suffix}</span>{/if}</output
    >
    <p class="error" role="alert">{error ?? ''}</p>
    <Keypad {model} canSubmit={value !== ''} onkey={handleKey} onsubmit={submit} />
  {:else}
    <div class="choices">
      {#each [YES, NO] as choice (choice)}
        <button type="button" class="choice" onclick={() => answer(choice)}>{choice}</button>
      {/each}
    </div>
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

  .answer {
    display: block;
    min-height: 4rem;
    padding: 0.75rem 1rem;
    font-size: 2rem;
    text-align: center;
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: var(--radius);
  }

  .suffix {
    margin-left: 0.5rem;
    color: var(--muted);
  }

  .prefix {
    margin-right: 0.5rem;
    color: var(--muted);
  }

  .error {
    min-height: 1.25rem;
    margin-block: -0.5rem;
    font-size: 1rem;
    text-align: center;
    font-weight: 600;
    color: var(--wrong);
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
