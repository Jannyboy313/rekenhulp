<script lang="ts">
  import { untrack } from 'svelte';
  import { CORRECT_FEEDBACK_MS } from '../lib/feedback';
  import { formatDuration } from '../lib/format';
  import { LESSONS } from '../lib/lessons';
  import { lessonLinksFor } from '../lib/lessons/links';
  import type { Lesson, LessonTopic } from '../lib/lessons/types';
  import { createRng, randomSeed } from '../lib/random';
  import {
    advance,
    answer,
    currentEntry,
    currentStep,
    originalNumber,
    startPlay,
    stop,
    type PlayState,
  } from '../lib/play';
  import type { QuestionRecord } from '../lib/results';
  import { EMPTY_NOTES, sessionUsesScratchpad, showsScratchpad } from '../lib/scratchpad';
  import { keepScreenAwake } from '../lib/wakeLock';
  import type { CheckResult, PracticeSet, Question } from '../lib/types';
  import Feedback from './Feedback.svelte';
  import Icon from './Icon.svelte';
  import LessonSheet from './LessonSheet.svelte';
  import QuestionView from './QuestionView.svelte';

  interface Props {
    set: PracticeSet;
    questions: readonly Question[];
    onfinish: (records: QuestionRecord[], totalMs: number) => void;
    /** Tests pass a fixture; the app uses the registry. */
    lessons?: readonly Lesson[];
  }

  let { set, questions, onfinish, lessons = LESSONS }: Props = $props();

  const rng = createRng(randomSeed());
  const sessionStart = Date.now();
  let now = $state(sessionStart);
  // App keys this component on `questions`, so reading the prop once is enough. The session
  // itself (queue, repeats, records) is the pure reducer in lib/play.ts.
  let play = $state.raw(untrack(() => startPlay(questions, sessionStart)));
  // The kladblok belongs to the question: it survives its steps and the feedback in between.
  let notes = $state.raw<readonly string[]>(EMPTY_NOTES);
  let advanceTimer: ReturnType<typeof setTimeout> | undefined;

  const entry = $derived(currentEntry(play));
  const question = $derived(entry.question);
  const step = $derived(currentStep(play));
  const feedback = $derived(play.feedback);
  const questionIndex = $derived(play.questionIndex);
  const stepIndex = $derived(play.stepIndex);
  // Questions answered for the first time: what the progress bar shows (a repeat adds nothing).
  const firstAttempts = $derived(play.records.length);
  const scratchpad = $derived(showsScratchpad(question.topic, step.kind));
  // A session with a kladblok step keeps its space on every step (v4 spec §5.1).
  const reserved = untrack(() => sessionUsesScratchpad(questions));
  const lessonLinks = $derived(lessonLinksFor(question.topic, lessons));

  // The lesson sheet lies over the session, which stays as it is (lesstof spec §3.1).
  let openLesson = $state.raw<LessonTopic | null>(null);
  let lessonOpener: HTMLButtonElement | undefined;

  function showLesson(topic: LessonTopic, button: HTMLButtonElement) {
    lessonOpener = button;
    openLesson = topic;
  }

  function closeLesson() {
    openLesson = null;
    lessonOpener?.focus();
  }

  const announcement = $derived(
    feedback === null
      ? ''
      : feedback.result.correct
        ? 'Goed!'
        : `Niet goed. Goed antwoord: ${feedback.result.expected}`,
  );

  $effect(() => {
    const interval = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(interval);
  });

  // The screen stays on during a session (spec §2).
  $effect(() =>
    keepScreenAwake('wakeLock' in navigator ? navigator.wakeLock : undefined, document),
  );

  /** Every transition goes through here, so onfinish is called once: when the session ends. */
  function apply(next: PlayState) {
    const previous = play;
    play = next;
    if (next.questionIndex !== previous.questionIndex) notes = EMPTY_NOTES;
    if (next.finished && !previous.finished) {
      clearTimeout(advanceTimer);
      onfinish([...next.records], Date.now() - sessionStart);
    }
  }

  function handleAnswer(input: string, result: CheckResult) {
    const next = answer(play, { input, result }, Date.now(), rng);
    if (next === play) return;
    apply(next);
    // A correct answer moves on by itself; a wrong one waits for Verder.
    if (result.correct) advanceTimer = setTimeout(handleNext, CORRECT_FEEDBACK_MS);
  }

  function handleNext() {
    clearTimeout(advanceTimer);
    apply(advance(play, Date.now()));
  }

  function finish() {
    apply(stop(play));
  }

  // A pending auto-advance must not outlive this screen.
  $effect(() => () => clearTimeout(advanceTimer));
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
            <span>{originalNumber(play)} / {questions.length}</span>
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

  <!-- No role: the correct field and the wrong panel are the status regions (silent), this one
       is the single announcement. -->
  <p class="sr-only" aria-live="polite">{announcement}</p>

  {#if feedback && !feedback.result.correct}
    <Feedback
      prompt={step.prompt}
      kind={step.kind}
      input={feedback.input}
      result={feedback.result}
      prefix={step.prefix}
      suffix={step.suffix}
      onnext={handleNext}
      lessons={lessonLinks}
      onlesson={showLesson}
    />
  {:else}
    {#key `${questionIndex}-${stepIndex}`}
      <QuestionView {step} {scratchpad} {reserved} bind:notes onanswer={handleAnswer} />
    {/key}
  {/if}

  {#if openLesson}<LessonSheet topic={openLesson} onclose={closeLesson} />{/if}
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

  /* A long set name is cut, so the counter keeps its place and the header its height. */
  .set-name {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-weight: 600;
    color: var(--text);
  }

  .counter {
    flex: none;
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
