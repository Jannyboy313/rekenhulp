<script lang="ts">
  import { formatDuration, formatSeconds } from '../lib/format';
  import { displayAnswer } from '../lib/inputModels';
  import type { SessionSummary } from '../lib/results';
  import type { PracticeSet } from '../lib/types';

  interface Props {
    set: PracticeSet;
    summary: SessionSummary;
    onrestart: () => void;
    onmenu: () => void;
  }

  let { set, summary, onrestart, onmenu }: Props = $props();

  // Flatten to one entry per wrong step, so multi-step questions show only the failing step.
  const wrongSteps = $derived(
    summary.mistakes.flatMap((record) =>
      record.attempts
        .map((attempt, index) => {
          const step = record.question.steps[index];
          return { prompt: step?.prompt ?? '', kind: step?.kind ?? 'number', attempt };
        })
        .filter(({ attempt }) => !attempt.result.correct),
    ),
  );
</script>

<main class="results">
  <h1>Resultaat</h1>
  <p class="set-name">{set.name}</p>

  {#if summary.answered === 0}
    <p>Geen opgaven beantwoord.</p>
  {:else}
    <p class="score">
      {summary.correct} / {summary.answered}
      <span class="percentage">{summary.percentage}%</span>
    </p>
    <dl class="stats">
      <dt>Totale tijd</dt>
      <dd>{formatDuration(summary.totalMs)}</dd>
      <dt>Gemiddeld per opgave</dt>
      <dd>{formatSeconds(summary.averageMs)}</dd>
    </dl>

    {#if wrongSteps.length > 0}
      <h2>Fouten</h2>
      <ul class="mistakes">
        {#each wrongSteps as { prompt, kind, attempt }, index (index)}
          <li>
            <p class="prompt">{prompt}</p>
            <p>Jouw antwoord: <strong>{displayAnswer(kind, attempt.input)}</strong></p>
            <p>Juist antwoord: <strong>{attempt.result.expected}</strong></p>
            {#if attempt.result.explanation}
              <p class="explanation">{attempt.result.explanation}</p>
            {/if}
          </li>
        {/each}
      </ul>
    {:else}
      <p>Alles goed!</p>
    {/if}
  {/if}

  <div class="actions">
    <button type="button" class="secondary" onclick={onmenu}>Menu</button>
    <button type="button" class="primary" onclick={onrestart}>Opnieuw</button>
  </div>
</main>

<style>
  .results {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .set-name {
    color: var(--muted);
  }

  .score {
    font-size: 2.5rem;
    font-weight: 700;
  }

  .percentage {
    margin-left: 0.75rem;
    font-size: 1.5rem;
    color: var(--muted);
  }

  .stats {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.25rem 1rem;
    margin: 0;
  }

  dt {
    color: var(--muted);
  }

  dd {
    margin: 0;
    font-weight: 600;
  }

  .mistakes {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.75rem;
  }

  .mistakes li {
    padding: 0.75rem 1rem;
    border-radius: var(--radius);
    background: var(--wrong-bg);
  }

  .prompt {
    font-weight: 600;
  }

  .explanation {
    color: var(--muted);
  }

  .actions {
    position: sticky;
    bottom: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    padding-top: 0.5rem;
    padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
    background: var(--bg);
  }
</style>
