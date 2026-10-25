<script lang="ts" module>
  export type OverviewTab = 'practice' | 'lessons';
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import Logo from './Logo.svelte';

  interface Props {
    tab: OverviewTab;
    ontab: (tab: OverviewTab) => void;
    /** The list of each tab; the shell knows nothing about sets or lessons. */
    practice: Snippet;
    lessons: Snippet;
  }

  let { tab, ontab, practice, lessons }: Props = $props();

  const TABS: readonly { id: OverviewTab; label: string }[] = [
    { id: 'practice', label: 'Oefenen' },
    { id: 'lessons', label: 'Lesstof' },
  ];

  const buttons: HTMLButtonElement[] = [];

  function onTabKey(event: KeyboardEvent) {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const index = TABS.findIndex((t) => t.id === tab) + step;
    const next = TABS[index];
    if (next === undefined) return;
    ontab(next.id);
    buttons[index]?.focus();
  }
</script>

<main class="overview">
  <header>
    <Logo size={48} />
    <div>
      <h1>Rekenhulp</h1>
      <p class="intro">Wat wil je oefenen?</p>
    </div>
  </header>
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <div class="tabs" role="tablist" onkeydown={onTabKey}>
    {#each TABS as { id, label }, index (id)}
      <button
        bind:this={buttons[index]}
        type="button"
        role="tab"
        id="tab-{id}"
        class="segment"
        aria-selected={tab === id}
        aria-controls="overview-panel"
        tabindex={tab === id ? 0 : -1}
        onclick={() => ontab(id)}>{label}</button
      >
    {/each}
  </div>
  <div class="panel" id="overview-panel" role="tabpanel" aria-labelledby="tab-{tab}">
    {#if tab === 'practice'}{@render practice()}{:else}{@render lessons()}{/if}
  </div>
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

  /* The look of the size control on the setup screen. */
  .tabs {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4px;
    margin: 0 16px 12px;
    padding: 4px;
    border-radius: 14px;
    background: var(--sky-track);
  }

  .segment {
    height: 44px;
    min-height: 0;
    padding: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--text-2);
    font-size: 16px;
    font-weight: 600;
  }

  .segment[aria-selected='true'] {
    background: var(--surface);
    color: var(--primary);
    font-weight: 700;
    box-shadow: var(--shadow-segment);
  }

  .panel {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
</style>
