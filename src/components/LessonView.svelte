<script lang="ts">
  import type { LessonTopic } from '../lib/lessons/types';
  import Icon from './Icon.svelte';
  import LessonBlocks from './LessonBlocks.svelte';
  import MathText from './MathText.svelte';

  interface Props {
    topic: LessonTopic;
    onback: () => void;
  }

  let { topic, onback }: Props = $props();
</script>

<main class="lesson">
  <header>
    <button type="button" class="back" aria-label="Terug" onclick={onback}>
      <Icon name="chevron-left" size={24} stroke={2.2} />
    </button>
    <h1><MathText text={topic.title} /></h1>
  </header>

  <div class="content">
    <LessonBlocks blocks={topic.blocks} />
  </div>
</main>

<style>
  .lesson {
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
    gap: 4px;
    padding: 8px 16px 8px 4px;
  }

  .back {
    flex: none;
    width: 44px;
    height: 44px;
    min-height: 0;
    padding: 0;
    background: none;
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
    padding: 8px 16px calc(24px + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    gap: 16px;
    font-size: 16px;
    line-height: 24px;
  }

  /* Tablet (v4 spec §8): a reading column of 680 with a larger text; the title is aligned to
     it. In landscape the back button sits in the left margin. */
  :global([data-layout^='tablet']) .lesson {
    --column: none;
    padding-inline: 40px;
  }

  :global([data-layout^='tablet']) :is(header, .content) {
    position: relative;
    width: 100%;
    max-width: 680px;
    margin-inline: auto;
    padding-inline: 0;
  }

  :global([data-layout^='tablet']) header {
    padding-block: 20px 12px;
    margin-left: auto;
  }

  :global([data-layout='tablet-portrait']) .back {
    margin-left: -12px;
  }

  :global([data-layout^='tablet-landscape']) .back {
    position: absolute;
    right: 100%;
    margin-right: 8px;
  }

  :global([data-layout^='tablet']) h1 {
    font-size: 34px;
    line-height: 40px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  :global([data-layout^='tablet']) .content {
    padding-block: 12px calc(40px + env(safe-area-inset-bottom));
    gap: 20px;
    font-size: 19px;
    line-height: 29px;
    /* The blocks grow with the body (v4 spec §8); LessonBlocks reads these. */
    --lesson-worked-size: 22px;
    --lesson-worked-line: 34px;
    --lesson-label-size: 14px;
    --lesson-head-size: 15px;
    --lesson-cell-padding: 12px 16px;
  }
</style>
