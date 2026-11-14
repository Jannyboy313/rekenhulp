<script lang="ts">
  import type { LessonTopic } from '../lib/lessons/types';
  import Icon from './Icon.svelte';
  import LessonBlocks from './LessonBlocks.svelte';
  import LessonStrip from './LessonStrip.svelte';
  import MathText from './MathText.svelte';

  interface Props {
    topic: LessonTopic;
    /** The name of the set the lesson belongs to. */
    setName: string;
    /** The prompt of the exercise the user got wrong. */
    prompt: string;
    /** The parent unmounts the pane; it never closes itself. */
    onclose: () => void;
  }

  let { topic, setName, prompt, onclose }: Props = $props();

  let heading: HTMLHeadingElement | undefined = $state();

  // Not modal: the wrong panel next to it stays usable. A screen reader starts at the title.
  $effect(() => heading?.focus());
</script>

<!-- During a session App ignores the system back; here it closes the lesson (lesstof spec §3.1). -->
<svelte:window onpopstate={onclose} />

<!-- The lesson from a mistake in landscape: in the left pane, in the place of the prompt
     (v4 spec §7). -->
<div class="lesson-pane">
  <LessonStrip {prompt} />
  <section class="card" aria-labelledby="lesson-pane-title">
    <header>
      <span class="book"><Icon name="book" size={22} stroke={2} /></span>
      <div class="titles">
        <p class="set">Les · {setName}</p>
        <h2 id="lesson-pane-title" tabindex="-1" bind:this={heading}>
          <MathText text={topic.title} />
        </h2>
      </div>
      <button type="button" class="close" aria-label="Sluiten" onclick={onclose}>
        <Icon name="close" size={22} stroke={2.2} />
      </button>
    </header>
    <div class="content">
      <LessonBlocks blocks={topic.blocks} />
    </div>
  </section>
</div>

<style>
  .lesson-pane {
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    animation: appear 150ms ease-out;
  }

  .card {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border-radius: 24px;
    border: 1px solid var(--border);
    background: var(--surface);
    box-shadow: var(--shadow-panel);
    overflow: hidden;
  }

  header {
    flex: none;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 12px 12px 24px;
    border-bottom: 1px solid var(--border);
  }

  .book {
    display: flex;
    color: var(--sky);
  }

  .titles {
    flex: 1;
    min-width: 0;
  }

  .set {
    font-size: 13px;
    line-height: 18px;
    font-weight: 600;
    color: var(--muted);
  }

  h2 {
    font-size: 22px;
    line-height: 28px;
    font-weight: 800;
  }

  h2:focus {
    outline: none;
  }

  .close {
    flex: none;
    width: 48px;
    height: 48px;
    min-height: 0;
    padding: 0;
    background: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Scrolls on its own; the session next to it never moves. */
  .content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 20px 28px;
    background: var(--bg);
    display: flex;
    flex-direction: column;
    gap: 16px;
    font-size: 17px;
    line-height: 26px;
  }

  @keyframes appear {
    from {
      opacity: 0;
    }
  }
</style>
