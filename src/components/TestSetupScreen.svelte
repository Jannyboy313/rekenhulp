<script lang="ts">
  import { blueprintFor, DOMAINS, type TestLength } from '../lib/practiceTest';
  import SegmentedControl from './SegmentedControl.svelte';
  import SetupShell from './SetupShell.svelte';

  /** The setup of an Oefentoets (test spec §4.2). */
  interface Props {
    length: TestLength;
    /** RWT + LKT (decision 2). */
    lkt: boolean;
    onstart: () => void;
    onback: () => void;
  }

  let { length = $bindable(), lkt = $bindable(), onstart, onback }: Props = $props();

  const LENGTHS: readonly { value: TestLength; label: string }[] = [
    { value: 'short', label: 'Kort' },
    { value: 'long', label: 'Lang' },
  ];
  const TOPICS: readonly { value: boolean; label: string }[] = [
    { value: false, label: 'RWT' },
    { value: true, label: 'RWT + LKT' },
  ];

  const blueprint = $derived(blueprintFor({ length, lkt }));
  const domains = $derived(DOMAINS.filter((domain) => blueprint.counts[domain.id] > 0));
</script>

<SetupShell id="oefentoets" name="Oefentoets" count={blueprint.total} {onstart} {onback}>
  <section class="size">
    <div class="section-header"><h2 id="length-heading">Lengte</h2></div>
    <SegmentedControl options={LENGTHS} bind:value={length} labelledby="length-heading" />
    <p class="hint">{blueprint.total} opgaven · {blueprint.limitMs / 60_000} minuten</p>
  </section>

  <section>
    <div class="section-header"><h2 id="topics-heading">Onderwerpen</h2></div>
    <SegmentedControl options={TOPICS} bind:value={lkt} labelledby="topics-heading" />
    <p class="hint">
      {lkt ? 'Ook Getallen & delers, Talstelsels en Heuristieken' : 'De vier domeinen van de RWT'}
    </p>
  </section>

  <section>
    <div class="section-header"><h2>Zo werkt het</h2></div>
    <ul class="how">
      <li>Je ziet pas na afloop wat goed en fout was.</li>
      <li>De tijd loopt door, ook als je de app verlaat. Bij 0:00 stopt de toets.</li>
      <li>Niet beantwoord telt als fout. Je bent geslaagd vanaf 70% goed.</li>
    </ul>
  </section>

  <section>
    <div class="section-header"><h2>Wat zit erin</h2></div>
    <ul class="info domains">
      {#each domains as domain (domain.id)}
        <li>
          <span class="row-name">{domain.name}</span>
          <span class="row-detail">{blueprint.counts[domain.id]} opgaven</span>
        </li>
      {/each}
    </ul>
  </section>
</SetupShell>

<style>
  .hint {
    margin-top: 8px;
    font-size: 13px;
    line-height: 18px;
    color: var(--muted);
  }

  .how {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 14px 16px 14px 32px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: var(--shadow-card);
    font-size: 15px;
    line-height: 21px;
  }

  :global([data-layout^='tablet']) .hint {
    font-size: 14px;
  }

  :global([data-layout^='tablet']) .how {
    padding: 16px 20px 16px 40px;
    border-radius: 20px;
    font-size: 16px;
    line-height: 23px;
  }
</style>
