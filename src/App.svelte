<script lang="ts">
  import LessonSetList from './components/LessonSetList.svelte';
  import PlayScreen from './components/PlayScreen.svelte';
  import PracticeSetList from './components/PracticeSetList.svelte';
  import ResultScreen from './components/ResultScreen.svelte';
  import SetOverview, { type OverviewTab } from './components/SetOverview.svelte';
  import SetupScreen from './components/SetupScreen.svelte';
  import { createBackGuard } from './lib/backGuard';
  import { LESSONS } from './lib/lessons';
  import type { Lesson } from './lib/lessons/types';
  import { createRng, randomSeed } from './lib/random';
  import { summarize, type QuestionRecord, type SessionSummary } from './lib/results';
  import { buildSession, generatorsFor } from './lib/session';
  import { DEFAULT_SESSION_SIZE, PRACTICE_SETS } from './lib/sets';
  import { TABLE_FACTORS } from './lib/topics/tables';
  import type { PracticeSet, Question } from './lib/types';

  type Screen =
    | { name: 'sets' }
    | { name: 'setup'; set: PracticeSet }
    | { name: 'playing'; set: PracticeSet; questions: Question[] }
    | { name: 'results'; set: PracticeSet; summary: SessionSummary };

  interface Props {
    /** Tests pass a fixture; the app uses the registry. */
    lessons?: readonly Lesson[];
  }

  let { lessons: allLessons = LESSONS }: Props = $props();

  let screen = $state.raw<Screen>({ name: 'sets' });
  // Kept in memory only while the app is open (spec §3.1, §3.2: nothing is persisted).
  let tab = $state<OverviewTab>('practice');
  let size = $state(DEFAULT_SESSION_SIZE);
  let tables = $state([...TABLE_FACTORS]);

  // A system back never closes the app from another screen (spec §3).
  const backGuard = createBackGuard(history);

  $effect(() => {
    if (screen.name === 'sets') backGuard.disarm();
    else backGuard.arm();
  });

  function handlePopState() {
    if (!backGuard.popped()) return;
    // Ignored during a session: only Stop ends it.
    if (screen.name === 'playing') backGuard.arm();
    else showSets();
  }

  function showSets() {
    screen = { name: 'sets' };
  }

  function startSession(set: PracticeSet) {
    const questions = buildSession(set, size, createRng(randomSeed()), generatorsFor(set, tables));
    screen = { name: 'playing', set, questions };
  }

  function finishSession(set: PracticeSet, records: QuestionRecord[], totalMs: number) {
    screen = { name: 'results', set, summary: summarize(records, totalMs) };
  }
</script>

<svelte:window onpopstate={handlePopState} />

{#if screen.name === 'sets'}
  <SetOverview {tab} ontab={(next) => (tab = next)}>
    {#snippet practice()}
      <PracticeSetList sets={PRACTICE_SETS} onselect={(set) => (screen = { name: 'setup', set })} />
    {/snippet}
    {#snippet lessons()}
      <LessonSetList sets={PRACTICE_SETS} lessons={allLessons} onopen={() => {}} />
    {/snippet}
  </SetOverview>
{:else if screen.name === 'setup'}
  {@const set = screen.set}
  <SetupScreen {set} bind:size bind:tables onstart={() => startSession(set)} onback={showSets} />
{:else if screen.name === 'playing'}
  {@const set = screen.set}
  {@const questions = screen.questions}
  {#key questions}
    <PlayScreen
      {set}
      {questions}
      onfinish={(records, totalMs) => finishSession(set, records, totalMs)}
    />
  {/key}
{:else}
  {@const set = screen.set}
  <ResultScreen
    {set}
    summary={screen.summary}
    onrestart={() => startSession(set)}
    onmenu={showSets}
  />
{/if}
