<script lang="ts">
  import {
    choosesTables,
    DEFAULT_SESSION_SIZE,
    describeSetTopics,
    SESSION_SIZES,
  } from '../lib/sets';
  import { TABLE_FACTORS } from '../lib/topics/tables';
  import type { PracticeSet } from '../lib/types';

  interface Props {
    set: PracticeSet;
    size?: number;
    /** Chosen tables; used by the Tafels set only (spec §3.2). */
    tables?: number[];
    onstart: () => void;
    onback: () => void;
  }

  let {
    set,
    size = $bindable(DEFAULT_SESSION_SIZE),
    tables = $bindable([...TABLE_FACTORS]),
    onstart,
    onback,
  }: Props = $props();

  const canStart = $derived(!choosesTables(set) || tables.length > 0);
</script>

<main class="setup">
  <header>
    <button type="button" class="secondary" onclick={onback}>Terug</button>
    <h1>{set.name}</h1>
  </header>

  {#if choosesTables(set)}
    <section>
      <div class="choice-header">
        <h2 id="tables-heading">Kies tafels</h2>
        <button type="button" class="secondary quick" onclick={() => (tables = [...TABLE_FACTORS])}>
          Alle
        </button>
        <button type="button" class="secondary quick" onclick={() => (tables = [])}>Geen</button>
      </div>
      <div class="tables" role="group" aria-labelledby="tables-heading">
        {#each TABLE_FACTORS as table (table)}
          <label>
            <input type="checkbox" name="tables" value={table} bind:group={tables} />
            <span>{table}</span>
          </label>
        {/each}
      </div>
    </section>
  {:else}
    <section>
      <h2>Onderwerpen</h2>
      <ul>
        {#each describeSetTopics(set) as label (label)}
          <li>{label}</li>
        {/each}
      </ul>
    </section>
  {/if}

  <fieldset>
    <legend>Aantal opgaven</legend>
    <div class="sizes">
      {#each SESSION_SIZES as option (option)}
        <label>
          <input type="radio" name="size" value={option} bind:group={size} />
          <span>{option}</span>
        </label>
      {/each}
    </div>
  </fieldset>

  <button type="button" class="primary start" disabled={!canStart} onclick={onstart}>Start</button>
</main>

<style>
  .setup {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  h1 {
    font-size: 1.75rem;
  }

  h2,
  legend {
    font-size: 1rem;
    color: var(--muted);
    margin-bottom: 0.5rem;
  }

  ul {
    margin: 0;
    padding-left: 1.25rem;
  }

  fieldset {
    border: none;
    margin: 0;
    padding: 0;
  }

  .choice-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .choice-header h2 {
    margin-bottom: 0;
    margin-right: auto;
  }

  .quick {
    min-height: 2.5rem;
  }

  .sizes {
    display: grid;
    gap: 0.5rem;
  }

  .tables {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.5rem;
  }

  label {
    position: relative;
  }

  input {
    position: absolute;
    inset: 0;
    opacity: 0;
    pointer-events: none;
  }

  label span {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 3rem;
    border-radius: var(--radius);
    background: var(--key);
    font-weight: 600;
  }

  input:checked + span {
    background: var(--primary);
    color: var(--primary-text);
  }

  .start {
    margin-top: auto;
    min-height: 3.5rem;
  }
</style>
