<script lang="ts">
  import { formatDuration, formatSeconds } from '../lib/format';
  import { displayAnswer } from '../lib/inputModels';
  import { wrongSteps, type SessionSummary } from '../lib/results';
  import type { PracticeSet } from '../lib/types';
  import Icon from './Icon.svelte';
  import MathText from './MathText.svelte';

  interface Props {
    set: PracticeSet;
    summary: SessionSummary;
    onrestart: () => void;
    onmenu: () => void;
  }

  let { set, summary, onrestart, onmenu }: Props = $props();

  const failedSteps = $derived(wrongSteps(summary.mistakes));
</script>

<!-- A value with its unit; the percent sign sticks to the number (lib/units.ts). -->
{#snippet value(text: string, prefix?: string, suffix?: string)}{#if prefix}{prefix}{' '}{/if}<MathText {text} />{#if suffix}{#if suffix !== '%'}{' '}{/if}{suffix}{/if}{/snippet}

<main class="results">
  <div class="scroll">
    <header>
      <p class="set-name">{set.name}</p>
      <h1>Resultaat</h1>
    </header>

    {#if summary.answered === 0}
      <p>Geen opgaven beantwoord.</p>
    {:else}
      <section class="card score-card">
        <div class="score-row">
          <p class="score">
            {summary.correct}<span class="total">{' / '}{summary.answered}</span>
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
          <div>
            <dt>Totale tijd</dt>
            <dd>{formatDuration(summary.totalMs)}</dd>
          </div>
          <div>
            <dt>Gemiddeld per som</dt>
            <dd>{formatSeconds(summary.averageMs)}</dd>
          </div>
        </dl>
      </section>

      {#if failedSteps.length > 0}
        <h2>Fouten · {failedSteps.length}</h2>
        <ul class="mistakes">
          {#each failedSteps as { prompt, kind, prefix, suffix, attempt }, index (index)}
            <li class="card error-card">
              <p class="prompt"><MathText text={prompt} /></p>
              <div class="tiles">
                <div class="tile bad">
                  <p class="tile-label"><Icon name="cross" size={14} stroke={2.6} />Jouw antwoord</p>
                  <p class="tile-value">
                    {@render value(displayAnswer(kind, attempt.input), prefix, suffix)}
                  </p>
                </div>
                <div class="tile good">
                  <p class="tile-label"><Icon name="check" size={14} stroke={2.6} />Goed antwoord</p>
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
      {:else}
        <p>Alles goed!</p>
      {/if}
    {/if}
  </div>

  <footer>
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
</style>
