<script lang="ts">
  import {
    CALCULATOR_COLUMNS,
    CALCULATOR_KEYS,
    canPress,
    displayText,
    spokenResult,
    takeOverText,
    type CalculatorKey,
    type CalculatorState,
  } from '../lib/calculator';
  import type { KeypadKey } from '../lib/keypadInput';
  import { calculatorKeyFor } from '../lib/physicalKeys';
  import Icon from './Icon.svelte';
  import Keypad from './Keypad.svelte';
  import { press } from './press';

  /**
   * The calculator of a calculator exercise (calculator spec §5): a modal dialog over the answer
   * field and the keypad. The screen owns the calculation, so it survives closing and a layout
   * change; the parent unmounts the overlay, it never closes itself.
   */
  interface Props {
    /** Not `state`: that name is the rune's. */
    calculation: CalculatorState;
    onkey: (key: CalculatorKey) => void;
    onclose: () => void;
    /** Only on a step with a number field: puts the result there (Neem over, §5.4). */
    ontake?: (text: string) => void;
  }

  let { calculation, onkey, onclose, ontake }: Props = $props();

  const PRESSED_MS = 100;

  let dialog: HTMLDialogElement | undefined = $state();

  // Modal: focus stays inside and the session behind it is inert.
  // The focus goes to the dialog itself, not to its first button (§5.6).
  $effect(() => {
    dialog?.showModal();
    dialog?.focus();
  });

  const empty = $derived(calculation.input === '' && calculation.result === null);
  const taken = $derived(takeOverText(calculation));
  // Every calculator key on the keypad is a keypad key; `=` is its OK and C sits above it.
  const disabledKeys = $derived(
    new Set<KeypadKey>(
      CALCULATOR_KEYS.map((def) => def.key).filter(
        (key) => !canPress(calculation, key as CalculatorKey),
      ),
    ),
  );

  function handleCancel(event: Event) {
    event.preventDefault();
    onclose();
  }

  // The card fills the dialog, so a click on the dialog itself is one outside the card.
  function handleClick(event: MouseEvent) {
    if (event.target === dialog) onclose();
  }

  // The key on screen that a physical key stood for: shown as pressed for a moment.
  let pressed = $state<KeypadKey | 'ok' | null>(null);
  let pressedTimer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => () => clearTimeout(pressedTimer));

  /**
   * Physical keyboard (calculator spec §5.5), in the capture phase: while the overlay is open no
   * key reaches the answer field, the kladblok or the choices behind it. Escape is the dialog's.
   */
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') return;
    event.stopImmediatePropagation();
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    // Enter and Space on ✕ and Neem over activate that button; a tapped key keeps the focus
    // and is no such button.
    const { target } = event;
    const native =
      target instanceof HTMLButtonElement &&
      target.dataset.key === undefined &&
      (event.key === 'Enter' || event.key === ' ');
    if (native) return;
    const key = calculatorKeyFor(event.key);
    if (key === null) return;
    event.preventDefault();
    if (!canPress(calculation, key)) return;
    onkey(key);
    pressed = key === '=' ? 'ok' : key === 'clear' ? null : key;
    clearTimeout(pressedTimer);
    pressedTimer = setTimeout(() => (pressed = null), PRESSED_MS);
  }
</script>

<!-- During a session App ignores the system back; here it closes the overlay (§5.1). -->
<svelte:window onkeydowncapture={handleKeydown} onpopstate={onclose} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
  class="calculator"
  tabindex="-1"
  aria-labelledby="calculator-title"
  bind:this={dialog}
  oncancel={handleCancel}
  onclick={handleClick}
