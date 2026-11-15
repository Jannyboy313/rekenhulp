<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';
  import SetGlyph from './SetGlyph.svelte';

  /**
   * The frame of a setup screen (spec §3.2, test spec §4.2): header, scrolling sections and the
   * pinned Start, with their per-layout rules (v4 spec §8). The sections use the classes styled
   * here: `.section-header`, `h2`, `.info` with `.row-name` and `.row-detail`; `.size` and the
   * section after it share a row in landscape, `.topics` comes first on a tablet.
   */
  interface Props {
    id: string;
    name: string;
    count: number;
    canStart?: boolean;
    onstart: () => void;
    onback: () => void;
    children: Snippet;
  }

  let { id, name, count, canStart = true, onstart, onback, children }: Props = $props();
</script>

<main class="setup">
  <header>
    <button type="button" class="back" aria-label="Terug" onclick={onback}>
      <Icon name="chevron-left" size={24} stroke={2.2} />
    </button>
    <span class="tile"><SetGlyph {id} {name} size={24} /></span>
    <h1>{name}</h1>
  </header>

  <div class="content">
    {@render children()}
  </div>

  <footer>
    <button type="button" class="primary start" disabled={!canStart} onclick={onstart}
      >Start · <span class="start-number">{count}</span> opgaven</button
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
    padding: 8px 16px 32px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .content :global(.section-header) {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
  }

  .content :global(h2) {
    margin-right: auto;
    font-size: 15px;
    line-height: 20px;
    font-weight: 600;
  }

  .content :global(.info) {
    list-style: none;
    margin: 0;
    padding: 4px 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: var(--shadow-card);
  }

  .content :global(.info li) {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 11px 0;
  }

  .content :global(.info li + li) {
    border-top: 1px solid var(--list-divider);
  }

  .content :global(.row-name) {
    font-size: 15px;
    font-weight: 600;
  }

  .content :global(.row-detail) {
    font-size: 13px;
    color: var(--muted);
    text-align: right;
  }

  footer {
    position: relative;
    padding: 8px 16px calc(24px + env(safe-area-inset-bottom));
  }

  /* Fades scrolled content into the background above the button (hints at more below). */
  footer::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 100%;
    height: 32px;
    background: linear-gradient(transparent, var(--bg));
    pointer-events: none;
  }

  .start {
    width: 100%;
    box-shadow: var(--shadow-glow);
  }

  .start-number {
    color: var(--start-number);
  }

  /* Tablet (v4 spec §8): the header over the whole width, the options and Start in one centred
     column. "Wat zit erin" comes first here (everything fits), by `order`: the DOM keeps the
     phone's order, with the settings first. */
  :global([data-layout^='tablet']) .setup {
    --column: none;
    padding-inline: 40px;
  }

  :global([data-layout^='tablet']) header {
    padding: 20px 0 12px;
    margin-left: -12px;
  }

  :global([data-layout^='tablet']) .tile {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    margin: 0 14px 0 4px;
  }

  :global([data-layout^='tablet']) h1 {
    font-size: 34px;
    line-height: 40px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  :global([data-layout^='tablet']) :is(.content, footer) {
    width: 100%;
    max-width: 640px;
    margin-inline: auto;
    padding-inline: 0;
  }

  :global([data-layout^='tablet-landscape']) :is(.content, footer) {
    max-width: 800px;
  }

  :global([data-layout^='tablet']) footer {
    padding-bottom: calc(32px + env(safe-area-inset-bottom));
  }

  :global([data-layout^='tablet']) .start {
    height: 60px;
    font-size: 19px;
  }

  :global([data-layout^='tablet']) .content :global(.topics) {
    order: -1;
  }

  /* Landscape: the .size section and the one after it side by side; a section on its own takes
     the row. */
  :global([data-layout^='tablet-landscape']) .content {
    display: grid;
    grid-template-columns: 3fr 2fr;
    align-content: start;
    gap: 20px 24px;
  }

  :global([data-layout^='tablet-landscape']) .content :global(section:not(.size, .size + section)),
  :global([data-layout^='tablet-landscape']) .content :global(.size:last-child),
  :global([data-layout^='tablet-landscape']) .content :global(.size + .topics) {
    grid-column: 1 / -1;
  }

  :global([data-layout^='tablet']) .content :global(h2) {
    font-size: 18px;
    line-height: 24px;
    font-weight: 700;
  }

  /* The rows in columns, the detail under the name; a line between the rows of the grid. */
  :global([data-layout^='tablet']) .content :global(.info) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 24px;
    padding: 4px 20px;
    border-radius: 20px;
  }

  :global([data-layout^='tablet-landscape']) .content :global(.info) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  :global([data-layout^='tablet']) .content :global(.info li) {
    position: relative;
    flex-direction: column;
    justify-content: flex-start;
    gap: 2px;
    padding: 12px 0;
    border-top: none;
  }

  /* The line spans the gap to the next column, so it reads as one line per row. */
  :global([data-layout='tablet-portrait']) .content :global(.info li:nth-child(n + 3))::before,
  :global([data-layout^='tablet-landscape']) .content :global(.info li:nth-child(n + 4))::before {
    content: '';
    position: absolute;
    top: 0;
    left: -12px;
    right: -12px;
    border-top: 1px solid var(--list-divider);
  }

  :global([data-layout^='tablet']) .content :global(.row-name) {
    font-size: 16px;
    line-height: 20px;
    font-weight: 700;
  }

  :global([data-layout^='tablet']) .content :global(.row-detail) {
    font-size: 14px;
    line-height: 18px;
    text-align: left;
  }
</style>
