<script lang="ts" generics="S">
  import type { InputModel } from '../lib/inputModels';
  import type { FractionSlot, KeypadKey } from '../lib/keypadInput';
  import Fraction from './Fraction.svelte';
  import Keypad from './Keypad.svelte';
  import { press } from './press';

  interface Props {
    model: InputModel<S>;
    prefix?: string;
    suffix?: string;
    /** Called with valid input only; invalid input shows an inline error instead (spec §6). */
    onsubmit: (input: string) => void;
  }

  let { model, prefix, suffix, onsubmit }: Props = $props();

  // QuestionView is keyed per step, so the model never changes during this component's life.
  // svelte-ignore state_referenced_locally
  let value = $state.raw(model.empty);
  let error = $state<string | null>(null);

  const segments = $derived(model.view(value));

  function handleKey(key: KeypadKey) {
    value = model.apply(value, key);
    error = null;
  }

  function select(slot: FractionSlot) {
    if (model.select) value = model.select(value, slot);
    error = null;
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

<!-- Kinds with a fraction template get a taller field, so opening one does not shift the layout. -->
<output
  class="answer"
  class:tall={model.select !== undefined}
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
<p class="error" role="alert">{error ?? ''}</p>
<Keypad keys={model.keys} canSubmit={model.canSubmit(value)} onkey={handleKey} onsubmit={submit} />

<style>
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
