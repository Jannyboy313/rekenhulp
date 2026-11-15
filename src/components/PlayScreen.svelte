<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { CORRECT_FEEDBACK_MS } from '../lib/feedback';
  import { formatDuration } from '../lib/format';
  import { LESSONS } from '../lib/lessons';
  import { isLandscape, isTablet } from '../lib/layout';
  import { lessonLinksFor, lessonSetName } from '../lib/lessons/links';
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
  import type { CheckResult, Question } from '../lib/types';
  import Feedback from './Feedback.svelte';
  import Icon from './Icon.svelte';
  import { viewport } from './layout.svelte';
  import LessonPane from './LessonPane.svelte';
  import LessonSheet from './LessonSheet.svelte';
  import PlayShell from './PlayShell.svelte';
  import QuestionView from './QuestionView.svelte';

  interface Props {
    /** The set name, or "Oefentoets" for Fouten oefenen after a test. */
    name: string;
    questions: readonly Question[];
    onfinish: (records: QuestionRecord[], totalMs: number) => void;
    /** Tests pass a fixture; the app uses the registry. */
    lessons?: readonly Lesson[];
  }

  let { name, questions, onfinish, lessons = LESSONS }: Props = $props();

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

  // The presentation follows the layout (v4 spec §7): a pane next to the wrong panel in
  // landscape, otherwise the sheet, with the "Je som" strip on a tablet. A rotation swaps the
  // presentation; the lesson stays open.
  const landscape = $derived(isLandscape(viewport.shown));
  const tablet = $derived(isTablet(viewport.shown));
  const lessonSet = $derived(openLesson ? lessonSetName(openLesson, lessons) : '');

  function showLesson(topic: LessonTopic, button: HTMLButtonElement) {
    // Next to the panel the button toggles its lesson.
    if (landscape && topic === openLesson) return closeLesson();
    lessonOpener = button;
    openLesson = topic;
  }

  function closeLesson() {
    openLesson = null;
    // After the update: behind the open modal sheet the button cannot take the focus.
    void tick().then(() => lessonOpener?.focus());
  }

  // The sheet is a modal dialog in the top layer: it would lie over the "too low" notice, with
  // dead buttons. It comes back, on the same lesson, when the notice goes (v4 spec §3.3).
  const tooLow = $derived(viewport.layout === 'too-low');

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
    // Verder with a lesson open next to the panel closes it.
    openLesson = null;
    apply(advance(play, Date.now()));
  }

  function finish() {
    apply(stop(play));
  }

  /**
   * Physical keyboard (v4 spec §6): Escape closes the lesson, Enter is Verder on the wrong panel.
   * The Enter that submitted the wrong answer was handled by the keypad (default prevented), and
   * Enter on a focused button stays that button's.
   */
  function handleKeydown(event: KeyboardEvent) {
    // Under the "too low" notice the screen is inert, but window still gets the keys (§3.3).
    if (tooLow) return;
    if (openLesson) {
      if (event.key === 'Escape') closeLesson();
      return;
    }
    if (event.key !== 'Enter' || event.defaultPrevented) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (!feedback || feedback.result.correct) return;
    // A held Enter is one press: without this its repeats would click a focused Verder.
    if (event.repeat) return event.preventDefault();
    if (event.target instanceof HTMLButtonElement) return;
    event.preventDefault();
    handleNext();
  }

  // A pending auto-advance must not outlive this screen.
  $effect(() => () => clearTimeout(advanceTimer));
</script>

<svelte:window onkeydown={handleKeydown} />

<PlayShell {name} onstop={finish} progress={firstAttempts} max={questions.length}>
  {#snippet meta()}
    {#if entry.repeat}
      <span class="repeat-label"><Icon name="repeat" size={12} stroke={2.4} />Herhaling</span>
    {:else}
      <span>{originalNumber(play)} / {questions.length}</span>
    {/if}
    <span aria-hidden="true">·</span>
    <span class="timer">{formatDuration(now - sessionStart)}</span>
  {/snippet}

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
      opened={landscape ? openLesson : undefined}
      pane={landscape && openLesson ? lessonPane : undefined}
    />
  {:else}
    {#key `${questionIndex}-${stepIndex}`}
      <QuestionView {step} {scratchpad} {reserved} bind:notes onanswer={handleAnswer} />
    {/key}
  {/if}

  {#if openLesson && !landscape && !tooLow}
    <LessonSheet
      topic={openLesson}
      onclose={closeLesson}
      prompt={tablet ? step.prompt : undefined}
      setName={tablet ? lessonSet : undefined}
    />
  {/if}
</PlayShell>

{#snippet lessonPane()}
  {#if openLesson}
    {#key openLesson}
      <LessonPane
        topic={openLesson}
        setName={lessonSet}
        prompt={step.prompt}
        onclose={closeLesson}
      />
    {/key}
  {/if}
{/snippet}

<style>
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
</style>
