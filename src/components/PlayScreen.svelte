<script lang="ts">
  import { untrack } from 'svelte';
  import { formatDuration } from '../lib/format';
  import { createRng, randomSeed } from '../lib/random';
  import { isCorrect, type QuestionRecord, type StepAttempt } from '../lib/results';
  import { EMPTY_NOTES, showsScratchpad } from '../lib/scratchpad';
  import { insertRepeat } from '../lib/session';
  import { keepScreenAwake } from '../lib/wakeLock';
  import type { CheckResult, PracticeSet, Question } from '../lib/types';
  import Feedback from './Feedback.svelte';
  import Icon from './Icon.svelte';
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
  // Questions answered for the first time: what the progress bar shows (a repeat adds nothing).
  let firstAttempts = $state(0);
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

  // The screen stays on during a session (spec §2).
  $effect(() =>
    keepScreenAwake('wakeLock' in navigator ? navigator.wakeLock : undefined, document),
  );

  function handleAnswer(input: string, result: CheckResult) {
    const attempt = { input, result };
    attempts = [...attempts, attempt];
    if (attempts.length === question.steps.length) {
      const record = { question, attempts, durationMs: Date.now() - questionStart };
      if (!entry.repeat) {
        records = [...records, record];
        firstAttempts++;
      }
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
    <button type="button" class="close" aria-label="Stoppen" onclick={finish}>
      <Icon name="close" size={24} stroke={2.2} />
    </button>
    <div class="info">
      <div class="line">
        <span class="set-name">{set.name}</span>
        <span class="counter">
          {#if entry.repeat}
            <span class="repeat-label"><Icon name="repeat" size={12} stroke={2.4} />Herhaling</span>
          {:else}
            <span>{originalNumber} / {questions.length}</span>
          {/if}
          <span aria-hidden="true">·</span>
          <span class="timer">{formatDuration(now - sessionStart)}</span>
        </span>
      </div>
      <div
        class="track"
        role="progressbar"
        aria-label="Voortgang"
        aria-valuemin={0}
        aria-valuemax={questions.length}
        aria-valuenow={firstAttempts}
      >
        <div class="fill" style:width="{(firstAttempts / questions.length) * 100}%"></div>
      </div>
    </div>
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
  /* The page never scrolls while playing (spec §2): #app is exactly one screen high, and the
     question or the feedback shrinks its own content instead. */
  .play {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  header {
    display: flex;
    align-items: center;
    gap: 0;
    padding: calc(12px + env(safe-area-inset-top)) 16px 8px 8px;
  }

  .close {
    flex: none;
    width: 44px;
    height: 44px;
    min-height: 0;
    padding: 0;
    background: none;
    color: var(--text-2);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    line-height: 20px;
  }

  .set-name {
    font-weight: 600;
    color: var(--text);
  }

  .counter {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--muted);
  }

  .repeat-label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 20px;
    padding: 0 8px;
    border-radius: 10px;
    background: var(--yellow-tint);
    color: var(--yellow-text);
    font-size: 12px;
    font-weight: 700;
  }

  .track {
    height: 6px;
    border-radius: 3px;
    background: var(--border);
    overflow: hidden;
  }

  .fill {
    height: 100%;
    border-radius: 3px;
    background: var(--primary);
    transition: width 200ms ease-out;
  }
</style>
