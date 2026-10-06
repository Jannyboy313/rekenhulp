<script lang="ts">
  import { okSpan, type KeyDef } from '../lib/inputModels';
  import type { KeypadKey } from '../lib/keypadInput';
  import Fraction from './Fraction.svelte';

  interface Props {
    keys: readonly KeyDef[];
    canSubmit: boolean;
    onkey: (key: KeypadKey) => void;
    onsubmit: () => void;
  }

  let { keys, canSubmit, onkey, onsubmit }: Props = $props();
</script>

<div class="keypad">
  {#each keys as { key, label, ariaLabel, icon } (key)}
    <button type="button" class="key" aria-label={ariaLabel ?? label} onclick={() => onkey(key)}>
      {#if icon === 'fraction'}<Fraction
          >{#snippet numerator()}□{/snippet}{#snippet denominator()}□{/snippet}</Fraction
        >{:else}{label}{/if}
    </button>
  {/each}
  <button
    type="button"
    class="key ok"
    style:grid-column="span {okSpan(keys)}"
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
</style>
