<script lang="ts">
  import { splitFractions } from '../lib/fractionText';
  import Fraction from './Fraction.svelte';

  interface Props {
    text: string;
  }

  let { text }: Props = $props();

  const segments = $derived(splitFractions(text));
</script>

<!-- The hidden ' en ' makes screen readers read '12½' as '12 en 1/2', not as '121/2'. -->
{#each segments as segment, index (index)}{#if segment.type === 'text'}{segment.text}{:else}{#if segment.mixed}<span
        class="sr-only">{' en '}</span
      >{/if}<Fraction
      >{#snippet numerator()}{segment.num}{/snippet}{#snippet denominator()}{segment.den}{/snippet}</Fraction
    >{/if}{/each}
