<script lang="ts">
  import { choosesTables, describeSetTopicRows, SESSION_SIZES } from '../lib/sets';
  import { TABLE_FACTORS } from '../lib/topics/tables';
  import type { PracticeSet } from '../lib/types';
  import Icon from './Icon.svelte';
  import SetGlyph from './SetGlyph.svelte';

  interface Props {
    set: PracticeSet;
    size: number;
    /** Chosen tables; used by the Tafels set only (spec §3.2). */
    tables: number[];
    onstart: () => void;
    onback: () => void;
  }

  let { set, size = $bindable(), tables = $bindable(), onstart, onback }: Props = $props();

  const canStart = $derived(!choosesTables(set) || tables.length > 0);

  function toggleTable(table: number) {
    tables = TABLE_FACTORS.filter((t) => (t === table ? !tables.includes(t) : tables.includes(t)));
  }

  function onSizeKey(event: KeyboardEvent) {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = SESSION_SIZES[SESSION_SIZES.indexOf(size) + step];
    if (next === undefined) return;
    size = next;
    const group = event.currentTarget as HTMLElement;
    queueMicrotask(() => group.querySelector<HTMLElement>('[tabindex="0"]')?.focus());
  }
</script>

<main class="setup">
  <header>
    <button type="button" class="back" aria-label="Terug" onclick={onback}>
      <Icon name="chevron-left" size={24} stroke={2.2} />
    </button>
    <span class="tile"><SetGlyph id={set.id} name={set.name} size={24} /></span>
    <h1>{set.name}</h1>
  </header>

  <div class="content">
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
    {:else}
      <section>
        <div class="section-header"><h2>Wat zit erin</h2></div>
        <ul class="info">
          {#each describeSetTopicRows(set, size) as row (row.name)}
            <li>
              <span class="row-name">{row.name}</span>
              {#if row.detail}<span class="row-detail">{row.detail}</span>{/if}
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    <section>
      <div class="section-header"><h2 id="size-heading">Aantal opgaven</h2></div>
      <!-- svelte-ignore a11y_interactive_supports_focus -->
      <div class="sizes" role="radiogroup" aria-labelledby="size-heading" onkeydown={onSizeKey}>
        {#each SESSION_SIZES as option (option)}
          <button
            type="button"
            role="radio"
            class="segment"
            aria-checked={size === option}
            tabindex={size === option ? 0 : -1}
            onclick={() => (size = option)}>{option}</button
          >
        {/each}
      </div>
    </section>
  </div>

  <footer>
    <button type="button" class="primary start" disabled={!canStart} onclick={onstart}
      >Start · <span class="start-number">{size}</span> opgaven</button
    >
  </footer>
</main>

<style>
  .setup {
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
    padding: 8px 16px 8px 4px;
  }

  .back {
    width: 44px;
    height: 44px;
    min-height: 0;
    padding: 0;
    background: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tile {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--primary-tint);
    margin: 0 10px 0 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  h1 {
    font-size: 22px;
    line-height: 28px;
    font-weight: 700;
  }

  .content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 8px 16px 16px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
  }

  h2 {
    margin-right: auto;
    font-size: 15px;
    line-height: 20px;
    font-weight: 600;
  }

  .link {
    min-height: 44px;
    padding: 0 12px;
    background: none;
    color: var(--primary);
    font-size: 14px;
    font-weight: 600;
  }

  .info {
    list-style: none;
    margin: 0;
    padding: 4px 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: var(--shadow-card);
  }

  .info li {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 11px 0;
  }

  .info li + li {
    border-top: 1px solid var(--list-divider);
  }

  .row-name {
    font-size: 15px;
    font-weight: 600;
  }

  .row-detail {
    font-size: 13px;
    color: var(--muted);
    text-align: right;
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

  .pill[aria-pressed='true'] {
    background: var(--primary);
    border-color: var(--primary);
    color: var(--primary-text);
    font-weight: 700;
  }

  .sizes {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
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

  .segment[aria-checked='true'] {
    background: var(--surface);
    color: var(--primary);
    font-weight: 700;
    box-shadow: var(--shadow-segment);
  }

  footer {
    padding: 8px 16px calc(24px + env(safe-area-inset-bottom));
  }

  .start {
    width: 100%;
    box-shadow: var(--shadow-glow);
  }

  .start-number {
    color: var(--start-number);
  }
</style>
