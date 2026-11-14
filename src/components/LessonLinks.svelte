<script lang="ts">
  import type { LessonTopic } from '../lib/lessons/types';
  import Icon from './Icon.svelte';
  import MathText from './MathText.svelte';

  interface Props {
    /** At least one; several become pages of a swipeable row (lesstof spec §3.1). */
    topics: readonly LessonTopic[];
    onopen: (topic: LessonTopic, button: HTMLButtonElement) => void;
    /**
     * Only where the lesson opens next to the buttons (landscape, v4 spec §7): the open topic, or
     * null. Its button is marked "geopend"; a tap on it closes the lesson again.
     */
    opened?: LessonTopic | null;
  }

  let { topics, onopen, opened }: Props = $props();

  const ROW_GAP = 8; // keep equal to the .row.multi gap

  let page = $state(0);

  function handleScroll(event: Event) {
    const row = event.currentTarget as HTMLElement;
    const first = row.firstElementChild as HTMLElement | null;
    if (!first) return;
    const atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 1;
    page = atEnd ? topics.length - 1 : Math.round(row.scrollLeft / (first.offsetWidth + ROW_GAP));
  }
</script>

<div class="links">
  <div class="row" class:multi={topics.length > 1} onscroll={handleScroll}>
    {#each topics as topic (topic.id)}
      <!-- Inline markup is whitespace-sensitive: keep the tags tight (CLAUDE.md). -->
      <!-- prettier-ignore -->
      <button type="button" class="link" class:opened={topic === opened} aria-expanded={opened === undefined ? undefined : topic === opened} onclick={(event) => onopen(topic, event.currentTarget)}><Icon name="book" size={20} stroke={2} /><span class="label">Les:{' '}<MathText text={topic.title} /></span>{#if topic === opened}<span class="state" aria-hidden="true">geopend</span>{/if}<Icon name="chevron-right" size={18} stroke={2.2} /></button>
    {/each}
  </div>
  {#if topics.length > 1}
    <div class="dots" aria-hidden="true">
      {#each topics as topic, index (topic.id)}
        <span class="dot" class:active={index === page}></span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .links {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* Full-width pages that snap; focusing a button scrolls it into view by itself. */
  .row {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }

  /* Pages narrower than the row: the next one peeks out as a swipe hint. */
  .row.multi {
    gap: 8px;
  }

  .row.multi .link {
    flex-basis: 88%;
  }

  .row::-webkit-scrollbar {
    display: none;
  }

  .link {
    flex: 0 0 100%;
    scroll-snap-align: start;
    min-height: 44px;
    padding: 0 12px;
    border-radius: 12px;
    background: var(--sky-tint);
    color: var(--sky-text);
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    line-height: 20px;
    font-weight: 700;
    text-align: left;
  }

  /* The lesson of this button is open next to it. Inset, because the row clips an outline. */
  .link.opened {
    box-shadow: inset 0 0 0 2px var(--sky);
  }

  .state {
    flex: none;
    font-size: 13px;
    font-weight: 600;
  }

  /* The row clips an outer outline. */
  .link:focus-visible {
    outline-offset: -3px;
  }

  .link :global(svg) {
    flex: none;
  }

  .label {
    flex: 1;
    min-width: 0;
    padding: 4px 0;
  }

  .dots {
    display: flex;
    justify-content: center;
    gap: 6px;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--sky-tint);
  }

  .dot.active {
    background: var(--sky-text);
  }
</style>
