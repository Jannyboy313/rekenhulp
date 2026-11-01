<script lang="ts">
  interface Props {
    oninstall: () => void;
    onlater: () => void;
  }

  let { oninstall, onlater }: Props = $props();

  let install: HTMLButtonElement | undefined = $state();
  let installing = $state(false);

  $effect(() => install?.focus());

  function start() {
    if (installing) return;
    installing = true;
    oninstall();
  }
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && !installing && onlater()} />

<div class="scrim">
  <div
    class="dialog"
    role="dialog"
    aria-modal="true"
    aria-labelledby="update-title"
    aria-busy={installing}
  >
    <p id="update-title">Er is een nieuwe versie beschikbaar. Nu installeren?</p>
    <div class="actions">
      <button class="secondary" disabled={installing} onclick={onlater}>Later</button>
      <button class="primary" bind:this={install} disabled={installing} onclick={start}>
        {#if installing}<span class="spinner" aria-hidden="true"
          ></span>Installeren…{:else}Installeren{/if}
      </button>
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

  .spinner {
    display: inline-block;
    width: 1em;
    height: 1em;
    margin-right: 8px;
    vertical-align: -0.15em;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation-duration: 3s;
    }
  }
</style>
