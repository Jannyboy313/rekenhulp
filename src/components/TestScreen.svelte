<script lang="ts">
  import { untrack } from 'svelte';
  import { formatCountdown } from '../lib/format';
  import { remainingMs } from '../lib/practiceTest';
  import {
    answer,
    currentEntry,
    currentStep,
    startPlay,
    stop,
    TEST_POLICY,
    type PlayState,
  } from '../lib/play';
  import { createRng, randomSeed } from '../lib/random';
  import type { QuestionRecord } from '../lib/results';
  import { EMPTY_NOTES, sessionUsesScratchpad, showsScratchpad } from '../lib/scratchpad';
  import type { CheckResult, Question } from '../lib/types';
  import { keepScreenAwake } from '../lib/wakeLock';
  import { viewport } from './layout.svelte';
  import PlayShell from './PlayShell.svelte';
  import QuestionView from './QuestionView.svelte';
  import StopDialog from './StopDialog.svelte';

  /**
   * An Oefentoets (test spec §5): the play screen without feedback, with a deadline on the wall
   * clock and a dialog before stopping.
   */
  interface Props {
    questions: readonly Question[];
    limitMs: number;
    onfinish: (records: QuestionRecord[], totalMs: number, timedOut: boolean) => void;
  }

  let { questions, limitMs, onfinish }: Props = $props();

  const LAST_MINUTE_MS = 60_000;

  const rng = createRng(randomSeed());
  const start = Date.now();
  // A deadline, not a sum of ticks: it runs on in the background and through a rotation.
  const deadline = untrack(() => start + limitMs);
  let now = $state(start);
  let play = $state.raw(untrack(() => startPlay(questions, start, TEST_POLICY)));
  let notes = $state.raw<readonly string[]>(EMPTY_NOTES);
  let stopping = $state(false);

  const question = $derived(currentEntry(play).question);
  const step = $derived(currentStep(play));
  const scratchpad = $derived(showsScratchpad(question.topic, step.kind));
  const reserved = untrack(() => sessionUsesScratchpad(questions));
  const remaining = $derived(remainingMs(deadline, now));
  const lastMinute = $derived(remaining <= LAST_MINUTE_MS);
  // Like the lesson sheet, the dialog would lie over the "too low" notice (v4 spec §3.3).
  const tooLow = $derived(viewport.layout === 'too-low');

  function tickClock() {
    now = Date.now();
    if (remainingMs(deadline, now) === 0) apply(stop(play), true);
  }

  $effect(() => {
    const interval = setInterval(tickClock, 1000);
    return () => clearInterval(interval);
  });

  // The screen stays on during a test (spec §2).
  $effect(() =>
    keepScreenAwake('wakeLock' in navigator ? navigator.wakeLock : undefined, document),
  );

  /** Every transition goes through here, so onfinish is called once. */
  function apply(next: PlayState, timedOut = false) {
    const previous = play;
    play = next;
    if (next.questionIndex !== previous.questionIndex) notes = EMPTY_NOTES;
    if (next.finished && !previous.finished) {
      onfinish([...next.records], Date.now() - start, timedOut);
    }
  }

  function handleAnswer(input: string, result: CheckResult) {
    apply(answer(play, { input, result }, Date.now(), rng));
  }
</script>

<svelte:document onvisibilitychange={() => document.visibilityState === 'visible' && tickClock()} />

<PlayShell
  name="Oefentoets"
  onstop={() => (stopping = true)}
  progress={play.records.length}
  max={questions.length}
>
  {#snippet meta()}
    <span>{play.questionIndex + 1} / {questions.length}</span>
    <span aria-hidden="true">·</span>
    <span class="countdown" class:last-minute={lastMinute}>{formatCountdown(remaining)}</span>
  {/snippet}

  <!-- Said once: the text does not change after the minute starts. -->
  <p class="sr-only" aria-live="polite">{lastMinute ? 'Nog één minuut' : ''}</p>

  {#key `${play.questionIndex}-${play.stepIndex}`}
    <QuestionView {step} {scratchpad} {reserved} bind:notes onanswer={handleAnswer} />
  {/key}
</PlayShell>

{#if stopping && !tooLow}
  <StopDialog onstop={() => apply(stop(play))} oncontinue={() => (stopping = false)} />
{/if}

<style>
  .countdown {
    font-variant-numeric: tabular-nums;
  }

  /* The digits are the signal, the colour and weight add to it (test spec §5.2). */
  .last-minute {
    color: var(--bad-text);
    font-weight: 700;
  }
</style>
