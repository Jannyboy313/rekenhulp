<script lang="ts">
  import { okSpan, type KeyDef } from '../lib/inputModels';
  import type { KeypadKey } from '../lib/keypadInput';
  import Fraction from './Fraction.svelte';
  import { press } from './press';

  interface Props {
    keys: readonly KeyDef[];
    /** Grid columns; only the expression keypad has 4 (spec §6). */
    columns?: number;
    canSubmit: boolean;
    onkey: (key: KeypadKey) => void;
    /** Without it there is no OK: the kladblok puts its spatie there (spec §3.6). */
    onsubmit?: () => void;
  }

  let { keys, columns = 3, canSubmit, onkey, onsubmit }: Props = $props();
</script>

<div class="keypad" style:--columns={columns}>
  {#each keys as { key, label, ariaLabel, icon, span } (key)}
    <button
      type="button"
      class="key"
      style:grid-column={span === undefined ? undefined : `span ${span}`}
      aria-label={ariaLabel ?? label}
      use:press={() => onkey(key)}
    >
      {#if icon === 'fraction'}<Fraction
          >{#snippet numerator()}□{/snippet}{#snippet denominator()}□{/snippet}</Fraction
        >{:else}{label}{/if}
    </button>
  {/each}
  {#if onsubmit}
    <!-- OK acts on click (release): it replaces the view, and a submit on press would let the
         release land on the next screen. -->
    <button
      type="button"
      class="key ok"
      style:grid-column="span {okSpan(keys, columns)}"
      disabled={!canSubmit}
      onclick={onsubmit}>OK</button
    >
  {/if}
</div>

<style>
  .keypad {
    display: grid;
    grid-template-columns: repeat(var(--columns), 1fr);
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
