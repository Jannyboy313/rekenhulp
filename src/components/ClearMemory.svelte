<script lang="ts">
  import type { Memory } from '../lib/memory';
  import ModalDialog from './ModalDialog.svelte';

  /** Gegevens wissen: deletes the stored practice records, after a confirmation (memory spec §5). */
  interface Props {
    memory: Memory;
    /** The dialog is open; `App` holds the update dialog back meanwhile. */
    open?: boolean;
    /** After a successful clear: `App` reads the memory again (review spec §4). */
    oncleared?: () => void;
  }

  let { memory, open = $bindable(false), oncleared }: Props = $props();

  let outcome = $state<'none' | 'cleared' | 'failed'>('none');
  let cancel: HTMLButtonElement | undefined = $state();

  // An accidental Enter must not delete anything.
  $effect(() => cancel?.focus());

  async function clear() {
    open = false;
    try {
      await memory.clear();
      outcome = 'cleared';
      oncleared?.();
    } catch (error) {
      console.error(error);
      outcome = 'failed';
    }
  }
</script>

<div class="clear-memory">
  {#if outcome !== 'cleared'}
    <button type="button" class="clear" onclick={() => (open = true)}>Gegevens wissen</button>
  {/if}
  <p class="outcome" role="status">
    {#if outcome === 'cleared'}Gegevens gewist.{:else if outcome === 'failed'}Wissen is niet gelukt.{/if}
  </p>
</div>

{#if open}
  <ModalDialog id="clear-title" title="Gegevens wissen?" oncancel={() => (open = false)}>
    <p class="text">
      Je resultaten op dit apparaat worden verwijderd. Dit kan niet ongedaan worden gemaakt.
    </p>
    <div class="actions">
      <button class="secondary" bind:this={cancel} onclick={() => (open = false)}>Annuleren</button>
      <button class="primary" onclick={clear}>Wissen</button>
    </div>
  </ModalDialog>
{/if}

<style>
  .clear-memory {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 14px;
    color: var(--muted);
  }

  .clear {
    height: 44px;
    min-height: 0;
    padding: 0 12px;
    background: transparent;
  }

  .outcome:not(:empty) {
    line-height: 44px;
  }

  /* With the button above it (a failed clear) the text needs no height of its own. */
  .clear + .outcome:not(:empty) {
    line-height: 20px;
  }

  .text {
    margin-top: -8px;
    font-size: 15px;
    line-height: 22px;
    color: var(--text-2);
  }
</style>
