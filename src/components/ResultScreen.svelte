<script lang="ts">
  import { untrack } from 'svelte';
  import { formatDuration, formatSeconds } from '../lib/format';
  import { displayAnswer } from '../lib/inputModels';
  import { wrongSteps, type SessionSummary } from '../lib/results';
  import { PASS_PERCENT } from '../lib/practiceTest';
  import { EXERCISES_PER_MISTAKE } from '../lib/session';
  import Icon from './Icon.svelte';
  import { viewport } from './layout.svelte';
  import MathText from './MathText.svelte';

  interface Props {
    /** The set name, or "Oefentoets". */
    name: string;
    summary: SessionSummary;
    onrestart: () => void;
    onmenu: () => void;
    /** Fouten oefenen (spec §3.5); shown only with mistakes. */
    onpractise: () => void;
  }

  let { name, summary, onrestart, onmenu, onpractise }: Props = $props();

  const failedSteps = $derived(wrongSteps(summary.mistakes));
  // A test scores over all its exercises, unanswered ones included (test spec §6).
  const test = $derived(summary.test);
  const total = $derived(test?.total ?? summary.answered);
  // "Per onderwerp" starts open where it has its own column and the height for it (landscape,
  // not compact; v4 spec §8). Read once: after that the user's choice holds, also through a
  // rotation.
  const topicsOpen = untrack(() => viewport.shown === 'tablet-landscape');
</script>

