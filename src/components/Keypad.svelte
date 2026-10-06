<script lang="ts">
  import { okSpan, type InputModel } from '../lib/inputModels';
  import type { KeypadKey } from '../lib/keypadInput';

  interface Props {
    model: InputModel;
    canSubmit: boolean;
    onkey: (key: KeypadKey) => void;
    onsubmit: () => void;
  }

  let { model, canSubmit, onkey, onsubmit }: Props = $props();
</script>

<div class="keypad">
  {#each model.keys as { key, label, ariaLabel } (key)}
    <button type="button" class="key" aria-label={ariaLabel ?? label} onclick={() => onkey(key)}>
      {label}
    </button>
  {/each}
  <button
    type="button"
    class="key ok"
    style:grid-column="span {okSpan(model)}"
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
