<script lang="ts">
  import { formatInput } from '../lib/format';
  import { applyKey, type KeypadKey } from '../lib/keypadInput';
  import { parseDutchNumber } from '../lib/rational';
  import type { CheckResult, Step } from '../lib/types';
  import Keypad from './Keypad.svelte';

  interface Props {
    step: Step;
    onanswer: (input: string, result: CheckResult) => void;
  }

  let { step, onanswer }: Props = $props();

  let value = $state('');
  const canSubmit = $derived(parseDutchNumber(value) !== null);

  function handleKey(key: KeypadKey) {
    value = applyKey(value, key);
  }

  function submit() {
    if (canSubmit) onanswer(value, step.check(value));
  }
</script>

<div class="question">
  <p class="prompt">{step.prompt}</p>
  <output class="answer" aria-label="Jouw antwoord" aria-live="off"
    >{value === '' ? '?' : formatInput(value)}{#if step.suffix}<span class="suffix"
        >{step.suffix}</span
      >{/if}</output
  >
  <Keypad {canSubmit} onkey={handleKey} onsubmit={submit} />
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
</style>
