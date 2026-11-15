<script lang="ts">
  import ModalDialog from './ModalDialog.svelte';

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

<ModalDialog
  id="update-title"
  title="Er is een nieuwe versie beschikbaar. Nu installeren?"
  oncancel={() => !installing && onlater()}
  busy={installing}
>
  <div class="actions">
    <button class="secondary" disabled={installing} onclick={onlater}>Later</button>
    <button class="primary" bind:this={install} disabled={installing} onclick={start}>
      {#if installing}<span class="spinner" aria-hidden="true"
        ></span>Installeren…{:else}Installeren{/if}
    </button>
  </div>
</ModalDialog>

<style>
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
