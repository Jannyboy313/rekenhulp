<script lang="ts">
  import { splitFractions } from '../lib/fractionText';
  import Fraction from './Fraction.svelte';

  interface Props {
    text: string;
  }

  let { text }: Props = $props();

  const segments = $derived(splitFractions(text));
</script>

{#each segments as segment, index (index)}{#if segment.type === 'text'}{segment.text}{:else}<Fraction
      >{#snippet numerator()}{segment.num}{/snippet}{#snippet denominator()}{segment.den}{/snippet}</Fraction
    >{/if}{/each}