<!-- A value with its unit; the percent sign sticks to the number (lib/units.ts). -->
{#snippet value(
  text: string,
  prefix?: string,
  suffix?: string,
)}{#if prefix}{prefix}{' '}{/if}<MathText
    {text}
  />{#if suffix}{#if suffix !== '%'}{' '}{/if}{suffix}{/if}{/snippet}

<main class="results">
  <div class="scroll">
    <header>
      <p class="set-name">{name}</p>
      <h1>Resultaat</h1>
    </header>

    {#if total === 0}
      <p>Geen opgaven beantwoord.</p>
    {:else}
      <section class="card score-card">
        {#if test}
          <div class="verdict" class:passed={test.passed}>
            <p class="verdict-title">
              <span class="verdict-icon">
                <Icon name={test.passed ? 'check' : 'cross'} size={16} stroke={2.6} />
              </span>
              {test.passed ? 'Geslaagd' : 'Niet geslaagd'}
            </p>
            <p class="verdict-note">
              Je had {test.needed} van de {test.total} goed nodig ({PASS_PERCENT}%). Dit is een
              indicatie, geen Cito-norm.
            </p>
          </div>
        {/if}
        <div class="score-row">
          <p class="score">
            {summary.correct}<span class="total">{' / '}{total}</span>
          </p>
          <p class="pill">{summary.percentage}%</p>
        </div>
        <div
          class="bar"
          role="progressbar"
          aria-label="Score"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={summary.percentage}
        >
          <div class="fill" style:width="{summary.percentage}%"></div>
        </div>
        <dl class="stats">
          {#if test}
            <div>
              <dt>Tijd</dt>
              <dd>{formatDuration(summary.totalMs)} van {formatDuration(test.limitMs)}</dd>
            </div>
          {:else}
            <div>
              <dt>Totale tijd</dt>
              <dd>{formatDuration(summary.totalMs)}</dd>
            </div>
          {/if}
          <div>
            <dt>Gemiddeld per som</dt>
            <dd>{formatSeconds(summary.averageMs)}</dd>
          </div>
          {#if test && test.unanswered > 0}
            <div>
              <dt>Niet beantwoord</dt>
              <dd>{test.unanswered}</dd>
            </div>
          {/if}
        </dl>
        {#if test?.timedOut}
          <p class="timed-out">De tijd was om.</p>
        {/if}
      </section>

      <!-- With one topic the card would repeat the score; collapsed by default (spec §3.5). -->
      {#if summary.topics.length > 1}
        <details class="card topic-details" open={topicsOpen}>
          <summary>
            <h2>Per onderwerp</h2>
            <span class="chevron"><Icon name="chevron-right" size={20} /></span>
          </summary>
          <ul class="topic-list">
            {#each summary.topics as { name, correct, answered } (name)}
              <li class="topic-row">
                <span>{name}</span><span class="topic-score">{correct} / {answered}</span>
              </li>
            {/each}
          </ul>
        </details>
      {/if}

      {#if failedSteps.length > 0}
        <h2 class="mistakes-heading">Fouten · {failedSteps.length}</h2>
        <ul class="mistakes">
          {#each failedSteps as { prompt, kind, prefix, suffix, attempt }, index (index)}
            <li class="card error-card">
              <p class="prompt"><MathText text={prompt} /></p>
              <div class="tiles">
                <div class="tile bad">
                  <p class="tile-label">
                    <Icon name="cross" size={14} stroke={2.6} />Jouw antwoord
                  </p>
                  <p class="tile-value">
                    {@render value(displayAnswer(kind, attempt.input), prefix, suffix)}
                  </p>
                </div>
                <div class="tile good">
                  <p class="tile-label">
                    <Icon name="check" size={14} stroke={2.6} />Goed antwoord
                  </p>
                  <p class="tile-value">{@render value(attempt.result.expected, prefix, suffix)}</p>
                </div>
              </div>
              {#if attempt.result.tip}
                <div class="note tip">
                  <p class="note-label">Tip</p>
                  <p class="note-body"><MathText text={attempt.result.tip} /></p>
                </div>
              {/if}
              {#if attempt.result.explanation}
                <div class="note explanation">
                  <p class="note-label">Uitleg</p>
                  <p class="note-body"><MathText text={attempt.result.explanation} /></p>
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      {:else if summary.correct === total}
        <p class="all-good">Alles goed!</p>
      {/if}
    {/if}
  </div>

  <footer>
    {#if summary.mistakes.length > 0}
      <button type="button" class="primary tonal" onclick={onpractise}>
        Fouten oefenen · {summary.mistakes.length * EXERCISES_PER_MISTAKE}
      </button>
    {/if}
    <button type="button" class="secondary" onclick={onmenu}>Menu</button>
    <button type="button" class="primary again" onclick={onrestart}>Opnieuw</button>
  </footer>
</main>

<style>
  .results {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: calc(24px + env(safe-area-inset-top)) 16px 16px;
  }

  .set-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--muted);
  }

  h1 {
    font-size: 28px;
    line-height: 34px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  h2 {
    font-size: 17px;
    line-height: 22px;
    font-weight: 700;
    margin-bottom: -8px;
  }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
  }

  .score-card {
    padding: 20px;
    border-radius: 20px;
    box-shadow: var(--shadow-card);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* The verdict of a test (test spec §6); the icon and the title carry it, the colour adds. */
  .verdict {
    --verdict: var(--bad);
    --verdict-tint: var(--bad-tint);
    --verdict-text: var(--bad-text);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .verdict.passed {
    --verdict: var(--good);
    --verdict-tint: var(--good-tint);
    --verdict-text: var(--good-text);
  }

  .verdict-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 20px;
    font-weight: 800;
    color: var(--verdict-text);
  }

  .verdict-icon {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--verdict-tint);
    color: var(--verdict);
  }

  .verdict-note,
  .timed-out {
    font-size: 13px;
    line-height: 18px;
    color: var(--muted);
  }

  .score-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .score {
    font-size: 48px;
    line-height: 52px;
    font-weight: 800;
  }

  .total {
    font-weight: 700;
    color: var(--placeholder);
  }

  .pill {
    display: flex;
    align-items: center;
    height: 32px;
    padding: 0 14px;
    border-radius: 16px;
    background: var(--primary-tint);
    color: var(--primary);
    font-size: 16px;
    font-weight: 800;
  }

  .bar {
    height: 8px;
    border-radius: 4px;
    background: var(--border);
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: var(--primary);
  }

  .stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin: 0;
  }

  dt {
    font-size: 13px;
    color: var(--muted);
  }

  dd {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
  }

  /* One card: the header toggles the rows inside it (v4 spec §9). */
  .topic-details {
    padding: 0 16px 0 20px;
    border-radius: 20px;
    box-shadow: var(--shadow-card);
  }

  summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 56px;
    list-style: none;
    cursor: pointer;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  summary h2 {
    margin: 0;
  }

  /* Points down while closed, up while open. */
  .chevron {
    display: flex;
    color: var(--muted);
    transform: rotate(90deg);
    transition: transform 0.15s;
  }

  .topic-details[open] .chevron {
    transform: rotate(-90deg);
  }

  .topic-list {
    list-style: none;
    margin: 0;
    padding: 0 0 6px;
    border-top: 1px solid var(--border);
  }

  .topic-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 0;
    font-size: 15px;
    font-weight: 600;
  }

  .topic-row + .topic-row {
    border-top: 1px solid var(--border);
  }

  .topic-score {
    flex-shrink: 0;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  .mistakes {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .error-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 16px;
    border-radius: 16px;
    box-shadow: var(--shadow-card);
  }

  .prompt {
    font-size: 18px;
    font-weight: 800;
  }

  .tiles {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .tile {
    min-width: 0;
    padding: 8px 12px;
    border-radius: 12px;
  }

  .tile.bad {
    background: var(--bad-tint);
    color: var(--bad-text);
  }

  .tile.good {
    background: var(--good-tint);
    color: var(--good-text);
  }

  .tile-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 700;
  }

  .tile-value {
    font-size: 20px;
    font-weight: 700;
    overflow-wrap: anywhere;
  }

  .tile.good .tile-value {
    font-weight: 800;
    color: var(--text);
  }

  .note {
    font-size: 14px;
    line-height: 20px;
  }

  .note-label {
    font-weight: 700;
    color: var(--sky-text);
  }

  .note-body {
    white-space: pre-line;
  }

  footer {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 12px 16px calc(24px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--border);
    background: var(--bg);
  }

  .again {
    box-shadow: var(--shadow-glow);
  }

  /* Between primary and secondary in weight (spec §3.5). */
  .tonal {
    grid-column: 1 / -1;
    background: var(--primary-tint);
    color: var(--primary);
  }

  /* Tablet portrait (v4 spec §8): the phone's screen in a centred column of 640. */
  :global([data-layout='tablet-portrait']) .results {
    --column: 672px;
  }

  /* Landscape (v4 spec §8): the score and the buttons in a left column of 400, the mistakes in
     a scrolling column next to it. `.scroll` gives its children to this grid, so the markup is
     the phone's. The topic card scrolls inside when the left column is too low for it. */
  :global([data-layout^='tablet-landscape']) .results {
    --column: none;
    display: grid;
    grid-template-columns: 400px minmax(0, 1fr);
    grid-template-rows: auto auto minmax(56px, auto) minmax(0, 1fr) auto;
    gap: 12px 48px;
    padding: calc(28px + env(safe-area-inset-top)) 40px 0;
  }

  :global([data-layout^='tablet-landscape']) .scroll {
    display: contents;
  }

  :global([data-layout^='tablet-landscape']) :is(header, .score-card, .topic-details, footer) {
    grid-column: 1;
  }

  :global([data-layout^='tablet-landscape']) .topic-details {
    grid-row: 3;
    overflow-y: auto;
  }

  :global([data-layout^='tablet-landscape']) footer {
    grid-row: 5;
    padding: 0 0 calc(32px + env(safe-area-inset-bottom));
    border-top: none;
  }

  :global([data-layout^='tablet-landscape']) .mistakes-heading {
    grid-area: 1 / 2;
    align-self: end;
    margin-bottom: 0;
  }

  :global([data-layout^='tablet-landscape']) :is(.mistakes, .all-good) {
    grid-column: 2;
    grid-row: 2 / -1;
    max-width: 680px;
  }

  :global([data-layout^='tablet-landscape']) .mistakes {
    min-height: 0;
    overflow-y: auto;
    padding-bottom: calc(32px + env(safe-area-inset-bottom));
  }

  :global([data-layout^='tablet']) :is(.primary, .secondary) {
    height: 60px;
    font-size: 19px;
  }

  /* Compact (an 8" tablet, from 520 high): less padding and the phone's buttons, so the left
     column fits with the topic card closed. */
  :global([data-layout='tablet-landscape-compact']) .results {
    padding: calc(16px + env(safe-area-inset-top)) 32px 0;
    column-gap: 32px;
  }

  :global([data-layout='tablet-landscape-compact']) footer {
    padding-bottom: calc(20px + env(safe-area-inset-bottom));
  }

  :global([data-layout='tablet-landscape-compact']) :is(.primary, .secondary) {
    height: 56px;
    font-size: 17px;
  }
</style>
