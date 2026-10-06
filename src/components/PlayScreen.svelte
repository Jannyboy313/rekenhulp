<script lang="ts">
  import { formatDuration } from '../lib/format';
  import type { QuestionRecord, StepAttempt } from '../lib/results';
  import type { CheckResult, PracticeSet, Question } from '../lib/types';
  import Feedback from './Feedback.svelte';
  import QuestionView from './QuestionView.svelte';

  interface Props {
    set: PracticeSet;
    questions: readonly Question[];
    onfinish: (records: QuestionRecord[], totalMs: number) => void;
  }

  let { set, questions, onfinish }: Props = $props();

  const sessionStart = Date.now();
  let now = $state(sessionStart);
  let questionIndex = $state(0);
  let stepIndex = $state(0);
  let feedback = $state.raw<StepAttempt | null>(null);

  // Bookkeeping that the template never reads, so plain variables are enough.
  let questionStart = sessionStart;
  let attempts: StepAttempt[] = [];
  let records: QuestionRecord[] = [];

  const question = $derived(questions[questionIndex]!);
  const step = $derived(question.steps[stepIndex]!);

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
      records = [...records, { question, attempts, durationMs: Date.now() - questionStart }];
    }
    feedback = attempt;
  }

  function handleNext() {
    feedback = null;
    if (stepIndex + 1 < question.steps.length) {
      stepIndex++;
    } else if (questionIndex + 1 < questions.length) {
      questionIndex++;
      stepIndex = 0;
      attempts = [];
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
    <span class="progress">{questionIndex + 1} / {questions.length}</span>
    <span class="timer">{formatDuration(now - sessionStart)}</span>
    <button type="button" class="secondary" onclick={finish}>Stop</button>
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
      <QuestionView {step} onanswer={handleAnswer} />
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
</style>
