<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    numerator: Snippet;
    denominator: Snippet;
  }

  let { numerator, denominator }: Props = $props();
</script>

<!-- A handwritten-style fraction (spec §8). The hidden slash keeps it readable as '25/2'. -->
<span class="fraction"
  ><span class="numerator">{@render numerator()}</span><span class="sr-only">/</span><span
    class="denominator">{@render denominator()}</span
  ></span
>

<style>
  .fraction {
    position: relative;
    display: inline-flex;
    flex-direction: column;
    align-items: stretch;
    margin-inline: 0.1em;
    font-size: 0.8em;
    line-height: 1.15;
    text-align: center;
    vertical-align: middle;
  }

  .numerator {
    padding-inline: 0.15em;
    border-bottom: max(2px, 0.07em) solid currentColor;
  }

  .denominator {
    padding-inline: 0.15em;
  }
</style>
