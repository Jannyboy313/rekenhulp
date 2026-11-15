<script lang="ts">
  import { TEST_ROW } from '../lib/practiceTest';
  import type { PracticeSet } from '../lib/types';
  import SetRow from './SetRow.svelte';

  interface Props {
    sets: readonly PracticeSet[];
    onselect: (set: PracticeSet) => void;
    /** The Oefentoets row, last (test spec §4.1). */
    ontest: () => void;
  }

  let { sets, onselect, ontest }: Props = $props();
</script>

<ul class="set-list">
  {#each sets as set (set.id)}
    <li><SetRow {set} onclick={() => onselect(set)} /></li>
  {/each}
  <li><SetRow set={TEST_ROW} onclick={ontest} /></li>
</ul>
