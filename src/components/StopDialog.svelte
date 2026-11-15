<script lang="ts">
  import ModalDialog from './ModalDialog.svelte';

  /** Before a test ends by ✕ (test spec §5.4): an accidental tap would fail a long test. */
  interface Props {
    onstop: () => void;
    oncontinue: () => void;
  }

  let { onstop, oncontinue }: Props = $props();

  let stop: HTMLButtonElement | undefined = $state();

  $effect(() => stop?.focus());
</script>

<ModalDialog id="stop-title" title="Toets stoppen?" oncancel={oncontinue}>
  <p class="text">Opgaven die je niet hebt beantwoord tellen als fout.</p>
  <div class="actions">
    <button class="secondary" onclick={oncontinue}>Verder werken</button>
    <button class="primary" bind:this={stop} onclick={onstop}>Stoppen</button>
  </div>
</ModalDialog>

<style>
  .text {
    margin-top: -8px;
    font-size: 15px;
    line-height: 22px;
    color: var(--text-2);
  }
</style>
