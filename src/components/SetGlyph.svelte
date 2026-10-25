<script lang="ts">
  interface Props {
    /** Set id (`PracticeSet.id`). */
    id: string;
    /** Used for the fallback letter of a set without a glyph. */
    name: string;
    size?: number;
  }

  let { id, name, size = 28 }: Props = $props();

  const KNOWN = [
    'tafels',
    'meten',
    'verhoudingen',
    'getallen',
    'bewerkingen',
    'getalbegrip',
    'breuken',
    'meetkunde',
  ];
</script>

{#if KNOWN.includes(id)}
  <svg
    class="glyph"
    width={size}
    height={size}
    viewBox="0 0 28 28"
    aria-hidden="true"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    {#if id === 'tafels'}
      <circle cx="7" cy="7" r="2.5" class="fv" /><circle cx="14" cy="7" r="2.5" class="fv" /><circle
        cx="21"
        cy="7"
        r="2.5"
        class="fv"
      />
      <circle cx="7" cy="14" r="2.5" class="fa" /><circle cx="14" cy="14" r="2.5" class="fa" /><circle
        cx="21"
        cy="14"
        r="2.5"
        class="fa"
      />
      <circle cx="7" cy="21" r="2.5" class="fb" /><circle cx="14" cy="21" r="2.5" class="fb" /><circle
        cx="21"
        cy="21"
        r="2.5"
        class="fb"
      />
    {:else if id === 'meten'}
      <rect x="2" y="7" width="24" height="10" rx="2.5" class="fa" />
      <path d="M7 7v4M12 7v6M17 7v4M22 7v6" class="sd" stroke-width="2" />
      <path d="M4 22h20M6 20l-2 2 2 2M22 20l2 2-2 2" class="sv nf" stroke-width="2" />
    {:else if id === 'verhoudingen'}
      <circle cx="8" cy="8" r="3.6" class="sv nf" stroke-width="2.6" />
      <circle cx="20" cy="20" r="3.6" class="sv nf" stroke-width="2.6" />
      <path d="M21.5 5.5L6.5 22.5" class="sa" stroke-width="3" />
    {:else if id === 'getallen'}
      <path d="M4 14h20" class="sv" stroke-width="3" />
      <circle cx="14" cy="6.5" r="3" class="fa" />
      <circle cx="14" cy="21.5" r="3" class="fb" />
    {:else if id === 'bewerkingen'}
      <path
        d="M8.5 4.5C3.5 11 3.5 17 8.5 23.5M19.5 4.5C24.5 11 24.5 17 19.5 23.5"
        class="sv nf"
        stroke-width="2.6"
      />
      <path d="M14 9.5v9M9.5 14h9" class="sa" stroke-width="2.8" />
    {:else if id === 'getalbegrip'}
      <text x="9" y="21" font-size="15" text-anchor="middle" class="fv txt">10</text>
      <text x="22" y="13" font-size="11" text-anchor="middle" class="fa txt">n</text>
    {:else if id === 'breuken'}
      <text x="14" y="12" font-size="12" text-anchor="middle" class="fv txt">1</text>
      <rect x="5" y="14" width="18" height="2.6" rx="1.3" class="fa" />
      <text x="14" y="26" font-size="12" text-anchor="middle" class="fb txt">2</text>
    {:else if id === 'meetkunde'}
      <path d="M5 5v18h18z" class="sv fill" stroke-width="2" />
      <path d="M5 15h8v8" class="sa nf" stroke-width="2.4" />
    {/if}
  </svg>
{:else}
  <span class="fallback" style:font-size="{size * 0.7}px" aria-hidden="true"
    >{name.charAt(0).toUpperCase()}</span
  >
{/if}

<style>
  .glyph {
    opacity: 0.8;
    flex: none;
  }

  .fv {
    fill: var(--primary);
  }

  .fa {
    fill: var(--glyph-amber);
  }

  .fb {
    fill: var(--glyph-blue);
  }

  .sv {
    stroke: var(--primary);
  }

  .sa {
    stroke: var(--glyph-amber);
  }

  .sd {
    stroke: var(--primary-dark);
  }

  .nf {
    fill: none;
  }

  .fill {
    fill: var(--glyph-fill);
  }

  .txt {
    font-family: inherit;
    font-weight: 800;
  }

  .fallback {
    color: var(--primary);
    font-weight: 800;
    line-height: 1;
  }
</style>
