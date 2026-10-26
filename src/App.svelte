<script lang="ts">
  import LessonSetList from './components/LessonSetList.svelte';
  import LessonTopicList from './components/LessonTopicList.svelte';
  import LessonView from './components/LessonView.svelte';
  import PlayScreen from './components/PlayScreen.svelte';
  import PracticeSetList from './components/PracticeSetList.svelte';
  import ResultScreen from './components/ResultScreen.svelte';
  import SetOverview, { type OverviewTab } from './components/SetOverview.svelte';
  import SetupScreen from './components/SetupScreen.svelte';
  import { createBackGuard } from './lib/backGuard';
  import { LESSONS } from './lib/lessons';
  import type { Lesson, LessonTopic } from './lib/lessons/types';
  import { createRng, randomSeed } from './lib/random';
  import { summarize, type QuestionRecord, type SessionSummary } from './lib/results';
  import { buildSession, generatorsFor } from './lib/session';
  import { DEFAULT_SESSION_SIZE, forLevel, PRACTICE_SETS } from './lib/sets';
  import { TABLE_FACTORS } from './lib/topics/tables';
  import type { Level, PracticeSet, Question } from './lib/types';
  import { shouldPrompt, type UpdateState, type Updates } from './lib/update';
  import UpdateDialog from './components/UpdateDialog.svelte';

  // Terug returns to `returnTo`, so any screen can link to a lesson (lesstof spec §3).
  type LessonTopicsScreen = {
    name: 'lessonTopics';
    set: PracticeSet;
    lesson: Lesson;
    returnTo: Screen;
  };

  type Screen =
    | { name: 'sets' }
    | { name: 'setup'; set: PracticeSet }
    | { name: 'playing'; set: PracticeSet; questions: Question[] }
    | { name: 'results'; set: PracticeSet; summary: SessionSummary }
    | LessonTopicsScreen
    | { name: 'lesson'; parent: LessonTopicsScreen; topic: LessonTopic };

  interface Props {
    /** Tests pass a fixture; the app uses the registry. */
    lessons?: readonly Lesson[];
    /** Tests pass a fixture set with a Verdieping; the app uses the registry. */
    sets?: readonly PracticeSet[];
    /** Fed by the service worker in `main.ts`; without it the app never asks to update. */
    updates?: Updates;
  }

  let { lessons: allLessons = LESSONS, sets = PRACTICE_SETS, updates }: Props = $props();

  let updateState = $state<UpdateState>({ available: false, dismissed: false });
  $effect(() => updates?.subscribe((state) => (updateState = state)));

  let screen = $state.raw<Screen>({ name: 'sets' });
  // Kept in memory only while the app is open (spec §3.1, §3.2: nothing is persisted).
  let tab = $state<OverviewTab>('practice');
  let size = $state(DEFAULT_SESSION_SIZE);
  let tables = $state([...TABLE_FACTORS]);
  // Unlike the count, every set opens on Opfrisser (spec §12.2); Opnieuw reuses the level.
  let level = $state<Level>('quick');

  // A system back never closes the app from another screen (spec §3).
  const backGuard = createBackGuard(history);

  $effect(() => {
    if (screen.name === 'sets') backGuard.disarm();
    else backGuard.arm();
  });

  // The effect re-runs on every new screen, so a back between two lesson screens re-arms too.
  function handlePopState() {
    if (!backGuard.popped()) return;
    // Ignored during a session: only Stop ends it.
    if (screen.name === 'playing') backGuard.arm();
    else if (screen.name === 'lesson' || screen.name === 'lessonTopics') lessonBack();
    else showSets();
  }

  function showSets() {
    screen = { name: 'sets' };
  }

  function showSetup(set: PracticeSet) {
    level = 'quick';
    screen = { name: 'setup', set };
  }

  function openLesson(set: PracticeSet, lesson: Lesson, returnTo: Screen) {
    screen = { name: 'lessonTopics', set, lesson, returnTo };
  }

  /** Terug on a lesson screen: one level up (lesstof spec §3). */
  function lessonBack() {
    if (screen.name === 'lesson') screen = screen.parent;
    else if (screen.name === 'lessonTopics') screen = screen.returnTo;
  }

  function startSession(set: PracticeSet) {
    const questions = buildSession(
      forLevel(set, level),
      size,
      createRng(randomSeed()),
      generatorsFor(set, tables),
    );
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
      <PracticeSetList {sets} onselect={showSetup} />
    {/snippet}
    {#snippet lessons()}
      <LessonSetList
        {sets}
        lessons={allLessons}
        onopen={(set, lesson) => openLesson(set, lesson, { name: 'sets' })}
      />
    {/snippet}
  </SetOverview>
{:else if screen.name === 'lessonTopics'}
  {@const current = screen}
  <LessonTopicList
    set={current.set}
    lesson={current.lesson}
    onselect={(topic) => (screen = { name: 'lesson', parent: current, topic })}
    onback={lessonBack}
  />
{:else if screen.name === 'lesson'}
  <LessonView topic={screen.topic} onback={lessonBack} />
{:else if screen.name === 'setup'}
  {@const set = screen.set}
  <SetupScreen
    {set}
    bind:size
    bind:level
    bind:tables
    onstart={() => startSession(set)}
    onback={showSets}
  />
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

{#if updates && shouldPrompt(updateState, screen.name)}
  <UpdateDialog oninstall={updates.install} onlater={updates.dismiss} />
{/if}
