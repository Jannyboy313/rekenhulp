<script lang="ts" generics="S">
  import type { InputModel } from '../lib/inputModels';
  import type { FractionSlot, KeypadKey } from '../lib/keypadInput';
  import { NOTE_KEYS, type ScratchpadInput } from '../lib/scratchpad';
  import Fraction from './Fraction.svelte';
  import Keypad from './Keypad.svelte';
  import { press } from './press';

  interface Props {
    model: InputModel<S>;
    prefix?: string;
    suffix?: string;
    /** Only when the kladblok is shown: while a cell is active, the keypad types there (§3.6). */
    scratch?: ScratchpadInput;
    /** Called with valid input only; invalid input shows an inline error instead (spec §6). */
    onsubmit: (input: string) => void;
  }

  let { model, prefix, suffix, scratch, onsubmit }: Props = $props();

  // QuestionView is keyed per step, so the model never changes during this component's life.
  // svelte-ignore state_referenced_locally
  let value = $state.raw(model.empty);
  let error = $state<string | null>(null);

  const segments = $derived(model.view(value));
  const inNote = $derived(scratch?.active === true);

  function handleKey(key: KeypadKey) {
    if (inNote) {
      scratch?.onkey(key);
      return;
    }
    value = model.apply(value, key);
    error = null;
  }

  function select(slot: FractionSlot) {
    if (model.select) value = model.select(value, slot);
    error = null;
  }

  function focusAnswer() {
    scratch?.onfocusanswer();
  }

  function submit() {
    if (!model.canSubmit(value)) return;
    const input = model.toInput(value);
    error = model.validate(input);
    if (error === null) onsubmit(input);
  }
</script>

{#snippet slotButton(name: FractionSlot, digits: string, active: FractionSlot)}<button
    type="button"
    class="slot"
    class:active={name === active}
    aria-label={`${name === 'num' ? 'teller' : 'noemer'}: ${digits === '' ? 'leeg' : digits}`}
    aria-pressed={name === active}
    use:press={() => select(name)}
    >{#if digits === ''}<span class="placeholder">…</span>{:else}{digits}{/if}</button
  >{/snippet}

<div class="field">
  <!-- Kinds with a fraction template get a taller field, so opening one does not shift the layout. -->
  <output
    class="answer"
    class:tall={model.select !== undefined}
    class:focused={scratch !== undefined && !inNote}
    aria-label="Jouw antwoord"
    aria-live="off"
    >{#if prefix}<span class="prefix">{prefix}</span>{/if}{#each segments as segment, index (index)}{#if segment.type === 'text'}{segment.text}{:else}{#if segment.mixed}<span
            class="sr-only">{' en '}</span
          >{/if}<Fraction
          >{#snippet numerator()}{@render slotButton('num', segment.num, segment.active)}{/snippet}{#snippet denominator()}{@render slotButton(
              'den',
              segment.den,
              segment.active,
            )}{/snippet}</Fraction
        >{/if}{:else}<span class="placeholder">…</span>{/each}{#if suffix}<span class="suffix"
        >{suffix}</span
      >{/if}</output
  >
  {#if inNote}
    <!-- Covers the whole field, slots included: one tap hands the keypad back (spec §3.6). -->
    <button type="button" class="to-answer" aria-label="Naar antwoordveld" use:press={focusAnswer}
    ></button>
  {/if}
</div>
<p class="error" role="alert">{error ?? ''}</p>
<Keypad
  keys={inNote ? NOTE_KEYS : model.keys}
  columns={inNote ? undefined : model.columns}
  canSubmit={model.canSubmit(value)}
  onkey={handleKey}
  onsubmit={inNote ? undefined : submit}
/>

<style>
  .field {
    position: relative;
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

  /* Fits an open template with compact slots; kept low so the keypad still fits on small phones. */
  .answer.tall {
    min-height: 6rem;
  }

  /* With a kladblok on screen, the active field is marked (spec §3.6). */
  .answer.focused {
    border-color: var(--primary);
  }

  .to-answer {
    position: absolute;
    inset: 0;
    min-height: 0;
    background: none;
  }

  .placeholder {
    color: var(--muted);
  }

  .slot {
    min-width: 2.5rem;
    min-height: 1.9rem;
    padding: 0 0.25rem;
    background: none;
    border: 2px solid transparent;
    border-radius: 0.375rem;
  }

  .slot:active {
    background: var(--key-active);
  }

  .slot.active {
    border-color: var(--primary);
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
</style>
