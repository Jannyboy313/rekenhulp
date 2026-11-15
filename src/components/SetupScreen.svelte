<script lang="ts">
  import {
    choosesTables,
    countingSets,
    describeSetTopicRows,
    forLevel,
    hasDeep,
    isMixed,
    PRACTICE_SETS,
    SESSION_SIZES,
  } from '../lib/sets';
  import { TABLE_FACTORS } from '../lib/topics/tables';
  import type { Level, PracticeSet } from '../lib/types';
  import SegmentedControl from './SegmentedControl.svelte';
  import SetupShell from './SetupShell.svelte';

  interface Props {
    set: PracticeSet;
    size: number;
    /** Opfrisser or Verdieping; not shown for Tafels (spec §12.2). */
    level?: Level;
    /** Chosen tables; used by the Tafels set only (spec §3.2). */
    tables: number[];
    /** Sets offered by Gemengd; the app passes its sets (spec §3.2). */
    pool?: readonly PracticeSet[];
    /** Chosen set ids, in pool order; used by Gemengd only (spec §3.2). */
    chosenSets?: string[];
    onstart: () => void;
    onback: () => void;
  }

  let {
    set,
    size = $bindable(),
    level = $bindable('quick'),
    tables = $bindable(),
    pool = PRACTICE_SETS,
    chosenSets = $bindable([]),
    onstart,
    onback,
  }: Props = $props();

  const SIZES = SESSION_SIZES.map((value) => ({ value, label: String(value) }));
  const LEVELS: readonly { value: Level; label: string }[] = [
    { value: 'quick', label: 'Opfrisser' },
    { value: 'deep', label: 'Verdieping' },
  ];

  const canStart = $derived(
    isMixed(set)
      ? countingSets(pool, chosenSets, level).length > 0
      : !choosesTables(set) || tables.length > 0,
  );
  const enabledLevels = $derived<Level[]>(
    hasDeep(set) || isMixed(set) ? ['quick', 'deep'] : ['quick'],
  );

  function toggleTable(table: number) {
    tables = TABLE_FACTORS.filter((t) => (t === table ? !tables.includes(t) : tables.includes(t)));
  }

  function toggleSet(id: string) {
    chosenSets = pool
      .map((s) => s.id)
      .filter((s) => (s === id ? !chosenSets.includes(s) : chosenSets.includes(s)));
  }
</script>

<SetupShell id={set.id} name={set.name} count={size} {canStart} {onstart} {onback}>
  {#if choosesTables(set)}
    <section>
      <div class="section-header">
        <h2 id="tables-heading">Welke tafels?</h2>
        <button type="button" class="link" onclick={() => (tables = [...TABLE_FACTORS])}>
          Alle
        </button>
        <button type="button" class="link" onclick={() => (tables = [])}>Geen</button>
      </div>
      <div class="tables" role="group" aria-labelledby="tables-heading">
        {#each TABLE_FACTORS as table (table)}
          <button
            type="button"
            class="pill"
            aria-pressed={tables.includes(table)}
            onclick={() => toggleTable(table)}>{table}</button
          >
        {/each}
      </div>
    </section>
  {:else if isMixed(set)}
    <section>
      <div class="section-header">
        <h2 id="sets-heading">Welke sets?</h2>
        <button type="button" class="link" onclick={() => (chosenSets = pool.map((s) => s.id))}>
          Alle
        </button>
        <button type="button" class="link" onclick={() => (chosenSets = [])}>Geen</button>
      </div>
      <!-- A set without a Verdieping (Tafels) keeps its choice but does not count there. -->
      <div class="sets" role="group" aria-labelledby="sets-heading">
        {#each pool as option (option.id)}
          <button
            type="button"
            class="pill set-pill"
            aria-pressed={chosenSets.includes(option.id)}
            disabled={level === 'deep' && !hasDeep(option)}
            onclick={() => toggleSet(option.id)}>{option.name}</button
          >
        {/each}
      </div>
    </section>
  {/if}

  <section class="size">
    <div class="section-header"><h2 id="size-heading">Aantal opgaven</h2></div>
    <SegmentedControl options={SIZES} bind:value={size} labelledby="size-heading" />
  </section>

  {#if !choosesTables(set)}
    <section>
      <div class="section-header"><h2 id="level-heading">Niveau</h2></div>
      <SegmentedControl
        options={LEVELS}
        bind:value={level}
        enabled={enabledLevels}
        labelledby="level-heading"
      />
    </section>
  {/if}

  <!-- Informational, so it comes after the settings (v4 spec §9). -->
  {#if !choosesTables(set) && !isMixed(set)}
    <section class="topics">
      <div class="section-header"><h2>Wat zit erin</h2></div>
      <ul class="info">
        {#each describeSetTopicRows(forLevel(set, level), size) as row (row.name)}
          <li>
            <span class="row-name">{row.name}</span>
            {#if row.detail}<span class="row-detail">{row.detail}</span>{/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</SetupShell>

<style>
  .link {
    min-height: 44px;
    padding: 0 12px;
    background: none;
    color: var(--primary);
    font-size: 14px;
    font-weight: 600;
  }

  .tables {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
  }

  .pill {
    height: 52px;
    min-height: 0;
    padding: 0;
    border-radius: 12px;
    background: var(--surface);
    border: 1.5px solid var(--border-key);
    font-size: 18px;
    font-weight: 600;
  }

  /* Set names differ in length, so the set pills wrap instead of a fixed grid. */
  .sets {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .set-pill {
    height: 44px;
    padding: 0 16px;
    font-size: 15px;
  }

  .pill[aria-pressed='true'] {
    background: var(--primary);
    border-color: var(--primary);
    color: var(--primary-text);
    font-weight: 700;
  }

  /* Tafels: larger pills, 7 per row in landscape. */
  :global([data-layout^='tablet']) .tables .pill {
    height: 60px;
    border-radius: 14px;
    font-size: 24px;
  }

  :global([data-layout^='tablet-landscape']) .tables {
    grid-template-columns: repeat(7, 1fr);
    gap: 10px;
  }

  :global([data-layout^='tablet']) .set-pill {
    height: 52px;
    padding: 0 20px;
    font-size: 17px;
  }
</style>
