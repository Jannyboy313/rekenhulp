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

  /** The cursor is inside a fraction: the slots mark it, so there is no caret until the breuk key
   * leaves it (`NOTE_FRACTION_END`), or a space or operator follows. */
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

<!-- The digits of a slot; the small caret behind them marks the slot being filled in. An empty
     slot without the caret keeps its height with a blank. -->
{#snippet slotText(
  digits: string,
  caret: boolean,
)}{#if digits === '' && !caret}{BLANK_SLOT}{:else}{digits}{#if caret}<span class="mini-caret"
      ></span>{/if}{/if}{/snippet}

<!-- The kladblok (spec §3.6): fixed cells for numbers and short sums typed on the keypad. -->
<div class="scratchpad" role="group" aria-label="Kladblok">
  <p class="label" class:active={active !== null}>
    <Icon name="pen" size={16} stroke={2} />
    {#if active === null}Kladblok · tik om te noteren{:else}Kladblok{/if}
  </p>
  <div class="cells">
    {#each notes as note, index (index)}
      {@const segments = splitNoteFractions(formatNote(note))}
      {@const open = index === active && inFraction(note)}
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
          >{#each segments as segment, part (part)}{#if segment.type === 'text'}{segment.text}{:else}<!-- A small caret marks the slot the next digit goes into. --><Fraction
                >{#snippet numerator()}{@render slotText(
                    segment.num,
                    open && part === segments.length - 1 && segment.den === null,
                  )}{/snippet}{#snippet denominator()}{#if segment.den === null}{BLANK_SLOT}{:else}{@render slotText(
                      segment.den,
                      open && part === segments.length - 1,
                    )}{/if}{/snippet}</Fraction
              >{/if}{/each}{#if index === active && !open}<span class="caret"></span>{/if}</span
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

  /* The label of the active kladblok takes the sky colour of its active cell, not the primary. */
  .label.active {
    color: var(--sky);
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

  /* The small caret inside a fraction: the same cursor, smaller. */
  .mini-caret {
    display: inline-block;
    width: 1.5px;
    height: 0.85em;
    margin-left: 1px;
    vertical-align: middle;
    background: var(--sky);
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
