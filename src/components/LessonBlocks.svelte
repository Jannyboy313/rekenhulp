<script lang="ts">
  import type { LessonBlock } from '../lib/lessons/types';
  import MathText from './MathText.svelte';

  interface Props {
    blocks: readonly LessonBlock[];
  }

  let { blocks }: Props = $props();
</script>

<!-- The blocks of a lesson topic, shared by the lesson screen and the sheet (lesstof spec §3.1,
     §4); the parent lays them out in a column with a gap. -->
{#each blocks as block, index (index)}
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
            {#each block.head as cell, cellIndex (cellIndex)}<th><MathText text={cell} /></th
              >{/each}
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
    <!-- prettier-ignore -->
    <div class="tip"><p class="label">Tip</p><p><MathText text={block.text} /></p></div>
  {/if}
{/each}

<style>
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
