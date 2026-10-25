<script lang="ts">
  import { lessonFor } from '../lib/lessons';
  import type { Lesson } from '../lib/lessons/types';
  import type { PracticeSet } from '../lib/types';
  import SetRow from './SetRow.svelte';

  interface Props {
    sets: readonly PracticeSet[];
    lessons: readonly Lesson[];
    onopen: (set: PracticeSet, lesson: Lesson) => void;
  }

  let { sets, lessons, onopen }: Props = $props();
</script>

<!-- Every set is listed; one without a lesson yet is disabled (lesstof spec §3). -->
<ul class="set-list">
  {#each sets as set (set.id)}
    {@const lesson = lessonFor(set, lessons)}
    <li>
      <SetRow {set} disabled={!lesson} onclick={() => lesson && onopen(set, lesson)} />
    </li>
  {/each}
</ul>
