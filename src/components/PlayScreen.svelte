<script lang="ts">
  import { untrack } from 'svelte';
  import { formatDuration } from '../lib/format';
  import { createRng, randomSeed } from '../lib/random';
  import { isCorrect, type QuestionRecord, type StepAttempt } from '../lib/results';
  import { EMPTY_NOTES, showsScratchpad } from '../lib/scratchpad';
  import { insertRepeat } from '../lib/session';
  import type { CheckResult, PracticeSet, Question } from '../lib/types';
  import Feedback from './Feedback.svelte';
  import QuestionView from './QuestionView.svelte';

  interface Props {
    set: PracticeSet;
    questions: readonly Question[];
    onfinish: (records: QuestionRecord[], totalMs: number) => void;
  }

  let { set, questions, onfinish }: Props = $props();

  interface QueueEntry {
    question: Question;
    // A wrongly answered question shown again (spec §3.4); it is not recorded again.
    repeat: boolean;
  }

  const rng = createRng(randomSeed());
  // App keys this component on `questions`, so reading the prop once is enough.
  let queue = $state.raw<QueueEntry[]>(
    untrack(() => questions.map((question) => ({ question, repeat: false }))),
  );

  const sessionStart = Date.now();
  let now = $state(sessionStart);
  let questionIndex = $state(0);
  let stepIndex = $state(0);
  let feedback = $state.raw<StepAttempt | null>(null);
  // The kladblok belongs to the question: it survives its steps and the feedback in between.
  let notes = $state.raw<readonly string[]>(EMPTY_NOTES);

  // Bookkeeping that the template never reads, so plain variables are enough.
  let questionStart = sessionStart;
  let attempts: StepAttempt[] = [];
  let records: QuestionRecord[] = [];

  const entry = $derived(queue[questionIndex]!);
  const question = $derived(entry.question);
  const originalNumber = $derived(
    queue.slice(0, questionIndex + 1).filter((queued) => !queued.repeat).length,
  );
  const step = $derived(question.steps[stepIndex]!);
  const scratchpad = $derived(showsScratchpad(question.topic, step.kind));

  const announcement = $derived(
    feedback === null
      ? ''
      : feedback.result.correct
        ? 'Goed!'
        : `Fout. Juist antwoord: ${feedback.result.expected}`,
  );

  $effect(() => {
    const interval = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(interval);
  });

  function handleAnswer(input: string, result: CheckResult) {
    const attempt = { input, result };
    attempts = [...attempts, attempt];
    if (attempts.length === question.steps.length) {
      const record = { question, attempts, durationMs: Date.now() - questionStart };
      if (!entry.repeat) records = [...records, record];
      if (!isCorrect(record)) {
        queue = insertRepeat(queue, questionIndex, { question, repeat: true }, rng);
      }
    }
    feedback = attempt;
  }

  function handleNext() {
    feedback = null;
    if (stepIndex + 1 < question.steps.length) {
      stepIndex++;
    } else if (questionIndex + 1 < queue.length) {
      questionIndex++;
      stepIndex = 0;
      attempts = [];
      notes = EMPTY_NOTES;
      questionStart = Date.now();
    } else {
      finish();
    }
  }

  let finished = false;

  function finish() {
    if (finished) return;
    finished = true;
    onfinish(records, Date.now() - sessionStart);
  }
</script>

<main class="play">
  <header>
    <span class="set-name">{set.name}</span>
    <span class="progress">
      {entry.repeat ? 'Herhaling' : `${originalNumber} / ${questions.length}`}
    </span>
    <span class="timer">{formatDuration(now - sessionStart)}</span>
    <button type="button" class="stop" onclick={finish}>Stop</button>
  </header>

  <p class="sr-only" role="status" aria-live="polite">{announcement}</p>

  {#if feedback}
    <Feedback
      prompt={step.prompt}
      kind={step.kind}
      input={feedback.input}
      result={feedback.result}
      onnext={handleNext}
    />
  {:else}
    {#key `${questionIndex}-${stepIndex}`}
      <QuestionView {step} {scratchpad} bind:notes onanswer={handleAnswer} />
    {/key}
  {/if}
</main>

<style>
  .play {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: hidden;
  }

  header {
    display: grid;
    grid-template-columns: 1fr auto auto auto;
    align-items: center;
    gap: 0.75rem;
    color: var(--muted);
  }

  .set-name {
    font-weight: 600;
    color: var(--text);
  }

  /* Light red, so ending the session stands apart from the neutral buttons (spec §3.3). */
  .stop {
    padding: 0 1rem;
    background: var(--wrong-bg);
    color: var(--wrong);
    font-weight: 600;
  }
</style>
