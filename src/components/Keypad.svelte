<script lang="ts">
  import { okSpan, type KeyDef } from '../lib/inputModels';
  import type { KeypadKey } from '../lib/keypadInput';
  import Fraction from './Fraction.svelte';
  import { press } from './press';

  interface Props {
    keys: readonly KeyDef[];
    canSubmit: boolean;
    /** The kladblok relabels OK as Volgende (spec §3.6). */
    okLabel?: string;
    onkey: (key: KeypadKey) => void;
    /** Called with the click count: 0 for keyboard activation, 2 or more for a repeated tap. */
    onsubmit: (clickCount: number) => void;
  }

  let { keys, canSubmit, okLabel = 'OK', onkey, onsubmit }: Props = $props();
</script>

<div class="keypad">
  {#each keys as { key, label, ariaLabel, icon } (key)}
    <button type="button" class="key" aria-label={ariaLabel ?? label} use:press={() => onkey(key)}>
      {#if icon === 'fraction'}<Fraction
          >{#snippet numerator()}□{/snippet}{#snippet denominator()}□{/snippet}</Fraction
        >{:else}{label}{/if}
    </button>
  {/each}
  <!-- OK acts on click (release): it replaces the view, and a submit on press would let the
       release land on the next screen. -->
  <button
    type="button"
    class="key ok"
    style:grid-column="span {okSpan(keys)}"
    disabled={!canSubmit}
    onclick={(event) => onsubmit(event.detail)}>{okLabel}</button
  >
</div>

<style>
  .keypad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  /* 48 px: the minimum tap target, which leaves room for the kladblok (spec §3.6). */
  .key {
    min-height: 3rem;
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
