<script lang="ts">
  import type { Lesson, LessonTopic } from '../lib/lessons/types';
  import type { PracticeSet } from '../lib/types';
  import Icon from './Icon.svelte';
  import MathText from './MathText.svelte';
  import SetGlyph from './SetGlyph.svelte';

  interface Props {
    set: PracticeSet;
    lesson: Lesson;
    onselect: (topic: LessonTopic) => void;
    onback: () => void;
  }

  let { set, lesson, onselect, onback }: Props = $props();
</script>

<main class="topics">
  <header>
    <button type="button" class="back" aria-label="Terug" onclick={onback}>
      <Icon name="chevron-left" size={24} stroke={2.2} />
    </button>
    <span class="tile"><SetGlyph id={set.id} name={set.name} size={24} /></span>
    <h1>{set.name}</h1>
  </header>

  <ul>
    {#each lesson.topics as topic (topic.id)}
      <li>
        <button type="button" class="row" onclick={() => onselect(topic)}>
          <span class="text">
            <span class="title"><MathText text={topic.title} /></span>
            <span class="summary"><MathText text={topic.summary} /></span>
          </span>
          <span class="chevron"><Icon name="chevron-right" size={20} stroke={2.2} /></span>
        </button>
      </li>
    {/each}
  </ul>
</main>

<style>
  .topics {
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

  ul {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    list-style: none;
    margin: 0;
    padding: 8px 16px calc(16px + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 11px 12px 11px 16px;
    text-align: left;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: var(--shadow-card);
  }

  .text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .title {
    font-size: 17px;
    line-height: 22px;
    font-weight: 600;
  }

  .summary {
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
