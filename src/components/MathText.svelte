<script lang="ts">
  import { splitFractions } from '../lib/fractionText';
  import { plain } from '../lib/slot';
  import Fraction from './Fraction.svelte';

  interface Props {
    text: string;
  }

  let { text }: Props = $props();

  const segments = $derived(splitFractions(text));
</script>

{#each segments as segment, index (index)}{#if segment.type === 'text'}{segment.text}{:else if segment.type === 'slot'}?{:else}<Fraction
      mixed={segment.mixed}
      >{#snippet numerator()}{plain(segment.num)}{/snippet}{#snippet denominator()}{plain(segment.den)}{/snippet}</Fraction
    >{/if}{/each}