>
  <div class="inner">
    <header>
      <h2 id="calculator-title">Rekenmachine</h2>
      <button type="button" class="close" aria-label="Sluiten" onclick={onclose}>
        <Icon name="close" size={22} stroke={2.2} />
      </button>
    </header>
    <div class="display">
      <button
        type="button"
        class="clear"
        aria-label="Wissen"
        data-key="clear"
        disabled={!canPress(calculation, 'clear')}
        use:press={() => onkey('clear')}>C</button
      >
      <!-- Right-aligned and cut on the left, so the end of a long calculation stays in view. -->
      <div class="line">
        <span class="calculation" class:empty>{displayText(calculation)}</span>
      </div>
    </div>
    <p class="sr-only" aria-live="polite">{spokenResult(calculation)}</p>
    <div class="keys">
      <Keypad
        keys={CALCULATOR_KEYS}
        columns={CALCULATOR_COLUMNS}
        canSubmit={canPress(calculation, '=')}
        okLabel="="
        okAriaLabel="is"
        {disabledKeys}
        {pressed}
        onkey={(key) => onkey(key as CalculatorKey)}
        onsubmit={() => onkey('=')}
      />
    </div>
    {#if ontake}
      <button
        type="button"
        class="primary take"
        disabled={taken === null}
        onclick={() => taken !== null && ontake(taken)}>Neem over</button
      >
    {/if}
  </div>
</dialog>

<style>
  /* Over the answer field and the keypad, never over the prompt or the kladblok (§5.1): the
     full play column at the bottom of the screen. Sizes: the --play-* tokens in app.css. */
  .calculator {
    margin: auto 0 0;
    padding: 0;
    width: 100%;
    max-width: 100%;
    border: none;
    border-radius: 24px 24px 0 0;
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow-panel);
    animation: slide-up 150ms ease-out;
  }

  /* No scrim: the prompt and the kladblok behind it stay readable. */
  .calculator::backdrop {
    background: none;
  }

  :global([data-layout='tablet-portrait']) .calculator {
    width: 600px;
    margin-inline: auto;
  }

  /* Landscape: over the right pane, which only holds the keypad (v4 spec §4.2). */
  :global([data-layout^='tablet-landscape']) .calculator {
    /* 8 px wider than the pane on every side, so no key shows past its round corners. */
    width: calc(var(--play-pane) + 16px);
    margin: auto calc(var(--play-body-side) - 8px)
      calc(var(--play-body-bottom) - 8px + env(safe-area-inset-bottom)) auto;
    border-radius: 24px;
  }

  /* The focus starts on the dialog itself (§5.6), which needs no ring. */
  .calculator:focus {
    outline: none;
  }

  .inner {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 4px 16px calc(16px + env(safe-area-inset-bottom));
  }

  :global([data-layout^='tablet-landscape']) .inner {
    padding-bottom: 16px;
  }

  header {
    display: flex;
    align-items: center;
    margin-right: -12px;
  }

  h2 {
    flex: 1;
    font-size: 16px;
    line-height: 22px;
    font-weight: 700;
  }

  .close {
    flex: none;
    width: 44px;
    height: 44px;
    min-height: 0;
    padding: 0;
    background: none;
    color: var(--text-2);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .display {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 12px 0 4px;
    border-radius: 12px;
    background: var(--bg);
  }

  .clear {
    flex: none;
    width: 40px;
    height: 36px;
    min-height: 0;
    padding: 0;
    border-radius: 10px;
    background: var(--key-alt);
    font-size: 17px;
    font-weight: 600;
  }

  .line {
    flex: 1;
    min-width: 0;
    display: flex;
    justify-content: flex-end;
    overflow: hidden;
    white-space: nowrap;
    font-size: 20px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .calculation {
    flex: none;
  }

  .empty {
    color: var(--muted);
  }

  /* The shared keypad at the calculator's size: four rows, `=` as large as its label. */
  .keys {
    --play-keypad-height: var(--play-calc-height);
    --play-button-text: var(--play-key-label);
  }

  .keys :global(.keypad) {
    padding: 0;
  }

  .keys :global(.key:disabled:not(.ok)) {
    color: var(--muted);
  }

  .take {
    height: 48px;
    font-size: var(--play-button-text);
  }

  @keyframes slide-up {
    from {
      transform: translateY(100%);
    }
  }
</style>
