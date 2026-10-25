<script lang="ts">
  import { splitFractions } from '../lib/fractionText';
  import { SLOT } from '../lib/slot';
  import Fraction from './Fraction.svelte';

  interface Props {
    text: string;
    /** How the unknown looks: a tone, and optionally the value that fills it in. */
    slot?: { tone: 'primary' | 'good' | 'bad' | 'plain'; fill?: string };
  }

  let { text, slot = { tone: 'plain' } }: Props = $props();

  const segments = $derived(splitFractions(text));
  const slotClass = $derived(slot.tone === 'plain' ? 'slot' : `slot ${slot.tone}`);
</script>

<!-- Inline markup is whitespace-sensitive: keep the tags tight (CLAUDE.md, Svelte pitfalls). -->
{#snippet rich(value: string)}{#each splitFractions(value) as part, index (index)}{#if part.type === 'text'}{part.text}{:else if part.type === 'fraction'}<Fraction
        mixed={part.mixed}
        >{#snippet numerator()}{part.num}{/snippet}{#snippet denominator()}{part.den}{/snippet}</Fraction
      >{/if}{/each}{/snippet}
{#snippet slotRun()}<span class={slotClass}
    >{#if slot.fill !== undefined}{@render rich(slot.fill)}{:else}?{/if}</span
  >{/snippet}
{#snippet term(value: string)}{#if value === SLOT}{@render slotRun()}{:else}{value}{/if}{/snippet}
{#each segments as segment, index (index)}{#if segment.type === 'text'}{segment.text}{:else if segment.type === 'slot'}{@render slotRun()}{:else}<Fraction
      mixed={segment.mixed}
      >{#snippet numerator()}{@render term(segment.num)}{/snippet}{#snippet denominator()}{@render term(segment.den)}{/snippet}</Fraction
    >{/if}{/each}

<style>
  .slot.primary {
    color: var(--primary);
  }

  .slot.good {
    color: var(--good-sum);
  }

  .slot.bad {
    color: var(--bad);
  }
</style>
