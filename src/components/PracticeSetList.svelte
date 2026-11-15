<script lang="ts">
  import type { Snippet } from 'svelte';
  import { TEST_ROW } from '../lib/practiceTest';
  import { REVIEW_ROW, reviewDescription } from '../lib/review';
  import type { PracticeSet } from '../lib/types';
  import SetRow from './SetRow.svelte';

  interface Props {
    sets: readonly PracticeSet[];
    onselect: (set: PracticeSet) => void;
    /** The Oefentoets row, last (test spec §4.1). */
    ontest: () => void;
    /** Fouten van eerder, the first row: only with due topics (review spec §4). */
    review?: { count: number; onstart: () => void };
    /** Under the last row, as the last item of the list. */
    footer?: Snippet;
  }

  let { sets, onselect, ontest, review, footer }: Props = $props();
</script>

<ul class="set-list">
  {#if review}
    <li>
      <SetRow
        set={{ ...REVIEW_ROW, description: reviewDescription(review.count) }}
        onclick={review.onstart}
      />
    </li>
  {/if}
  {#each sets as set (set.id)}
    <li><SetRow {set} onclick={() => onselect(set)} /></li>
  {/each}
  <li><SetRow set={TEST_ROW} onclick={ontest} /></li>
  {#if footer}<li class="list-footer">{@render footer()}</li>{/if}
</ul>
