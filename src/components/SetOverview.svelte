<script lang="ts">
  import type { PracticeSet } from '../lib/types';

  interface Props {
    sets: readonly PracticeSet[];
    onselect: (set: PracticeSet) => void;
  }

  let { sets, onselect }: Props = $props();
</script>

<main class="overview">
  <h1>Rekenhulp</h1>
  <p class="intro">Kies een oefenset</p>
  <ul>
    {#each sets as set (set.id)}
      <li>
        <button type="button" class="card" onclick={() => onselect(set)}>
          <span class="name">{set.name}</span>
          <span class="description">{set.description}</span>
        </button>
      </li>
    {/each}
  </ul>
</main>

<style>
  .overview {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  h1 {
    font-size: 2rem;
  }

  .intro {
    color: var(--muted);
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.75rem;
  }

  .card {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    padding: 1rem 1.25rem;
    text-align: left;
    background: var(--surface);
    border: 2px solid var(--border);
  }

  .card:active {
    border-color: var(--primary);
  }

  .name {
    font-size: 1.25rem;
    font-weight: 600;
  }

  .description {
    color: var(--muted);
  }
</style>
