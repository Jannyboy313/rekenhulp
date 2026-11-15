<script lang="ts">
  import { untrack } from 'svelte';
  import ErrorScreen from './components/ErrorScreen.svelte';
  import { viewport, watchViewport } from './components/layout.svelte';
  import LessonSetList from './components/LessonSetList.svelte';
  import LessonTopicList from './components/LessonTopicList.svelte';
  import LessonView from './components/LessonView.svelte';
  import PlayScreen from './components/PlayScreen.svelte';
  import PracticeSetList from './components/PracticeSetList.svelte';
  import ResultScreen from './components/ResultScreen.svelte';
  import RotateNotice from './components/RotateNotice.svelte';
  import SetOverview, { type OverviewTab } from './components/SetOverview.svelte';
  import SetupScreen from './components/SetupScreen.svelte';
  import TestScreen from './components/TestScreen.svelte';
  import TestSetupScreen from './components/TestSetupScreen.svelte';
  import { createBackGuard } from './lib/backGuard';
  import { LESSONS } from './lib/lessons';
  import { LESSON_PRACTICE_SIZE, practiceTopicsFor } from './lib/lessons/links';
  import type { Lesson, LessonTopic } from './lib/lessons/types';
  import { createRng, randomSeed } from './lib/random';
  import { blueprintFor, TEST_ROW, type TestConfig, type TestLength } from './lib/practiceTest';
  import {
    summarize,
    summarizeTest,
    type QuestionRecord,
    type SessionSummary,
  } from './lib/results';
  import {
    buildMixedSession,
    buildSession,
    buildTestSession,
    generatorsFor,
    mistakeSession,
    topicSession,
  } from './lib/session';
  import {
    countingSets,
    DEFAULT_SESSION_SIZE,
    forLevel,
    isMixed,
    MIXED_SET,
    PRACTICE_SETS,
  } from './lib/sets';
  import { TABLE_FACTORS } from './lib/topics/tables';
  import type { Level, PracticeSet, Question, Topic } from './lib/types';
  import { shouldPrompt, type UpdateState, type Updates } from './lib/update';
  import UpdateDialog from './components/UpdateDialog.svelte';

  // Terug returns to `returnTo`, so any screen can link to a lesson (lesstof spec §3).
  type LessonTopicsScreen = {
    name: 'lessonTopics';
    set: PracticeSet;
    lesson: Lesson;
    returnTo: Screen;
  };

  type LessonScreen = { name: 'lesson'; parent: LessonTopicsScreen; topic: LessonTopic };

  // What started a session: decides its name, Opnieuw and Fouten oefenen (test spec §8), and
  // for a lesson topic where its results lead back to (lesstof spec §3.3).
  type Origin =
    | { kind: 'set'; set: PracticeSet }
    | { kind: 'test'; config: TestConfig }
    | { kind: 'lesson'; from: LessonScreen; topics: Topic[] };

  type Screen =
    | { name: 'sets' }
    | { name: 'setup'; set: PracticeSet }
    | { name: 'testSetup' }
    | { name: 'playing'; origin: Origin; questions: Question[] }
    | { name: 'testing'; config: TestConfig; questions: Question[] }
    | { name: 'results'; origin: Origin; summary: SessionSummary }
    | { name: 'error' }
    | LessonTopicsScreen
    | LessonScreen;

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
  // Gemengd starts with every set chosen (spec §3.2); the initial value is meant, `sets` is fixed.
  let chosenSets = $state(untrack(() => sets.map((set) => set.id)));
  // The Oefentoets choices, kept in memory as the count (test spec §4.2).
  let testLength = $state<TestLength>('short');
  let testLkt = $state(false);

  // The layout follows the viewport, also after a rotation (v4 spec §3.2).
  $effect(() => watchViewport(window, document.documentElement));
  const tooLow = $derived(viewport.layout === 'too-low');

  // A system back never closes the app from another screen (spec §3).
  const backGuard = createBackGuard(history);

  $effect(() => {
    if (screen.name === 'sets') backGuard.disarm();
    else backGuard.arm();
  });

  // The effect re-runs on every new screen, so a back between two lesson screens re-arms too.
  function handlePopState() {
    if (!backGuard.popped()) return;
    // Ignored during a session or a test: only Stop ends it.
    if (screen.name === 'playing' || screen.name === 'testing') backGuard.arm();
    else if (screen.name === 'lesson' || screen.name === 'lessonTopics') lessonBack();
    else if (screen.name === 'results') leaveResults(screen.origin);
    else showSets();
  }

  /** Menu, or Naar de les after a session from a lesson topic (lesstof spec §3.3). */
  function leaveResults(origin: Origin) {
    if (origin.kind === 'lesson') screen = origin.from;
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

  function originName(origin: Origin): string {
    if (origin.kind === 'lesson') return origin.from.topic.title;
    return origin.kind === 'set' ? origin.set.name : TEST_ROW.name;
  }

  /** A session that cannot be built shows the error screen instead of a dead button (spec §3). */
  function show(build: () => Screen) {
    try {
      screen = build();
    } catch (error) {
      console.error(error);
      screen = { name: 'error' };
    }
  }

  function startSession(set: PracticeSet) {
    const rng = createRng(randomSeed());
    show(() => ({
      name: 'playing',
      origin: { kind: 'set', set },
      questions: isMixed(set)
        ? buildMixedSession(countingSets(sets, chosenSets, level), level, size, rng)
        : buildSession(forLevel(set, level), size, rng, generatorsFor(set, tables)),
    }));
  }

  function startTest(config: TestConfig) {
    show(() => ({
      name: 'testing',
      config,
      questions: buildTestSession(config, sets, createRng(randomSeed())),
    }));
  }

  /** A short session about a lesson topic (lesstof spec §3.3). */
  function practiseLesson(from: LessonScreen, topics: Topic[]) {
    show(() => ({
      name: 'playing',
      origin: { kind: 'lesson', from, topics },
      questions: topicSession(topics, LESSON_PRACTICE_SIZE, createRng(randomSeed())),
    }));
  }

  function restart(origin: Origin) {
    if (origin.kind === 'set') startSession(origin.set);
    else if (origin.kind === 'test') startTest(origin.config);
    else practiseLesson(origin.from, origin.topics);
  }

  /** Fouten oefenen (spec §3.5): new exercises of the topics of the first-attempt mistakes. */
  function practiseMistakes(origin: Origin, summary: SessionSummary) {
    show(() => ({
      name: 'playing',
      origin,
      questions: mistakeSession(
        summary.mistakes.map(({ question }) => question),
        createRng(randomSeed()),
        origin.kind === 'set' ? generatorsFor(origin.set, tables) : undefined,
      ),
    }));
  }

  function finishSession(origin: Origin, records: QuestionRecord[], totalMs: number) {
    screen = { name: 'results', origin, summary: summarize(records, totalMs) };
  }

  function finishTest(
    config: TestConfig,
    records: QuestionRecord[],
    totalMs: number,
    timedOut: boolean,
  ) {
    const { total, limitMs } = blueprintFor(config);
    const summary = summarizeTest(records, total, limitMs, totalMs, timedOut);
    screen = { name: 'results', origin: { kind: 'test', config }, summary };
  }
</script>

<svelte:window onpopstate={handlePopState} />

<!-- Under the "too low" notice the screen stays mounted, with its state, but out of reach
     (v4 spec §3.3). -->
<div class="screens" inert={tooLow}>
  <!-- A screen that fails while rendering gives the error screen too (spec §3). -->
  <svelte:boundary onerror={(error) => console.error(error)}>
    {#if screen.name === 'sets'}
      <SetOverview {tab} ontab={(next) => (tab = next)}>
        {#snippet practice()}
          <PracticeSetList
            sets={[...sets, MIXED_SET]}
            onselect={showSetup}
            ontest={() => (screen = { name: 'testSetup' })}
          />
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
      {@const current = screen}
      {@const topics = practiceTopicsFor(current.parent.lesson.setId, current.topic.id)}
      <LessonView
        topic={current.topic}
        onback={lessonBack}
        onpractise={topics.length > 0 ? () => practiseLesson(current, topics) : undefined}
      />
    {:else if screen.name === 'setup'}
      {@const set = screen.set}
      <SetupScreen
        {set}
        bind:size
        bind:level
        bind:tables
        pool={sets}
        bind:chosenSets
        onstart={() => startSession(set)}
        onback={showSets}
      />
    {:else if screen.name === 'testSetup'}
      <TestSetupScreen
        bind:length={testLength}
        bind:lkt={testLkt}
        onstart={() => startTest({ length: testLength, lkt: testLkt })}
        onback={showSets}
      />
    {:else if screen.name === 'playing'}
      {@const origin = screen.origin}
      {@const questions = screen.questions}
      {#key questions}
        <PlayScreen
          name={originName(origin)}
          {questions}
          lessons={allLessons}
          onfinish={(records, totalMs) => finishSession(origin, records, totalMs)}
        />
      {/key}
    {:else if screen.name === 'testing'}
      {@const config = screen.config}
      {@const questions = screen.questions}
      {#key questions}
        <TestScreen
          {questions}
          limitMs={blueprintFor(config).limitMs}
          onfinish={(records, totalMs, timedOut) => finishTest(config, records, totalMs, timedOut)}
        />
      {/key}
    {:else if screen.name === 'error'}
      <ErrorScreen onhome={showSets} />
    {:else}
      {@const origin = screen.origin}
      {@const summary = screen.summary}
      <ResultScreen
        name={originName(origin)}
        {summary}
        onrestart={() => restart(origin)}
        onmenu={() => leaveResults(origin)}
        menuLabel={origin.kind === 'lesson' ? 'Naar de les' : undefined}
        onpractise={() => practiseMistakes(origin, summary)}
      />
    {/if}
    {#snippet failed(_error, reset)}
      <ErrorScreen
        onhome={() => {
          showSets();
          reset();
        }}
      />
    {/snippet}
  </svelte:boundary>
</div>

{#if tooLow}
  <RotateNotice />
{:else if updates && shouldPrompt(updateState, screen.name)}
  <UpdateDialog oninstall={updates.install} onlater={updates.dismiss} />
{/if}

<style>
  /* Only carries `inert`: the screens stay the flex children of #app. */
  .screens {
    display: contents;
  }
</style>
