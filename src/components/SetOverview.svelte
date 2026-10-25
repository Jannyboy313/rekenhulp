<script lang="ts">
  import type { Snippet } from 'svelte';
  import Logo from './Logo.svelte';

  interface Props {
    /** The list below the header. */
    children: Snippet;
  }

  let { children }: Props = $props();
</script>

<main class="overview">
  <header>
    <Logo size={48} />
    <div>
      <h1>Rekenhulp</h1>
      <p class="intro">Wat wil je oefenen?</p>
    </div>
  </header>
  {@render children()}
</main>

<style>
  .overview {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding-top: env(safe-area-inset-top);
  }

  header {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 22px 20px 12px;
  }

  h1 {
    font-size: 30px;
    line-height: 36px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .intro {
    font-size: 15px;
    color: var(--muted);
  }
</style>
