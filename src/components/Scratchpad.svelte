<script lang="ts">
  import { splitNoteFractions } from '../lib/fractionText';
  import { formatNote, formatNoteLabel } from '../lib/format';
  import Fraction from './Fraction.svelte';
  import Icon from './Icon.svelte';
  import { press } from './press';

  interface Props {
    /** The cells to show, in reading order. */
    notes: readonly string[];
    /** The active cell; null while the answer field is active. */
    active: number | null;
    /** The notes are final (correct state): the cells stay visible but cannot be tapped. */
    disabled?: boolean;
    onselect: (index: number) => void;
  }

  let { notes, active, disabled = false, onselect }: Props = $props();

  /** Keeps the height of an empty slot that is not the one the next digit goes into. */
  const BLANK_SLOT = '\u{a0}';

  /** The cursor is inside a fraction (`_3/4`): the slots mark it, so there is no caret until a
   * space or operator takes it out again. */
  function inFraction(note: string): boolean {
    return /_\d*(?:\/\d*)?$/.test(note);
  }

  /** A cell is clipped, not wrapped: after every change it shows the end, where the caret is. */
  function showEnd(node: HTMLElement, _note: string) {
    node.scrollLeft = node.scrollWidth;
    return {
      update() {
        node.scrollLeft = node.scrollWidth;
      },
    };
  }
</script>

<!-- The kladblok (spec §3.6): fixed cells for numbers and short sums typed on the keypad. -->
<div class="scratchpad" role="group" aria-label="Kladblok">
  <p class="label" class:active={active !== null}>
    <Icon name="pen" size={16} stroke={2} />
    {#if active === null}Kladblok · tik om te noteren{:else}Kladblok{/if}
  </p>
  <div class="cells">
    {#each notes as note, index (index)}
      <button
        type="button"
        class="cell"
        class:active={index === active}
        class:empty={note === '' && index !== active}
        aria-label={`Kladblok vak ${index + 1}: ${note === '' ? 'leeg' : formatNoteLabel(note)}`}
        aria-pressed={index === active}
        {disabled}
        use:press={() => onselect(index)}
        ><!-- One scrolling item for the text runs and fractions, so they are clipped as one. --><span
          class="content"
          use:showEnd={note}
          >{#each splitNoteFractions(formatNote(note)) as segment, part (part)}{#if segment.type === 'text'}{segment.text}{:else}<!-- The placeholder marks the slot the next digit goes into. --><Fraction
                >{#snippet numerator()}{#if segment.num === ''}<span class="placeholder">…</span
                    >{:else}{segment.num}{/if}{/snippet}{#snippet denominator()}{#if segment.den === null}{BLANK_SLOT}{:else if segment.den === ''}<span
                      class="placeholder">…</span
                    >{:else}{segment.den}{/if}{/snippet}</Fraction
              >{/if}{/each}{#if index === active && !inFraction(note)}<span class="caret"></span>{/if}</span
        ></button
      >
    {/each}
  </div>
</div>

<style>
  .scratchpad {
    padding: 0 16px;
  }

  .label {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 24px;
    margin-bottom: 4px;
    font-size: 13px;
    line-height: 18px;
    color: var(--muted);
  }

  .label.active {
    color: var(--primary);
    font-weight: 600;
  }

  .cells {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  /* Fixed size: a long number is clipped, never wrapped (spec §3.6). */
  .cell {
    height: 48px;
    min-height: 0;
    padding: 0 12px;
    border-radius: 12px;
    overflow: hidden;
    font-size: 18px;
    font-weight: 600;
    text-align: left;
    background: var(--surface);
    border: 2px solid transparent;
  }

  /* An empty, inactive cell: the dashed outline stays visible (≥ 3:1 against the background). */
  .cell.empty {
    border: 1.5px dashed var(--scratch-border);
  }

  .cell:not(.empty):not(.active) {
    border: 1.5px solid var(--border);
  }

  .cell.active {
    border-color: var(--sky);
    background: var(--sky-tint);
  }

  /* Locked, not dimmed: the notes stay readable next to the correct answer. */
  .cell:disabled {
    opacity: 1;
  }

  .content {
    display: flex;
    align-items: center;
    height: 100%;
    overflow: hidden;
    /* pre, not nowrap: a just-typed trailing spatie must take room. Wider spaces keep the
       numbers apart. */
    white-space: pre;
    word-spacing: 0.25em;
  }

  .caret {
    flex: none;
    width: 2px;
    height: 22px;
    margin-left: 1px;
    background: var(--sky);
  }

  .placeholder {
    font-size: 0.7em;
    letter-spacing: -0.12em;
    color: var(--muted);
  }

  /* Shorter screens drop rows from the bottom, so the keypad stays on screen. Each row costs
     56 px; the thresholds were checked on a phone on 2026-10-22 (spec §3.6). Keep them in sync
     with SHORT_SCREENS: QuestionView uses it to leave a cell that gets hidden. */
  @media (max-height: 815px) {
    .cell:nth-child(n + 5) {
      display: none;
    }
  }

  @media (max-height: 759px) {
    .cell:nth-child(n + 3) {
      display: none;
    }
  }
</style>
