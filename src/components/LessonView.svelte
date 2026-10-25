<script lang="ts">
  import type { LessonTopic } from '../lib/lessons/types';
  import Icon from './Icon.svelte';
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
    {#each topic.blocks as block, index (index)}
      {#if block.type === 'text'}
        <p class="text"><MathText text={block.text} /></p>
      {:else if block.type === 'worked'}
        <div class="worked">
          {#if block.title}<p class="label"><MathText text={block.title} /></p>{/if}
          {#each block.lines as line, lineIndex (lineIndex)}
            <p class="worked-line"><MathText text={line} /></p>
          {/each}
        </div>
      {:else if block.type === 'table'}
        <div class="table-box">
          <table>
            <thead>
              <tr>
                {#each block.head as cell, cellIndex (cellIndex)}<th><MathText text={cell} /></th>{/each}
              </tr>
            </thead>
            <tbody>
              {#each block.rows as row, rowIndex (rowIndex)}
                <tr>
                  {#each row as cell, cellIndex (cellIndex)}<td><MathText text={cell} /></td>{/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <!-- Inline markup is whitespace-sensitive: keep the tags tight (CLAUDE.md). -->
        <div class="tip"><p class="label">Tip</p><p><MathText text={block.text} /></p></div>
      {/if}
    {/each}
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

  .worked,
  .tip {
    padding: 14px 16px;
    border-radius: 14px;
  }

  .worked {
    background: var(--surface);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-card);
  }

  .worked-line {
    font-size: 18px;
    line-height: 30px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  /* The look of the tip in the feedback panel. */
  .tip {
    background: var(--sky-tint);
  }

  .label {
    margin-bottom: 4px;
    font-size: 13px;
    font-weight: 700;
    color: var(--sky-text);
  }

  .table-box {
    overflow-x: auto;
  }

  table {
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
  }

  th,
  td {
    padding: 6px 16px 6px 0;
    text-align: left;
    white-space: nowrap;
  }

  th {
    font-size: 13px;
    color: var(--muted);
  }

  td {
    border-top: 1px solid var(--list-divider);
  }
</style>
