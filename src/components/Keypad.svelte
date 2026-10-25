<script lang="ts">
  import { okSpan, type KeyDef } from '../lib/keys';
  import type { KeypadKey } from '../lib/keypadInput';
  import Fraction from './Fraction.svelte';
  import { press } from './press';

  interface Props {
    keys: readonly KeyDef[];
    /** Grid columns; the expression and scientific keypads have 4 (spec §6). */
    columns?: number;
    canSubmit: boolean;
    /** Taller keys, for screens without a kladblok. */
    tall?: boolean;
    /** The answer is final (correct state): dimmed, and no key does anything. */
    disabled?: boolean;
    /** The extended keyboard of the kladblok: a grey tray with smaller keys (spec §3.6). */
    tray?: boolean;
    onkey: (key: KeypadKey) => void;
    /** Without it there is no OK: the kladblok has no submit (spec §3.6). */
    onsubmit?: () => void;
  }

  let {
    keys,
    columns = 3,
    canSubmit,
    tall = false,
    disabled = false,
    tray = false,
    onkey,
    onsubmit,
  }: Props = $props();
</script>

<div class="keypad" class:tall class:disabled class:tray style:--columns={columns}>
  {#each keys as { key, label, ariaLabel, icon } (key)}
    <button
      type="button"
      class="key"
      class:digit={/^\d$/.test(key)}
      aria-label={ariaLabel ?? label}
      {disabled}
      use:press={() => onkey(key)}
    >
      {#if icon === 'fraction'}<Fraction
          >{#snippet numerator()}<span class="box"></span>{/snippet}{#snippet denominator()}<span
              class="box"></span
            >{/snippet}</Fraction
        >{:else if icon === 'power'}x<sup>n</sup>{:else if icon === 'space'}<span
          class="space"></span
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
      disabled={disabled || !canSubmit}
      onclick={onsubmit}>OK</button
    >
  {/if}
</div>

<style>
  .keypad {
    display: grid;
    grid-template-columns: repeat(var(--columns, 3), 1fr);
    gap: 8px;
    padding: 0 16px calc(24px + env(safe-area-inset-bottom));
  }

  .keypad.disabled {
    opacity: 0.4;
  }

  /* 52 px with a kladblok on screen (spec §3.6), 56 px without. No shadow but the 1 px line. */
  .key {
    height: 52px;
    min-height: 0;
    border-radius: 14px;
    font-size: 24px;
    font-weight: 500;
    background: var(--key-alt);
  }

  .tall .key {
    height: 56px;
  }

  .key.digit {
    background: var(--surface);
    box-shadow: 0 1px 0 var(--border-key);
  }

  .key:active:not(:disabled) {
    filter: brightness(0.94);
  }

  /* The tray is 19 px lower than the normal keypad (5 × 48 + 4 × 6 + 9 against 5 × 52 + 4 × 8).
     The margin above it keeps the total height equal, so the prompt does not move when the
     kladblok takes over, without the tray itself getting taller. */
  .tray {
    gap: 6px;
    margin-top: 19px;
    padding: 8px 12px calc(24px + env(safe-area-inset-bottom));
    background: var(--tray-bg);
    border-top: 1px solid var(--tray-border);
  }

  .tray .key {
    height: 48px;
    border-radius: 12px;
    background: var(--tray-key-op);
  }

  /* The spatie key: an open box, longer than a normal glyph. */
  .space {
    display: inline-block;
    width: 1.9em;
    height: 0.4em;
    border: 2px solid currentColor;
    border-top: none;
    border-radius: 0 0 3px 3px;
    vertical-align: middle;
  }

  /* The breuk key: two outlined boxes. */
  .box {
    display: inline-block;
    width: 0.6em;
    height: 0.6em;
    border: 2.5px solid currentColor;
    border-radius: 2px;
    vertical-align: middle;
  }

  sup {
    font-size: 0.6em;
    line-height: 0;
    vertical-align: super;
  }

  .tray .key.digit {
    background: var(--surface);
    font-size: 22px;
    box-shadow: 0 1px 0 var(--tray-key-shadow);
  }

  .ok {
    background: var(--primary);
    color: var(--primary-text);
    font-size: 17px;
    font-weight: 700;
  }

  /* Not the global 40 % dimming: a disabled keypad is dimmed as a whole, and a disabled OK
     is the lighter violet. */
  .key:disabled {
    opacity: 1;
  }

  .ok:disabled {
    background: var(--primary-disabled);
  }
</style>
