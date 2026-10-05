<script lang="ts">
  import type { KeypadKey } from '../lib/keypadInput';
  import type { AnswerKind } from '../lib/types';

  interface Props {
    kind: AnswerKind;
    canSubmit: boolean;
    onkey: (key: KeypadKey) => void;
    onsubmit: () => void;
  }

  let { kind, canSubmit, onkey, onsubmit }: Props = $props();

  const KEYS: { key: KeypadKey; label: string; ariaLabel?: string }[] = [
    { key: '7', label: '7' },
    { key: '8', label: '8' },
    { key: '9', label: '9' },
    { key: '4', label: '4' },
    { key: '5', label: '5' },
    { key: '6', label: '6' },
    { key: '1', label: '1' },
    { key: '2', label: '2' },
    { key: '3', label: '3' },
    { key: '-', label: '−', ariaLabel: 'min' },
    { key: '0', label: '0' },
    { key: ',', label: ',', ariaLabel: 'komma' },
  ];
</script>

<div class="keypad">
  {#each KEYS as { key, label, ariaLabel } (key)}
    <button type="button" class="key" aria-label={ariaLabel ?? label} onclick={() => onkey(key)}>
      {label}
    </button>
  {/each}
  <button type="button" class="key" aria-label="wissen" onclick={() => onkey('backspace')}>⌫</button>
  {#if kind === 'fraction'}
    <button type="button" class="key" aria-label="breukstreep" onclick={() => onkey('/')}>/</button>
  {/if}
  <button
    type="button"
    class="key ok"
    class:wide={kind !== 'fraction'}
    disabled={!canSubmit}
    onclick={onsubmit}>OK</button
  >
</div>

<style>
  .keypad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .key {
    min-height: 3.5rem;
    font-size: 1.5rem;
    background: var(--key);
  }

  .key:active:not(:disabled) {
    background: var(--key-active);
  }

  .ok {
    background: var(--primary);
    color: var(--primary-text);
    font-weight: 600;
  }

  .wide {
    grid-column: span 2;
  }
</style>
