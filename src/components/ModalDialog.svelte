<script lang="ts">
  import type { Snippet } from 'svelte';

  /** A centred modal dialog over a scrim (spec §2; the stop dialog, test spec §5.4). */
  interface Props {
    id: string;
    title: string;
    /** Escape; nothing when absent. */
    oncancel?: () => void;
    busy?: boolean;
    /** The optional text and the `.actions` row. */
    children: Snippet;
  }

  let { id, title, oncancel, busy = false, children }: Props = $props();
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && oncancel?.()} />

<div class="scrim">
  <div class="dialog" role="dialog" aria-modal="true" aria-labelledby={id} aria-busy={busy}>
    <p {id} class="title">{title}</p>
    {@render children()}
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: var(--scrim);
  }

  .dialog {
    width: 100%;
    max-width: 24rem;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 24px;
    background: var(--surface);
    border-radius: var(--radius);
    box-shadow: var(--shadow-panel);
  }

  .title {
    font-size: 17px;
    font-weight: 600;
    color: var(--text);
  }

  .dialog :global(.actions) {
    display: flex;
    gap: 8px;
  }

  .dialog :global(.actions button) {
    flex: 1;
  }
</style>
