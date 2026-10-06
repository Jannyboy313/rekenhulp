<script lang="ts">
  import { formatInput } from '../lib/format';
  import { press } from './press';

  interface Props {
    /** The cells to show, in reading order. */
    notes: readonly string[];
    /** The active cell; null while the answer field is active. */
    active: number | null;
    onselect: (index: number) => void;
  }

  let { notes, active, onselect }: Props = $props();
</script>

<!-- The kladblok (spec §3.6): fixed cells for numbers and short sums typed on the keypad. -->
<div class="scratchpad" role="group" aria-label="Kladblok">
  {#each notes as note, index (index)}
    <button
      type="button"
      class="cell"
      class:active={index === active}
      aria-label={`Kladblok vak ${index + 1}: ${note === '' ? 'leeg' : formatInput(note)}`}
      aria-pressed={index === active}
      use:press={() => onselect(index)}>{formatInput(note)}</button
    >
  {/each}
</div>

<style>
  /* The auto margin keeps the kladblok under the header while the question sits at the bottom. */
  .scratchpad {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin-bottom: auto;
  }

  /* Fixed size: a long number is clipped, never wrapped (spec §3.6). Flex end alignment clips
     on the left, so the digits just typed stay visible (text-align would clip on the right). */
  .cell {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    height: 3rem;
    padding: 0 0.5rem;
    overflow: hidden;
    font-size: 1.25rem;
    /* pre, not nowrap: a just-typed trailing spatie must take room. Wider spaces keep the
       numbers apart. */
    white-space: pre;
    word-spacing: 0.25em;
    background: var(--surface);
    /* Muted, not --border: empty cells must stay visible (≥ 3:1 against the surface). */
    border: 2px dashed var(--muted);
  }

  .cell:active {
    background: var(--key-active);
  }

  .cell.active {
    border-style: solid;
    border-color: var(--primary);
  }

  /* Shorter screens drop rows from the bottom, so the keypad stays on screen. Each row costs
     56 px; the thresholds are estimates from the kladblok plan (spec §3.6). There is no
     Volgende, so a hidden cell can never become active. */
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
