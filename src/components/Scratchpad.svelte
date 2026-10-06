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

<!-- The kladblok (spec §3.6): fixed cells for numbers typed on the keypad. -->
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

  /* Fixed size: a long number is clipped, never wrapped (spec §3.6). */
  .cell {
    height: 3rem;
    padding: 0 0.75rem;
    overflow: hidden;
    font-size: 1.25rem;
    text-align: right;
    white-space: nowrap;
    background: var(--surface);
    border: 2px dashed var(--border);
  }

  .cell:active {
    background: var(--key-active);
  }

  .cell.active {
    border-style: solid;
    border-color: var(--primary);
  }
</style>
