<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    numerator: Snippet;
    denominator: Snippet;
    /** The fraction part of a mixed number: a hidden ' en ' goes before it. */
    mixed?: boolean;
  }

  let { numerator, denominator, mixed = false }: Props = $props();
</script>

<!-- A handwritten-style fraction (spec §8). The hidden slash keeps it readable as '25/2', and the
  hidden ' en ' makes screen readers read '12 1/2' as '12 en 1/2', not as '121/2'. -->
{#if mixed}<span class="sr-only">{' en '}</span>{/if}<span class="fraction"
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
