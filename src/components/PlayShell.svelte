<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  /**
   * The frame of a running session or test: one screen high, with the header (✕, name, meta and
   * progress bar). Its per-layout rules live here only (v4 spec §4).
   */
  interface Props {
    name: string;
    onstop: () => void;
    /** Answered exercises, for the progress bar. */
    progress: number;
    max: number;
    /** The right side of the header line: counter and time. */
    meta: Snippet;
    /** The right end of the header: the calculator button or its space (calculator spec §4). */
    action?: Snippet;
    children: Snippet;
  }

  let { name, onstop, progress, max, meta, action, children }: Props = $props();
</script>

<main class="play">
  <header>
    <button type="button" class="close" aria-label="Stoppen" onclick={onstop}>
      <Icon name="close" size={24} stroke={2.2} />
    </button>
    <div class="info">
      <div class="line">
        <span class="set-name">{name}</span>
        <span class="counter">{@render meta()}</span>
      </div>
      <div
        class="track"
        role="progressbar"
        aria-label="Voortgang"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={progress}
      >
        <div class="fill" style:width="{(progress / max) * 100}%"></div>
      </div>
    </div>
    {@render action?.()}
  </header>

  {@render children()}
</main>

<style>
  /* The page never scrolls while playing (spec §2): #app is exactly one screen high, and the
     question or the feedback shrinks its own content instead. */
  .play {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  header {
    display: flex;
    align-items: center;
    gap: 0;
    padding: calc(12px + env(safe-area-inset-top)) 16px 8px 8px;
  }

  /* Tablet portrait: one column, the header aligned to it (v4 spec §4.4). The ✕ glyph, not its
     tap target, lines up with the column edge. */
  :global([data-layout='tablet-portrait']) .play {
    --column: 600px;
    padding-inline: 20px;
  }

  :global([data-layout='tablet-portrait']) header {
    padding: calc(16px + env(safe-area-inset-top)) 0 12px;
    margin-left: -12px;
  }

  /* Landscape: the whole width; the question and the feedback lay out the two panes (§4.2). */
  :global([data-layout^='tablet-landscape']) .play {
    --column: none;
    padding-inline: var(--play-body-side);
  }

  :global([data-layout^='tablet-landscape']) header {
    padding: calc(16px + env(safe-area-inset-top)) 0 12px;
    margin-left: -12px;
  }

  :global([data-layout='tablet-landscape-compact']) header {
    padding: calc(10px + env(safe-area-inset-top)) 0 8px;
  }

  .close {
    flex: none;
    width: var(--play-stop);
    height: var(--play-stop);
    min-height: 0;
    padding: 0;
    background: none;
    color: var(--text-2);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    font-size: var(--play-meta);
    line-height: 20px;
  }

  /* A long set name is cut, so the counter keeps its place and the header its height. */
  .set-name {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-weight: 600;
    color: var(--text);
  }

  .counter {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--muted);
  }

  .track {
    height: var(--play-track);
    border-radius: 4px;
    background: var(--border);
    overflow: hidden;
  }

  .fill {
    height: 100%;
    border-radius: 4px;
    background: var(--primary);
    transition: width 200ms ease-out;
  }
</style>
