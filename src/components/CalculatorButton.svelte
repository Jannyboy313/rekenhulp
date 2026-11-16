<script lang="ts">
  import Icon from './Icon.svelte';

  /**
   * The mark "rekenmachine toegestaan" and the way to the calculator (calculator spec §4), at the
   * right end of the play header.
   */
  interface Props {
    /**
     * `disabled` once the exercise is answered; `reserved` on an exercise without the calculator:
     * only the space, so the header does not move within a session.
     */
    mode: 'active' | 'disabled' | 'reserved';
    onopen: () => void;
    /** For the focus after the calculator closes. */
    ref?: HTMLButtonElement;
  }

  let { mode, onopen, ref = $bindable() }: Props = $props();
</script>

<button
  type="button"
  class="calculator-button"
  class:reserved={mode === 'reserved'}
  aria-label="Rekenmachine"
  aria-hidden={mode === 'reserved'}
  inert={mode === 'reserved'}
  disabled={mode === 'disabled'}
  bind:this={ref}
  onclick={onopen}
>
  <Icon name="calculator" size={24} stroke={2} />
</button>

<style>
  /* As large as the stop button of the layout (v4 spec §4.1). */
  .calculator-button {
    flex: none;
    width: var(--play-stop);
    height: var(--play-stop);
    min-height: 0;
    margin-left: 4px;
    padding: 0;
    border-radius: 12px;
    background: var(--primary-tint);
    color: var(--primary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .reserved {
    visibility: hidden;
  }
</style>
