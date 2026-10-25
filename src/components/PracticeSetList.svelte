<script lang="ts">
  import type { PracticeSet } from '../lib/types';
  import SetRow from './SetRow.svelte';

  interface Props {
    sets: readonly PracticeSet[];
    onselect: (set: PracticeSet) => void;
  }

  let { sets, onselect }: Props = $props();
</script>

<ul class="set-list">
  {#each sets as set (set.id)}
    <li><SetRow {set} onclick={() => onselect(set)} /></li>
  {/each}
</ul>
