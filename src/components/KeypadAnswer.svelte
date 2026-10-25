<script lang="ts" generics="S">
  import type { InputModel } from '../lib/inputModels';
  import type { FractionSlot, KeypadKey } from '../lib/keypadInput';
  import { NOTE_COLUMNS, NOTE_KEYS, type ScratchpadInput } from '../lib/scratchpad';
  import { withUnits } from '../lib/units';
  import Fraction from './Fraction.svelte';
  import Icon from './Icon.svelte';
  import Keypad from './Keypad.svelte';
  import { press } from './press';

  interface Props {
    model: InputModel<S>;
    prefix?: string;
    suffix?: string;
    /** Only when the kladblok is shown: while a cell is active, the keypad types there (§3.6). */
    scratch?: ScratchpadInput;
    /** The answer was correct: the field turns green, the keypad is dimmed and the bar runs. */
    locked?: boolean;
    /** Called with valid input only; invalid input shows an inline error instead (spec §6). */
    onsubmit: (input: string) => void;
  }

  let { model, prefix, suffix, scratch, locked = false, onsubmit }: Props = $props();

  /** Keeps the height of an empty slot that is not the one the next digit goes into. */
  const BLANK_SLOT = '\u{a0}';

  // QuestionView is keyed per step, so the model never changes during this component's life.
  // svelte-ignore state_referenced_locally
  let value = $state.raw(model.empty);
  let error = $state<string | null>(null);

  const segments = $derived(model.view(value));
  const inNote = $derived(scratch?.active === true);
  // What a screen reader says for the correct state: the user's own input, with its unit.
  const goodLabel = $derived(
    `Goed: jouw antwoord is ${withUnits(model.display(model.toInput(value)), prefix, suffix)}`,
  );

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
    disabled={locked}
    use:press={() => select(name)}
    >{#if digits === '' && (name !== active || locked)}{BLANK_SLOT}{:else}{digits}{#if name === active && !locked}<span
          class="mini-caret"></span
        >{/if}{/if}</button
  >{/snippet}

{#if inNote}
  <!-- The field gives way to one button that hands the keypad back (spec §3.6). On press, like
       the keys, so the follow-up click cannot land on whatever replaces it. -->
  <button type="button" class="to-answer" use:press={focusAnswer}>Tik hier voor je antwoord</button>
{:else}
  <div class="field">
    <output
      class="answer"
      class:good={locked}
      aria-label={locked ? goodLabel : 'Jouw antwoord'}
      aria-live="off"
      >{#if locked}<span class="check"><Icon name="check" size={28} stroke={3} /></span
        >{/if}{#if prefix}<span class="prefix">{prefix}</span
        >{/if}{#each segments as segment, index (index)}{#if segment.type === 'text'}{segment.text}{:else}<Fraction
            mixed={segment.mixed}
            >{#snippet numerator()}{@render slotButton(
                'num',
                segment.num,
                segment.active,
              )}{/snippet}{#snippet denominator()}{@render slotButton(
                'den',
                segment.den,
                segment.active,
              )}{/snippet}</Fraction
          >{/if}{:else}<span class="caret"></span>{/each}{#if suffix}<span class="suffix"
          >{suffix}</span
        >{/if}</output
    >
  </div>
{/if}
{#if locked}
  <!-- The auto-advance timer: PlayScreen moves on when it has run (spec §3.4). -->
  <div class="advance"><div class="advance-fill"></div></div>
{:else}
  <p class="error" role="alert">{error ?? ''}</p>
{/if}
<Keypad
  keys={inNote ? NOTE_KEYS : model.keys}
  columns={inNote ? NOTE_COLUMNS : model.columns}
  canSubmit={model.canSubmit(value)}
  tall={scratch === undefined}
  tray={inNote}
  disabled={locked}
  onkey={handleKey}
  onsubmit={inNote ? undefined : submit}
/>

<style>
  .field {
    position: relative;
    margin: 0 16px;
  }

  /* The field is always the active one: the kladblok swaps it for a button (spec §3.6). */
  .answer {
    display: flex;
    align-items: center;
    justify-content: center;
    /* As high as the "Tik hier voor je antwoord" button, so nothing moves when the kladblok
       takes over; an open fraction template is drawn smaller to fit. */
    height: 56px;
    padding: 0 20px;
    font-size: 30px;
    font-weight: 700;
    text-align: center;
    background: var(--surface);
    border: 2px solid var(--primary);
    border-radius: 16px;
    box-shadow: var(--shadow-card);
  }

  .answer :global(.fraction) {
    font-size: 0.62em;
    line-height: 1.1;
  }

  /* The correct state: lighter than the wrong one, no shadow (spec §3.4). */
  .answer.good {
    background: var(--good-tint);
    border-color: var(--good);
    color: var(--good-text);
    box-shadow: none;
  }

  .check {
    display: flex;
    margin-right: 10px;
    color: var(--good);
  }

  .answer.good .suffix,
  .answer.good .prefix {
    color: var(--good-text);
  }

  /* Takes the place of the error line. Full width without animation (reduced motion). */
  .advance {
    height: 4px;
    margin: 12px 16px 16px;
    border-radius: 2px;
    background: var(--good-track);
    overflow: hidden;
  }

  .advance-fill {
    height: 100%;
    background: var(--good);
    transform-origin: left;
    animation: advance var(--advance-ms) linear both;
  }

  @keyframes advance {
    from {
      transform: scaleX(0);
    }
  }

  /* The outlined button that replaces the field while a kladblok cell is active. */
  .to-answer {
    height: 56px;
    min-height: 0;
    margin: 0 16px;
    border-radius: 16px;
    border: 1.5px solid var(--border-key);
    background: var(--surface);
    box-shadow: var(--shadow-card);
    font-size: 16px;
    font-weight: 500;
    color: var(--muted);
  }

  .caret {
    display: inline-block;
    width: 2px;
    height: 32px;
    background: var(--primary);
  }

  /* The small caret inside the slot being filled in: the same cursor as the big one, smaller. */
  .mini-caret {
    display: inline-block;
    width: 1.5px;
    height: 0.85em;
    margin-left: 1px;
    vertical-align: middle;
    background: var(--primary);
  }

  .slot {
    min-width: 1.1em;
    min-height: 0;
    padding: 0 0.15em;
    line-height: 1.1;
    background: none;
    border: 1.5px solid transparent;
    border-radius: 0.3em;
  }

  .slot:active {
    background: var(--key-alt);
  }

  .slot.active {
    border-color: var(--primary);
  }

  .suffix,
  .prefix {
    font-size: 22px;
    font-weight: 600;
    color: var(--muted);
  }

  .suffix {
    margin-left: 0.5rem;
  }

  .prefix {
    margin-right: 0.5rem;
  }

  .error {
    min-height: 1.25rem;
    margin: 4px 16px 8px;
    font-size: 1rem;
    text-align: center;
    font-weight: 600;
    color: var(--bad-text);
  }
</style>
