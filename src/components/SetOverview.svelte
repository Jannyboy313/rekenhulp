<script lang="ts">
  import type { PracticeSet } from '../lib/types';
  import Icon from './Icon.svelte';
  import Logo from './Logo.svelte';
  import SetGlyph from './SetGlyph.svelte';

  interface Props {
    sets: readonly PracticeSet[];
    onselect: (set: PracticeSet) => void;
  }

  let { sets, onselect }: Props = $props();
</script>

<main class="overview">
  <header>
    <Logo size={48} />
    <div>
      <h1>Rekenhulp</h1>
      <p class="intro">Wat wil je oefenen?</p>
    </div>
  </header>
  <ul>
    {#each sets as set (set.id)}
      <li>
        <button type="button" class="row" onclick={() => onselect(set)}>
          <span class="tile"><SetGlyph id={set.id} name={set.name} size={28} /></span>
          <span class="text">
            <span class="name">{set.name}</span>
            <span class="description">{set.description}</span>
          </span>
          <span class="chevron"><Icon name="chevron-right" size={20} stroke={2.2} /></span>
        </button>
      </li>
    {/each}
  </ul>
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

  ul {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    list-style: none;
    margin: 0;
    padding: 0 16px calc(16px + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 11px 12px 11px 14px;
    text-align: left;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: var(--shadow-card);
  }

  .tile {
    flex: none;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: var(--primary-tint);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .name {
    font-size: 17px;
    line-height: 22px;
    font-weight: 600;
  }

  .description {
    font-size: 13px;
    line-height: 18px;
    color: var(--muted);
  }

  .chevron {
    flex: none;
    display: flex;
    color: var(--placeholder);
  }
</style>
