<script lang="ts">
  interface Props {
    oninstall: () => void;
    onlater: () => void;
  }

  let { oninstall, onlater }: Props = $props();

  let install: HTMLButtonElement | undefined = $state();

  $effect(() => install?.focus());
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && onlater()} />

<div class="scrim">
  <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="update-title">
    <p id="update-title">Er is een nieuwe versie beschikbaar. Nu installeren?</p>
    <div class="actions">
      <button class="secondary" onclick={onlater}>Later</button>
      <button class="primary" bind:this={install} onclick={oninstall}>Installeren</button>
    </div>
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

  p {
    font-size: 17px;
    font-weight: 600;
    color: var(--text);
  }

  .actions {
    display: flex;
    gap: 8px;
  }

  .actions button {
    flex: 1;
  }
</style>
